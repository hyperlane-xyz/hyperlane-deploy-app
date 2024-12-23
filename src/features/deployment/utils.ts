import { ErrorIcon, tryClipboardSet } from '@hyperlane-xyz/widgets';
import { FC } from 'react';
import { toast } from 'react-toastify';
import { stringify } from 'yaml';
import { ConfirmedIcon } from '../../components/icons/ConfirmedIcon';
import { LogsIcon } from '../../components/icons/LogsIcon';
import { StopIcon } from '../../components/icons/StopIcon';
import { DeploymentConfig, DeploymentStatus } from './types';

export function getIconByDeploymentStatus(status: DeploymentStatus): FC<any> {
  switch (status) {
    case DeploymentStatus.Configured:
      return LogsIcon;
    case DeploymentStatus.Complete:
      return ConfirmedIcon;
    case DeploymentStatus.Failed:
      return ErrorIcon;
    case DeploymentStatus.Cancelled:
      return StopIcon;
    default:
      return ErrorIcon;
  }
}

export async function tryCopyConfig(deploymentConfig: DeploymentConfig | undefined) {
  if (!deploymentConfig) return;
  const yamlConfig = stringify(deploymentConfig.config);
  const result = await tryClipboardSet(yamlConfig);
  if (result) toast.success('Config copied to clipboard');
  else toast.error('Unable to set clipboard');
}
