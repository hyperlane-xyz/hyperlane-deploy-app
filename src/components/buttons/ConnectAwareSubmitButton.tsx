import { ProtocolType } from '@hyperlane-xyz/utils';
import { SpinnerIcon, useAccounts, useConnectFns } from '@hyperlane-xyz/widgets';
import { useFormikContext } from 'formik';
import { useMemo } from 'react';
import { useMultiProvider } from '../../features/chains/hooks';
import { Color } from '../../styles/Color';
import { SolidButton } from './SolidButton';

interface Props {
  chains: ChainName[];
  text: string;
  className?: string;
}

export function ConnectAwareSubmitButton({ chains, text, className }: Props) {
  const { isValidating } = useFormikContext();

  const multiProvider = useMultiProvider();
  const { accounts } = useAccounts(multiProvider);
  const connectFns = useConnectFns();

  const unconnectedProtocols = useMemo(() => {
    // Converting the set to an array because set.values does not work on Safari
    const protocols = Array.from(new Set(chains.map((c) => multiProvider.tryGetProtocol(c))));
    return [...protocols.filter((p): p is ProtocolType => !!p && !accounts[p]?.isReady)];
  }, [accounts, chains, multiProvider]);
  const isAccountsReady = unconnectedProtocols.length === 0;

  const type = isAccountsReady ? 'submit' : 'button';
  const onClick = isAccountsReady ? undefined : connectFns[unconnectedProtocols[0]];

  let content;
  if (isValidating)
    content = <SpinnerIcon width={20} height={20} color={Color.white} className="mx-6" />;
  else if (isAccountsReady) content = text;
  else content = `Connect wallet${unconnectedProtocols.length > 1 ? 's' : ''}`;

  return (
    <SolidButton type={type} color="accent" onClick={onClick} className={className}>
      {content}
    </SolidButton>
  );
}
