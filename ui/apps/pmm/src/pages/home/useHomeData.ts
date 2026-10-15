import { useManagedServices } from 'hooks/api/useServices';
import { useManagedNodes } from 'hooks/api/useManagedNodes';
import { useActiveAlerts } from 'hooks/api/useAlertmanagerAlerts';
import { usePrometheusAlertRules } from 'hooks/api/usePrometheusAlertRules';
import { useFailedServices } from 'hooks/api/useAdvisors';
import { useBackupArtifacts } from 'hooks/api/useBackupArtifacts';
import { HomeSource } from 'types/home.types';
import { HOME_REFRESH_MS } from './HomePage.constants';

const options = { refetchInterval: HOME_REFRESH_MS };

export const useHomeData = () => {
  const services = useManagedServices({}, options);
  const nodes = useManagedNodes(options);
  const alerts = useActiveAlerts(options);
  const rules = usePrometheusAlertRules(options);
  const advisors = useFailedServices(options);
  const backups = useBackupArtifacts(options);

  const sources: Record<HomeSource, { isError: boolean }> = {
    services,
    nodes,
    alerts,
    rules,
    advisors,
    backups,
  };

  return {
    services: services.data?.services,
    nodes: nodes.data,
    alerts: alerts.data,
    rules: rules.data,
    failedServices: advisors.data,
    artifacts: backups.data,
    isLoading: services.isLoading,
    failed: (Object.keys(sources) as HomeSource[]).filter(
      (source) => sources[source].isError
    ),
  };
};
