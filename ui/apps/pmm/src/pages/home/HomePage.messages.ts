import { format } from 'date-fns';
import {
  AttentionItem,
  AttentionKind,
  FleetDimension,
  HomeSource,
  ProblemState,
} from 'types/home.types';

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

const unknown = 'unknown';

const SOURCE_NAMES: Record<HomeSource, string> = {
  services: 'services',
  nodes: 'regions',
  alerts: 'alerts',
  rules: 'alert rules',
  advisors: 'Advisor results',
  backups: 'backups',
};

const MINUTE_MS = 60_000;

// "28m", "11h 2m" or "3d 4h": compact enough for a fixed-width column.
const shortAge = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / MINUTE_MS));
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
};

const listOf = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
    : items.join('');

export const Messages = {
  pageTitle: 'Home',
  allClear: 'All clear',
  noKnownProblems: 'No known problems',
  noDatabases: 'No databases monitored yet',
  addDatabase: 'Add a database',
  noMatch: 'Nothing matches these filters',
  clearFilters: 'Clear filters',
  outsideClusters: (n: number) =>
    `${count(n, 'problem', 'problems')} outside any cluster`,
  needAttention: (clusters: number, groups: number) =>
    `${count(clusters, 'cluster', 'clusters')} ${clusters === 1 ? 'needs' : 'need'} attention, in ${count(groups, 'group', 'groups')}`,
  states: {
    critical: 'critical',
    warning: 'warning',
    notice: 'notice',
    healthy: 'healthy',
  },
  severity: {
    critical: 'Critical',
    warning: 'Warning',
    notice: 'Notice',
  } as Record<ProblemState, string>,
  severityShort: {
    critical: 'CRIT',
    warning: 'WARN',
    notice: 'NOTE',
  } as Record<ProblemState, string>,
  overline: (clusters: number, instances: number) =>
    `${count(clusters, 'cluster', 'clusters')} · ${count(instances, 'instance', 'instances')}`,
  scope: 'Scope',
  scopePill: (dimension: string, value: string) =>
    `${dimension}: ${value || 'all'}`,
  live: (time: string) => `live · ${time}`,
  instancesReporting: (reporting: number, total: number) =>
    `${reporting} of ${count(total, 'instance', 'instances')} reporting`,
  checked: 'Checked',
  advisorsOff: 'Advisors: off',
  backupsOff: 'Backups: off',
  checkedAlerts: (rules: number | null, firing: number | null) =>
    rules === null
      ? `Alert rules: ${unknown}`
      : `${count(rules, 'alert rule', 'alert rules')}, ${firing ?? unknown} firing`,
  checkedAdvisors: (services: number | null) =>
    services === null
      ? `Advisor results: ${unknown}`
      : `${count(services, 'service', 'services')} with Advisor findings`,
  checkedBackups: (backups: { total: number; ok: number } | null) => {
    if (backups === null) {
      return `Backups: ${unknown}`;
    }
    return backups.total === 0
      ? 'No backups in the last 24 h'
      : `Backups, last 24 h: ${backups.ok} of ${backups.total} succeeded`;
  },
  needsAttention: 'Needs attention',
  attentionHint: 'one row per shared cause · worst first',
  nothingNeedsAttention: 'Nothing needs attention',
  nothingDetail:
    'No firing alerts, unreachable instances, failed backups or Advisor findings in scope.',
  moreInAlerting: (n: number) => `${n} more in Alerting`,
  sourcesFailed: (sources: HomeSource[]) =>
    `Couldn't load ${listOf(sources.map((s) => SOURCE_NAMES[s]))}; problems from them may be missing`,
  actions: {
    alert: 'Open alerts',
    'not-reporting': 'View inventory',
    backup: 'View backups',
    advisor: 'Review Advisors',
  } as Record<AttentionKind, string>,
  attentionTitle: (item: AttentionItem) => {
    switch (item.kind) {
      case 'alert':
        return item.clusters === 0
          ? `${item.ruleName}`
          : `${item.ruleName} on ${count(item.clusters, 'cluster', 'clusters')}`;
      case 'not-reporting':
        return `${count(item.instances, 'instance', 'instances')} not reporting`;
      case 'backup':
        return `Backups failed on ${count(item.clusters, 'cluster', 'clusters')} in the last 24 h`;
      case 'advisor':
        return `${count(item.clusters, 'cluster', 'clusters')} ${item.clusters === 1 ? 'fails' : 'fail'} Advisor checks`;
    }
  },
  attentionDetail: (item: AttentionItem) =>
    [
      count(item.instances, 'instance', 'instances'),
      item.startedTogether ? 'started together' : '',
      item.location ? `location: ${item.location}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  attentionMeta: (item: AttentionItem) =>
    Object.entries(item.commonLabels)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · '),
  since: (since: string, now: Date) => {
    const at = new Date(since);
    const age = now.getTime() - at.getTime();
    const clock = format(at, age < 24 * 60 * MINUTE_MS ? 'HH:mm' : 'MMM d');
    return `${shortAge(age)} · ${clock}`;
  },
  topIssue: (item?: AttentionItem) => {
    if (!item) {
      return '—';
    }
    switch (item.kind) {
      case 'alert':
        return item.ruleName ?? '—';
      case 'not-reporting':
        return 'not reporting';
      case 'backup':
        return 'backup failed';
      case 'advisor':
        return 'Advisor findings';
    }
  },
  fleetHealth: 'Fleet health',
  fleetHint: (by: FleetDimension) =>
    `by ${Messages.dimensions[by].toLowerCase()} · worst first`,
  fleetFooter: 'Per-instance details live in Inventory',
  by: 'By',
  allClusters: 'All clusters',
  all: 'All',
  dimensions: {
    technology: 'Technology',
    environment: 'Environment',
    region: 'Region',
    application: 'Application',
  } as Record<FleetDimension, string>,
  noValue: {
    technology: 'Unknown technology',
    environment: 'No environment',
    region: 'No region',
    application: 'No app label',
  } as Record<FleetDimension, string>,
  foldedRow: (n: number, by: FleetDimension) =>
    `${n} more ${
      {
        technology: 'technologies',
        environment: 'environments',
        region: 'regions',
        application: 'applications',
      }[by]
    }`,
  columns: {
    clusters: 'Clusters',
    instances: 'Instances',
    health: 'Health',
    healthy: 'Healthy',
    topIssue: 'Top issue',
  },
  loadFailed: "Couldn't load the monitored services",
};
