import { WarpCoreConfig, WarpRouteDeployConfig } from '@hyperlane-xyz/sdk';
import { useMutation } from '@tanstack/react-query';
import { stringify } from 'yaml';
import { useLatestDeployment } from '../hooks';
import { DeploymentType } from '../types';
import { getDeployConfigFilename, getWarpConfigFilename } from '../utils';

const warpRoutesPath = 'deployments/warp_routes';

export function useCreateWarpRoutePR() {
  const { config, result } = useLatestDeployment();

  const { isPending, mutateAsync, error } = useMutation({
    mutationKey: ['createWarpRoutePr', config, result],
    mutationFn: () => {
      if (!config.config || config.type !== DeploymentType.Warp) return Promise.resolve(null);
      if (!result?.result || result.type !== DeploymentType.Warp) return Promise.resolve(null);

      return createWarpRoutePR(config.config, result.result);
    },
    retry: false,
  });

  return {
    mutateAsync,
    error,
    isPending,
  };
}

async function createWarpRoutePR(deployConfig: WarpRouteDeployConfig, warpConfig: WarpCoreConfig) {
  const deployConfigFilename = getDeployConfigFilename(deployConfig);
  const warpConfigFilename = getWarpConfigFilename(warpConfig);
  const symbol = warpConfig.tokens[0].symbol;

  const yamlDeployConfig = stringify(deployConfig, { sortMapEntries: true });
  const yamlWarpConfig = stringify(warpConfig, { sortMapEntries: true });

  const basePath = `${warpRoutesPath}/${symbol}`;
  const files: DeployFile[] = [
    { content: yamlDeployConfig, path: `${basePath}/${deployConfigFilename}` },
    { content: yamlWarpConfig, path: `${basePath}/${warpConfigFilename}` },
  ];

  const res = await fetch('/api/create-pr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unknown error');

  return data;
}

type DeployFile = {
  path: string;
  content: string;
};
