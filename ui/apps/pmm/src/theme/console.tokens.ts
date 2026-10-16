import { PaletteMode } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const FONT_SANS =
  "'Geist Variable', 'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FONT_MONO =
  "'Geist Mono Variable', 'Geist Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";

interface SeverityTokens {
  // Bar segments and swatches.
  main: string;
  // Text on the page background.
  text: string;
  // Chip and pill backgrounds.
  soft: string;
}

export interface ConsoleTokens {
  canvas: string;
  sidebar: string;
  surface: string;
  raised: string;
  hover: string;
  selected: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  critical: SeverityTokens;
  warning: SeverityTokens;
  notice: SeverityTokens;
  healthy: SeverityTokens;
}

// The dark surfaces match Grafana's dark theme, so native pages and dashboards read as one app.
const dark: ConsoleTokens = {
  canvas: '#111217',
  sidebar: '#0C0D11',
  surface: '#181B1F',
  raised: '#1F2228',
  hover: 'rgba(204, 214, 230, 0.06)',
  selected: 'rgba(138, 180, 255, 0.12)',
  border: '#24272E',
  borderStrong: '#30343C',
  text: '#E6E9EE',
  textSecondary: '#AEB5C0',
  textMuted: '#959DA8',
  textFaint: '#808894',
  accent: '#8AB4FF',
  accentHover: '#B7D0FF',
  accentSoft: 'rgba(138, 180, 255, 0.14)',
  critical: {
    main: '#FF6B5E',
    text: '#FF8A80',
    soft: 'rgba(255, 107, 94, 0.14)',
  },
  warning: {
    main: '#F5B841',
    text: '#F5B841',
    soft: 'rgba(245, 184, 65, 0.14)',
  },
  notice: {
    main: '#7D8BA1',
    text: '#B4BCC8',
    soft: 'rgba(125, 139, 161, 0.2)',
  },
  healthy: {
    main: '#2B4D40',
    text: '#6FD3A8',
    soft: 'rgba(63, 182, 139, 0.14)',
  },
};

const light: ConsoleTokens = {
  canvas: '#F4F5F7',
  sidebar: '#FBFBFC',
  surface: '#FFFFFF',
  raised: '#F7F8FA',
  hover: 'rgba(16, 24, 40, 0.05)',
  selected: 'rgba(47, 107, 222, 0.1)',
  border: '#E3E6EB',
  borderStrong: '#D0D5DD',
  text: '#12161C',
  textSecondary: '#3F4753',
  textMuted: '#525A66',
  textFaint: '#646C78',
  accent: '#2F6BDE',
  accentHover: '#2154B8',
  accentSoft: 'rgba(47, 107, 222, 0.1)',
  critical: {
    main: '#E5483B',
    text: '#B42318',
    soft: '#FDECEA',
  },
  warning: {
    main: '#F0A01F',
    text: '#9A4A06',
    soft: '#FEF2DE',
  },
  notice: {
    main: '#98A2B3',
    text: '#475467',
    soft: '#EEF1F5',
  },
  healthy: {
    main: '#BFE3D2',
    text: '#05744A',
    soft: '#E6F6EE',
  },
};

export const consoleTokens = (mode: PaletteMode): ConsoleTokens =>
  mode === 'dark' ? dark : light;

export const useConsoleTokens = (): ConsoleTokens =>
  consoleTokens(useTheme().palette.mode);
