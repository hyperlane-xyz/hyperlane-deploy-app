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
  return useStore((s) => ({
    deployments: s.deployments,
    addDeployment: s.addDeployment,
    updateDeploymentStatus: s.updateDeploymentStatus,
  }));
}
