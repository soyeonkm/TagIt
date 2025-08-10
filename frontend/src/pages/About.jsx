import React from 'react'

function About() {
  return (
    <div className="about-container">
      <div className="about-header">
        <h1 className="about-title">About TagIt</h1>
        <p className="about-subtitle">
          Revolutionizing photo organization with AI-powered tagging
        </p>
      </div>

      <div className="about-content">
        <div className="about-section">
          <div className="section-card">
            <div className="section-icon">🚀</div>
            <h2 className="section-title">Our Mission</h2>
            <p className="section-content">
              TagIt was created to solve the common problem of photo organization. 
              We believe that finding and organizing photos should be effortless, 
              allowing photographers to focus on what they love most - capturing moments.
            </p>
          </div>
        </div>

        <div className="about-section">
          <div className="section-card">
            <div className="section-icon">💡</div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-content">
              Our AI-powered system automatically analyzes your photos and suggests 
              relevant tags, making it easy to organize and find your images. 
              Simply upload your photos, and let our intelligent tagging system do the work.
            </p>
          </div>
        </div>

        <div className="about-section">
          <div className="section-card">
            <div className="section-icon">🔒</div>
            <h2 className="section-title">Privacy First</h2>
            <p className="section-content">
              Your photos stay on your device. We process everything locally, 
              ensuring your privacy and data security. No images are uploaded to external servers.
            </p>
          </div>
        </div>

        <div className="about-section">
          <div className="section-card">
            <div className="section-icon">⚡</div>
            <h2 className="section-title">Lightning Fast</h2>
            <p className="section-content">
              Built with modern web technologies, TagIt provides a smooth and 
              responsive experience. Process thousands of photos in minutes, not hours.
            </p>
          </div>
        </div>

        <div className="about-section">
          <div className="section-card">
            <div className="section-icon">🛠️</div>
            <h2 className="section-title">Built With</h2>
            <div className="tech-stack">
              <div className="tech-item">
                <span className="tech-name">React</span>
                <span className="tech-description">Modern UI framework</span>
              </div>
              <div className="tech-item">
                <span className="tech-name">Tauri</span>
                <span className="tech-description">Cross-platform desktop app</span>
              </div>
              <div className="tech-item">
                <span className="tech-name">Supabase</span>
                <span className="tech-description">Backend as a service</span>
              </div>
              <div className="tech-item">
                <span className="tech-name">AI/ML</span>
                <span className="tech-description">Intelligent photo analysis</span>
              </div>
            </div>
          </div>
        </div>

        <div className="about-section">
          <div className="section-card">
            <div className="section-icon">📞</div>
            <h2 className="section-title">Get in Touch</h2>
            <p className="section-content">
              Have questions or suggestions? We'd love to hear from you! 
              Reach out to our team and help us make TagIt even better.
            </p>
            <div className="contact-actions">
              <button className="btn btn-primary">Contact Support</button>
              <button className="btn btn-outline">Feature Request</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About 