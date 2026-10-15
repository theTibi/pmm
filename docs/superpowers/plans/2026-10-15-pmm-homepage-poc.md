# PMM Homepage PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A native, high-level PMM homepage (Status, Needs attention, Fleet health) at `/pmm-ui/home`, built only on existing APIs.

**Architecture:** Six existing endpoints feed React Query hooks; one pure derivation layer (`pages/home/utils/`) turns them into clusters, cluster states, attention groups and fleet rows; four presentational components render the result inside the shared `Page` wrapper. The derivation layer has no React or network code, so phase 2 can move it behind a server endpoint unchanged.

**Tech Stack:** React 19, TypeScript, MUI 7 + `@percona/peak-ui`, TanStack Query 5, React Router 7, Vitest + Testing Library, pnpm/Turborepo (`ui/`).

**Spec:** `docs/superpowers/specs/2026-10-15-pmm-homepage-poc-design.md`

## Global Constraints

- No backend, proto or Grafana changes. Inputs: `GET /v1/management/services`, `GET /v1/management/nodes`, Grafana `GET /alertmanager/grafana/api/v2/alerts`, Grafana `GET /prometheus/grafana/api/v1/rules`, `GET /v1/advisors/failedServices`, `GET /v1/backups/artifacts`.
- All paths below are under `ui/apps/pmm/src/` unless they start with `ui/` or `docs/`.
- Server state only through TanStack Query hooks in `hooks/api/`; query keys `['domain:action']`. `api` (axios, `/v1/`) converts snake_case → camelCase; `grafanaApi` does not (Alertmanager fields are already camelCase).
- Styling: MUI + `@percona/peak-ui` with theme-aware `sx`; native page on `components/page` `Page` (default paper surface). No hard-coded colours: severities use `theme.palette.error`, `.warning`, `.info`; healthy uses `theme.palette.action.disabledBackground` ("colour only means a problem").
- All user-visible copy in `pages/home/HomePage.messages.ts`.
- Fixed values from the spec: refresh `60_000` ms; failed-backup window 24 h; "started together" window 5 min; at most 6 fleet rows; at most 10 attention rows; application label key `app`; default fleet dimension `technology`.
- Severity mapping: `emergency`/`alert`/`critical` → critical; `error`/`warning`/missing/any other value → warning; `notice`/`info` → notice. Advisor findings are always notice. `STATUS_DOWN` → critical; `STATUS_UNKNOWN` → neither reporting nor a problem.
- Commits: `PMM-7 <summary>` (≤50 chars), signed off (`git commit -s`), body ends with `Claude-Session: https://claude.ai/code/session_01KqRgxoZhoRPtSLdP6dJQLw`. `git add` and `git commit` must be separate calls (a lint-gate hook enforces it). Push to `origin` (`theTibi/pmm`) after every task.
- Before the first task: `cd ui && make setup` (Corepack + pnpm install). Single test file: `cd ui/apps/pmm && pnpm vitest run <path relative to apps/pmm>`.

## Review Focus

1. **No services monitored at all** — expect "No databases monitored yet" and an "Add a database" link, never "All clear". Pinned in Task 5 (`buildSummary`) and Task 6 (`StatusHeader`).
2. **One data source fails** (e.g. Alertmanager refuses a Viewer) — the other blocks still render, the title says "No known problems" instead of "All clear", and the failed source reads "unknown" in the Checked line. Pinned in Task 7.
3. **Same cluster name in two environments** (`orders` in prod and staging) — two clusters, not one. Pinned in Task 2.
4. **PMM Server's own alerts** (`grafana_down`, `ha_*`: no `service_name`, no `cluster`) — counted in their rule's row only when no scope is set, and never change a cluster's state. Pinned in Tasks 3 and 4.
5. **More than 10 attention groups** — 10 rows, then "N more in Alerting". Pinned in Task 6.

---

### Task 1: Data sources

**Files:**
- Create: `types/nodes.types.ts`, `types/backups.types.ts`, `api/nodes.ts`, `api/backups.ts`, `hooks/api/useManagedNodes.ts`, `hooks/api/useBackupArtifacts.ts`
- Modify: `types/advisors.types.ts`, `api/advisors.ts`, `api/alerting.ts`, `hooks/api/useAdvisors.ts`, `hooks/api/useAlertmanagerAlerts.ts`
- Test: `api/home-sources.test.ts`

**Interfaces:**
- Produces types: `ManagedNode { nodeId: string; nodeName: string; region: string }`, `ListManagedNodesResponse { nodes?: ManagedNode[] }`; `enum BackupStatus { Success = 'BACKUP_STATUS_SUCCESS', Error = 'BACKUP_STATUS_ERROR' }` (only these two are read), `BackupArtifact { artifactId: string; serviceId: string; serviceName: string; locationName: string; status: string; createdAt: string }`, `ListArtifactsResponse { artifacts?: BackupArtifact[] }`; `CheckResultSummary { serviceId: string; serviceName: string; emergencyCount, alertCount, criticalCount, errorCount, warningCount, noticeCount, infoCount, debugCount: number }`, `ListFailedServicesResponse { result?: CheckResultSummary[] }`.
- Produces functions: `listManagedNodes(): Promise<ManagedNode[]>`, `listBackupArtifacts(): Promise<BackupArtifact[]>`, `listFailedServices(): Promise<CheckResultSummary[]>`, `getActiveAlerts(): Promise<AlertmanagerAlert[]>`.
- Produces hooks (all take `options?: Partial<UseQueryOptions<T>>` like `useAdvisors`): `useManagedNodes` key `['nodes:managed']`, `useBackupArtifacts` key `['backups:artifacts']`, `useFailedServices` key `['advisors:failedServices']`, `useActiveAlerts` key `['alerting:activeAlerts']`.
- Consumes existing: `useManagedServices` (`hooks/api/useServices.ts`), `usePrometheusAlertRules`.

- [ ] **Step 1: Write the failing tests**

```ts
// api/home-sources.test.ts
describe('home data sources', () => {
  it('lists management nodes', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { nodes: [NODE] } });
    expect(await listManagedNodes()).toEqual([NODE]);
    expect(get).toHaveBeenCalledWith('/management/nodes');
  });
  it('returns [] when nodes are missing', ...);          // data: {} → []
  it('lists backup artifacts', ...);                     // '/backups/artifacts' → data.artifacts
  it('lists services with failed advisor checks', ...);  // '/advisors/failedServices' → data.result
  it('lists active, unsilenced alerts', async () => {
    const get = vi.spyOn(grafanaApi, 'get').mockResolvedValue({ data: [] });
    await getActiveAlerts();
    expect(get).toHaveBeenCalledWith('/alertmanager/grafana/api/v2/alerts', {
      params: { active: true, silenced: false, inhibited: false, unprocessed: false },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm vitest run src/api/home-sources.test.ts` → FAIL (functions not exported).
- [ ] **Step 3: Add the types, the four API functions and the four hooks.** Missing list fields resolve to `[]`. Hooks mirror `useAdvisors`.
- [ ] **Step 4: Run to verify it passes** — same command → PASS.
- [ ] **Step 5: Commit and push** — `PMM-7 Add data sources for the homepage`.

---

### Task 2: Cluster model

**Files:**
- Create: `types/home.types.ts`, `pages/home/utils/clusters.ts`, `pages/home/utils/test-fixtures.ts`
- Test: `pages/home/utils/clusters.test.ts`

**Interfaces:**
- Produces types (`types/home.types.ts`, used by every later task):

```ts
export type ClusterState = 'critical' | 'warning' | 'notice' | 'healthy';
export type ProblemState = Exclude<ClusterState, 'healthy'>;
export type FleetDimension = 'technology' | 'environment' | 'region' | 'application';
export type HomeScope = Partial<Record<FleetDimension, string>>;
export type HomeSource = 'services' | 'nodes' | 'alerts' | 'rules' | 'advisors' | 'backups';
export interface HomeService {
  id: string; name: string; type: string; environment: string;
  region: string; app: string; status?: ServiceStatus;
}
export interface Cluster {
  key: string; name: string; technology: string;
  environment: string; region: string; app: string; services: HomeService[];
}
export interface HealthInput {
  alerts: AlertmanagerAlert[]; failedServices: CheckResultSummary[]; artifacts: BackupArtifact[];
}
export type AttentionKind = 'alert' | 'not-reporting' | 'backup' | 'advisor';
export interface AttentionItem {
  id: string; kind: AttentionKind; severity: ProblemState; ruleName?: string;
  clusterKeys: string[]; clusters: number; instances: number; since?: string;
  commonLabels: Record<string, string>; startedTogether: boolean; location?: string;
}
export interface FleetRow {
  name: string; clusters: number; instances: number;
  counts: Record<ClusterState, number>; topIssue?: AttentionItem; folded: number;
}
export interface HomeSummary {
  clusters: number; counts: Record<ClusterState, number>; instances: number; instancesReporting: number;
}
export interface HomeChecks {
  alertRules: number | null; firing: number | null; advisorServices: number | null;
  backups: { total: number; ok: number } | null;
}
```

- Produces: `buildClusters(services: ManagedService[], nodes: ManagedNode[]): Cluster[]`, `technologyLabel(type: string): string`.
- Produces fixtures (`test-fixtures.ts`): `NOW = new Date('2026-10-15T10:08:00Z')`, `svc(over: Partial<ManagedService>): ManagedService` (defaults: `serviceType: 'mysql'`, `environment: 'prod'`, `status: ServiceStatus.up`, empty `cluster`/`replicationSet`/`customLabels`), `node(over)`, `alert(labels, startsAt = '2026-10-15T10:00:00Z')`, `artifact(over)`, `summary(over)` (a `CheckResultSummary` with zero counts).

- [ ] **Step 1: Write the failing tests**

```ts
it('groups services that share a cluster in one environment', () => {
  const [c] = buildClusters([svc({ serviceId: 'a', cluster: 'orders' }), svc({ serviceId: 'b', cluster: 'orders' })], []);
  expect(c.name).toBe('orders'); expect(c.services).toHaveLength(2);
});
it('keeps the same cluster name in different environments apart', () => {
  expect(buildClusters([svc({ cluster: 'orders' }), svc({ cluster: 'orders', environment: 'staging' })], [])).toHaveLength(2);
});
it('falls back to the replication set, then to the service alone', ...);  // names 'rs0', then serviceName
it('takes region from the node and application from the app label', ...); // node region 'eu-west-1', customLabels { app: 'shop' }
it('uses the most common service type as technology', ...);             // 2× mysql + 1× proxysql → 'mysql'
it('labels technologies for display', () => {
  expect(technologyLabel('postgresql')).toBe('PostgreSQL');
  expect(technologyLabel('foo')).toBe('foo');
});
```

- [ ] **Step 2: Run to verify it fails** — `pnpm vitest run src/pages/home/utils/clusters.test.ts` → FAIL.
- [ ] **Step 3: Implement `buildClusters` and `technologyLabel`.** Key `${environment}|c:${cluster}`, else `${environment}|rs:${replicationSet}`, else `${environment}|s:${serviceId}`; name is the cluster, replication set or service name. Technology, region and app are the most common non-empty value among members (ties: alphabetical first; none: `''`). Return clusters sorted by name. Labels: mysql→MySQL, mongodb→MongoDB, postgresql→PostgreSQL, proxysql→ProxySQL, haproxy→HAProxy, valkey→Valkey, external→External.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit and push** — `PMM-7 Build clusters from managed services`.

---

### Task 3: Cluster health

**Files:**
- Create: `pages/home/utils/health.ts`
- Test: `pages/home/utils/health.test.ts`

**Interfaces:**
- Consumes: `Cluster`, `HealthInput`, `ProblemState`, `ClusterState` (Task 2).
- Produces: `severityFromLabels(labels: Record<string, string>): ProblemState`; `indexClusters(clusters: Cluster[]): ClusterIndex` (opaque lookup); `attributeAlert(alert: AlertmanagerAlert, index: ClusterIndex): string | undefined` (cluster key); `recentFailedBackups(artifacts: BackupArtifact[], now: Date): BackupArtifact[]`; `computeStates(clusters: Cluster[], input: HealthInput, now: Date): Map<string, ClusterState>`; `SEVERITY_RANK: Record<ClusterState, number>` (critical 3 … healthy 0).

- [ ] **Step 1: Write the failing tests**

```ts
it.each(['emergency', 'alert', 'critical'])('maps %s to critical', (s) => expect(severityFromLabels({ severity: s })).toBe('critical'));
it.each(['error', 'warning', undefined, 'whatever'])('maps %s to warning', ...);
it.each(['notice', 'info'])('maps %s to notice', ...);
it('attributes an alert by service_name', ...);
it('attributes an alert by cluster label when service_name is missing', ...);
it('leaves a cluster-label alert unattributed when two environments share the name and the alert has no environment', ...);
it('uses the environment label to pick between same-named clusters', ...);
it('leaves PMM Server alerts unattributed', () => {
  expect(attributeAlert(alert({ alertname: 'grafana_down' }), index)).toBeUndefined();
});
it('keeps only failed backups from the last 24 h', ...);   // SUCCESS and a 25 h old ERROR are dropped
it('marks a cluster with a down service critical', ...);
it('takes the worst condition: warning alert + advisor finding → warning', ...);
it('treats advisor findings as notice even when their checks are critical', ...); // summary({ criticalCount: 3 })
it('marks a cluster with a failed backup warning', ...);
it('leaves clusters healthy when an alert is unattributed', ...);
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.** Attribution: `service_name` → that service's cluster; else `cluster` label → the single cluster with that name (narrowed by the `environment` label when present); else `undefined`. An advisor finding is any `CheckResultSummary` with a non-zero count. Cluster state is the highest `SEVERITY_RANK` among its signals.
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit and push** — `PMM-7 Derive cluster health for the homepage`.

---

### Task 4: Needs attention groups

**Files:**
- Create: `pages/home/utils/attention.ts`
- Test: `pages/home/utils/attention.test.ts`

**Interfaces:**
- Consumes: Task 3's `indexClusters`, `attributeAlert`, `severityFromLabels`, `recentFailedBackups`, `SEVERITY_RANK`.
- Produces: `buildAttention(clusters: Cluster[], input: HealthInput, now: Date, opts: { includeUnattributed: boolean }): AttentionItem[]`; `countFiringAlerts(clusters: Cluster[], alerts: AlertmanagerAlert[], opts: { includeUnattributed: boolean }): number` (alerts attributed to the given clusters, plus unattributed ones when included); `STARTED_TOGETHER_MS = 5 * 60_000`; `COMMON_LABEL_KEYS = ['cluster', 'environment', 'region', 'service_type']`.

- [ ] **Step 1: Write the failing tests**

```ts
it('groups alerts of one rule across clusters into one item', () => {
  const [item] = buildAttention(clusters, { ...EMPTY, alerts: [alert({ alertname: 'lag', service_name: 'a' }), alert({ alertname: 'lag', service_name: 'b' })] }, NOW, { includeUnattributed: true });
  expect(item).toMatchObject({ kind: 'alert', ruleName: 'lag', clusters: 2, instances: 2, since: '2026-10-15T10:00:00Z' });
});
it('marks alerts started within 5 minutes as started together', ...);   // 10:00 and 10:04 → true
it('does not mark alerts 6 minutes apart as started together', ...);    // 10:00 and 10:06 → false
it('reports only labels every alert shares', ...);   // same region, different environment → { region: 'eu-west-1', service_type: 'mysql' }
it('drops unattributed alerts when includeUnattributed is false', ...);
it('counts unattributed alerts in their rule row with zero clusters', ...);
it('adds a critical not-reporting item for down services only', ...);   // STATUS_UNKNOWN adds nothing
it('adds a failed-backup item with the shared location', ...);
it('omits the location when failed backups use different locations', ...);
it('adds one notice item for advisor findings', ...);
it('orders by severity, then by clusters affected', ...);
it('counts firing alerts in scope, with and without unattributed ones', ...); // 2 attributed + 1 grafana_down → 3 / 2
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `buildAttention`.** One item per `alertname` (missing → `'Unnamed alert'`, id `alert:<name>`), plus at most one each of `not-reporting`, `backup`, `advisor` (ids equal to the kind). Only clusters passed in count; with `includeUnattributed`, unattributed alerts join their rule's row. Sort by `SEVERITY_RANK` desc, then `clusters` desc, then `since` asc (missing last).
- [ ] **Step 4: Run to verify it passes.**
- [ ] **Step 5: Commit and push** — `PMM-7 Group homepage problems by shared cause`.

---

### Task 5: Scope, fleet rows and summary

**Files:**
- Create: `pages/home/utils/scope.ts`, `pages/home/utils/fleet.ts`, `pages/home/utils/summary.ts`
- Test: `pages/home/utils/scope.test.ts`, `pages/home/utils/fleet.test.ts`, `pages/home/utils/summary.test.ts`

**Interfaces:**
- Produces: `groupValue(cluster: Cluster, by: FleetDimension): string`; `applyScope(clusters: Cluster[], scope: HomeScope): Cluster[]`; `scopeOptions(clusters: Cluster[]): Record<FleetDimension, string[]>`; `isScoped(scope: HomeScope): boolean`.
- Produces: `MAX_FLEET_ROWS = 6`; `buildFleetRows(clusters: Cluster[], states: Map<string, ClusterState>, attention: AttentionItem[], by: FleetDimension): FleetRow[]`.
- Produces: `buildSummary(clusters: Cluster[], states: Map<string, ClusterState>): HomeSummary`; `buildChecks(input: { rules?: PrometheusAlertRulesResponse; firing?: number; failedServices?: CheckResultSummary[]; artifacts?: BackupArtifact[] }, now: Date): HomeChecks`.

- [ ] **Step 1: Write the failing tests**

```ts
// scope.test.ts
it('filters by one dimension and by several together', ...);
it('lists distinct, sorted, non-empty values per dimension', ...);
it('is unscoped when every value is empty', () => expect(isScoped({ environment: '' })).toBe(false));
// fleet.test.ts
it('rolls clusters up by technology with counts per state', ...);
it('orders groups worst first, then by name, empty name last', ...);
it('folds groups beyond 6 into one row', () => {
  const rows = buildFleetRows(eightTechnologies, states, [], 'technology');
  expect(rows).toHaveLength(6); expect(rows[5]).toMatchObject({ name: '', folded: 3 });
});
it('picks the most severe attention item touching the group as top issue', ...);
// summary.test.ts
it('counts clusters per state and instances reporting', ...);   // one UP, one UNKNOWN → instancesReporting 1 of 2
it('reports zero clusters and instances for an empty fleet', ...);
it('counts alerting rules only', ...);                          // a 'recording' rule is ignored
it('returns null for every source that is missing', ...);
it('counts backups from the last 24 h and how many succeeded', ...);
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement.** `groupValue`: technology → `cluster.technology`, environment, region, application → `cluster.app`. Fleet sort: critical desc, warning desc, notice desc, then name asc with `''` last; above `MAX_FLEET_ROWS` groups keep the first 5 and add one row with `name: ''`, `folded: <groups folded>`, summed counts, no top issue. `instancesReporting` counts `STATUS_UP`.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit and push** — `PMM-7 Add scope, fleet rows and summary`.

---

### Task 6: Presentational components

**Files:**
- Create: `pages/home/HomePage.messages.ts`, `pages/home/HomePage.constants.ts`, `pages/home/status-header/StatusHeader.tsx`, `pages/home/needs-attention/NeedsAttention.tsx`, `pages/home/fleet-health/FleetHealth.tsx`, `pages/home/scope-bar/ScopeBar.tsx`
- Test: one `*.test.tsx` next to each component, rendered with `TestWrapper` (`utils/testWrapper.tsx`).

**Interfaces:**
- Consumes: types from Task 2, `MAX_FLEET_ROWS` and `technologyLabel`.
- Produces props:
  - `StatusHeader { summary: HomeSummary; checks: HomeChecks; groups: number; incomplete: boolean }`
  - `NeedsAttention { items: AttentionItem[]; failed: HomeSource[]; now: Date }`; `MAX_ATTENTION_ROWS = 10` in `HomePage.constants.ts`
  - `FleetHealth { rows: FleetRow[]; by: FleetDimension; onByChange: (by: FleetDimension) => void }`, with a footer link "All clusters" to Inventory → Services
  - `ScopeBar { scope: HomeScope; options: Record<FleetDimension, string[]>; onChange: (scope: HomeScope) => void }`
- `HomePage.constants.ts` links: alert → `${PMM_NEW_NAV_GRAFANA_PATH}/alerting/list`, not-reporting → `${PMM_NEW_NAV_GRAFANA_PATH}/inventory/services`, backup → `${PMM_NEW_NAV_GRAFANA_PATH}/backup/inventory`, advisor → `${PMM_NEW_NAV_GRAFANA_PATH}/advisors/insights`; add database → `${PMM_NEW_NAV_GRAFANA_PATH}/add-instance`.

Copy (`HomePage.messages.ts`; pluralise counts): `allClear: 'All clear'`, `noKnownProblems: 'No known problems'`, `noDatabases: 'No databases monitored yet'`, `addDatabase: 'Add a database'`, `needAttention(n, g)` → "1 cluster needs attention, in 1 group" / "4 clusters need attention, in 3 groups", `nothingNeedsAttention: 'Nothing needs attention'`, `moreInAlerting(n)` → "2 more in Alerting", `alertTitle(rule, n)` → "lag on 2 clusters", `notReportingTitle(n)` → "3 instances not reporting", `backupTitle(n)` → "Backups failed on 1 cluster in the last 24 h", `advisorTitle(n)` → "2 clusters fail Advisor checks", `startedTogether: 'started together'`, `unknown: 'unknown'`, `sourcesFailed(names)` → "Couldn't load alerts and backups; problems from them may be missing", `allClusters: 'All clusters'`, `noValue: { technology: 'Unknown technology', environment: 'No environment', region: 'No region', application: 'No app label' }`, `foldedRow(n, by)` → "3 more technologies" / "environments" / "regions" / "applications", section titles `Needs attention`, `Fleet health`, dimension labels `Technology`, `Environment`, `Region`, `Application`, `All`.

- [ ] **Step 1: Write the failing tests**

```tsx
it('says All clear for a healthy, fully loaded fleet', ...);
it('says No known problems when a source failed', ...);           // incomplete
it('says how many clusters need attention and in how many groups', ...); // "4 clusters need attention, in 3 groups"
it('says No databases monitored yet and links to add one', ...);   // summary.instances 0
it('shows unknown for a check whose source failed', ...);          // checks.firing null
it('renders attention rows in order with links to their pages', ...);
it('says Nothing needs attention when there are no items', ...);
it('shows 10 rows and "2 more in Alerting" for 12 items', ...);
it('warns inline which sources failed to load', ...);              // failed ['alerts', 'backups'] → sourcesFailed text
it('labels an empty environment group "No environment"', ...);
it('labels the folded row "3 more technologies"', ...);
it('calls onByChange with region when Region is chosen', ...);
it('sets and clears a scope value', ...);                          // pick 'prod' → { environment: 'prod' }; 'All' → {}
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement the four components.** `StatusHeader` title precedence: no instances → `noDatabases`; any non-healthy cluster → `needAttention`; `incomplete` → `noKnownProblems`; else `allClear`. `FleetHealth` uses a `ToggleButtonGroup` for By and a segmented health bar per row (theme colours per Global Constraints). `ScopeBar` shows all four dimensions at all times; a dimension with no options is disabled.
- [ ] **Step 4: Run to verify they pass.**
- [ ] **Step 5: Commit and push** — `PMM-7 Add homepage components`.

---

### Task 7: Home page, route and navigation

**Files:**
- Create: `pages/home/useHomeData.ts`, `pages/home/HomePage.tsx`, `pages/home/index.ts`
- Modify: `router.tsx` (index route and new `home` route), `lib/constants.ts` (`PMM_HOME_PAGE_PATH = \`${PMM_NEW_NAV_PATH}/home\``), `contexts/navigation/navigation.constants.ts` (`NAV_HOME_PAGE.url = PMM_HOME_PAGE_PATH`, add it to `matches`, keep the Grafana `pmm-home` entries)
- Test: `pages/home/HomePage.test.tsx`; update any test that asserts the old index redirect or `NAV_HOME_PAGE.url` (find with `grep -rn "NAV_HOME_PAGE\|to=\"graph\"" src --include=*.test.*`).

**Interfaces:**
- Consumes: `HomeSource` (Task 2), `countFiringAlerts` (Task 4) for `buildChecks({ firing })`.
- Produces: `useHomeData(): { services?: ManagedService[]; nodes?: ManagedNode[]; alerts?: AlertmanagerAlert[]; rules?: PrometheusAlertRulesResponse; failedServices?: CheckResultSummary[]; artifacts?: BackupArtifact[]; isLoading: boolean; failed: HomeSource[] }`, every query with `refetchInterval: 60_000`.
- `HomePage`: scope from URL search params (one key per `FleetDimension`); By from `safeLocalStorage` key `pmm.home.fleetBy`, default `'technology'`; derivations in `useMemo` with `now = new Date()` per render; `incomplete = failed.length > 0`; `includeUnattributed = !isScoped(scope)`; renders `<Page title="Home" hideTitle>` with ScopeBar, StatusHeader, NeedsAttention, FleetHealth. Services still loading → a loading state; services failed → an error `Alert` instead of the three blocks.

- [ ] **Step 1: Write the failing tests** (mock the hook modules with `vi.mock('hooks/api/…')`, render with `wrapWithQueryProvider` + `TestWrapper`)

```tsx
it('shows All clear and Nothing needs attention for a healthy fleet', ...);
it('shows a critical alert row and "1 cluster needs attention, in 1 group"', ...);
it('shows No known problems and unknown when alerts fail to load', ...);
it('shows No databases monitored yet when there are no services', ...);
it('counts only staging clusters when the URL has ?environment=staging', ...);
it('restores the fleet dimension from local storage', ...);
```

- [ ] **Step 2: Run to verify they fail.**
- [ ] **Step 3: Implement `useHomeData`, `HomePage`, the route, the constant and the nav change.**
- [ ] **Step 4: Run the page tests and the navigation tests** — `pnpm vitest run src/pages/home src/contexts/navigation` → PASS.
- [ ] **Step 5: Commit and push** — `PMM-7 Make the native homepage the landing page`.

---

### Task 8: Verify on a live PMM and hand over

**Files:** none changed unless a check fails (fix in the owning task's files, new commit).

- [ ] **Step 1: Full UI checks** — `cd ui && make lint && make format-check && make test` → all pass, 0 lint errors.
- [ ] **Step 2: Build** — `cd ui && make build` → `ui/apps/pmm/dist/index.html` exists.
- [ ] **Step 3: Provision** a throwaway CHAOS VM with the `pmm-qa:chaos-docker-provisioning` skill: PMM Server `3-dev-latest`, MySQL 8.0 with one replica, PostgreSQL 16, MongoDB 7.0 replica set, in at least two environments, with `app` custom labels on some services.
- [ ] **Step 4: Deploy the UI** — copy `ui/apps/pmm/dist/` to the VM and `docker cp dist/. <pmm-server-container>:/usr/share/pmm-ui/` (nginx serves `/pmm-ui` from there).
- [ ] **Step 5: Create alert rules** from the `mysql_replication_sql_running` and `mongodb_down` templates (Alerting → Alert rule templates, or the alerting API).
- [ ] **Step 6: Capture the healthy state** with the `pmm-qa:ui-evidence` skill: `/pmm-ui/home` shows "All clear" (or "No known problems" with the failing source named) and the fleet by technology and by environment.
- [ ] **Step 7: Induce one problem of each kind and capture each:** `STOP REPLICA SQL_THREAD` on the MySQL replica (alert row, critical); stop the MongoDB exporter (`not reporting` row); a backup to an S3 location with wrong credentials (failed-backup row); `POST /v1/advisors/checks:start` and record any Advisor finding (if none appears, say so). Also capture `?environment=` scoping.
- [ ] **Step 8: Tear down the VM** and confirm it is gone.
- [ ] **Step 9: Push** and report: what works, the screenshots, and every spec item that did not behave as specified.
