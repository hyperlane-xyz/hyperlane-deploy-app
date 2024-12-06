import { ArrowIcon, Button } from '@hyperlane-xyz/widgets';
import { ComponentProps } from 'react';
import { CardPage } from '../../flows/CardPage';
import { useCardNav } from '../../flows/hooks';
import { Color } from '../../styles/Color';

export function BackButton({ page, ...rest }: ComponentProps<typeof Button> & { page: CardPage }) {
  const { setPage } = useCardNav();

  return (
    <Button onClick={() => setPage(page)} {...rest} className="flex items-center gap-0.5">
      <ArrowIcon direction="w" width={30} height={20} color={Color.accent['500']} />
      <span className="text-md text-accent-500">Back</span>
    </Button>
  );
}
