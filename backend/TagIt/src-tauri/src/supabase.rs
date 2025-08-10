use anyhow::Result;
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::env;

// Data structures for Supabase operations
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: String,
    pub email: String,
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
        dotenv::dotenv().ok();

        let base_url = env::var("SUPABASE_URL")
            .expect("SUPABASE_URL must be set");
        let anon_key = env::var("SUPABASE_ANON_KEY")
            .expect("SUPABASE_ANON_KEY must be set");

        let client = Client::new();

        Ok(Self {
            client,
            base_url,
            anon_key,
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
            if let Some(user) = data.get("user") {
                Ok(AuthUser {
                    id: user["id"].as_str().unwrap_or("").to_string(),
                    email: user["email"].as_str().unwrap_or("").to_string(),
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
            if let Some(user) = data.get("user") {
                Ok(AuthUser {
                    id: user["id"].as_str().unwrap_or("").to_string(),
                    email: user["email"].as_str().unwrap_or("").to_string(),
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
            })
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get user: {}", error_text))
        }
    }

    // Profile management
    pub async fn create_profile(&self, profile: Profile) -> Result<()> {
        let url = format!("{}/rest/v1/profiles", self.base_url);

        let response = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
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
    pub async fn get_projects(&self, user_id: &str) -> Result<Vec<Project>> {
        let url = format!("{}/rest/v1/projects?user_id=eq.{}&order=created_at.desc", self.base_url, user_id);

        let response = self.client
            .get(&url)
            .header("apikey", &self.anon_key)
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

    pub async fn create_project(&self, project: Project) -> Result<Project> {
        let url = format!("{}/rest/v1/projects", self.base_url);

        let response = self.client
            .post(&url)
            .header("apikey", &self.anon_key)
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .json(&project)
            .send()
            .await?;

        if response.status().is_success() {
            let projects: Vec<Project> = response.json().await?;
            Ok(projects.into_iter().next().unwrap_or(project))
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to create project: {}", error_text))
        }
    }

    pub async fn update_project(&self, project_id: &str, project: Project) -> Result<()> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.base_url, project_id);

        let response = self.client
            .patch(&url)
            .header("apikey", &self.anon_key)
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

    pub async fn delete_project(&self, project_id: &str) -> Result<()> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.base_url, project_id);

        let response = self.client
            .delete(&url)
            .header("apikey", &self.anon_key)
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
}
