import { Box, Typography, Paper } from '@mui/material';

export default function About() {
  return (
    <Box sx={{ 
      maxWidth: '800px', 
      mx: 'auto', 
      mt: 4,
      p: 3,
    }}>
      <Typography variant="h4" sx={{ color: 'primary.main', mb: 4 }}>
        About TagIt
      </Typography>
      
      <Paper sx={{
        p: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(0, 234, 255, 0.18)',
      }}>
        <Typography variant="h5" sx={{ color: 'primary.main', mb: 3 }}>
          Revolutionizing Sports Photography
        </Typography>
        
        <Typography paragraph sx={{ color: 'text.secondary', mb: 3 }}>
          TagIt is a cutting-edge photo tagging web application designed specifically for sports photographers. 
          Our platform combines advanced facial recognition and jersey number detection technologies to streamline 
          the process of identifying and tagging players in sports photographs.
        </Typography>

        <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
          Key Features
        </Typography>
        
        <Typography component="ul" sx={{ color: 'text.secondary', pl: 2 }}>
          <li>Advanced facial recognition for player identification</li>
          <li>Jersey number detection technology</li>
          <li>Automatic metadata updates for player names</li>
          <li>Project organization by university and team</li>
          <li>User-friendly interface for efficient workflow</li>
          <li>Secure and private data handling</li>
        </Typography>

        <Typography paragraph sx={{ color: 'text.secondary', mt: 3 }}>
          TagIt is committed to helping sports photographers save time and improve accuracy in their work, 
          allowing them to focus on capturing the perfect shot while we handle the organization and tagging.
        </Typography>
      </Paper>
    </Box>
  );
} 