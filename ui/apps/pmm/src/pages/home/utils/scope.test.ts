import { buildClusters } from './clusters';
import { applyScope, groupValue, isScoped, scopeOptions } from './scope';
import { node, svc } from './test-fixtures';

const clusters = buildClusters(
  [
    svc({ cluster: 'orders', nodeId: 'n1', customLabels: { app: 'shop' } }),
    svc({ cluster: 'events', serviceType: 'mongodb', nodeId: 'n2' }),
    svc({ cluster: 'reports', environment: 'staging', nodeId: 'n1' }),
  ],
  [
    node({ nodeId: 'n1', region: 'eu-west-1' }),
    node({ nodeId: 'n2', region: 'us-east-1' }),
  ]
);
const names = (list: typeof clusters) => list.map((c) => c.name);

describe('scope', () => {
  it('reads the value of each dimension from a cluster', () => {
    const orders = clusters.find((c) => c.name === 'orders')!;

    expect(groupValue(orders, 'technology')).toBe('mysql');
    expect(groupValue(orders, 'environment')).toBe('prod');
    expect(groupValue(orders, 'region')).toBe('eu-west-1');
    expect(groupValue(orders, 'application')).toBe('shop');
  });

  it('filters by one dimension and by several together', () => {
    expect(names(applyScope(clusters, { environment: 'prod' }))).toEqual([
      'events',
      'orders',
    ]);
    expect(
      names(applyScope(clusters, { environment: 'prod', region: 'eu-west-1' }))
    ).toEqual(['orders']);
    expect(names(applyScope(clusters, {}))).toEqual(names(clusters));
  });

  it('lists distinct, sorted, non-empty values per dimension', () => {
    expect(scopeOptions(clusters)).toEqual({
      technology: ['mongodb', 'mysql'],
      environment: ['prod', 'staging'],
      region: ['eu-west-1', 'us-east-1'],
      application: ['shop'],
    });
  });

  it('is unscoped when every value is empty', () => {
    expect(isScoped({})).toBe(false);
    expect(isScoped({ environment: '' })).toBe(false);
    expect(isScoped({ region: 'eu-west-1' })).toBe(true);
  });
});
