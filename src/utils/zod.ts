import { tryParseJsonOrYaml } from '@hyperlane-xyz/utils';
import { ZodError, ZodType } from 'zod';
import { fromError } from 'zod-validation-error';

export function zodErrorToString<T>(err: ZodError<T>) {
  const errorMsg = fromError(err).toString();
  return errorMsg.replace(/^Validation error: /, '');
}

export function validateStringToZodSchema<T>(input: string, schema: ZodType<T>) {
  const parsedInput = tryParseJsonOrYaml(input);
  if (!parsedInput.success) return null;

  const parsedResult = schema.safeParse(parsedInput.data);
  if (!parsedResult.success) return null;

  return parsedResult.data;
}
