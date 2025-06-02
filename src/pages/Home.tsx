import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ProjectMenu from '../components/ProjectMenu';

const glassBox = {
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  backgroundColor: 'rgba(24, 28, 36, 0.85)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px 0 rgba(0, 234, 255, 0.15)',
  border: '1px solid rgba(0, 234, 255, 0.18)',
  padding: { xs: '2rem', sm: '3rem', md: '4rem' },
  width: { xs: '90%', sm: '80%', md: '70%' },
  maxWidth: '800px',
  margin: 'auto',
  textAlign: 'center',
};

export default function Home() {
  const [started, setStarted] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  return (
    <Box sx={glassBox}>
      {!started ? (
        <>
          <Typography variant="h2" component="h1" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
            TagIt
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph sx={{ mb: 4 }}>
            TagIt is a powerful photo tagging web app for sports photographers.<br />
            Effortlessly tag players in your photos using facial and jersey number recognition,<br />
            and automatically update image metadata with player names.<br />
            <span style={{ color: '#00eaff', fontWeight: 700 }}>Get started to organize your sports photography projects like never before!</span>
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => setStarted(true)}
            sx={{
              mt: 2,
              px: { xs: 4, sm: 6 },
              py: { xs: 1, sm: 1.5 },
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 700,
              borderRadius: '12px',
              boxShadow: '0 2px 16px 0 rgba(0,234,255,0.15)',
              background: 'linear-gradient(90deg, #00eaff 0%, #ff00c8 100%)',
              color: '#181c24',
              textShadow: '0 1px 8px #00eaff44',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(90deg, rgba(0,234,255,0.8) 0%, rgba(255,0,200,0.8) 100%)',
                transform: 'scale(1.05)',
              },
            }}
          >
            Get Started
          </Button>
        </>
      ) : (
        <ProjectMenu
          onUniversityChange={setSelectedUniversity}
          onTeamChange={setSelectedTeam}
        />
      )}
    </Box>
  );
} 