import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CHANNEL_NAME = 'online-presence';

export function usePresence(profileId: string | null | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: profileId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        for (const key of Object.keys(state)) {
          ids.add(key);
        }
        setOnlineUsers(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ profile_id: profileId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // Handle visibility change - re-track when app comes back to foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        channelRef.current.track({ profile_id: profileId, online_at: new Date().toISOString() });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [profileId]);

  const isOnline = (id: string) => onlineUsers.has(id);

  return { onlineUsers, isOnline };
}
