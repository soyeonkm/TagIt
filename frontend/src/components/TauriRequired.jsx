import React from 'react';

const TauriRequired = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: 'var(--background-color)',
      color: 'var(--text-color)'
    }}>
      <div style={{
        maxWidth: '600px',
        padding: '2rem',
        borderRadius: 'var(--border-radius)',
        backgroundColor: 'var(--card-color)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)'
      }}>
        <h1 style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          color: 'var(--primary-color)'
        }}>
          🖥️ Tauri Desktop App Required
        </h1>
        
        <p style={{
          fontSize: '1.1rem',
          marginBottom: '1.5rem',
          lineHeight: '1.6',
          color: 'var(--text-secondary)'
        }}>
          This application is designed to run as a desktop application using the Tauri framework. 
          It cannot run in a web browser for security reasons.
        </p>
        
        <div style={{
          backgroundColor: 'var(--warning-bg)',
          border: '1px solid var(--warning-border)',
          borderRadius: 'var(--border-radius)',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{
            margin: 0,
            color: 'var(--warning-text)',
            fontWeight: '500'
          }}>
            <strong>Why?</strong> All database operations and API calls are handled securely through 
            the desktop backend to protect your data and API keys.
          </p>
        </div>
        
        <h2 style={{
          fontSize: '1.5rem',
          marginBottom: '1rem',
          color: 'var(--accent-color)'
        }}>
          How to Run
        </h2>
        
        <ol style={{
          textAlign: 'left',
          lineHeight: '1.8',
          color: 'var(--text-secondary)'
        }}>
          <li>Download and install the TagIt desktop application</li>
          <li>Launch the application from your desktop or start menu</li>
          <li>Sign in with your credentials</li>
          <li>Enjoy a secure, native desktop experience!</li>
        </ol>
        
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--info-bg)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--info-border)'
        }}>
          <p style={{
            margin: 0,
            color: 'var(--info-text)',
            fontSize: '0.9rem'
          }}>
            <strong>Note:</strong> If you're a developer and need to run this in development mode, 
            use <code>npm run tauri dev</code> from the backend directory.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TauriRequired;
