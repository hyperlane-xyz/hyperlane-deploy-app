import { AnchorHTMLAttributes, PropsWithChildren } from 'react';

type Props = PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>;

export function A(props: Props) {
  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}
