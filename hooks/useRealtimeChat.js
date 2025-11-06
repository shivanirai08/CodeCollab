import { useEffect, useRef, useCallback } from 'react';
import { getRealtimeService } from '@/lib/supabase/realtime';
import { createClient } from '@/lib/supabase/client';

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

  useEffect(() => {
    // Skip if disabled or no project ID
    if (!enabled || !projectId) {
      console.log('[useRealtimeChat] Subscription skipped:', { enabled, projectId });
      return;
    }

    // Prevent duplicate subscription
    if (isSubscribedRef.current) {
      console.warn('[useRealtimeChat] Already subscribed, skipping duplicate subscription for project:', projectId);
      return;
    }

    subscriptionIdRef.current++;
    const currentSubscriptionId = subscriptionIdRef.current;
    console.log(`[useRealtimeChat] Starting subscription #${currentSubscriptionId} for project:`, projectId);

    // Initialize supabase client and realtime service
    if (!supabase.current) {
      supabase.current = createClient();
      console.log('[useRealtimeChat] Supabase client created');
    }

    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
      console.log('[useRealtimeChat] Realtime service initialized');
    }

    // Mark as subscribed before subscribing
    isSubscribedRef.current = true;

    // Subscribe to chat messages
    const unsubscribe = realtimeService.current.subscribeToChatMessages(
      projectId,
      {
        onNewMessage: (message) => {
          console.log(`[useRealtimeChat] Subscription #${currentSubscriptionId} - Message received:`, {
            id: message.id,
            from: message.username,
            timestamp: new Date().toISOString()
          });
          onNewMessageRef.current?.(message);
        },
        onDeleteMessage: (message) => {
          console.log(`[useRealtimeChat] Subscription #${currentSubscriptionId} - Message deleted:`, message);
        },
      }
    );

    // Store unsubscribe function
    unsubscribeRef.current = unsubscribe;
    console.log(`[useRealtimeChat] Subscription #${currentSubscriptionId} established for project:`, projectId);

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log(`[useRealtimeChat] Cleanup triggered for subscription #${currentSubscriptionId}, project: ${projectId}`);
      isSubscribedRef.current = false;

      if (unsubscribeRef.current) {
        console.log(`[useRealtimeChat] Unsubscribing subscription #${currentSubscriptionId}`);
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
      console.error('[useRealtimeChat] Error fetching messages:', error);
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
      console.error('[useRealtimeChat] Error sending message:', error);
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
      console.error('[useRealtimeChat] Error deleting message:', error);
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
