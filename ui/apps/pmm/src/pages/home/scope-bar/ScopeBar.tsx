import { FC } from 'react';
import { Stack, TextField } from '@mui/material';
import { FleetDimension, HomeScope } from 'types/home.types';
import { technologyLabel } from '../utils/clusters';
import { FLEET_DIMENSIONS } from '../utils/scope';
import { Messages } from '../HomePage.messages';

export interface ScopeBarProps {
  scope: HomeScope;
  options: Record<FleetDimension, string[]>;
  onChange: (scope: HomeScope) => void;
}

export const ScopeBar: FC<ScopeBarProps> = ({ scope, options, onChange }) => {
  const change = (dimension: FleetDimension, value: string) => {
    const next = { ...scope };
    if (value) {
      next[dimension] = value;
    } else {
      delete next[dimension];
    }
    onChange(next);
  };

  return (
    <Stack direction="row" flexWrap="wrap" gap={1.5}>
      {FLEET_DIMENSIONS.map((dimension) => (
        <TextField
          key={dimension}
          id={`home-scope-${dimension}`}
          select
          size="small"
          label={Messages.dimensions[dimension]}
          value={scope[dimension] ?? ''}
          disabled={!options[dimension].length}
          onChange={(e) => change(dimension, e.target.value)}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 160 }}
        >
          <option value="">{Messages.all}</option>
          {options[dimension].map((value) => (
            <option key={value} value={value}>
              {dimension === 'technology' ? technologyLabel(value) : value}
            </option>
          ))}
        </TextField>
      ))}
    </Stack>
  );
};
