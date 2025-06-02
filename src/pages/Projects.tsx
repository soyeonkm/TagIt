import { Box, Typography, List, ListItem, ListItemText, Paper } from '@mui/material';

export default function Projects() {
  // This would typically come from a database or state management
  const projects = [
    { id: 1, name: 'Alabama Football 2024', university: 'University of Alabama', team: 'Football' },
    { id: 2, name: 'UCLA Basketball Season', university: 'University of California, Los Angeles', team: 'Basketball' },
    // Add more projects as needed
  ];

  return (
    <Box sx={{ 
      maxWidth: '800px', 
      mx: 'auto', 
      mt: 4,
      p: 3,
    }}>
      <Typography variant="h4" sx={{ color: 'primary.main', mb: 4 }}>
        Your Projects
      </Typography>
      
      <List>
        {projects.map((project) => (
          <Paper
            key={project.id}
            sx={{
              mb: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(0, 234, 255, 0.18)',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 0 20px rgba(0, 234, 255, 0.2)',
              },
            }}
          >
            <ListItem>
              <ListItemText
                primary={project.name}
                secondary={`${project.university} - ${project.team}`}
                primaryTypographyProps={{
                  sx: { color: 'primary.main', fontWeight: 600 }
                }}
                secondaryTypographyProps={{
                  sx: { color: 'text.secondary' }
                }}
              />
            </ListItem>
          </Paper>
        ))}
      </List>
    </Box>
  );
} 