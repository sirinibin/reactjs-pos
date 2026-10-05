// Session persistence. Key names match the legacy React app so a user who is
// signed in to v1 on the same origin stays signed in after the switch to v2.
export const KEYS = {
  token: 'access_token',
  storeId: 'store_id',
  storeName: 'store_name',
  branchName: 'branch_name',
  userId: 'user_id',
  userName: 'user_name',
  userRole: 'user_role',
  admin: 'admin',
  permissions: 'user_permissions',
  storeSettings: '_store_settings_cache',
  lang: 'i18nextLng',
  theme: 'erp_theme',
  density: 'erp_density',
  lastStore: (userId: string) => `last_store_${userId}`,
} as const;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — session simply won't persist */
  }
}

export const session = {
  get: safeGet,
  set: safeSet,
  getJSON<T>(key: string, fallback: T): T {
    const raw = safeGet(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  setJSON(key: string, value: unknown) {
    safeSet(key, value === undefined ? null : JSON.stringify(value));
  },
  token: () => safeGet(KEYS.token),
  storeId: () => safeGet(KEYS.storeId),
  clear() {
    [KEYS.token, KEYS.storeId, KEYS.storeName, KEYS.branchName, KEYS.userId, KEYS.userName, KEYS.userRole, KEYS.admin, KEYS.permissions, KEYS.storeSettings].forEach((k) =>
      safeSet(k, null),
    );
  },
};
