import { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

interface ProjectMenuProps {
  onUniversityChange: (university: string) => void;
  onTeamChange: (team: string) => void;
}

const universities = [
  'University of Alabama',
  'University of California, Los Angeles',
  'University of Michigan',
  'Stanford University',
  'University of Texas',
  // Add more universities as needed
];

const sportsTeams = {
  'University of Alabama': ['Football', 'Basketball', 'Baseball', 'Soccer'],
  'University of California, Los Angeles': ['Football', 'Basketball', 'Baseball', 'Soccer'],
  'University of Michigan': ['Football', 'Basketball', 'Baseball', 'Soccer'],
  'Stanford University': ['Football', 'Basketball', 'Baseball', 'Soccer'],
  'University of Texas': ['Football', 'Basketball', 'Baseball', 'Soccer'],
};

export default function ProjectMenu({ onUniversityChange, onTeamChange }: ProjectMenuProps) {
  const [university, setUniversity] = useState('');
  const [team, setTeam] = useState('');
  const [projectName, setProjectName] = useState('');

  const handleUniversityChange = (event: SelectChangeEvent) => {
    const selectedUniversity = event.target.value;
    setUniversity(selectedUniversity);
    setTeam(''); // Reset team when university changes
    onUniversityChange(selectedUniversity);
  };

  const handleTeamChange = (event: SelectChangeEvent) => {
    const selectedTeam = event.target.value;
    setTeam(selectedTeam);
    onTeamChange(selectedTeam);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 3,
      alignItems: 'center',
      width: '100%',
      maxWidth: '400px',
      mx: 'auto',
    }}>
      <Typography variant="h4" sx={{ color: 'primary.main', mb: 2 }}>
        Select Your Project
      </Typography>

      <TextField
        fullWidth
        label="Project Name"
        placeholder="Name your project..."
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& fieldset': {
              borderColor: 'rgba(0, 234, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 234, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'primary.main',
          },
        }}
      />
      
      <FormControl fullWidth>
        <InputLabel id="university-select-label">University</InputLabel>
        <Select
          labelId="university-select-label"
          id="university-select"
          value={university}
          label="University"
          onChange={handleUniversityChange}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 234, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 234, 255, 0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }}
        >
          {universities.map((uni) => (
            <MenuItem key={uni} value={uni}>{uni}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth disabled={!university}>
        <InputLabel id="team-select-label">Sports Team</InputLabel>
        <Select
          labelId="team-select-label"
          id="team-select"
          value={team}
          label="Sports Team"
          onChange={handleTeamChange}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 234, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 234, 255, 0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }}
        >
          {university && sportsTeams[university as keyof typeof sportsTeams]?.map((sport) => (
            <MenuItem key={sport} value={sport}>{sport}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
} 