import { AlertmanagerAlert } from 'types/alerting.types';
import {
  AttentionItem,
  Cluster,
  HealthInput,
  ProblemState,
} from 'types/home.types';
import { ServiceStatus } from 'types/services.types';
import {
  attributeAlert,
  hasFindings,
  indexClusters,
  recentFailedBackups,
  SEVERITY_RANK,
  severityFromLabels,
} from './health';

export const STARTED_TOGETHER_MS = 5 * 60_000;
export const COMMON_LABEL_KEYS = [
  'cluster',
  'environment',
  'region',
  'service_type',
];

const UNNAMED_ALERT = 'Unnamed alert';

interface AttentionOptions {
  includeUnattributed: boolean;
}

const distinct = (values: (string | undefined)[]): string[] => [
  ...new Set(values.filter((v): v is string => !!v)),
];

const earliest = (timestamps: string[]): string | undefined =>
  [...timestamps].sort((a, b) => Date.parse(a) - Date.parse(b))[0];

const commonLabels = (alerts: AlertmanagerAlert[]): Record<string, string> => {
  const shared: Record<string, string> = {};
  for (const key of COMMON_LABEL_KEYS) {
    const values = alerts.map((a) => a.labels[key]);
    if (values.every((v) => !!v && v === values[0])) {
      shared[key] = values[0];
    }
  }
  return shared;
};

const item = (
  id: string,
  kind: AttentionItem['kind'],
  severity: ProblemState,
  clusterKeys: string[],
  instances: number,
  extra: Partial<AttentionItem> = {}
): AttentionItem => ({
  id,
  kind,
  severity,
  clusterKeys,
  clusters: clusterKeys.length,
  instances,
  commonLabels: {},
  startedTogether: false,
  ...extra,
});

const alertItems = (
  clusters: Cluster[],
  alerts: AlertmanagerAlert[],
  opts: AttentionOptions
): AttentionItem[] => {
  const index = indexClusters(clusters);
  const byRule = new Map<
    string,
    { alert: AlertmanagerAlert; clusterKey?: string }[]
  >();

  for (const alert of alerts) {
    const clusterKey = attributeAlert(alert, index);
    if (!clusterKey && !opts.includeUnattributed) {
      continue;
    }
    const rule = alert.labels.alertname || UNNAMED_ALERT;
    byRule.set(rule, [...(byRule.get(rule) ?? []), { alert, clusterKey }]);
  }

  return [...byRule].map(([rule, entries]) => {
    const groupAlerts = entries.map((e) => e.alert);
    const starts = groupAlerts.map((a) => Date.parse(a.startsAt));
    const severity = groupAlerts
      .map((a) => severityFromLabels(a.labels))
      .reduce((worst, s) =>
        SEVERITY_RANK[s] > SEVERITY_RANK[worst] ? s : worst
      );

    return item(
      `alert:${rule}`,
      'alert',
      severity,
      distinct(entries.map((e) => e.clusterKey)),
      distinct(
        entries
          .filter((e) => e.clusterKey)
          .map((e) => e.alert.labels.service_name)
      ).length,
      {
        ruleName: rule,
        since: earliest(groupAlerts.map((a) => a.startsAt)),
        commonLabels: commonLabels(groupAlerts),
        startedTogether:
          groupAlerts.length > 1 &&
          Math.max(...starts) - Math.min(...starts) <= STARTED_TOGETHER_MS,
      }
    );
  });
};

const notReportingItem = (clusters: Cluster[]): AttentionItem[] => {
  const down = clusters.flatMap((c) =>
    c.services
      .filter((s) => s.status === ServiceStatus.down)
      .map(() => c.key)
  );
  return down.length
    ? [item('not-reporting', 'not-reporting', 'critical', distinct(down), down.length)]
    : [];
};

const backupItem = (
  clusters: Cluster[],
  input: HealthInput,
  now: Date
): AttentionItem[] => {
  const index = indexClusters(clusters);
  const failed = recentFailedBackups(input.artifacts, now).filter((a) =>
    index.byServiceId.has(a.serviceId)
  );
  if (!failed.length) {
    return [];
  }
  const locations = distinct(failed.map((a) => a.locationName));
  return [
    item(
      'backup',
      'backup',
      'warning',
      distinct(failed.map((a) => index.byServiceId.get(a.serviceId))),
      distinct(failed.map((a) => a.serviceId)).length,
      {
        since: earliest(failed.map((a) => a.createdAt)),
        location: locations.length === 1 ? locations[0] : undefined,
      }
    ),
  ];
};

const advisorItem = (
  clusters: Cluster[],
  input: HealthInput
): AttentionItem[] => {
  const index = indexClusters(clusters);
  const findings = input.failedServices.filter(
    (f) => hasFindings(f) && index.byServiceId.has(f.serviceId)
  );
  if (!findings.length) {
    return [];
  }
  return [
    item(
      'advisor',
      'advisor',
      'notice',
      distinct(findings.map((f) => index.byServiceId.get(f.serviceId))),
      distinct(findings.map((f) => f.serviceId)).length
    ),
  ];
};

export const buildAttention = (
  clusters: Cluster[],
  input: HealthInput,
  now: Date,
  opts: AttentionOptions
): AttentionItem[] =>
  [
    ...alertItems(clusters, input.alerts, opts),
    ...notReportingItem(clusters),
    ...backupItem(clusters, input, now),
    ...advisorItem(clusters, input),
  ].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      b.clusters - a.clusters ||
      sinceOrder(a) - sinceOrder(b)
  );

// Items without a start time sort after those with one.
const sinceOrder = (attention: AttentionItem): number =>
  attention.since ? Date.parse(attention.since) : Number.MAX_SAFE_INTEGER;

export const countFiringAlerts = (
  clusters: Cluster[],
  alerts: AlertmanagerAlert[],
  opts: AttentionOptions
): number => {
  const index = indexClusters(clusters);
  return alerts.filter(
    (a) => opts.includeUnattributed || attributeAlert(a, index) !== undefined
  ).length;
};
