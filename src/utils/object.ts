import { isObject } from '@hyperlane-xyz/utils';

export function sortObjByKeys(obj: any) {
  if (!isObject(obj)) return obj;

  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}
