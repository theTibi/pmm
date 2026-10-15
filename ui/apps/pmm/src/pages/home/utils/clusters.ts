import { Cluster, HomeService } from 'types/home.types';
import { ManagedNode } from 'types/nodes.types';
import { ManagedService } from 'types/services.types';

// PMM Server's own database; the backend leaves it out of user services too.
const PMM_SERVER_POSTGRESQL = 'pmm-server-postgresql';

const TECHNOLOGY_LABELS: Record<string, string> = {
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  postgresql: 'PostgreSQL',
  proxysql: 'ProxySQL',
  haproxy: 'HAProxy',
  valkey: 'Valkey',
  external: 'External',
};

export const technologyLabel = (type: string): string =>
  TECHNOLOGY_LABELS[type] ?? type;

// Most frequent non-empty value; ties go to the alphabetically first one.
const mostCommon = (values: string[]): string => {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  let best = '';
  let bestCount = 0;
  const sorted = [...counts].sort(([a], [b]) => a.localeCompare(b));
  for (const [value, count] of sorted) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
};

const clusterIdentity = (service: ManagedService) => {
  const environment = service.environment ?? '';
  if (service.cluster) {
    return {
      key: `${environment}|c:${service.cluster}`,
      name: service.cluster,
    };
  }
  if (service.replicationSet) {
    return {
      key: `${environment}|rs:${service.replicationSet}`,
      name: service.replicationSet,
    };
  }
  return {
    key: `${environment}|s:${service.serviceId}`,
    name: service.serviceName,
  };
};

export const buildClusters = (
  services: ManagedService[],
  nodes: ManagedNode[]
): Cluster[] => {
  const regions = new Map(nodes.map((n) => [n.nodeId, n.region ?? '']));
  const groups = new Map<string, { name: string; services: HomeService[] }>();

  for (const service of services) {
    if (service.serviceName === PMM_SERVER_POSTGRESQL) {
      continue;
    }
    const { key, name } = clusterIdentity(service);
    const group = groups.get(key) ?? { name, services: [] };
    group.services.push({
      id: service.serviceId,
      name: service.serviceName,
      type: service.serviceType,
      node: service.nodeName ?? '',
      environment: service.environment ?? '',
      region: regions.get(service.nodeId) ?? '',
      app: service.customLabels?.app ?? '',
      status: service.status,
    });
    groups.set(key, group);
  }

  return [...groups]
    .map(([key, { name, services: members }]) => ({
      key,
      name,
      technology: mostCommon(members.map((s) => s.type)),
      environment: members[0].environment,
      region: mostCommon(members.map((s) => s.region)),
      app: mostCommon(members.map((s) => s.app)),
      services: members,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
