import { describe, expect, it } from 'vitest';
import { calcVat, fmtCompact, fmtMonth, periodText, rangeParams, toRange, trendSeries, yearOptions } from './dashboard';

describe('dashboard period modes', () => {
  it('maps each of the 6 modes to the right query params', () => {
    expect(rangeParams(toRange('single_month', '2026-10', ''))).toEqual({ from_month: '2026-10', to_month: '2026-10' });
    expect(rangeParams(toRange('month_range', '2026-12', '2026-01'))).toEqual({ from_month: '2026-01', to_month: '2026-12' });
    expect(rangeParams(toRange('year', '2025', ''))).toEqual({ from_month: '2025-01', to_month: '2025-12' });
    expect(rangeParams(toRange('single_date', '2026-10-05', ''))).toEqual({ from_date: '2026-10-05', to_date: '2026-10-05' });
    expect(rangeParams(toRange('date_range', '2026-10-01', '2026-10-05'))).toEqual({ from_date: '2026-10-01', to_date: '2026-10-05' });
    expect(rangeParams(toRange('year_range', '2026', '2024'))).toEqual({ from_month: '2024-01', to_month: '2026-12' });
  });
  it('incomplete input means all time (no params)', () => {
    expect(toRange('month_range', '2026-10', '')).toBeNull();
    expect(toRange('date_range', '', '2026-10-05')).toBeNull();
    expect(rangeParams(null)).toEqual({});
  });
  it('period labels', () => {
    expect(periodText(null)).toBe('Last 12 Months');
    expect(periodText({ from: '2026-10', to: '2026-10' })).toBe('Oct 2026');
    expect(periodText({ from: '2026-01', to: '2026-03' })).toBe('Jan 2026 → Mar 2026');
    expect(periodText({ from: '2026-10-01', to: '2026-10-05' })).toBe('2026-10-01 → 2026-10-05');
  });
});

describe('dashboard numbers', () => {
  it('splits VAT out of VAT-inclusive amounts', () => {
    const v = calcVat(115, 15);
    expect(v.withVAT).toBe(115);
    expect(v.vat).toBeCloseTo(15, 10);
    expect(v.withoutVAT).toBeCloseTo(100, 10);
    expect(calcVat(100, 0).vat).toBe(0);
  });
  it('compact format trims trailing .0', () => {
    expect(fmtCompact(2877.3)).toBe('2.9K');
    expect(fmtCompact(1000)).toBe('1K');
    expect(fmtCompact(207921.5)).toBe('207.9K');
    expect(fmtCompact(1_500_000)).toBe('1.5M');
    expect(fmtCompact(2e9)).toBe('2B');
    expect(fmtCompact(-1200)).toBe('-1.2K');
    expect(fmtCompact(12)).toBe('12');
  });
  it('months, year options and trend series', () => {
    expect(fmtMonth('2026-10')).toBe('Oct 2026');
    const rows = [{ month: '2025-12', revenue: 100, total_profit: 20 }, { month: '2026-01', revenue: 0, total_profit: 0 }, { month: '2026-10', revenue: 3220, total_profit: 912 }];
    expect(yearOptions(rows)).toEqual(['2026', '2025']);
    expect(yearOptions(null)).toEqual([]);
    expect(trendSeries(rows)).toEqual({ labels: ['Dec 2025', 'Jan 2026', 'Oct 2026'], revenue: [100, 0, 3220], expense: [80, 0, 2308], profit: [20, 0, 912] });
  });
});
