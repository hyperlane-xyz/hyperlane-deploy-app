import { MultiProtocolProvider, NativeToken, Token, TokenAmount } from '@hyperlane-xyz/sdk';
import { fromWei } from '@hyperlane-xyz/utils';
import { AccountInfo, getAccountAddressForChain, Modal, useAccounts } from '@hyperlane-xyz/widgets';
import { useQuery } from '@tanstack/react-query';
import { SolidButton } from '../../../components/buttons/SolidButton';
import { H2 } from '../../../components/text/Headers';
import { WARP_DEPLOY_GAS_UNITS } from '../../../consts/consts';
import { useMultiProvider } from '../../chains/hooks';
import { getFundingAmount } from '../../deployerWallet/fund';

type TransactionBalance = {
  currentBalance: TokenAmount;
  minBalance: bigint;
  nativeToken?: NativeToken;
};

export function WarpDeploymentConfirmModal({
  isOpen,
  close,
  onConfirm,
  chainName,
}: {
  isOpen: boolean;
  close: () => void;
  onConfirm: () => void;
  chainName: ChainName;
}) {
  const multiProvider = useMultiProvider();
  const activeAccounts = useAccounts(multiProvider);
  const firstAccount = activeAccounts.readyAccounts[0];

  const { data } = useQuery<TransactionBalance | null>({
    // skipping multiProvider dependency since it causes infinite re-renders
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['ConfirmModalBalances', chainName, activeAccounts],
    queryFn: async () => {
      return getBalances({ chainName, multiProvider, activeAccounts });
    },
    refetchInterval: 5000,
  });

  const balanceText = getBalanceText(data, firstAccount, chainName);

  return (
    <Modal
      isOpen={isOpen}
      close={close}
      panelClassname="p-4 flex flex-col items-center gap-4 max-w-lg"
    >
      <H2>Confirm funding</H2>
      <p className="text-center text-sm text-gray-700">
        {balanceText
          ? balanceText
          : ` Warning: ${firstAccount.addresses[0]?.address || 'Unknown addresses'} has low balance on ${chainName}. Do you wish to proceed?`}
      </p>
      <div className="flex items-center justify-center gap-12">
        <SolidButton onClick={close} color="gray" className="min-w-24 px-4 py-1">
          Cancel
        </SolidButton>
        <SolidButton
          onClick={() => {
            close();
            onConfirm();
          }}
          color="primary"
          className="min-w-24 px-4 py-1"
        >
          Continue
        </SolidButton>
      </div>
    </Modal>
  );
}

async function getBalances({
  chainName,
  multiProvider,
  activeAccounts,
}: {
  chainName: ChainName;
  multiProvider: MultiProtocolProvider;
  activeAccounts: ReturnType<typeof useAccounts>;
}): Promise<TransactionBalance | null> {
  const sender = getAccountAddressForChain(multiProvider, chainName, activeAccounts.accounts);
  if (!sender) return null;
  const chainMetadata = multiProvider.getChainMetadata(chainName);
  const minBalance = await getFundingAmount(chainName, WARP_DEPLOY_GAS_UNITS, multiProvider);
  const token = Token.FromChainMetadataNativeToken(chainMetadata);
  const currentBalance = await token.getBalance(multiProvider, sender);

  return { minBalance, currentBalance, nativeToken: chainMetadata.nativeToken };
}

function getBalanceText(
  balances: TransactionBalance | null | undefined,
  account: AccountInfo,
  chainName: string,
) {
  if (!balances) return null;
  const { minBalance, currentBalance, nativeToken } = balances;
  if (!nativeToken) return null;

  const tokenSymbol = nativeToken.symbol;
  const tokenDecimals = nativeToken.decimals;

  const convertedMinBalance = fromWei(minBalance.toString(), tokenDecimals);
  const convertedCurrentBalance = fromWei(currentBalance.amount.toString(), tokenDecimals);

  return `Warning: ${account.addresses[0]?.address || 'Unknown addresses'} has low balance on ${chainName}. At least ${convertedMinBalance} ${tokenSymbol} recommended but found ${convertedCurrentBalance} ${tokenSymbol}. Do you wish to proceed?`;
}
