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

  resetPasswordForEmail: async (email) => {
    try {
      await invoke('reset_password', { email });
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: { message: error } };
    }
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
  },

  select: (columns = '*') => ({
    eq: (field, value) => ({
      single: async () => {
        try {
          if (field === 'id') {
            const profile = await invoke('get_profile', { userId: value });
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
          try {
            if (field === 'id' && field2 === 'user_id') {
              const project = await invoke('get_project_by_id', { 
                projectId: value, 
                userId: value2 
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
