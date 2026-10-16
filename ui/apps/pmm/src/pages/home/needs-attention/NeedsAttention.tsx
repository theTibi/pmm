import { FC } from 'react';
import { Box, List, ListItem, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { AttentionItem, HomeSource } from 'types/home.types';
import { useConsoleTokens } from 'theme';
import { Messages } from '../HomePage.messages';
import {
  ALERTING_LIST_URL,
  ATTENTION_LINKS,
  MAX_ATTENTION_ROWS,
} from '../HomePage.constants';
import {
  monoSx,
  sectionHeadSx,
  sectionSx,
  severityTokens,
} from '../HomePage.styles';
import { ArrowLink } from '../arrow-link/ArrowLink';

export interface NeedsAttentionProps {
  items: AttentionItem[];
  failed: HomeSource[];
  now: Date;
}

export const NeedsAttention: FC<NeedsAttentionProps> = ({
  items,
  failed,
  now,
}) => {
  const t = useConsoleTokens();
  const visible = items.slice(0, MAX_ATTENTION_ROWS);
  const hidden = items.length - visible.length;

  return (
    <Box component="section" aria-labelledby="home-attention" sx={sectionSx(t)}>
      <Box sx={sectionHeadSx(t)}>
        <Typography
          id="home-attention"
          component="h2"
          sx={{ fontSize: 14, fontWeight: 600, color: t.text }}
        >
          {Messages.needsAttention}
        </Typography>
        <Typography sx={{ ...monoSx, fontSize: 12, color: t.textFaint }}>
          {Messages.attentionHint}
        </Typography>
      </Box>
      {failed.length > 0 && (
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            px: 2.25,
            py: 1.25,
            fontSize: 13,
            color: t.warning.text,
            bgcolor: t.warning.soft,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
          {Messages.sourcesFailed(failed)}
        </Stack>
      )}
      {items.length === 0 ? (
        <Stack
          direction="row"
          alignItems="center"
          gap={2}
          sx={{ px: 2.25, py: 2.5 }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: 28, color: t.healthy.text }}
          />
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 500, color: t.text }}>
              {Messages.nothingNeedsAttention}
            </Typography>
            <Typography sx={{ mt: 0.25, fontSize: 13.5, color: t.textMuted }}>
              {Messages.nothingDetail}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <List disablePadding>
          {visible.map((item) => {
            const sev = severityTokens(t, item.severity);
            const meta = Messages.attentionMeta(item);
            return (
              <ListItem
                key={item.id}
                disablePadding
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '12px 20px',
                  px: 2.25,
                  py: 1.5,
                  borderBottom: `1px solid ${t.border}`,
                  '&:last-of-type': { borderBottom: 0 },
                  '&:hover': { bgcolor: t.hover },
                }}
              >
                <Box sx={{ flex: '0 0 128px' }}>
                  <Box
                    component="span"
                    title={Messages.severity[item.severity]}
                    sx={{
                      ...monoSx,
                      display: 'inline-flex',
                      px: 0.875,
                      py: '1px',
                      borderRadius: '4px',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      color: sev.text,
                      bgcolor: sev.soft,
                    }}
                  >
                    {Messages.severityShort[item.severity]}
                  </Box>
                  {item.since && (
                    <Typography
                      sx={{
                        ...monoSx,
                        mt: 0.75,
                        fontSize: 12,
                        color: t.textFaint,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {Messages.since(item.since, now)}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ flex: '1 1 360px', minWidth: 0 }}>
                  <Typography
                    sx={{ fontSize: 15, fontWeight: 500, color: t.text }}
                  >
                    {Messages.attentionTitle(item)}
                  </Typography>
                  <Typography
                    sx={{ mt: 0.25, fontSize: 13.5, color: t.textMuted }}
                  >
                    {Messages.attentionDetail(item)}
                  </Typography>
                  {meta && (
                    <Typography
                      sx={{
                        ...monoSx,
                        mt: 0.75,
                        fontSize: 12,
                        color: t.textSecondary,
                      }}
                    >
                      {meta}
                    </Typography>
                  )}
                </Box>
                <ArrowLink to={ATTENTION_LINKS[item.kind]}>
                  {Messages.actions[item.kind]}
                </ArrowLink>
              </ListItem>
            );
          })}
        </List>
      )}
      {hidden > 0 && (
        <Box sx={{ px: 2.25, borderTop: `1px solid ${t.border}` }}>
          <ArrowLink to={ALERTING_LIST_URL}>
            {Messages.moreInAlerting(hidden)}
          </ArrowLink>
        </Box>
      )}
    </Box>
  );
};
