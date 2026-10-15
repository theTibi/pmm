import { CheckResultSummary } from './advisors.types';
import { AlertmanagerAlert } from './alerting.types';
import { BackupArtifact } from './backups.types';
import { ServiceStatus } from './services.types';

export type ClusterState = 'critical' | 'warning' | 'notice' | 'healthy';

export type ProblemState = Exclude<ClusterState, 'healthy'>;

export type FleetDimension =
  | 'technology'
  | 'environment'
  | 'region'
  | 'application';

export type HomeScope = Partial<Record<FleetDimension, string>>;

export type HomeSource =
  | 'services'
  | 'nodes'
  | 'alerts'
  | 'rules'
  | 'advisors'
  | 'backups';

export interface HomeService {
  id: string;
  name: string;
  type: string;
  environment: string;
  region: string;
  app: string;
  status?: ServiceStatus;
}

export interface Cluster {
  key: string;
  name: string;
  technology: string;
  environment: string;
  region: string;
  app: string;
  services: HomeService[];
}

export interface HealthInput {
  alerts: AlertmanagerAlert[];
  failedServices: CheckResultSummary[];
  artifacts: BackupArtifact[];
}

export type AttentionKind = 'alert' | 'not-reporting' | 'backup' | 'advisor';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: ProblemState;
  ruleName?: string;
  clusterKeys: string[];
  clusters: number;
  instances: number;
  since?: string;
  commonLabels: Record<string, string>;
  startedTogether: boolean;
  location?: string;
}

export interface FleetRow {
  name: string;
  clusters: number;
  instances: number;
  counts: Record<ClusterState, number>;
  topIssue?: AttentionItem;
  folded: number;
}

export interface HomeSummary {
  clusters: number;
  counts: Record<ClusterState, number>;
  instances: number;
  instancesReporting: number;
}

export interface HomeChecks {
  alertRules: number | null;
  firing: number | null;
  advisorServices: number | null;
  backups: { total: number; ok: number } | null;
}
