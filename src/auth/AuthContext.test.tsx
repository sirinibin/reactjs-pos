import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuth } from './AuthContext';
import { mockApi, renderApp, TEST_USER } from '@/test/utils';
import { KEYS } from '@/api/session';

function Status() {
  const { status } = useAuth();
  return <div data-testid="status">{status}</div>;
}

describe('AuthProvider bootstrap', () => {
  it('retries a transient /v1/me failure instead of bouncing to sign-in', async () => {
    let n = 0;
    mockApi([{ method: 'GET', path: '/v1/me', reply: () => (++n === 1 ? { status: false, errors: { db: 'down' } } : { status: true, result: TEST_USER }), status: 200 }]);
    // First call answers 200 + status:false (soft fail) → ApiError that is not auth-related.
    renderApp(<Status />);
    expect(await screen.findByText('ready', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(n).toBe(2);
    expect(localStorage.getItem(KEYS.token)).toBe('test-token');
  });

  it('signs out at once when the token is rejected', async () => {
    let n = 0;
    mockApi([{ method: 'GET', path: '/v1/me', status: 401, reply: () => { n++; return { status: false, errors: { token: 'invalid' } }; } }]);
    renderApp(<Status />);
    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    expect(n).toBe(1);
    expect(localStorage.getItem(KEYS.token)).toBeNull();
  });

  it('gives up after the retries are spent', async () => {
    let n = 0;
    mockApi([{ method: 'GET', path: '/v1/me', status: 500, reply: () => { n++; return { status: false, errors: { db: 'down' } }; } }]);
    renderApp(<Status />);
    expect(await screen.findByText('signed-out', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(n).toBe(3);
  });
});
