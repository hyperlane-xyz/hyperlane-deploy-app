import type { NextPage } from 'next';
import { Card } from '../components/layout/Card';
import { FloatingButtonRow } from '../components/nav/FloatingButtonRow';
import { CardFlow } from '../flows/CardFlow';

const Home: NextPage = () => {
  return (
    <div className="relative max-w-full space-y-3 pt-4">
      <Card className="overflow-x-hidden">
        <CardFlow />
      </Card>
      <FloatingButtonRow />
    </div>
  );
};

export default Home;
