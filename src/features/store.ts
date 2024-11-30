import { GithubRegistry, IRegistry } from '@hyperlane-xyz/registry';
import { ChainMap, ChainMetadata, MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { objFilter } from '@hyperlane-xyz/utils';
import { toast } from 'react-toastify';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../consts/config';
import { logger } from '../utils/logger';
import { assembleChainMetadata } from './chains/metadata';
import { DeploymentContext, DeploymentStatus, FinalDeploymentStatuses } from './deployment/types';

// Increment this when persist state has breaking changes
const PERSIST_STATE_VERSION = 0;

// Keeping everything here for now as state is simple
// Will refactor into slices as necessary
export interface AppState {
  // Chains and providers
  chainMetadata: ChainMap<ChainMetadata>;
  chainMetadataOverrides: ChainMap<Partial<ChainMetadata>>;
  setChainMetadataOverrides: (overrides?: ChainMap<Partial<ChainMetadata> | undefined>) => void;
  multiProvider: MultiProtocolProvider;
  registry: IRegistry;
  setContext: (context: {
    registry: IRegistry;
    chainMetadata: ChainMap<ChainMetadata>;
    multiProvider: MultiProtocolProvider;
  }) => void;

  // User history
  deployments: DeploymentContext[];
  addDeployment: (t: DeploymentContext) => void;
  resetDeployments: () => void;
  updateDeploymentStatus: (i: number, s: DeploymentStatus) => void;
  failUnconfirmedDeployments: () => void;

  // Shared component state
  deploymentLoading: boolean;
  setDeploymentLoading: (isLoading: boolean) => void;
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
      setContext: ({ registry, chainMetadata, multiProvider }) => {
        logger.debug('Setting warp context in store');
        set({ registry, chainMetadata, multiProvider });
      },

      // User history
      deployments: [],
      addDeployment: (t) => {
        set((state) => ({ deployments: [...state.deployments, t] }));
      },
      resetDeployments: () => {
        set(() => ({ deployments: [] }));
      },
      updateDeploymentStatus: (i, s) => {
        set((state) => {
          if (i >= state.deployments.length) return state;
          const txs = [...state.deployments];
          txs[i].status = s;
          return {
            deployments: txs,
          };
        });
      },
      failUnconfirmedDeployments: () => {
        set((state) => ({
          deployments: state.deployments.map((t) =>
            FinalDeploymentStatuses.includes(t.status)
              ? t
              : { ...t, status: DeploymentStatus.Failed },
          ),
        }));
      },

      // Shared component state
      deploymentLoading: false,
      setDeploymentLoading: (isLoading) => {
        set(() => ({ deploymentLoading: isLoading }));
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
      name: 'app-state', // name in storage
      partialize: (state) => ({
        // fields to persist
        chainMetadataOverrides: state.chainMetadataOverrides,
        deployments: state.deployments,
      }),
      version: PERSIST_STATE_VERSION,
      onRehydrateStorage: () => {
        logger.debug('Rehydrating state');
        return (state, error) => {
          state?.failUnconfirmedDeployments();
          if (error || !state) {
            logger.error('Error during hydration', error);
            return;
          }
          initWarpContext(state.registry, state.chainMetadataOverrides).then(
            ({ registry, chainMetadata, multiProvider }) => {
              state.setContext({ registry, chainMetadata, multiProvider });
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
) {
  try {
    // Pre-load registry content to avoid repeated requests
    await registry.listRegistryContent();
    const { chainMetadata, chainMetadataWithOverrides } = await assembleChainMetadata(
      registry,
      storeMetadataOverrides,
    );
    const multiProvider = new MultiProtocolProvider(chainMetadataWithOverrides);
    return { registry, chainMetadata, multiProvider };
  } catch (error) {
    toast.error('Error initializing warp context. Please check connection status and configs.');
    logger.error('Error initializing warp context', error);
    return {
      registry,
      chainMetadata: {},
      multiProvider: new MultiProtocolProvider({}),
    };
  }
}
