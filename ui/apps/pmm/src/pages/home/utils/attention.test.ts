import { HealthInput } from 'types/home.types';
import { ServiceStatus } from 'types/services.types';
import { buildAttention, countFiringAlerts } from './attention';
import { buildClusters } from './clusters';
import { alert, artifact, NOW, summary, svc } from './test-fixtures';

const clusters = buildClusters(
  [
    svc({ serviceId: 'a1', serviceName: 'orders-1', cluster: 'orders' }),
    svc({ serviceId: 'a2', serviceName: 'orders-2', cluster: 'orders' }),
    svc({ serviceId: 'b1', serviceName: 'billing-1', cluster: 'billing' }),
    svc({
      serviceId: 'c1',
      serviceName: 'events-1',
      cluster: 'events',
      environment: 'staging',
      serviceType: 'mongodb',
    }),
  ],
  []
);
const EMPTY: HealthInput = { alerts: [], failedServices: [], artifacts: [] };
const ALL = { includeUnattributed: true };

describe('buildAttention', () => {
  it('groups alerts of one rule across clusters into one item', () => {
    const items = buildAttention(
      clusters,
      {
        ...EMPTY,
        alerts: [
          alert({ alertname: 'lag', service_name: 'orders-1' }, '2026-10-15T10:02:00Z'),
          alert({ alertname: 'lag', service_name: 'billing-1' }, '2026-10-15T10:00:00Z'),
        ],
      },
      NOW,
      ALL
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'alert:lag',
      kind: 'alert',
      ruleName: 'lag',
      clusters: 2,
      instances: 2,
      since: '2026-10-15T10:00:00Z',
    });
  });

  it('marks alerts started within 5 minutes as started together', () => {
    const [item] = buildAttention(
      clusters,
      {
        ...EMPTY,
        alerts: [
          alert({ alertname: 'lag', service_name: 'orders-1' }, '2026-10-15T10:00:00Z'),
          alert({ alertname: 'lag', service_name: 'billing-1' }, '2026-10-15T10:04:00Z'),
        ],
      },
      NOW,
      ALL
    );

    expect(item.startedTogether).toBe(true);
  });

  it('does not mark alerts 6 minutes apart as started together', () => {
    const [item] = buildAttention(
      clusters,
      {
        ...EMPTY,
        alerts: [
          alert({ alertname: 'lag', service_name: 'orders-1' }, '2026-10-15T10:00:00Z'),
          alert({ alertname: 'lag', service_name: 'billing-1' }, '2026-10-15T10:06:00Z'),
        ],
      },
      NOW,
      ALL
    );

    expect(item.startedTogether).toBe(false);
  });

  it('reports only labels every alert shares', () => {
    const [item] = buildAttention(
      clusters,
      {
        ...EMPTY,
        alerts: [
          alert({
            alertname: 'lag',
            service_name: 'orders-1',
            region: 'eu-west-1',
            environment: 'prod',
            service_type: 'mysql',
          }),
          alert({
            alertname: 'lag',
            service_name: 'events-1',
            region: 'eu-west-1',
            environment: 'staging',
            service_type: 'mysql',
          }),
        ],
      },
      NOW,
      ALL
    );

    expect(item.commonLabels).toEqual({
      region: 'eu-west-1',
      service_type: 'mysql',
    });
  });

  it('drops unattributed alerts when includeUnattributed is false', () => {
    expect(
      buildAttention(
        clusters,
        { ...EMPTY, alerts: [alert({ alertname: 'grafana_down' })] },
        NOW,
        { includeUnattributed: false }
      )
    ).toEqual([]);
  });

  it('counts unattributed alerts in their rule row with zero clusters', () => {
    const items = buildAttention(
      clusters,
      { ...EMPTY, alerts: [alert({ alertname: 'grafana_down' })] },
      NOW,
      ALL
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      ruleName: 'grafana_down',
      clusters: 0,
      instances: 0,
    });
  });

  it('adds a critical not-reporting item for down services only', () => {
    const scoped = buildClusters(
      [
        svc({ cluster: 'orders', status: ServiceStatus.down }),
        svc({ cluster: 'orders' }),
        svc({ cluster: 'billing', status: ServiceStatus.unknown }),
      ],
      []
    );

    expect(buildAttention(scoped, EMPTY, NOW, ALL)).toEqual([
      expect.objectContaining({
        id: 'not-reporting',
        kind: 'not-reporting',
        severity: 'critical',
        clusters: 1,
        instances: 1,
      }),
    ]);
  });

  it('adds a failed-backup item with the shared location', () => {
    const [item] = buildAttention(
      clusters,
      {
        ...EMPTY,
        artifacts: [
          artifact({ serviceId: 'a1', createdAt: '2026-10-15T02:00:00Z' }),
          artifact({ serviceId: 'b1', createdAt: '2026-10-15T01:00:00Z' }),
        ],
      },
      NOW,
      ALL
    );

    expect(item).toMatchObject({
      kind: 'backup',
      severity: 'warning',
      clusters: 2,
      location: 's3-main',
      since: '2026-10-15T01:00:00Z',
    });
  });

  it('omits the location when failed backups use different locations', () => {
    const [item] = buildAttention(
      clusters,
      {
        ...EMPTY,
        artifacts: [
          artifact({ serviceId: 'a1' }),
          artifact({ serviceId: 'b1', locationName: 'minio' }),
        ],
      },
      NOW,
      ALL
    );

    expect(item.location).toBeUndefined();
  });

  it('adds one notice item for advisor findings', () => {
    const items = buildAttention(
      clusters,
      {
        ...EMPTY,
        failedServices: [
          summary({ serviceId: 'a1', warningCount: 2 }),
          summary({ serviceId: 'c1', criticalCount: 1 }),
          summary({ serviceId: 'b1' }),
        ],
      },
      NOW,
      ALL
    );

    expect(items).toEqual([
      expect.objectContaining({
        kind: 'advisor',
        severity: 'notice',
        clusters: 2,
        instances: 2,
      }),
    ]);
  });

  it('orders by severity, then by clusters affected', () => {
    const items = buildAttention(
      clusters,
      {
        alerts: [
          alert({ alertname: 'warn-wide', service_name: 'orders-1', severity: 'warning' }),
          alert({ alertname: 'warn-wide', service_name: 'billing-1', severity: 'warning' }),
          alert({ alertname: 'crit', service_name: 'events-1', severity: 'critical' }),
        ],
        failedServices: [summary({ serviceId: 'a1', noticeCount: 1 })],
        artifacts: [artifact({ serviceId: 'c1' })],
      },
      NOW,
      ALL
    );

    expect(items.map((i) => i.id)).toEqual([
      'alert:crit',
      'alert:warn-wide',
      'backup',
      'advisor',
    ]);
  });
});

describe('countFiringAlerts', () => {
  it('counts firing alerts in scope, with and without unattributed ones', () => {
    const alerts = [
      alert({ alertname: 'lag', service_name: 'orders-1' }),
      alert({ alertname: 'lag', service_name: 'billing-1' }),
      alert({ alertname: 'grafana_down' }),
    ];

    expect(countFiringAlerts(clusters, alerts, ALL)).toBe(3);
    expect(
      countFiringAlerts(clusters, alerts, { includeUnattributed: false })
    ).toBe(2);
  });
});
