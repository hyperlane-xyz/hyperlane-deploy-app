import type { NextPage } from 'next';
import { Card } from '../components/layout/Card';
import { DeploymentForm } from '../features/deployment/DeploymentForm';
import { WalletFloatingButtons } from '../features/wallet/WalletFloatingButtons';

const Home: NextPage = () => {
  return (
    <div className="space-y-3 pt-4">
      <div className="relative">
        <Card className="w-100 sm:w-[31rem]">
          <DeploymentForm />
        </Card>
        <WalletFloatingButtons />
      </div>
    </div>
  );
};

export default Home;
