import { ProtocolType } from '@hyperlane-xyz/utils';
import { useAccounts, useConnectFns } from '@hyperlane-xyz/widgets';
import { useMemo } from 'react';
import { useMultiProvider } from '../../features/chains/hooks';
import { SolidButton } from './SolidButton';

interface Props {
  chains: ChainName[];
  text: string;
  className?: string;
}

export function ConnectAwareSubmitButton({ chains, text, className }: Props) {
  const multiProvider = useMultiProvider();
  const { accounts } = useAccounts(multiProvider);
  const connectFns = useConnectFns();

  const unconnectedProtocols = useMemo(() => {
    const protocols = new Set(chains.map((c) => multiProvider.tryGetProtocol(c)));
    return [...protocols.values().filter((p): p is ProtocolType => !!p && !accounts[p]?.isReady)];
  }, [accounts, chains, multiProvider]);
  const isAccountsReady = unconnectedProtocols.length === 0;

  const type = isAccountsReady ? 'submit' : 'button';
  const onClick = isAccountsReady ? undefined : connectFns[unconnectedProtocols[0]];

  let content;
  if (isAccountsReady) content = text;
  else content = `Connect wallet${unconnectedProtocols.length > 1 ? 's' : ''}`;

  return (
    <SolidButton type={type} color="accent" onClick={onClick} className={className}>
      {content}
    </SolidButton>
  );
}
