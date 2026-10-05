import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { bus } from './bus';
import { connectSocket, EVENT_INVALIDATES } from './socket';

/** Keeps lists live: server change events invalidate the matching cached queries. */
export function RealtimeBridge() {
  const { user, store } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user?.id || typeof WebSocket === 'undefined') return;
    const h = connectSocket(user.id);
    const off = bus.on('*', ({ event }: { event: string }) => {
      (EVENT_INVALIDATES[event] || []).forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    });
    return () => { off(); h.close(); };
  }, [user?.id, store?.id, qc]);
  return null;
}
