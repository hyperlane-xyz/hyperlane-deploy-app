import { WarpCoreConfig, WarpRouteDeployConfig } from '@hyperlane-xyz/sdk';
import { useMutation } from '@tanstack/react-query';
import { stringify } from 'yaml';
import { useToastError } from '../../components/toast/useToastError';
import { CreatePrBody, CreatePrResponse } from '../../types/api';
import { useLatestDeployment } from './hooks';
import { DeploymentType } from './types';
import { getDeployConfigFilename, getWarpConfigFilename } from './utils';
import { isSyntheticTokenType } from './warp/utils';

const warpRoutesPath = 'deployments/warp_routes';

export function useCreateWarpRoutePR(onSuccess: () => void) {
  const { config, result } = useLatestDeployment();

  const { isPending, mutateAsync, error, data } = useMutation({
    mutationKey: ['createWarpRoutePr', config, result],
    mutationFn: () => {
      if (!config.config || config.type !== DeploymentType.Warp) return Promise.resolve(null);
      if (!result?.result || result.type !== DeploymentType.Warp) return Promise.resolve(null);

      return createWarpRoutePR(config.config, result.result);
    },
    retry: false,
    onSuccess,
  });

  useToastError(error, 'Error creating PR for Github');

  return {
    mutateAsync,
    error,
    isPending,
    data,
  };
}

async function createWarpRoutePR(
  deployConfig: WarpRouteDeployConfig,
  warpConfig: WarpCoreConfig,
): Promise<CreatePrResponse> {
  const deployConfigFilename = getDeployConfigFilename(deployConfig);
  const warpConfigFilename = getWarpConfigFilename(warpConfig);
  const firstNonSythetic = Object.values(deployConfig).find((c) => !isSyntheticTokenType(c.type));

  if (!firstNonSythetic) throw new Error('Token types cannot all be synthetic');

  const symbol = firstNonSythetic.symbol;

  const yamlDeployConfig = stringify(deployConfig, { sortMapEntries: true });
  const yamlWarpConfig = stringify(warpConfig, { sortMapEntries: true });

  const basePath = `${warpRoutesPath}/${symbol}`;
  const files: CreatePrBody = {
    deployConfig: { content: yamlDeployConfig, path: `${basePath}/${deployConfigFilename}` },
    warpConfig: { content: yamlWarpConfig, path: `${basePath}/${warpConfigFilename}` },
  };

  const res = await fetch('/api/create-pr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deployConfig: files.deployConfig,
      warpConfig: files.warpConfig,
      symbol,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unknown error');

  return data;
}
