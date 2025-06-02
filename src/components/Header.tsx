import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        backgroundColor: 'rgba(24, 28, 36, 0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid rgba(0, 234, 255, 0.18)',
        boxShadow: '0 4px 32px 0 rgba(0, 234, 255, 0.15)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          variant="h4"
          component="div"
          onClick={() => handleNavigation('/')}
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: { xs: '1.5rem', sm: '2rem' },
            textShadow: '0 0 10px rgba(0, 234, 255, 0.5)',
            cursor: 'pointer',
            '&:hover': {
              textShadow: '0 0 20px rgba(0, 234, 255, 0.8)',
            },
          }}
        >
          TagIt
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            color="inherit"
            onClick={() => handleNavigation('/')}
            sx={{
              color: location.pathname === '/' ? 'primary.main' : 'inherit',
              '&:hover': {
                color: 'primary.main',
                textShadow: '0 0 10px rgba(0, 234, 255, 0.5)',
              },
            }}
          >
            Home
          </Button>
          <Button 
            color="inherit"
            onClick={() => handleNavigation('/projects')}
            sx={{
              color: location.pathname === '/projects' ? 'primary.main' : 'inherit',
              '&:hover': {
                color: 'primary.main',
                textShadow: '0 0 10px rgba(0, 234, 255, 0.5)',
              },
            }}
          >
            Projects
          </Button>
          <Button 
            color="inherit"
            onClick={() => handleNavigation('/about')}
            sx={{
              color: location.pathname === '/about' ? 'primary.main' : 'inherit',
              '&:hover': {
                color: 'primary.main',
                textShadow: '0 0 10px rgba(0, 234, 255, 0.5)',
              },
            }}
          >
            About
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 