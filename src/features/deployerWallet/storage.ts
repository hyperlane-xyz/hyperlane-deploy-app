import { Wallet } from 'ethers';
import { logger } from '../../utils/logger';
import { decryptString, encryptString } from './encryption';

const STORAGE_PATH = 'hyperlane/temp-deployer-acc';

export function hasTempDeployerWallet(): boolean {
  return !!localStorage.getItem(STORAGE_PATH);
}

export async function getTempDeployerWallet(
  password: string,
  salt: string,
): Promise<Wallet | null> {
  logger.debug('Reading temp deployer wallet from local storage');
  const encryptedMnemonic = localStorage.getItem(STORAGE_PATH);
  if (!encryptedMnemonic) return null;
  const mnemonic = await decryptString(encryptedMnemonic, password, salt);
  return Wallet.fromMnemonic(mnemonic);
}

export async function setTempDeployerWallet(wallet: Wallet, password: string, salt: string) {
  if (hasTempDeployerWallet()) {
    logger.error(
      'Cannot set a temp deployer wallet when one already exists. This should never happen.',
    );
    throw new Error('Temp deployer wallet already exists');
  }

  const mnemonic = wallet.mnemonic.phrase;
  if (!mnemonic) {
    logger.error('Cannot set temp deployer wallet without mnemonic phrase.');
    throw new Error('Invalid temp wallet');
  }

  logger.info('Writing temp deployer wallet to local storage');

  const encryptedMnemonic = await encryptString(mnemonic, password, salt);
  localStorage.setItem(STORAGE_PATH, encryptedMnemonic);

  // Confirm write was successful
  if (!hasTempDeployerWallet()) {
    throw new Error('Failed to set temp deployer wallet in local storage');
  }

  logger.info('Temp deployer wallet has been written successfully');

  tryPersistBrowserStorage();
}

export function removeTempDeployerWallet() {
  if (!hasTempDeployerWallet()) {
    logger.warn(
      'Attempting to remove a temp deployer wallet that does not exist. This should never happen.',
    );
    return;
  }

  logger.info('Removing temp deployer wallet from local storage');
  localStorage.removeItem(STORAGE_PATH);
  logger.info('Temp deployer wallet has been removed');
}

function tryPersistBrowserStorage() {
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
