/** Search mapper: customer codes go to search[code], everything else to the multi-field search[query]. */
export const customerSearchKey = (q: string): Record<string, string> => (/^c-?\d/i.test(q.trim()) ? { code: q.trim() } : { query: q.trim() });
