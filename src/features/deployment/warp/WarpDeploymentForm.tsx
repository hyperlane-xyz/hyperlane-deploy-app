import { arbitrum, ethereum } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  MultiProtocolProvider,
  Token,
  TOKEN_TYPE_TO_STANDARD,
  TokenRouterConfig,
  TokenType,
  WarpRouteDeployConfigSchema,
} from '@hyperlane-xyz/sdk';
import { errorToString, isAddress, isNumeric, objMap, ProtocolType } from '@hyperlane-xyz/utils';
import {
  AccountInfo,
  Button,
  ErrorIcon,
  IconButton,
  useAccounts,
  XIcon,
} from '@hyperlane-xyz/widgets';
import { Form, Formik, useFormikContext } from 'formik';
import Image from 'next/image';
import { useMemo } from 'react';
import { GrowAndFade, GrowAndFadeList } from '../../../components/animation/GrowAndFade';
import { BackButton } from '../../../components/buttons/BackButton';
import { ConnectAwareSubmitButton } from '../../../components/buttons/ConnectAwareSubmitButton';
import { TextInput } from '../../../components/input/TextField';
import { H1 } from '../../../components/text/H1';
import { config } from '../../../consts/config';
import { CardPage } from '../../../flows/CardPage';
import { Stepper } from '../../../flows/Stepper';
import PlusCircleIcon from '../../../images/icons/plus-circle.svg';
import { Color } from '../../../styles/Color';
import { logger } from '../../../utils/logger';
import { ChainConnectionWarning } from '../../chains/ChainConnectionWarning';
import { ChainSelectField } from '../../chains/ChainSelectField';
import { ChainWalletWarning } from '../../chains/ChainWalletWarning';
import { useMultiProvider } from '../../chains/hooks';
import { TokenTypeSelectField } from './TokenTypeSelectField';
import { WarpDeploymentConfigEntry, WarpDeploymentFormValues } from './types';
import { isCollateralTokenType, isNativeTokenType, isSyntheticTokenType } from './utils';

const initialValues: WarpDeploymentFormValues = {
  configs: [
    {
      chainName: ethereum.name,
      tokenType: TokenType.collateral,
      tokenAddress: '',
    },
    {
      chainName: arbitrum.name,
      tokenType: TokenType.synthetic,
    },
  ],
};

export function WarpDeploymentForm() {
  const multiProvider = useMultiProvider();
  const { accounts } = useAccounts(multiProvider, config.addressBlacklist);

  const validate = (values: WarpDeploymentFormValues) =>
    validateForm(values, accounts, multiProvider);

  const onSubmitForm = (values: WarpDeploymentFormValues) => {
    logger.debug('Deployment form values', values);
  };

  return (
    <Formik<WarpDeploymentFormValues>
      initialValues={initialValues}
      onSubmit={onSubmitForm}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {() => (
        <Form className="flex w-full flex-col items-stretch xs:min-w-112">
          <WarningBanners />
          <div className="space-y-5">
            <HeaderSection />
            <ConfigListSection />
            <ErrorSection />
            <ButtonSection />
          </div>
        </Form>
      )}
    </Formik>
  );
}

function HeaderSection() {
  return (
    <div className="flex items-center justify-between gap-10">
      <H1>Configure Warp Route</H1>
      <Stepper numSteps={5} currentStep={2} />
    </div>
  );
}

function ConfigListSection() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();

  return (
    <div className="space-y-3">
      <GrowAndFadeList>
        {values.configs.map((config, index) => (
          <ChainTokenConfig key={index} index={index} config={config} />
        ))}
      </GrowAndFadeList>
      <AddConfigButton />
    </div>
  );
}

function ChainTokenConfig({ config, index }: { config: WarpDeploymentConfigEntry; index: number }) {
  const { values, setValues } = useFormikContext<WarpDeploymentFormValues>();

  const isRemoveDisabled = values.configs.length <= 2;
  const isCollateralized = isCollateralTokenType(config.tokenType);

  const onChange = (update: Partial<WarpDeploymentConfigEntry>) => {
    const configs = [...values.configs];
    const updatedConfig = { ...configs[index], ...update };
    configs[index] = updatedConfig;
    setValues({ configs: configs });
  };

  const onRemove = () => {
    if (isRemoveDisabled) return;
    const configs = [...values.configs];
    configs.splice(index, 1);
    setValues({ configs: configs });
  };

  return (
    <div className="space-y-1.5 rounded-lg bg-blue-500/5 px-3 pb-3 pt-2">
      <div className="flex justify-between">
        <h3 className="pl-1 text-xs text-gray-700">{`Chain ${index + 1}`}</h3>
        <IconButton title="Remove" onClick={onRemove} disabled={isRemoveDisabled}>
          <XIcon width={8} height={8} color={Color.gray['500']} />
        </IconButton>
      </div>
      <div className="flex items-center justify-stretch gap-4">
        <ChainSelectField
          value={config.chainName}
          onChange={(v) => {
            onChange({ chainName: v });
          }}
        />
        <TokenTypeSelectField
          value={config.tokenType}
          onChange={(v) => {
            onChange({ tokenType: v });
          }}
        />
      </div>
      <GrowAndFade isVisible={isCollateralized}>
        <TextInput
          value={config.tokenAddress}
          onChange={(v) => onChange({ tokenAddress: v })}
          placeholder="Token address (0x123...)"
          className="w-full"
        />
      </GrowAndFade>
    </div>
  );
}

function AddConfigButton() {
  const { values, setValues } = useFormikContext<WarpDeploymentFormValues>();

  const onClick = () => {
    const configs = [...values.configs];
    configs.push({
      chainName: '',
      tokenType: TokenType.synthetic,
      tokenAddress: '',
    });
    setValues({ configs });
  };

  return (
    <Button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg bg-blue-500/5 px-3 py-1.5 hover:bg-blue-500/10 hover:opacity-100"
    >
      <Image width={13} height={13} src={PlusCircleIcon} alt="Add Chain" />
      <span className="text-sm">Add Chain</span>
    </Button>
  );
}

function ErrorSection() {
  const { errors } = useFormikContext<WarpDeploymentFormValues>();
  const firstError = Object.keys(errors)[0];
  const firstErrorLabel = isNumeric(firstError) ? `Chain ${parseInt(firstError) + 1}: ` : '';
  return (
    <GrowAndFade isVisible={!!firstError}>
      <div className="flex items-center gap-2 rounded-lg bg-red-500/5 px-3 py-1.5">
        <ErrorIcon width={16} height={16} color={Color.red['600']} />
        <span className="text-xs text-red-600">{`${firstErrorLabel}${errors[firstError]}`}</span>
      </div>
    </GrowAndFade>
  );
}

function ButtonSection() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();
  const chains = useMemo(() => values.configs.map((c) => c.chainName), [values]);
  return (
    <div className="mt-4 flex items-center justify-between">
      <BackButton page={CardPage.Landing} />
      <ConnectAwareSubmitButton chains={chains} text="Continue" className="px-3 py-1.5" />
    </div>
  );
}

function WarningBanners() {
  const { values } = useFormikContext<WarpDeploymentFormValues>();
  return (
    // Max height to prevent double padding if multiple warnings are visible
    <div className="max-h-10">
      {/* TODO check all chains */}
      <ChainWalletWarning origin={values.configs[0].chainName} />
      <ChainConnectionWarning
        origin={values.configs[0].chainName}
        destination={values.configs[1].chainName}
      />
    </div>
  );
}

const insufficientFundsErrMsg = /insufficient.[funds|lamports]/i;
const emptyAccountErrMsg = /AccountNotFound/i;

async function validateForm(
  { configs }: WarpDeploymentFormValues,
  _accounts: Record<ProtocolType, AccountInfo>,
  multiProvider: MultiProtocolProvider,
) {
  try {
    const chainNames = configs.map((c) => c.chainName);
    if (new Set(chainNames).size !== chainNames.length) {
      return { form: 'Chains cannot be used more than once' };
    }

    if (chainNames.length < 2) {
      return { form: 'At least two chains are required' };
    }

    let warpRouteDeployConfig: ChainMap<TokenRouterConfig> = {};
    // TODO import TokenMetadata type from SDK when it's updated
    let firstTokenMetadata: any;
    for (let i = 0; i < configs.length; i++) {
      const { chainName, tokenType, tokenAddress } = configs[i];
      if (!chainName) return { [i]: 'Chain is required' };
      if (!tokenType) return { [i]: 'Token type is required' };

      // TODO import TokenMetadata type from SDK when it's updated
      let tokenMetadata: any;
      if (isCollateralTokenType(tokenType)) {
        if (!tokenAddress) return { [i]: 'Token address is required' };
        if (!isAddress(tokenAddress)) return { [i]: 'Token address is invalid' };
        const token = new Token({
          standard: TOKEN_TYPE_TO_STANDARD[tokenType],
          addressOrDenom: tokenAddress,
          chainName,
          // Placeholder values that won't be used
          decimals: 1,
          symbol: 'Unknown',
          name: 'Unknown',
        });
        tokenMetadata = await token.getAdapter(multiProvider).getMetadata();
      } else if (isNativeTokenType(tokenType)) {
        const chainMetadata = multiProvider.getChainMetadata(chainName);
        if (!chainMetadata.nativeToken) return { [i]: 'Native token metadata missing for chain' };
        const token = Token.FromChainMetadataNativeToken(chainMetadata);
        tokenMetadata = await token.getAdapter(multiProvider).getMetadata();
      } else if (isSyntheticTokenType(tokenType)) {
        // Synthetic tokens, no validation needed here yet
      } else {
        return { [i]: 'Invalid token type' };
      }
      firstTokenMetadata ||= tokenMetadata;

      warpRouteDeployConfig[chainName] = {
        type: tokenType,
        token: tokenAddress,
        ...tokenMetadata,
      };
    }

    // Second pass to add token metadata to synthetic tokens
    warpRouteDeployConfig = objMap(warpRouteDeployConfig, (_, config) => {
      if (isSyntheticTokenType(config.type)) return { ...config, ...firstTokenMetadata };
      else return config;
    });

    WarpRouteDeployConfigSchema.parse(warpRouteDeployConfig);

    // TODO check account balances for each chain

    return {};
  } catch (error: any) {
    logger.error('Error validating form', error);
    let errorMsg = errorToString(error, 40);
    const fullError = `${errorMsg} ${error.message}`;
    if (insufficientFundsErrMsg.test(fullError) || emptyAccountErrMsg.test(fullError)) {
      errorMsg = 'Insufficient funds for gas fees';
    }
    return { form: errorMsg };
  }
}
