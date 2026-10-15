import { CheckResultSummary } from 'types/advisors.types';
import { AlertmanagerAlert } from 'types/alerting.types';
import { BackupArtifact, BackupStatus } from 'types/backups.types';
import {
  Cluster,
  ClusterState,
  HealthInput,
  ProblemState,
} from 'types/home.types';
import { ServiceStatus } from 'types/services.types';

export const SEVERITY_RANK: Record<ClusterState, number> = {
  critical: 3,
  warning: 2,
  notice: 1,
  healthy: 0,
};

const BACKUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const CRITICAL_SEVERITIES = new Set(['emergency', 'alert', 'critical']);
const NOTICE_SEVERITIES = new Set(['notice', 'info']);

export interface ClusterIndex {
  byServiceName: Map<string, string>;
  byServiceId: Map<string, string>;
  byClusterName: Map<string, Cluster[]>;
}

export const severityFromLabels = (
  labels: Record<string, string>
): ProblemState => {
  const severity = labels.severity?.toLowerCase() ?? '';
  if (CRITICAL_SEVERITIES.has(severity)) {
    return 'critical';
  }
  if (NOTICE_SEVERITIES.has(severity)) {
    return 'notice';
  }
  return 'warning';
};

export const indexClusters = (clusters: Cluster[]): ClusterIndex => {
  const index: ClusterIndex = {
    byServiceName: new Map(),
    byServiceId: new Map(),
    byClusterName: new Map(),
  };

  for (const cluster of clusters) {
    for (const service of cluster.services) {
      index.byServiceName.set(service.name, cluster.key);
      index.byServiceId.set(service.id, cluster.key);
    }
    // Alerts carry the services' `cluster` label, so only clusters built from it can match.
    if (cluster.key.includes('|c:')) {
      const sameName = index.byClusterName.get(cluster.name) ?? [];
      index.byClusterName.set(cluster.name, [...sameName, cluster]);
    }
  }
  return index;
};

export const attributeAlert = (
  alert: AlertmanagerAlert,
  index: ClusterIndex
): string | undefined => {
  const byService = index.byServiceName.get(alert.labels.service_name ?? '');
  if (byService) {
    return byService;
  }

  const clusterName = alert.labels.cluster;
  if (!clusterName) {
    return undefined;
  }
  const environment = alert.labels.environment;
  const candidates = (index.byClusterName.get(clusterName) ?? []).filter(
    (c) => !environment || c.environment === environment
  );
  return candidates.length === 1 ? candidates[0].key : undefined;
};

export const recentFailedBackups = (
  artifacts: BackupArtifact[],
  now: Date
): BackupArtifact[] =>
  artifacts.filter(
    (a) =>
      a.status === BackupStatus.Error &&
      now.getTime() - Date.parse(a.createdAt) <= BACKUP_WINDOW_MS
  );

export const hasFindings = (summary: CheckResultSummary): boolean =>
  summary.emergencyCount +
    summary.alertCount +
    summary.criticalCount +
    summary.errorCount +
    summary.warningCount +
    summary.noticeCount +
    summary.infoCount +
    summary.debugCount >
  0;

export const computeStates = (
  clusters: Cluster[],
  input: HealthInput,
  now: Date
): Map<string, ClusterState> => {
  const index = indexClusters(clusters);
  const states = new Map<string, ClusterState>(
    clusters.map((c) => [c.key, 'healthy'])
  );
  const raise = (key: string | undefined, state: ProblemState) => {
    const current = key ? states.get(key) : undefined;
    if (key && current && SEVERITY_RANK[state] > SEVERITY_RANK[current]) {
      states.set(key, state);
    }
  };

  for (const cluster of clusters) {
    if (cluster.services.some((s) => s.status === ServiceStatus.down)) {
      raise(cluster.key, 'critical');
    }
  }
  for (const alert of input.alerts) {
    raise(attributeAlert(alert, index), severityFromLabels(alert.labels));
  }
  for (const backup of recentFailedBackups(input.artifacts, now)) {
    raise(index.byServiceId.get(backup.serviceId), 'warning');
  }
  for (const finding of input.failedServices) {
    if (hasFindings(finding)) {
      raise(index.byServiceId.get(finding.serviceId), 'notice');
    }
  }
  return states;
};
