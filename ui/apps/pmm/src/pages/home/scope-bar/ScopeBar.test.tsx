import { fireEvent, render, screen } from '@testing-library/react';
import { TestWrapper } from 'utils/testWrapper';
import { ScopeBar } from './ScopeBar';

const OPTIONS = {
  technology: ['mongodb', 'mysql'],
  environment: ['prod', 'staging'],
  region: ['eu-west-1'],
  application: [],
};

describe('ScopeBar', () => {
  it('sets and clears a scope value', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TestWrapper>
        <ScopeBar scope={{}} options={OPTIONS} onChange={onChange} />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText('Environment'), {
      target: { value: 'prod' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ environment: 'prod' });

    rerender(
      <TestWrapper>
        <ScopeBar
          scope={{ environment: 'prod' }}
          options={OPTIONS}
          onChange={onChange}
        />
      </TestWrapper>
    );
    fireEvent.change(screen.getByLabelText('Environment'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('keeps every dimension visible and disables the empty ones', () => {
    render(
      <TestWrapper>
        <ScopeBar scope={{}} options={OPTIONS} onChange={vi.fn()} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Technology')).toBeEnabled();
    expect(screen.getByLabelText('Application')).toBeDisabled();
  });
});
