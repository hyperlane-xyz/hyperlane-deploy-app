import { BaseRegistry } from '@hyperlane-xyz/registry';
import { WarpCoreConfig, WarpRouteDeployConfig } from '@hyperlane-xyz/sdk';
import { useMutation } from '@tanstack/react-query';
import { stringify } from 'yaml';
import { useToastError } from '../../components/toast/useToastError';
import { CreatePrBody, CreatePrResponse, GithubIdentity } from '../../types/createPr';
import { normalizeEmptyStrings } from '../../utils/string';
import { useLatestDeployment } from './hooks';
import { DeploymentType } from './types';
import { getConfigsFilename } from './utils';
import { isSyntheticTokenType } from './warp/utils';

const warpRoutesPath = 'deployments/warp_routes';

export function useCreateWarpRoutePR(onSuccess: () => void) {
  const { config, result } = useLatestDeployment();

  const { isPending, mutate, mutateAsync, error, data } = useMutation({
    mutationKey: ['createWarpRoutePr', config, result],
    mutationFn: (githubInformation: GithubIdentity) => {
      if (!config.config || config.type !== DeploymentType.Warp) return Promise.resolve(null);
      if (!result?.result || result.type !== DeploymentType.Warp) return Promise.resolve(null);

      return createWarpRoutePR(config.config, result.result, githubInformation);
    },
    retry: false,
    onSuccess,
  });

  useToastError(error, 'Error creating PR for Github');

  return {
    mutate,
    mutateAsync,
    error,
    isPending,
    data,
  };
}

async function createWarpRoutePR(
  deployConfig: WarpRouteDeployConfig,
  warpConfig: WarpCoreConfig,
  githubInformation: GithubIdentity,
): Promise<CreatePrResponse> {
  const firstNonSynthetic = Object.values(deployConfig).find((c) => !isSyntheticTokenType(c.type));

  if (!firstNonSynthetic || !firstNonSynthetic.symbol)
    throw new Error('Token types cannot all be synthetic');

  const symbol = firstNonSynthetic.symbol;
  const warpRouteId = BaseRegistry.warpDeployConfigToId(deployConfig, { symbol });
  const { deployConfigFilename, warpConfigFilename } = getConfigsFilename(warpRouteId);

  const yamlDeployConfig = stringify(deployConfig, { sortMapEntries: true });
  const yamlWarpConfig = stringify(warpConfig, { sortMapEntries: true });

  const basePath = `${warpRoutesPath}/${symbol}`;
  const requestBody: CreatePrBody = {
    ...normalizeEmptyStrings(githubInformation),
    deployConfig: { content: yamlDeployConfig, path: `${basePath}/${deployConfigFilename}` },
    warpConfig: { content: yamlWarpConfig, path: `${basePath}/${warpConfigFilename}` },
    warpRouteId,
  };

  const res = await fetch('/api/create-pr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...requestBody,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unknown error');

  return data;
}
