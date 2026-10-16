import { FC, MouseEvent, useState } from 'react';
import { Box, Button, Menu, MenuItem, Stack, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { FleetDimension, HomeScope } from 'types/home.types';
import { useConsoleTokens } from 'theme';
import { technologyLabel } from '../utils/clusters';
import { FLEET_DIMENSIONS } from '../utils/scope';
import { Messages } from '../HomePage.messages';
import { labelSx } from '../HomePage.styles';

export interface ScopeBarProps {
  scope: HomeScope;
  options: Record<FleetDimension, string[]>;
  onChange: (scope: HomeScope) => void;
}

const display = (dimension: FleetDimension, value: string) =>
  dimension === 'technology' ? technologyLabel(value) : value;

const ScopePill: FC<{
  dimension: FleetDimension;
  value?: string;
  options: string[];
  onPick: (value: string) => void;
}> = ({ dimension, value, options, onPick }) => {
  const t = useConsoleTokens();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const shown = value ? display(dimension, value) : '';
  const label = Messages.dimensions[dimension];

  const pick = (next: string) => {
    setAnchor(null);
    onPick(next);
  };

  return (
    <>
      <Button
        aria-label={Messages.scopePill(label, shown)}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        disabled={!options.length}
        onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: '16px !important' }} />}
        sx={{
          height: 32,
          px: 1.5,
          borderRadius: '16px',
          border: `1px solid ${value ? t.accent : t.border}`,
          bgcolor: value ? t.accentSoft : t.raised,
          color: t.text,
          fontSize: 13,
          fontWeight: 500,
          gap: 0.25,
          '& .MuiButton-endIcon': { ml: 0.5, color: t.textMuted },
          '&:hover': {
            bgcolor: value ? t.accentSoft : t.hover,
            borderColor: t.borderStrong,
          },
          '&.Mui-disabled': { color: t.textFaint, borderColor: t.border },
        }}
      >
        {label}
        <Box
          component="span"
          sx={{
            ml: 0.75,
            fontWeight: 400,
            color: value ? t.accent : t.textMuted,
          }}
        >
          {shown || Messages.all.toLowerCase()}
        </Box>
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { mt: 0.75, minWidth: 180 } } }}
      >
        <MenuItem selected={!value} onClick={() => pick('')}>
          {Messages.all}
        </MenuItem>
        {options.map((option) => (
          <MenuItem
            key={option}
            selected={option === value}
            onClick={() => pick(option)}
          >
            {display(dimension, option)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export const ScopeBar: FC<ScopeBarProps> = ({ scope, options, onChange }) => {
  const t = useConsoleTokens();

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
    <Stack
      role="group"
      aria-label={Messages.scope}
      direction="row"
      flexWrap="wrap"
      alignItems="center"
      gap={1}
    >
      <Typography component="span" sx={{ ...labelSx(t), mr: 0.5 }}>
        {Messages.scope}
      </Typography>
      {FLEET_DIMENSIONS.map((dimension) => (
        <ScopePill
          key={dimension}
          dimension={dimension}
          value={scope[dimension]}
          options={options[dimension]}
          onPick={(value) => change(dimension, value)}
        />
      ))}
    </Stack>
  );
};
