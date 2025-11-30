import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { getRealtimeService } from '@/lib/supabase/realtime';
import {
  handleRemoteNodeInsert,
  handleRemoteNodeUpdate,
  handleRemoteNodeDelete,
} from '@/store/NodesSlice';

/**
 * Custom hook for real-time file/folder structure synchronization
 * Subscribes to node (file/folder) INSERT, UPDATE, DELETE events via Supabase
 * Updates Redux store to keep file tree in sync across all collaborators
 * projectId - The project ID to subscribe to
 * enabled - Whether the subscription is active
 * currentUserId - Current user ID to filter out own actions
 */
export const useRealtimeNodes = (projectId, enabled = true, currentUserId = null) => {
  const dispatch = useDispatch();
  const realtimeService = useRef(null);
  const unsubscribeRef = useRef(null);

  /**
   * Main effect: Subscribes to real-time node (file/folder) changes
   * - INSERT: When files/folders are created
   * - UPDATE: When files/folders are renamed or content is modified
   * - DELETE: When files/folders are removed
   */
  useEffect(() => {
    // Skip if disabled or no project ID
    if (!enabled || !projectId) {
      return;
    }

    // Initialize realtime service
    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
    }

    // Subscribe to nodes table changes
    const unsubscribe = realtimeService.current.subscribeToNodes(projectId, {
      onInsert: (newNode) => {
        // Update Redux store with the newly created node
        dispatch(handleRemoteNodeInsert(newNode));
      },

      onUpdate: (updatedNode, oldNode) => {
        // Update Redux store with modified node (rename or content change)
        dispatch(handleRemoteNodeUpdate(updatedNode));
      },

      onDelete: (deletedNode) => {
        if (!deletedNode || !deletedNode.id) {
          return;
        }

        // Remove node from Redux store
        dispatch(handleRemoteNodeDelete(deletedNode));
      },
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when projectId changes
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [projectId, enabled, dispatch, currentUserId]);

  return {
    isConnected: !!unsubscribeRef.current,
  };
};

export default useRealtimeNodes;
