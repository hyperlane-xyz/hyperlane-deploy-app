import { Modal } from '@hyperlane-xyz/widgets';
import { useMemo } from 'react';
import { formatTimestamp } from '../../utils/date';
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
  const { status, timestamp } = deployment || {};

  const date = useMemo(
    () => (timestamp ? formatTimestamp(timestamp) : formatTimestamp(new Date().getTime())),
    [timestamp],
  );

  return (
    <Modal isOpen={isOpen} close={onClose} panelClassname="p-4 md:p-5 max-w-sm">
      {status}
      {date}
    </Modal>
  );
}

// TODO remove?
// function DeploymentProperty({
//   name,
//   value,
//   url,
// }: {
//   name: string;
//   value: string;
//   url?: string;
// }) {
//   return (
//     <div>
//       <div className="flex items-center justify-between">
//         <label className="text-sm leading-normal tracking-wider text-gray-350">{name}</label>
//         <div className="flex items-center space-x-2">
//           {url && (
//             <a href={url} target="_blank" rel="noopener noreferrer">
//               <Image src={LinkIcon} width={14} height={14} alt="" />
//             </a>
//           )}
//           <CopyButton copyValue={value} width={14} height={14} className="opacity-40" />
//         </div>
//       </div>
//       <div className="mt-1 truncate text-sm leading-normal tracking-wider">{value}</div>
//     </div>
//   );
// }
