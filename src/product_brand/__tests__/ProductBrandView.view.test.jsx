/**
 * Details modal (product_brand/view.js): renders the record from GET /v1/product-brand/:id,
 * handles empty / error responses. Generic cases: testHelpers/viewModalHarness.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProductBrandView from '../view';
import {
    describeViewModal, openView, setupViewEnv, modalText, jsonResponse, flush, notFound,
} from '../../testHelpers/viewModalHarness';

const BASE = { id: 'id-1', code: 'C-001', created_by_name: 'Sara Ali', updated_by_name: 'Omar Z', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-02T11:00:00Z', date: '2026-03-01T09:00:00Z', store_id: 'store-1', description: 'Desc text' };

describe('ProductBrandView', () => {
    setupViewEnv();

    describeViewModal({
        Component: ProductBrandView,
        endpoint: '/v1/product-brand',
        model: { ...BASE, name: 'Bosch' },
        expectTexts: ['Bosch', 'C-001', 'Sara Ali', 'Omar Z', 'Mar 01, 2026, 10:00:00 AM (UTC)'],
        emptyTexts: ['Brand Details', '—'],
    });

    test('Edit button opens the update form with the record id', async () => {
        const openUpdateForm = jest.fn();
        await openView(ProductBrandView, { result: { ...BASE, name: 'Bosch' }, props: { openUpdateForm } });
        fireEvent.click(screen.getAllByText('Edit')[0].closest('button'));
        expect(openUpdateForm).toHaveBeenCalledWith('id-1');
    });

    test('created-by avatar shows initials', async () => {
        await openView(ProductBrandView, { result: { ...BASE, name: 'Bosch' } });
        expect(screen.getAllByText('SA').length).toBeGreaterThan(0);
    });

    test('open() without an id does not fetch or show', async () => {
        global.fetch = jest.fn();
        const ref = React.createRef();
        render(<ProductBrandView ref={ref} />);
        await act(async () => { ref.current.open(''); });
        expect(global.fetch).not.toHaveBeenCalled();
        expect(document.querySelector('.modal')).toBeNull();
    });
});
