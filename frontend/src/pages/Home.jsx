import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

function Home() {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const scrollToFeatures = () => {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className={`hero-section ${isVisible ? 'fade-in' : ''}`}>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Instant Photo Tagging <br></br>
              & Organization<br></br>
              <span className="highlight">—No Uploads, No Fuss</span>
            </h1>
            <p className="hero-subtitle">
              Transform your sports photography workflow with AI-powered tagging and intelligent project management. 
              Organize, categorize, and find your photos faster than ever before.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">10x</span>
                <span className="stat-label">Faster Organization</span>
              </div>
              <div className="stat">
                <span className="stat-number">AI-Powered</span>
                <span className="stat-label">Smart Tagging</span>
              </div>
              <div className="stat">
                <span className="stat-number">100%</span>
                <span className="stat-label">Local Processing</span>
              </div>
            </div>
            <div className="hero-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/dashboard')}
              >
                Get Started Free
              </button>
              <button 
                className="btn btn-secondary"
                onClick={scrollToFeatures}
              >
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-container">
              <img
                src="https://i.pinimg.com/736x/a0/06/ff/a006ffc3d1226ab9e0d8d149799406fa.jpg"
                alt="Football player running"
                className="hero-image"
              />
              <div className="floating-card card-1">
                <div className="card-icon">🔍</div>
                <div className="card-text">Jersey Number Detection</div>
              </div>
              <div className="floating-card card-2">
                <div className="card-icon">🏈</div>
                <div className="card-text">Player Name Detection</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose TagIt?</h2>
            <p className="section-subtitle">
              Built for photographers who value speed, organization, and simplicity
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Lightning Fast</h3>
              <p className="feature-description">
                Process thousands of photos in seconds with our optimized local processing engine
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3 className="feature-title">AI-Powered</h3>
              <p className="feature-description">
                Advanced machine learning automatically tags and categorizes your sports photos
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Privacy First</h3>
              <p className="feature-description">
                All processing happens locally on your device - your photos never leave your computer
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Smart Analytics</h3>
              <p className="feature-description">
                Get insights into your photography patterns and project organization
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3 className="feature-title">Seamless Workflow</h3>
              <p className="feature-description">
                Integrates with your existing photography tools and workflow
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3 className="feature-title">Cross-Platform</h3>
              <p className="feature-description">
                Works on Windows, Mac, and Linux with a consistent experience
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Three simple steps to transform your photo organization
            </p>
          </div>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">Select Your Photos</h3>
                <p className="step-description">
                  Choose the folder containing your sports photos or drag and drop individual files
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">AI Processing</h3>
                <p className="step-description">
                  Our AI analyzes each photo and automatically applies relevant tags and categories
                </p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">Organize & Share</h3>
                <p className="step-description">
                  Browse your organized collection, create projects, and share with clients or team
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Photo Workflow?</h2>
            <p className="cta-subtitle">
              Join thousands of photographers who've already streamlined their organization process
            </p>
            <div className="cta-buttons">
              <button 
                className="btn btn-primary btn-large"
                onClick={() => navigate('/dashboard')}
              >
                Start Free Trial
              </button>
              <button 
                className="btn btn-outline btn-large"
                onClick={() => navigate('/about')}
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home        