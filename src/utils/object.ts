import { isObject } from '@hyperlane-xyz/utils';

export function sortObjByKeys<T extends Record<string, any>>(obj: T): T {
  if (!isObject(obj)) return obj;

  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {}) as T;
}
