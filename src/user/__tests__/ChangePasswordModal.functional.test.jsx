/**
 * Functional tests for ChangePasswordModal — renders the real modal, drives the
 * inputs, and checks validation, the PATCH request and server/network errors.
 * (ChangePasswordModal.test.js only does source-level checks.)
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChangePasswordModal from '../ChangePasswordModal';

const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });
const fail = (status, body) => ({ ok: false, status, json: () => Promise.resolve(body) });
const flush = async (n = 10) => { for (let i = 0; i < n; i++) await Promise.resolve(); };

async function openModal(args = [], props = {}) {
    const ref = React.createRef();
    const showToastMessage = jest.fn();
    render(<ChangePasswordModal ref={ref} showToastMessage={showToastMessage} {...props} />);
    await act(async () => { ref.current.open(...args); });
    return { ref, showToastMessage };
}

const type = (placeholder, value) =>
    fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

async function submit() {
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
        await flush();
    });
}

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('access_token', 'tok-abc');
    localStorage.setItem('user_id', 'self-1');
    global.fetch = jest.fn().mockResolvedValue(ok({ status: true }));
});

afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
});

describe('ChangePasswordModal — self service', () => {
    test('title is "Change Your Password" and current password is required', async () => {
        await openModal();
        expect(screen.getByText('Change Your Password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
    });

    test('empty submit shows all three required errors and sends nothing', async () => {
        await openModal();
        await submit();
        expect(screen.getByText('Current password is required')).toBeInTheDocument();
        expect(screen.getByText('New password is required')).toBeInTheDocument();
        expect(screen.getByText('Please confirm your new password')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('new password shorter than 6 characters is rejected', async () => {
        await openModal();
        type('Enter current password', 'old-pass');
        type('Enter new password', '12345');
        type('Repeat new password', '12345');
        await submit();
        expect(screen.getByText('Must be at least 6 characters')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('exactly 6 characters is accepted', async () => {
        await openModal();
        type('Enter current password', 'old-pass');
        type('Enter new password', '123456');
        type('Repeat new password', '123456');
        await submit();
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('mismatched confirmation is rejected', async () => {
        await openModal();
        type('Enter current password', 'old-pass');
        type('Enter new password', 'NewPass1!');
        type('Repeat new password', 'NewPass1?');
        await submit();
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('sends PATCH /v1/user/<own id>/change-password with current + new password', async () => {
        const { showToastMessage } = await openModal();
        type('Enter current password', 'old-pass');
        type('Enter new password', 'NewPass1!');
        type('Repeat new password', 'NewPass1!');
        await submit();

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('/v1/user/self-1/change-password');
        expect(opts.method).toBe('PATCH');
        expect(opts.headers.Authorization).toBe('tok-abc');
        expect(JSON.parse(opts.body)).toEqual({ current_password: 'old-pass', new_password: 'NewPass1!' });

        expect(screen.getAllByText('Password changed successfully!').length).toBeGreaterThan(0);
        expect(showToastMessage).toHaveBeenCalledWith('Password changed successfully!', 'success');
        // modal auto-closes after 1.5 s
        await act(async () => { jest.advanceTimersByTime(1600); });
        expect(screen.queryByPlaceholderText('Enter new password')).not.toBeInTheDocument();
    });

    test('wrong current password (server error) is shown and modal stays open', async () => {
        global.fetch = jest.fn().mockResolvedValue(fail(400, {
            status: false, errors: { current_password: 'Current password is incorrect' },
        }));
        const { showToastMessage } = await openModal();
        type('Enter current password', 'nope');
        type('Enter new password', 'NewPass1!');
        type('Repeat new password', 'NewPass1!');
        await submit();
        expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
        expect(showToastMessage).not.toHaveBeenCalled();
        expect(screen.getByPlaceholderText('Enter new password')).toBeInTheDocument();
    });

    test('200 with status:false and no errors → generic failure message', async () => {
        global.fetch = jest.fn().mockResolvedValue(ok({ status: false }));
        await openModal();
        type('Enter current password', 'old');
        type('Enter new password', 'NewPass1!');
        type('Repeat new password', 'NewPass1!');
        await submit();
        expect(screen.getByText('Failed to change password')).toBeInTheDocument();
    });

    test('401 (expired session) shows the server error instead of crashing', async () => {
        global.fetch = jest.fn().mockResolvedValue(fail(401, { status: false, errors: { access_token: 'Token expired' } }));
        await openModal();
        type('Enter current password', 'old');
        type('Enter new password', 'NewPass1!');
        type('Repeat new password', 'NewPass1!');
        await submit();
        expect(screen.getByText('Token expired')).toBeInTheDocument();
    });

    test('network failure shows a retry message and re-enables the button', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        await openModal();
        type('Enter current password', 'old');
        type('Enter new password', 'NewPass1!');
        type('Repeat new password', 'NewPass1!');
        await submit();
        expect(screen.getByText('Network error — please try again')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Change Password' })).not.toBeDisabled();
    });

    test('non-JSON error body (e.g. proxy 502 HTML) is handled as a network error', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false, status: 502, json: () => Promise.reject(new SyntaxError('Unexpected token <')),
        });
        await openModal();
        type('Enter current password', 'old');
        type('Enter new password', 'NewPass1!');
        type('Repeat new password', 'NewPass1!');
        await submit();
        expect(screen.getByText('Network error — please try again')).toBeInTheDocument();
    });

    test('password fields are masked by default and the eye toggle reveals them', async () => {
        await openModal();
        const input = screen.getByPlaceholderText('Enter new password');
        expect(input).toHaveAttribute('type', 'password');
        const toggle = input.parentElement.querySelector('button');
        fireEvent.click(toggle);
        expect(screen.getByPlaceholderText('Enter new password')).toHaveAttribute('type', 'text');
    });

    test('re-opening resets previously typed values and errors', async () => {
        const { ref } = await openModal();
        type('Enter new password', 'abc');
        await submit();
        expect(screen.getByText('Must be at least 6 characters')).toBeInTheDocument();
        await act(async () => { ref.current.open(); });
        expect(screen.getByPlaceholderText('Enter new password').value).toBe('');
        expect(screen.queryByText('Must be at least 6 characters')).not.toBeInTheDocument();
    });
});

describe('ChangePasswordModal — manager resetting another user', () => {
    test('no current password field; PATCH targets the other user without current_password', async () => {
        await openModal(['other-7', 'Ahmed', true]);
        expect(screen.getByText('No current password required')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Enter current password')).not.toBeInTheDocument();
        type('Enter new password', 'Reset123');
        type('Repeat new password', 'Reset123');
        await submit();
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('/v1/user/other-7/change-password');
        expect(JSON.parse(opts.body)).toEqual({ new_password: 'Reset123' });
    });

    test('opening for another user WITHOUT skipCurrent still requires current password', async () => {
        await openModal(['other-7', 'Ahmed', false]);
        await submit();
        expect(screen.getByText('Current password is required')).toBeInTheDocument();
    });
});
