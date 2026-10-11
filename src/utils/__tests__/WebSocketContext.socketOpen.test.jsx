/**
 * "socket_connection_open" makes screens and the top bar reload what they may
 * have missed while the socket was down. Every listener already loads on mount,
 * so announcing the first open after page load made each page fetch everything
 * twice. Only reconnects are announced.
 */
import React from 'react';
import { render } from '@testing-library/react';

let mockOptions;
jest.mock('react-use-websocket', () => ({
    __esModule: true,
    default: (url, options) => {
        mockOptions = options;
        return { sendMessage: jest.fn(), lastMessage: null, readyState: 1, getWebSocket: jest.fn() };
    },
}));
jest.mock('@fingerprintjs/fingerprintjs', () => ({
    __esModule: true,
    default: { load: jest.fn().mockResolvedValue({ get: jest.fn().mockResolvedValue({ visitorId: 'v' }) }) },
}));
jest.mock('../eventEmitter', () => ({
    __esModule: true,
    default: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
}));

import eventEmitter from '../eventEmitter';
import { WebSocketProvider, shouldAnnounceSocketOpen } from '../WebSocketContext';

const opensAnnounced = () => eventEmitter.emit.mock.calls.filter(([e]) => e === 'socket_connection_open').length;

beforeEach(() => {
    eventEmitter.emit.mockClear();
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ ip: '127.0.0.1' }) });
    Object.defineProperty(global, 'crypto', {
        value: { randomUUID: () => 'dev', getRandomValues: (a) => a },
        writable: true, configurable: true,
    });
});

test('shouldAnnounceSocketOpen: the first open is not announced, reconnects are', () => {
    expect(shouldAnnounceSocketOpen(1)).toBe(false);
    expect(shouldAnnounceSocketOpen(2)).toBe(true);
    expect(shouldAnnounceSocketOpen(10)).toBe(true);
});

test('the first connection is silent; each reconnect is announced once', async () => {
    render(<WebSocketProvider userId="u1"><div /></WebSocketProvider>);
    await mockOptions.onOpen();
    expect(opensAnnounced()).toBe(0);
    await mockOptions.onOpen();
    expect(opensAnnounced()).toBe(1);
    await mockOptions.onOpen();
    expect(opensAnnounced()).toBe(2);
});

test('a different signed-in user starts counting again', async () => {
    const { rerender } = render(<WebSocketProvider userId="u1"><div /></WebSocketProvider>);
    await mockOptions.onOpen();
    await mockOptions.onOpen();
    expect(opensAnnounced()).toBe(1);
    rerender(<WebSocketProvider userId="u2"><div /></WebSocketProvider>);
    await mockOptions.onOpen();
    expect(opensAnnounced()).toBe(1);
    await mockOptions.onOpen();
    expect(opensAnnounced()).toBe(2);
});
