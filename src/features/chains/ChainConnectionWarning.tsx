import { ChainMetadata, isRpcHealthy } from '@hyperlane-xyz/sdk';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FormWarningBanner } from '../../components/banner/FormWarningBanner';
import { logger } from '../../utils/logger';
import { ChainSelectListModal } from './ChainSelectModal';
import { useMultiProvider } from './hooks';
import { getChainDisplayName } from './utils';

export function ChainConnectionWarning({ chains }: { chains: ChainName[] }) {
  const multiProvider = useMultiProvider();
  const chainMetadataList = useMemo(
    () =>
      chains.map((c) => (c ? multiProvider.tryGetChainMetadata(c) : undefined)).filter((c) => !!c),
    [chains, multiProvider],
  );

  const { data: unhealthyChain } = useQuery({
    queryKey: ['ChainConnectionWarning', chainMetadataList],
    queryFn: async () => {
      const results = await Promise.all(chainMetadataList.map(checkRpcHealth));
      for (let i = 0; i < results.length; i++) {
        // If it's healthy, ignore
        if (results[i]) continue;
        // Otherwise return the first unhealthy chain found
        return chainMetadataList[i].name;
      }
      return null;
    },
    refetchInterval: 5000,
  });

  const displayName = getChainDisplayName(multiProvider, unhealthyChain || '', true);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const onClickEdit = () => {
    if (!unhealthyChain) return;
    setIsModalOpen(true);
  };

  return (
    <>
      <FormWarningBanner isVisible={!!unhealthyChain} cta="Edit" onClick={onClickEdit}>
        {`Connection to ${displayName} is unstable. Consider adding a more reliable RPC URL.`}
      </FormWarningBanner>
      <ChainSelectListModal
        isOpen={isModalOpen}
        close={() => setIsModalOpen(false)}
        onSelect={() => {}}
        showChainDetails={unhealthyChain || undefined}
      />
    </>
  );
}

async function checkRpcHealth(chainMetadata: ChainMetadata) {
  try {
    // Note: this currently checks the health of only the first RPC,
    // which is what wallets and wallet libs (e.g. wagmi) will use
    const isHealthy = await isRpcHealthy(chainMetadata, 0);
    return isHealthy;
  } catch (error) {
    logger.warn('Error checking RPC health', error);
    return false;
  }
}
