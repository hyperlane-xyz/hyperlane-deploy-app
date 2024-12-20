/* eslint-disable no-console */
import { captureException } from '@sentry/nextjs';
import { config } from '../consts/config';

export const logger = {
  debug: (...args: unknown[]) => console.debug(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (message: string, err: Error, ...args: unknown[]) => {
    console.error(message, err, ...args);
    if (!config.isDevMode) {
      const filteredArgs = args.filter(isSafeSentryArg);
      const extra = filteredArgs.reduce((acc, arg, i) => ({ ...acc, [arg${i}]: arg }), {});
      extra['message'] = message;
      captureException(err, { extra });
    }
  },
};

// First line of defense. Scrubbing is also configured in sentry.config.* files
function isSafeSentryArg(arg: unknown): boolean {
  if (typeof arg === 'number') return true;
  if (typeof arg === 'string') return arg.length < 1000;
  return false;
}
