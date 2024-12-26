import { sleep } from '@hyperlane-xyz/utils';
import { useMutation } from '@tanstack/react-query';
import { logger } from 'ethers';
import { useToastError } from '../../components/toast/useToastError';
import { useTempDeployerWallets } from './hooks';
import { TempDeployerWallets } from './types';

export function useRefundDeployerAccounts({ onSuccess }: { onSuccess?: () => void }) {
  const { wallets } = useTempDeployerWallets([]);

  const { error, mutate } = useMutation({
    mutationKey: ['refundDeployerAccounts', wallets],
    mutationFn: () => refundDeployerAccounts(wallets),
    retry: 3,
    onSuccess,
  });

  useToastError(error, 'Error refunding deployer balances. Please try again later.');

  return mutate;
}

async function refundDeployerAccounts(_wallets: TempDeployerWallets) {
  //TODO
  logger.info('Refunding deployer accounts');
  await sleep(10_000);
  logger.info('Done refunding deployer accounts');
  return true;
}
