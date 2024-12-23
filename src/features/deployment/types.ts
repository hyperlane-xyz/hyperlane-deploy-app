import { ChainName, WarpCoreConfig, WarpRouteDeployConfig } from '@hyperlane-xyz/sdk';

export enum DeploymentStatus {
  Configured = 'configured',
  Deploying = 'deploying',
  Complete = 'complete',
  Cancelled = 'cancelled',
  Failed = 'failed',
}

export enum DeploymentType {
  Warp = 'warp',
  Core = 'core',
  // Add more here as needed
}

export const FinalDeploymentStatuses = [
  DeploymentStatus.Complete,
  DeploymentStatus.Cancelled,
  DeploymentStatus.Failed,
];

export interface DeploymentContext {
  timestamp: number;
  status: DeploymentStatus;
  type: DeploymentType;
  config: DeploymentConfig;
  result?: DeploymentResult;
}

interface ConfigBase {
  type: DeploymentType;
  config: unknown;
  chains: ChainName[];
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

interface ResultBase {
  type: DeploymentType;
  result: unknown;
}

export interface WarpDeploymentResult extends ResultBase {
  type: DeploymentType.Warp;
  result: WarpCoreConfig;
}

export interface CoreDeploymentResult extends ResultBase {
  type: DeploymentType.Core;
  config: any; // TODO
}

export type DeploymentResult = WarpDeploymentResult | CoreDeploymentResult;
