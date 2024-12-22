import { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { Numberish } from '@hyperlane-xyz/utils';
import { useAccounts, useActiveChains, useTransactionFns } from '@hyperlane-xyz/widgets';
import { useMutation } from '@tanstack/react-query';
import { Wallet } from 'ethers';
import { useMultiProvider } from '../chains/hooks';

export function useFundDeployerAccount(deployer: Wallet, chainName: ChainName, amount: Numberish) {
  const multiProvider = useMultiProvider();
  const activeAccounts = useAccounts(multiProvider);
  const activeChains = useActiveChains(multiProvider);
  const transactionFns = useTransactionFns(multiProvider);

  const { isPending, mutateAsync, error } = useMutation({
    mutationKey: ['fundDeployerAccount', deployer.address, chainName, amount],
    mutationFn: () =>
      executeTransfer({ multiProvider, activeAccounts, activeChains, transactionFns }),
  });

  return {
    fund: mutateAsync,
    isPending,
    error,
  };
}

async function executeTransfer({
  multiProvider,
  activeAccounts,
  activeChains,
  transactionFns,
}: {
  multiProvider: MultiProtocolProvider;
  activeAccounts: ReturnType<typeof useAccounts>;
  activeChains: ReturnType<typeof useActiveChains>;
  transactionFns: ReturnType<typeof useTransactionFns>;
}) {
  //TODO
}
