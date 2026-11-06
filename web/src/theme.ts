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

/** Hard offset shadow: the "edgy" signature for cards and primary buttons. */
export const hardShadow = (size = 4, color: string = brand.espresso) => `${size}px ${size}px 0 ${color}`

const headingFont = '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif'
const bodyFont = '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif'

const heading = { fontFamily: headingFont, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05 }

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand.espresso, light: brand.espressoLight, contrastText: brand.cream },
    secondary: { main: brand.terracotta, contrastText: '#ffffff' },
    success: { main: brand.sage },
    background: { default: brand.cream, paper: '#ffffff' },
    text: { primary: '#1f1300', secondary: '#6b5a48' },
    divider: brand.espresso,
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: bodyFont,
    h1: heading,
    h2: heading,
    h3: heading,
    h4: { ...heading, fontSize: '2.1rem' },
    h5: { ...heading, letterSpacing: '-0.02em' },
    h6: { ...heading, letterSpacing: '-0.01em' },
    button: { fontFamily: headingFont, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
    overline: { fontFamily: headingFont, fontWeight: 700, letterSpacing: '0.18em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 4, paddingInline: 20, paddingBlock: 9 },
        contained: {
          border: `2px solid ${brand.espresso}`,
          boxShadow: hardShadow(3, brand.terracotta),
          transition: 'transform 120ms ease, box-shadow 120ms ease',
          '&:hover': { boxShadow: hardShadow(5, brand.terracotta), transform: 'translate(-1px, -1px)' },
          '&:active': { boxShadow: hardShadow(1, brand.terracotta), transform: 'translate(2px, 2px)' },
          '&.Mui-disabled': { boxShadow: 'none', borderColor: '#d8ccbb', backgroundColor: '#e9e1d4', color: '#9c8d7b' },
        },
        outlined: { borderWidth: 2, '&:hover': { borderWidth: 2 } },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `2px solid ${brand.espresso}`, boxShadow: hardShadow(4), borderRadius: 4 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontFamily: headingFont,
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        },
        outlined: { borderWidth: 1.5, borderColor: brand.espresso },
      },
    },
    MuiAvatar: {
      defaultProps: { variant: 'rounded' },
      styleOverrides: { rounded: { borderRadius: 4 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `2px solid ${brand.espresso}`, boxShadow: `${hardShadow(4)} !important`, borderRadius: 4 },
      },
    },
    MuiStepIcon: {
      styleOverrides: { root: { borderRadius: 2 } },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { backgroundColor: '#ffffff', height: 68 } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#8a7763',
          borderTop: '3px solid transparent',
          '&.Mui-selected': { color: brand.espresso, borderTopColor: brand.terracotta },
        },
        label: {
          fontFamily: headingFont,
          fontWeight: 700,
          fontSize: '0.68rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          '&.Mui-selected': { fontSize: '0.68rem' },
        },
      },
    },
  },
})
