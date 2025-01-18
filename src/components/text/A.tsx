import { AnchorHTMLAttributes, PropsWithChildren } from 'react';

type Props = PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>;

export function A(props: Props) {
  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}

export function AUnderline(props: Props) {
  return <A {...props} className={LinkStyles.underline} />;
}

export const LinkStyles = {
  underline: 'underline underline-offset-2 cursor-pointer hover:text-primary-500',
};
