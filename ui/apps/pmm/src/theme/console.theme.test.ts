import { createTheme } from '@mui/material/styles';
import { consoleThemeOptions } from './console.theme';

describe('consoleThemeOptions', () => {
  it('matches Grafana dark surfaces with a blue accent in dark mode', () => {
    const theme = createTheme(consoleThemeOptions('dark'));

    expect(theme.palette.background.default).toBe('#111217');
    expect(theme.palette.background.paper).toBe('#181B1F');
    expect(theme.palette.surfaces?.high).toBe('#181B1F');
    expect(theme.palette.primary.main).toBe('#8AB4FF');
  });

  it('uses cool greys and a deeper blue in light mode', () => {
    const theme = createTheme(consoleThemeOptions('light'));

    expect(theme.palette.background.default).toBe('#F4F5F7');
    expect(theme.palette.background.paper).toBe('#FFFFFF');
    expect(theme.palette.primary.main).toBe('#2F6BDE');
  });

  it('sets Geist on body text and on the variants peak-ui gives Poppins', () => {
    const theme = createTheme(consoleThemeOptions('dark'));

    expect(theme.typography.fontFamily).toMatch(/^'Geist Variable'/);
    expect(theme.typography.h1.fontFamily).toMatch(/^'Geist Variable'/);
    expect(theme.typography.menuText.fontFamily).toMatch(/^'Geist Variable'/);
    expect(theme.typography.code.fontFamily).toMatch(/^'Geist Mono Variable'/);
  });
});
