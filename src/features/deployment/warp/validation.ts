import { chainAddresses } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  HypTokenRouterConfig,
  MultiProtocolProvider,
  Token,
  TokenMetadata,
  WarpRouteDeployConfig,
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
import { MIN_CHAIN_BALANCE } from '../../../consts/consts';
import { logger } from '../../../utils/logger';
import { zodErrorToString } from '../../../utils/zod';
import { getChainDisplayName } from '../../chains/utils';
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
  { configs: formConfigs }: WarpDeploymentFormValues,
  accounts: Record<ProtocolType, AccountInfo>,
  multiProvider: MultiProtocolProvider,
  onSuccess: (c: DeploymentConfig) => void,
): Promise<Record<string | number, string>> {
  try {
    const chainNames = formConfigs.map((c) => c.chainName);
    if (new Set(chainNames).size !== chainNames.length) {
      return { form: 'Chains cannot be used more than once' };
    }

    if (chainNames.length < 2) {
      return { form: 'At least two chains are required' };
    }

    const configItemsResults = await Promise.all(
      formConfigs.map((c) => validateChainTokenConfig(c, multiProvider)),
    );
    const errors = configItemsResults.reduce<Record<number, string>>((acc, r, i) => {
      if (!r.success) return { ...acc, [i]: r.error };
      return acc;
    }, {});
    if (objLength(errors) > 0) return errors;

    // If we reach here, all configs are valid
    const configItems = configItemsResults.filter((r) => !!r.success).map((r) => r.data);

    const warpRouteDeployConfigResult = assembleWarpConfig(
      chainNames,
      configItems,
      accounts,
      multiProvider,
    );
    if (!warpRouteDeployConfigResult.success) {
      return { form: warpRouteDeployConfigResult.error };
    }

    const balanceResult = await validateAccountBalances(chainNames, accounts, multiProvider);
    if (!balanceResult.success) {
      return { form: balanceResult.error };
    }

    onSuccess({
      type: DeploymentType.Warp,
      config: warpRouteDeployConfigResult.data,
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
): Promise<Result<HypTokenRouterConfig>> {
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

  let tokenMetadata: TokenMetadata | undefined = undefined;
  try {
    tokenMetadata = await getTokenMetadata(config, multiProvider);
  } catch (error) {
    logger.error('Error getting token metadata', error);
    return failure('Address is not a valid token contract');
  }

  const deployConfig = {
    type: tokenType,
    token: tokenAddress,
    ...tokenMetadata,
  } as HypTokenRouterConfig;

  return success(deployConfig);
}

function assembleWarpConfig(
  chainNames: ChainName[],
  routerConfigs: HypTokenRouterConfig[],
  accounts: Record<ProtocolType, AccountInfo>,
  multiProvider: MultiProtocolProvider,
): Result<WarpRouteDeployConfig> {
  let warpRouteDeployConfig: ChainMap<HypTokenRouterConfig> = chainNames.reduce(
    (acc, chainName, index) => {
      const owner = getAccountAddressForChain(multiProvider, chainName, accounts);
      acc[chainName] = {
        ...routerConfigs[index],
        mailbox: chainAddresses[chainName].mailbox,
        owner,
      };
      return acc;
    },
    {},
  );

  // Second pass to add token metadata to synthetic tokens
  const firstNonSythetic = routerConfigs.find((c) => !isSyntheticTokenType(c.type));
  if (!firstNonSythetic) return failure('Token types cannot all be synthetic');

  warpRouteDeployConfig = objMap(warpRouteDeployConfig, (_, config) => {
    if (!isSyntheticTokenType(config.type)) return config;
    return {
      ...config,
      name: firstNonSythetic.name,
      symbol: firstNonSythetic.symbol,
      decimals: firstNonSythetic.decimals,
    };
  });

  const warpRouteConfigValidationResult =
    WarpRouteDeployConfigSchema.safeParse(warpRouteDeployConfig);

  if (!warpRouteConfigValidationResult.success) {
    return failure(zodErrorToString(warpRouteConfigValidationResult.error));
  }

  return success(warpRouteConfigValidationResult.data);
}

async function validateAccountBalances(
  chains: ChainName[],
  accounts: Record<ProtocolType, AccountInfo>,
  multiProvider: MultiProtocolProvider,
): Promise<Result<undefined>> {
  const results = await Promise.all(
    chains.map(async (chainName) => {
      const token = Token.FromChainMetadataNativeToken(multiProvider.getChainMetadata(chainName));
      const address = getAccountAddressForChain(multiProvider, chainName, accounts);
      if (!address) return false;
      const balance = await token.getBalance(multiProvider, address);
      return balance.amount > MIN_CHAIN_BALANCE;
    }),
  );

  const insufficientChains = chains
    .filter((_, i) => !results[i])
    .map((c) => getChainDisplayName(multiProvider, c));

  if (insufficientChains.length) {
    return failure(`Insufficient funds on chains: ${insufficientChains.join(', ')}`);
  } else {
    return success(undefined);
  }
}
