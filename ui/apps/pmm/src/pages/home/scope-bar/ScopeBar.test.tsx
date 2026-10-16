import { fireEvent, render, screen } from '@testing-library/react';
import { TestWrapper } from 'utils/testWrapper';
import { ScopeBar } from './ScopeBar';

const OPTIONS = {
  technology: ['mongodb', 'mysql'],
  environment: ['prod', 'staging'],
  region: ['eu-west-1'],
  application: [],
};

const renderBar = (
  scope: Parameters<typeof ScopeBar>[0]['scope'],
  onChange = vi.fn()
) =>
  render(
    <TestWrapper>
      <ScopeBar scope={scope} options={OPTIONS} onChange={onChange} />
    </TestWrapper>
  );

describe('ScopeBar', () => {
  it('sets a scope value from the pill menu', () => {
    const onChange = vi.fn();
    renderBar({}, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'Environment: all' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'prod' }));

    expect(onChange).toHaveBeenLastCalledWith({ environment: 'prod' });
  });

  it('shows the chosen value on the pill and clears it with All', () => {
    const onChange = vi.fn();
    renderBar({ environment: 'prod' }, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'Environment: prod' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'All' }));

    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('shows technologies by their display name', () => {
    renderBar({});

    fireEvent.click(screen.getByRole('button', { name: 'Technology: all' }));

    expect(screen.getByRole('menuitem', { name: 'MySQL' })).toBeInTheDocument();
  });

  it('keeps every dimension visible and disables the empty ones', () => {
    renderBar({});

    expect(
      screen.getByRole('button', { name: 'Technology: all' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Application: all' })
    ).toBeDisabled();
  });
});
