import { ClusterState } from 'types/home.types';
import { ConsoleTokens, FONT_MONO } from 'theme';

export const severityTokens = (t: ConsoleTokens, state: ClusterState) =>
  ({
    critical: t.critical,
    warning: t.warning,
    notice: t.notice,
    healthy: t.healthy,
  })[state];

export const monoSx = { fontFamily: FONT_MONO } as const;

export const labelSx = (t: ConsoleTokens) => ({
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: t.textFaint,
});

export const sectionSx = (t: ConsoleTokens) => ({
  bgcolor: t.surface,
  border: `1px solid ${t.border}`,
  borderRadius: '10px',
  overflow: 'hidden',
});

export const sectionHeadSx = (t: ConsoleTokens) => ({
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '6px 16px',
  px: 2.25,
  py: 1.25,
  minHeight: 52,
  borderBottom: `1px solid ${t.border}`,
});
