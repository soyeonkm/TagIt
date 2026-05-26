import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { convertFileSrc } from '@tauri-apps/api/core';

function AutoTagger({ projectId, projectData }) {
  const { accessToken } = useAuth();
  const fileInputRef = useRef(null);

  // ── Roster state ──────────────────────────────────────────────────────────
  const [rosterPlayers, setRosterPlayers] = useState([]);
  const [parsingRoster, setParsingRoster] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [rosterSuccess, setRosterSuccess] = useState('');
  const [parsingInfo, setParsingInfo] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  // ── Photo processing state ────────────────────────────────────────────────
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [photoResults, setPhotoResults] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');

  // ── General state ─────────────────────────────────────────────────────────
  const [players, setPlayers] = useState([]);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (projectId && accessToken) {
      loadProjectData();
    }
  }, [projectId, accessToken]);

  const loadProjectData = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const playersData = await invoke('get_project_players', { projectId, accessToken });
      setPlayers(playersData);
      const photosData = await invoke('get_project_photos', { projectId, accessToken });
      setPhotos(photosData);
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  // ── PDF upload handler ────────────────────────────────────────────────────
  const handleUploadRoster = async () => {
    setRosterError('');
    setRosterSuccess('');
    setParsingInfo(null);

    try {
      const { invoke } = await import('@tauri-apps/api/core');

      // Open native PDF file picker (handled by Rust/rfd)
      let pdfPath;
      try {
        pdfPath = await invoke('select_pdf_file');
      } catch (_cancelled) {
        return; // user cancelled
      }

      setSelectedFileName(pdfPath.split(/[\\/]/).pop());
      setParsingRoster(true);

      const result = await invoke('parse_roster_from_pdf', {
        pdfPath,
        projectId,
        accessToken,
      });

      if (result.success) {
        setRosterPlayers(result.players);
        setPlayers(result.players);
        setRosterSuccess(
          result.players.length > 0
            ? `✅ Successfully parsed ${result.players.length} players from PDF`
            : `⚠️ Couldn't detect any players in this PDF`
        );
        setParsingInfo({
          method: result.parsing_method,
          details: result.parsing_details,
          playerCount: result.players.length,
        });
      } else {
        setRosterError(`Failed to parse PDF: ${result.error_message || 'Unknown error'}`);
        setParsingInfo({
          method: result.parsing_method,
          details: result.parsing_details,
          playerCount: 0,
        });
      }
    } catch (error) {
      setRosterError(`Failed to parse PDF roster: ${error}`);
    } finally {
      setParsingRoster(false);
    }
  };

  // ── Photo processing handler ──────────────────────────────────────────────
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
        accessToken,
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

  const clearMessages = () => {
    setRosterError('');
    setRosterSuccess('');
    setPhotoError('');
    setPhotoSuccess('');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="auto-tagger-container">
      <div className="auto-tagger-header">
        <h2>🔄 Automatic Tagging</h2>
        <p>Upload a roster PDF to extract players, then process photos for automatic identification</p>
      </div>

      {/* ── Roster Section ── */}
      <div className="tagger-section">
        <h3>📋 Roster Management</h3>
        <p>
          Upload your team roster PDF — player names, jersey numbers, positions, and headshots will
          be automatically extracted and saved to your project.
        </p>

        <div className="pdf-upload-area">
          <div className="pdf-upload-icon">📄</div>
          <div className="pdf-upload-info">
            {selectedFileName ? (
              <span className="pdf-selected-name">📎 {selectedFileName}</span>
            ) : (
              <span className="pdf-upload-hint">Select a roster PDF from your computer</span>
            )}
          </div>
          <button
            className="btn btn-primary pdf-upload-btn"
            onClick={handleUploadRoster}
            disabled={parsingRoster}
          >
            {parsingRoster ? (
              <>
                <span className="btn-spinner" />
                Parsing PDF…
              </>
            ) : (
              <>📂 Upload Roster PDF</>
            )}
          </button>
        </div>

        {parsingRoster && (
          <div className="parsing-progress">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" />
            </div>
            <p className="progress-label">Reading PDF with Gemini Vision AI — this may take a moment…</p>
          </div>
        )}

        {rosterError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{rosterError}</span>
            <button className="clear-btn" onClick={() => setRosterError('')}>✕</button>
          </div>
        )}

        {rosterSuccess && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            <span>{rosterSuccess}</span>
            <button className="clear-btn" onClick={() => setRosterSuccess('')}>✕</button>
          </div>
        )}

        {parsingInfo && (
          <div className="parsing-info">
            <h4>📊 Parsing Result</h4>
            <div className="parsing-details">
              <div className="parsing-method">
                <span className="method-label">Method:</span>
                <span className="method-value">{parsingInfo.method}</span>
              </div>
              <div className="parsing-details-text">
                <span className="details-label">Details:</span>
                <span className="details-value">{parsingInfo.details}</span>
              </div>
              <div className="parsing-stats">
                <span className="stats-label">Players Found:</span>
                <span className="stats-value">{parsingInfo.playerCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Player grid */}
        {rosterPlayers.length > 0 && (
          <div className="players-display">
            <h4>👥 Detected Players ({rosterPlayers.length})</h4>
            <div className="players-grid">
              {rosterPlayers.map((player, index) => (
                <div key={index} className="player-card">
                  {/* Face avatar */}
                  <div className="player-avatar-wrap">
                    {player.face_image_base64 ? (
                      <img
                        className="player-avatar"
                        src={`data:image/jpeg;base64,${player.face_image_base64}`}
                        alt={player.name}
                      />
                    ) : (
                      <div className="player-avatar-placeholder">👤</div>
                    )}
                  </div>

                  <div className="player-name">{player.name}</div>

                  {player.jersey_number != null && (
                    <div className="player-number">#{player.jersey_number}</div>
                  )}
                  {player.position && (
                    <div className="player-position">{player.position}</div>
                  )}
                  {player.sport_type && (
                    <div className="player-sport">🎯 {player.sport_type}</div>
                  )}
                  {player.school_name && (
                    <div className="player-school">🎓 {player.school_name}</div>
                  )}
                  {player.team && !player.school_name && (
                    <div className="player-team">🏆 {player.team}</div>
                  )}
                  {player.face_descriptor && (
                    <div className="player-face-desc" title={player.face_descriptor}>
                      🔍 <em>Face description recorded</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Photo Processing Section ── */}
      <div className="tagger-section">
        <h3>📸 Photo Processing</h3>
        <p>Process photos in your project folder to automatically detect and tag players</p>

        <div className="photo-processing-info">
          <div className="info-item">
            <span className="info-label">Project Folder:</span>
            <span className="info-value">{projectData?.folder_path || 'Not selected'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Players in Roster:</span>
            <span className="info-value">{players.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Photos Processed:</span>
            <span className="info-value">{photoResults.length}</span>
          </div>
        </div>

        {!projectData?.folder_path && (
          <div className="warning-message">
            <span className="warning-icon">⚠️</span>
            <span>Please select a project folder first before processing photos.</span>
          </div>
        )}

        {players.length === 0 && (
          <div className="warning-message">
            <span className="warning-icon">💡</span>
            <span>Upload a roster PDF first so players can be matched to faces in photos.</span>
          </div>
        )}

        <button
          className="btn btn-primary process-photos-btn"
          onClick={handleProcessPhotos}
          disabled={processingPhotos || !projectData?.folder_path}
        >
          {processingPhotos ? '⏳ Processing Photos…' : '🔍 Process Photos'}
        </button>

        {photoError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{photoError}</span>
            <button className="clear-btn" onClick={() => setPhotoError('')}>✕</button>
          </div>
        )}

        {photoSuccess && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            <span>{photoSuccess}</span>
          </div>
        )}

        {photoResults.length > 0 && (
          <div className="photo-results">
            <h4>📸 Photo Results ({photoResults.length} photos processed)</h4>
            <div className="results-details">
              {photoResults.slice(0, 5).map((photo, index) => (
                <div key={index} className="photo-result-item" style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '15px' }}>
                  {/* Render Thumbnail */}
                  {photo.file_path && (
                    <div className="photo-thumbnail-preview" style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                      <img 
                        src={convertFileSrc(photo.file_path)}
                        alt={photo.file_name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none'; // hide if broken
                        }}
                      />
                    </div>
                  )}
                  <div className="photo-details-content" style={{ flex: 1 }}>
                    <div className="photo-info">
                      <span className="photo-name">{photo.file_name}</span>
                      <span className="photo-size">{(photo.file_size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    {photo.detected_players?.length > 0 && (
                      <div className="detected-players">
                        <span className="label">Players detected:</span>
                        {photo.detected_players.map((p, i) => (
                          <span key={i} className="player-tag">
                            {p.name}{p.jersey_number != null ? ` #${p.jersey_number}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {photo.description && (
                      <div className="photo-description">
                        <span className="description-text">{photo.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {photoResults.length > 5 && (
                <div className="more-results">
                  … and {photoResults.length - 5} more photos processed
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoTagger;
