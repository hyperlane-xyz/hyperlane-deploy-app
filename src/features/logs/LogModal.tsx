import { Modal, SegmentedControl } from '@hyperlane-xyz/widgets';
import { pino } from 'pino';
import { useState } from 'react';
import { H3 } from '../../components/text/Headers';
import { LOG_LEVELS, useSdkLogs } from './useSdkLogs';

export function LogModal({ isOpen, close }: { isOpen: boolean; close: () => void }) {
  const sdkLogs = useSdkLogs();
  const [filterLevel, setFilterLevel] = useState(LOG_LEVELS[1]);
  const filterLevelValue = getLevelValue(filterLevel);

  return (
    <Modal isOpen={isOpen} close={close} panelClassname="p-4 space-y-2 max-w-md">
      <H3 className="text-center">Deployment Logs</H3>
      <div className="text-xs-important flex justify-center">
        <SegmentedControl options={LOG_LEVELS} onChange={(l) => setFilterLevel(l!)} />
      </div>
      <ul className="list-none space-y-0.5 text-xs">
        {sdkLogs.map(([timestamp, level, message], i) =>
          getLevelValue(level) >= filterLevelValue ? (
            <li className="nth-child(even):bg-blue-500/5 space-x-1" key={i}>
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
