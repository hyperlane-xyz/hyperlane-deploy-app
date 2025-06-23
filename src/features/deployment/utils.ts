import { WarpCoreConfig, WarpRouteDeployConfig } from '@hyperlane-xyz/sdk';
import { objKeys } from '@hyperlane-xyz/utils';
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

export function getDeployConfigFilename(config: WarpRouteDeployConfig) {
  if (!config) return 'deploy.yaml';
  const chains = objKeys(config).sort();

  return `${chains.join('-')}-deploy.yaml`;
}

export function getWarpConfigFilename(config: WarpCoreConfig) {
  if (!config) return 'config.yaml';

  const chains = config.tokens.map((token) => token.chainName).sort();
  return `${chains.join('-')}-config.yaml`;
}

export function sortWarpCoreConfig(warpCoreConfig?: WarpCoreConfig): WarpCoreConfig | undefined {
  if (!warpCoreConfig) return undefined;

  const tokens = warpCoreConfig.tokens;

  const sortedTokens = [...tokens]
    .sort((a, b) => a.chainName.localeCompare(b.chainName))
    .map((token) => ({
      ...token,
      connections: token.connections
        ? [...token.connections].sort((a, b) => {
            const chainA = a.token.split('|')[1] || '';
            const chainB = b.token.split('|')[1] || '';
            return chainA.localeCompare(chainB);
          })
        : undefined,
    }));

  return { ...warpCoreConfig, tokens: sortedTokens };
}
