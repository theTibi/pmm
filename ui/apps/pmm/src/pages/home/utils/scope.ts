import { Cluster, FleetDimension, HomeScope } from 'types/home.types';

export const FLEET_DIMENSIONS: FleetDimension[] = [
  'technology',
  'environment',
  'region',
  'application',
];

export const groupValue = (cluster: Cluster, by: FleetDimension): string => {
  switch (by) {
    case 'technology':
      return cluster.technology;
    case 'environment':
      return cluster.environment;
    case 'region':
      return cluster.region;
    case 'application':
      return cluster.app;
  }
};

export const isScoped = (scope: HomeScope): boolean =>
  FLEET_DIMENSIONS.some((dimension) => !!scope[dimension]);

export const applyScope = (clusters: Cluster[], scope: HomeScope): Cluster[] =>
  clusters.filter((cluster) =>
    FLEET_DIMENSIONS.every(
      (dimension) =>
        !scope[dimension] || groupValue(cluster, dimension) === scope[dimension]
    )
  );

export const scopeOptions = (
  clusters: Cluster[]
): Record<FleetDimension, string[]> => {
  const values = (dimension: FleetDimension) =>
    [...new Set(clusters.map((c) => groupValue(c, dimension)))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

  return {
    technology: values('technology'),
    environment: values('environment'),
    region: values('region'),
    application: values('application'),
  };
};
