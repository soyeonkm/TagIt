import { invoke } from '@tauri-apps/api/core';

// Tauri client that mimics Supabase API structure
export const tauriAuth = {
  signUp: async ({ email, password }) => {
    try {
      const user = await invoke('sign_up', { email, password });
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  signInWithPassword: async ({ email, password }) => {
    try {
      const user = await invoke('sign_in', { email, password });
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  getUser: async () => {
    try {
      // Note: This would need an access token from the frontend
      // For now, we'll need to implement token storage
      const user = await invoke('get_user', { accessToken: 'temp' });
      return { data: { user }, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  },

  // Password reset still uses direct Supabase for now
  resetPasswordForEmail: async (email, options) => {
    // This will still use the original supabase client
    // We can implement this in the backend later
    throw new Error('Password reset not yet implemented in backend');
  }
};

export const tauriProfiles = {
  insert: async (profileData) => {
    try {
      await invoke('create_profile', { profile: profileData[0] });
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
  }
};

export const tauriProjects = {
  select: (columns = '*') => ({
    eq: (field, value) => ({
      order: (field, direction) => ({
        // This is a mock implementation - we'll need to implement proper querying
        async then(resolve) {
          try {
            if (field === 'user_id') {
              const projects = await invoke('get_projects', { userId: value });
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

  insert: async (projectData) => {
    try {
      const project = await invoke('create_project', { project: projectData[0] });
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
