import { useManagedServices } from 'hooks/api/useServices';
import { useManagedNodes } from 'hooks/api/useManagedNodes';
import { useActiveAlerts } from 'hooks/api/useAlertmanagerAlerts';
import { usePrometheusAlertRules } from 'hooks/api/usePrometheusAlertRules';
import { useFailedServices } from 'hooks/api/useAdvisors';
import { useBackupArtifacts } from 'hooks/api/useBackupArtifacts';
import { HomeSource } from 'types/home.types';
import { HOME_REFRESH_MS } from './HomePage.constants';

const options = { refetchInterval: HOME_REFRESH_MS };

interface HomeFeatures {
  advisors: boolean;
  backups: boolean;
}

export const useHomeData = (features: HomeFeatures) => {
  const services = useManagedServices({}, options);
  const nodes = useManagedNodes(options);
  const alerts = useActiveAlerts(options);
  const rules = usePrometheusAlertRules(options);
  const advisors = useFailedServices({
    ...options,
    enabled: features.advisors,
  });
  const backups = useBackupArtifacts({ ...options, enabled: features.backups });

  const sources: Record<HomeSource, { isError: boolean; isLoading: boolean }> =
    { services, nodes, alerts, rules, advisors, backups };
  const where = (match: (source: HomeSource) => boolean) =>
    (Object.keys(sources) as HomeSource[]).filter(match);

  return {
    services: services.data?.services,
    nodes: nodes.data,
    alerts: alerts.data,
    rules: rules.data,
    failedServices: advisors.data,
    artifacts: backups.data,
    isLoading: services.isLoading,
    // Changes on every refresh, even when the data does not.
    updatedAt: services.dataUpdatedAt,
    failed: where((source) => sources[source].isError),
    pending: where((source) => sources[source].isLoading),
    off: where(
      (source) =>
        (source === 'advisors' && !features.advisors) ||
        (source === 'backups' && !features.backups)
    ),
  };
};
