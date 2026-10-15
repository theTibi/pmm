import { CheckResultSummary } from 'types/advisors.types';
import { PrometheusAlertRulesResponse } from 'types/alerting.types';
import { BackupArtifact, BackupStatus } from 'types/backups.types';
import {
  Cluster,
  ClusterState,
  HomeChecks,
  HomeSummary,
} from 'types/home.types';
import { ServiceStatus } from 'types/services.types';
import { hasFindings } from './health';

const BACKUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export const buildSummary = (
  clusters: Cluster[],
  states: Map<string, ClusterState>
): HomeSummary => {
  const counts: Record<ClusterState, number> = {
    critical: 0,
    warning: 0,
    notice: 0,
    healthy: 0,
  };
  for (const cluster of clusters) {
    counts[states.get(cluster.key) ?? 'healthy'] += 1;
  }
  const services = clusters.flatMap((c) => c.services);

  return {
    clusters: clusters.length,
    counts,
    instances: services.length,
    instancesReporting: services.filter((s) => s.status === ServiceStatus.up)
      .length,
  };
};

interface ChecksInput {
  rules?: PrometheusAlertRulesResponse;
  firing?: number;
  failedServices?: CheckResultSummary[];
  artifacts?: BackupArtifact[];
}

export const buildChecks = (input: ChecksInput, now: Date): HomeChecks => {
  const recent = input.artifacts?.filter(
    (a) => now.getTime() - Date.parse(a.createdAt) <= BACKUP_WINDOW_MS
  );

  return {
    alertRules: input.rules
      ? input.rules.data.groups
          .flatMap((g) => g.rules)
          .filter((r) => r.type !== 'recording').length
      : null,
    firing: input.firing ?? null,
    advisorServices: input.failedServices
      ? input.failedServices.filter(hasFindings).length
      : null,
    backups: recent
      ? {
          total: recent.length,
          ok: recent.filter((a) => a.status === BackupStatus.Success).length,
        }
      : null,
  };
};
