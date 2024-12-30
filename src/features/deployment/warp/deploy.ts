import { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { useMutation } from '@tanstack/react-query';
import { useToastError } from '../../../components/toast/useToastError';
import { logger } from '../../../utils/logger';
import { useMultiProvider } from '../../chains/hooks';
import { DeployerWallets } from '../../deployerWallet/types';
import { useDeployerWallets } from '../../deployerWallet/wallets';
import { WarpDeploymentConfig } from '../types';

export function useWarpDeployment(
  deploymentConfig?: WarpDeploymentConfig,
  onSuccess?: () => void,
  onFailure?: (error: Error) => void,
) {
  const multiProvider = useMultiProvider();
  const { wallets } = useDeployerWallets();

  const { error, mutate, isIdle, isPending } = useMutation({
    mutationKey: ['warpDeploy', deploymentConfig, wallets],
    mutationFn: () => {
      if (!deploymentConfig) return Promise.resolve(null);
      return executeDeploy(deploymentConfig, multiProvider, wallets);
    },
    retry: false,
    onError: onFailure,
    onSuccess,
  });

  useToastError(error, 'Error deploying warp route.');

  return {
    deploy: mutate,
    isIdle,
    isPending,
  };
}

export async function executeDeploy(
  config: WarpDeploymentConfig,
  multiProvider: MultiProtocolProvider,
  wallets: DeployerWallets,
) {
  //TODO
  logger.info('Deploying warp route', multiProvider, config, wallets);
}
