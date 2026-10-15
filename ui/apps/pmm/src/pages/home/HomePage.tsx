import { FC, useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useSearchParams } from 'react-router-dom';
import { Page } from 'components/page';
import { FleetDimension, HealthInput, HomeScope } from 'types/home.types';
import { safeLocalStorage } from 'utils/storage.utils';
import { buildClusters } from './utils/clusters';
import { computeStates } from './utils/health';
import { buildAttention, countFiringAlerts } from './utils/attention';
import {
  applyScope,
  FLEET_DIMENSIONS,
  isScoped,
  scopeOptions,
} from './utils/scope';
import { buildFleetRows } from './utils/fleet';
import { buildChecks, buildSummary } from './utils/summary';
import { useHomeData } from './useHomeData';
import { ScopeBar } from './scope-bar/ScopeBar';
import { StatusHeader } from './status-header/StatusHeader';
import { NeedsAttention } from './needs-attention/NeedsAttention';
import { FleetHealth } from './fleet-health/FleetHealth';
import { DEFAULT_FLEET_BY, FLEET_BY_STORAGE_KEY } from './HomePage.constants';
import { Messages } from './HomePage.messages';

const storedFleetBy = (): FleetDimension => {
  const stored = safeLocalStorage.getItem(FLEET_BY_STORAGE_KEY);
  return FLEET_DIMENSIONS.find((d) => d === stored) ?? DEFAULT_FLEET_BY;
};

const scopeFromParams = (params: URLSearchParams): HomeScope =>
  Object.fromEntries(
    FLEET_DIMENSIONS.filter((d) => params.get(d)).map((d) => [
      d,
      params.get(d),
    ])
  );

export const HomePage: FC = () => {
  const [params, setParams] = useSearchParams();
  const [by, setBy] = useState(storedFleetBy);
  const data = useHomeData();
  const { services, nodes, alerts, rules, failedServices, artifacts, failed } =
    data;
  const paramsKey = params.toString();

  const view = useMemo(() => {
    const now = new Date();
    const scope = scopeFromParams(new URLSearchParams(paramsKey));
    const all = buildClusters(services ?? [], nodes ?? []);
    const clusters = applyScope(all, scope);
    const input: HealthInput = {
      alerts: alerts ?? [],
      failedServices: failedServices ?? [],
      artifacts: artifacts ?? [],
    };
    const opts = { includeUnattributed: !isScoped(scope) };
    const states = computeStates(clusters, input, now);
    const attention = buildAttention(clusters, input, now, opts);

    return {
      now,
      scope,
      options: scopeOptions(all),
      summary: buildSummary(clusters, states),
      checks: buildChecks(
        {
          rules,
          firing: alerts && countFiringAlerts(clusters, alerts, opts),
          failedServices,
          artifacts,
        },
        now
      ),
      attention,
      groups: attention.filter((item) => item.clusters > 0).length,
      rows: buildFleetRows(clusters, states, attention, by),
    };
  }, [paramsKey, services, nodes, alerts, rules, failedServices, artifacts, by]);

  const changeScope = (scope: HomeScope) =>
    setParams(
      Object.fromEntries(Object.entries(scope).filter(([, v]) => !!v)) as Record<
        string,
        string
      >
    );

  const changeBy = (next: FleetDimension) => {
    setBy(next);
    safeLocalStorage.setItem(FLEET_BY_STORAGE_KEY, next);
  };

  const renderContent = () => {
    if (data.isLoading) {
      return <CircularProgress sx={{ alignSelf: 'center', mt: 6 }} />;
    }
    if (failed.includes('services')) {
      return <Alert severity="error">{Messages.loadFailed}</Alert>;
    }
    return (
      <Stack spacing={3}>
        <ScopeBar
          scope={view.scope}
          options={view.options}
          onChange={changeScope}
        />
        <StatusHeader
          summary={view.summary}
          checks={view.checks}
          groups={view.groups}
          incomplete={failed.length > 0}
        />
        <NeedsAttention items={view.attention} failed={failed} now={view.now} />
        <FleetHealth rows={view.rows} by={by} onByChange={changeBy} />
      </Stack>
    );
  };

  return (
    <Page title={Messages.pageTitle} hideTitle surface="canvas" maxWidth={1200}>
      {renderContent()}
    </Page>
  );
};
