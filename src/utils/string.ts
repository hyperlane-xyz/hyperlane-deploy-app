export function normalizeEmptyStrings<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      typeof v === 'string' && v.trim() === '' ? undefined : v,
    ]),
  ) as T;
}
