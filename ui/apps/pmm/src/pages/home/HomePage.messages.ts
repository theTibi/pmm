import {
  AttentionItem,
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
  instancesReporting: (reporting: number, total: number) =>
    `${reporting} of ${count(total, 'instance', 'instances')} reporting`,
  checked: 'Checked',
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
  nothingNeedsAttention: 'Nothing needs attention',
  moreInAlerting: (n: number) => `${n} more in Alerting`,
  sourcesFailed: (sources: HomeSource[]) =>
    `Couldn't load ${listOf(sources.map((s) => SOURCE_NAMES[s]))}; problems from them may be missing`,
  open: 'Open',
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
      ...Object.entries(item.commonLabels).map(([k, v]) => `${k}: ${v}`),
      item.startedTogether ? 'started together' : '',
      item.location ? `location: ${item.location}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  since: (age: string) => `since ${age} ago`,
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
