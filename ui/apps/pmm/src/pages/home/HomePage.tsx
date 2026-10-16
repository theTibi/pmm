import { FC, useMemo, useState } from 'react';
import { Alert, Box, Stack } from '@mui/material';
import { format } from 'date-fns';
import CircularProgress from '@mui/material/CircularProgress';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Page } from 'components/page';
import { useUser } from 'contexts/user';
import { useSettings } from 'contexts/settings';
import { PMM_NEW_NAV_GRAFANA_PATH } from 'lib/constants';
import { FleetDimension, HealthInput, HomeScope } from 'types/home.types';
import { safeLocalStorage } from 'utils/storage.utils';
import { useConsoleTokens } from 'theme';
import { buildClusters } from './utils/clusters';
import { attributeAlert, computeStates, indexClusters } from './utils/health';
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
import { monoSx } from './HomePage.styles';

const storedFleetBy = (): FleetDimension => {
  const stored = safeLocalStorage.getItem(FLEET_BY_STORAGE_KEY);
  return FLEET_DIMENSIONS.find((d) => d === stored) ?? DEFAULT_FLEET_BY;
};

// Keeps the Checked line to the services the page is showing.
const inScope = <T extends { serviceId: string }>(
  items: T[] | undefined,
  ids: Set<string>
) => items?.filter((item) => ids.has(item.serviceId));

const scopeFromParams = (params: URLSearchParams): HomeScope =>
  Object.fromEntries(
    FLEET_DIMENSIONS.filter((d) => params.get(d)).map((d) => [d, params.get(d)])
  );

// The page reads admin-only APIs, so everyone else keeps the Grafana home.
export const HomePage: FC = () => {
  const { user } = useUser();

  return user?.isPMMAdmin ? (
    <HomeView />
  ) : (
    <Navigate to={`${PMM_NEW_NAV_GRAFANA_PATH}/`} replace />
  );
};

const HomeView: FC = () => {
  const [params, setParams] = useSearchParams();
  const [by, setBy] = useState(storedFleetBy);
  const t = useConsoleTokens();
  const { settings } = useSettings();
  const data = useHomeData({
    advisors: !!settings?.advisorEnabled,
    backups: !!settings?.backupManagementEnabled,
  });
  const {
    services,
    nodes,
    alerts,
    rules,
    failedServices,
    artifacts,
    updatedAt,
    failed,
    pending,
    off,
  } = data;
  const paramsKey = params.toString();

  const view = useMemo(() => {
    // Recomputed on every refresh (updatedAt), so ages and the 24 h window move on.
    const now = new Date();
    const scope = scopeFromParams(new URLSearchParams(paramsKey));
    const all = buildClusters(services ?? [], nodes ?? []);
    const clusters = applyScope(all, scope);
    // Match alerts against the whole fleet, so a scope cannot make an ambiguous alert unique.
    const fleet = indexClusters(all);
    const keys = new Set(clusters.map((c) => c.key));
    const scopedAlerts = isScoped(scope)
      ? alerts?.filter((a) => keys.has(attributeAlert(a, fleet) ?? ''))
      : alerts;
    const input: HealthInput = {
      alerts: scopedAlerts ?? [],
      failedServices: failedServices ?? [],
      artifacts: artifacts ?? [],
    };
    const opts = { includeUnattributed: !isScoped(scope) };
    const states = computeStates(clusters, input, now);
    const attention = buildAttention(clusters, input, now, opts);
    const ids = new Set(clusters.flatMap((c) => c.services.map((s) => s.id)));

    return {
      now,
      scope,
      options: scopeOptions(all),
      summary: buildSummary(clusters, states),
      checks: buildChecks(
        {
          rules,
          firing:
            scopedAlerts && countFiringAlerts(clusters, scopedAlerts, opts),
          failedServices: inScope(failedServices, ids),
          artifacts: inScope(artifacts, ids),
        },
        now
      ),
      attention,
      groups: attention.filter((item) => item.clusters > 0).length,
      outsideClusters: attention.filter((item) => item.clusters === 0).length,
      fleetEmpty: all.length === 0,
      rows: buildFleetRows(clusters, states, attention, by),
    };
  }, [
    paramsKey,
    services,
    nodes,
    alerts,
    rules,
    failedServices,
    artifacts,
    updatedAt,
    by,
  ]);

  const changeScope = (scope: HomeScope) =>
    setParams(
      Object.fromEntries(
        Object.entries(scope).filter(([, v]) => !!v)
      ) as Record<string, string>
    );

  const changeBy = (next: FleetDimension) => {
    setBy(next);
    safeLocalStorage.setItem(FLEET_BY_STORAGE_KEY, next);
  };

  const live = (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.75}
      sx={{ ...monoSx, fontSize: 12, color: t.textMuted }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: failed.length ? t.warning.main : t.healthy.text,
        }}
      />
      {Messages.live(format(view.now, 'HH:mm'))}
    </Stack>
  );

  const renderContent = () => {
    if (data.isLoading) {
      return <CircularProgress sx={{ alignSelf: 'center', mt: 6 }} />;
    }
    if (failed.includes('services')) {
      return <Alert severity="error">{Messages.loadFailed}</Alert>;
    }
    return (
      <Stack spacing={3} sx={{ pt: 1, pb: 4 }}>
        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
        >
          <ScopeBar
            scope={view.scope}
            options={view.options}
            onChange={changeScope}
          />
          {live}
        </Stack>
        <StatusHeader
          summary={view.summary}
          checks={view.checks}
          groups={view.groups}
          outsideClusters={view.outsideClusters}
          fleetEmpty={view.fleetEmpty}
          off={off}
          incomplete={failed.length > 0 || pending.length > 0}
        />
        <Stack spacing={2.5}>
          <NeedsAttention
            items={view.attention}
            failed={failed}
            now={view.now}
          />
          <FleetHealth rows={view.rows} by={by} onByChange={changeBy} />
        </Stack>
      </Stack>
    );
  };

  return (
    <Page title={Messages.pageTitle} hideTitle surface="canvas" maxWidth={1320}>
      {renderContent()}
    </Page>
  );
};
