# PMM homepage PoC — design

Status: draft for review · Branch: `PMM-7-homepage-poc` (fork `theTibi/pmm`) · Mockups: [PMM Homepage Directions, round 1d](https://claude.ai/artifact/Qt5ZENWF3G2jzZmhhg4A9r)

## Goal

Replace the Grafana Home dashboard with a native, high-level homepage that answers one question: **is anything wrong, and where?**

This is a proof of concept. Success means the team can open it on a real PMM Server with real databases, see problems surface correctly, and judge whether the direction is worth building properly.

## Principles (agreed in review)

1. **High level only.** No queries, no per-cluster metrics, no engine internals. Detail lives one click away.
2. **The cluster is the unit**, not the instance.
3. **One layout at every fleet size.** Data changes the content, never the structure: no thresholds that switch views.
4. **Colour only means a problem.** Healthy things stay neutral.
5. **"All clear" shows what was checked**, so green can be trusted.

## Scope

In:

- New page at `/pmm-ui/home`, made the default landing page; the Grafana Home dashboard stays reachable at its current URL.
- Three blocks: Status, Needs attention, Fleet health.
- Scope filters (environment, region, application, technology) applied to all three blocks.
- Built only on APIs that exist today, in today's peak-ui look (MUI + `@percona/peak-ui`, the shared `Page` wrapper).

Out (later phases):

- Server-side health rollup and problem grouping (needed for fleets in the thousands of instances).
- Query-regression detection, disk-full forecasts, trend sparklines on problem rows.
- The new visual style (a `@percona/peak-ui` change).
- Saved views, a cluster detail page, a first-class "application" field.

## Data model

All derivation runs in the browser in one pure module, so it can be unit-tested and later moved behind a server endpoint unchanged.

### Inputs (existing APIs)

| Input | Endpoint | Used for |
|---|---|---|
| Services | `GET /v1/inventory/services` | Instances, cluster membership, environment, technology, custom labels |
| Nodes | `GET /v1/inventory/nodes` | Region of each service's node |
| Agents | `GET /v1/inventory/agents` | Instances not reporting |
| Firing alerts | Grafana Alertmanager `GET /alertmanager/grafana/api/v2/alerts` (active, not silenced, not inhibited) | Alert-driven problems |
| Alert rules | Grafana `GET /prometheus/grafana/api/v1/rules` (already used by the UI) | "Checked" line: rules evaluated |
| Advisor results | `GET /v1/advisors/failedServices` | Advisor findings per service |
| Backups | `GET /v1/backups/artifacts` | Failed backups in the last 24 h |

Every PMM metric carries `service_name`, `service_type`, `environment`, `cluster`, `replication_set`, `node_name`, `region` and custom labels (`managed/models` `UnifiedLabels`), so alerts built on them can be attached to a service.

### Definitions

- **Instance** = a service. **Cluster** = services sharing the same `cluster` value; if empty, the same `replication_set`; if both are empty, the service on its own.
- **Cluster technology** = the most common `service_type` among its services.
- **Application** = the `app` custom label (a convention for the PoC; clusters without it go under "no app label").
- **Not reporting** = a service whose pmm-agent is disconnected or whose exporter is not `RUNNING`.
- **Cluster state** = the worst condition among its services:

| State | Any of |
|---|---|
| Critical | a firing alert with severity `emergency`, `alert` or `critical`; a service not reporting |
| Warning | a firing alert with severity `error` or `warning`; a failed backup in the last 24 h |
| Notice | a firing alert with severity `notice` or `info`; any failed Advisor check |
| Healthy | none of the above |

Advisor findings are always Notice: they describe configuration, not an ongoing incident.

## Page

### 1. Status

- Title: "All clear" when every cluster in scope is healthy, otherwise "N clusters need attention, in G groups".
- Counts of clusters by state; instances reporting (x / y).
- "Checked" line: alert rules evaluated and how many are firing; services with Advisor results; backups in the last 24 h and how many succeeded.

### 2. Needs attention

One row per shared cause, ordered by severity, then clusters affected:

| Row | Built from | Shared-cause signal shown |
|---|---|---|
| One per alert rule | firing alerts grouped by `alertname` | labels with a single value across the group (e.g. `region: eu-west-1`); "started together" when all `startsAt` fall within 5 minutes |
| Monitoring gap | services not reporting | number of agents and clusters affected |
| Failed backups | failed artifacts, last 24 h | backup location when they all share one |
| Advisor findings | failed checks | number of clusters |

Each row shows severity, since when, clusters and instances affected, and links to the existing page that holds the detail (Alerting, Inventory, Backups, Advisors). When nothing is wrong the block reads "Nothing needs attention" in the same place.

Alerts that carry no `service_name` are counted in their rule's row but cannot be attributed to a cluster.

### 3. Fleet health

- One row per group: name, clusters, instances, a health bar, counts by state, top issue.
- **By** technology (default), environment, region or application. The choice is the viewer's and is remembered in the browser.
- Ordered worst first; at most 6 rows, the rest fold into "N more …".
- A link to the existing Inventory page for per-cluster detail.

### Behaviour

- Data refreshes every 60 s (React Query `refetchInterval`).
- Each block loads and fails independently; a failed source shows an inline error in its block, and the "Checked" line marks that source as unknown rather than healthy.

## Code layout (`ui/apps/pmm/src`)

- `pages/home/` — `HomePage.tsx` and one component per block.
- `pages/home/home.utils.ts` — the pure derivation module (clusters, states, groups, fleet rows).
- `api/` + `hooks/api/` — new modules for nodes, inventory agents, Alertmanager alerts, advisor results and backup artifacts where they don't exist yet, following the existing patterns.
- `router.tsx` — add the `home` route and point the default route at it.

## Scale

The PoC aggregates in the browser and loads full lists from seven endpoints. That is fine up to a few hundred clusters. It is not the design for the 4,500-instance fleet: phase 2 moves the derivation module behind a pmm-managed endpoint with the same output.

## Testing and verification

- Unit tests (Vitest) for every rule in the derivation module, written first.
- Component tests for the three page states: all clear, problems present, a data source failing.
- `cd ui && make lint && make format-check && make test`.
- Live check on a throwaway CHAOS VM: stock PMM Server from `main` with this UI build, a MySQL replica set, PostgreSQL and MongoDB, then induce one problem of each kind (replication stopped, exporter stopped, backup to an unreachable location, an Advisor failure) and capture screenshots of each state.

## Risks and open questions

- Alert rules that aggregate labels away (`sum by (…)`) produce alerts without `service_name`; how common this is in PMM's built-in templates is not yet checked.
- The severity mapping assumes PMM alert rules set a `severity` label with the values above; to be confirmed against the templates.
- The `app` label is a convention invented for the PoC.
