import { SolidButton } from '../components/buttons/SolidButton';
import { links } from '../consts/links';
import { CardPage } from './CardPage';
import { useCardNav } from './hooks';

export function LandingPage() {
  const { setPage } = useCardNav();

  return (
    <div className="space-y-6 p-4 text-center">
      <h1 className="text-2xl text-primary-500">Deploy a Warp Route</h1>
      <h2 className="text-md">
        Anyone can permissionlessly create an interchain token bridge by deploying Hyperlane Warp
        Route contracts.
      </h2>
      <p className="text-sm">
        Follow three steps to create a new route: configure your options, deploy your contracts, and
        set up a bridge UI.
      </p>
      <div className="flex justify-center gap-12">
        <a
          href={links.warpDocs}
          target="_blank"
          rel="noopener noreferrer"
          className="w-36 rounded-lg border-2 border-accent-500 px-3 py-2 text-accent-500 transition-all hover:border-accent-600 hover:text-accent-600 active:scale-95"
        >
          Learn more
        </a>
        <SolidButton
          color="accent"
          onClick={() => setPage(CardPage.WarpForm)}
          className="w-36 px-3 py-2"
        >
          Deploy
        </SolidButton>
      </div>
    </div>
  );
}
