import { buildClusters, technologyLabel } from './clusters';
import { node, svc } from './test-fixtures';

describe('buildClusters', () => {
  it('groups services that share a cluster in one environment', () => {
    const [cluster, ...rest] = buildClusters(
      [
        svc({ serviceId: 'a', cluster: 'orders' }),
        svc({ serviceId: 'b', cluster: 'orders' }),
      ],
      []
    );

    expect(rest).toHaveLength(0);
    expect(cluster.name).toBe('orders');
    expect(cluster.services.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('keeps the same cluster name in different environments apart', () => {
    const clusters = buildClusters(
      [
        svc({ cluster: 'orders' }),
        svc({ cluster: 'orders', environment: 'staging' }),
      ],
      []
    );

    expect(clusters).toHaveLength(2);
    expect(clusters.map((c) => c.environment).sort()).toEqual([
      'prod',
      'staging',
    ]);
  });

  it('falls back to the replication set, then to the service alone', () => {
    const clusters = buildClusters(
      [
        svc({ replicationSet: 'rs0' }),
        svc({ replicationSet: 'rs0' }),
        svc({ serviceName: 'lonely-db' }),
      ],
      []
    );

    expect(clusters.map((c) => [c.name, c.services.length])).toEqual([
      ['lonely-db', 1],
      ['rs0', 2],
    ]);
  });

  it('takes region from the node and application from the app label', () => {
    const [cluster] = buildClusters(
      [svc({ nodeId: 'n1', customLabels: { app: 'shop' } })],
      [node({ nodeId: 'n1', region: 'eu-west-1' })]
    );

    expect(cluster.region).toBe('eu-west-1');
    expect(cluster.app).toBe('shop');
    expect(cluster.services[0]).toMatchObject({
      region: 'eu-west-1',
      app: 'shop',
    });
  });

  it('uses the most common service type as technology', () => {
    const [cluster] = buildClusters(
      [
        svc({ cluster: 'c', serviceType: 'proxysql' }),
        svc({ cluster: 'c', serviceType: 'mysql' }),
        svc({ cluster: 'c', serviceType: 'mysql' }),
      ],
      []
    );

    expect(cluster.technology).toBe('mysql');
  });

  it('leaves region and application empty when nothing sets them', () => {
    const [cluster] = buildClusters([svc()], []);

    expect(cluster.region).toBe('');
    expect(cluster.app).toBe('');
  });
});

describe('technologyLabel', () => {
  it('labels technologies for display', () => {
    expect(technologyLabel('postgresql')).toBe('PostgreSQL');
    expect(technologyLabel('mongodb')).toBe('MongoDB');
    expect(technologyLabel('foo')).toBe('foo');
  });
});
