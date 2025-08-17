use anyhow::Result;
use serde::{Deserialize, Serialize};
use reqwest::Client;
use crate::config::Config;

// Data structures for Supabase operations
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub access_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub profile_color: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: Option<String>,
    pub user_id: String,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub created_at: Option<String>,
    pub folder_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub user_id: String,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub folder_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: Option<AuthUser>,
    pub error: Option<String>,
}

pub struct SupabaseService {
    client: Client,
    base_url: String,
    anon_key: String,
}

impl SupabaseService {
    pub fn new() -> Result<Self> {
        let config = Config::new();
        let client = Client::new();

        Ok(Self {
            client,
            base_url: config.supabase_url,
            anon_key: config.supabase_anon_key,
        })
    }

    // Authentication methods
    pub async fn sign_up(&self, email: &str, password: &str) -> Result<AuthUser> {
        let url = format!("{}/auth/v1/signup", self.base_url);

        let response = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "email": email,
                "password": password
            }))
            .send()
            .await?;

        if response.status().is_success() {
            let data: serde_json::Value = response.json().await?;
            println!("Debug - Supabase sign_up response: {:?}", data); // Debug log
            
            if let Some(user) = data.get("user") {
                let access_token = data.get("access_token")
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());
                
                println!("Debug - Extracted access_token: {:?}", access_token); // Debug log
                
                Ok(AuthUser {
                    id: user["id"].as_str().unwrap_or("").to_string(),
                    email: user["email"].as_str().unwrap_or("").to_string(),
                    access_token,
                })
            } else {
                Err(anyhow::anyhow!("Sign up failed: no user data"))
            }
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Sign up failed: {}", error_text))
        }
    }

    pub async fn sign_in(&self, email: &str, password: &str) -> Result<AuthUser> {
        let url = format!("{}/auth/v1/token?grant_type=password", self.base_url);

        let response = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "email": email,
                "password": password
            }))
            .send()
            .await?;

        if response.status().is_success() {
            let data: serde_json::Value = response.json().await?;
            println!("Debug - Supabase sign_in response: {:?}", data); // Debug log
            
            if let Some(user) = data.get("user") {
                let access_token = data.get("access_token")
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());
                
                println!("Debug - Extracted access_token: {:?}", access_token); // Debug log
                
                Ok(AuthUser {
                    id: user["id"].as_str().unwrap_or("").to_string(),
                    email: user["email"].as_str().unwrap_or("").to_string(),
                    access_token,
                })
            } else {
                Err(anyhow::anyhow!("Sign in failed: no user data"))
            }
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Sign in failed: {}", error_text))
        }
    }

    pub async fn get_user(&self, access_token: &str) -> Result<AuthUser> {
        let url = format!("{}/auth/v1/user", self.base_url);

        let response = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .send()
            .await?;

        if response.status().is_success() {
            let data: serde_json::Value = response.json().await?;
            Ok(AuthUser {
                id: data["id"].as_str().unwrap_or("").to_string(),
                email: data["email"].as_str().unwrap_or("").to_string(),
                access_token: Some(access_token.to_string()),
            })
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get user: {}", error_text))
        }
    }

    // Profile management
    pub async fn create_profile(&self, profile: Profile, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/profiles", self.base_url);

        let response = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&profile)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to create profile: {}", error_text))
        }
    }

    // Project management
    pub async fn get_projects(&self, user_id: &str, access_token: &str) -> Result<Vec<Project>> {
        let url = format!("{}/rest/v1/projects?user_id=eq.{}&order=created_at.desc", self.base_url, user_id);

        let response = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if response.status().is_success() {
            let projects: Vec<Project> = response.json().await?;
            Ok(projects)
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get projects: {}", error_text))
        }
    }

    pub async fn create_project(&self, project: CreateProjectRequest, access_token: &str) -> Result<Project> {
        let url = format!("{}/rest/v1/projects", self.base_url);
    
        let response = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .json(&project)
            .send()
            .await?;
    
        if response.status().is_success() {
            let projects: Vec<Project> = response.json().await?;
            Ok(projects.into_iter().next().unwrap_or(Project {
                id: None,
                user_id: project.user_id,
                name: project.name,
                description: project.description,
                image_url: project.image_url,
                created_at: None,
                folder_path: None,
            }))
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to create project: {}", error_text))
        }
    }

    pub async fn update_project(&self, project_id: &str, project: Project, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.base_url, project_id);

        let response = self.client
            .patch(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&project)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to update project: {}", error_text))
        }
    }

    pub async fn delete_project(&self, project_id: &str, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.base_url, project_id);

        let response = self.client
            .delete(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to delete project: {}", error_text))
        }
    }

    // Get project by ID
    pub async fn get_project_by_id(&self, project_id: &str, user_id: &str, access_token: &str) -> Result<Option<Project>> {
        let url = format!("{}/rest/v1/projects?id=eq.{}&user_id=eq.{}", self.base_url, project_id, user_id);

        let response = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if response.status().is_success() {
            let projects: Vec<Project> = response.json().await?;
            Ok(projects.into_iter().next())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get project: {}", error_text))
        }
    }

    // Get profile by user ID
    pub async fn get_profile(&self, user_id: &str, access_token: &str) -> Result<Option<Profile>> {
        let url = format!("{}/rest/v1/profiles?id=eq.{}", self.base_url, user_id);

        let response = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if response.status().is_success() {
            let profiles: Vec<Profile> = response.json().await?;
            Ok(profiles.into_iter().next())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get profile: {}", error_text))
        }
    }

    // Password reset request
    pub async fn reset_password(&self, email: &str) -> Result<()> {
        let url = format!("{}/auth/v1/recover", self.base_url);

        let response = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "email": email
            }))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to send password reset: {}", error_text))
        }
    }

    // Update password (for reset flow)
    pub async fn update_password(&self, access_token: &str, new_password: &str) -> Result<()> {
        let url = format!("{}/auth/v1/user", self.base_url);

        let response = self.client
            .put(&url)
            .header("apikey", &self.anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "password": new_password
            }))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to update password: {}", error_text))
        }
    }
}
