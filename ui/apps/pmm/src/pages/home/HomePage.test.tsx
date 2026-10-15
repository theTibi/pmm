import { render, screen, within } from '@testing-library/react';
import {
  wrapWithQueryProvider,
  wrapWithUpdatesProvider,
} from 'utils/testUtils';
import { TestWrapper } from 'utils/testWrapper';
import { PrometheusAlertRulesResponse } from 'types/alerting.types';
import { ManagedService } from 'types/services.types';
import { safeLocalStorage } from 'utils/storage.utils';
import { alert, node, svc } from './utils/test-fixtures';
import { FLEET_BY_STORAGE_KEY } from './HomePage.constants';
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

const renderPage = (url = '/home') =>
  render(
    wrapWithQueryProvider(
      wrapWithUpdatesProvider(
        <TestWrapper routerProps={{ initialEntries: [url] }}>
          <HomePage />
        </TestWrapper>
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
    expect(within(row).getByText('Critical')).toBeInTheDocument();
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
    expect(screen.getByLabelText('Environment')).toHaveValue('staging');
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
});
