import { Button } from '@hyperlane-xyz/widgets';
import clsx from 'clsx';
import { useDeploymentConfig } from '../../features/deployment/hooks';
import { CardPage } from '../../flows/CardPage';
import { useCardNav } from '../../flows/hooks';
import { Color } from '../../styles/Color';
import { RestartIcon } from '../icons/RestartIcon';

export function RestartButton({ className, ...props }: any) {
  const { setDeploymentConfig } = useDeploymentConfig();
  const { setPage } = useCardNav();
  const onClickRestart = () => {
    setDeploymentConfig(undefined);
    setPage(CardPage.Landing);
  };

  return (
    <Button onClick={onClickRestart} className={clsx('gap-2.5', className)} {...props}>
      <RestartIcon width={18} height={18} color={Color.accent['500']} />
      <span className="text-accent-500">Start a new deployment</span>
    </Button>
  );
}
