import { listItemTextClasses } from '@mui/material/ListItemText';
import { listItemIconClasses } from '@mui/material/ListItemIcon';
import { listItemButtonClasses } from '@mui/material/ListItemButton';
import { Theme } from '@mui/material';
import { consoleTokens, FONT_MONO } from 'theme';

export const getStyles = (
  theme: Theme,
  drawerOpen: boolean,
  level: number
) => {
  const t = consoleTokens(theme.palette.mode);

  return {
    row: {
      minHeight: level === 0 ? 36 : 32,
      py: 0.5,
      px: 1.25,
      mx: level === 0 ? (drawerOpen ? 1 : 0.75) : 0,
      borderRadius: '8px',
      fontSize: level === 0 ? 14 : 13.5,

      [`&, .${listItemIconClasses.root}`]: {
        color: level === 0 ? t.textSecondary : t.textMuted,
      },
      [`.${listItemIconClasses.root} .MuiSvgIcon-root`]: {
        fontSize: 20,
      },
      // Nested rows are text only, so items with and without icons line up.
      // peak-ui pulls icon-less rows left with a spacer box; nested rows drop both.
      ...(level > 0 && {
        [`.${listItemIconClasses.root}`]: { display: 'none' },
        '& > .MuiBox-root': { display: 'none' },
      }),
      [`.${listItemTextClasses.root}`]: {
        pl: level === 0 ? 1.5 : 0,
        my: 0,
        minWidth: 0,
      },
      [`.${listItemTextClasses.primary}`]: {
        fontSize: 'inherit',
        fontWeight: level === 0 ? 500 : 450,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      [`&.${listItemButtonClasses.selected}`]: {
        color: t.text,
        backgroundColor: t.selected,
      },
      [`&.${listItemButtonClasses.selected} .${listItemIconClasses.root}`]: {
        color: t.accent,
      },
    },
    // Leaves room for the chevron, which sits inside the row.
    // A parent shows its open child by colour only; the child carries the highlight.
    rowCollapsible: {
      ...(drawerOpen && { pr: 4.5 }),
      [`&.${listItemButtonClasses.selected}`]: {
        backgroundColor: 'transparent',
      },
    },
    chevron: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      p: 0.5,
      color: t.textFaint,
    },
    listCollapsible:
      level === 0
        ? {
            ml: 3.5,
            mr: 1,
            pl: 0.75,
            my: 0.25,
            borderLeft: `1px solid ${t.border}`,
          }
        : {
            ml: 1.5,
            pl: 0.75,
            borderLeft: `1px solid ${t.border}`,
          },
    section: {
      px: drawerOpen ? 2.25 : 1.5,
      pt: 2,
      pb: 0.5,
    },
    sectionText: {
      fontFamily: FONT_MONO,
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: t.textFaint,
    },
    spacer: {
      flex: 1,
      minHeight: 8,
      p: 0,
    },
    listItemDivider: {
      px: drawerOpen ? 2 : 1,
    },
    divider: {
      flex: 1,
    },
    listItemButton: {
      px: 2,
    },
    textOnly: {
      m: 0,
      pl: 3,

      [`.${listItemTextClasses.primary}`]: {
        fontSize: 12,
        fontWeight: 500,
        color: theme.palette.text.secondary,
      },

      [`.${listItemTextClasses.secondary}`]: {
        fontSize: 13,
        color: theme.palette.text.secondary,
        fontFamily: FONT_MONO,
      },
    },
  };
};
