import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00eaff',
    },
    secondary: {
      main: '#ff00c8',
    },
    background: {
      default: '#181c24',
      paper: 'rgba(24, 28, 36, 0.85)',
    },
  },
  typography: {
    fontFamily: '"Rajdhani", "Roboto", "Arial", sans-serif',
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      '@media (min-width:0px)': {
        fontSize: '2.5rem',
      },
      '@media (min-width:600px)': {
        fontSize: '3.5rem',
      },
      '@media (min-width:900px)': {
        fontSize: '4rem',
      },
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      '@media (min-width:0px)': {
        fontSize: '1.75rem',
      },
      '@media (min-width:600px)': {
        fontSize: '2rem',
      },
      '@media (min-width:900px)': {
        fontSize: '2.25rem',
      },
    },
    h5: {
      fontWeight: 500,
      letterSpacing: '-0.01em',
      '@media (min-width:0px)': {
        fontSize: '1rem',
      },
      '@media (min-width:600px)': {
        fontSize: '1.25rem',
      },
      '@media (min-width:900px)': {
        fontSize: '1.5rem',
      },
    },
    body1: {
      fontWeight: 400,
      letterSpacing: '-0.01em',
    },
    body2: {
      fontWeight: 400,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export const commonStyles = {
  glassEffect: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(0, 234, 255, 0.18)',
  },
  hoverEffect: {
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: 'primary.main',
      boxShadow: '0 8px 32px rgba(0, 234, 255, 0.2)',
      transform: 'scale(1.05)',
    },
  },
  gradientButton: {
    background: 'linear-gradient(90deg, #00eaff 0%, #ff00c8 100%)',
    color: '#181c24',
    boxShadow: '0 4px 20px rgba(0,234,255,0.2)',
    '&:hover': {
      background: 'linear-gradient(90deg, rgba(0,234,255,0.8) 0%, rgba(255,0,200,0.8) 100%)',
      boxShadow: '0 6px 24px rgba(0,234,255,0.3)',
    },
  },
  container: {
    maxWidth: '1000px',
    mx: 'auto',
    mt: { xs: 6, sm: 8 },
    p: { xs: 2, sm: 3, md: 4 },
    minHeight: '80vh',
  },
  pageContainer: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: { xs: '1rem', sm: '2rem' },
    boxSizing: 'border-box',
    overflow: 'hidden',
    pt: { xs: '80px', sm: '100px' },
  },
};

export const globalStyles = {
  gradientBg: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    background: `linear-gradient(120deg, #181c24 0%, #232a34 40%, #00eaff 100%)`,
    zIndex: -1,
    animation: 'gradientMove 8s ease-in-out infinite',
    backgroundSize: '200% 200%',
  },
  globalCSS: `
    @keyframes gradientMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    body {
      font-family: "Rajdhani", "Roboto", "Arial", sans-serif;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #root {
      min-height: 100vh;
      width: 100vw;
    }
  `,
}; 