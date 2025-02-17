import {
  configureRootLogger,
  getRootLogger,
  LogFormat,
  LogLevel as LogLevelWithOff,
} from '@hyperlane-xyz/utils';
import { useInterval } from '@hyperlane-xyz/widgets';
import { Logger } from 'pino';
import { useCallback, useEffect, useState } from 'react';

export const SDK_LOG_LEVELS = Object.values(LogLevelWithOff).filter(
  (l) => l !== LogLevelWithOff.Off,
);
export type SdkLogLevel = (typeof SDK_LOG_LEVELS)[number];
// Tuple of timestamp, level, message
export type SdkLog = [number, SdkLogLevel, string];
let logBuffer: Array<SdkLog> = [];

export function useSdkLogWatcher() {
  useEffect(() => {
    logBuffer = [];
    configureRootLogger(LogFormat.JSON, LogLevelWithOff.Debug);
    const onLog = (timestamp: number, level: SdkLogLevel, ...args: any) => {
      const message = `${args}`.replaceAll('[object Object],', '').trim();
      logBuffer.push([timestamp, level, message]);
    };
    const rootLogger = getRootLogger();
    // NOTE ABOUT PINO:
    // Pino sucks. Splitting it's log output to multiple transports doesn't seem
    // to be possible. There is a way to specify transports at logger init time
    // but it requires the use of worker threads which greatly complicates the
    // bundling and runtime requirements for the utils lib. The following two
    // method calls hack in wrappers for the log methods to force a call to onLog.
    wrapChildMethod(rootLogger, onLog);
    wrapLogMethods(rootLogger, onLog);

    return () => {
      // Replace global rootLogger with new one
      configureRootLogger(LogFormat.JSON, LogLevelWithOff.Info);
    };
  }, []);
}

/**
 * Note: a parent component must call userSdkLogWatcher() for this
 * to return anything
 */
export function useSdkLogs() {
  const [logs, setLogs] = useState<Array<SdkLog>>([]);
  const syncLogs = useCallback(() => setLogs([...logBuffer]), []);
  useInterval(syncLogs, 250);
  return logs;
}

/**
 * Add a layer of indirection to the logger's 'child' method
 * so that any children created from it have their log methods wrapped.
 */
function wrapChildMethod(
  logger: Logger,
  onLog: (timestamp: number, level: SdkLogLevel, ...args: any) => void,
) {
  const defaultChild = logger.child.bind(logger);
  // @ts-ignore allow spread argument
  logger.child = (...args: any) => {
    // @ts-ignore allow spread argument
    const childLogger = defaultChild(...args);
    wrapLogMethods(childLogger, onLog);
    return childLogger;
  };
}

/**
 * Add a layer of indirection to the logger's log methods
 * so that they trigger the onLog callback each time they're called.
 */
function wrapLogMethods(
  logger: Logger,
  onLog: (timestamp: number, level: SdkLogLevel, ...args: any) => void,
) {
  for (const level of SDK_LOG_LEVELS) {
    const defaultMethod = logger[level].bind(logger);
    const wrappedMethod = (...args: any) => {
      // @ts-ignore allow spread argument
      defaultMethod(...args);
      onLog(Date.now(), level, ...args);
    };
    logger[level] = wrappedMethod;
  }
}
