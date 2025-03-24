import { createTheme, responsiveFontSizes } from '@mui/material/styles';

let theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#2CFF05', // Neon green from the logo
      contrastText: '#000000', // Black text for contrast with neon green
    },
    secondary: {
      main: '#FFFFFF', // White as secondary color
      contrastText: '#000000', // Black text on white background
    },
    background: {
      default: '#000000', // Black background
      paper: '#121212', // Very dark gray for paper elements
      card: '#181818', // Slightly lighter dark for cards
    },
    text: {
      primary: '#FFFFFF', // White text
      secondary: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
      disabled: 'rgba(255, 255, 255, 0.5)', // More transparent white
      highlight: '#2CFF05', // Neon green for highlighted text
    },
    action: {
      active: '#2CFF05', // Neon green for active elements
      hover: 'rgba(44, 255, 5, 0.08)', // Semi-transparent neon green for hover
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      '"Fira Sans"',
      '"Droid Sans"',
      '"Helvetica Neue"',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          paddingTop: 8,
          paddingBottom: 8,
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#24CC04', // Slightly darker neon green on hover
            boxShadow: '0 0 10px rgba(44, 255, 5, 0.5)', // Neon glow effect
          },
        },
        outlinedPrimary: {
          borderColor: '#2CFF05',
          '&:hover': {
            borderColor: '#2CFF05',
            boxShadow: '0 0 10px rgba(44, 255, 5, 0.5)', // Neon glow effect
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#181818', // Dark gray
          borderRadius: 12,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 15px rgba(44, 255, 5, 0.3)', // Subtle neon glow on hover
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.7)',
          '&:hover': {
            color: '#2CFF05', // Neon green on hover
            backgroundColor: 'rgba(44, 255, 5, 0.08)', // Very subtle neon green background
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          border: '2px solid rgba(44, 255, 5, 0.3)', // Subtle neon green border
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#121212', // Very dark gray
          borderTop: '1px solid rgba(44, 255, 5, 0.12)', // Subtle neon green border
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.7)',
          '&.Mui-selected': {
            color: '#2CFF05', // Neon green for selected items
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: '#FFFFFF',
          '&.Mui-checked': {
            color: '#2CFF05', // Neon green when checked
            '& + .MuiSwitch-track': {
              backgroundColor: 'rgba(44, 255, 5, 0.5)', // Semi-transparent neon green track
            },
          },
        },
        track: {
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
        },
      },
    },
  },
});

// Apply responsive font sizing
theme = responsiveFontSizes(theme);

export default theme; 