import { describe, expect, it } from 'vitest';
import { balanceInfo, countryOffset, DEFAULT_POSITIONS, fromStoreLocalInput, loadPositions, periodLabel, periodOf, salaryPrefill, savePositions, toStoreLocalInput, validateEmployee } from './hr';

describe('employee balance', () => {
  it('liability = store owes (negative, red); asset = employee owes (positive, blue); zero settled', () => {
    expect(balanceInfo({ type: 'liability', balance: 56000 })).toEqual({ amount: -56000, tone: 'crit', label: 'Owed to Employee' });
    expect(balanceInfo({ type: 'asset', balance: 300 })).toEqual({ amount: 300, tone: 'info', label: 'Employee Owes' });
    expect(balanceInfo(null)).toEqual({ amount: 0, tone: 'good', label: '' });
  });
});

describe('employee validation', () => {
  const ok = { name: 'Ramesh', salary: '3500', salary_day: '5', joining_date: '2025-07-05', opening_balance: '0', opening_balance_date: '' };
  it('accepts a valid form', () => expect(validateEmployee(ok)).toEqual({}));
  it('reports every problem at once', () => {
    expect(validateEmployee({ name: ' ', salary: '', salary_day: '29', joining_date: '', opening_balance: '-1', opening_balance_date: '' })).toEqual({
      name: 'Name is required', salary: 'Salary is required', salary_day: 'Salary day must be between 1 and 28', joining_date: 'Joining date is required', opening_balance: 'Opening balance cannot be negative',
    });
    expect(validateEmployee({ ...ok, salary: '-5', salary_day: '0' })).toMatchObject({ salary: 'Salary cannot be negative', salary_day: 'Salary day must be between 1 and 28' });
  });
  it('requires an as-of date when an opening balance is entered', () => {
    expect(validateEmployee({ ...ok, opening_balance: '100' })).toEqual({ opening_balance_date: 'As of date is required when an opening balance is set' });
    expect(validateEmployee({ ...ok, opening_balance: '100', opening_balance_date: '2026-01-01T00:00' })).toEqual({});
  });
});

describe('salary payment helpers', () => {
  it('prefills the outstanding liability, else the monthly salary', () => {
    expect(salaryPrefill({ salary: 3500, account: { type: 'liability', balance: 7000 } })).toBe(7000);
    expect(salaryPrefill({ salary: 3500, account: { type: 'asset', balance: 100 } })).toBe(3500);
    expect(salaryPrefill({ salary: 0, account: { type: 'liability', balance: 7000 } })).toBe(0);
    expect(salaryPrefill(null)).toBe(0);
  });
  it('converts between UTC and the store-country wall clock (SA = UTC+3, IN = UTC+5:30)', () => {
    expect(countryOffset('SA')).toBe(-3);
    expect(countryOffset('XX')).toBe(0);
    expect(toStoreLocalInput('2026-10-31T22:30:00Z', 'SA')).toBe('2026-11-01T01:30');
    expect(fromStoreLocalInput('2026-11-01T01:30', 'SA')).toBe('2026-10-31T22:30:00.000Z');
    expect(fromStoreLocalInput('2026-11-01T01:30', 'IN')).toBe('2026-10-31T20:00:00.000Z');
    expect(fromStoreLocalInput('2026-11-01', 'SA')).toBe('2026-10-31T21:00:00.000Z');
    expect(fromStoreLocalInput('', 'SA')).toBeNull();
    expect(toStoreLocalInput(null, 'SA')).toBe('');
  });
  it('derives the salary period from the store-local date', () => {
    expect(periodOf('2026-11-01T01:30')).toEqual({ year: 2026, month: 11 });
    expect(periodLabel(11, 2026)).toBe('Nov 2026');
    expect(periodLabel(undefined, 2026)).toBe('—');
  });
  it('positions persist per browser with defaults', () => {
    expect(loadPositions()).toEqual(DEFAULT_POSITIONS);
    savePositions(['Painter']);
    expect(loadPositions()).toEqual(['Painter']);
  });
});
