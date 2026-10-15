import { BackupStatus } from 'types/backups.types';
import { ClusterState } from 'types/home.types';
import { ServiceStatus } from 'types/services.types';
import { PrometheusAlertRulesResponse } from 'types/alerting.types';
import { buildClusters } from './clusters';
import { buildChecks, buildSummary } from './summary';
import { artifact, NOW, summary, svc } from './test-fixtures';

describe('buildSummary', () => {
  it('counts clusters per state and instances reporting', () => {
    const clusters = buildClusters(
      [
        svc({ cluster: 'orders', status: ServiceStatus.up }),
        svc({ cluster: 'orders', status: ServiceStatus.unknown }),
        svc({ cluster: 'events' }),
      ],
      []
    );
    const states = new Map<string, ClusterState>([
      [clusters[0].key, 'healthy'],
      [clusters[1].key, 'warning'],
    ]);

    expect(buildSummary(clusters, states)).toEqual({
      clusters: 2,
      counts: { critical: 0, warning: 1, notice: 0, healthy: 1 },
      instances: 3,
      instancesReporting: 2,
    });
  });

  it('reports zero clusters and instances for an empty fleet', () => {
    expect(buildSummary([], new Map())).toEqual({
      clusters: 0,
      counts: { critical: 0, warning: 0, notice: 0, healthy: 0 },
      instances: 0,
      instancesReporting: 0,
    });
  });
});

describe('buildChecks', () => {
  const rules: PrometheusAlertRulesResponse = {
    data: {
      groups: [
        {
          rules: [
            { name: 'a', type: 'alerting', alerts: [] },
            { name: 'r', type: 'recording', alerts: [] },
          ],
        },
        { rules: [{ name: 'b', type: 'alerting', alerts: [] }] },
      ],
    },
  };

  it('counts alerting rules only', () => {
    expect(buildChecks({ rules }, NOW).alertRules).toBe(2);
  });

  it('returns null for every source that is missing', () => {
    expect(buildChecks({}, NOW)).toEqual({
      alertRules: null,
      firing: null,
      advisorServices: null,
      backups: null,
    });
  });

  it('passes the firing count through and counts services with findings', () => {
    const checks = buildChecks(
      {
        firing: 4,
        failedServices: [
          summary({ serviceId: 'a', warningCount: 1 }),
          summary({ serviceId: 'b' }),
        ],
      },
      NOW
    );

    expect(checks.firing).toBe(4);
    expect(checks.advisorServices).toBe(1);
  });

  it('counts backups from the last 24 h and how many succeeded', () => {
    const checks = buildChecks(
      {
        artifacts: [
          artifact({ status: BackupStatus.Success }),
          artifact({ status: BackupStatus.Success }),
          artifact({ status: BackupStatus.Error }),
          artifact({ status: BackupStatus.Success, createdAt: '2026-10-13T02:00:00Z' }),
        ],
      },
      NOW
    );

    expect(checks.backups).toEqual({ total: 3, ok: 2 });
  });
});
