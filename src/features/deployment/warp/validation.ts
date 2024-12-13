import { chainAddresses } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  MultiProtocolProvider,
  TokenRouterConfig,
  WarpRouteDeployConfigSchema,
} from '@hyperlane-xyz/sdk';
import {
  errorToString,
  failure,
  isAddress,
  objLength,
  objMap,
  ProtocolType,
  Result,
  success,
} from '@hyperlane-xyz/utils';
import { AccountInfo, getAccountAddressForChain } from '@hyperlane-xyz/widgets';
import { logger } from '../../../utils/logger';
import { zodErrorToString } from '../../../utils/zod';
import { DeploymentConfig, DeploymentType } from '../types';
import { WarpDeploymentConfigItem, WarpDeploymentFormValues } from './types';
import {
  getTokenMetadata,
  isCollateralTokenType,
  isNativeTokenType,
  isSyntheticTokenType,
} from './utils';

const insufficientFundsErrMsg = /insufficient.[funds|lamports]/i;
const emptyAccountErrMsg = /AccountNotFound/i;

export async function validateWarpDeploymentForm(
  { configs }: WarpDeploymentFormValues,
  accounts: Record<ProtocolType, AccountInfo>,
  multiProvider: MultiProtocolProvider,
  onSuccess: (c: DeploymentConfig) => void,
): Promise<Record<string | number, string>> {
  try {
    const chainNames = configs.map((c) => c.chainName);
    if (new Set(chainNames).size !== chainNames.length) {
      return { form: 'Chains cannot be used more than once' };
    }

    if (chainNames.length < 2) {
      return { form: 'At least two chains are required' };
    }

    const configItemsResults = await Promise.all(
      configs.map((c) => validateChainTokenConfig(c, multiProvider)),
    );
    const errors = configItemsResults.reduce<Record<number, string>>((acc, r, i) => {
      if (!r.success) return { ...acc, [i]: r.error };
      return acc;
    }, {});
    if (objLength(errors) > 0) return errors;

    // If we reach here, all configs are valid
    const configItems = configItemsResults.filter((r) => !!r.success).map((r) => r.data);

    let warpRouteDeployConfig: ChainMap<TokenRouterConfig> = configs.reduce(
      (acc, currentConfig, index) => {
        const chainName = currentConfig.chainName;
        const owner = getAccountAddressForChain(multiProvider, chainName, accounts);
        acc[chainName] = {
          ...configItems[index],
          mailbox: chainAddresses[chainName].mailbox,
          owner,
        };
        return acc;
      },
      {},
    );

    // Second pass to add token metadata to synthetic tokens
    const firstNonSythetic = configItems.find((c) => !isSyntheticTokenType(c.type));
    if (!firstNonSythetic) return { form: 'Token types cannot all be synthetic' };

    warpRouteDeployConfig = objMap(warpRouteDeployConfig, (_, config) => {
      if (!isSyntheticTokenType(config.type)) return config;
      return {
        ...config,
        name: firstNonSythetic.name,
        symbol: firstNonSythetic.symbol,
        decimals: firstNonSythetic.decimals,
      };
    });

    const combinedConfigValidationResult =
      WarpRouteDeployConfigSchema.safeParse(warpRouteDeployConfig);

    if (!combinedConfigValidationResult.success) {
      return { form: zodErrorToString(combinedConfigValidationResult.error) };
    }

    // TODO check account balances for each chain

    onSuccess({
      type: DeploymentType.Warp,
      config: combinedConfigValidationResult.data,
      chains: chainNames,
    });

    return {};
  } catch (error: any) {
    logger.error('Error validating form', error);
    let errorMsg = errorToString(error, 100);
    const fullError = `${errorMsg} ${error.message}`;
    if (insufficientFundsErrMsg.test(fullError) || emptyAccountErrMsg.test(fullError)) {
      errorMsg = 'Insufficient funds for gas fees';
    }
    return { form: errorMsg };
  }
}

async function validateChainTokenConfig(
  config: WarpDeploymentConfigItem,
  multiProvider: MultiProtocolProvider,
): Promise<Result<TokenRouterConfig>> {
  const { chainName, tokenType, tokenAddress } = config;
  if (!chainName) return failure('Chain is required');
  if (!tokenType) return failure('Token type is required');

  if (isCollateralTokenType(tokenType)) {
    if (!tokenAddress) return failure('Token address is required');
    if (!isAddress(tokenAddress)) return failure('Token address is invalid');
  } else if (isNativeTokenType(tokenType)) {
    const chainMetadata = multiProvider.getChainMetadata(chainName);
    if (!chainMetadata.nativeToken) return failure('Native token metadata missing for chain');
  }

  // TODO import TokenMetadata type from SDK when it's updated
  let tokenMetadata: any = undefined;
  try {
    tokenMetadata = await getTokenMetadata(config, multiProvider);
  } catch (error) {
    logger.error('Error getting token metadata', error);
    return failure('Address is not a valid token contract');
  }

  const deployConfig: TokenRouterConfig = {
    type: tokenType,
    token: tokenAddress,
    ...tokenMetadata,
  };

  return success(deployConfig);
}
