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
      main: '#bdfa03', // Lime green 
      contrastText: '#002549', // Deep blue text for contrast with lime green
    },
    secondary: {
      main: '#FFFFFF', // White as secondary color
      contrastText: '#002549', // Deep blue text on white background
    },
    background: {
      default: '#00000', // Deep blue background
      paper: '#001c38', // Slightly lighter deep blue for paper elements
      card: '#00213f', // Slightly lighter deep blue for cards
    },
    text: {
      primary: '#FFFFFF', // White text
      secondary: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white
      disabled: 'rgba(255, 255, 255, 0.5)', // More transparent white
      highlight: '#bdfa03', // Lime green for highlighted text
    },
    action: {
      active: '#bdfa03', // Lime green for active elements
      hover: 'rgba(189, 250, 3, 0.9)', // Semi-transparent lime green for hover
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
            backgroundColor: '#bdfa03', // Lime green on hover
            boxShadow: '0 0 10px rgba(189, 250, 3, 0.7)', // Lime green glow effect
          },
        },
        outlinedPrimary: {
          borderColor: '#bdfa03',
          '&:hover': {
            borderColor: '#bdfa03',
            boxShadow: '0 0 10px rgba(189, 250, 3, 0.7)', // Lime green glow effect
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#00213f', // Slightly lighter deep blue
          borderRadius: 12,
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 0 15px rgba(189, 250, 3, 0.8)', // Subtle lime green glow on hover
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.7)',
          '&:hover': {
            color: '#bdfa03', // Lime green on hover
            backgroundColor: 'rgba(189, 250, 3, 0.1)', // Very subtle lime green background
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          border: '2px solid rgba(189, 250, 3, 0.7)', // Subtle lime green border
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#001c38', // Slightly lighter deep blue
          borderTop: '1px solid rgba(189, 250, 3, 0.5)', // Subtle lime green border
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.7)',
          '&.Mui-selected': {
            color: '#bdfa03', // Lime green for selected items
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: '#FFFFFF',
          '&.Mui-checked': {
            color: '#bdfa03', // Lime green when checked
            '& + .MuiSwitch-track': {
              backgroundColor: 'rgba(189, 250, 3, 0.5)', // Semi-transparent lime green track
            },
          },
        },
        track: {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
  },
});

// Apply responsive font sizing
theme = responsiveFontSizes(theme);

export default theme; 