import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { getRealtimeService } from '@/lib/supabase/realtime';
import {
  handleRemoteNodeInsert,
  handleRemoteNodeUpdate,
  handleRemoteNodeDelete,
} from '@/store/NodesSlice';
import { toast } from 'sonner';


export const useRealtimeNodes = (projectId, enabled = true, currentUserId = null) => {
  const dispatch = useDispatch();
  const realtimeService = useRef(null);
  const unsubscribeRef = useRef(null);

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
        dispatch(handleRemoteNodeInsert(newNode));

        if(newNode.created_by === currentUserId) return;

        const nodeType = newNode.type === 'folder' ? 'Folder' : 'File';
        toast.success(`${nodeType} created: ${newNode.name}`, {
          description: 'A collaborator added a new item',
          duration: 3000,
        });
      },

      onUpdate: (updatedNode, oldNode) => {
        dispatch(handleRemoteNodeUpdate(updatedNode));

        const oldname = oldNode.name || 'Unknown';
        const nameChanged = oldNode.name !== updatedNode.name;
        const contentChanged = oldNode.content !== updatedNode.content;

        if(updatedNode.updated_by === currentUserId) return;

        if (nameChanged) {
          toast.info(`File renamed: ${oldname} → ${updatedNode.name}`, {
            description: 'A collaborator renamed a file',
            duration: 3000,
          });
        } else if (contentChanged && updatedNode.type === 'file') {
          toast.info(`File updated: ${updatedNode.name}`, {
            description: 'A collaborator modified the file',
            duration: 2000,
          });
        }
      },

      onDelete: (deletedNode) => {
        if (!deletedNode || !deletedNode.id) {
          console.error('[useRealtimeNodes] Invalid delete payload - missing node data');
          return;
        }

        dispatch(handleRemoteNodeDelete(deletedNode));
        if(deletedNode.deleted_by === currentUserId) return;

        const nodeType = deletedNode.type === 'folder' ? 'Folder' : 'File';
        const nodeName = deletedNode.name || 'Unknown';
        toast.warning(`${nodeType} deleted: ${nodeName}`, {
          description: 'A collaborator removed an item',
          duration: 3000,
        });
      },
    });

    // Store unsubscribe function
    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when projectId changes
    return () => {
      console.log(`[useRealtimeNodes] Cleaning up subscriptions for project: ${projectId}`);
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
