import { ProviderType } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useQuery } from '@tanstack/react-query';
import { utils, Wallet } from 'ethers';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { config } from '../../consts/config';
import { logger } from '../../utils/logger';
import { useStore } from '../store';
import { decryptString, encryptString } from './encryption';
import { TempDeployerKeys, TempDeployerWallets, TypedWallet } from './types';

export function useTempDeployerWallets(
  protocols: ProtocolType[],
  onFailure?: (error: Error) => void,
) {
  // const tempDeployerKeys = useStore((s) => s.tempDeployerKeys);
  const { tempDeployerKeys, setDeployerKey } = useStore((s) => ({
    tempDeployerKeys: s.tempDeployerKeys,
    setDeployerKey: s.setDeployerKey,
  }));
  const { error, isLoading, data } = useQuery({
    queryKey: ['getDeployerWallet', protocols, tempDeployerKeys, setDeployerKey],
    queryFn: () => getOrCreateTempDeployerWallets(protocols, tempDeployerKeys, setDeployerKey),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  useEffect(() => {
    if (error) {
      toast.error('Error preparing deployer accounts');
      if (onFailure) onFailure(error);
    }
  }, [error, onFailure]);

  return {
    isLoading,
    error,
    wallets: data || {},
  };
}

// export function useSetTempDeployerWallet(protocols: ProtocolType[]) {
//   const setDeployerKey = useStore((s) => s.setDeployerKey);
// }

export function useRemoveTempDeployerWallet(protocols: ProtocolType[]) {
  const removeDeployerKey = useStore((s) => s.removeDeployerKey);
  return () => protocols.map((p) => removeDeployerKey(p));
}

async function getOrCreateTempDeployerWallets(
  protocols: ProtocolType[],
  encryptedKeys: TempDeployerKeys,
  storeKey: (protocol: ProtocolType, key: string) => void,
): Promise<TempDeployerWallets> {
  const wallets: TempDeployerWallets = {};

  for (const protocol of protocols) {
    try {
      const encryptedKey = encryptedKeys[protocol];
      if (encryptedKey) {
        logger.debug('Found deployer key in store for:', protocol);
        const wallet = await getTempDeployerWallet(protocol, encryptedKey);
        wallets[protocol] = wallet;
      } else {
        logger.debug('No deployer key found in store for:', protocol);
        const [wallet, encryptedKey] = await createTempDeployerWallet(protocol);
        storeKey(protocol, encryptedKey);
        tryPersistBrowserStorage();
        wallets[protocol] = wallet;
      }
    } catch (error) {
      throw new Error(`Error preparing temp deployer wallet for ${protocol}`, { cause: error });
    }
  }

  return wallets;
}

async function createTempDeployerWallet(protocol: ProtocolType): Promise<[TypedWallet, string]> {
  logger.info('Creating temp deployer wallet for:', protocol);
  let wallet: TypedWallet;
  let key: string;
  if (protocol === ProtocolType.Ethereum) {
    const entropy = utils.randomBytes(32);
    key = utils.entropyToMnemonic(entropy);
    wallet = { type: ProviderType.EthersV5, wallet: Wallet.fromMnemonic(key) };
  } else {
    throw new Error(`Unsupported protocol for temp deployer wallet: ${protocol}`);
  }

  const encryptedKey = await encryptString(
    key,
    config.tempWalletEncryptionKey,
    config.tempWalletEncryptionSalt,
  );
  logger.info('Temp deployer wallet created for:', protocol);
  return [wallet, encryptedKey];
}

async function getTempDeployerWallet(
  protocol: ProtocolType,
  encryptedKey: string,
): Promise<TypedWallet> {
  logger.debug('Instantiating temp deployer wallet from key for:', protocol);
  const key = await decryptString(
    encryptedKey,
    config.tempWalletEncryptionKey,
    config.tempWalletEncryptionSalt,
  );
  if (protocol === ProtocolType.Ethereum) {
    const wallet = Wallet.fromMnemonic(key);
    return { type: ProviderType.EthersV5, wallet };
  } else {
    throw new Error(`Unsupported protocol for temp deployer wallet: ${protocol}`);
  }
}

export function getDeployerAddressForProtocol(
  wallets: TempDeployerWallets,
  protocol: ProtocolType,
) {
  const typedWallet = wallets[protocol];
  if (!typedWallet) return undefined;
  if (typedWallet.type === ProviderType.EthersV5) {
    return typedWallet.wallet.address;
  } else {
    throw new Error(`Unsupported wallet type for address: ${typedWallet.type}`);
  }
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
