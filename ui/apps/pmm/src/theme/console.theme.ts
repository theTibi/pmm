import { PaletteMode, ThemeOptions } from '@mui/material';
import { pmmThemeOptions } from '@percona/peak-ui';
import { consoleTokens, FONT_MONO, FONT_SANS } from './console.tokens';

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// Objects merge key by key; anything else, functions included, is replaced.
const deepMerge = (base: Plain, extra: Plain): Plain =>
  Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(extra)])].map((key) => {
      const a = base[key];
      const b = extra[key];
      if (b === undefined) {
        return [key, a];
      }
      return [key, isPlain(a) && isPlain(b) ? deepMerge(a, b) : b];
    })
  );

// peak-ui sets Poppins on these variants; body text otherwise falls back to Roboto.
const SANS_VARIANTS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
  'body1',
  'body2',
  'button',
  'caption',
  'overline',
  'sectionHeading',
  'subHead1',
  'subHead2',
  'helperText',
  'menuText',
  'inputText',
  'inputLabel',
];

const overrides = (mode: PaletteMode): ThemeOptions => {
  const t = consoleTokens(mode);
  const dark = mode === 'dark';
  const ink = dark ? '204, 214, 230' : '16, 24, 40';
  // peak-ui's PMM theme also sets elevation0/1, which its palette type does not declare.
  const surfaces = {
    backdrop: dark ? 'rgba(4, 6, 10, 0.72)' : 'rgba(16, 24, 40, 0.4)',
    low: t.canvas,
    high: t.surface,
    elevation0: t.canvas,
    elevation1: t.surface,
  };

  return {
    palette: {
      mode,
      primary: {
        main: t.accent,
        dark: t.accentHover,
        light: t.accentHover,
        contrastText: dark ? '#0A0C0F' : '#FFFFFF',
        hover: t.hover,
        selected: t.selected,
        focus: t.accentSoft,
        focusVisible: dark
          ? 'rgba(138, 180, 255, 0.5)'
          : 'rgba(47, 107, 222, 0.4)',
        outlinedBorder: dark
          ? 'rgba(138, 180, 255, 0.5)'
          : 'rgba(47, 107, 222, 0.5)',
      },
      text: {
        primary: t.text,
        secondary: t.textMuted,
        disabled: t.textFaint,
      },
      error: {
        main: t.critical.main,
        light: t.critical.text,
        dark: t.critical.text,
        contrastText: dark ? '#0A0C0F' : '#FFFFFF',
        surface: t.critical.soft,
      },
      warning: {
        main: t.warning.main,
        light: t.warning.main,
        dark: t.warning.text,
        contrastText: '#0A0C0F',
        surface: t.warning.soft,
      },
      info: {
        main: t.accent,
        light: t.accentHover,
        dark: t.accentHover,
        contrastText: dark ? '#0A0C0F' : '#FFFFFF',
        surface: t.accentSoft,
      },
      success: {
        main: dark ? '#3FB68B' : '#12925F',
        light: t.healthy.text,
        dark: t.healthy.text,
        contrastText: dark ? '#0A0C0F' : '#FFFFFF',
        surface: t.healthy.soft,
      },
      neutral: {
        main: t.notice.main,
        light: t.notice.text,
        dark: t.textFaint,
        contrastText: dark ? '#0A0C0F' : '#FFFFFF',
        surface: t.notice.soft,
      },
      action: {
        active: t.textSecondary,
        hover: t.hover,
        selected: t.selected,
        focus: `rgba(${ink}, 0.12)`,
        disabled: `rgba(${ink}, 0.32)`,
        disabledBackground: `rgba(${ink}, 0.08)`,
      },
      background: {
        default: t.canvas,
        paper: t.surface,
      },
      surfaces,
      divider: t.border,
      dividers: {
        divider: t.border,
        dividerStrong: t.borderStrong,
        dividerStronger: `rgba(${ink}, 0.4)`,
        contour: t.border,
      },
    },
    typography: {
      fontFamily: FONT_SANS,
      code: { fontFamily: FONT_MONO },
      ...Object.fromEntries(
        SANS_VARIANTS.map((variant) => [variant, { fontFamily: FONT_SANS }])
      ),
      h1: { fontFamily: FONT_SANS, fontWeight: 600, letterSpacing: '-0.02em' },
      h2: { fontFamily: FONT_SANS, fontWeight: 600, letterSpacing: '-0.02em' },
      h3: { fontFamily: FONT_SANS, fontWeight: 600, letterSpacing: '-0.01em' },
      menuText: { fontFamily: FONT_SANS, fontWeight: 500 },
      button: {
        fontFamily: FONT_SANS,
        fontWeight: 500,
        letterSpacing: 0,
        textTransform: 'none',
      },
    } as ThemeOptions['typography'],
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'html, body': {
            backgroundColor: t.canvas,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '::selection': { backgroundColor: t.accentSoft },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: t.surface,
            borderColor: t.border,
            borderRadius: 10,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: t.sidebar, borderColor: t.border },
          root: {
            '.MuiIconButton-root:hover, .MuiIconButton-root:focus': {
              color: t.text,
              backgroundColor: t.hover,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover, &:focus': {
              color: t.text,
              backgroundColor: t.hover,
              '.MuiListItemIcon-root': { color: t.text },
              '&.Mui-selected': {
                color: t.text,
                backgroundColor: t.selected,
              },
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { borderColor: t.border } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? '#2A2E36' : '#1C2027',
            color: '#F1F3F6',
            fontFamily: FONT_SANS,
            fontSize: 12,
          },
        },
      },
    },
  };
};

export const consoleThemeOptions = (mode: PaletteMode): ThemeOptions =>
  deepMerge(
    pmmThemeOptions(mode) as Plain,
    overrides(mode) as Plain
  ) as ThemeOptions;
