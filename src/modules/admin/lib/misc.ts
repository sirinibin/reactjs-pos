// Pure helpers for users, background jobs (backup/duplicate) and passwords.

export interface JobStep { id: string; name: string; status: 'pending' | 'running' | 'done' | 'error'; progress: number; message?: string }
export interface JobProgress { steps: JobStep[]; overall_progress: number; done: boolean; error?: string; file_token?: string; new_store_id?: string; new_store_name?: string }

export type JobKind = 'backup' | 'duplicate' | 'duplicate-with-products' | 'duplicate-with-products-no-images' | 'duplicate-without-data';
export const JOB_KINDS: { kind: JobKind; label: string; hint: string }[] = [
  { kind: 'duplicate', label: 'Duplicate store (all data)', hint: 'Copies every document, image and ZATCA file into a new store.' },
  { kind: 'duplicate-with-products', label: 'Duplicate with products', hint: 'Copies the store settings plus the product catalogue (categories, brands, products, images).' },
  { kind: 'duplicate-with-products-no-images', label: 'Duplicate with products (no images)', hint: 'Same as above but without product images.' },
  { kind: 'duplicate-without-data', label: 'Duplicate without data', hint: 'Copies only the store settings into an empty store.' },
];

/** Human-readable bytes: 0 B, 1.5 KB, 12.3 MB … */
export function humanBytes(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let x = v / 1024;
  let i = 0;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x >= 100 ? Math.round(x) : Math.round(x * 10) / 10} ${u[i]}`;
}

/** Size breakdown rows for the job dialog (keys differ between backup and duplicate variants). */
export function sizeRows(size: Record<string, number> | null | undefined): { label: string; bytes: number }[] {
  if (!size) return [];
  const labels: Record<string, string> = {
    mongodb_store_db: 'Store database', mongodb_store_doc: 'Store record', mongodb_users: 'Users', images_size: 'Images', zatca_size: 'ZATCA files',
    store_doc_size: 'Store record', catalog_collections_size: 'Product catalogue',
  };
  return Object.entries(labels).filter(([k]) => k in size).map(([k, label]) => ({ label, bytes: size[k] || 0 }));
}

/** mm:ss / h:mm:ss for elapsed and ETA. */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

/** Remaining time estimate from overall progress (null until there is signal). */
export function eta(elapsedMs: number, percent: number): number | null {
  if (!(percent > 0) || percent >= 100) return null;
  return (elapsedMs / percent) * (100 - percent);
}

/** Password strength (legacy ChangePasswordModal): 0-1 weak, 2 fair, 3 good, ≥4 strong. */
export function passwordStrength(pw: string): { score: number; label: 'Weak' | 'Fair' | 'Good' | 'Strong'; tone: 'crit' | 'warn' | 'info' | 'good' } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', tone: 'crit' };
  if (score === 2) return { score, label: 'Fair', tone: 'warn' };
  if (score === 3) return { score, label: 'Good', tone: 'info' };
  return { score, label: 'Strong', tone: 'good' };
}

export function validatePasswordChange(v: { current?: string; next: string; confirm: string }, needCurrent: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (needCurrent && !v.current) e.current_password = 'Current password is required';
  if (!v.next) e.new_password = 'New password is required';
  else if (v.next.length < 6) e.new_password = 'Must be at least 6 characters';
  if (!v.confirm) e.confirm = 'Please confirm your new password';
  else if (v.next && v.confirm !== v.next) e.confirm = 'Passwords do not match';
  return e;
}

export type UserRole = 'Admin' | 'Manager' | 'SalesMan';
export const roleOf = (u: { role?: string; admin?: boolean; [k: string]: any } | null | undefined): UserRole =>
  u?.role === 'Admin' || u?.role === 'SalesMan' ? (u.role as UserRole) : u?.role === 'Manager' ? 'Manager' : u?.admin ? 'Admin' : 'Manager';

/**
 * Presence quirk (spec §8.1): when a user comes online the API stamps last_offline_at
 * ("online since"); when they go offline it stamps last_online_at ("offline since").
 */
export function presenceSince(u: { online?: boolean; last_online_at?: string; last_offline_at?: string; [k: string]: any }): string | undefined {
  return u.online ? u.last_offline_at : u.last_online_at;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export interface UserFormValues {
  name: string; email: string; mob: string; password: string; role: UserRole; store_ids: string[]; role_ids: string[];
  opening_balance: string; opening_balance_type: 'payable' | 'receivable'; opening_balance_date: string; store_id?: string;
}

export function validateUser(v: UserFormValues, creating: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.name.trim()) e.name = 'Name is required';
  if (!v.email.trim()) e.email = 'E-mail is required';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'E-mail is not valid';
  if (!v.mob.trim()) e.mob = 'Mob is required';
  if (creating && !v.password) e.password = 'Password is required';
  else if (v.password && v.password.length < 6) e.password = 'Must be at least 6 characters';
  const ob = Number(v.opening_balance || 0);
  if (ob < 0) e.opening_balance = 'Opening balance cannot be negative';
  if (ob > 0 && !v.opening_balance_date) e.opening_balance_date = 'Opening balance date is required when an opening balance is entered';
  return e;
}

/** POST/PUT body for /v1/user. Full store_ids / role_ids arrays (API takes them verbatim). */
export function buildUserBody(v: UserFormValues, opts: { creating: boolean; activeStoreId: string; toIso: (local: string) => string }): Record<string, any> {
  const ob = Number(v.opening_balance || 0) || 0;
  const body: Record<string, any> = {
    name: v.name.trim(), email: v.email.trim(), mob: v.mob.trim(), role: v.role, admin: v.role === 'Admin',
    store_ids: v.store_ids, role_ids: v.role_ids,
    store_id: v.store_id || opts.activeStoreId || undefined,
    opening_balance: ob, opening_balance_type: v.opening_balance_type || 'payable',
  };
  if (ob > 0 && v.opening_balance_date) body.opening_balance_date = opts.toIso(v.opening_balance_date);
  if (v.password) body.password = v.password;
  return body;
}

/** Server error keys that belong on the "Access" section of the user form. */
export const isAccessError = (k: string) => /store|role|admin|permission/.test(k);
