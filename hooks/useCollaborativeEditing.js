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

  /**
   * Broadcasts content changes to other collaborators with debouncing
   * Debounced to 300ms to avoid excessive real-time updates during typing
   * content - The updated file content
   * version - Version number for conflict resolution
   */
  const broadcastContentChange = useCallback(
    debounce((content, version) => {
      // View-only users cannot broadcast content changes
      if (!canBroadcast || !realtimeService.current || !projectId || !fileId || !currentUser.id) {
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

  /**
   * Broadcasts cursor position to show remote users where you're typing
   * Debounced to 100ms for smooth cursor tracking without overwhelming the network
   * position - Monaco editor position {lineNumber, column}
   */
  const broadcastCursorPosition = useCallback(
    debounce((position) => {
      // View-only users don't broadcast their cursor
      if (!canBroadcast || !realtimeService.current || !projectId || !fileId || !currentUser.id) {
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

  /**
   * Broadcasts line lock to prevent concurrent editing conflicts
   * When a user starts editing a line, it's locked for other collaborators
   * lineNumber - The line number being locked
   */
  const broadcastLineLock = useCallback((lineNumber) => {
    if (!canBroadcast || !realtimeService.current || !projectId || !fileId || !currentUser.id) {
      return;
    }

    realtimeService.current.broadcastLineLock(projectId, fileId, {
      userId: currentUser.id,
      username: currentUser.username,
      lineNumber,
      timestamp: Date.now(),
    });
  }, [projectId, fileId, currentUser.id, currentUser.username, canBroadcast]);

  /**
   * Broadcasts line unlock when user moves to a different line
   * Allows other collaborators to edit the previously locked line
   * lineNumber - The line number being unlocked
   */
  const broadcastLineUnlock = useCallback((lineNumber) => {
    if (!canBroadcast || !realtimeService.current || !projectId || !fileId || !currentUser.id) {
      return;
    }

    realtimeService.current.broadcastLineUnlock(projectId, fileId, {
      userId: currentUser.id,
      lineNumber,
      timestamp: Date.now(),
    });
  }, [projectId, fileId, currentUser.id, canBroadcast]);

  /**
   * Broadcasts when user leaves the file to release all locks
   * This cleanup ensures other users can edit all lines
   */
  const broadcastUserLeaveFile = useCallback(() => {
    if (!realtimeService.current || !projectId || !fileId || !currentUser.id) {
      return;
    }

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

  /**
   * Main effect: Sets up real-time collaboration subscriptions for the current file
   * Subscribes to content changes, cursor movements, line locks/unlocks, and user presence
   * Uses refs for callbacks to prevent unnecessary re-subscriptions
   */
  useEffect(() => {
    // Skip if disabled or missing required data
    if (!enabled || !projectId || !fileId || !currentUser.id) {
      return;
    }

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
          // Ignore own changes to prevent echo
          if (data.userId === currentUser.id) {
            return;
          }

          // Mark that we're applying a remote change to prevent update loops
          isApplyingRemoteChangeRef.current = true;

          onRemoteChangeRef.current?.(data);

          // Reset flag after applying the change
          setTimeout(() => {
            isApplyingRemoteChangeRef.current = false;
          }, 100);
        },

        onCursorChange: (data) => {
          // Ignore own cursor to prevent echo
          if (data.userId === currentUser.id) {
            return;
          }

          onRemoteCursorRef.current?.(data);
        },

        onLineLock: (data) => {
          // Ignore own locks
          if (data.userId === currentUser.id) {
            return;
          }

          onLineLockRef.current?.(data);
        },

        onLineUnlock: (data) => {
          // Ignore own unlocks
          if (data.userId === currentUser.id) {
            return;
          }

          onLineUnlockRef.current?.(data);
        },

        onUserLeaveFile: (data) => {
          // Ignore own leave events
          if (data.userId === currentUser.id) {
            return;
          }

          onUserLeaveFileRef.current?.(data);
        },
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup: Unsubscribe and cancel pending debounced operations
    return () => {
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
