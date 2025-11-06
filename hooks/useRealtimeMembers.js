import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getRealtimeService } from '@/lib/supabase/realtime';
import {
  handleRemoteMemberInsert,
  handleRemoteMemberDelete,
  handleRemoteMemberUpdate,
  memberProject,
} from '@/store/ProjectSlice';

/**
 * Hook to subscribe to real-time project member changes
 * Handles INSERT, UPDATE, DELETE events for project_members table
 */
export const useRealtimeMembers = (projectId, enabled = false, onUserRemoved) => {
  const dispatch = useDispatch();
  const realtimeService = useRef(null);
  const unsubscribeRef = useRef(null);
  const currentUserId = useSelector((state) => state.user.id);

  useEffect(() => {
    console.log('[useRealtimeMembers] Effect triggered:', {
      enabled,
      projectId,
      currentUserId,
      hasOnUserRemoved: !!onUserRemoved
    });

    if (!enabled || !projectId) {
      console.log('[useRealtimeMembers] Skipping - not enabled or no projectId');
      return;
    }

    // Initialize realtime service
    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
    }

    // Subscribe to project members changes
    const unsubscribe = realtimeService.current.subscribeToMembers(projectId, {
      onInsert: async (newMember) => {
        // Fetch full member data including user details
        await dispatch(memberProject(projectId));
      },
      onDelete: async (deletedMember) => {
        console.log('[useRealtimeMembers] onDelete callback triggered with:', {
          deletedMember,
          currentUserId,
          isCurrentUser: deletedMember?.user_id === currentUserId,
          hasOnUserRemoved: !!onUserRemoved
        });

        // Check if payload has the deleted member data
        if (!deletedMember || !deletedMember.user_id) {
          console.error('[useRealtimeMembers] No user_id in DELETE payload. REPLICA IDENTITY FULL may not be set.');
          // Fallback: refetch to update the list
          await dispatch(memberProject(projectId));
          return;
        }

        // Check if the removed member is the current user
        if (deletedMember.user_id === currentUserId) {

          // Notify parent component that user was removed
          if (onUserRemoved) {
            onUserRemoved();
          } else {
            console.error('[useRealtimeMembers] onUserRemoved callback is not defined!');
          }
          return;
        }

        // For other users, refetch the member list to show updated data
        await dispatch(memberProject(projectId));
      },
      onUpdate: async (updatedMember) => {
        // Refetch all members to get updated data
        await dispatch(memberProject(projectId));
      },
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [projectId, enabled, dispatch, currentUserId, onUserRemoved]);
};

export default useRealtimeMembers;
