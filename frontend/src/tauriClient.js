import { invoke } from '@tauri-apps/api/core';

// Check if we're running in Tauri environment
const isTauri = typeof window !== 'undefined' && window.__TAURI__;

// Tauri client that mimics Supabase API structure
export const tauriAuth = {
  signUp: async ({ email, password }) => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    try {
      const user = await invoke('sign_up', { email, password });
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  signInWithPassword: async ({ email, password }) => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    try {
      const user = await invoke('sign_in', { email, password });
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  getUser: async () => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    try {
      // Note: This would need an access token from the frontend
      // For now, we'll need to implement token storage
      const user = await invoke('get_user', { accessToken: 'temp' });
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  resetPasswordForEmail: async (email) => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    try {
      await invoke('reset_password', { email });
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  signOut: async () => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    // Tauri backend doesn't have sign out implemented yet
    return { error: null };
  },

  onAuthStateChange: (callback) => {
    if (!isTauri) {
      // Return a mock subscription object for web
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
    
    // Tauri backend doesn't have auth state change implemented yet
    // Return a mock subscription object
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }
};

export const tauriProfiles = {
  insert: async (profileData, accessToken) => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    try {
      await invoke('create_profile', { profile: profileData[0], accessToken });
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  select: (columns = '*') => ({
    eq: (field, value) => ({
      single: async () => {
        if (!isTauri) {
          return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
        }
        
        try {
          if (field === 'id') {
            // Note: This will need access token from the caller
            const profile = await invoke('get_profile', { userId: value, accessToken: 'temp' });
            return { data: profile, error: null };
          } else {
            return { data: null, error: { message: 'Field not supported' } };
          }
        } catch (error) {
          return { data: null, error: { message: error } };
        }
      }
    })
  })
};

export const tauriProjects = {
  select: (columns = '*') => ({
    eq: (field, value) => ({
      eq: (field2, value2) => ({
        single: async () => {
          if (!isTauri) {
            return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
          }
          
          try {
            if (field === 'id' && field2 === 'user_id') {
              // Note: This will need access token from the caller
              const project = await invoke('get_project_by_id', { 
                projectId: value, 
                userId: value2,
                accessToken: 'temp'
              });
              return { data: project, error: null };
            } else {
              return { data: null, error: { message: 'Field combination not supported' } };
            }
          } catch (error) {
            return { data: null, error: { message: error } };
          }
        }
      }),
      order: (field, direction) => ({
        // This is a mock implementation - we'll need to implement proper querying
        async then(resolve) {
          if (!isTauri) {
            resolve({ data: null, error: { message: 'This application requires the Tauri desktop app to run.' } });
            return;
          }
          
          try {
            if (field === 'user_id') {
              // Note: This will need access token from the caller
              const projects = await invoke('get_projects', { userId: value, accessToken: 'temp' });
              resolve({ data: projects, error: null });
            } else {
              resolve({ data: [], error: null });
            }
          } catch (error) {
            resolve({ data: null, error: { message: error } });
          }
        }
      })
    })
  }),

  insert: async (projectData, accessToken) => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    console.log('Debug - tauriProjects.insert called with:'); // Debug log
    console.log('Debug - projectData:', projectData); // Debug log
    console.log('Debug - accessToken:', accessToken); // Debug log
    
    // Check if accessToken is provided
    if (!accessToken) {
      console.error('Debug - accessToken is missing or null');
      return { data: null, error: { message: 'Access token is required. Please sign in first.' } };
    }
    
    try {
      // projectData is already an array, so we take the first element
      const project = await invoke('create_project', { project: projectData[0], accessToken });
      return { data: [project], error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  }
};

// Main tauriSupabase object that mimics Supabase client structure
export const tauriSupabase = {
  auth: tauriAuth,
  from: (table) => {
    switch (table) {
      case 'profiles':
        return tauriProfiles;
      case 'projects':
        return tauriProjects;
      default:
        throw new Error(`Table ${table} not implemented in backend`);
    }
  }
};

// Utility functions for file system operations
export const tauriUtils = {
  selectFolder: async () => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    try {
      const folderPath = await invoke('select_folder');
      return { data: folderPath, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  selectFolderWithInfo: async () => {
    if (!isTauri) {
      return { data: null, error: { message: 'This application requires the Tauri desktop app to run.' } };
    }
    
    try {
      const folderInfo = await invoke('select_folder_with_info');
      return { data: folderInfo, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  }
};
