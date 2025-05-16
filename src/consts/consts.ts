export const MIN_CHAIN_BALANCE = 1; // 1 Wei
// Should match CLI here:
// https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/main/typescript/cli/src/consts.ts#L2
export const WARP_DEPLOY_GAS_UNITS = BigInt(3e7);
export const REFUND_FEE_PADDING_FACTOR = 1.2;
export const MIN_DEPLOYER_BALANCE_TO_SHOW = BigInt(1e15); // 0.001 ETH

export enum POPULAR_COIN_GECKO_IDS {
  'ETH' = 'ethereum',
  'USDT' = 'tether',
  'BNB' = 'binancecoin',
  'USDC' = 'usd-coin',
  'WBTC' = 'wrapped-bitcoin',
  'WETH' = 'weth',
}
