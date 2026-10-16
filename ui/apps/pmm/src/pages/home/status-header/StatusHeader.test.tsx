import { render, screen } from '@testing-library/react';
import { HomeChecks, HomeSummary } from 'types/home.types';
import { TestWrapper } from 'utils/testWrapper';
import { StatusHeader } from './StatusHeader';

const HEALTHY: HomeSummary = {
  clusters: 2,
  counts: { critical: 0, warning: 0, notice: 0, healthy: 2 },
  instances: 3,
  instancesReporting: 3,
};
const CHECKS: HomeChecks = {
  alertRules: 6,
  firing: 0,
  advisorServices: 0,
  backups: { total: 1, ok: 1 },
};

const renderHeader = (
  props: Partial<Parameters<typeof StatusHeader>[0]> = {}
) =>
  render(
    <TestWrapper>
      <StatusHeader
        summary={HEALTHY}
        checks={CHECKS}
        groups={0}
        outsideClusters={0}
        fleetEmpty={false}
        off={[]}
        incomplete={false}
        {...props}
      />
    </TestWrapper>
  );

describe('StatusHeader', () => {
  it('says All clear for a healthy, fully loaded fleet', () => {
    renderHeader();

    expect(
      screen.getByRole('heading', { name: 'All clear' })
    ).toBeInTheDocument();
    expect(screen.getByText('3 of 3 instances reporting')).toBeInTheDocument();
  });

  it('says No known problems when a source failed', () => {
    renderHeader({ incomplete: true });

    expect(
      screen.getByRole('heading', { name: 'No known problems' })
    ).toBeInTheDocument();
  });

  it('says how many clusters need attention and in how many groups', () => {
    renderHeader({
      summary: {
        ...HEALTHY,
        clusters: 4,
        counts: { critical: 1, warning: 2, notice: 1, healthy: 0 },
      },
      groups: 3,
    });

    expect(
      screen.getByRole('heading', {
        name: '4 clusters need attention, in 3 groups',
      })
    ).toBeInTheDocument();
  });

  it('says No databases monitored yet and links to add one', () => {
    renderHeader({
      summary: { ...HEALTHY, clusters: 0, instances: 0, instancesReporting: 0 },
      fleetEmpty: true,
    });

    expect(
      screen.getByRole('heading', { name: 'No databases monitored yet' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Add a database' })
    ).toHaveAttribute('href', '/graph/add-instance');
  });

  it('says nothing matches when the filters leave no clusters', () => {
    renderHeader({
      summary: { ...HEALTHY, clusters: 0, instances: 0, instancesReporting: 0 },
    });

    expect(
      screen.getByRole('heading', { name: 'Nothing matches these filters' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute(
      'href',
      '/home'
    );
  });

  it('does not say All clear while problems outside any cluster are shown', () => {
    renderHeader({ outsideClusters: 2 });

    expect(
      screen.getByRole('heading', { name: '2 problems outside any cluster' })
    ).toBeInTheDocument();
  });

  it('names the size of the scope above the title', () => {
    renderHeader();

    expect(screen.getByText('2 clusters · 3 instances')).toBeInTheDocument();
  });

  it('shows unknown for a check whose source failed', () => {
    renderHeader({ checks: { ...CHECKS, firing: null, backups: null } });

    expect(
      screen.getByText('6 alert rules, unknown firing')
    ).toBeInTheDocument();
    expect(screen.getByText('Backups: unknown')).toBeInTheDocument();
  });
});
