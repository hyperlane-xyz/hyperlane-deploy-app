import { ProviderType } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'ethers';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { config } from '../../consts/config';
import { logger } from '../../utils/logger';
import { tryPersistBrowserStorage } from '../../utils/storage';
import { useStore } from '../store';
import { decryptString, encryptString } from './encryption';
import { DeployerKeys, DeployerWallets, TypedWallet } from './types';

/**
 * Reads and decrypts any existing deployer keys
 */
export function useDeployerWallets() {
  const { deployerKeys } = useStore((s) => ({
    deployerKeys: s.deployerKeys,
  }));
  const { error, isLoading, data } = useQuery({
    queryKey: ['getDeployerWallets', deployerKeys],
    queryFn: () => getDeployerWallets(deployerKeys),
    retry: false,
  });

  return {
    isLoading,
    error,
    wallets: data || {},
  };
}

/**
 * Reads and decrypts any existing deployer keys
 * or creates new ones if they don't exist
 */
export function useOrCreateDeployerWallets(
  protocols: ProtocolType[],
  onFailure?: (error: Error) => void,
) {
  const { deployerKeys, setDeployerKey } = useStore((s) => ({
    deployerKeys: s.deployerKeys,
    setDeployerKey: s.setDeployerKey,
  }));
  const { error, isLoading, data } = useQuery({
    queryKey: ['getOrCreateDeployerWallets', protocols, deployerKeys, setDeployerKey],
    queryFn: () => getOrCreateDeployerWallets(protocols, deployerKeys, setDeployerKey),
    retry: false,
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

export function useRemoveDeployerWallet() {
  return useStore((s) => s.removeDeployerKey);
}

async function getDeployerWallets(encryptedKeys: DeployerKeys) {
  const wallets: DeployerWallets = {};
  for (const protocol of Object.values(ProtocolType)) {
    try {
      const encryptedKey = encryptedKeys[protocol];
      if (!encryptedKey) continue;
      logger.debug('Found deployer key in store for:', protocol);
      const wallet = await decryptDeployerWallet(protocol, encryptedKey);
      wallets[protocol] = wallet;
    } catch (error) {
      throw new Error(`Error reading deployer wallet for ${protocol}`, { cause: error });
    }
  }
  return wallets;
}

async function getOrCreateDeployerWallets(
  protocols: ProtocolType[],
  encryptedKeys: DeployerKeys,
  storeKey: (protocol: ProtocolType, key: string) => void,
): Promise<DeployerWallets> {
  const wallets: DeployerWallets = {};
  for (const protocol of protocols) {
    try {
      const encryptedKey = encryptedKeys[protocol];
      if (encryptedKey) {
        logger.debug('Found deployer key in store for:', protocol);
        const wallet = await decryptDeployerWallet(protocol, encryptedKey);
        wallets[protocol] = wallet;
      } else {
        logger.debug('No deployer key found in store for:', protocol);
        const [wallet, encryptedKey] = await createDeployerWallet(protocol);
        storeKey(protocol, encryptedKey);
        tryPersistBrowserStorage();
        wallets[protocol] = wallet;
      }
    } catch (error) {
      throw new Error(`Error preparing deployer wallet for ${protocol}`, { cause: error });
    }
  }
  return wallets;
}

// TODO multi-protocol support
async function createDeployerWallet(protocol: ProtocolType): Promise<[TypedWallet, string]> {
  logger.info('Creating deployer wallet for:', protocol);
  let wallet: TypedWallet;
  let key: string;
  if (protocol === ProtocolType.Ethereum) {
    const ethersWallet = Wallet.createRandom();
    wallet = {
      type: ProviderType.EthersV5,
      wallet: ethersWallet,
      address: ethersWallet.address,
      protocol,
    };
    key = ethersWallet.privateKey;
  } else {
    throw new Error(`Unsupported protocol for deployer wallet: ${protocol}`);
  }

  const encryptedKey = await encryptString(
    key,
    config.deployerWalletEncryptionKey,
    config.deployerWalletEncryptionSalt,
  );
  logger.info('Temp deployer wallet created for:', protocol);
  return [wallet, encryptedKey];
}

// TODO multi-protocol support
async function decryptDeployerWallet(
  protocol: ProtocolType,
  encryptedKey: string,
): Promise<TypedWallet> {
  logger.debug('Instantiating deployer wallet from key for:', protocol);
  const key = await decryptString(
    encryptedKey,
    config.deployerWalletEncryptionKey,
    config.deployerWalletEncryptionSalt,
  );
  if (protocol === ProtocolType.Ethereum) {
    const wallet = new Wallet(key);
    return { type: ProviderType.EthersV5, wallet, address: wallet.address, protocol };
  } else {
    throw new Error(`Unsupported protocol for deployer wallet: ${protocol}`);
  }
}

// TODO multi-protocol support
export function getDeployerWalletKey(wallet: TypedWallet) {
  if (wallet.type === ProviderType.EthersV5) {
    return wallet.wallet.privateKey;
  } else {
    throw new Error(`Unsupported wallet type for address: ${wallet.type}`);
  }
}
