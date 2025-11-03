import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getRealtimeService } from '@/lib/supabase/realtime';
import { debounce } from 'lodash';


export const useCollaborativeEditing = (projectId, fileId, options = {}) => {
  const { onRemoteChange, onRemoteCursor, onLineLock, onLineUnlock, onUserLeaveFile, enabled = true, canBroadcast = true } = options;

  const realtimeService = useRef(null);
  const unsubscribeRef = useRef(null);
  const isApplyingRemoteChangeRef = useRef(false);

  // Get current user info
  const currentUser = useSelector((state) => ({
    id: state.user.id,
    username: state.user.userName,
    avatar_url: state.user.avatar_url,
  }));

  // Debounced broadcast of content changes
  const broadcastContentChange = useCallback(
    debounce((content, version) => {
      if (!canBroadcast) {
        console.log('[Collab] Skipping content broadcast - view-only user');
        return;
      }

      if (!realtimeService.current || !projectId || !fileId || !currentUser.id) {
        return;
      }

      realtimeService.current.broadcastContentChange(projectId, fileId, {
        userId: currentUser.id,
        username: currentUser.username,
        content,
        version,
        timestamp: Date.now(),
      });
    }, 300),
    [projectId, fileId, currentUser.id, currentUser.username, canBroadcast]
  );

  // Broadcast cursor position
  const broadcastCursorPosition = useCallback(
    debounce((position) => {
      if (!canBroadcast) {
        // View-only users don't broadcast their cursor
        return;
      }

      if (!realtimeService.current || !projectId || !fileId || !currentUser.id) {
        return;
      }

      realtimeService.current.broadcastCursorChange(projectId, fileId, {
        userId: currentUser.id,
        username: currentUser.username,
        avatar_url: currentUser.avatar_url,
        position,
        timestamp: Date.now(),
      });
    }, 100),
    [projectId, fileId, currentUser.id, currentUser.username, currentUser.avatar_url, canBroadcast]
  );

  // Broadcast line lock
  const broadcastLineLock = useCallback((lineNumber) => {
    if (!canBroadcast || !realtimeService.current || !projectId || !fileId || !currentUser.id) {
      return;
    }

    console.log('[Collab] Broadcasting line lock:', lineNumber);

    realtimeService.current.broadcastLineLock(projectId, fileId, {
      userId: currentUser.id,
      username: currentUser.username,
      lineNumber,
      timestamp: Date.now(),
    });
  }, [projectId, fileId, currentUser.id, currentUser.username, canBroadcast]);

  // Broadcast line unlock
  const broadcastLineUnlock = useCallback((lineNumber) => {
    if (!canBroadcast || !realtimeService.current || !projectId || !fileId || !currentUser.id) {
      return;
    }

    console.log('[Collab] Broadcasting line unlock:', lineNumber);

    realtimeService.current.broadcastLineUnlock(projectId, fileId, {
      userId: currentUser.id,
      lineNumber,
      timestamp: Date.now(),
    });
  }, [projectId, fileId, currentUser.id, canBroadcast]);

  // Broadcast user leaving file
  const broadcastUserLeaveFile = useCallback(() => {
    if (!realtimeService.current || !projectId || !fileId || !currentUser.id) {
      return;
    }

    console.log('[Collab] Broadcasting user leave file');

    realtimeService.current.broadcastUserLeaveFile(projectId, fileId, {
      userId: currentUser.id,
      username: currentUser.username,
      timestamp: Date.now(),
    });
  }, [projectId, fileId, currentUser.id, currentUser.username]);

  // Use refs for callbacks to avoid dependency issues
  const onRemoteChangeRef = useRef(onRemoteChange);
  const onRemoteCursorRef = useRef(onRemoteCursor);
  const onLineLockRef = useRef(onLineLock);
  const onLineUnlockRef = useRef(onLineUnlock);
  const onUserLeaveFileRef = useRef(onUserLeaveFile);

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
    onRemoteCursorRef.current = onRemoteCursor;
    onLineLockRef.current = onLineLock;
    onLineUnlockRef.current = onLineUnlock;
    onUserLeaveFileRef.current = onUserLeaveFile;
  }, [onRemoteChange, onRemoteCursor, onLineLock, onLineUnlock, onUserLeaveFile]);

  useEffect(() => {
    // Skip if disabled or missing required data
    if (!enabled || !projectId || !fileId || !currentUser.id) {
      return;
    }

    console.log('[Collab] Setting up collaboration for file:', fileId);

    // Initialize realtime service
    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
    }

    // Subscribe to file-level collaboration events
    const unsubscribe = realtimeService.current.subscribeToCollaboration(
      projectId,
      fileId,
      {
        onContentChange: (data) => {
          // Ignore own changes
          if (data.userId === currentUser.id) {
            return;
          }

          // Mark that we're applying a remote change to prevent loops
          isApplyingRemoteChangeRef.current = true;

          console.log('[Collab] Remote content change from:', data.username);
          onRemoteChangeRef.current?.(data);

          // Reset flag after a short delay
          setTimeout(() => {
            isApplyingRemoteChangeRef.current = false;
          }, 100);
        },

        onCursorChange: (data) => {
          // Ignore own cursor
          if (data.userId === currentUser.id) {
            return;
          }

          console.log('[Collab] Remote cursor change from:', data.username, 'position:', data.position);
          onRemoteCursorRef.current?.(data);
        },

        onLineLock: (data) => {
          // Ignore own locks
          if (data.userId === currentUser.id) {
            return;
          }

          console.log('[Collab] Remote line lock from:', data.username, 'line:', data.lineNumber);
          onLineLockRef.current?.(data);
        },

        onLineUnlock: (data) => {
          // Ignore own unlocks
          if (data.userId === currentUser.id) {
            return;
          }

          console.log('[Collab] Remote line unlock from:', data.username, 'line:', data.lineNumber);
          onLineUnlockRef.current?.(data);
        },

        onUserLeaveFile: (data) => {
          // Ignore own leave events
          if (data.userId === currentUser.id) {
            return;
          }

          console.log('[Collab] User left file:', data.username);
          onUserLeaveFileRef.current?.(data);
        },
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or file change
    return () => {
      console.log(`[useCollaborativeEditing] Cleaning up collaboration for file:`, fileId);

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      broadcastContentChange.cancel();
      broadcastCursorPosition.cancel();
    };
  }, [projectId, fileId, enabled, currentUser.id]);

  return {
    isConnected: !!unsubscribeRef.current,
    broadcastContentChange,
    broadcastCursorPosition,
    broadcastLineLock,
    broadcastLineUnlock,
    isApplyingRemoteChange: () => isApplyingRemoteChangeRef.current,
  };
};

export default useCollaborativeEditing;
