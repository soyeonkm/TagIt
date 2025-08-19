# Automatic Tagging System for TagIt

## Overview

TagIt now includes an advanced automatic tagging system that can detect players in sports photos using AI-powered face detection and jersey number recognition. This system automatically parses roster information from web pages and matches detected players with photos to generate comprehensive metadata.

## Features

### 🔄 Automatic Player Detection

- **Face Detection**: Uses OpenCV cascade classifiers to detect human faces in photos
- **Jersey Number Recognition**: OCR technology to read jersey numbers from player uniforms
- **Player Matching**: Intelligent matching of detected information with roster data

### 📋 Roster Management

- **Web Scraping**: Automatically parse team rosters from web pages
- **Player Database**: Store player information including names, jersey numbers, and positions
- **Flexible Input**: Support for both URL-based and file-based roster imports

### 📸 Photo Processing

- **Batch Processing**: Process entire folders of photos automatically
- **Metadata Generation**: Create comprehensive descriptions based on detected players
- **Database Storage**: Store all detection results and metadata in SQL database

## How It Works

### 1. Roster Setup

1. Create a new project and specify a roster URL (e.g., team website)
2. The system automatically scrapes the webpage and extracts player information
3. Players are stored in the database with names, jersey numbers, and positions

### 2. Photo Processing

1. Select a folder containing photos to process
2. The system analyzes each photo for:
   - Human faces
   - Jersey numbers
   - Player identification
3. Matches detected information with the roster database
4. Generates descriptive metadata for each photo

### 3. Results

- Photos are automatically tagged with player information
- Metadata includes detected players, faces, and jersey numbers
- All information is stored in the database for future reference

## Technical Implementation

### Backend (Rust/Tauri)

- **OpenCV Integration**: Face detection using Haar cascade classifiers
- **Tesseract OCR**: Jersey number recognition from image regions
- **HTML Parsing**: Roster extraction using web scraping techniques
- **Database Integration**: Supabase for storing player and photo metadata

### Frontend (React)

- **AutoTagger Component**: Main interface for roster and photo management
- **Real-time Updates**: Live display of processing results
- **Progress Tracking**: Visual feedback during long operations

### Database Schema

```sql
-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  team TEXT
);

-- Photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  file_path TEXT NOT NULL,
  detected_players JSONB,
  detected_faces JSONB,
  detected_jersey_numbers JSONB,
  description TEXT
);
```

## Usage Instructions

### Setting Up Automatic Tagging

1. **Create Project with Roster**

   - Go to "Create Project"
   - Fill in basic project information
   - In "Roster Configuration" section, select "URL" and enter roster webpage URL
   - Select project folder for photos

2. **Parse Roster**

   - Navigate to your project page
   - In the "Automatic Tagging" section, click "Parse Roster"
   - Review detected players and their information

3. **Process Photos**
   - Click "Process Photos" to analyze all photos in your project folder
   - Monitor progress and review results
   - Photos are automatically tagged with player information

### Supported Roster Formats

The system can parse various roster formats:

- HTML tables with player information
- Structured player lists
- Common jersey number patterns (#12, Jersey: 12, etc.)
- Player names in various formats

### Supported Photo Formats

- **Standard Formats**: JPG, JPEG, PNG, BMP, TIFF, WebP
- **RAW Formats**: CR2, NEF, ARW, DNG, ORF, RAF, RW2
- **High-Efficiency**: HEIC, HEIF

## Configuration

### Dependencies Required

#### System Dependencies

- **OpenCV**: For face detection and image processing
- **Tesseract**: For OCR and text recognition
- **VCPKG**: For managing C++ dependencies on Windows

#### Rust Dependencies

```toml
opencv = { version = "0.88", features = ["opencv-32", "opencv-contrib"] }
tesseract = "0.3"
scraper = "0.18"
imageproc = "0.23"
```

### Environment Setup

1. **Install OpenCV**

   - Windows: Use VCPKG with `vcpkg install opencv`
   - Linux: `sudo apt-get install libopencv-dev`
   - macOS: `brew install opencv`

2. **Install Tesseract**

   - Windows: Download from GitHub releases
   - Linux: `sudo apt-get install tesseract-ocr`
   - macOS: `brew install tesseract`

3. **Build the Application**
   ```bash
   cd backend/TagIt
   npm run tauri dev
   ```

## Performance Considerations

### Processing Speed

- **Face Detection**: ~100-500ms per photo (depending on image size)
- **OCR Processing**: ~200-800ms per photo (depending on complexity)
- **Batch Processing**: Processes multiple photos concurrently

### Memory Usage

- **Image Processing**: Temporary memory usage during analysis
- **Database Storage**: Efficient JSONB storage for detection results
- **Thumbnail Generation**: Optimized thumbnail creation for UI display

### Optimization Tips

- Use appropriate image resolutions for processing
- Process photos in smaller batches for large collections
- Ensure adequate system memory for concurrent processing

## Troubleshooting

### Common Issues

1. **Face Detection Not Working**

   - Ensure OpenCV is properly installed
   - Check that photos contain clear, front-facing faces
   - Verify image format compatibility

2. **Jersey Numbers Not Detected**

   - Ensure Tesseract is installed and configured
   - Check image quality and contrast
   - Verify jersey numbers are clearly visible

3. **Roster Parsing Fails**

   - Verify the URL is accessible
   - Check that the page contains structured player data
   - Try different roster formats or sources

4. **Performance Issues**
   - Reduce batch size for photo processing
   - Check system resources (CPU, memory)
   - Optimize image resolution before processing

### Debug Information

The system provides detailed logging for troubleshooting:

- Processing progress indicators
- Error messages with specific details
- Success confirmations with result counts
- Database operation status

## Future Enhancements

### Planned Features

- **Face Recognition**: Individual player identification across photos
- **Advanced OCR**: Better number recognition in various fonts and styles
- **Machine Learning**: Improved detection accuracy through training
- **Batch Operations**: Bulk editing and management of detected data

### API Extensions

- **Webhook Support**: Notifications when processing completes
- **External Integrations**: Connect with sports management systems
- **Export Options**: Generate reports and statistics

## Support and Contributing

### Getting Help

- Check the troubleshooting section above
- Review error messages and logs
- Ensure all dependencies are properly installed

### Contributing

- Report bugs and feature requests
- Submit pull requests for improvements
- Help improve detection algorithms

### License

This automatic tagging system is part of TagIt and follows the same licensing terms.

---

**Note**: The automatic tagging system requires proper setup of OpenCV and Tesseract dependencies. Ensure these are correctly installed before using the functionality.
