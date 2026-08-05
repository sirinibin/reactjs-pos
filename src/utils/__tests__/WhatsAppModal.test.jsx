import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import WhatsAppModal from '../WhatsAppModal';

// ---------------------------------------------------------------------------
// react-bootstrap mock
// Modal uses React context so Modal.Header can invoke onHide from the parent.
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const ModalCtx = React.createContext({});

    const Modal = ({ show, onHide, children }) => {
        if (!show) return null;
        return (
            <ModalCtx.Provider value={{ onHide }}>
                <div data-testid="modal">{children}</div>
            </ModalCtx.Provider>
        );
    };

    Modal.Header = ({ children, closeButton }) => {
        const { onHide } = React.useContext(ModalCtx);
        return (
            <div>
                {children}
                {closeButton && (
                    <button type="button" aria-label="Close" onClick={onHide}>
                        x
                    </button>
                )}
            </div>
        );
    };

    Modal.Title = ({ children }) => <div>{children}</div>;
    Modal.Body  = ({ children }) => <div>{children}</div>;
    Modal.Footer = ({ children }) => <div>{children}</div>;

    const Button = ({ children, onClick, disabled, title }) => (
        <button type="button" onClick={onClick} disabled={disabled} title={title}>
            {children}
        </button>
    );

    const Form = ({ children }) => <div>{children}</div>;
    Form.Group   = ({ children }) => <div>{children}</div>;
    Form.Label   = ({ children }) => <label>{children}</label>;
    Form.Control = ({ as, value, onChange, placeholder, rows, type }) => {
        if (as === 'textarea') {
            return (
                <textarea
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={rows}
                />
            );
        }
        return (
            <input
                type={type || 'text'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        );
    };

    const Spinner = () => <span aria-hidden="true" />;

    const Alert = ({ children, variant }) => (
        <div role="alert" data-variant={variant}>
            {children}
        </div>
    );

    return { Modal, Button, Form, Spinner, Alert };
});

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

afterEach(() => {
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('WhatsAppModal', () => {

    // 1. Renders when show=true
    test('renders when show=true and displays title', () => {
        render(<WhatsAppModal show={true} onClose={jest.fn()} />);
        expect(screen.getByText('Send WhatsApp Message')).toBeInTheDocument();
    });

    // 2. Does not render when show=false
    test('does not render content when show=false', () => {
        render(<WhatsAppModal show={false} onClose={jest.fn()} />);
        expect(screen.queryByText('Send WhatsApp Message')).not.toBeInTheDocument();
    });

    // 3. Number input starts with defaultNumber prop value
    test('number input starts with defaultNumber prop value', () => {
        render(<WhatsAppModal show={true} onClose={jest.fn()} defaultNumber="966512345678" />);
        expect(screen.getByPlaceholderText('e.g., 9665xxxxxxxx')).toHaveValue('966512345678');
    });

    // 4. Updates number state when user types in number field
    test('updates number state when user types in the number input', () => {
        render(<WhatsAppModal show={true} onClose={jest.fn()} />);
        const input = screen.getByPlaceholderText('e.g., 9665xxxxxxxx');
        fireEvent.change(input, { target: { value: '966598765432' } });
        expect(input).toHaveValue('966598765432');
    });

    // 5. handleSendToNumber: "Open in WhatsApp" calls onChoice and onClose
    test('"Open in WhatsApp" calls onChoice({ type: "number", number, message }) and onClose', () => {
        const onChoice = jest.fn();
        const onClose  = jest.fn();
        render(
            <WhatsAppModal
                show={true}
                onClose={onClose}
                onChoice={onChoice}
                defaultNumber="966512345678"
                defaultMessage="Hello"
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Open in WhatsApp/i }));
        expect(onChoice).toHaveBeenCalledWith({
            type: 'number',
            number: '966512345678',
            message: 'Hello',
        });
        expect(onClose).toHaveBeenCalled();
    });

    // 6. handleSendToContacts: "Send to contacts" calls onChoice and onClose
    test('"Send to contacts" calls onChoice({ type: "contacts", message }) and onClose', () => {
        const onChoice = jest.fn();
        const onClose  = jest.fn();
        render(
            <WhatsAppModal
                show={true}
                onClose={onClose}
                onChoice={onChoice}
                defaultMessage="Hello contacts"
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Send to contacts/i }));
        expect(onChoice).toHaveBeenCalledWith({
            type: 'contacts',
            message: 'Hello contacts',
        });
        expect(onClose).toHaveBeenCalled();
    });

    // 7. "Send PDF (Attached)" button appears only when onSendDirect is provided
    test('"Send PDF (Attached)" button is absent without onSendDirect and present with it', () => {
        const { rerender } = render(<WhatsAppModal show={true} onClose={jest.fn()} />);
        expect(
            screen.queryByRole('button', { name: /Send PDF \(Attached\)/i })
        ).not.toBeInTheDocument();

        rerender(
            <WhatsAppModal
                show={true}
                onClose={jest.fn()}
                onSendDirect={jest.fn()}
                defaultNumber="966512345678"
            />
        );
        expect(
            screen.getByRole('button', { name: /Send PDF \(Attached\)/i })
        ).toBeInTheDocument();
    });

    // 8. "Send PDF (Attached)" button is disabled when number is empty
    test('"Send PDF (Attached)" button is disabled when number is empty', () => {
        render(
            <WhatsAppModal
                show={true}
                onClose={jest.fn()}
                onSendDirect={jest.fn()}
                defaultNumber=""
            />
        );
        expect(
            screen.getByRole('button', { name: /Send PDF \(Attached\)/i })
        ).toBeDisabled();
    });

    // 9. handleSendDirect — success path
    test('handleSendDirect calls onSendDirect({ number, message }) and shows success alert on resolve', async () => {
        const onClose     = jest.fn();
        const onSendDirect = jest.fn().mockResolvedValue(undefined);

        render(
            <WhatsAppModal
                show={true}
                onClose={onClose}
                onSendDirect={onSendDirect}
                defaultNumber="966512345678"
                defaultMessage="Hello"
            />
        );

        // Wrap click in act so pending microtasks (Promise resolution) flush
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Send PDF \(Attached\)/i }));
        });

        expect(onSendDirect).toHaveBeenCalledWith({
            number: '966512345678',
            message: 'Hello',
        });

        await waitFor(() => {
            const alert = screen.getByRole('alert');
            expect(alert).toHaveAttribute('data-variant', 'success');
            expect(alert).toHaveTextContent('PDF sent successfully via WhatsApp!');
        });
    });

    // 9. handleSendDirect — failure path
    test('handleSendDirect shows error alert when onSendDirect rejects', async () => {
        const onSendDirect = jest.fn().mockRejectedValue(new Error('Connection failed'));

        render(
            <WhatsAppModal
                show={true}
                onClose={jest.fn()}
                onSendDirect={onSendDirect}
                defaultNumber="966512345678"
                defaultMessage="Hello"
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /Send PDF \(Attached\)/i }));
        });

        await waitFor(() => {
            const alert = screen.getByRole('alert');
            expect(alert).toHaveAttribute('data-variant', 'danger');
            expect(alert).toHaveTextContent('Connection failed');
        });
    });

    // 10. Message textarea shown when hideMessage=false
    test('message textarea is shown when hideMessage=false', () => {
        render(<WhatsAppModal show={true} onClose={jest.fn()} hideMessage={false} />);
        expect(screen.getByPlaceholderText('Type your message here')).toBeInTheDocument();
    });

    // 11. When hideMessage=true and message contains URL, shows alert with link
    test('when hideMessage=true and message contains a URL, renders an alert with a link', () => {
        const message = 'Your invoice\nhttps://example.com/invoice.pdf';
        render(
            <WhatsAppModal
                show={true}
                onClose={jest.fn()}
                hideMessage={true}
                defaultMessage={message}
            />
        );
        const link = screen.getByRole('link', { name: /https:\/\/example\.com\/invoice\.pdf/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://example.com/invoice.pdf');
    });

    // 12. defaultMessage prop populates the message state
    test('defaultMessage prop populates the message textarea', () => {
        render(
            <WhatsAppModal
                show={true}
                onClose={jest.fn()}
                defaultMessage="Pre-filled message"
                hideMessage={false}
            />
        );
        expect(screen.getByPlaceholderText('Type your message here')).toHaveValue(
            'Pre-filled message'
        );
    });

    // 13. Clicking the close button calls onClose
    test('clicking the modal close button calls onClose', () => {
        const onClose = jest.fn();
        render(<WhatsAppModal show={true} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: /Close/i }));
        expect(onClose).toHaveBeenCalled();
    });
});
