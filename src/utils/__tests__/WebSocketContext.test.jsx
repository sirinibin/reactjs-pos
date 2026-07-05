/**
 * Tests for WebSocketContext.js
 *
 * The provider depends on react-use-websocket, FingerprintJS, and fetch calls
 * to an IP-lookup endpoint. All are mocked here so the tests run offline.
 */
import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── react-use-websocket mock ──────────────────────────────────────────────────
jest.mock('react-use-websocket', () => ({
    __esModule: true,
    default: () => ({
        sendMessage: jest.fn(),
        lastMessage: null,
        readyState: 0,
        getWebSocket: jest.fn(),
    }),
}));

// ── FingerprintJS mock ────────────────────────────────────────────────────────
jest.mock('@fingerprintjs/fingerprintjs', () => ({
    __esModule: true,
    default: {
        load: jest.fn().mockResolvedValue({
            get: jest.fn().mockResolvedValue({ visitorId: 'test-visitor-id' }),
        }),
    },
}));

// ── eventEmitter mock ─────────────────────────────────────────────────────────
jest.mock('../eventEmitter', () => ({
    __esModule: true,
    default: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
}));

// ── fetch mock (IP lookup) ────────────────────────────────────────────────────
global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue({ ip: '127.0.0.1' }),
});

// ── crypto.randomUUID — not available in JSDOM, must be patched before import ─
Object.defineProperty(global, 'crypto', {
    value: {
        randomUUID: () => 'test-device-uuid',
        getRandomValues: (arr) => arr,
    },
    writable: true,
    configurable: true,
});

import { WebSocketContext, WebSocketProvider } from '../WebSocketContext';

// ── Context shape ─────────────────────────────────────────────────────────────
describe('WebSocketContext', () => {
    test('is a valid React context object with Provider and Consumer', () => {
        expect(WebSocketContext).toBeDefined();
        expect(WebSocketContext.Provider).toBeDefined();
        expect(WebSocketContext.Consumer).toBeDefined();
    });
});

// ── WebSocketProvider ─────────────────────────────────────────────────────────
describe('WebSocketProvider', () => {
    test('renders its children without crashing', () => {
        render(
            <WebSocketProvider userId="guest">
                <div data-testid="child">hello</div>
            </WebSocketProvider>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    test('useContext(WebSocketContext) inside provider does not throw', () => {
        function Consumer() {
            const ctx = useContext(WebSocketContext);
            // Context value may be undefined (provider doesn't explicitly set a value)
            // — the important thing is no error is thrown
            return <span data-testid="ctx">{String(ctx ?? 'ok')}</span>;
        }

        render(
            <WebSocketProvider userId="guest">
                <Consumer />
            </WebSocketProvider>
        );
        expect(screen.getByTestId('ctx')).toBeInTheDocument();
    });
});
