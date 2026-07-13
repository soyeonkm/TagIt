import { createContext, useContext, useState, useEffect } from 'react'
import { tauriSupabase } from '../tauriClient'

// Tauri v2 compatibility: __TAURI__ was renamed to __TAURI_INTERNALS__
const isRunningInTauri = () => typeof window !== 'undefined' && !!(window.__TAURI__ || window.__TAURI_INTERNALS__);

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mockProjects, setMockProjects] = useState([])

  // Check if we're in development mode
  // FIXED: This should be true when running in browser (DEV mode) and NOT in Tauri
  const isDevelopment = import.meta.env.DEV && !isRunningInTauri();

  // Mock data for development
  const initializeMockData = () => {
    const storedProjects = localStorage.getItem('mockProjects');
    if (storedProjects) {
      setMockProjects(JSON.parse(storedProjects));
    } else {
      // Default mock projects
      const defaultProjects = [
        {
          id: '1',
          name: 'Summer Soccer Tournament',
          description: 'Photos from the annual summer soccer tournament',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T15:30:00Z',
          user_id: 'mock-user-id',
          photo_count: 156,
          status: 'active'
        },
        {
          id: '2',
          name: 'Basketball Championship',
          description: 'Championship game highlights and team photos',
          created_at: '2024-01-10T09:00:00Z',
          updated_at: '2024-01-18T14:20:00Z',
          user_id: 'mock-user-id',
          photo_count: 89,
          status: 'active'
        },
        {
          id: '3',
          name: 'Track & Field Meet',
          description: 'Regional track and field competition photos',
          created_at: '2024-01-05T08:00:00Z',
          updated_at: '2024-01-12T16:45:00Z',
          user_id: 'mock-user-id',
          photo_count: 234,
          status: 'completed'
        }
      ];
      setMockProjects(defaultProjects);
      localStorage.setItem('mockProjects', JSON.stringify(defaultProjects));
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isDevelopment) {
          // Development mode - check for stored mock user and initialize mock data
          const storedUser = localStorage.getItem('mockUser');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
            setAccessToken('mock-token');
          }
          initializeMockData();
          setLoading(false);
        } else if (isRunningInTauri()) {
          // Tauri environment - check for existing user session
          setLoading(false)
        } else {
          // Web environment - show message that Tauri is required
          console.log('This application requires the Tauri desktop app to run.');
          setLoading(false)
        }
      } catch (error) {
        console.log('No existing session found');
        setLoading(false);
      }
    };

    initializeAuth();
  }, [isDevelopment])

  // Mock project functions for development
  const createMockProject = async (projectData) => {
    if (isDevelopment) {
      console.log('Creating mock project with data:', projectData);
      console.log('Current mockProjects state:', mockProjects);
      
      const newProject = {
        id: Date.now().toString(),
        ...projectData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id || 'mock-user-id',
        photo_count: 0,
        status: 'active',
        folder_path: projectData.folder_path || '/mock/default/folder'
      };
      
      console.log('New mock project created:', newProject);
      
      const updatedProjects = [...mockProjects, newProject];
      setMockProjects(updatedProjects);
      localStorage.setItem('mockProjects', JSON.stringify(updatedProjects));
      
      console.log('Updated mockProjects state:', updatedProjects);
      console.log('Stored in localStorage:', JSON.parse(localStorage.getItem('mockProjects') || '[]'));
      
      return { data: [newProject], error: null };
    }
    return { data: null, error: { message: 'Not in development mode' } };
  };

  const getMockProjects = async () => {
    if (isDevelopment) {
      console.log('Getting mock projects, current state:', mockProjects);
      return { data: mockProjects, error: null };
    }
    return { data: null, error: { message: 'Not in development mode' } };
  };

  const getMockProject = async (projectId) => {
    if (isDevelopment) {
      console.log('Getting mock project by ID:', projectId);
      console.log('Available mock projects:', mockProjects);
      
      // First try to find in current state
      let project = mockProjects.find(p => p.id === projectId);
      
      // If not found in state, try localStorage as fallback
      if (!project) {
        console.log('Project not found in state, checking localStorage...');
        const storedProjects = JSON.parse(localStorage.getItem('mockProjects') || '[]');
        console.log('Stored projects from localStorage:', storedProjects);
        project = storedProjects.find(p => p.id === projectId);
        
        if (project) {
          console.log('Found project in localStorage, updating state...');
          setMockProjects(storedProjects);
        }
      }
      
      console.log('Final found project:', project);
      
      return { data: project, error: project ? null : { message: 'Project not found' } };
    }
    return { data: null, error: { message: 'Not in development mode' } };
  };

  // Sign in with Tauri backend or mock in development
  const signInWithPassword = async (email, password) => {
    try {
      if (isDevelopment) {
        // Mock authentication for development
        const mockUser = {
          id: 'mock-user-id',
          email: email,
          user_metadata: { name: 'Demo User' }
        };
        setUser(mockUser);
        setAccessToken('mock-token');
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        return { data: { user: mockUser }, error: null };
      } else {
        // Tauri authentication
        const { data, error } = await tauriSupabase.auth.signInWithPassword({ email, password })
        if (error) {
          throw error
        }
        
        if (data && data.user) {
          const userObj = {
            id: data.user.id,
            email: data.user.email,
            user_metadata: {}
          }
          setUser(userObj)
          
          if (data.user.access_token) {
            setAccessToken(data.user.access_token)
          }
          
          return { data: { user: userObj }, error: null }
        }
        
        return { data, error: null }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  }

  // Sign up with Tauri backend or mock in development
  const signUp = async (email, password, profileData = null) => {
    try {
      if (isDevelopment) {
        // Mock signup for development
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          email: email,
          user_metadata: profileData || { name: 'New User' }
        };
        setUser(mockUser);
        setAccessToken('mock-token');
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        return { data: { user: mockUser }, error: null };
      } else {
        // Tauri signup
        const { data, error } = await tauriSupabase.auth.signUp({ email, password })
        if (error) {
          throw error
        }
        
        if (data && data.user) {
          const userObj = {
            id: data.user.id,
            email: data.user.email,
            user_metadata: {}
          }
          setUser(userObj)
          
          if (data.user.access_token) {
            setAccessToken(data.user.access_token)
            
            if (profileData && data.user.access_token) {
              try {
                const profileWithId = {
                  ...profileData,
                  id: data.user.id
                }
                await tauriSupabase.from('profiles').insert([profileWithId], data.user.access_token)
              } catch (profileError) {
                console.error('Failed to create profile:', profileError)
              }
            }
          }
          
          return { data: { user: userObj }, error: null }
        }
        
        return { data, error: null }
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      if (isDevelopment) {
        // Mock signout for development
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('mockUser');
        return { error: null };
      } else {
        // Tauri signout
        await tauriSupabase.auth.signOut();
        setUser(null)
        setAccessToken(null)
        return { error: null }
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setUser(null);
      setAccessToken(null);
      if (isDevelopment) {
        localStorage.removeItem('mockUser');
      }
      return { error }
    }
  }

  // Get current user
  const getCurrentUser = () => {
    return user
  }

  const value = {
    user,
    accessToken,
    loading,
    signInWithPassword,
    signUp,
    signOut,
    getCurrentUser,
    isDevelopment,
    // Mock functions for development
    createMockProject,
    getMockProjects,
    getMockProject,
    mockProjects
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
