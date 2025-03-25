import { ChainMap } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { ADDRESS_BLACKLIST } from './blacklist';

const addressBlacklist = ADDRESS_BLACKLIST.map((address) => address.toLowerCase());
const chainWalletWhitelists = JSON.parse(process?.env?.NEXT_PUBLIC_CHAIN_WALLET_WHITELISTS || '{}');
const isDevMode = process?.env?.NODE_ENV === 'development';
const registryUrl = process?.env?.NEXT_PUBLIC_REGISTRY_URL || undefined;
const registryBranch = process?.env?.NEXT_PUBLIC_REGISTRY_BRANCH || undefined;
const registryProxyUrl = process?.env?.NEXT_PUBLIC_GITHUB_PROXY || 'https://proxy.hyperlane.xyz';
const deployerWalletEncryptionKey = process?.env?.NEXT_PUBLIC_DEPLOYER_WALLET_ENCRYPTION_KEY || '';
const deployerWalletEncryptionSalt =
  process?.env?.NEXT_PUBLIC_DEPLOYER_WALLET_ENCRYPTION_SALT || '';
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
  deployerWalletEncryptionKey: string; // Encryption key for temporary deployer wallets
  deployerWalletEncryptionSalt: string; // Encryption salt for temporary deployer wallets
  version: string; // Matches version number in package.json
  walletConnectProjectId: string; // Project ID provided by walletconnect
  walletProtocols: ProtocolType[] | undefined; // Wallet Protocols to show in the wallet connect modal. Leave undefined to include all of them
}

export const config: Config = Object.freeze({
  addressBlacklist,
  chainWalletWhitelists,
  enableExplorerLink: false,
  isDevMode,
  registryUrl,
  registryBranch,
  registryProxyUrl,
  deployerWalletEncryptionKey,
  deployerWalletEncryptionSalt,
  version,
  walletConnectProjectId,
  walletProtocols: [ProtocolType.Ethereum], // only EVM wallets allowed for now
});
