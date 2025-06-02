import { Box, Typography, List, ListItem, ListItemText, Paper, Button } from '@mui/material';
import { useState } from 'react';
import ProjectMenu from '../components/ProjectMenu';
import { commonStyles } from '../theme';

export default function Projects() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  // This would typically come from a database or state management
  const projects = [
    { id: 1, name: 'Alabama Football 2024', university: 'University of Alabama', team: 'Football' },
    { id: 2, name: 'UCLA Basketball Season', university: 'University of California, Los Angeles', team: 'Basketball' },
    // Add more projects as needed
  ];

  return (
    <Box sx={commonStyles.container}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: { xs: 4, sm: 6 },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 4 }
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: 'primary.main',
            fontWeight: 600,
            mr: { sm: 4 }
          }}
        >
          Your Projects
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowNewProject(true)}
          sx={{
            ...commonStyles.gradientButton,
            px: { xs: 4, sm: 5 },
            py: { xs: 1.5, sm: 2 },
            fontSize: { xs: '1rem', sm: '1.1rem' },
            minWidth: { xs: '200px', sm: '220px' },
          }}
        >
          New Project
        </Button>
      </Box>
      
      {showNewProject ? (
        <Box sx={{ mt: 4 }}>
          <ProjectMenu
            onUniversityChange={setSelectedUniversity}
            onTeamChange={setSelectedTeam}
          />
        </Box>
      ) : (
        <List sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 3,
          mt: 2
        }}>
          {projects.map((project) => (
            <Paper
              key={project.id}
              elevation={0}
              sx={{
                ...commonStyles.glassEffect,
                ...commonStyles.hoverEffect,
              }}
            >
              <ListItem sx={{ 
                py: { xs: 2, sm: 2.5 },
                px: { xs: 3, sm: 4 }
              }}>
                <ListItemText
                  primary={project.name}
                  secondary={`${project.university} - ${project.team}`}
                  primaryTypographyProps={{
                    sx: { 
                      color: 'primary.main', 
                      fontWeight: 600,
                      fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      mb: 0.5
                    }
                  }}
                  secondaryTypographyProps={{
                    sx: { 
                      color: 'text.secondary',
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }
                  }}
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      )}
    </Box>
  );
} 