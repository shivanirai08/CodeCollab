"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { createClient } from "@/lib/supabase/client";
import { getRealtimeService } from "@/lib/supabase/realtime";

/**
 * useVoiceCall - Full voice call hook using WebSocket signaling + WebRTC SFU.
 *
 * Connection flow (matches the server protocol at codeolab.srayansh.me):
 *   1. Get Supabase JWT -> open WebSocket with ?token=
 *   2. Send { action: "join", roomId } -> receive { type: "joined", users, userId, roomId }
 *   3. Get microphone -> create RTCPeerConnection -> create offer -> send { action: "offer" }
 *   4. Receive { type: "answer" } -> setRemoteDescription
 *   5. Exchange ICE candidates via { action: "ice_candidate" } / { type: "ice_candidate" }
 *   6. Handle renegotiation offers from the SFU when new peers join
 *   7. Mute / unmute via { action: "mute" | "unmute" }
 *   8. Leave via { action: "leave" }
 *
 * Visibility:
 *   Uses Supabase Presence so ALL project users can see who is in the voice call,
 *   enabling State 2 (others in call, you are not) without joining.
 *
 * @param {string} projectId - used to derive the voice room ID
 * @returns voice call state and action handlers
 */
export default function useVoiceCall(projectId) {
  // --- State ---
  const [isConnected, setIsConnected] = useState(false);
  const [isUserInCall, setIsUserInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [connectionState, setConnectionState] = useState("idle"); // idle | connecting | connected | failed
  const [connectionError, setConnectionError] = useState("");

  // User info from Redux (for presence tracking)
  const user = useSelector((state) => ({
    id: state.user.id,
    username: state.user.userName,
    avatar_url: state.user.avatar_url,
  }));

  // --- Refs ---
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const roomIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const audioContextRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const speakingIntervalRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const isUserInCallRef = useRef(false);
  const isMutedRef = useRef(false);
  const handleWsMessageRef = useRef(null);
  const realtimeServiceRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
    // Cache of the latest normalised presence entries so mapServerParticipants
    // can resolve real usernames even when WS `joined` fires before onSync.
    const voicePresenceCacheRef = useRef([]);

  // Derive a stable room ID from the project
  const roomId = projectId ? `voice-room-${projectId}` : null;

  // Keep refs in sync with state (avoids stale closures)
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { isUserInCallRef.current = isUserInCall; }, [isUserInCall]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // --- Helpers ---

  /** Safely send a JSON message over the WebSocket */
  const wsSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(payload);
      console.log(`[VoiceCall] ðŸ“¤ SENDING:`, payload);
      ws.send(message);
      return true;
    }
    console.warn("[VoiceCall] âš ï¸ WS not open, cannot send:", payload.action);
    return false;
  }, []);

  const isRealUsername = useCallback((username) => {
    if (!username) return false;
    if (username.includes("eyJ")) return false;
    if (username.startsWith("mock-user-")) return false;
    if (username.startsWith("anon-")) return false;
    if (/^User \d+$/i.test(username)) return false;
    if (/^user$/i.test(username)) return false;
    return true;
  }, []);

  const resolveParticipantUsername = useCallback((...candidates) => {
    for (const candidate of candidates) {
      if (isRealUsername(candidate)) return candidate;
    }
    return null;
  }, [isRealUsername]);

  /** Deduplicate participants by user_id */
  const deduplicateParticipants = useCallback((participants) => {
    const seen = new Set();
    const unique = [];
    const duplicates = [];

    for (const p of participants) {
      if (seen.has(p.user_id)) {
        duplicates.push(p.user_id);
      } else {
        seen.add(p.user_id);
        unique.push(p);
      }
    }
    
    if (duplicates.length > 0) {
      console.warn(`[VoiceCall] Filtered ${duplicates.length} duplicate participants:`, duplicates);
    }
    
    console.log(`[VoiceCall] Final participant count: ${unique.length}`, unique.map(p => `${p.username}(${p.user_id.substring(0, 8)})`));
    
    return unique;
  }, []);

  const mapServerParticipants = useCallback((serverUsers, prevParticipants = []) => {
    return serverUsers.map((u) => {
      const existing = prevParticipants.find((p) => p.user_id === u.userId);
        // Also check the presence cache â€” handles the race where WS `joined`
        // arrives before the first presence `onSync` populates prevParticipants.
        const cached = voicePresenceCacheRef.current.find((p) => p.user_id === u.userId);

      return {
        user_id: u.userId,
        username: resolveParticipantUsername(
            existing?.username,
            cached?.username,
            u.username
        ),
          avatar_url: existing?.avatar_url || cached?.avatar_url || u.avatar_url || null,
        isMuted: u.isMuted ?? false,
        isSpeaking: existing?.isSpeaking ?? false,
      };
    });
  }, [resolveParticipantUsername]);

  const normalizePresenceParticipants = useCallback((presenceUsers = []) => {
    return presenceUsers
      .filter((u) => {
        if (!u?.user_id) return false;
        if (u.user_id.startsWith("mock-user-")) {
          console.log("[VoiceCall] Filtering out mock user:", u.user_id);
          return false;
        }
        return true;
      })
      .map((u) => ({
        user_id: u.user_id,
        username: resolveParticipantUsername(u.username),
        avatar_url: u.avatar_url || null,
        isSpeaking: false,
        isMuted: u.isMuted ?? false,
      }));
  }, [resolveParticipantUsername]);

  const mergePresenceParticipants = useCallback((prevParticipants, presenceUsers) => {
    const normalizedPresence = normalizePresenceParticipants(presenceUsers);

    if (normalizedPresence.length === 0) {
      return isUserInCallRef.current ? prevParticipants : [];
    }

    // Presence payload is the authoritative source for who is in voice call.
    // Keep transient UI fields (like speaking) from previous state when possible.
    const mergedFromPresence = normalizedPresence.map((presenceUser) => {
      const previous = prevParticipants.find((p) => p.user_id === presenceUser.user_id);
      return {
        ...presenceUser,
        username: resolveParticipantUsername(
          presenceUser.username,
          previous?.username
        ),
        avatar_url: presenceUser.avatar_url || previous?.avatar_url || null,
        isSpeaking: previous?.isSpeaking ?? false,
      };
    });

    return deduplicateParticipants(mergedFromPresence);
  }, [deduplicateParticipants, normalizePresenceParticipants, resolveParticipantUsername]);

  const upsertPresenceParticipants = useCallback((prevParticipants, presenceUsers) => {
    const normalizedPresence = normalizePresenceParticipants(presenceUsers);
    if (normalizedPresence.length === 0) return prevParticipants;

    const merged = [...prevParticipants];

    normalizedPresence.forEach((presenceUser) => {
      const existingIndex = merged.findIndex((participant) => participant.user_id === presenceUser.user_id);

      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          username: resolveParticipantUsername(
            presenceUser.username,
            merged[existingIndex].username
          ),
          avatar_url: presenceUser.avatar_url || merged[existingIndex].avatar_url,
          isMuted: presenceUser.isMuted ?? merged[existingIndex].isMuted,
        };
      } else {
        merged.push(presenceUser);
      }
    });

    return deduplicateParticipants(merged);
  }, [deduplicateParticipants, normalizePresenceParticipants, resolveParticipantUsername]);

  const removePresenceParticipants = useCallback((prevParticipants, presenceUsers, fallbackUserId) => {
    const leavingIds = new Set(
      presenceUsers
        .map((u) => u?.user_id || fallbackUserId)
        .filter(Boolean)
    );

    if (leavingIds.size === 0) return prevParticipants;

    return prevParticipants.filter((participant) => !leavingIds.has(participant.user_id));
  }, []);

  /** Update voice presence in Supabase (so other users can see you in the call) */
  const updateVoicePresence = useCallback(
    async (muted) => {
      if (!realtimeServiceRef.current || !projectId || !user.id) return;
      try {
        await realtimeServiceRef.current.trackVoicePresence(projectId, {
          user_id: user.id,
          username: user.username || user.id,
          avatar_url: user.avatar_url,
          isMuted: muted,
        });
      } catch (e) {
        console.warn("[VoiceCall] trackVoicePresence error:", e);
      }
    },
    [projectId, user.id, user.username, user.avatar_url]
  );

  /** Remove voice presence from Supabase (when leaving the call) */
  const removeVoicePresence = useCallback(async () => {
    if (!realtimeServiceRef.current || !projectId) return;
    try {
      await realtimeServiceRef.current.untrackVoicePresence(projectId);
    } catch (e) {
      console.warn("[VoiceCall] untrackVoicePresence error:", e);
    }
  }, [projectId]);

  // --- WebRTC Setup ---

  /** Tear down the peer connection and local media */
  const closeWebRTC = useCallback(() => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      localAnalyserRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    // Clear pending ICE candidates
    pendingIceCandidatesRef.current = [];
    // Remove any dynamically-created <audio> elements
    document.querySelectorAll("audio[data-voice-remote]").forEach((el) => el.remove());
  }, []);

  /** Initialise WebRTC: get mic, create PeerConnection, create and send offer */
  const initWebRTC = useCallback(async () => {
    try {
      console.log("[VoiceCall] ðŸŽ¤ Requesting microphone access...");
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const errorMsg = isSecure 
          ? 'getUserMedia not supported in this browser'
          : 'getUserMedia requires HTTPS or localhost. Current URL: ' + window.location.href;
        console.error("[VoiceCall] âŒ", errorMsg);
        console.error("[VoiceCall] ðŸ’¡ Solution: Access via https:// or http://localhost:3000");
        setConnectionError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // 1 - Microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      
      console.log("[VoiceCall] âœ… Microphone access granted!");
      const audioTracks = stream.getAudioTracks();
      console.log(`[VoiceCall] ðŸ“Š Audio tracks count: ${audioTracks.length}`);
      audioTracks.forEach((track, index) => {
        console.log(`[VoiceCall] ðŸŽµ Track ${index}: ${track.label} | enabled: ${track.enabled} | muted: ${track.muted} | readyState: ${track.readyState}`);
      });

      // -- Audio analysis for local speaking detection --
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioContext;
        localAnalyserRef.current = analyser;

        if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = setInterval(() => {
          if (!localAnalyserRef.current || !isMountedRef.current) return;
          const dataArray = new Uint8Array(localAnalyserRef.current.frequencyBinCount);
          localAnalyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
          const speaking = avg > 15;
          const uid = currentUserIdRef.current;
          if (!uid) return;
          setParticipants((prev) => {
            const u = prev.find((p) => p.user_id === uid);
            if (!u || u.isSpeaking === speaking) return prev;
            return prev.map((p) =>
              p.user_id === uid ? { ...p, isSpeaking: speaking } : p
            );
          });
        }, 150);
      } catch (e) {
        console.warn("[VoiceCall] AudioContext not available for speaking detection:", e);
      }

      // 2 - PeerConnection with STUN servers
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      });
      pcRef.current = pc;
      console.log("[VoiceCall] âœ… RTCPeerConnection created");

      // Add local audio track
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        console.log(`[VoiceCall] âž• Added local ${track.kind} track to peer connection`);
        console.log(`[VoiceCall]    Track ID: ${track.id} | Label: ${track.label}`);
        console.log(`[VoiceCall]    Sender: ${sender ? 'Created successfully' : 'FAILED'}`);
      });

      // 3 - ICE candidate -> forward to server
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[VoiceCall] ðŸ§Š ICE candidate generated: ${event.candidate.type} | ${event.candidate.protocol}`);
          wsSend({
            action: "ice_candidate",
            roomId: roomIdRef.current,
            candidate: event.candidate.toJSON(),
          });
        } else {
          console.log("[VoiceCall] ðŸ§Š ICE gathering complete - All candidates sent");
        }
      };

      // 4 - Incoming remote tracks -> play audio
      pc.ontrack = (event) => {
        console.log("[VoiceCall] ðŸ”Š ontrack event fired!");
        console.log(`[VoiceCall]    Track kind: ${event.track.kind}`);
        console.log(`[VoiceCall]    Track ID: ${event.track.id}`);
        console.log(`[VoiceCall]    Track label: ${event.track.label}`);
        console.log(`[VoiceCall]    Track enabled: ${event.track.enabled}`);
        console.log(`[VoiceCall]    Track muted: ${event.track.muted}`);
        console.log(`[VoiceCall]    Track readyState: ${event.track.readyState}`);
        console.log(`[VoiceCall]    Streams count: ${event.streams.length}`);
        
        const remoteStream = event.streams[0];
        if (!remoteStream) {
          console.error("[VoiceCall] âŒ No stream in ontrack event");
          return;
        }
        
        console.log(`[VoiceCall]    Stream ID: ${remoteStream.id}`);
        console.log(`[VoiceCall]    Stream tracks: ${remoteStream.getTracks().length}`);
        console.log(`[VoiceCall]    Stream active: ${remoteStream.active}`);

        // Avoid duplicates
        const existingAudio = document.querySelector(`audio[data-stream-id="${remoteStream.id}"]`);
        if (existingAudio) {
          console.log("[VoiceCall]    âš ï¸ Audio element already exists for this stream, skipping");
          return;
        }

        const audio = document.createElement("audio");
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.volume = 1.0;
        audio.setAttribute("data-voice-remote", "true");
        audio.setAttribute("data-stream-id", remoteStream.id);
        document.body.appendChild(audio);
        
        console.log("[VoiceCall] ðŸ”Š Audio element created and added to DOM");
        console.log(`[VoiceCall]    Audio element ID: ${audio.id || 'none'}`);
        console.log(`[VoiceCall]    Audio paused: ${audio.paused}`);
        console.log(`[VoiceCall]    Audio muted: ${audio.muted}`);
        console.log(`[VoiceCall]    Audio volume: ${audio.volume}`);

        audio.onloadedmetadata = () => {
          console.log("[VoiceCall]    âœ… Audio metadata loaded");
          console.log(`[VoiceCall]    Duration: ${audio.duration}`);
        };

        audio.onplay = () => {
          console.log("[VoiceCall]    âœ… Audio element started playing!");
        };

        audio.onplaying = () => {
          console.log("[VoiceCall]    âœ… Audio is now playing");
        };

        audio.onerror = (err) => {
          console.error("[VoiceCall]    âŒ Audio element error:", err);
          console.error("[VoiceCall]    Error code:", audio.error?.code);
          console.error("[VoiceCall]    Error message:", audio.error?.message);
        };

        audio.onstalled = () => {
          console.warn("[VoiceCall]    âš ï¸ Audio stalled");
        };

        audio.onsuspend = () => {
          console.warn("[VoiceCall]    âš ï¸ Audio suspended");
        };

        audio.play().then(() => {
          console.log("[VoiceCall]    âœ… Audio play() promise resolved");
        }).catch((err) => {
          console.error("[VoiceCall]    âŒ Autoplay blocked or failed:", err.message);
          console.error("[VoiceCall]    ðŸ’¡ User may need to interact with page first");
        });
      };

      // 5 - Connection state monitoring
      pc.onconnectionstatechange = () => {
        if (!isMountedRef.current) return;
        const state = pc.connectionState;
        console.log(`[VoiceCall] ðŸ”— Connection state changed: ${state}`);
        
        if (state === "connected") {
          console.log("[VoiceCall] âœ… WebRTC connection established!");
          setConnectionState("connected");
        } else if (state === "failed") {
          console.error("[VoiceCall] âŒ WebRTC connection failed");
          setConnectionState("failed");
        } else if (state === "disconnected") {
          console.warn("[VoiceCall] âš ï¸ WebRTC disconnected");
          setConnectionState("connecting");
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!isMountedRef.current) return;
        console.log(`[VoiceCall] ðŸ§Š ICE state: ${pc.iceConnectionState}`);
      };

      // 6 - Create offer and send
      console.log("[VoiceCall] ðŸ“¤ Creating WebRTC offer...");
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      
      console.log(`[VoiceCall]    Offer created - type: ${offer.type}`);
      console.log(`[VoiceCall]    SDP length: ${offer.sdp.length} characters`);
      
      await pc.setLocalDescription(offer);
      console.log("[VoiceCall] âœ… Local description set (offer)");

      // Log all senders (tracks being sent)
      const senders = pc.getSenders();
      console.log(`[VoiceCall] ðŸ“Š Active senders count: ${senders.length}`);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`[VoiceCall]    Sender ${index}: ${sender.track.kind} track | enabled: ${sender.track.enabled} | readyState: ${sender.track.readyState}`);
        }
      });

      console.log("[VoiceCall] ðŸ“¤ SENDING WebRTC Offer to server");
      console.log(`[VoiceCall]    Offer SDP preview: ${offer.sdp.substring(0, 100)}...`);
      
      wsSend({
        action: "offer",
        roomId: roomIdRef.current,
        sdp: { type: offer.type, sdp: offer.sdp },
      });
    } catch (error) {
      console.error("[VoiceCall] âŒ WebRTC init error:", error.message);
      console.error("[VoiceCall]    Error stack:", error.stack);
      setConnectionState("failed");
      setConnectionError(error.message || "Microphone access failed. Please allow mic permission and retry.");
    }
  }, [wsSend]);

  // --- WebSocket Message Handler ---

  const handleWsMessage = useCallback(
    async (event) => {
      if (!isMountedRef.current) return;

      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        // -- Successfully joined a room --
        case "joined": {
          console.log("[VoiceCall] âœ… Successfully joined voice room");
          console.log(`[VoiceCall]    Room ID: ${data.roomId}`);
          console.log(`[VoiceCall]    User ID: ${data.userId}`);
          console.log(`[VoiceCall]    Users in room: ${data.users ? data.users.length : 0}`);
          
          // Log detailed user list from server
          if (data.users && Array.isArray(data.users)) {
            console.log(`[VoiceCall] ðŸ‘¥ SERVER SAYS ${data.users.length} users in room:`);
            data.users.forEach((u, i) => {
              console.log(`[VoiceCall]    ${i + 1}. ${u.userId?.substring(0, 20)}... | muted: ${u.isMuted}`);
            });
            if (data.users.length > 3) {
              console.warn(`[VoiceCall] âš ï¸ WARNING: ${data.users.length} users detected! This may be stale data from server.`);
            }
          }
          
          setIsUserInCall(true);
          isUserInCallRef.current = true;
          setConnectionState("connecting");

          if (data.userId) {
            setCurrentUserId(data.userId);
            currentUserIdRef.current = data.userId;
          }
          roomIdRef.current = data.roomId || roomIdRef.current;

          // Update participants immediately from server response
          if (data.users && Array.isArray(data.users)) {
            console.log("[VoiceCall] ðŸ“‹ Updating participants from server:", data.users.map(u => u.userId?.substring(0, 16)));
            setParticipants((prev) => {
              const newParticipants = mapServerParticipants(data.users, prev);
              return deduplicateParticipants(newParticipants);
            });
          }

          // Track voice presence so other users can see us
          updateVoicePresence(false);

          // Start WebRTC handshake
          console.log("[VoiceCall] ðŸŽ¯ Starting WebRTC initialization...");
          await initWebRTC();
          break;
        }

        // -- SFU answer to our offer --
        case "answer": {
          console.log("[VoiceCall] ðŸ“¥ Received WebRTC answer from server");
          const pc = pcRef.current;
          if (!pc) {
            console.error("[VoiceCall] âŒ ERROR: peerConnection is null, cannot handle answer");
            break;
          }
          
          console.log(`[VoiceCall]    Answer type: ${data.sdp.type}`);
          console.log(`[VoiceCall]    Answer SDP length: ${data.sdp.sdp.length} characters`);
          console.log(`[VoiceCall]    Answer SDP preview: ${data.sdp.sdp.substring(0, 100)}...`);
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log("[VoiceCall] âœ… Remote description set (answer)");
            
            // Process any pending ICE candidates
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`[VoiceCall] ðŸ“¦ Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log("[VoiceCall] âœ… Pending ICE candidate added");
                } catch (err) {
                  console.error("[VoiceCall] âŒ Error adding pending ICE candidate:", err.message);
                }
              }
              pendingIceCandidatesRef.current = [];
            }
            
            // Log receivers (tracks we're receiving)
            const receivers = pc.getReceivers();
            console.log(`[VoiceCall] ðŸ“Š Active receivers count: ${receivers.length}`);
            receivers.forEach((receiver, index) => {
              if (receiver.track) {
                console.log(`[VoiceCall]    Receiver ${index}: ${receiver.track.kind} track | enabled: ${receiver.track.enabled} | readyState: ${receiver.track.readyState}`);
              }
            });
          } catch (err) {
            console.error("[VoiceCall] âŒ setRemoteDescription (answer) error:", err.message);
            console.error("[VoiceCall]    Error stack:", err.stack);
          }
          break;
        }

        // -- Renegotiation offer from SFU (new peer joined) --
        case "offer": {
          console.log("[VoiceCall] ðŸ”„ Received renegotiation OFFER from server");
          const pc = pcRef.current;
          if (!pc) {
            console.error("[VoiceCall] âŒ ERROR: peerConnection is null, cannot handle renegotiation offer");
            break;
          }
          
          console.log(`[VoiceCall]    Offer type: ${data.sdp.type}`);
          console.log(`[VoiceCall]    Offer SDP length: ${data.sdp.sdp.length} characters`);
          
          try {
            const sigState = pc.signalingState;
            console.log(`[VoiceCall]    Current signaling state: ${sigState}`);
            
            // Handle glare (we also have a pending local offer)
            if (sigState === "have-local-offer" || sigState === "have-remote-offer") {
              console.warn(`[VoiceCall] âš ï¸ Glare detected! Rolling back to stable state from ${sigState}`);
              await pc.setLocalDescription({ type: "rollback" });
              console.log("[VoiceCall] âœ… Rolled back to stable state");
            }
            
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log("[VoiceCall] âœ… Remote description set (renegotiation offer)");

            // Process any pending ICE candidates
            if (pendingIceCandidatesRef.current.length > 0) {
              console.log(`[VoiceCall] ðŸ“¦ Processing ${pendingIceCandidatesRef.current.length} pending ICE candidates`);
              for (const candidate of pendingIceCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                  console.log("[VoiceCall] âœ… Pending ICE candidate added");
                } catch (err) {
                  console.error("[VoiceCall] âŒ Error adding pending ICE candidate:", err.message);
                }
              }
              pendingIceCandidatesRef.current = [];
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log("[VoiceCall] âœ… Created and set local description (renegotiation answer)");

            console.log(`[VoiceCall] ï¿½ Sending renegotiation answer to server - userId: ${currentUserIdRef.current}, roomId: ${roomIdRef.current}`);
            wsSend({
              action: "answer",
              roomId: roomIdRef.current,
              userId: currentUserIdRef.current,
              sdp: { type: answer.type, sdp: answer.sdp },
            });
            console.log("[VoiceCall] âœ… Answer sent successfully");
            
            // Log receivers (tracks we're receiving)
            const receivers = pc.getReceivers();
            console.log(`[VoiceCall] ï¿½ Active receivers count after renegotiation: ${receivers.length}`);
            receivers.forEach((receiver, index) => {
              if (receiver.track) {
                console.log(`[VoiceCall]    Receiver ${index}: ${receiver.track.kind} track | enabled: ${receiver.track.enabled} | readyState: ${receiver.track.readyState}`);
              }
            });
          } catch (err) {
            console.error("[VoiceCall] âŒ renegotiation error:", err.message);
            console.error("[VoiceCall]    Error stack:", err.stack);
          }
          break;
        }

        // -- ICE candidate from SFU --
        case "ice_candidate": {
          console.log("[VoiceCall] ðŸ§Š Received ICE candidate from server");
          const pc = pcRef.current;
          if (pc && data.candidate) {
            try {
              // Check if remote description is set
              if (!pc.remoteDescription) {
                console.log("[VoiceCall] â³ Remote description not set yet, queuing ICE candidate");
                pendingIceCandidatesRef.current.push(data.candidate);
              } else {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log("[VoiceCall] âœ… ICE candidate added");
              }
            } catch (err) {
              console.error("[VoiceCall] âŒ addIceCandidate error:", err.message);
            }
          } else {
            console.warn("[VoiceCall] âš ï¸ Cannot add ICE candidate - peerConnection or candidate is null");
          }
          break;
        }

        // -- Left the room --
        case "left": {
          console.log("[VoiceCall] ðŸ‘‹ Left the voice room");
          setIsUserInCall(false);
          isUserInCallRef.current = false;
          setIsMuted(false);
          isMutedRef.current = false;
          setConnectionState("idle");
          setParticipants([]); // Clear participants when leaving
          closeWebRTC();
          removeVoicePresence();
          
          // Close WebSocket to clean up server-side
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
          break;
        }

        // -- Mute / unmute confirmations --
        case "muted": {
          setIsMuted(true);
          isMutedRef.current = true;
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
          }
          // Update participants list with new mute status
          if (data.users && Array.isArray(data.users)) {
            console.log("[VoiceCall] ðŸ“‹ Updating participants from muted:", data.users.map(u => u.userId));
            setParticipants((prev) => {
              const newParticipants = mapServerParticipants(data.users, prev);
              return deduplicateParticipants(newParticipants);
            });
          }
          // Update presence so others see the muted state
          updateVoicePresence(true);
          break;
        }

        case "unmuted": {
          setIsMuted(false);
          isMutedRef.current = false;
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
          }
          // Update participants list with new mute status
          if (data.users && Array.isArray(data.users)) {
            console.log("[VoiceCall] ðŸ“‹ Updating participants from unmuted:", data.users.map(u => u.userId));
            setParticipants((prev) => {
              const newParticipants = mapServerParticipants(data.users, prev);
              return deduplicateParticipants(newParticipants);
            });
          }
          updateVoicePresence(false);
          break;
        }

        // -- Room broadcasts (update participants immediately) --
        case "user_joined": {
          console.log(`[VoiceCall] ðŸ‘¤ User joined: ${data.userId}`);
          if (data.users && Array.isArray(data.users)) {
            console.log("[VoiceCall] ðŸ“‹ Updating participants from user_joined:", data.users.map(u => u.userId));
            setParticipants((prev) => {
              const newParticipants = mapServerParticipants(data.users, prev);
              return deduplicateParticipants(newParticipants);
            });
          }
          break;
        }

        case "user_left": {
          console.log(`[VoiceCall] ðŸ‘‹ User left: ${data.userId}`);
          if (data.users && Array.isArray(data.users)) {
            console.log("[VoiceCall] ðŸ“‹ Updating participants from user_left:", data.users.map(u => u.userId));
            setParticipants((prev) => {
              const newParticipants = mapServerParticipants(data.users, prev);
              return deduplicateParticipants(newParticipants);
            });
          }
          break;
        }

        case "user_muted": {
          console.log(`[VoiceCall] ðŸ”‡ User mute status changed: ${data.userId}`);
          if (data.users && Array.isArray(data.users)) {
            console.log("[VoiceCall] ðŸ“‹ Updating participants from user_muted:", data.users.map(u => u.userId));
            setParticipants((prev) => {
              const newParticipants = mapServerParticipants(data.users, prev);
              return deduplicateParticipants(newParticipants);
            });
          }
          break;
        }

        case "user_unmuted": {
          console.log(`[VoiceCall] ðŸ”Š User unmute status changed: ${data.userId}`);
          if (data.users && Array.isArray(data.users)) {
            console.log("[VoiceCall] ðŸ“‹ Updating participants from user_unmuted:", data.users.map(u => u.userId));
            setParticipants((prev) => {
              const newParticipants = mapServerParticipants(data.users, prev);
              return deduplicateParticipants(newParticipants);
            });
          }
          break;
        }

        // -- Errors --
        case "error": {
          console.error("[VoiceCall] Server error:", data.error || data.message);
          if (isMountedRef.current) {
            setConnectionState("failed");
            setConnectionError(data.error || data.message || "Voice server returned an error");
          }
          break;
        }

        default:
          break;
      }
    },
    [initWebRTC, closeWebRTC, wsSend, updateVoicePresence, removeVoicePresence, deduplicateParticipants, mapServerParticipants]
  );

  // Keep the ref in sync with the latest handler
  useEffect(() => {
    handleWsMessageRef.current = handleWsMessage;
  }, [handleWsMessage]);

  // --- Connect WebSocket ---

  const connectWs = useCallback(async () => {
    // Do not reconnect if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("[VoiceCall] WebSocket already connected");
      return;
    }

    console.log("[VoiceCall] ðŸ”— Connecting WebSocket...");
    setConnectionState("connecting");
    setConnectionError("");

    // Get Supabase session token for auth
    let token = "";
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || `anon-${Date.now()}`;
    } catch (err) {
      console.warn("[VoiceCall] Failed to get Supabase session, using anonymous token:", err.message);
      token = `anon-${Date.now()}`;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
    if (!wsUrl) {
      console.error("[VoiceCall] âŒ NEXT_PUBLIC_WEBSOCKET_URL not set");
      setConnectionState("failed");
      setConnectionError("Voice server is not configured. Contact support.");
      return;
    }

    const fullUrl = `${wsUrl}?token=${token}`;
    console.log("[VoiceCall] Connecting to WebSocket endpoint");

    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      console.log("[VoiceCall] âœ… WebSocket connected successfully!");
      setIsConnected(true);
      setConnectionState("connected");
    };

    // Delegate to the latest message handler ref
    ws.onmessage = (event) => {
      console.log(`[VoiceCall] ðŸ“¥ RECEIVED WebSocket message:`, event.data);
      if (handleWsMessageRef.current) {
        handleWsMessageRef.current(event);
      }
    };

    ws.onerror = (error) => {
      if (!isMountedRef.current) return;
      console.error("[VoiceCall] âŒ WebSocket error:", error);
      setConnectionState("failed");
      setConnectionError("Unable to connect to voice server. Check network and try again.");
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;
      console.log(`[VoiceCall] ðŸ”Œ WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
      wsRef.current = null;
      setIsConnected(false);
      setIsUserInCall(false);
      isUserInCallRef.current = false;
      setIsMuted(false);
      isMutedRef.current = false;
      setConnectionState("idle");
      setConnectionError("");
      setParticipants([]); // Clear participants when WS closes
      closeWebRTC();
      removeVoicePresence();
    };
  }, [closeWebRTC, removeVoicePresence]);

  // --- Public actions ---

  /** Join the voice room (connects WS if needed, then sends join) */
  const joinCall = useCallback(async () => {
    if (!roomId) {
      console.error("[VoiceCall] âŒ Cannot join call - no roomId");
      return;
    }
    
    console.log(`[VoiceCall] ðŸš€ Attempting to join voice room: ${roomId}`);
    roomIdRef.current = roomId;

    try {
      setConnectionError("");
      // Connect WS if not already
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.log("[VoiceCall] WebSocket not connected, connecting now...");
        await connectWs();

        // Wait for WS to open (with timeout)
        await new Promise((resolve, reject) => {
          const ws = wsRef.current;
          if (!ws) {
            console.error("[VoiceCall] âŒ No WebSocket instance");
            return reject(new Error("No WebSocket"));
          }
          if (ws.readyState === WebSocket.OPEN) {
            console.log("[VoiceCall] WebSocket already open");
            return resolve();
          }

          console.log("[VoiceCall] Waiting for WebSocket to open...");
          const timeout = setTimeout(() => {
            console.error("[VoiceCall] âŒ WebSocket open timeout (8s)");
            reject(new Error("WS open timeout"));
          }, 8000);

          const origOnOpen = ws.onopen;
          ws.onopen = (e) => {
            clearTimeout(timeout);
            console.log("[VoiceCall] âœ… WebSocket opened");
            if (origOnOpen) origOnOpen(e);
            resolve();
          };

          const origOnError = ws.onerror;
          ws.onerror = (e) => {
            clearTimeout(timeout);
            console.error("[VoiceCall] âŒ WebSocket error during connection");
            if (origOnError) origOnError(e);
            reject(new Error("WS error"));
          };
        });
      }

      // Send join message
      console.log(`[VoiceCall] Sending join message for room: ${roomId}`);
      wsSend({ action: "join", roomId });
    } catch (error) {
      console.error("[VoiceCall] âŒ joinCall error:", error.message);
      console.error("[VoiceCall]    Error stack:", error.stack);
      setConnectionState("failed");
      setConnectionError("Could not join voice room. Check your connection and microphone permission.");
      // Auto-reset after error so the user can retry
      setTimeout(() => {
        if (isMountedRef.current) {
          console.log("[VoiceCall] Resetting connection state to idle");
          setConnectionState("idle");
        }
      }, 2000);
    }
  }, [roomId, connectWs, wsSend]);

  /** Leave the voice room */
  const leaveCall = useCallback(() => {
    console.log("[VoiceCall] ðŸšª Leaving voice call...");
    
    if (roomIdRef.current) {
      wsSend({ action: "leave", roomId: roomIdRef.current });
    }

    // Remove voice presence first (before closing WS)
    removeVoicePresence();

    setIsUserInCall(false);
    isUserInCallRef.current = false;
    setIsMuted(false);
    isMutedRef.current = false;
    setConnectionState("idle");
    setConnectionError("");
    setParticipants([]); // Clear participants when leaving
    closeWebRTC();

    // Close WS after leaving
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [wsSend, closeWebRTC, removeVoicePresence]);

  /** Toggle mute (sends to server + mutes local track immediately) */
  const toggleMute = useCallback(() => {
    if (!roomIdRef.current) return;

    if (isMutedRef.current) {
      wsSend({ action: "unmute", roomId: roomIdRef.current });
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
      }
      setIsMuted(false);
      isMutedRef.current = false;
    } else {
      wsSend({ action: "mute", roomId: roomIdRef.current });
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setIsMuted(true);
      isMutedRef.current = true;
    }
  }, [wsSend]);

  /** Get current room info for debugging */
  const getRoomInfo = useCallback(() => {
    const info = {
      projectId,
      roomId: roomId,
      fullRoomId: `voice-room-${projectId}`,
      isInCall: isUserInCallRef.current,
      participantCount: participants.length,
      participants: participants.map(p => ({
        user_id: p.user_id.substring(0, 16),
        username: p.username,
        isMuted: p.isMuted
      }))
    };
    console.log("[VoiceCall] ðŸ“Š Room Info:", info);
    return info;
  }, [projectId, roomId, participants]);

  // --- Voice Presence Subscription (enables State 2 visibility) ---

  useEffect(() => {
    if (!projectId || !user.id) return;

    const rs = getRealtimeService();
    realtimeServiceRef.current = rs;

    // Subscribe to voice presence - ALL users get notified who is in the call
    const unsub = rs.subscribeToVoicePresence(projectId, user.id, {
      onSync: (voiceUsers) => {
        if (!isMountedRef.current) return;
        // Rebuild the full presence cache so mapServerParticipants can resolve
        // real usernames even when WS `joined` fired before this sync arrived.
        voicePresenceCacheRef.current = normalizePresenceParticipants(voiceUsers);
        setParticipants((prev) => mergePresenceParticipants(prev, voiceUsers));
      },
      onJoin: (joinedUsers) => {
        if (!isMountedRef.current) return;
        // Upsert incoming entries into the presence cache.
        const incoming = normalizePresenceParticipants(joinedUsers);
        incoming.forEach((nu) => {
          const idx = voicePresenceCacheRef.current.findIndex((p) => p.user_id === nu.user_id);
          if (idx >= 0) voicePresenceCacheRef.current[idx] = nu;
          else voicePresenceCacheRef.current.push(nu);
        });
        setParticipants((prev) => upsertPresenceParticipants(prev, joinedUsers));
      },
      onLeave: (leftUsers, leftUserId) => {
        if (!isMountedRef.current) return;
        // Remove leaving entries from the presence cache.
        const leavingIds = new Set(leftUsers.map((u) => u?.user_id).filter(Boolean));
        if (leftUserId) leavingIds.add(leftUserId);
        voicePresenceCacheRef.current = voicePresenceCacheRef.current.filter(
          (p) => !leavingIds.has(p.user_id)
        );
        setParticipants((prev) => removePresenceParticipants(prev, leftUsers, leftUserId));
      },
    });

    return () => {
      if (unsub) unsub();
    };
  }, [projectId, user.id, normalizePresenceParticipants, mergePresenceParticipants, upsertPresenceParticipants, removePresenceParticipants]);

  // --- Lifecycle ---

  useEffect(() => {
    isMountedRef.current = true;

    // Cleanup on page refresh/close
    const handleBeforeUnload = () => {
      console.log('[VoiceCall] ðŸ”„ Page unloading - cleaning up');
      
      // Leave call if in one
      if (isUserInCallRef.current && roomIdRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: 'leave',
          roomId: roomIdRef.current
        }));
      }
      
      // Remove presence
      if (realtimeServiceRef.current && projectId) {
        realtimeServiceRef.current.untrackVoicePresence(projectId).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isMountedRef.current = false;

      // Full cleanup on unmount
      closeWebRTC();

      // Leave call via WebSocket
      if (isUserInCallRef.current && roomIdRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: 'leave',
          roomId: roomIdRef.current
        }));
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Untrack voice presence on unmount
      if (realtimeServiceRef.current && projectId) {
        realtimeServiceRef.current.untrackVoicePresence(projectId).catch(() => {});

        }
      };
  }, [closeWebRTC, projectId]);

  // --- Return ---
  return {
    // State
    isConnected,
    isUserInCall,
    isMuted,
    participants,
    currentUserId,
    connectionState,
    connectionError,
    roomId: `voice-room-${projectId}`, // Expose room ID for debugging

    // Actions
    joinCall,
    leaveCall,
    toggleMute,
    
    // Debug functions
    getRoomInfo,
  };
}
