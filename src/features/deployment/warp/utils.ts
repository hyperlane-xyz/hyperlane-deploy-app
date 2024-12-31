import {
  CollateralTokenConfigSchema,
  EvmTokenAdapter,
  HypTokenRouterConfig,
  MultiProtocolProvider,
  NativeTokenConfigSchema,
  TokenMetadata,
  TokenType,
} from '@hyperlane-xyz/sdk';
import { assert } from '@hyperlane-xyz/utils';
import { WarpDeploymentConfigItem } from './types';

export function isCollateralTokenType(tokenType: TokenType) {
  // any cast required because the config schema has a narrowed type
  return CollateralTokenConfigSchema.shape.type.options.includes(tokenType as any);
}

export function isNativeTokenType(tokenType: TokenType) {
  // any cast required because the config schema has a narrowed type
  return NativeTokenConfigSchema.shape.type.options.includes(tokenType as any);
}

export function isSyntheticTokenType(tokenType: TokenType) {
  return !isCollateralTokenType(tokenType) && !isNativeTokenType(tokenType);
}

export function formItemToDeployConfig(
  config: WarpDeploymentConfigItem,
  tokenMetadata: TokenMetadata,
): HypTokenRouterConfig {
  const { tokenType, tokenAddress } = config;
  return {
    type: tokenType,
    token: tokenAddress,
    ...tokenMetadata,
  } as HypTokenRouterConfig;
}

// Consider caching results here for faster form validation
export function getTokenMetadata(
  config: WarpDeploymentConfigItem,
  multiProvider: MultiProtocolProvider,
): Promise<TokenMetadata> | undefined {
  const { chainName, tokenType, tokenAddress } = config;
  if (isCollateralTokenType(tokenType)) {
    assert(tokenAddress, 'Collateral token address is required');
    const adapter = new EvmTokenAdapter(chainName, multiProvider, {
      token: tokenAddress,
    });
    return adapter.getMetadata();
  } else if (isNativeTokenType(tokenType)) {
    const { nativeToken } = multiProvider.getChainMetadata(chainName);
    assert(nativeToken, 'Native token metadata missing for chain');
    return Promise.resolve({ ...nativeToken, totalSupply: 0 });
  } else {
    return undefined;
  }
}
