import { ChainMap } from '@hyperlane-xyz/sdk';
import { ADDRESS_BLACKLIST } from './blacklist';

const addressBlacklist = ADDRESS_BLACKLIST.map((address) => address.toLowerCase());
const chainWalletWhitelists = JSON.parse(process?.env?.NEXT_PUBLIC_CHAIN_WALLET_WHITELISTS || '{}');
const isDevMode = process?.env?.NODE_ENV === 'development';
const registryUrl = process?.env?.NEXT_PUBLIC_REGISTRY_URL || undefined;
const registryBranch = process?.env?.NEXT_PUBLIC_REGISTRY_BRANCH || undefined;
const registryProxyUrl = process?.env?.NEXT_PUBLIC_GITHUB_PROXY || 'https://proxy.hyperlane.xyz';
const tempWalletEncryptionKey = process?.env?.NEXT_PUBLIC_TEMP_WALLET_ENCRYPTION_KEY || '';
const tempWalletEncryptionSalt = process?.env?.NEXT_PUBLIC_TEMP_WALLET_ENCRYPTION_SALT || '';
const version = process?.env?.NEXT_PUBLIC_VERSION || '0.0.0';
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';

interface Config {
  addressBlacklist: string[]; // A list of addresses that are blacklisted and cannot be used in the app
  chainWalletWhitelists: ChainMap<string[]>; // A map of chain names to a list of wallet names that work for it
  enableExplorerLink: boolean; // Include a link to the hyperlane explorer in the transfer modal
  isDevMode: boolean; // Enables some debug features in the app
  registryUrl: string | undefined; // Optional URL to use a custom registry instead of the published canonical version
  registryBranch?: string | undefined; // Optional customization of the registry branch instead of main
  registryProxyUrl?: string; // Optional URL to use a custom proxy for the GithubRegistry
  tempWalletEncryptionKey: string; // Encryption key for temporary deployer wallets
  tempWalletEncryptionSalt: string; // Encryption salt for temporary deployer wallets
  version: string; // Matches version number in package.json
  walletConnectProjectId: string; // Project ID provided by walletconnect
}

export const config: Config = Object.freeze({
  addressBlacklist,
  chainWalletWhitelists,
  enableExplorerLink: false,
  isDevMode,
  registryUrl,
  registryBranch,
  registryProxyUrl,
  tempWalletEncryptionKey,
  tempWalletEncryptionSalt,
  version,
  walletConnectProjectId,
});
