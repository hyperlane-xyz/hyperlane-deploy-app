import { tryClipboardSet } from '@hyperlane-xyz/widgets';
import { toast } from 'react-toastify';
import { stringify } from 'yaml';
import { DeploymentConfig } from './types';

export async function tryCopyConfig(deploymentConfig: DeploymentConfig | undefined) {
  if (!deploymentConfig) return;
  const yamlConfig = stringify(deploymentConfig.config);
  const result = await tryClipboardSet(yamlConfig);
  if (result) toast.success('Config copied to clipboard');
  else toast.error('Unable to set clipboard');
}
