import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Rosters() {
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()

  const [rosters, setRosters] = useState([])
  const [pdfPath, setPdfPath] = useState('')
  const [rosterName, setRosterName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [players, setPlayers] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [duplicate, setDuplicate] = useState('')

  useEffect(() => {
    if (accessToken && user?.id) loadRosters()
  }, [accessToken, user])

  const loadRosters = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      setRosters(await invoke('list_rosters', { userId: user.id, accessToken }))
    } catch (err) {
      console.error('Failed to load rosters:', err)
    }
  }

  const handleChoosePdf = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const path = await invoke('select_pdf_file')
      setPdfPath(path)
      // Default the name to the file name; the user can change it.
      if (!rosterName) setRosterName(path.split(/[\\/]/).pop().replace(/\.pdf$/i, ''))
    } catch (_cancelled) {
      // user cancelled
    }
  }

  const handleParse = async () => {
    setError('')
    setSuccess('')
    setDuplicate('')
    setPlayers([])
    setParsing(true)

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const result = await invoke('parse_roster_from_pdf', {
        pdfPath,
        name: rosterName.trim(),
        userId: user.id,
        accessToken,
      })

      if (result.duplicate) {
        setDuplicate(result.message)
      } else {
        setPlayers(result.players)
        setSuccess(result.message)
        setPdfPath('')
        setRosterName('')
        await loadRosters()
      }
    } catch (err) {
      setError(`Failed to parse PDF roster: ${err}`)
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="project-edit-container">
      <div className="project-edit-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <span className="back-arrow">←</span>
          Back
        </button>
        <div className="project-title-section">
          <h1>📋 Rosters</h1>
          <p>Upload a roster PDF — sport, season, player names and jersey numbers are extracted and saved.</p>
        </div>
      </div>

      <div className="project-edit-content">
        <div className="edit-section">
          <h2>📄 Upload Roster PDF</h2>

          <div className="pdf-upload-area">
            <div className="pdf-upload-icon">📄</div>
            <div className="pdf-upload-info">
              {pdfPath ? (
                <span className="pdf-selected-name">📎 {pdfPath.split(/[\\/]/).pop()}</span>
              ) : (
                <span className="pdf-upload-hint">Select a roster PDF from your computer</span>
              )}
            </div>
            <button className="btn btn-secondary pdf-upload-btn" onClick={handleChoosePdf} disabled={parsing}>
              📂 Choose PDF
            </button>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="roster-name" style={{ fontWeight: 'bold' }}>Roster name</label>
            <input
              id="roster-name"
              type="text"
              value={rosterName}
              onChange={(e) => setRosterName(e.target.value)}
              placeholder="e.g. Varsity Basketball 2026-2027"
              disabled={parsing}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100%' }}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={handleParse}
            disabled={parsing || !pdfPath || !rosterName.trim()}
          >
            {parsing ? <><span className="btn-spinner" /> Parsing PDF…</> : '💾 Parse & Save Roster'}
          </button>

          {parsing && (
            <div className="parsing-progress">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" />
              </div>
              <p className="progress-label">Reading PDF with Gemini Vision AI — this may take a moment…</p>
            </div>
          )}

          {error && (
            <div className="error-message" style={{ marginTop: '12px' }}>
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button className="clear-btn" onClick={() => setError('')}>✕</button>
            </div>
          )}
          {success && (
            <div className="success-message" style={{ marginTop: '12px' }}>
              <span className="success-icon">✅</span>
              <span>{success}</span>
              <button className="clear-btn" onClick={() => setSuccess('')}>✕</button>
            </div>
          )}
          {duplicate && (
            <div className="warning-message" style={{ marginTop: '12px' }}>
              <span className="warning-icon">⚠️</span>
              <span>{duplicate}</span>
            </div>
          )}

          {players.length > 0 && (
            <div className="players-display">
              <h4>👥 Detected Players ({players.length})</h4>
              <div className="players-grid">
                {players.map((player, index) => (
                  <div key={index} className="player-card">
                    <div className="player-name">{player.name}</div>
                    {player.jersey_number != null && (
                      <div className="player-number">#{player.jersey_number}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="edit-section">
          <h2>Saved Rosters ({rosters.length})</h2>
          {rosters.length === 0 ? (
            <p>No rosters yet.</p>
          ) : (
            <ul>
              {rosters.map((r) => (
                <li key={r.id}>
                  <strong>{r.name}</strong> — {r.sport} {r.season}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Rosters
