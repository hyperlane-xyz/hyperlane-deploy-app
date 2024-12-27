import { useCallback, useRef } from 'react';

export function useThrottle(cb: () => void, limit: number) {
  const lastRun = useRef<number | undefined>(undefined);

  return useCallback(() => {
    if (!lastRun.current || Date.now() - lastRun.current >= limit) {
      cb(); // Execute the callback
      lastRun.current = Date.now(); // Update last execution time
    }
  }, [cb, limit, lastRun]);
}
