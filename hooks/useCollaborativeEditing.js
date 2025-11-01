import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getRealtimeService } from '@/lib/supabase/realtime';
import { debounce } from 'lodash';


export const useCollaborativeEditing = (projectId, fileId, options = {}) => {
  const { onRemoteChange, onRemoteCursor, enabled = true } = options;

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
    [projectId, fileId, currentUser.id, currentUser.username]
  );

  // Broadcast cursor position
  const broadcastCursorPosition = useCallback(
    debounce((position) => {
      if (!realtimeService.current || !projectId || !fileId || !currentUser.id) {
        console.warn('[Collab] Cannot broadcast cursor - missing data:', {
          hasService: !!realtimeService.current,
          projectId,
          fileId,
          userId: currentUser.id
        });
        return;
      }

      console.log('[Collab] Broadcasting cursor position:', currentUser.username, position);

      realtimeService.current.broadcastCursorChange(projectId, fileId, {
        userId: currentUser.id,
        username: currentUser.username,
        avatar_url: currentUser.avatar_url,
        position,
        timestamp: Date.now(),
      });
    }, 100),
    [projectId, fileId, currentUser.id, currentUser.username, currentUser.avatar_url]
  );

  // Use refs for callbacks to avoid dependency issues
  const onRemoteChangeRef = useRef(onRemoteChange);
  const onRemoteCursorRef = useRef(onRemoteCursor);

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
    onRemoteCursorRef.current = onRemoteCursor;
  }, [onRemoteChange, onRemoteCursor]);

  useEffect(() => {
    // Skip if disabled or missing required data
    if (!enabled || !projectId || !fileId || !currentUser.id) {
      console.log('[Collab] Skipping setup:', { enabled, projectId, fileId, userId: currentUser.id });
      return;
    }

    console.log('[Collab] Setting up collaboration for file:', fileId);

    // Initialize realtime service
    if (!realtimeService.current) {
      realtimeService.current = getRealtimeService();
    }

    // Subscribe to collaboration events
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
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log(`[useCollaborativeEditing] Cleaning up for file: ${fileId}`);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      broadcastContentChange.cancel();
      broadcastCursorPosition.cancel();
    };
  }, [projectId, fileId, enabled, currentUser.id, broadcastContentChange, broadcastCursorPosition]);

  return {
    isConnected: !!unsubscribeRef.current,
    broadcastContentChange,
    broadcastCursorPosition,
    isApplyingRemoteChange: () => isApplyingRemoteChangeRef.current,
  };
};

export default useCollaborativeEditing;
