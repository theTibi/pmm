import { CheckResultSummary } from 'types/advisors.types';
import { AlertmanagerAlert } from 'types/alerting.types';
import { BackupArtifact, BackupStatus } from 'types/backups.types';
import { ManagedNode } from 'types/nodes.types';
import { ManagedService, ServiceStatus } from 'types/services.types';

export const NOW = new Date('2026-10-15T10:08:00Z');

let serviceSeq = 0;

export const svc = (over: Partial<ManagedService> = {}): ManagedService => {
  serviceSeq += 1;
  return {
    serviceId: `svc-${serviceSeq}`,
    serviceType: 'mysql',
    serviceName: `service-${serviceSeq}`,
    databaseName: '',
    nodeId: 'node-1',
    nodeName: 'node-1',
    environment: 'prod',
    cluster: '',
    replicationSet: '',
    customLabels: {},
    externalGroup: '',
    address: '',
    port: 0,
    socket: '',
    version: '',
    status: ServiceStatus.up,
    ...over,
  };
};

export const node = (over: Partial<ManagedNode> = {}): ManagedNode => ({
  nodeId: 'node-1',
  nodeName: 'node-1',
  region: '',
  ...over,
});

export const alert = (
  labels: Record<string, string>,
  startsAt = '2026-10-15T10:00:00Z'
): AlertmanagerAlert => ({
  labels,
  annotations: {},
  startsAt,
  endsAt: '',
  updatedAt: startsAt,
  fingerprint: JSON.stringify(labels) + startsAt,
  status: { state: 'active', silencedBy: [], inhibitedBy: [] },
});

export const artifact = (
  over: Partial<BackupArtifact> = {}
): BackupArtifact => ({
  artifactId: 'artifact-1',
  serviceId: 'svc-1',
  serviceName: 'service-1',
  locationName: 's3-main',
  status: BackupStatus.Error,
  createdAt: '2026-10-15T02:00:00Z',
  ...over,
});

export const summary = (
  over: Partial<CheckResultSummary> = {}
): CheckResultSummary => ({
  serviceId: 'svc-1',
  serviceName: 'service-1',
  emergencyCount: 0,
  alertCount: 0,
  criticalCount: 0,
  errorCount: 0,
  warningCount: 0,
  noticeCount: 0,
  infoCount: 0,
  debugCount: 0,
  ...over,
});
