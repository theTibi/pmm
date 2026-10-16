import { FC } from 'react';
import {
  Box,
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
import { ClusterState, FleetDimension, FleetRow } from 'types/home.types';
import { ConsoleTokens, useConsoleTokens } from 'theme';
import { technologyLabel } from '../utils/clusters';
import { FLEET_DIMENSIONS } from '../utils/scope';
import { Messages } from '../HomePage.messages';
import { INVENTORY_SERVICES_URL } from '../HomePage.constants';
import {
  monoSx,
  sectionHeadSx,
  sectionSx,
  severityTokens,
} from '../HomePage.styles';
import { ArrowLink } from '../arrow-link/ArrowLink';

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

const worstState = (row: FleetRow): ClusterState =>
  STATES.find((s) => s !== 'healthy' && row.counts[s] > 0) ?? 'healthy';

const HealthBar: FC<{ counts: FleetRow['counts']; t: ConsoleTokens }> = ({
  counts,
  t,
}) => (
  <Box
    role="img"
    aria-label={STATES.map((s) => `${counts[s]} ${Messages.states[s]}`).join(
      ', '
    )}
    sx={{
      display: 'flex',
      gap: '2px',
      height: 8,
      minWidth: 120,
      borderRadius: '3px',
      overflow: 'hidden',
    }}
  >
    {STATES.filter((s) => counts[s] > 0).map((s) => (
      <Box
        key={s}
        sx={{
          flexGrow: counts[s],
          minWidth: 4,
          bgcolor: severityTokens(t, s).main,
        }}
      />
    ))}
  </Box>
);

const CountCell: FC<{
  value: number;
  state: ClusterState;
  t: ConsoleTokens;
}> = ({ value, state, t }) => {
  const sev = severityTokens(t, state);
  const pill = value > 0 && (state === 'critical' || state === 'warning');

  return (
    <TableCell align="right">
      <Box
        component="span"
        sx={{
          ...monoSx,
          display: 'inline-flex',
          justifyContent: 'center',
          minWidth: 26,
          px: 0.75,
          py: '1px',
          borderRadius: '4px',
          fontSize: 12,
          fontWeight: pill ? 600 : 400,
          color: value ? (pill ? sev.text : t.textSecondary) : t.textFaint,
          bgcolor: pill ? sev.soft : 'transparent',
        }}
      >
        {value || '—'}
      </Box>
    </TableCell>
  );
};

export const FleetHealth: FC<FleetHealthProps> = ({ rows, by, onByChange }) => {
  const t = useConsoleTokens();
  const head = { ...monoSx, fontSize: 11, color: t.textFaint, py: 1 };

  return (
    <Box component="section" aria-labelledby="home-fleet" sx={sectionSx(t)}>
      <Box sx={sectionHeadSx(t)}>
        <Stack
          direction="row"
          alignItems="baseline"
          flexWrap="wrap"
          gap="4px 12px"
        >
          <Typography
            id="home-fleet"
            component="h2"
            sx={{ fontSize: 14, fontWeight: 600, color: t.text }}
          >
            {Messages.fleetHealth}
          </Typography>
          <Typography sx={{ ...monoSx, fontSize: 12, color: t.textFaint }}>
            {Messages.fleetHint(by)}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography sx={{ ...monoSx, fontSize: 12, color: t.textFaint }}>
            {Messages.by}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={by}
            aria-label={Messages.by}
            onChange={(_, value: FleetDimension | null) =>
              value && onByChange(value)
            }
            sx={{
              gap: 0.5,
              flexWrap: 'wrap',
              '& .MuiToggleButtonGroup-grouped': {
                m: 0,
                height: 30,
                px: 1.25,
                border: '1px solid transparent',
                borderRadius: '6px !important',
                fontSize: 13,
                fontWeight: 500,
                color: t.textMuted,
                '&:hover': { bgcolor: t.hover, color: t.text },
                '&.Mui-selected, &.Mui-selected:hover': {
                  bgcolor: t.raised,
                  borderColor: t.borderStrong,
                  color: t.text,
                },
              },
            }}
          >
            {FLEET_DIMENSIONS.map((dimension) => (
              <ToggleButton key={dimension} value={dimension}>
                {Messages.dimensions[dimension]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Box>
      <TableContainer>
        <Table
          size="small"
          sx={{
            minWidth: 900,
            '& .MuiTableCell-root': { borderColor: t.border, px: 2.25 },
            '& .MuiTableBody-root .MuiTableRow-root:hover': {
              bgcolor: t.hover,
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={head}>{Messages.dimensions[by]}</TableCell>
              <TableCell sx={head} align="right">
                {Messages.columns.clusters}
              </TableCell>
              <TableCell sx={head} align="right">
                {Messages.columns.instances}
              </TableCell>
              <TableCell sx={head}>{Messages.columns.health}</TableCell>
              <TableCell sx={head} align="right">
                {Messages.severity.critical}
              </TableCell>
              <TableCell sx={head} align="right">
                {Messages.severity.warning}
              </TableCell>
              <TableCell sx={head} align="right">
                {Messages.severity.notice}
              </TableCell>
              <TableCell sx={head} align="right">
                {Messages.columns.healthy}
              </TableCell>
              <TableCell sx={head}>{Messages.columns.topIssue}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const worst = worstState(row);
              return (
                <TableRow key={row.folded ? 'folded' : row.name}>
                  <TableCell
                    sx={{
                      height: 44,
                      fontSize: 14,
                      fontWeight: 500,
                      color: t.text,
                    }}
                  >
                    {rowName(row, by)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...monoSx, fontSize: 12, color: t.textSecondary }}
                  >
                    {row.clusters}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ ...monoSx, fontSize: 12, color: t.textMuted }}
                  >
                    {row.instances}
                  </TableCell>
                  <TableCell sx={{ width: '26%' }}>
                    <HealthBar counts={row.counts} t={t} />
                  </TableCell>
                  <CountCell
                    value={row.counts.critical}
                    state="critical"
                    t={t}
                  />
                  <CountCell value={row.counts.warning} state="warning" t={t} />
                  <CountCell value={row.counts.notice} state="notice" t={t} />
                  <CountCell value={row.counts.healthy} state="healthy" t={t} />
                  <TableCell
                    sx={{
                      fontSize: 13,
                      color:
                        worst === 'healthy'
                          ? t.textFaint
                          : severityTokens(t, worst).text,
                    }}
                  >
                    {Messages.topIssue(row.topIssue)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap="8px 16px"
        sx={{ px: 2.25 }}
      >
        <Typography sx={{ ...monoSx, fontSize: 12, color: t.textFaint }}>
          {Messages.fleetFooter}
        </Typography>
        <ArrowLink to={INVENTORY_SERVICES_URL}>
          {Messages.allClusters}
        </ArrowLink>
      </Stack>
    </Box>
  );
};
