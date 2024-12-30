import { useEffect } from 'react';
import { useThrottle } from './useThrottle';

export function useMutationOnMount<T>(
  isIdle: boolean,
  run: () => Promise<T> | null | undefined | void,
  restartDelay = 10_000,
) {
  const throttledRun = useThrottle(run, restartDelay);

  useEffect(() => {
    if (isIdle) throttledRun();
  }, [isIdle, throttledRun]);
}
