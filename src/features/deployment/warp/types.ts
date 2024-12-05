import { TokenType } from '@hyperlane-xyz/sdk';

export interface WarpDeploymentFormValues {
  configs: Array<WarpDeploymentConfigEntry>;
}

export interface WarpDeploymentConfigEntry {
  chainName: ChainName;
  tokenType: TokenType;
  tokenAddress?: Address;
}
