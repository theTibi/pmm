import { ClusterState, ProblemState } from 'types/home.types';

// Colour only means a problem: healthy stays neutral.
export const STATE_COLORS: Record<ClusterState, string> = {
  critical: 'error.main',
  warning: 'warning.main',
  notice: 'info.main',
  healthy: 'action.disabled',
};

export const CHIP_COLORS: Record<ProblemState, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  notice: 'info',
};
