import { TokenType } from '@hyperlane-xyz/sdk';

// TODO remove (see below)
const collateralizedTokenTypes = [
  TokenType.collateral,
  TokenType.collateralVault,
  TokenType.collateralVaultRebase,
  TokenType.XERC20,
  TokenType.XERC20Lockbox,
  TokenType.collateralFiat,
  TokenType.fastCollateral,
  TokenType.collateralUri,
];

export function isCollateralizedTokenType(tokenType: TokenType) {
  // TODO use this when SDK is updated
  // any cast required because the config schema has a narrowed type
  // return CollateralConfigSchema.shape.type.options.includes(tokenType as any);
  return collateralizedTokenTypes.includes(tokenType);
}
