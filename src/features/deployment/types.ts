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
