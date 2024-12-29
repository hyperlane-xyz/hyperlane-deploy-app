import { logger } from './logger';

export function tryPersistBrowserStorage() {
  // Request persistent storage for site
  // This prevents browser from clearing local storage when space runs low. Rare but possible.
  // Not a critical perm (and not supported in safari) so not blocking on this
  if (navigator?.storage?.persist) {
    navigator.storage
      .persist()
      .then((isPersisted) => {
        logger.debug(`Is persisted storage granted: ${isPersisted}`);
      })
      .catch((reason) => {
        logger.error('Error enabling storage persist setting', reason);
      });
  }
}
