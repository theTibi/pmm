import { AttentionItem, ClusterState } from 'types/home.types';
import { buildClusters } from './clusters';
import { buildFleetRows, MAX_FLEET_ROWS } from './fleet';
import { node, svc } from './test-fixtures';

const clusters = buildClusters(
  [
    svc({ cluster: 'orders' }),
    svc({ cluster: 'orders' }),
    svc({ cluster: 'billing' }),
    svc({ cluster: 'events', serviceType: 'mongodb' }),
  ],
  []
);
const keyOf = (name: string) => clusters.find((c) => c.name === name)!.key;
const states = new Map<string, ClusterState>([
  [keyOf('orders'), 'critical'],
  [keyOf('billing'), 'healthy'],
  [keyOf('events'), 'warning'],
]);
const attentionFor = (
  id: string,
  clusterKeys: string[],
  severity: AttentionItem['severity']
): AttentionItem => ({
  id,
  kind: 'alert',
  severity,
  ruleName: id,
  clusterKeys,
  clusters: clusterKeys.length,
  instances: clusterKeys.length,
  commonLabels: {},
  startedTogether: false,
});

describe('buildFleetRows', () => {
  it('rolls clusters up by technology with counts per state', () => {
    const rows = buildFleetRows(clusters, states, [], 'technology');

    expect(rows).toEqual([
      expect.objectContaining({
        name: 'mysql',
        clusters: 2,
        instances: 3,
        counts: { critical: 1, warning: 0, notice: 0, healthy: 1 },
        folded: 0,
      }),
      expect.objectContaining({
        name: 'mongodb',
        clusters: 1,
        instances: 1,
        counts: { critical: 0, warning: 1, notice: 0, healthy: 0 },
      }),
    ]);
  });

  it('orders groups worst first, then by name, empty name last', () => {
    const regional = buildClusters(
      [
        svc({ cluster: 'a', nodeId: 'none' }),
        svc({ cluster: 'b', nodeId: 'us' }),
        svc({ cluster: 'c', nodeId: 'eu' }),
      ],
      [
        node({ nodeId: 'us', region: 'us-east-1' }),
        node({ nodeId: 'eu', region: 'eu-west-1' }),
      ]
    );
    const healthy = new Map<string, ClusterState>(
      regional.map((c) => [c.key, 'healthy'])
    );

    expect(
      buildFleetRows(regional, healthy, [], 'region').map((r) => r.name)
    ).toEqual(['eu-west-1', 'us-east-1', '']);
  });

  it('folds groups beyond 6 into one row', () => {
    const eight = buildClusters(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((t) =>
        svc({ cluster: t, serviceType: t })
      ),
      []
    );
    const healthy = new Map<string, ClusterState>(
      eight.map((c) => [c.key, 'healthy'])
    );

    const rows = buildFleetRows(eight, healthy, [], 'technology');

    expect(MAX_FLEET_ROWS).toBe(6);
    expect(rows).toHaveLength(6);
    expect(rows.slice(0, 5).map((r) => r.name)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
    expect(rows[5]).toMatchObject({
      name: '',
      folded: 3,
      clusters: 3,
      instances: 3,
      counts: { critical: 0, warning: 0, notice: 0, healthy: 3 },
    });
    expect(rows[5].topIssue).toBeUndefined();
  });

  it('picks the most severe attention item touching the group as top issue', () => {
    const critical = attentionFor('crit', [keyOf('orders')], 'critical');
    const warning = attentionFor(
      'warn',
      [keyOf('events'), keyOf('billing')],
      'warning'
    );

    const rows = buildFleetRows(
      clusters,
      states,
      [critical, warning],
      'technology'
    );

    expect(rows.find((r) => r.name === 'mysql')?.topIssue?.id).toBe('crit');
    expect(rows.find((r) => r.name === 'mongodb')?.topIssue?.id).toBe('warn');
  });
});
