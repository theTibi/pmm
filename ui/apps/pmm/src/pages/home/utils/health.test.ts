import { BackupStatus } from 'types/backups.types';
import { HealthInput } from 'types/home.types';
import { ServiceStatus } from 'types/services.types';
import { buildClusters } from './clusters';
import {
  attributeAlert,
  computeStates,
  indexClusters,
  recentFailedBackups,
  severityFromLabels,
} from './health';
import { alert, artifact, NOW, summary, svc } from './test-fixtures';

const clusters = buildClusters(
  [
    svc({ serviceId: 'a1', serviceName: 'orders-1', cluster: 'orders' }),
    svc({ serviceId: 'a2', serviceName: 'orders-2', cluster: 'orders' }),
    svc({
      serviceId: 'b1',
      serviceName: 'orders-stg',
      cluster: 'orders',
      environment: 'staging',
    }),
    svc({
      serviceId: 'c1',
      serviceName: 'events-1',
      cluster: 'events',
      serviceType: 'mongodb',
    }),
  ],
  []
);
const index = indexClusters(clusters);
const keyOf = (name: string, environment = 'prod') =>
  clusters.find((c) => c.name === name && c.environment === environment)!.key;
const EMPTY: HealthInput = { alerts: [], failedServices: [], artifacts: [] };

describe('severityFromLabels', () => {
  it.each(['emergency', 'alert', 'critical'])('maps %s to critical', (s) => {
    expect(severityFromLabels({ severity: s })).toBe('critical');
  });

  it.each(['error', 'warning', undefined, 'whatever'])(
    'maps %s to warning',
    (s) => {
      const labels: Record<string, string> = s ? { severity: s } : {};
      expect(severityFromLabels(labels)).toBe('warning');
    }
  );

  it.each(['notice', 'info'])('maps %s to notice', (s) => {
    expect(severityFromLabels({ severity: s })).toBe('notice');
  });
});

describe('attributeAlert', () => {
  it('attributes an alert by service_name', () => {
    expect(
      attributeAlert(alert({ alertname: 'x', service_name: 'orders-2' }), index)
    ).toBe(keyOf('orders'));
  });

  it('attributes an alert by service_id', () => {
    expect(
      attributeAlert(alert({ alertname: 'backup_error', service_id: 'c1' }), index)
    ).toBe(keyOf('events'));
  });

  it('attributes a node alert to the one cluster on that node', () => {
    const onNodes = buildClusters(
      [
        svc({ serviceName: 'db-1', nodeName: 'host-a', cluster: 'shop' }),
        svc({ serviceName: 'db-2', nodeName: 'host-b', cluster: 'shop' }),
      ],
      []
    );

    expect(
      attributeAlert(
        alert({ alertname: 'node_high_cpu_load', node_name: 'host-b' }),
        indexClusters(onNodes)
      )
    ).toBe(onNodes[0].key);
  });

  it('does not attribute an alert without labels to a cluster on an unnamed node', () => {
    const unnamed = buildClusters([svc({ nodeName: '' })], []);

    expect(
      attributeAlert(alert({ alertname: 'grafana_down' }), indexClusters(unnamed))
    ).toBeUndefined();
  });

  it('leaves a node alert unattributed when the node hosts several clusters', () => {
    expect(
      attributeAlert(alert({ alertname: 'x', node_name: 'node-1' }), index)
    ).toBeUndefined();
  });

  it('attributes an alert by cluster label when service_name is missing', () => {
    expect(
      attributeAlert(alert({ alertname: 'x', cluster: 'events' }), index)
    ).toBe(keyOf('events'));
  });

  it('leaves a cluster-label alert unattributed when two environments share the name and the alert has no environment', () => {
    expect(
      attributeAlert(alert({ alertname: 'x', cluster: 'orders' }), index)
    ).toBeUndefined();
  });

  it('uses the environment label to pick between same-named clusters', () => {
    expect(
      attributeAlert(
        alert({ alertname: 'x', cluster: 'orders', environment: 'staging' }),
        index
      )
    ).toBe(keyOf('orders', 'staging'));
  });

  it('leaves PMM Server alerts unattributed', () => {
    expect(
      attributeAlert(alert({ alertname: 'grafana_down' }), index)
    ).toBeUndefined();
  });
});

describe('recentFailedBackups', () => {
  it('keeps only failed backups from the last 24 h', () => {
    const kept = recentFailedBackups(
      [
        artifact({ artifactId: 'ok', status: BackupStatus.Success }),
        artifact({ artifactId: 'old', createdAt: '2026-10-14T09:00:00Z' }),
        artifact({ artifactId: 'new' }),
      ],
      NOW
    );

    expect(kept.map((a) => a.artifactId)).toEqual(['new']);
  });
});

describe('computeStates', () => {
  it('marks a cluster with a down service critical', () => {
    const down = buildClusters(
      [svc({ cluster: 'orders', status: ServiceStatus.down })],
      []
    );

    expect(computeStates(down, EMPTY, NOW).get(down[0].key)).toBe('critical');
  });

  it('takes the worst condition: warning alert + advisor finding → warning', () => {
    const states = computeStates(
      clusters,
      {
        ...EMPTY,
        alerts: [
          alert({
            alertname: 'x',
            service_name: 'orders-1',
            severity: 'warning',
          }),
        ],
        failedServices: [summary({ serviceId: 'a2', noticeCount: 1 })],
      },
      NOW
    );

    expect(states.get(keyOf('orders'))).toBe('warning');
  });

  it('treats advisor findings as notice even when their checks are critical', () => {
    const states = computeStates(
      clusters,
      {
        ...EMPTY,
        failedServices: [summary({ serviceId: 'c1', criticalCount: 3 })],
      },
      NOW
    );

    expect(states.get(keyOf('events'))).toBe('notice');
  });

  it('marks a cluster with a failed backup warning', () => {
    const states = computeStates(
      clusters,
      { ...EMPTY, artifacts: [artifact({ serviceId: 'a1' })] },
      NOW
    );

    expect(states.get(keyOf('orders'))).toBe('warning');
  });

  it('leaves clusters healthy when an alert is unattributed', () => {
    const states = computeStates(
      clusters,
      {
        ...EMPTY,
        alerts: [alert({ alertname: 'grafana_down', severity: 'critical' })],
      },
      NOW
    );

    expect([...states.values()]).toEqual(['healthy', 'healthy', 'healthy']);
  });
});
