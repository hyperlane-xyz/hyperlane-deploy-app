import { Button } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import { ComponentProps } from 'react';

export function FormButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      className={clsx(
        'flex items-center justify-between rounded-lg border border-primary-300 px-2 py-1.5 text-sm',
        className,
      )}
      {...props}
    />
  );
}
