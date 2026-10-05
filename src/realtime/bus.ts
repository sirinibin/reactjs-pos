/** Tiny typed event bus (replaces legacy mitt eventEmitter). */
type Fn = (data: any) => void;
const subs = new Map<string, Set<Fn>>();

export const bus = {
  on(event: string, fn: Fn) {
    if (!subs.has(event)) subs.set(event, new Set());
    subs.get(event)!.add(fn);
    return () => subs.get(event)?.delete(fn);
  },
  emit(event: string, data?: any) {
    subs.get(event)?.forEach((fn) => {
      try { fn(data); } catch (e) { console.error(`[bus] ${event}`, e); }
    });
    subs.get('*')?.forEach((fn) => fn({ event, data }));
  },
};
