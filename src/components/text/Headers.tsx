import clsx from 'clsx';
import { HTMLAttributes, PropsWithChildren } from 'react';

type Props = PropsWithChildren<HTMLAttributes<HTMLHeadingElement>>;

export function H1({ className, ...props }: Props) {
  return <h1 className={clsx('text-xl text-primary-500', className)} {...props} />;
}

export function H2({ className, ...props }: Props) {
  return <h2 className={clsx('text-lg text-primary-500', className)} {...props} />;
}

export function H3({ className, ...props }: Props) {
  return <h3 className={clsx('text-primary-500', className)} {...props} />;
}
