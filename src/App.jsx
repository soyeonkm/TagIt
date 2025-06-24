import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Project from './pages/Project'

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/project" element={<Project />} />
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  )
}

export default App 