import { tryClipboardSet } from '@hyperlane-xyz/widgets';
import { toast } from 'react-toastify';
import { stringify } from 'yaml';

export async function tryCopyConfig(config: unknown | undefined) {
  if (!config) return;
  const yamlConfig = stringify(config);
  const result = await tryClipboardSet(yamlConfig);
  if (result) toast.success('Config copied to clipboard');
  else toast.error('Unable to set clipboard');
}
