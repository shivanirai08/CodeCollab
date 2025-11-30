import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRealtimeService } from '@/lib/supabase/realtime';
import { updateOnlineUsers } from '@/store/ProjectSlice';

/**
 * Custom hook for real-time presence tracking
 * Broadcasts current user's online status and receives other users' presence
 * Uses Supabase Presence feature to show who's currently active in the project
 * projectId - The project ID to track presence for
 * enabled - Whether to enable presence tracking
 */
export const useRealtimePresence = (projectId, enabled = true) => {
  const dispatch = useDispatch();
  const realtimeService = useRef(null);
  const unsubscribeRef = useRef(null);

  // Get current user info from Redux
  const currentUser = useSelector((state) => ({
    id: state.user.id,
    username: state.user.userName,
    avatar_url: state.user.avatar_url,
  }));

  useEffect(() => {
    // Skip if disabled, no project ID, or no user ID
    if (!enabled || !projectId || !currentUser.id) {
      return;
    }

    // Initialize realtime service
    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
    }

    /**
     * Track presence using Supabase Presence API
     * Broadcasts current user's status and syncs with other online users
     * Used to display online avatars in the project header
     */
    const unsubscribe = realtimeService.current.trackPresence(
      projectId,
      currentUser,
      (onlineUsers) => {
        // Update Redux store with list of online users
        dispatch(updateOnlineUsers(onlineUsers));
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Clear online users from store when leaving
      dispatch(updateOnlineUsers([]));
    };
  }, [projectId, enabled, dispatch, currentUser.id, currentUser.username, currentUser.avatar_url]);

  return {
    isTracking: !!unsubscribeRef.current,
  };
};

export default useRealtimePresence;
