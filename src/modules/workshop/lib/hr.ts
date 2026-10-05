// Employee / salary helpers (workshop spec §3–4).

export interface EmpAccount { type?: string; balance?: number; id?: string; name?: string }

/** Balance display (legacy utils/employeeBalance.js): negative = store owes the employee. */
export function balanceInfo(account: EmpAccount | null | undefined): { amount: number; tone: 'good' | 'info' | 'crit'; label: string } {
  const mag = Number(account?.balance) || 0;
  if (!mag) return { amount: 0, tone: 'good', label: '' };
  if (account?.type === 'asset') return { amount: mag, tone: 'info', label: 'Employee Owes' };
  return { amount: -mag, tone: 'crit', label: 'Owed to Employee' };
}

export interface EmployeeForm {
  name: string; salary: string | number; salary_day: string | number; joining_date: string;
  opening_balance: string | number; opening_balance_date: string; [k: string]: any;
}

/** Client validation (all at once), messages match the legacy keys. */
export function validateEmployee(v: EmployeeForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(v.name || '').trim()) e.name = 'Name is required';
  if (v.salary === '' || v.salary === null || v.salary === undefined) e.salary = 'Salary is required';
  else if (Number(v.salary) < 0 || Number.isNaN(Number(v.salary))) e.salary = 'Salary cannot be negative';
  const d = Number(v.salary_day);
  if (!Number.isInteger(d) || d < 1 || d > 28) e.salary_day = 'Salary day must be between 1 and 28';
  if (!v.joining_date) e.joining_date = 'Joining date is required';
  const ob = Number(v.opening_balance) || 0;
  if (ob < 0) e.opening_balance = 'Opening balance cannot be negative';
  else if (ob > 0 && !v.opening_balance_date) e.opening_balance_date = 'As of date is required when an opening balance is set';
  return e;
}

/** Amount prefill for a new payment: outstanding liability balance, else the monthly salary. */
export function salaryPrefill(emp: { salary?: number; account?: EmpAccount | null } | null | undefined): number {
  if (!emp || !(Number(emp.salary) > 0)) return 0;
  const a = emp.account;
  return a?.type === 'liability' && Number(a.balance) > 0 ? Number(a.balance) : Number(emp.salary);
}

/** Same table as backend models/common.go CountryTimezoneOffset (east of UTC is negative). */
const TZ: Record<string, number> = {
  SA: -3, KW: -3, QA: -3, BH: -3, YE: -3, IQ: -3, JO: -3, SY: -3, PS: -3, SD: -3, SO: -3, ER: -3, ET: -3, KE: -3,
  AE: -4, OM: -4, IR: -3.5, EG: -2, LB: -2, IL: -2, LY: -2, TR: -3, IN: -5.5, LK: -5.5, PK: -5, NP: -5.75, BD: -6, MM: -6.5,
  TH: -7, VN: -7, ID: -7, MY: -8, SG: -8, PH: -8, HK: -8, TW: -8, CN: -8, JP: -9, KR: -9,
  GB: 0, IE: 0, PT: 0, IS: 0, GH: 0, MA: 0, DE: -1, FR: -1, IT: -1, ES: -1, NL: -1, BE: -1, CH: -1, AT: -1, SE: -1, NO: -1, DK: -1, PL: -1,
  NG: -1, TN: -1, DZ: -1, FI: -2, GR: -2, ZA: -2, EE: -2, LV: -2, LT: -2, RO: -2, BG: -2,
  BR: 3, AR: 3, CL: 3, UY: 3, BO: 4, PY: 4, VE: 4, CO: 5, PE: 5, EC: 5, MX: 6, US: 5, CA: 5, AU: -10, NZ: -12,
};
export const countryOffset = (cc?: string | null) => (cc && cc in TZ ? TZ[cc] : 0);

const p2 = (x: number) => String(x).padStart(2, '0');

/** UTC instant → "yyyy-MM-ddTHH:mm" wall clock in the store's country timezone. */
export function toStoreLocalInput(value: string | Date | null | undefined, cc?: string | null): string {
  if (!value) return '';
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms - countryOffset(cc) * 3600000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

/** Store-local "yyyy-MM-ddTHH:mm" (or yyyy-MM-dd) → UTC ISO string. */
export function fromStoreLocalInput(v: string, cc?: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v || '');
  if (!m) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) + countryOffset(cc) * 3600000;
  return new Date(ms).toISOString();
}

/** Salary period (month 1–12, year) derived from the payment date in store-local time. */
export function periodOf(local: string): { month: number; year: number } {
  const m = /^(\d{4})-(\d{2})/.exec(local || '');
  const now = new Date();
  return m ? { year: +m[1], month: +m[2] } : { year: now.getFullYear(), month: now.getMonth() + 1 };
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const periodLabel = (month?: number, year?: number) => (month && year ? `${MON[month - 1] || '?'} ${year}` : '—');

export const DEFAULT_POSITIONS = ['Technician', 'Senior Technician', 'Master Technician', 'Workshop Manager', 'Service Advisor', 'Parts Manager', 'Receptionist', 'Cashier', 'Electrician', 'Mechanic', 'Painter', 'Welder', 'Body Repair Technician', 'Quality Inspector', 'Driver'];
export const POSITIONS_KEY = 'workshop_positions';

export function loadPositions(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(POSITIONS_KEY) || 'null');
    return Array.isArray(v) && v.length ? v.filter((x) => typeof x === 'string') : DEFAULT_POSITIONS;
  } catch {
    return DEFAULT_POSITIONS;
  }
}
export function savePositions(list: string[]) {
  try { localStorage.setItem(POSITIONS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
