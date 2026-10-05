import type { ComponentType, LazyExoticComponent } from 'react';

export interface ModuleRoute {
  /** Absolute path, e.g. "/sales/invoices/:id". */
  path: string;
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  /** Nav item id used for permission/feature gating (defaults to longest matching nav path). */
  navId?: string;
  /** Rendered without the app shell (print views). */
  bare?: boolean;
  /** No sign-in required (server-side PDF render routes fetched by headless Chrome). */
  public?: boolean;
}
