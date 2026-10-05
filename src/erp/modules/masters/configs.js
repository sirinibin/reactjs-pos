import { createResource } from '../../api/resource';
import { formatDateTime } from '../../format';
import { lookup, lookupUsers } from './lookups';

const createdAtColumn = {
    key: 'created_at', label: 'Created At', sortKey: 'created_at',
    render: r => formatDateTime(r.created_at),
    filter: { type: 'date', field: 'created_at', from: 'created_at_from', to: 'created_at_to' },
};
const createdByColumn = {
    key: 'created_by_name', label: 'Created By', sortKey: 'created_by_name',
    filter: { type: 'ids', field: 'created_by', load: lookupUsers },
};
const deletedColumn = {
    key: 'deleted', label: 'Deleted',
    render: r => (r.deleted ? 'YES' : 'NO'),
    filter: { type: 'deleted' },
};

export const productBrandConfig = {
    id: 'product_brand',
    title: 'Product Brands',
    singular: 'Product Brand',
    resource: createResource('product-brand', { select: 'id,code,name,created_at,deleted' }),
    defaultSort: { key: 'created_at', dir: 'desc' },
    columns: [
        { key: 'code', label: 'Code', sortKey: 'code', filter: { type: 'text', field: 'code' } },
        { key: 'name', label: 'Name', sortKey: 'name', filter: { type: 'text', field: 'name' } },
        createdAtColumn,
        deletedColumn,
    ],
    formFields: [
        { name: 'name', label: 'Name', required: true, requiredMessage: 'Name is required' },
        { name: 'code', label: 'Code', required: true, requiredMessage: 'Code is required' },
    ],
    toPayload: (v, original) => ({ ...(original || {}), name: v.name.trim(), code: v.code.trim() }),
    viewItems: (r, t) => [
        { label: t('Name'), value: r.name },
        { label: t('Code'), value: r.code },
    ],
    actions: {},
};

const productCategoryLookup = lookup('/v1/product-category');

export const productCategoryConfig = {
    id: 'product_category',
    title: 'Product Categories',
    singular: 'Product Category',
    resource: createResource('product-category', { select: 'id,name,parent_name,parent_id,created_by_name,created_at,deleted' }),
    defaultSort: { key: 'created_at', dir: 'desc' },
    columns: [
        { key: 'name', label: 'Name', sortKey: 'name', filter: { type: 'text', field: 'name' } },
        { key: 'parent_name', label: 'Parent', sortKey: 'parent_name', filter: { type: 'text', field: 'parent_name' } },
        createdByColumn,
        createdAtColumn,
        deletedColumn,
    ],
    formFields: [
        { name: 'name', label: 'Name', required: true, requiredMessage: 'Name is required' },
        { name: 'parent_id', label: 'Parent Category', type: 'reference', labelField: 'parent_name', loadOptions: productCategoryLookup, placeholder: 'Search a category…' },
    ],
    toPayload: (v, original) => ({ ...(original || {}), name: v.name.trim(), parent_id: v.parent_id || null, parent_name: v.parent_id ? v.parent_name : '' }),
    viewItems: (r, t) => [
        { label: t('Name'), value: r.name },
        { label: t('Parent Category'), value: r.parent_name },
    ],
    actions: {},
};

const expenseCategoryLookup = lookup('/v1/expense-category');

export const expenseCategoryConfig = {
    id: 'expense_category',
    title: 'Expense Categories',
    singular: 'Expense Category',
    resource: createResource('expense-category', { select: 'id,name,parent_name,parent_id,created_by_name,created_at' }),
    defaultSort: { key: 'created_at', dir: 'desc' },
    columns: [
        { key: 'name', label: 'Name', sortKey: 'name', filter: { type: 'text', field: 'name' } },
        { key: 'parent_name', label: 'Parent', sortKey: 'parent_name', filter: { type: 'text', field: 'parent_name' } },
        createdByColumn,
        createdAtColumn,
    ],
    formFields: [
        { name: 'name', label: 'Name', required: true, requiredMessage: 'Name is required' },
        { name: 'parent_id', label: 'Parent Category (Optional)', type: 'reference', labelField: 'parent_name', loadOptions: expenseCategoryLookup, placeholder: 'Search a category…' },
    ],
    toPayload: (v, original) => ({ ...(original || {}), name: v.name.trim(), parent_id: v.parent_id || null, parent_name: v.parent_id ? v.parent_name : '' }),
    viewItems: (r, t) => [
        { label: t('Name'), value: r.name },
        { label: t('Parent Category'), value: r.parent_name },
    ],
    actions: { delete: false, restore: false },
};

const serviceCategoryLookup = lookup('/v1/service-category');

export const serviceCategoryConfig = {
    id: 'service_category',
    title: 'Service Categories',
    singular: 'Service Category',
    resource: createResource('service-category'),
    defaultSort: { key: 'created_at', dir: 'desc' },
    columns: [
        { key: 'row_no', label: '#', width: 48 },
        { key: 'name', label: 'Name', sortKey: 'name', filter: { type: 'text', field: 'name' } },
        { key: 'parent_name', label: 'Parent Category', render: r => r.parent_name || '—' },
        { ...createdAtColumn, filter: undefined },
        deletedColumn,
    ],
    formFields: [
        { name: 'name', label: 'Name', required: true, requiredMessage: 'Name is required' },
        { name: 'parent_id', label: 'Parent Category', type: 'reference', labelField: 'parent_name', loadOptions: serviceCategoryLookup, placeholder: 'Search a category…' },
    ],
    toPayload: (v, original) => ({ ...(original || {}), name: v.name.trim(), parent_id: v.parent_id || null, parent_name: v.parent_id ? v.parent_name : '' }),
    viewItems: (r, t) => [
        { label: t('Name'), value: r.name },
        { label: t('Parent Category'), value: r.parent_name },
    ],
    actions: {},
};
