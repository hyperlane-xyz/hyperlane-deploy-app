import { utils, Wallet } from 'ethers';
import { config } from '../../consts/config';
import { logger } from '../../utils/logger';
import { getTempDeployerWallet, setTempDeployerWallet } from './storage';

function createTempDeployerWallet(): Wallet {
  logger.info('Creating temp deployer wallet');
  const entropy = utils.randomBytes(32);
  const mnemonic = utils.entropyToMnemonic(entropy);
  logger.info('Temp deployer wallet created');
  return Wallet.fromMnemonic(mnemonic);
}

export async function getOrCreateTempDeployerWallet(): Promise<Wallet> {
  try {
    const existingWallet = await getTempDeployerWallet(
      config.tempWalletEncryptionKey,
      config.tempWalletEncryptionSalt,
    );
    if (existingWallet) {
      logger.info('Using existing wallet from storage');
      return existingWallet;
    } else {
      const newWallet = createTempDeployerWallet();
      await setTempDeployerWallet(
        newWallet,
        config.tempWalletEncryptionKey,
        config.tempWalletEncryptionSalt,
      );
      return newWallet;
    }
  } catch (error) {
    throw new Error('Error preparing temp deployer wallet', { cause: error });
  }
}
