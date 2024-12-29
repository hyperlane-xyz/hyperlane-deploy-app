import { ProviderType } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import type { Wallet as EV5Wallet } from 'ethers';

import type { Keypair as SolWeb3Wallet } from '@solana/web3.js';

import { DirectSecp256k1HdWallet as CosmosWallet } from '@cosmjs/proto-signing';

// A map of protocol to encrypted wallet key
export type DeployerKeys = Partial<Record<ProtocolType, string>>;

/**
 * Wallets with discriminated union of provider type
 * TODO consider moving these to the SDK next to ProviderType
 */
interface TypedWalletBase<T> {
  type: ProviderType;
  wallet: T;
  address: Address;
  protocol: ProtocolType;
}

export interface EthersV5Wallet extends TypedWalletBase<EV5Wallet> {
  type: ProviderType.EthersV5;
  wallet: EV5Wallet;
}

export interface SolanaWeb3Wallet extends TypedWalletBase<SolWeb3Wallet> {
  type: ProviderType.SolanaWeb3;
  wallet: SolWeb3Wallet;
}

export interface CosmJsWallet extends TypedWalletBase<CosmosWallet> {
  type: ProviderType.CosmJs;
  wallet: CosmosWallet;
}

export type TypedWallet = EthersV5Wallet | SolanaWeb3Wallet | CosmJsWallet;

export type DeployerWallets = Partial<Record<ProtocolType, TypedWallet>>;
