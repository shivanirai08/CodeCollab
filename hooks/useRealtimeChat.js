import { useEffect, useRef, useCallback } from 'react';
import { getRealtimeService } from '@/lib/supabase/realtime';
import { createClient } from '@/lib/supabase/client';

/**
 * Custom hook for real-time chat functionality
 * Provides methods to fetch, send, and delete messages with real-time updates
 * projectId - The project ID to subscribe to
 * enabled - Whether the subscription is active
 * onNewMessage - Callback when a new message is received
 */
export const useRealtimeChat = (projectId, enabled = true, onNewMessage) => {
  const realtimeService = useRef(null);
  const unsubscribeRef = useRef(null);
  const supabase = useRef(null);
  const onNewMessageRef = useRef(onNewMessage);
  const isSubscribedRef = useRef(false);
  const subscriptionIdRef = useRef(0);

  // Keep the callback ref updated without triggering re-subscription
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  /**
   * Main effect: Subscribes to real-time chat messages for the project
   * Prevents duplicate subscriptions using isSubscribedRef flag
   */
  useEffect(() => {
    // Skip if disabled or no project ID
    if (!enabled || !projectId) {
      return;
    }

    // Prevent duplicate subscription
    if (isSubscribedRef.current) {
      return;
    }

    subscriptionIdRef.current++;

    // Initialize supabase client and realtime service
    if (!supabase.current) {
      supabase.current = createClient();
    }

    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
    }

    // Mark as subscribed before subscribing to prevent race conditions
    isSubscribedRef.current = true;

    // Subscribe to chat messages with INSERT and DELETE events
    const unsubscribe = realtimeService.current.subscribeToChatMessages(
      projectId,
      {
        onNewMessage: (message) => {
          onNewMessageRef.current?.(message);
        },
        onDeleteMessage: (message) => {
          // Delete events are handled in the ChatPanel component
        },
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when dependencies change
    return () => {
      isSubscribedRef.current = false;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, projectId]);

  // Function to fetch existing messages
  const fetchMessages = useCallback(async () => {
    if (!projectId || !supabase.current) {
      return [];
    }

    const { data, error } = await supabase.current
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      return [];
    }

    return data || [];
  }, [projectId]);

  // Function to send a new message
  const sendMessage = useCallback(async (messageText, userId, username, avatarUrl) => {
    if (!projectId || !supabase.current || !messageText.trim()) {
      return { success: false, error: 'Invalid input' };
    }

    const { data, error } = await supabase.current
      .from('chat_messages')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          username: username,
          avatar_url: avatarUrl,
          message: messageText.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }, [projectId]);

  // Function to delete a message
  const deleteMessage = useCallback(async (messageId) => {
    if (!messageId || !supabase.current) {
      return { success: false, error: 'Invalid message ID' };
    }

    const { error } = await supabase.current
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }, []);

  return {
    fetchMessages,
    sendMessage,
    deleteMessage,
  };
};

export default useRealtimeChat;
