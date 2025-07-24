import { ISafe__factory as ISafeFactory } from '@hyperlane-xyz/core';
import { MultiProtocolProvider, ProviderType } from '@hyperlane-xyz/sdk';

export async function isGnosisSafe(
  multiProvider: MultiProtocolProvider,
  owner: string,
  chain: ChainName,
) {
  // Heuristically check if the owner could be a safe by calling expected functions
  try {
    const typedProvider = multiProvider.getProvider(chain);
    if (typedProvider.type !== ProviderType.EthersV5) throw new Error('Unsupported provider');

    const potentialGnosisSafe = ISafeFactory.connect(owner, typedProvider.provider);
    await Promise.all([potentialGnosisSafe.getThreshold(), potentialGnosisSafe.nonce()]);
    return true;
  } catch {
    return false;
  }
}
