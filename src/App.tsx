import {
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import '@fontsource/rajdhani/400.css';
import '@fontsource/rajdhani/700.css';
import Header from './components/Header';
import Home from './pages/Home';
import Projects from './pages/Projects';
import About from './pages/About';

const theme = createTheme({
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
      paper: 'rgba(24,28,36,0.85)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b8c1',
    },
  },
  typography: {
    fontFamily: 'Rajdhani, Roboto, Arial',
    h2: {
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
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
    h5: {
      fontWeight: 400,
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
  },
});

const gradientBg = {
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
};

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={gradientBg} />
        <Header />
        <Box
          sx={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: { xs: '1rem', sm: '2rem' },
            boxSizing: 'border-box',
            overflow: 'hidden',
            pt: { xs: '80px', sm: '100px' },
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Box>
        <style>{`
          @keyframes gradientMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          body {
            font-family: 'Rajdhani', 'Roboto', Arial, sans-serif;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }
          #root {
            min-height: 100vh;
            width: 100vw;
          }
        `}</style>
      </ThemeProvider>
    </Router>
  );
}

export default App;
