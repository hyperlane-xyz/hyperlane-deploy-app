import { utils, Wallet } from 'ethers';
import { config } from '../../consts/config';
import { logger } from '../../utils/logger';
import { setTempDeployerWallet } from './storage';

function createTempDeployerWallet(): Wallet {
  logger.info('Creating temp deployer wallet');
  const entropy = utils.randomBytes(32);
  const mnemonic = utils.entropyToMnemonic(entropy);
  logger.info('Temp deployer wallet created');
  return Wallet.fromMnemonic(mnemonic);
}

export async function createAndStoreTempDeployerWallet(): Promise<Wallet> {
  const newWallet = createTempDeployerWallet();
  await setTempDeployerWallet(
    newWallet,
    config.tempWalletEncryptionKey,
    config.tempWalletEncryptionSalt,
  );
  return newWallet;
}
