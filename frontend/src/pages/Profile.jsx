import React, { useEffect, useState } from 'react'
import { tauriSupabase } from '../tauriClient'

function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tauriSupabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  useEffect(() => {
    if (user) {
      tauriSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setProfile(data)
          setLoading(false)
        })
    } else if (user === null) {
      setLoading(false)
    }
  }, [user])

  let displayName = ''
  if (profile && profile.first_name) {
    displayName = profile.first_name
  }
  if (!displayName && user && user.email) {
    displayName = user.email
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">
          {displayName ? `${displayName}'s Profile` : 'My Profile'}
        </h1>
        <p className="profile-subtitle">Manage your account and preferences</p>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            <div className="avatar-placeholder">
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{displayName || 'User'}</h2>
            <p className="profile-email">{user?.email}</p>
            <div className="profile-meta">
              <div className="meta-item">
                <span className="meta-label">Member since</span>
                <span className="meta-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Account status</span>
                <span className="meta-value status-verified">Verified</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-sections">
          <div className="section-card">
            <h3 className="section-title">Account Settings</h3>
            <div className="settings-list">
              <button className="setting-item">
                <div className="setting-icon">✏️</div>
                <div className="setting-content">
                  <span className="setting-label">Edit Profile</span>
                  <span className="setting-description">Update your personal information</span>
                </div>
                <span className="setting-arrow">→</span>
              </button>
              <button className="setting-item">
                <div className="setting-icon">🔒</div>
                <div className="setting-content">
                  <span className="setting-label">Change Password</span>
                  <span className="setting-description">Update your account password</span>
                </div>
                <span className="setting-arrow">→</span>
              </button>
              <button className="setting-item">
                <div className="setting-icon">⚙️</div>
                <div className="setting-content">
                  <span className="setting-label">Preferences</span>
                  <span className="setting-description">Customize your app experience</span>
                </div>
                <span className="setting-arrow">→</span>
              </button>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title">Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Projects</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Photos</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">0</div>
                <div className="stat-label">Tags</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile 