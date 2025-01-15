import { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { Stepper } from '../../../flows/Stepper';
import { getChainDisplayName } from '../../chains/utils';
import { SdkLog, useSdkLogs } from '../../logs/useSdkLogs';

export function WarpDeploymentProgressIndicator({
  chains,
  multiProvider,
  className,
}: {
  chains: ChainName[];
  multiProvider: MultiProtocolProvider;
  className?: string;
}) {
  const expectedLogs = useMemo(
    () => getExpectedLogMessages(chains, multiProvider),
    [chains, multiProvider],
  );

  const logs = useSdkLogs();

  const [stepIndex, setStepIndex] = useState<number>(0);

  useEffect(() => {
    const farthestIndex = findFarthestExpectedLog(logs, expectedLogs);
    if (farthestIndex === -1) return;
    setStepIndex(farthestIndex);
  }, [logs, expectedLogs]);

  return (
    <div className={clsx('flex flex-col items-center space-y-4', className)}>
      <p>{expectedLogs[stepIndex][1]}</p>
      <Stepper
        numSteps={expectedLogs.length + 20}
        currentStep={stepIndex + 1}
        size={9}
        pulse
        className="max-w-xs"
      />
    </div>
  );
}

/**
 * Returns a list of tuples of the form [search regex, display string]
 * This is tightly coupled to the exact messages in the SDK logs, which is fragile.
 * A better solution would be to refactor the deployers to emit events as they progress.
 */
function getExpectedLogMessages(chains: ChainName[], multiProvider: MultiProtocolProvider) {
  const logSearchAndDisplayTuples: Array<[string, string]> = [];

  // ISM and hooks (which are often skipped but not always)
  logSearchAndDisplayTuples.push(
    ['Deploying ISM', 'Creating security modules'],
    ['Deploying hook', 'Preparing dispatch hooks'],
  );

  // Token contract and friends
  for (const chain of chains) {
    const displayName = getChainDisplayName(multiProvider, chain);
    logSearchAndDisplayTuples.push(
      [`Deploying proxyAdmin on ${chain}`, `Deploying proxy admin on ${displayName}`],
      [`Deploying Hyp(.*) on ${chain}`, `Deploying Hyp token on ${displayName}`],
      [
        `Deploying TransparentUpgradeableProxy on ${chain}`,
        `Deploying upgrade proxy on ${displayName}`,
      ],
    );
  }

  // Enrollment and ownership transfer
  logSearchAndDisplayTuples.push(
    ['Enrolling deployed routers', 'Enrolling remote routers'],
    ['Set destination gas', 'Setting gas configs'],
    ['Transferring ownership of ownables', 'Transferring contract ownership'],
  );

  return logSearchAndDisplayTuples;
}

function findFarthestExpectedLog(logs: Array<SdkLog>, expectedLogs: Array<[string, string]>) {
  // Iterate through expected logs in reserve and search for them
  // in the list of SDK logs. This approach is worst case of O(n*m)
  // and we may need a more efficient solution eventually.
  for (let i = expectedLogs.length - 1; i >= 0; i--) {
    const regex = new RegExp(expectedLogs[i][0]);
    for (let j = logs.length - 1; j >= 0; j--) {
      if (regex.test(logs[j][2])) return i;
    }
  }
  return -1;
}
