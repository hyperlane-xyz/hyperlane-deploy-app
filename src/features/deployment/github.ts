import { BaseRegistry } from '@hyperlane-xyz/registry';
import {
  MultiProtocolProvider,
  ProviderType,
  WarpCoreConfig,
  WarpRouteDeployConfig,
} from '@hyperlane-xyz/sdk';
import { assert, ProtocolType } from '@hyperlane-xyz/utils';
import { useMutation } from '@tanstack/react-query';
import { stringify } from 'yaml';
import { useToastError } from '../../components/toast/useToastError';
import { warpRoutesPath } from '../../consts/consts';
import {
  CreatePrBody,
  CreatePrForm,
  CreatePrRequestBody,
  CreatePrResponse,
} from '../../types/createPr';
import { normalizeEmptyStrings } from '../../utils/string';
import { useMultiProvider } from '../chains/hooks';
import { TypedWallet } from '../deployerWallet/types';
import { useDeployerWallets } from '../deployerWallet/wallets';
import { useLatestDeployment } from './hooks';
import { DeploymentType } from './types';
import { getConfigsFilename, sortWarpCoreConfig } from './utils';
import { isSyntheticTokenType } from './warp/utils';

export function useCreateWarpRoutePR(onSuccess: () => void) {
  const { config, result } = useLatestDeployment();
  const multiProvider = useMultiProvider();
  const { wallets } = useDeployerWallets();

  const { isPending, mutate, mutateAsync, error, data } = useMutation({
    mutationKey: ['createWarpRoutePr', config, result],
    mutationFn: async (prInformation: CreatePrForm) => {
      if (!config.config || config.type !== DeploymentType.Warp)
        throw new Error('Deployment config not found');
      if (!result?.result || result.type !== DeploymentType.Warp)
        throw new Error('Deployment result not found');

      const deployer = wallets[ProtocolType.Ethereum];
      assert(deployer, 'Deployer wallet not found');

      const prBody = getPrCreationBody(config.config, result.result, prInformation);
      const timestamp = `timestamp: ${new Date().toISOString()}`;
      const message = `Verify PR creation for: ${prBody.warpRouteId} ${timestamp}`;
      const signature = await createSignatureFromWallet(deployer, message, multiProvider);

      return createWarpRoutePR({
        prBody,
        signatureVerification: {
          address: deployer.address,
          message,
          signature,
        },
      });
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

function getPrCreationBody(
  deployConfig: WarpRouteDeployConfig,
  warpConfig: WarpCoreConfig,
  prInformation: CreatePrForm,
) {
  const firstNonSynthetic = Object.values(deployConfig).find((c) => !isSyntheticTokenType(c.type));
  const { organization, username, logo } = prInformation;

  if (!firstNonSynthetic || !firstNonSynthetic.symbol)
    throw new Error('Token types cannot all be synthetic');

  const symbol = firstNonSynthetic.symbol;
  const warpRouteId = BaseRegistry.warpDeployConfigToId(deployConfig, { symbol });
  const { deployConfigFilename, warpConfigFilename } = getConfigsFilename(warpRouteId);

  const yamlDeployConfig = stringify(deployConfig, { sortMapEntries: true });
  const yamlWarpConfig = stringify(sortWarpCoreConfig(warpConfig), { sortMapEntries: true });

  const basePath = `${warpRoutesPath}/${symbol}`;
  const requestBody: CreatePrBody = {
    ...normalizeEmptyStrings({ organization, username }),
    deployConfig: { content: yamlDeployConfig, path: `${basePath}/${deployConfigFilename}` },
    warpConfig: { content: yamlWarpConfig, path: `${basePath}/${warpConfigFilename}` },
    warpRouteId,
    logo,
  };

  return requestBody;
}

async function createWarpRoutePR(requestBody: CreatePrRequestBody): Promise<CreatePrResponse> {
  const { logo, ...prBody } = requestBody.prBody;
  const formData = new FormData();
  formData.append('prBody', JSON.stringify(prBody));
  formData.append('signatureVerification', JSON.stringify(requestBody.signatureVerification));
  if (logo) formData.append('logo', logo);

  const res = await fetch('/api/create-pr', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unknown error');

  return data;
}

// TODO multi-protocol support
export async function createSignatureFromWallet(
  typedWallet: TypedWallet,
  message: string,
  multiProvider: MultiProtocolProvider,
): Promise<string> {
  if (typedWallet.type === ProviderType.EthersV5) {
    // any chain will do but we are using mainnet for ease
    const provider = multiProvider.getEthersV5Provider('ethereum');
    const signature = await typedWallet.wallet.connect(provider).signMessage(message);
    return signature;
  } else {
    throw new Error(`Unsupported provider type for sending txs: ${typedWallet.type}`);
  }
}
