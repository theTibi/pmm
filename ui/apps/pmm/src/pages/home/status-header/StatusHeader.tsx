import { FC } from 'react';
import { Box, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ClusterState, HomeChecks, HomeSummary } from 'types/home.types';
import { Messages } from '../HomePage.messages';
import { ADD_INSTANCE_URL } from '../HomePage.constants';
import { STATE_COLORS } from '../HomePage.styles';

export interface StatusHeaderProps {
  summary: HomeSummary;
  checks: HomeChecks;
  groups: number;
  incomplete: boolean;
}

const STATES: ClusterState[] = ['critical', 'warning', 'notice', 'healthy'];

const headingFor = ({
  summary,
  groups,
  incomplete,
}: StatusHeaderProps): string => {
  const problems =
    summary.counts.critical + summary.counts.warning + summary.counts.notice;
  if (summary.instances === 0) {
    return Messages.noDatabases;
  }
  if (problems > 0) {
    return Messages.needAttention(problems, groups);
  }
  return incomplete ? Messages.noKnownProblems : Messages.allClear;
};

export const StatusHeader: FC<StatusHeaderProps> = (props) => {
  const { summary, checks } = props;

  return (
    <Stack spacing={1.5}>
      <Typography variant="h3" component="h1">
        {headingFor(props)}
      </Typography>
      {summary.instances === 0 ? (
        <Link component={RouterLink} to={ADD_INSTANCE_URL}>
          {Messages.addDatabase}
        </Link>
      ) : (
        <>
          <Stack direction="row" flexWrap="wrap" columnGap={2.5} rowGap={1}>
            {STATES.map((state) => (
              <Stack key={state} direction="row" alignItems="center" gap={0.75}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: 0.5,
                    bgcolor: summary.counts[state]
                      ? STATE_COLORS[state]
                      : 'action.disabledBackground',
                  }}
                />
                <Typography
                  variant="body2"
                  color={summary.counts[state] ? 'text.primary' : 'text.secondary'}
                >
                  {`${summary.counts[state]} ${Messages.states[state]}`}
                </Typography>
              </Stack>
            ))}
            <Typography variant="body2" color="text.secondary">
              {Messages.instancesReporting(
                summary.instancesReporting,
                summary.instances
              )}
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" columnGap={2.5} rowGap={0.5}>
            <Typography variant="body2" color="text.secondary">
              {Messages.checked}
            </Typography>
            <Typography variant="body2">
              {Messages.checkedAlerts(checks.alertRules, checks.firing)}
            </Typography>
            <Typography variant="body2">
              {Messages.checkedAdvisors(checks.advisorServices)}
            </Typography>
            <Typography variant="body2">
              {Messages.checkedBackups(checks.backups)}
            </Typography>
          </Stack>
        </>
      )}
    </Stack>
  );
};
