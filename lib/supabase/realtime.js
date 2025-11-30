import { createClient } from './client';

/**
 * RealtimeService - Centralized service for managing Supabase real-time subscriptions
 * Implements singleton pattern to prevent duplicate subscriptions across the app
 * Handles: database changes (INSERT/UPDATE/DELETE), broadcast events, and presence tracking
 */
export class RealtimeService {
  constructor() {
    this.supabase = createClient();
    // Map to track active channels and prevent duplicates
    this.channels = new Map();
  }

  // Subscribe to project members table changes
  subscribeToMembers(projectId, callbacks = {}) {
    const channelName = `project:${projectId}:members`;

    // Prevent duplicate subscriptions
    if (this.channels.has(channelName)) {
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          callbacks.onInsert?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          // Validate DELETE payload - requires REPLICA IDENTITY FULL on table
          if (!payload.old) {
            console.error('DELETE event has no old data. Table needs REPLICA IDENTITY FULL');
          }
          if (!payload.old?.user_id) {
            console.error('DELETE event missing user_id. Check REPLICA IDENTITY is set correctly');
          }
          callbacks.onDelete?.(payload.old);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          callbacks.onUpdate?.(payload.new, payload.old);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  // Subscribe to nodes table changes for a specific project (callbacks - Event handlers for node changes)
  subscribeToNodes(projectId, callbacks = {}) {
    const channelName = `project:${projectId}:nodes`;

    // Prevent duplicate subscriptions
    if (this.channels.has(channelName)) {
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nodes',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          callbacks.onInsert?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nodes',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          callbacks.onUpdate?.(payload.new, payload.old);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'nodes',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          // Validate DELETE payload
          if (!payload.old) {
            console.error('DELETE event has no old data. Table needs REPLICA IDENTITY FULL');
          }

          callbacks.onDelete?.(payload.old);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }


  /**
   * Broadcast a custom event to all channel subscribers
   * Creates channel dynamically if it doesn't exist
   * @param {string} projectId - The project ID
   * @param {string} event - Event name
   * @param {Object} payload - Data to broadcast
   */
  async broadcast(projectId, event, payload) {
    const channelName = `project:${projectId}:broadcast`;

    let channel = this.channels.get(channelName);

    if (!channel) {
      // Create broadcast channel on-demand
      channel = this.supabase.channel(channelName);
      await channel.subscribe();
      this.channels.set(channelName, channel);
    }

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  /**
   * Subscribe to broadcast events for a project
   * @param {string} projectId - The project ID
   * @param {string} event - Event name to listen for
   * @param {Function} callback - Callback when event is received
   * @returns {Function} Unsubscribe function
   */
  subscribeToBroadcast(projectId, event, callback) {
    const channelName = `project:${projectId}:broadcast`;

    if (this.channels.has(channelName)) {
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on('broadcast', { event }, (payload) => {
        callback(payload);
      })
      .subscribe();

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  /**
   * Subscribe to file-level collaborative editing events
   * Handles: content changes, cursor movements, line locks/unlocks, user presence
   * Uses broadcast (not postgres_changes) for real-time, low-latency updates
   * @param {string} projectId - The project ID
   * @param {string} fileId - The file ID being edited
   * @param {Object} callbacks - Event handlers for collaboration events
   * @returns {Function} Unsubscribe function
   */
  subscribeToCollaboration(projectId, fileId, callbacks = {}) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;

    // Prevent duplicate subscriptions
    if (this.channels.has(channelName)) {
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on('broadcast', { event: 'content-change' }, (payload) => {
        callbacks.onContentChange?.(payload.payload);
      })
      .on('broadcast', { event: 'cursor-change' }, (payload) => {
        callbacks.onCursorChange?.(payload.payload);
      })
      .on('broadcast', { event: 'line-lock' }, (payload) => {
        callbacks.onLineLock?.(payload.payload);
      })
      .on('broadcast', { event: 'line-unlock' }, (payload) => {
        callbacks.onLineUnlock?.(payload.payload);
      })
      .on('broadcast', { event: 'user-leave-file' }, (payload) => {
        callbacks.onUserLeaveFile?.(payload.payload);
      })
      .subscribe();

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  /**
   * Broadcast content changes to other collaborators
   * Called when user types in the editor
   */
  async broadcastContentChange(projectId, fileId, changeData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'content-change',
      payload: changeData,
    });
  }

  /**
   * Broadcast cursor position to show where user is typing
   */
  async broadcastCursorChange(projectId, fileId, cursorData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'cursor-change',
      payload: cursorData,
    });
  }

  /**
   * Broadcast line lock to prevent concurrent edits
   */
  async broadcastLineLock(projectId, fileId, lockData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'line-lock',
      payload: lockData,
    });
  }

  /**
   * Broadcast line unlock when moving away from a line
   */
  async broadcastLineUnlock(projectId, fileId, unlockData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'line-unlock',
      payload: unlockData,
    });
  }

  /**
   * Broadcast when user closes/leaves a file
   * Releases all locks held by that user
   */
  async broadcastUserLeaveFile(projectId, fileId, userData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'user-leave-file',
      payload: userData,
    });
  }

  /**
   * Subscribe to chat_messages table changes
   * Listens for new messages (INSERT) and deleted messages (DELETE)
   * @param {string} projectId - The project ID
   * @param {Object} callbacks - {onNewMessage, onDeleteMessage}
   * @returns {Function} Unsubscribe function
   */
  subscribeToChatMessages(projectId, callbacks = {}) {
    const channelName = `project:${projectId}:chat`;

    // Prevent duplicate chat subscriptions
    if (this.channels.has(channelName)) {
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          callbacks.onNewMessage?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          callbacks.onDeleteMessage?.(payload.old);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  /**
   * Track user presence in a project using Supabase Presence API
   * Shows who's currently online in the project (for online avatars display)
   * @param {string} projectId - The project ID
   * @param {Object} userInfo - {id, username, avatar_url}
   * @param {Function} onPresenceSync - Callback with array of online users
   * @returns {Function} Unsubscribe function
   */
  trackPresence(projectId, userInfo, onPresenceSync) {
    const channelName = `project:${projectId}:presence`;

    // Prevent duplicate presence tracking
    if (this.channels.has(channelName)) {
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName, {
        config: {
          presence: {
            key: userInfo.id, // Unique key per user
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        // Sync event fires when presence state changes
        const presenceState = channel.presenceState();
        const onlineUsers = Object.values(presenceState).flat();
        onPresenceSync?.(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User joined the project
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // User left the project
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Start tracking current user's presence
          await channel.track({
            user_id: userInfo.id,
            username: userInfo.username,
            avatar_url: userInfo.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  /**
   * Unsubscribe from a specific channel
   * Removes channel from Supabase and local cache
   * @param {string} channelName - The channel name to unsubscribe
   */
  async unsubscribe(channelName) {
    const channel = this.channels.get(channelName);

    if (channel) {
      await this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all channels related to a project
   * Useful when user leaves a project
   * @param {string} projectId - The project ID
   */
  async unsubscribeFromProject(projectId) {
    const projectChannels = Array.from(this.channels.keys()).filter(
      (channelName) => channelName.startsWith(`project:${projectId}:`)
    );

    for (const channelName of projectChannels) {
      await this.unsubscribe(channelName);
    }
  }

  /**
   * Cleanup all subscriptions
   * Called on app unmount or logout
   */
  async cleanup() {
    for (const [channelName, channel] of this.channels.entries()) {
      await this.supabase.removeChannel(channel);
    }
    this.channels.clear();
  }

  /**
   * Returns an unsubscribe function for a specific channel
   * @param {string} channelName - The channel name
   * @returns {Function} Async unsubscribe function
   */
  getUnsubscribeFunction(channelName) {
    return async () => {
      await this.unsubscribe(channelName);
    };
  }
}

// Singleton instance
let realtimeServiceInstance = null;


// Get or create the realtime service singleton
export const getRealtimeService = () => {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = new RealtimeService();
  }
  return realtimeServiceInstance;
};

export default getRealtimeService;
