import clsx from 'clsx';
import { HTMLAttributes, PropsWithChildren } from 'react';

type Props = PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>;

export function H1({ className, ...props }: Props) {
  return <h1 className={clsx('text-xl text-primary-500', className)} {...props} />;
}
