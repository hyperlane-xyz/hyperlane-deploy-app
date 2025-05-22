import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { toTitleCase } from '@hyperlane-xyz/utils';
import { ChevronIcon, CopyButton, Modal } from '@hyperlane-xyz/widgets';
import { stringify } from 'yaml';
import { Color } from '../../styles/Color';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { DeploymentStatusIcon } from './DeploymentStatusIcon';
import { DeploymentContext } from './types';

export function DeploymentsDetailsModal({
  isOpen,
  onClose,
  deployment,
}: {
  isOpen: boolean;
  onClose: () => void;
  deployment: DeploymentContext;
}) {
  const { id, status, timestamp, config, result } = deployment || {};
  const { chains, type } = config;

  const multiProvider = useMultiProvider();
  const chainNames = chains.map((c) => getChainDisplayName(multiProvider, c)).join(', ');

  return (
    <Modal isOpen={isOpen} close={onClose} panelClassname="p-4 md:p-5 max-w-[30rem] space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-primary-500">{`Deployment #${id}`}</h2>
        <DeploymentStatusIcon status={status} size={22} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <DeploymentProperty name="Type" value={toTitleCase(type)} />
        <DeploymentProperty name="Status" value={toTitleCase(status)} />
        <DeploymentProperty name="Date Created" value={new Date(timestamp).toLocaleDateString()} />
        <DeploymentProperty name="Time Created" value={new Date(timestamp).toLocaleTimeString()} />
        <DeploymentProperty name="Chains" value={chainNames} />
      </div>
      <CollapsibleData data={config.config} label="Deployment Config" />
      {result && <CollapsibleData data={result.result} label="Deployment Result" />}
    </Modal>
  );
}
function DeploymentProperty({ name, value }: { name: string; value: string }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{name}</label>
      <div className="truncate text-md">{value}</div>
    </div>
  );
}

function CollapsibleData({ data, label }: { data: any; label: string }) {
  const yamlConfig = stringify(data, { indent: 2, sortMapEntries: true });

  return (
    <Disclosure as="div">
      {({ open }) => (
        <>
          <DisclosureButton className="data-[open] flex items-center gap-2 text-sm text-gray-600">
            <span>{label}</span>
            <ChevronIcon
              width={11}
              height={7}
              direction={open ? 'n' : 's'}
              color={Color.gray['600']}
              className="pt-px"
            />
          </DisclosureButton>
          <DisclosurePanel
            transition
            className="relative mt-1 overflow-x-auto rounded-md bg-primary-500/5 px-1.5 py-1 text-xs transition duration-300 data-[closed]:-translate-y-4 data-[closed]:opacity-0"
          >
            <pre>{yamlConfig}</pre>
            <CopyButton
              copyValue={yamlConfig}
              width={14}
              height={14}
              className="absolute right-2 top-2 opacity-60"
            />
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}
