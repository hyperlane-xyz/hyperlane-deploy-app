import { errorToString } from '@hyperlane-xyz/utils';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { logger } from '../../utils/logger';

export function useToastError(error: any, context: string, errorLength = 120) {
  useEffect(() => {
    if (!error) return;
    logger.error(context, error);
    const errorMsg = error?.error?.message || errorToString(error, errorLength);
    toast.error(`${context}: ${errorMsg}`);
  }, [error, context, errorLength]);
}
