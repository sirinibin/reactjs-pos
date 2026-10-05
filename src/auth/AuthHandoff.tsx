import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KEYS, session } from '@/api/session';
import { Boot } from '@/app/Guards';

/** /auth?at=<access_token> — external login hand-off (admin.md §1.4). */
export function AuthHandoff() {
  const [sp] = useSearchParams();
  useEffect(() => {
    const at = sp.get('at');
    if (at) session.set(KEYS.token, at);
    // Full reload so AuthProvider bootstraps the new session from scratch.
    window.location.replace(at ? '/home' : '/login');
  }, [sp]);
  return <Boot />;
}
