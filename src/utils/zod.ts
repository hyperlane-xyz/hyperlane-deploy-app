import { ZodError } from 'zod';
import { fromError } from 'zod-validation-error';

export function zodErrorToString<T>(err: ZodError<T>) {
  const errorMsg = fromError(err).toString();
  return errorMsg.replace(/^Validation error: /, '');
}
