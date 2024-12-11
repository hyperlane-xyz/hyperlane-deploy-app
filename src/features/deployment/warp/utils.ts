import {
  EvmTokenAdapter,
  MultiProtocolProvider,
  TokenRouterConfig,
  TokenType,
} from '@hyperlane-xyz/sdk';
import { assert } from '@hyperlane-xyz/utils';
import { WarpDeploymentConfigItem } from './types';

// TODO remove (see below)
const collateralTokenTypes = [
  TokenType.collateral,
  TokenType.collateralVault,
  TokenType.collateralVaultRebase,
  TokenType.XERC20,
  TokenType.XERC20Lockbox,
  TokenType.collateralFiat,
  TokenType.fastCollateral,
  TokenType.collateralUri,
];

const nativeTokenTypes = [TokenType.native, TokenType.nativeScaled];

export function isCollateralTokenType(tokenType: TokenType) {
  // TODO use this when SDK is updated
  // any cast required because the config schema has a narrowed type
  // return CollateralConfigSchema.shape.type.options.includes(tokenType as any);
  return collateralTokenTypes.includes(tokenType);
}

export function isNativeTokenType(tokenType: TokenType) {
  // TODO use this when SDK is updated
  // any cast required because the config schema has a narrowed type
  // return NativeConfigSchema.shape.type.options.includes(tokenType as any);
  return nativeTokenTypes.includes(tokenType);
}

export function isSyntheticTokenType(tokenType: TokenType) {
  return !isCollateralTokenType(tokenType) && !isNativeTokenType(tokenType);
}

export function formItemToDeployConfig(
  config: WarpDeploymentConfigItem,
  // TODO use meta type when SDK is updated
  tokenMetadata: any,
): TokenRouterConfig {
  const { tokenType, tokenAddress } = config;
  return {
    type: tokenType,
    token: tokenAddress,
    ...tokenMetadata,
  };
}

// Consider caching results here for faster form validation
export function getTokenMetadata(
  config: WarpDeploymentConfigItem,
  multiProvider: MultiProtocolProvider,
  // TODO add type when SDK is updated
) {
  const { chainName, tokenType, tokenAddress } = config;
  if (isCollateralTokenType(tokenType)) {
    assert(tokenAddress, 'Collateral token address is required');
    const adapter = new EvmTokenAdapter(chainName, multiProvider, {
      token: tokenAddress,
    });
    return adapter.getMetadata();
  } else if (isNativeTokenType(tokenType)) {
    const chainMetadata = multiProvider.getChainMetadata(chainName);
    assert(chainMetadata.nativeToken, 'Native token metadata missing for chain');
    return chainMetadata.nativeToken;
  } else {
    return undefined;
  }
}
