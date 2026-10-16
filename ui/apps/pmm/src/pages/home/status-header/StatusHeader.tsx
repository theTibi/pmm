import { FC } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { PMM_HOME_PAGE_PATH } from 'lib/constants';
import {
  ClusterState,
  HomeChecks,
  HomeSource,
  HomeSummary,
} from 'types/home.types';
import { useConsoleTokens } from 'theme';
import { Messages } from '../HomePage.messages';
import { ADD_INSTANCE_URL } from '../HomePage.constants';
import { labelSx, monoSx, severityTokens } from '../HomePage.styles';
import { ArrowLink } from '../arrow-link/ArrowLink';

export interface StatusHeaderProps {
  summary: HomeSummary;
  checks: HomeChecks;
  groups: number;
  // Problem rows that belong to no cluster, such as PMM Server's own alerts.
  outsideClusters: number;
  fleetEmpty: boolean;
  // Sources turned off in settings.
  off: HomeSource[];
  incomplete: boolean;
}

const STATES: ClusterState[] = ['critical', 'warning', 'notice', 'healthy'];

const headingFor = ({
  summary,
  groups,
  outsideClusters,
  fleetEmpty,
  incomplete,
}: StatusHeaderProps): string => {
  const problems =
    summary.counts.critical + summary.counts.warning + summary.counts.notice;
  if (fleetEmpty) {
    return Messages.noDatabases;
  }
  if (summary.instances === 0) {
    return Messages.noMatch;
  }
  if (problems > 0) {
    return Messages.needAttention(problems, groups);
  }
  if (outsideClusters > 0) {
    return Messages.outsideClusters(outsideClusters);
  }
  return incomplete ? Messages.noKnownProblems : Messages.allClear;
};

export const StatusHeader: FC<StatusHeaderProps> = (props) => {
  const { summary, checks, fleetEmpty, off } = props;
  const t = useConsoleTokens();
  const empty = summary.instances === 0;

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="flex-end"
        justifyContent="space-between"
        sx={{ gap: '16px 32px' }}
      >
        <Box>
          {!empty && (
            <Typography sx={{ ...labelSx(t), fontSize: 12 }}>
              {Messages.overline(summary.clusters, summary.instances)}
            </Typography>
          )}
          <Typography
            variant="h1"
            sx={{
              mt: 0.75,
              fontSize: { xs: 26, md: 32 },
              lineHeight: 1.15,
              color: t.text,
            }}
          >
            {headingFor(props)}
          </Typography>
        </Box>
        {!empty && (
          <Stack
            direction="row"
            flexWrap="wrap"
            alignItems="center"
            sx={{ ...monoSx, fontSize: 13, gap: '8px 20px' }}
          >
            {STATES.map((state) => {
              const n = summary.counts[state];
              return (
                <Stack
                  key={state}
                  direction="row"
                  alignItems="center"
                  gap={0.875}
                  sx={{ color: n ? t.textSecondary : t.textFaint }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '2px',
                      bgcolor: n
                        ? severityTokens(t, state).main
                        : t.borderStrong,
                    }}
                  />
                  {`${n} ${Messages.states[state]}`}
                </Stack>
              );
            })}
            <Box component="span" sx={{ color: t.textFaint }}>
              {Messages.instancesReporting(
                summary.instancesReporting,
                summary.instances
              )}
            </Box>
          </Stack>
        )}
      </Stack>
      {empty ? (
        <Box>
          <ArrowLink to={fleetEmpty ? ADD_INSTANCE_URL : PMM_HOME_PAGE_PATH}>
            {fleetEmpty ? Messages.addDatabase : Messages.clearFilters}
          </ArrowLink>
        </Box>
      ) : (
        <Stack
          direction="row"
          flexWrap="wrap"
          sx={{ ...monoSx, fontSize: 12, color: t.textMuted, gap: '6px 20px' }}
        >
          <Box component="span" sx={{ color: t.textFaint }}>
            {Messages.checked}
          </Box>
          <span>
            {Messages.checkedAlerts(checks.alertRules, checks.firing)}
          </span>
          <span>
            {off.includes('advisors')
              ? Messages.advisorsOff
              : Messages.checkedAdvisors(checks.advisorServices)}
          </span>
          <span>
            {off.includes('backups')
              ? Messages.backupsOff
              : Messages.checkedBackups(checks.backups)}
          </span>
        </Stack>
      )}
    </Stack>
  );
};
