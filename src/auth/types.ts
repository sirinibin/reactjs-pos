export interface User {
  id: string;
  name: string;
  email: string;
  mob?: string;
  role?: string;
  admin?: boolean;
  photo?: string;
  store_ids?: string[] | null;
  store_names?: string[] | null;
  role_ids?: string[] | null;
}

/** Store settings are a large, evolving bag of flags — typed loosely on purpose. */
export type StoreSettings = Record<string, any>;

export interface Store {
  id: string;
  name: string;
  name_in_arabic?: string;
  code?: string;
  branch_name?: string;
  vat_no?: string;
  vat_percent?: number;
  country_code?: string;
  logo?: string;
  settings?: StoreSettings;
  zatca?: Record<string, any>;
  [k: string]: any;
}
