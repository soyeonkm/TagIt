use anyhow::Result;
use serde::{Deserialize, Serialize};
use crate::config::Config;
use crate::autotagger::{Player, Roster, ParsedRoster};

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
    pub roster_type: Option<String>,
    pub roster_data: Option<String>,
    pub sport_type: Option<String>,
    pub team_classification: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub user_id: String,
    pub name: String,
    pub description: String,
    pub image_url: String,
    pub folder_path: Option<String>,
    pub roster_type: Option<String>,
    pub roster_data: Option<String>,
    pub sport_type: Option<String>,
    pub team_classification: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: Option<AuthUser>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SupabaseService {
    pub supabase_url: String,
    pub supabase_anon_key: String,
}

impl SupabaseService {
    pub fn new() -> Result<Self> {
        let config = Config::new();

        Ok(Self {
            supabase_url: config.supabase_url,
            supabase_anon_key: config.supabase_anon_key,
        })
    }

    // Authentication methods
    pub async fn sign_up(&self, email: &str, password: &str) -> Result<AuthUser> {
        let url = format!("{}/auth/v1/signup", self.supabase_url);

        let response = reqwest::Client::new()
            .post(&url)
            .header("apikey", &self.supabase_anon_key)
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
                let access_token = data.get("access_token")
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());
                
                Ok(AuthUser {
                    id: user["id"].as_str().unwrap_or("").to_string(),
                    email: user["email"].as_str().unwrap_or("").to_string(),
                    access_token,
                })
            } else if data.get("id").is_some() {
                // Email confirmations are enabled, Supabase returns the user object directly
                Ok(AuthUser {
                    id: data["id"].as_str().unwrap_or("").to_string(),
                    email: data["email"].as_str().unwrap_or("").to_string(),
                    access_token: None, // No session until they confirm email
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
        let url = format!("{}/auth/v1/token?grant_type=password", self.supabase_url);

        let response = reqwest::Client::new()
            .post(&url)
            .header("apikey", &self.supabase_anon_key)
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
                let access_token = data.get("access_token")
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string());
                
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
        let url = format!("{}/auth/v1/user", self.supabase_url);

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
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
        let url = format!("{}/rest/v1/profiles", self.supabase_url);

        let response = reqwest::Client::new()
            .post(&url)
            .header("apikey", &self.supabase_anon_key)
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
        let url = format!("{}/rest/v1/projects?user_id=eq.{}&order=created_at.desc", self.supabase_url, user_id);

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
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
        let url = format!("{}/rest/v1/projects", self.supabase_url);
    
        let response = reqwest::Client::new()
            .post(&url)
            .header("apikey", &self.supabase_anon_key)
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
                roster_type: project.roster_type,
                roster_data: project.roster_data,
                sport_type: project.sport_type,
                team_classification: project.team_classification,
            }))
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to create project: {}", error_text))
        }
    }

    pub async fn update_project(&self, project_id: &str, project: Project, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.supabase_url, project_id);

        let response = reqwest::Client::new()
            .patch(&url)
            .header("apikey", &self.supabase_anon_key)
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
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.supabase_url, project_id);

        let response = reqwest::Client::new()
            .delete(&url)
            .header("apikey", &self.supabase_anon_key)
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
        let url = format!("{}/rest/v1/projects?id=eq.{}&user_id=eq.{}", self.supabase_url, project_id, user_id);

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
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
    pub async fn get_profile(&self, user_id: &str, _access_token: &str) -> Result<Option<Profile>> {
        let url = format!("{}/rest/v1/profiles?id=eq.{}", self.supabase_url, user_id);

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
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
        let url = format!("{}/auth/v1/recover", self.supabase_url);

        let response = reqwest::Client::new()
            .post(&url)
            .header("apikey", &self.supabase_anon_key)
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
        let url = format!("{}/auth/v1/user", self.supabase_url);

        let response = reqwest::Client::new()
            .put(&url)
            .header("apikey", &self.supabase_anon_key)
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

    // Roster management methods
    const ROSTER_COLUMNS: &'static str = "id,name,file_name,sport,season,created_at";

    /// Find a roster this user already uploaded from the exact same PDF.
    pub async fn find_roster_by_hash(&self, user_id: &str, pdf_hash: &str, access_token: &str) -> Result<Option<Roster>> {
        let url = format!(
            "{}/rest/v1/rosters?user_id=eq.{}&pdf_hash=eq.{}&select={}",
            self.supabase_url, user_id, pdf_hash, Self::ROSTER_COLUMNS
        );

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .send()
            .await?;

        if response.status().is_success() {
            let rosters: Vec<Roster> = response.json().await?;
            Ok(rosters.into_iter().next())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to look up roster: {}", error_text))
        }
    }

    /// Insert a roster and its players. Returns None if the same PDF was already saved
    /// (unique (user_id, pdf_hash) violation, e.g. two uploads racing).
    pub async fn create_roster(&self, user_id: &str, name: &str, file_name: &str, pdf_hash: &str, parsed: &ParsedRoster, access_token: &str) -> Result<Option<Roster>> {
        let response = reqwest::Client::new()
            .post(format!("{}/rest/v1/rosters?select={}", self.supabase_url, Self::ROSTER_COLUMNS))
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Prefer", "return=representation")
            .json(&serde_json::json!({
                "user_id": user_id,
                "name": name,
                "file_name": file_name,
                "pdf_hash": pdf_hash,
                "sport": parsed.sport,
                "season": parsed.season
            }))
            .send()
            .await?;

        if response.status() == reqwest::StatusCode::CONFLICT {
            return Ok(None);
        }
        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!("Failed to create roster: {}", error_text));
        }
        let roster = response.json::<Vec<Roster>>().await?.into_iter().next()
            .ok_or_else(|| anyhow::anyhow!("Failed to create roster: no row returned"))?;

        let players: Vec<serde_json::Value> = parsed.players.iter().map(|p| serde_json::json!({
            "roster_id": roster.id,
            "name": p.name,
            "jersey_number": p.jersey_number
        })).collect();

        let response = reqwest::Client::new()
            .post(format!("{}/rest/v1/players", self.supabase_url))
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Prefer", "return=minimal")
            .json(&players)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(Some(roster))
        } else {
            let error_text = response.text().await?;
            // Don't leave an empty roster behind, or re-uploading the PDF would be reported as a duplicate.
            let _ = self.delete_roster(&roster.id, access_token).await;
            Err(anyhow::anyhow!("Failed to save roster players: {}", error_text))
        }
    }

    pub async fn list_rosters(&self, user_id: &str, access_token: &str) -> Result<Vec<Roster>> {
        let url = format!(
            "{}/rest/v1/rosters?user_id=eq.{}&select={}&order=season.desc,created_at.desc",
            self.supabase_url, user_id, Self::ROSTER_COLUMNS
        );

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to list rosters: {}", error_text))
        }
    }

    pub async fn get_roster_players(&self, roster_id: &str, access_token: &str) -> Result<Vec<Player>> {
        let url = format!(
            "{}/rest/v1/players?roster_id=eq.{}&select=name,jersey_number&order=name",
            self.supabase_url, roster_id
        );

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get roster players: {}", error_text))
        }
    }

    /// Players are removed with it via ON DELETE CASCADE.
    pub async fn delete_roster(&self, roster_id: &str, access_token: &str) -> Result<()> {
        let response = reqwest::Client::new()
            .delete(format!("{}/rest/v1/rosters?id=eq.{}", self.supabase_url, roster_id))
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to delete roster: {}", error_text))
        }
    }
}

// Alias for backward compatibility
pub type SupabaseClient = SupabaseService;
