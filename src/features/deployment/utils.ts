import { tryClipboardSet } from '@hyperlane-xyz/widgets';
import { toast } from 'react-toastify';
import { stringify } from 'yaml';

export async function tryCopyConfig(config: unknown | undefined) {
  if (!config) return;
  const yamlConfig = stringify(config, { sortMapEntries: true });
  const result = await tryClipboardSet(yamlConfig);
  if (result) toast.success('Config copied to clipboard');
  else toast.error('Unable to set clipboard');
}

export function downloadYamlFile(config: unknown | undefined, filename: string) {
  if (!config) return;
  const yamlConfig = stringify(config, { sortMapEntries: true });
  const blob = new Blob([yamlConfig], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
