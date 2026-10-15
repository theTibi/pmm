import { render, screen, within } from '@testing-library/react';
import { AttentionItem } from 'types/home.types';
import { TestWrapper } from 'utils/testWrapper';
import { NeedsAttention } from './NeedsAttention';

const NOW = new Date('2026-10-15T10:08:00Z');

const item = (over: Partial<AttentionItem>): AttentionItem => ({
  id: 'alert:lag',
  kind: 'alert',
  severity: 'critical',
  ruleName: 'lag',
  clusterKeys: ['k1'],
  clusters: 1,
  instances: 1,
  since: '2026-10-15T09:40:00Z',
  commonLabels: {},
  startedTogether: false,
  ...over,
});

const renderList = (
  items: AttentionItem[],
  failed: Parameters<typeof NeedsAttention>[0]['failed'] = []
) =>
  render(
    <TestWrapper>
      <NeedsAttention items={items} failed={failed} now={NOW} />
    </TestWrapper>
  );

describe('NeedsAttention', () => {
  it('renders attention rows in order with links to their pages', () => {
    renderList([
      item({
        commonLabels: { region: 'eu-west-1' },
        startedTogether: true,
        clusters: 19,
        instances: 27,
      }),
      item({
        id: 'backup',
        kind: 'backup',
        severity: 'warning',
        ruleName: undefined,
        location: 's3-main',
      }),
    ]);

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('lag on 19 clusters')).toBeInTheDocument();
    expect(
      within(rows[0]).getByText(
        '27 instances · region: eu-west-1 · started together'
      )
    ).toBeInTheDocument();
    expect(
      within(rows[0]).getByText('since 28 minutes ago')
    ).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/graph/alerting/list'
    );
    expect(
      within(rows[1]).getByText('Backups failed on 1 cluster in the last 24 h')
    ).toBeInTheDocument();
    expect(within(rows[1]).getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/graph/backup/inventory'
    );
  });

  it('says Nothing needs attention when there are no items', () => {
    renderList([]);

    expect(screen.getByText('Nothing needs attention')).toBeInTheDocument();
  });

  it('shows 10 rows and "2 more in Alerting" for 12 items', () => {
    renderList(
      Array.from({ length: 12 }, (_, i) =>
        item({ id: `alert:r${i}`, ruleName: `r${i}` })
      )
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(
      screen.getByRole('link', { name: '2 more in Alerting' })
    ).toHaveAttribute('href', '/graph/alerting/list');
  });

  it('warns inline which sources failed to load', () => {
    renderList([], ['alerts', 'backups']);

    expect(
      screen.getByText(
        "Couldn't load alerts and backups; problems from them may be missing"
      )
    ).toBeInTheDocument();
  });
});
