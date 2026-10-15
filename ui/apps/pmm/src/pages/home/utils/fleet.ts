import {
  AttentionItem,
  Cluster,
  ClusterState,
  FleetDimension,
  FleetRow,
} from 'types/home.types';
import { groupValue } from './scope';

export const MAX_FLEET_ROWS = 6;

const emptyCounts = (): Record<ClusterState, number> => ({
  critical: 0,
  warning: 0,
  notice: 0,
  healthy: 0,
});

const compareRows = (a: FleetRow, b: FleetRow): number =>
  b.counts.critical - a.counts.critical ||
  b.counts.warning - a.counts.warning ||
  b.counts.notice - a.counts.notice ||
  Number(a.name === '') - Number(b.name === '') ||
  a.name.localeCompare(b.name);

const foldRows = (rows: FleetRow[]): FleetRow => {
  const counts = emptyCounts();
  for (const row of rows) {
    for (const state of Object.keys(counts) as ClusterState[]) {
      counts[state] += row.counts[state];
    }
  }
  return {
    name: '',
    clusters: rows.reduce((sum, r) => sum + r.clusters, 0),
    instances: rows.reduce((sum, r) => sum + r.instances, 0),
    counts,
    folded: rows.length,
  };
};

export const buildFleetRows = (
  clusters: Cluster[],
  states: Map<string, ClusterState>,
  attention: AttentionItem[],
  by: FleetDimension
): FleetRow[] => {
  const groups = new Map<string, Cluster[]>();
  for (const cluster of clusters) {
    const name = groupValue(cluster, by);
    groups.set(name, [...(groups.get(name) ?? []), cluster]);
  }

  const rows = [...groups].map(([name, members]): FleetRow => {
    const counts = emptyCounts();
    for (const cluster of members) {
      counts[states.get(cluster.key) ?? 'healthy'] += 1;
    }
    const keys = new Set(members.map((c) => c.key));
    return {
      name,
      clusters: members.length,
      instances: members.reduce((sum, c) => sum + c.services.length, 0),
      counts,
      // `attention` arrives worst first, so the first match is the top issue.
      topIssue: attention.find((a) => a.clusterKeys.some((k) => keys.has(k))),
      folded: 0,
    };
  });

  rows.sort(compareRows);
  if (rows.length <= MAX_FLEET_ROWS) {
    return rows;
  }
  return [
    ...rows.slice(0, MAX_FLEET_ROWS - 1),
    foldRows(rows.slice(MAX_FLEET_ROWS - 1)),
  ];
};
