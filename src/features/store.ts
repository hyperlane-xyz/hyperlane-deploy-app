import { GithubRegistry, IRegistry } from '@hyperlane-xyz/registry';
import { ChainMap, ChainMetadata, MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { objFilter, ProtocolType } from '@hyperlane-xyz/utils';
import { toast } from 'react-toastify';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../consts/config';
import { CardPage } from '../flows/CardPage';
import { logger } from '../utils/logger';
import { assembleChainMetadata } from './chains/metadata';
import type { DeployerKeys } from './deployerWallet/types';
import {
  DeploymentConfig,
  DeploymentContext,
  DeploymentResult,
  DeploymentStatus,
  FinalDeploymentStatuses,
} from './deployment/types';

// Increment this when persist state has breaking changes
// BEWARE: If this in incremented without a migration, the deployer keys will be lost
const PERSIST_STATE_VERSION = 0;

interface AppContext {
  registry: IRegistry;
  chainMetadata: ChainMap<ChainMetadata>;
  multiProvider: MultiProtocolProvider;
  apiKeys: ChainMap<string>;
}

// Keeping everything here for now as state is simple
// Will refactor into slices as necessary
export interface AppState {
  // Chains and providers
  chainMetadata: ChainMap<ChainMetadata>;
  chainMetadataOverrides: ChainMap<Partial<ChainMetadata>>;
  setChainMetadataOverrides: (overrides?: ChainMap<Partial<ChainMetadata> | undefined>) => void;
  multiProvider: MultiProtocolProvider;
  registry: IRegistry;
  setContext: (context: AppContext) => void;
  apiKeys: ChainMap<string>;

  // Encrypted temp deployer keys
  deployerKeys: DeployerKeys;
  setDeployerKey: (protocol: ProtocolType, key: string) => void;
  removeDeployerKey: (protocol: ProtocolType) => void;

  // User history
  deployments: DeploymentContext[];
  addDeployment: (t: Omit<DeploymentContext, 'id' | 'timestamp'>) => void;
  updateDeploymentStatus: (i: number, s: DeploymentStatus) => void;
  completeDeployment: (i: number, r: DeploymentResult) => void;
  failDeployment: (i: number, e: string) => void;
  cancelPendingDeployments: () => void;

  // Shared component state
  cardPage: CardPage;
  direction: 'forward' | 'backward';
  setCardPage: (page: CardPage) => void;

  deploymentConfig: DeploymentConfig | undefined;
  setDeploymentConfig: (config: DeploymentConfig | undefined) => void;

  isSideBarOpen: boolean;
  setIsSideBarOpen: (isOpen: boolean) => void;

  showEnvSelectModal: boolean;
  setShowEnvSelectModal: (show: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    // Store reducers
    (set, get) => ({
      // Chains and providers
      chainMetadata: {},
      chainMetadataOverrides: {},
      setChainMetadataOverrides: async (
        overrides: ChainMap<Partial<ChainMetadata> | undefined> = {},
      ) => {
        logger.debug('Setting chain overrides in store');
        const { multiProvider } = await initWarpContext(get().registry, overrides);
        const filtered = objFilter(overrides, (_, metadata) => !!metadata);
        set({ chainMetadataOverrides: filtered, multiProvider });
      },
      multiProvider: new MultiProtocolProvider({}),
      registry: new GithubRegistry({
        uri: config.registryUrl,
        branch: config.registryBranch,
        proxyUrl: config.registryProxyUrl,
      }),
      setContext: ({ registry, chainMetadata, multiProvider, apiKeys }) => {
        logger.debug('Setting warp context in store');
        set({ registry, chainMetadata, multiProvider, apiKeys });
      },
      apiKeys: {},

      // Encrypted deployer keys
      deployerKeys: {},
      setDeployerKey: (protocol: ProtocolType, key: string) => {
        logger.debug('Setting deployer key in store for:', protocol);
        const deployerKeys = { ...get().deployerKeys, [protocol]: key };
        set({ deployerKeys });
      },
      removeDeployerKey: (protocol: ProtocolType) => {
        logger.debug('Removing deployer key in store for:', protocol);
        const deployerKeys = { ...get().deployerKeys };
        delete deployerKeys[protocol];
        set({ deployerKeys });
      },

      // User history
      deployments: [],
      addDeployment: (t) => {
        const currentDeployments = get().deployments;
        const newDeployment = { ...t, id: currentDeployments.length + 1, timestamp: Date.now() };
        set({ deployments: [...currentDeployments, newDeployment] });
      },
      updateDeploymentStatus: (i, s) => {
        set((state) => {
          if (i >= state.deployments.length) return state;
          const txs = [...state.deployments];
          txs[i].status = s;
          return { deployments: txs };
        });
      },
      completeDeployment: (i, r) => {
        set((state) => {
          if (i >= state.deployments.length) return state;
          const txs = [...state.deployments];
          txs[i].result = r;
          txs[i].status = DeploymentStatus.Complete;
          return { deployments: txs };
        });
      },
      failDeployment: (i, e) => {
        set((state) => {
          if (i >= state.deployments.length) return state;
          const txs = [...state.deployments];
          txs[i].error = e;
          txs[i].status = DeploymentStatus.Failed;
          return { deployments: txs };
        });
      },
      cancelPendingDeployments: () => {
        set((state) => ({
          deployments: state.deployments.map((t) =>
            FinalDeploymentStatuses.includes(t.status)
              ? t
              : { ...t, status: DeploymentStatus.Cancelled },
          ),
        }));
      },

      // Shared component state
      cardPage: CardPage.Landing,
      direction: 'forward',
      setCardPage: (page) => {
        set((s) => ({ cardPage: page, direction: page >= s.cardPage ? 'forward' : 'backward' }));
      },

      deploymentConfig: undefined,
      setDeploymentConfig: (config: DeploymentConfig | undefined) => {
        set(() => ({ deploymentConfig: config }));
      },

      isSideBarOpen: false,
      setIsSideBarOpen: (isSideBarOpen) => {
        set(() => ({ isSideBarOpen }));
      },

      showEnvSelectModal: false,
      setShowEnvSelectModal: (showEnvSelectModal) => {
        set(() => ({ showEnvSelectModal }));
      },
    }),

    // Store config
    {
      name: 'hyperlane-deploy-store', // name in storage
      partialize: (state) => ({
        // fields to persist
        chainMetadataOverrides: state.chainMetadataOverrides,
        deployerKeys: state.deployerKeys,
        deployments: state.deployments,
      }),
      version: PERSIST_STATE_VERSION,
      onRehydrateStorage: () => {
        logger.debug('Rehydrating state');
        return (state, error) => {
          state?.cancelPendingDeployments();
          if (error || !state) {
            logger.error('Error during hydration', error);
            return;
          }
          initWarpContext(state.registry, state.chainMetadataOverrides).then(
            ({ registry, chainMetadata, multiProvider, apiKeys }) => {
              state.setContext({ registry, chainMetadata, multiProvider, apiKeys });
              logger.debug('Rehydration complete');
            },
          );
        };
      },
    },
  ),
);

async function initWarpContext(
  registry: IRegistry,
  storeMetadataOverrides: ChainMap<Partial<ChainMetadata> | undefined>,
): Promise<AppContext> {
  try {
    // Pre-load registry content to avoid repeated requests
    await registry.listRegistryContent();
    const { chainMetadata, chainMetadataWithOverrides } = await assembleChainMetadata(
      registry,
      storeMetadataOverrides,
    );
    const multiProvider = new MultiProtocolProvider(chainMetadataWithOverrides);
    const apiKeys = getApiKeys(chainMetadata);
    console.log('getApikeys', apiKeys);
    return { registry, chainMetadata, multiProvider, apiKeys };
  } catch (error) {
    toast.error('Error initializing warp context. Please check connection status and configs.');
    logger.error('Error initializing warp context', error);
    return {
      registry,
      chainMetadata: {},
      multiProvider: new MultiProtocolProvider({}),
      apiKeys: {},
    };
  }
}

function getApiKeys(chainMetadata: ChainMap<ChainMetadata<object>>) {
  return Object.entries(chainMetadata).reduce<ChainMap<string>>((acc, [chain, metadata]) => {
    if (metadata.blockExplorers?.[0]?.apiKey) {
      acc[chain] = metadata.blockExplorers[0].apiKey;
    }
    return acc;
  }, {});
}
