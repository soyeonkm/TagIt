import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Project from './pages/Project'
import CreateProject from './pages/CreateProject'
import ResetPassword from './pages/ResetPassword'
import TauriRequired from './components/TauriRequired'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  // Check if we're running in Tauri environment
  const isTauri = typeof window !== 'undefined' && window.__TAURI__;

  // If not in Tauri, show the requirement message
  if (!isTauri) {
    return <TauriRequired />;
  }

  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-project" element={<CreateProject />} />
            <Route path="/project" element={<Project />} />
            <Route path="/project/:id" element={<Project />} />
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}

export default App 