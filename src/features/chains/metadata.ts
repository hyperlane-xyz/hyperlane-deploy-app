import {
  chainAddresses,
  IRegistry,
  chainMetadata as publishedChainMetadata,
} from '@hyperlane-xyz/registry';
import {
  ChainMap,
  ChainMetadata,
  ChainMetadataSchema,
  ChainTechnicalStack,
  mergeChainMetadataMap,
  RpcUrlSchema,
} from '@hyperlane-xyz/sdk';
import {
  objFilter,
  objMap,
  promiseObjAll,
  ProtocolType,
  tryParseJsonOrYaml,
} from '@hyperlane-xyz/utils';
import { z } from 'zod';
import { chains as ChainsTS } from '../../consts/chains.ts';
import ChainsYaml from '../../consts/chains.yaml';
import { config } from '../../consts/config.ts';
import { logger } from '../../utils/logger.ts';

export async function assembleChainMetadata(
  registry: IRegistry,
  storeMetadataOverrides?: ChainMap<Partial<ChainMetadata | undefined>>,
) {
  // Chains must include a cosmos chain or CosmosKit throws errors
  const result = z.record(ChainMetadataSchema).safeParse({
    ...ChainsYaml,
    ...ChainsTS,
  });
  if (!result.success) {
    logger.warn('Invalid chain metadata', result.error);
    throw new Error(`Invalid chain metadata: ${result.error.toString()}`);
  }
  const filesystemMetadata = result.data as ChainMap<ChainMetadata>;

  let registryChainMetadata: ChainMap<ChainMetadata>;
  if (config.registryUrl) {
    logger.debug('Using custom registry metadata from:', config.registryUrl);
    registryChainMetadata = await registry.getMetadata();
  } else {
    logger.debug('Using default published registry');
    registryChainMetadata = publishedChainMetadata;
  }

  // TODO have the registry do this automatically
  registryChainMetadata = await promiseObjAll(
    objMap(
      registryChainMetadata,
      async (chainName, metadata): Promise<ChainMetadata> => ({
        ...metadata,
        logoURI: (await registry.getChainLogoUri(chainName)) || undefined,
      }),
    ),
  );

  // TODO remove if/when this app isn't EVM-only
  const evmRegistryChainMetadata = objFilter(
    registryChainMetadata,
    (_, m): m is ChainMetadata =>
      m.protocol === ProtocolType.Ethereum && m.technicalStack !== ChainTechnicalStack.ZkSync,
  );

  let chainMetadata = mergeChainMetadataMap(evmRegistryChainMetadata, filesystemMetadata);

  // Filter to only chains for which there are core deployment artifacts in the registry
  // May want to revisit this later but it would require a way for users to provide these addresses
  chainMetadata = objFilter(
    chainMetadata,
    (c, m): m is ChainMetadata => !!chainAddresses[c]?.mailbox,
  );

  // Filter to only chains with native token information as this is used in a few places
  chainMetadata = objFilter(chainMetadata, (_, m): m is ChainMetadata => !!m.nativeToken);

  // Override RPC urls with the one set in the environment variable
  const parsedRpcOverridesResult = tryParseJsonOrYaml(config.rpcOverrides);
  const rpcOverrides = z
    .record(RpcUrlSchema)
    .safeParse(parsedRpcOverridesResult.success && parsedRpcOverridesResult.data);
  if (config.rpcOverrides && !rpcOverrides.success) {
    logger.warn('Invalid RPC overrides config', rpcOverrides.error);
  }
  chainMetadata = objMap(chainMetadata, (chainName, metadata) => ({
    ...metadata,
    rpcUrls:
      rpcOverrides.success && rpcOverrides.data[chainName]
        ? [rpcOverrides.data[chainName], ...metadata.rpcUrls]
        : metadata.rpcUrls,
  }));

  const chainMetadataWithOverrides = mergeChainMetadataMap(chainMetadata, storeMetadataOverrides);

  return { chainMetadata, chainMetadataWithOverrides };
}
