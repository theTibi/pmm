import { fireEvent, render, screen } from '@testing-library/react';
import { FleetRow } from 'types/home.types';
import { TestWrapper } from 'utils/testWrapper';
import { FleetHealth } from './FleetHealth';

const row = (over: Partial<FleetRow>): FleetRow => ({
  name: 'mysql',
  clusters: 2,
  instances: 3,
  counts: { critical: 1, warning: 0, notice: 0, healthy: 1 },
  folded: 0,
  ...over,
});

const renderFleet = (
  rows: FleetRow[],
  by: Parameters<typeof FleetHealth>[0]['by'] = 'technology',
  onByChange = vi.fn()
) =>
  render(
    <TestWrapper>
      <FleetHealth rows={rows} by={by} onByChange={onByChange} />
    </TestWrapper>
  );

describe('FleetHealth', () => {
  it('shows technologies by their display name', () => {
    renderFleet([row({})]);

    expect(screen.getByText('MySQL')).toBeInTheDocument();
  });

  it('labels an empty environment group "No environment"', () => {
    renderFleet([row({ name: '' })], 'environment');

    expect(screen.getByText('No environment')).toBeInTheDocument();
  });

  it('labels the folded row "3 more technologies"', () => {
    renderFleet([row({ name: '', folded: 3 })]);

    expect(screen.getByText('3 more technologies')).toBeInTheDocument();
  });

  it('calls onByChange with region when Region is chosen', () => {
    const onByChange = vi.fn();
    renderFleet([row({})], 'technology', onByChange);

    fireEvent.click(screen.getByRole('button', { name: 'Region' }));

    expect(onByChange).toHaveBeenCalledWith('region');
  });

  it('links to all clusters in Inventory', () => {
    renderFleet([row({})]);

    expect(screen.getByRole('link', { name: 'All clusters' })).toHaveAttribute(
      'href',
      '/graph/inventory/services'
    );
  });
});
