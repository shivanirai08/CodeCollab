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
 * Critical for showing when users are added/removed from the project
 * projectId - The project ID to monitor
 * enabled - Whether to enable real-time subscription
 * onUserRemoved - Callback when current user is removed from project
 */
export const useRealtimeMembers = (projectId, enabled = false, onUserRemoved) => {
  const dispatch = useDispatch();
  const realtimeService = useRef(null);
  const unsubscribeRef = useRef(null);
  const currentUserId = useSelector((state) => state.user.id);

  useEffect(() => {
    if (!enabled || !projectId) {
      return;
    }

    // Initialize realtime service
    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
    }

    /**
     * Subscribe to project members changes
     * - INSERT: When new collaborators are added
     * - UPDATE: When member roles/permissions change
     * - DELETE: When members are removed (critical for current user)
     */
    const unsubscribe = realtimeService.current.subscribeToMembers(projectId, {
      onInsert: async (newMember) => {
        // Fetch full member data including user details
        await dispatch(memberProject(projectId));
      },

      onDelete: async (deletedMember) => {
        // Validate payload - requires REPLICA IDENTITY FULL on table
        if (!deletedMember || !deletedMember.user_id) {
          await dispatch(memberProject(projectId));
          return;
        }

        // CRITICAL: Check if the removed member is the current user
        // If yes, trigger modal to show they've been removed
        if (deletedMember.user_id === currentUserId) {
          if (onUserRemoved) {
            onUserRemoved();
          }
          return;
        }

        // For other users being removed, refetch the member list
        await dispatch(memberProject(projectId));
      },

      onUpdate: async (updatedMember) => {
        // Refetch all members to get updated role data
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
