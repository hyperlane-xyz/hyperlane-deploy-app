import { WindowPostMessageStream } from '@metamask/post-message-stream';
import { initializeProvider } from '@metamask/providers';

// Firefox Metamask Hack
// Due to https://github.com/MetaMask/metamask-extension/issues/3133
const isMetaMaskAvailable = () => {
  return typeof window !== 'undefined' && (window.ethereum || window.web3);
};

(() => {
  if (!isMetaMaskAvailable() && navigator.userAgent.includes('Firefox')) {
    // setup background connection
    const metamaskStream = new WindowPostMessageStream({
      name: 'metamask-inpage',
      target: 'metamask-contentscript',
    });

    // this will initialize the provider and set it as window.ethereum
    try {
      initializeProvider({
        connectionStream: metamaskStream,
        shouldShimWeb3: true,
      });
    } catch (error) {
      console.error('Failed to initialize MetaMask provider:', error);
    }
  }
})();
