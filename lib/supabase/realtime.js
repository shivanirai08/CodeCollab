import { createClient } from './client';

export class RealtimeService {
  constructor() {
    this.supabase = createClient();
    this.channels = new Map();
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


  //Subscribe to collaborative editing events for a file
  subscribeToCollaboration(projectId, fileId, callbacks = {}) {
    const channelName = `project:${projectId}:collab:${fileId}`;

    if (this.channels.has(channelName)) {
      console.warn(`Collaboration channel ${channelName} already exists`);
      return this.getUnsubscribeFunction(channelName);
    }

    console.log(`[Realtime] Creating collaboration channel: ${channelName}`);

    const channel = this.supabase
      .channel(channelName)
      .on('broadcast', { event: 'content-change' }, (payload) => {
        console.log('[Realtime] Received content-change broadcast:', payload);
        callbacks.onContentChange?.(payload.payload);
      })
      .on('broadcast', { event: 'cursor-change' }, (payload) => {
        console.log('[Realtime] Received cursor-change broadcast:', payload);
        callbacks.onCursorChange?.(payload.payload);
      })
      .subscribe((status) => {
        console.log(`[Realtime] Collaboration subscription status for ${fileId}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Successfully subscribed to collaboration channel: ${channelName}`);
        }
      });

    this.channels.set(channelName, channel);
    return this.getUnsubscribeFunction(channelName);
  }

  // Broadcast content change for collaborative editing
  async broadcastContentChange(projectId, fileId, changeData) {
    const channelName = `project:${projectId}:collab:${fileId}`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`No collaboration channel for ${fileId}`);
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
    const channelName = `project:${projectId}:collab:${fileId}`;
    let channel = this.channels.get(channelName);

    if (!channel) {
      console.warn(`[Realtime] No collaboration channel for ${fileId}. Available channels:`, Array.from(this.channels.keys()));
      return;
    }

    console.log(`[Realtime] Broadcasting cursor to channel ${channelName}:`, cursorData);

    const result = await channel.send({
      type: 'broadcast',
      event: 'cursor-change',
      payload: cursorData,
    });

    console.log('[Realtime] Cursor broadcast result:', result);
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
    return () => this.unsubscribe(channelName);
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
