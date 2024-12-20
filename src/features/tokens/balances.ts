import { IToken } from '@hyperlane-xyz/sdk';
import { isValidAddress } from '@hyperlane-xyz/utils';
import { useQuery } from '@tanstack/react-query';
import { useToastError } from '../../components/toast/useToastError';
import { useMultiProvider } from '../chains/hooks';

export function useBalance(chain?: ChainName, token?: IToken, address?: Address) {
  const multiProvider = useMultiProvider();
  
  const { isLoading, isError, error, data } = useQuery({
    // The Token and Multiprovider classes are not serializable, so we can't use it as a key
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['useBalance', chain, address, token?.addressOrDenom],
    queryFn: async () => {
      if (!chain || !token || !address || !isValidAddress(address, token.protocol)) {
        throw new Error('Invalid parameters');
      }
      return await token.getBalance(multiProvider, address);
    },
    refetchInterval: 5000,
  });

  useToastError(error, 'Error fetching balance');

  return {
    isLoading,
    isError,
    balance: data ?? undefined,
  };
}
