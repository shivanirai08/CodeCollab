import { createClient } from './client';

export class RealtimeService {
  constructor() {
    this.supabase = createClient();
    this.channels = new Map();
  }

  // Subscribe to project members table changes
  subscribeToMembers(projectId, callbacks = {}) {
    const channelName = `project:${projectId}:members`;

    // Check if channel already exists
    if (this.channels.has(channelName)) {
      console.warn(`Channel ${channelName} already exists`);
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
          console.log('[Realtime] Member added:', payload.new);
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
          console.log('[Realtime] Member DELETE event received:', {
            old: payload.old,
            hasUserId: !!payload.old?.user_id,
            userId: payload.old?.user_id
          });
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
          console.log('[Realtime] Member updated:', payload.new);
          callbacks.onUpdate?.(payload.new, payload.old);
        }
      )
      .subscribe((status) => {
        console.log(`Members subscription status for ${projectId}:`, status);
      });

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  // Subscribe to nodes table changes for a specific project (callbacks - Event handlers for node changes)
  subscribeToNodes(projectId, callbacks = {}) {
    const channelName = `project:${projectId}:nodes`;

    // Check if channel already exists
    if (this.channels.has(channelName)) {
      console.warn(`Channel ${channelName} already exists`);
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
          if (!payload.old) {
            console.error('DELETE event has no old data. Table needs REPLICA IDENTITY FULL');
          }

          callbacks.onDelete?.(payload.old);
        }
      )
      .subscribe((status) => {
        console.log(`Nodes subscription status for ${projectId}:`, status);
      });

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }


  // Broadcast a custom event to all subscribers of a channel
  async broadcast(projectId, event, payload) {
    const channelName = `project:${projectId}:broadcast`;

    let channel = this.channels.get(channelName);

    if (!channel) {
      // Create broadcast channel if it doesn't exist
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

  // Subscribe to broadcast events
  subscribeToBroadcast(projectId, event, callback) {
    const channelName = `project:${projectId}:broadcast`;

    if (this.channels.has(channelName)) {
      console.warn(`Broadcast channel ${channelName} already exists`);
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName)
      .on('broadcast', { event }, (payload) => {
        callback(payload);
      })
      .subscribe((status) => {
        console.log(`Broadcast subscription status for ${projectId}:`, status);
      });

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }


  // Subscribe to file-level collaborative editing events
  subscribeToCollaboration(projectId, fileId, callbacks = {}) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;

    // Check if channel already exists
    if (this.channels.has(channelName)) {
      console.warn(`[Realtime] Collaboration channel ${channelName} already exists`);
      return this.getUnsubscribeFunction(channelName);
    }

    console.log(`[Realtime] Creating collaboration channel: ${channelName}`);

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
      .subscribe((status) => {
        console.log(`[Realtime] Collaboration subscription status:`, status);
      });

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  // Broadcast content change for collaborative editing
  async broadcastContentChange(projectId, fileId, changeData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`[Realtime] No collaboration channel for file ${fileId}`);
      return;
    }

    await channel.send({
      type: 'broadcast',
      event: 'content-change',
      payload: changeData,
    });
  }

  // Broadcast cursor position change
  async broadcastCursorChange(projectId, fileId, cursorData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`[Realtime] No collaboration channel for file ${fileId}`);
      return;
    }

    await channel.send({
      type: 'broadcast',
      event: 'cursor-change',
      payload: cursorData,
    });
  }

  // Broadcast line lock
  async broadcastLineLock(projectId, fileId, lockData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`[Realtime] No collaboration channel for file ${fileId}`);
      return;
    }

    await channel.send({
      type: 'broadcast',
      event: 'line-lock',
      payload: lockData,
    });
  }

  // Broadcast line unlock
  async broadcastLineUnlock(projectId, fileId, unlockData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`[Realtime] No collaboration channel for file ${fileId}`);
      return;
    }

    await channel.send({
      type: 'broadcast',
      event: 'line-unlock',
      payload: unlockData,
    });
  }

  // Broadcast user leaving file
  async broadcastUserLeaveFile(projectId, fileId, userData) {
    const channelName = `project:${projectId}:file:${fileId}:collaboration`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`[Realtime] No collaboration channel for file ${fileId}`);
      return;
    }

    await channel.send({
      type: 'broadcast',
      event: 'user-leave-file',
      payload: userData,
    });
  }

  //  Track user presence in a project
  trackPresence(projectId, userInfo, onPresenceSync) {
    const channelName = `project:${projectId}:presence`;

    // Check if channel already exists
    if (this.channels.has(channelName)) {
      console.warn(`Presence channel ${channelName} already exists`);
      return this.getUnsubscribeFunction(channelName);
    }

    const channel = this.supabase
      .channel(channelName, {
        config: {
          presence: {
            key: userInfo.id, // unique key == user ID
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineUsers = Object.values(presenceState).flat();
        console.log('Presence sync:', onlineUsers);
        onPresenceSync?.(onlineUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        console.log(`Presence subscription status for ${projectId}:`, status);

        if (status === 'SUBSCRIBED') {
          // Track current user's presence
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


  // Unsubscribe from a specific channel
  async unsubscribe(channelName) {
    const channel = this.channels.get(channelName);

    if (channel) {
      await this.supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`Unsubscribed from ${channelName}`);
    }
  }

   // Unsubscribe from all project-related channels
  async unsubscribeFromProject(projectId) {
    const projectChannels = Array.from(this.channels.keys()).filter(
      (channelName) => channelName.startsWith(`project:${projectId}:`)
    );

    for (const channelName of projectChannels) {
      await this.unsubscribe(channelName);
    }
  }

  //Cleanup all subscriptions
  async cleanup() {
    for (const [channelName, channel] of this.channels.entries()) {
      await this.supabase.removeChannel(channel);
      console.log(`Cleaned up ${channelName}`);
    }
    this.channels.clear();
  }


// Get unsubscribe function for a channel
  getUnsubscribeFunction(channelName) {
    return async () => {
      console.log(`[Realtime] Unsubscribe function called for: ${channelName}`);
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
