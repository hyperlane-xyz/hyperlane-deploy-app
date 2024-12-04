import type { NextPage } from 'next';
import { Card } from '../components/layout/Card';
import { WalletFloatingButtons } from '../features/wallet/WalletFloatingButtons';
import { CardFlow } from '../flows/CardFlow';

const Home: NextPage = () => {
  return (
    <div className="space-y-3 pt-4">
      <div className="relative">
        <Card className="w-100 overflow-x-hidden sm:w-[31rem]">
          <CardFlow />
        </Card>
        <WalletFloatingButtons />
      </div>
    </div>
  );
};

export default Home;
