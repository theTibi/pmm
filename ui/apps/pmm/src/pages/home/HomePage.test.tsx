import { act, render, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { format } from 'date-fns';
import {
  wrapWithQueryProvider,
  wrapWithSettings,
  wrapWithUpdatesProvider,
} from 'utils/testUtils';
import { TestWrapper } from 'utils/testWrapper';
import { TEST_USER_VIEWER } from 'utils/testStubs';
import { Settings } from 'types/settings.types';
import { User } from 'types/user.types';
import { PrometheusAlertRulesResponse } from 'types/alerting.types';
import { ManagedService } from 'types/services.types';
import { safeLocalStorage } from 'utils/storage.utils';
import { alert, artifact, node, summary, svc } from './utils/test-fixtures';
import { FLEET_BY_STORAGE_KEY, HOME_REFRESH_MS } from './HomePage.constants';
import { HomePage } from './HomePage';

const mocks = vi.hoisted(() => ({
  listManagedServices: vi.fn(),
  listManagedNodes: vi.fn(),
  getActiveAlerts: vi.fn(),
  getPrometheusAlertRules: vi.fn(),
  listFailedServices: vi.fn(),
  listBackupArtifacts: vi.fn(),
}));

vi.mock('api/services', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listManagedServices: () => mocks.listManagedServices(),
}));
vi.mock('api/nodes', () => ({
  listManagedNodes: () => mocks.listManagedNodes(),
}));
vi.mock('api/alerting', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getActiveAlerts: () => mocks.getActiveAlerts(),
  getPrometheusAlertRules: () => mocks.getPrometheusAlertRules(),
}));
vi.mock('api/advisors', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listFailedServices: () => mocks.listFailedServices(),
}));
vi.mock('api/backups', () => ({
  listBackupArtifacts: () => mocks.listBackupArtifacts(),
}));

const RULES: PrometheusAlertRulesResponse = {
  data: {
    groups: [
      {
        rules: [
          { name: 'MySQL down', type: 'alerting', alerts: [] },
          { name: 'Replication lag', type: 'alerting', alerts: [] },
        ],
      },
    ],
  },
};

const FLEET: ManagedService[] = [
  svc({ serviceName: 'orders-1', cluster: 'orders', environment: 'prod' }),
  svc({ serviceName: 'orders-2', cluster: 'orders', environment: 'prod' }),
  svc({
    serviceName: 'catalog-1',
    serviceType: 'postgresql',
    environment: 'staging',
  }),
];

const givenSources = (services: ManagedService[] = FLEET) => {
  mocks.listManagedServices.mockResolvedValue({ services });
  mocks.listManagedNodes.mockResolvedValue([node()]);
  mocks.getActiveAlerts.mockResolvedValue([]);
  mocks.getPrometheusAlertRules.mockResolvedValue(RULES);
  mocks.listFailedServices.mockResolvedValue([]);
  mocks.listBackupArtifacts.mockResolvedValue([]);
};

const FEATURES_ON: Partial<Settings> = {
  advisorEnabled: true,
  backupManagementEnabled: true,
};

const renderPage = (
  url = '/home',
  {
    settings = FEATURES_ON,
    user,
  }: { settings?: Partial<Settings>; user?: User } = {}
) =>
  render(
    wrapWithQueryProvider(
      wrapWithUpdatesProvider(
        wrapWithSettings(
          <TestWrapper
            routerProps={{ initialEntries: [url] }}
            {...(user && { userContext: { isLoading: false, user } })}
          >
            <Routes>
              <Route path="/home" element={<HomePage />} />
              <Route path="/graph/" element={<p>Grafana home</p>} />
            </Routes>
          </TestWrapper>,
          { settings }
        )
      )
    )
  );

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    givenSources();
  });

  it('shows All clear and Nothing needs attention for a healthy fleet', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'All clear' })
    ).toBeInTheDocument();
    expect(screen.getByText('Nothing needs attention')).toBeInTheDocument();
    expect(screen.getByText('2 alert rules, 0 firing')).toBeInTheDocument();
  });

  it('shows a critical alert row and "1 cluster needs attention, in 1 group"', async () => {
    mocks.getActiveAlerts.mockResolvedValue([
      alert({
        alertname: 'MySQL down',
        severity: 'critical',
        service_name: 'orders-1',
      }),
    ]);

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '1 cluster needs attention, in 1 group',
      })
    ).toBeInTheDocument();
    const row = screen.getByText('MySQL down on 1 cluster').closest('li')!;
    expect(within(row).getByText('CRIT')).toBeInTheDocument();
  });

  it('shows No known problems and unknown when alerts fail to load', async () => {
    mocks.getActiveAlerts.mockRejectedValue(new Error('403'));

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No known problems',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('2 alert rules, unknown firing')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Couldn't load alerts; problems from them may be missing"
      )
    ).toBeInTheDocument();
  });

  it('shows No databases monitored yet when there are no services', async () => {
    givenSources([]);

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No databases monitored yet',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Add a database' })
    ).toBeInTheDocument();
  });

  it('counts only staging clusters when the URL has ?environment=staging', async () => {
    renderPage('/home?environment=staging');

    expect(
      await screen.findByText('1 of 1 instance reporting')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Environment: staging' })
    ).toBeInTheDocument();
  });

  it('checks only Advisor results and backups of services in scope', async () => {
    const prod = FLEET[0].serviceId;
    mocks.listFailedServices.mockResolvedValue([
      summary({ serviceId: prod, warningCount: 1 }),
    ]);
    mocks.listBackupArtifacts.mockResolvedValue([
      artifact({ serviceId: prod, createdAt: new Date().toISOString() }),
    ]);

    renderPage('/home?environment=staging');

    expect(
      await screen.findByText('0 services with Advisor findings')
    ).toBeInTheDocument();
    expect(screen.getByText('No backups in the last 24 h')).toBeInTheDocument();
  });

  it('restores the fleet dimension from local storage', async () => {
    safeLocalStorage.setItem(FLEET_BY_STORAGE_KEY, 'environment');

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Environment', pressed: true })
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'staging' })).toBeInTheDocument();
  });

  it('shows an error instead of the blocks when services fail to load', async () => {
    mocks.listManagedServices.mockRejectedValue(new Error('500'));

    renderPage();

    expect(
      await screen.findByText("Couldn't load the monitored services")
    ).toBeInTheDocument();
    expect(screen.queryByText('Fleet health')).not.toBeInTheDocument();
  });

  it('sends users who are not PMM admins to the Grafana home', async () => {
    renderPage('/home', { user: TEST_USER_VIEWER });

    expect(await screen.findByText('Grafana home')).toBeInTheDocument();
    expect(mocks.listManagedServices).not.toHaveBeenCalled();
  });

  it('does not say All clear above a PMM Server alert', async () => {
    mocks.getActiveAlerts.mockResolvedValue([
      alert({ alertname: 'grafana_down', severity: 'critical' }),
    ]);

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '1 problem outside any cluster',
      })
    ).toBeInTheDocument();
  });

  it('keeps an alert that is ambiguous across environments out of a scoped view', async () => {
    givenSources([
      ...FLEET,
      svc({
        serviceName: 'orders-stg',
        cluster: 'orders',
        environment: 'staging',
      }),
    ]);
    mocks.getActiveAlerts.mockResolvedValue([
      alert({
        alertname: 'no_primary',
        cluster: 'orders',
        severity: 'critical',
      }),
    ]);

    renderPage('/home?environment=prod');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'All clear' })
    ).toBeInTheDocument();
  });

  it('says nothing matches when the filters leave no clusters', async () => {
    renderPage('/home?environment=staging&technology=mysql');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Nothing matches these filters',
      })
    ).toBeInTheDocument();
  });

  it('does not say All clear while alerts are still loading', async () => {
    mocks.getActiveAlerts.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'No known problems',
      })
    ).toBeInTheDocument();
  });

  it('does not query Advisors or backups when they are turned off', async () => {
    renderPage('/home', {
      settings: { advisorEnabled: false, backupManagementEnabled: false },
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'All clear' })
    ).toBeInTheDocument();
    expect(screen.getByText('Advisors: off')).toBeInTheDocument();
    expect(screen.getByText('Backups: off')).toBeInTheDocument();
    expect(mocks.listFailedServices).not.toHaveBeenCalled();
    expect(mocks.listBackupArtifacts).not.toHaveBeenCalled();
  });

  it('moves the since time forward when unchanged data refreshes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-15T10:10:00Z'));
    mocks.getActiveAlerts.mockResolvedValue([
      alert(
        { alertname: 'lag', service_name: 'orders-1' },
        '2026-10-15T10:08:00Z'
      ),
    ]);

    try {
      renderPage();
      expect(await screen.findByText(/^2m · /)).toBeInTheDocument();

      vi.setSystemTime(new Date('2026-10-15T10:19:00Z'));
      await act(() => vi.advanceTimersByTimeAsync(HOME_REFRESH_MS));

      const startedAt = format(new Date('2026-10-15T10:08:00Z'), 'HH:mm');
      expect(
        await screen.findByText(new RegExp(`^1\\dm · ${startedAt}$`))
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
