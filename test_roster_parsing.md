# Test Guide: Enhanced Roster Parsing with Sport Type and Team Classification

## Overview

This guide tests the enhanced roster parsing functionality that now extracts:

- Sport type (e.g., Basketball, Football, Soccer)
- Team classification (university, professional, amateur, other)
- School name for university teams
- Team name for professional teams

## Test Cases

### 1. University Basketball Team

**URL**: Any university basketball roster page
**Expected Results**:

- Sport Type: "Basketball"
- Team Classification: "university"
- School Name: [University name]
- Team Name: null

### 2. Professional Football Team

**URL**: Any professional football team roster page
**Expected Results**:

- Sport Type: "Football"
- Team Classification: "professional"
- School Name: null
- Team Name: [Team name]

### 3. Amateur Soccer Team

**URL**: Any amateur/recreational soccer team roster page
**Expected Results**:

- Sport Type: "Soccer"
- Team Classification: "amateur"
- School Name: null
- Team Name: [Team name if available]

## Testing Steps

1. **Create a new project** with roster URL
2. **Parse roster** using the AutoTagger component
3. **Verify extracted information**:
   - Check that sport type is correctly identified
   - Verify team classification is accurate
   - Confirm school name is extracted for university teams
   - Ensure team name is captured for professional teams
4. **Check database storage**:
   - Projects table should have sport_type and team_classification
   - Players table should have school_name and sport_type

## Database Verification

Run these SQL queries to verify data is stored correctly:

```sql
-- Check project sport and classification
SELECT name, sport_type, team_classification
FROM projects
WHERE roster_data IS NOT NULL;

-- Check player sport and school info
SELECT name, sport_type, school_name, team
FROM players
WHERE sport_type IS NOT NULL OR school_name IS NOT NULL;
```

## Expected Behavior

- **Automatic Detection**: Sport type and team classification should be auto-detected from roster URL
- **Fallback Support**: If Gemini parsing fails, basic HTML parsing should still work
- **Data Consistency**: All players from the same roster should have consistent sport type and team info
- **UI Display**: New fields should be visible in player cards with appropriate styling

## Troubleshooting

- **No Sport Type**: Check if Gemini API key is configured
- **Wrong Classification**: Verify the roster page content is accessible
- **Missing School/Team Names**: Ensure the roster page has clear headers/titles
- **Database Errors**: Run the migration script to add new columns
