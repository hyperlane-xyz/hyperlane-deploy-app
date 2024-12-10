import { TokenType } from '@hyperlane-xyz/sdk';

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
