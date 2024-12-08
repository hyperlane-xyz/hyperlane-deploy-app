import { useAccounts, useConnectFns, useTimeout } from '@hyperlane-xyz/widgets';
import { useFormikContext } from 'formik';
import { useCallback, useMemo } from 'react';
import { useMultiProvider } from '../../features/chains/hooks';
import { SolidButton } from './SolidButton';

interface Props {
  chains: ChainName[];
  text: string;
  className?: string;
}

export function ConnectAwareSubmitButton<FormValues>({ chains, text, className }: Props) {
  const multiProvider = useMultiProvider();
  const { accounts } = useAccounts(multiProvider);
  const connectFns = useConnectFns();

  const unconnectedProtocols = useMemo(() => {
    const protocols = new Set(chains.map((c) => multiProvider.getProtocol(c)));
    return [...protocols.values().filter((p) => !accounts[p]?.isReady)];
  }, [accounts, chains, multiProvider]);
  const isAccountsReady = unconnectedProtocols.length === 0;

  const { errors, setErrors, touched, setTouched } = useFormikContext<FormValues>();

  const hasError = Object.keys(touched).length > 0 && Object.keys(errors).length > 0;

  const color = hasError ? 'red' : 'accent';
  const type = isAccountsReady ? 'submit' : 'button';
  const onClick = isAccountsReady ? undefined : connectFns[unconnectedProtocols[0]];

  let content;
  if (hasError) content = 'Error';
  else if (isAccountsReady) content = text;
  else content = `Connect wallet${unconnectedProtocols.length > 1 ? 's' : ''}`;

  // Automatically clear error state after a timeout
  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setErrors, setTouched, errors, touched]);

  useTimeout(clearErrors, 3500);

  return (
    <SolidButton type={type} color={color} onClick={onClick} className={className}>
      {content}
    </SolidButton>
  );
}
