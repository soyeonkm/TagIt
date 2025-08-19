import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AutoTagger({ projectId, projectData }) {
  const { accessToken } = useAuth();
  
  // State for roster management
  const [rosterUrl, setRosterUrl] = useState('');
  const [rosterPlayers, setRosterPlayers] = useState([]);
  const [parsingRoster, setParsingRoster] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [rosterSuccess, setRosterSuccess] = useState('');

  // State for photo processing
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [photoResults, setPhotoResults] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');

  // State for project data
  const [players, setPlayers] = useState([]);
  const [photos, setPhotos] = useState([]);

  // Load existing players and photos on component mount
  useEffect(() => {
    if (projectId && accessToken) {
      loadProjectData();
    }
  }, [projectId, accessToken]);

  // Load project data (players and photos)
  const loadProjectData = async () => {
    try {
      // Load players
      const { invoke } = await import('@tauri-apps/api/core');
      const playersData = await invoke('get_project_players', { 
        projectId, 
        accessToken 
      });
      setPlayers(playersData);

      // Load photos
      const photosData = await invoke('get_project_photos', { 
        projectId, 
        accessToken 
      });
      setPhotos(photosData);
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  // Parse roster from URL
  const handleParseRoster = async () => {
    if (!rosterUrl.trim()) {
      setRosterError('Please enter a roster URL');
      return;
    }

    setParsingRoster(true);
    setRosterError('');
    setRosterSuccess('');

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const players = await invoke('parse_roster_from_url', {
        url: rosterUrl,
        projectId,
        accessToken
      });

      setRosterPlayers(players);
      setPlayers(players);
      setRosterSuccess(`Successfully parsed ${players.length} players from roster`);
      setRosterUrl('');
    } catch (error) {
      setRosterError(`Failed to parse roster: ${error}`);
    } finally {
      setParsingRoster(false);
    }
  };

  // Process photos in the project folder
  const handleProcessPhotos = async () => {
    if (!projectData?.folder_path) {
      setPhotoError('No project folder selected');
      return;
    }

    setProcessingPhotos(true);
    setPhotoError('');
    setPhotoSuccess('');

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const results = await invoke('process_photo_folder', {
        projectId,
        folderPath: projectData.folder_path,
        accessToken
      });

      setPhotoResults(results);
      setPhotos(results);
      setPhotoSuccess(`Successfully processed ${results.length} photos`);
    } catch (error) {
      setPhotoError(`Failed to process photos: ${error}`);
    } finally {
      setProcessingPhotos(false);
    }
  };

  // Clear messages
  const clearMessages = () => {
    setRosterError('');
    setRosterSuccess('');
    setPhotoError('');
    setPhotoSuccess('');
  };

  return (
    <div className="auto-tagger-container">
      <div className="auto-tagger-header">
        <h2>🔄 Automatic Tagging</h2>
        <p>Automatically detect players and tag photos using AI-powered recognition</p>
      </div>

      {/* Roster Management Section */}
      <div className="tagger-section">
        <h3>📋 Roster Management</h3>
        <p>Parse team roster information to enable automatic player identification</p>
        
        <div className="roster-input-group">
          <input
            type="url"
            value={rosterUrl}
            onChange={(e) => setRosterUrl(e.target.value)}
            placeholder="Enter roster URL (e.g., team website, league page)"
            className="roster-url-input"
          />
          <button
            onClick={handleParseRoster}
            disabled={parsingRoster || !rosterUrl.trim()}
            className="btn btn-primary"
          >
            {parsingRoster ? 'Parsing...' : 'Parse Roster'}
          </button>
        </div>

        {rosterError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {rosterError}
            <button onClick={() => setRosterError('')} className="clear-btn">×</button>
          </div>
        )}

        {rosterSuccess && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {rosterSuccess}
            <button onClick={() => setRosterSuccess('')} className="clear-btn">×</button>
          </div>
        )}

        {/* Display parsed players */}
        {rosterPlayers.length > 0 && (
          <div className="players-display">
            <h4>Detected Players ({rosterPlayers.length})</h4>
            <div className="players-grid">
              {rosterPlayers.map((player, index) => (
                <div key={index} className="player-card">
                  <div className="player-name">{player.name}</div>
                  {player.jersey_number && (
                    <div className="player-number">#{player.jersey_number}</div>
                  )}
                  {player.position && (
                    <div className="player-position">{player.position}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo Processing Section */}
      <div className="tagger-section">
        <h3>📸 Photo Processing</h3>
        <p>Process photos in your project folder to automatically detect players and add metadata</p>
        
        <div className="photo-processing-info">
          <div className="info-item">
            <span className="info-label">Project Folder:</span>
            <span className="info-value">{projectData?.folder_path || 'Not selected'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Players in Database:</span>
            <span className="info-value">{players.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Photos Processed:</span>
            <span className="info-value">{photos.length}</span>
          </div>
        </div>

        <button
          onClick={handleProcessPhotos}
          disabled={processingPhotos || !projectData?.folder_path || players.length === 0}
          className="btn btn-primary process-photos-btn"
        >
          {processingPhotos ? 'Processing Photos...' : 'Process Photos'}
        </button>

        {!projectData?.folder_path && (
          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            No project folder selected. Please set a folder path in project settings.
          </div>
        )}

        {projectData?.folder_path && players.length === 0 && (
          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            No players in roster. Please parse a roster first to enable photo processing.
          </div>
        )}

        {photoError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {photoError}
            <button onClick={() => setPhotoError('')} className="clear-btn">×</button>
          </div>
        )}

        {photoSuccess && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {photoSuccess}
            <button onClick={() => setPhotoSuccess('')} className="clear-btn">×</button>
          </div>
        )}

        {/* Display processing results */}
        {photoResults.length > 0 && (
          <div className="photo-results">
            <h4>Processing Results</h4>
            <div className="results-summary">
              <div className="summary-item">
                <span className="summary-label">Total Photos:</span>
                <span className="summary-value">{photoResults.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Photos with Players:</span>
                <span className="summary-value">
                  {photoResults.filter(p => p.detected_players.length > 0).length}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Faces Detected:</span>
                <span className="summary-value">
                  {photoResults.reduce((sum, p) => sum + p.detected_faces.length, 0)}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Jersey Numbers:</span>
                <span className="summary-value">
                  {photoResults.reduce((sum, p) => sum + p.detected_jersey_numbers.length, 0)}
                </span>
              </div>
            </div>

            <div className="results-details">
              {photoResults.slice(0, 5).map((photo, index) => (
                <div key={index} className="photo-result-item">
                  <div className="photo-info">
                    <span className="photo-name">{photo.file_name}</span>
                    <span className="photo-size">({(photo.file_size / 1024 / 1024).toFixed(1)} MB)</span>
                  </div>
                  {photo.detected_players.length > 0 && (
                    <div className="detected-players">
                      <span className="label">Players:</span>
                      {photo.detected_players.map((player, pIndex) => (
                        <span key={pIndex} className="player-tag">
                          {player.name}
                          {player.jersey_number && ` (#${player.jersey_number})`}
                        </span>
                      ))}
                    </div>
                  )}
                  {photo.description && (
                    <div className="photo-description">
                      <span className="label">Description:</span>
                      <span className="description-text">{photo.description}</span>
                    </div>
                  )}
                </div>
              ))}
              {photoResults.length > 5 && (
                <div className="more-results">
                  ... and {photoResults.length - 5} more photos
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clear Messages Button */}
      {(rosterError || rosterSuccess || photoError || photoSuccess) && (
        <div className="clear-messages">
          <button onClick={clearMessages} className="btn btn-secondary">
            Clear Messages
          </button>
        </div>
      )}
    </div>
  );
}

export default AutoTagger;
