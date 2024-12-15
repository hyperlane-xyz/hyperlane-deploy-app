import Image from 'next/image';
import { SolidButton } from '../components/buttons/SolidButton';
import { links } from '../consts/links';
import BlueWave from '../images/illustrations/blue-wave.svg';
import SpaceCraft from '../images/illustrations/spacecraft.webp';
import { CardPage } from './CardPage';
import { useCardNav } from './hooks';

export function LandingPage() {
  const { setPage } = useCardNav();

  return (
    <div className="max-w-full space-y-6 p-4 text-center">
      <div className="relative -mx-8 flex items-center justify-center">
        <Image src={BlueWave} alt="" className="absolute left-0 right-0 top-[0.4rem] rotate-6" />
        <Image width={110} height={110} src={SpaceCraft} alt="" className="z-[5] -rotate-[16deg]" />
      </div>
      <h1 className="text-2xl text-primary-500">Deploy a Warp Route</h1>
      <h2 className="max-w-md px-2 text-md leading-relaxed">
        Anyone can permissionlessly create an interchain token bridge by deploying Hyperlane Warp
        Route contracts.
      </h2>
      <p className="max-w-md px-2 text-sm leading-relaxed">
        Follow three steps to create a new route: configure your options, deploy your contracts, and
        set up a bridge UI.
      </p>
      <div className="flex justify-center gap-12 pt-1">
        <a
          href={links.warpDocs}
          target="_blank"
          rel="noopener noreferrer"
          className="w-36 rounded-lg border-2 border-accent-500 px-3 py-2 text-accent-500 transition-all duration-500 hover:bg-accent-500 hover:text-white active:scale-95"
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
