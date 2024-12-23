import { errorToString } from '@hyperlane-xyz/utils';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { logger } from '../../utils/logger';

export function useToastError(error: any, context: string) {
  useEffect(() => {
    if (!error) return;
    logger.error(context, error);
    const errorMsg = errorToString(error, 150);
    toast.error(`${context}: ${errorMsg}`);
  }, [error, context]);
}
