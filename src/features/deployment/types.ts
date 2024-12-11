import { WarpRouteDeployConfig } from '@hyperlane-xyz/sdk';

export enum DeploymentStatus {
  Preparing = 'preparing',
  CreatingTxs = 'creating-txs',
  SigningApprove = 'signing-approve',
  ConfirmingApprove = 'confirming-approve',
  SigningDeployment = 'signing-deployment',
  ConfirmingDeployment = 'confirming-deployment',
  ConfirmedDeployment = 'confirmed-deployment',
  // TODO
  Delivered = 'delivered',
  Failed = 'failed',
}

// TODO
export const SentDeploymentStatuses = [
  DeploymentStatus.ConfirmedDeployment,
  DeploymentStatus.Delivered,
];

// Statuses considered not pending
export const FinalDeploymentStatuses = [...SentDeploymentStatuses, DeploymentStatus.Failed];

export interface DeploymentContext {
  status: DeploymentStatus;
  origin: ChainName;
  destination: ChainName;
  timestamp: number;
}

export enum DeploymentType {
  Warp = 'warp',
  Core = 'core',
  // Add more here as needed
}

interface ConfigBase {
  type: DeploymentType;
  config: unknown;
}

export interface WarpDeploymentConfig extends ConfigBase {
  type: DeploymentType.Warp;
  config: WarpRouteDeployConfig;
}

export interface CoreDeploymentConfig extends ConfigBase {
  type: DeploymentType.Core;
  config: any; // TODO
}

export type DeploymentConfig = WarpDeploymentConfig | CoreDeploymentConfig;
