import type { NextPage } from 'next';
import { Card } from '../components/layout/Card';
import { WalletFloatingButtons } from '../features/wallet/WalletFloatingButtons';
import { CardFlow } from '../flows/CardFlow';

const Home: NextPage = () => {
  return (
    <div className="relative max-w-full space-y-3 pt-4">
      <Card className="overflow-x-hidden sm:max-w-screen-xs">
        <CardFlow />
      </Card>
      <WalletFloatingButtons />
    </div>
  );
};

export default Home;
