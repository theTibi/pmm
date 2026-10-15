import { FC } from 'react';
import {
  Box,
  Card,
  CardContent,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ClusterState, FleetDimension, FleetRow } from 'types/home.types';
import { technologyLabel } from '../utils/clusters';
import { FLEET_DIMENSIONS } from '../utils/scope';
import { Messages } from '../HomePage.messages';
import { INVENTORY_SERVICES_URL } from '../HomePage.constants';
import { STATE_COLORS } from '../HomePage.styles';

export interface FleetHealthProps {
  rows: FleetRow[];
  by: FleetDimension;
  onByChange: (by: FleetDimension) => void;
}

const STATES: ClusterState[] = ['critical', 'warning', 'notice', 'healthy'];

const rowName = (row: FleetRow, by: FleetDimension): string => {
  if (row.folded) {
    return Messages.foldedRow(row.folded, by);
  }
  if (!row.name) {
    return Messages.noValue[by];
  }
  return by === 'technology' ? technologyLabel(row.name) : row.name;
};

const HealthBar: FC<{ counts: FleetRow['counts'] }> = ({ counts }) => (
  <Box
    role="img"
    aria-label={STATES.map((s) => `${counts[s]} ${Messages.states[s]}`).join(', ')}
    sx={{
      display: 'flex',
      gap: '2px',
      height: 8,
      minWidth: 120,
      borderRadius: 1,
      overflow: 'hidden',
    }}
  >
    {STATES.filter((s) => counts[s] > 0).map((s) => (
      <Box
        key={s}
        sx={{ flexGrow: counts[s], minWidth: 4, bgcolor: STATE_COLORS[s] }}
      />
    ))}
  </Box>
);

const CountCell: FC<{ value: number }> = ({ value }) => (
  <TableCell align="right" sx={{ color: value ? 'text.primary' : 'text.secondary' }}>
    {value || '—'}
  </TableCell>
);

export const FleetHealth: FC<FleetHealthProps> = ({
  rows,
  by,
  onByChange,
}) => (
  <Card variant="outlined">
    <CardContent>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h5" component="h2">
          {Messages.fleetHealth}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={by}
          aria-label={Messages.by}
          onChange={(_, value: FleetDimension | null) => value && onByChange(value)}
        >
          {FLEET_DIMENSIONS.map((dimension) => (
            <ToggleButton key={dimension} value={dimension}>
              {Messages.dimensions[dimension]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
      <TableContainer sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{Messages.dimensions[by]}</TableCell>
              <TableCell align="right">{Messages.columns.clusters}</TableCell>
              <TableCell align="right">{Messages.columns.instances}</TableCell>
              <TableCell>{Messages.columns.health}</TableCell>
              <TableCell align="right">{Messages.severity.critical}</TableCell>
              <TableCell align="right">{Messages.severity.warning}</TableCell>
              <TableCell align="right">{Messages.severity.notice}</TableCell>
              <TableCell align="right">{Messages.columns.healthy}</TableCell>
              <TableCell>{Messages.columns.topIssue}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.folded ? 'folded' : row.name}>
                <TableCell>{rowName(row, by)}</TableCell>
                <TableCell align="right">{row.clusters}</TableCell>
                <TableCell align="right">{row.instances}</TableCell>
                <TableCell sx={{ width: '25%' }}>
                  <HealthBar counts={row.counts} />
                </TableCell>
                <CountCell value={row.counts.critical} />
                <CountCell value={row.counts.warning} />
                <CountCell value={row.counts.notice} />
                <CountCell value={row.counts.healthy} />
                <TableCell>{Messages.topIssue(row.topIssue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Link
        component={RouterLink}
        to={INVENTORY_SERVICES_URL}
        sx={{ display: 'inline-block', mt: 1.5 }}
      >
        {Messages.allClusters}
      </Link>
    </CardContent>
  </Card>
);
