import { Modal, SegmentedControl } from '@hyperlane-xyz/widgets';
import { pino } from 'pino';
import { useState } from 'react';
import { H3 } from '../../components/text/Headers';
import { SDK_LOG_LEVELS, useSdkLogs } from './useSdkLogs';

export function LogModal({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  const sdkLogs = useSdkLogs();
  const [filterLevel, setFilterLevel] = useState(SDK_LOG_LEVELS[1]);
  const filterLevelValue = getLevelValue(filterLevel);

  return (
    <Modal isOpen={isOpen} close={close} panelClassname="p-4 space-y-2 max-w-lg">
      <H3 className="text-center">Deployment Logs</H3>
      <div className="text-xs-important flex justify-center">
        <SegmentedControl options={SDK_LOG_LEVELS} onChange={(l) => setFilterLevel(l!)} />
      </div>
      <ul className="list-none text-xs">
        {sdkLogs.map(([timestamp, level, message], i) =>
          getLevelValue(level) >= filterLevelValue ? (
            <li className="-mx-1 space-x-1 px-1 py-0.5 even:bg-blue-500/5" key={i}>
              <span className="text-gray-500">{new Date(timestamp).toLocaleTimeString()}:</span>
              <span>{message}</span>
            </li>
          ) : null,
        )}
      </ul>
    </Modal>
  );
}

function getLevelValue(level: string): number {
  return pino.levels.values[level] || 0;
}
