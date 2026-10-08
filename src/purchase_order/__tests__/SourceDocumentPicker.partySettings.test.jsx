// The gear icon in the customer / vendor search results opens "Party Search Settings".
// That modal opens from inside the picker, which stacks above the sales and quotation
// forms, so it must be given a z-index above all of them (it used to sit underneath).
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const Modal = ({ show, children, className }) => (show ? React.createElement('div', { className }, children) : null);
    Modal.Header = ({ children }) => React.createElement('div', null, children);
    Modal.Body = ({ children }) => React.createElement('div', null, children);
    return { Modal, Spinner: () => null };
});
jest.mock('react-bootstrap-typeahead', () => {
    const React = require('react');
    // Renders the real results menu (renderMenu) for whatever options the picker loaded.
    const Typeahead = React.forwardRef((props, ref) => {
        React.useImperativeHandle(ref, () => ({ clear: jest.fn() }));
        return React.createElement('div', null,
            React.createElement('input', { 'data-testid': 'party-input', onChange: (e) => props.onInputChange(e.target.value) }),
            props.options.length > 0 && props.renderMenu ? props.renderMenu(props.options, {}, { activeIndex: -1, text: '' }) : null);
    });
    const Menu = ({ children }) => React.createElement('div', null, children);
    const MenuItem = ({ children }) => React.createElement('div', null, children);
    return { Typeahead, Menu, MenuItem };
});
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({ innerRef: null, droppableProps: {}, placeholder: null }, {}),
    Draggable: ({ children }) => children({ innerRef: null, draggableProps: {}, dragHandleProps: {} }, {}),
}));
const mockSettingsProps = [];
jest.mock('../../utils/TableSettingsModal.js', () => (props) => {
    mockSettingsProps.push(props);
    return props.show ? require('react').createElement('div', { 'data-testid': 'party-settings' }, props.title) : null;
});

import React, { createRef } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import SourceDocumentPicker, { PARTY_SETTINGS_Z_INDEX } from '../SourceDocumentPicker';

beforeEach(() => {
    jest.useFakeTimers();
    mockSettingsProps.length = 0;
    localStorage.setItem('store_id', 'store123');
    global.fetch = jest.fn((url) => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(String(url).startsWith('/v1/customer?') || String(url).startsWith('/v1/vendor?')
            ? { result: [{ id: 'c1', code: 'C-1', name: 'ACME', search_label: 'ACME' }] }
            : { result: [], total_count: 0 }),
    }));
});
afterEach(() => { jest.useRealTimers(); localStorage.clear(); });

async function openAndSearch(docType) {
    const ref = createRef();
    render(<SourceDocumentPicker ref={ref} modalClassName="above-sales-modal" />);
    act(() => { ref.current.open(jest.fn(), docType); });
    fireEvent.change(screen.getByTestId('party-input'), { target: { value: 'acme' } });
    await act(async () => { jest.advanceTimersByTime(150); });
    await act(async () => {});
}

describe('SourceDocumentPicker party search settings', () => {
    it('stacks the settings modal above the forms and the picker (z-index above 2000)', () => {
        expect(PARTY_SETTINGS_Z_INDEX).toBeGreaterThan(2000);
    });

    for (const docType of ['quotation', 'sales', 'purchase']) {
        it(`${docType}: the gear opens the settings modal with that z-index`, async () => {
            await openAndSearch(docType);
            expect(screen.queryByTestId('party-settings')).toBeNull();
            fireEvent.click(screen.getByTestId('party-search-settings-btn'));
            expect(screen.getByTestId('party-settings')).toHaveTextContent('Party Search Settings');
            const last = mockSettingsProps[mockSettingsProps.length - 1];
            expect(last.show).toBe(true);
            expect(last.zIndex).toBe(PARTY_SETTINGS_Z_INDEX);
            expect(last.className).toBe('party-search-settings-modal');
        });
    }

    it('closing the settings keeps the picker open', async () => {
        await openAndSearch('quotation');
        fireEvent.click(screen.getByTestId('party-search-settings-btn'));
        act(() => { mockSettingsProps[mockSettingsProps.length - 1].onHide(); });
        expect(screen.queryByTestId('party-settings')).toBeNull();
        expect(screen.getByText('Import from Quotation')).toBeInTheDocument();
    });
});
