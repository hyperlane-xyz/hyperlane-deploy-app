import { useMemo } from 'react';
import { useStore } from '../store';
import { DeploymentType } from './types';

export function useDeploymentConfig() {
  return useStore((s) => ({
    deploymentConfig: s.deploymentConfig,
    setDeploymentConfig: s.setDeploymentConfig,
  }));
}

export function useWarpDeploymentConfig() {
  const { deploymentConfig, setDeploymentConfig } = useDeploymentConfig();
  const warpConfig = deploymentConfig?.type === DeploymentType.Warp ? deploymentConfig : undefined;
  return { deploymentConfig: warpConfig, setDeploymentConfig };
}

export function useCoreDeploymentConfig() {
  const { deploymentConfig, setDeploymentConfig } = useDeploymentConfig();
  const warpConfig = deploymentConfig?.type === DeploymentType.Core ? deploymentConfig : undefined;
  return { deploymentConfig: warpConfig, setDeploymentConfig };
}

export function useDeploymentHistory() {
  const state = useStore((s) => ({
    deployments: s.deployments,
    addDeployment: s.addDeployment,
    updateDeploymentStatus: s.updateDeploymentStatus,
  }));
  return {
    ...state,
    currentIndex: state.deployments.length - 1,
  };
}

export function useDeploymentChains() {
  const { deployments } = useDeploymentHistory();
  return useMemo<ChainName[]>(
    () => Array.from(new Set(deployments.map((d) => d.config.chains).flat())),
    [deployments],
  );
}
