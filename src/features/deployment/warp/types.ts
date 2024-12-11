import { TokenType } from '@hyperlane-xyz/sdk';

export interface WarpDeploymentConfigItem {
  chainName: ChainName;
  tokenType: TokenType;
  tokenAddress?: Address;
}

export interface WarpDeploymentFormValues {
  configs: Array<WarpDeploymentConfigItem>;
}
