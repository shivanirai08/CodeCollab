import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRealtimeService } from '@/lib/supabase/realtime';
import { updateOnlineUsers } from '@/store/ProjectSlice';


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

    // Track presence and handle presence sync
    const unsubscribe = realtimeService.current.trackPresence(
      projectId,
      currentUser,
      (onlineUsers) => {
        dispatch(updateOnlineUsers(onlineUsers));
      }
    );

    // Store unsubscribe function
    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log(`[useRealtimePresence] Cleaning up presence tracking for project: ${projectId}`);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Clear online users from store
      dispatch(updateOnlineUsers([]));
    };
  }, [projectId, enabled, dispatch, currentUser.id, currentUser.username, currentUser.avatar_url]);

  return {
    isTracking: !!unsubscribeRef.current,
  };
};

export default useRealtimePresence;
