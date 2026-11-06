import { createTheme } from '@mui/material/styles'

/** Drip brand colors, taken from the logo (espresso + cream) plus warm café accents. */
export const brand = {
  espresso: '#3d2500',
  espressoLight: '#5a3a14',
  cream: '#fcf9f2',
  latte: '#e8d5b9',
  foam: '#f3e3cc',
  caramel: '#d4a056',
  terracotta: '#c96f4a',
  sage: '#4f7d6b',
} as const

const headingFont = '"Fredoka Variable", "Jost Variable", system-ui, sans-serif'
const bodyFont = '"Jost Variable", system-ui, -apple-system, "Segoe UI", sans-serif'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.espresso, light: brand.espressoLight, contrastText: brand.cream },
    secondary: { main: brand.terracotta, contrastText: '#ffffff' },
    success: { main: brand.sage },
    background: { default: brand.cream, paper: '#ffffff' },
    text: { primary: '#2a1a05', secondary: '#6b5a48' },
    divider: brand.latte,
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: bodyFont,
    h1: { fontFamily: headingFont, fontWeight: 700 },
    h2: { fontFamily: headingFont, fontWeight: 700 },
    h3: { fontFamily: headingFont, fontWeight: 700 },
    h4: { fontFamily: headingFont, fontWeight: 600 },
    h5: { fontFamily: headingFont, fontWeight: 600 },
    h6: { fontFamily: headingFont, fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0.2 },
    overline: { fontWeight: 600, letterSpacing: 1.5 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 20 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${brand.latte}` } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { backgroundColor: '#ffffff', height: 64 } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#8a7763',
          '&.Mui-selected': { color: brand.espresso },
        },
        label: { fontWeight: 600, '&.Mui-selected': { fontSize: '0.8rem' } },
      },
    },
  },
})
