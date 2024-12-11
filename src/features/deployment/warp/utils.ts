import {
  MultiProtocolProvider,
  Token,
  TOKEN_TYPE_TO_STANDARD,
  TokenRouterConfig,
  TokenType,
} from '@hyperlane-xyz/sdk';
import { assert } from '@hyperlane-xyz/utils';
import { WarpDeploymentConfigEntry } from './types';

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

// TODO use meta type when SDK is updated
export function formConfigToDeployConfig(
  config: WarpDeploymentConfigEntry,
  tokenMetadata: any,
): TokenRouterConfig {
  const { tokenType, tokenAddress } = config;
  return {
    type: tokenType,
    token: tokenAddress,
    ...tokenMetadata,
  };
}

export function getTokenMetadata(
  config: WarpDeploymentConfigEntry,
  multiProvider: MultiProtocolProvider,
) {
  const { chainName, tokenType, tokenAddress } = config;
  if (isCollateralTokenType(tokenType)) {
    assert(tokenAddress, 'Collateral token address is required');
    const token = new Token({
      standard: TOKEN_TYPE_TO_STANDARD[tokenType],
      addressOrDenom: tokenAddress,
      chainName,
      // Placeholder values that won't be used
      decimals: 1,
      symbol: 'Unknown',
      name: 'Unknown',
    });
    return token.getAdapter(multiProvider).getMetadata();
  } else if (isNativeTokenType(tokenType)) {
    const chainMetadata = multiProvider.getChainMetadata(chainName);
    assert(chainMetadata.nativeToken, 'Native token metadata missing for chain');
    const token = Token.FromChainMetadataNativeToken(chainMetadata);
    return token.getAdapter(multiProvider).getMetadata();
  } else {
    return undefined;
  }
}
