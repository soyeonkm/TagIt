use anyhow::Result;
use serde::{Deserialize, Serialize};
use crate::config::Config;
use crate::autotagger::{Player, PhotoMetadata};

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

    /// Update specific fields of a project using partial data
    pub async fn update_project_partial(&self, project_id: &str, partial_data: serde_json::Value, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.supabase_url, project_id);

        let response = reqwest::Client::new()
            .patch(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&partial_data)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to update project partially: {}", error_text))
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

    pub async fn get_filter_options(&self, user_id: &str, access_token: &str) -> Result<serde_json::Value> {
        let mut sports = std::collections::HashSet::new();
        let mut schools = std::collections::HashSet::new();
        let mut seasons = std::collections::HashSet::new();
        
        let url = format!("{}/rest/v1/players?user_id=eq.{}&select=school_name,sport_type,season", self.supabase_url, user_id);
        
        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .send()
            .await?;
            
        if response.status().is_success() {
            let data: Vec<serde_json::Value> = response.json().await.unwrap_or_default();
            for row in data {
                if let Some(sport) = row.get("sport_type").and_then(|s| s.as_str()) {
                    if !sport.is_empty() {
                        sports.insert(sport.to_string());
                    }
                }
                if let Some(school) = row.get("school_name").and_then(|s| s.as_str()) {
                    if !school.is_empty() {
                        schools.insert(school.to_string());
                    }
                }
                if let Some(season_str) = row.get("season").and_then(|s| s.as_str()) {
                    if !season_str.is_empty() {
                        seasons.insert(season_str.to_string());
                    }
                } else if let Some(season_num) = row.get("season").and_then(|s| s.as_i64()) {
                    seasons.insert(season_num.to_string());
                }
            }
        }
        
        let mut sports_vec: Vec<String> = sports.into_iter().collect();
        sports_vec.sort();
        let mut schools_vec: Vec<String> = schools.into_iter().collect();
        schools_vec.sort();
        let mut seasons_vec: Vec<String> = seasons.into_iter().collect();
        seasons_vec.sort_by(|a, b| b.cmp(a));
        
        Ok(serde_json::json!({
            "sports": sports_vec,
            "schools": schools_vec,
            "seasons": seasons_vec
        }))
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

    // Player management methods
    pub async fn create_player(&self, player: Player, user_id: &str, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/players", self.supabase_url);

        let player_data = serde_json::json!({
            "user_id": user_id,
            "name": player.name,
            "jersey_number": player.jersey_number,
            "position": player.position,
            "team": player.team,
            "school_name": player.school_name,
            "sport_type": player.sport_type,
            "face_image_base64": player.face_image_base64,
            "face_descriptor": player.face_descriptor,
            "season": player.season
        });

        let response = reqwest::Client::new()
            .post(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&player_data)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to create player: {}", error_text))
        }
    }

    pub async fn upsert_player_by_name(&self, player: Player, user_id: &str, access_token: &str) -> Result<()> {
        let name_encoded = urlencoding::encode(&player.name);
        
        let mut get_url = format!("{}/rest/v1/players?user_id=eq.{}&name=eq.{}", self.supabase_url, user_id, name_encoded);
        
        if let Some(school) = &player.school_name {
            get_url.push_str(&format!("&school_name=eq.{}", urlencoding::encode(school)));
        } else {
            get_url.push_str("&school_name=is.null");
        }
        
        if let Some(sport) = &player.sport_type {
            get_url.push_str(&format!("&sport_type=eq.{}", urlencoding::encode(sport)));
        } else {
            get_url.push_str("&sport_type=is.null");
        }
        
        if let Some(season) = &player.season {
            get_url.push_str(&format!("&season=eq.{}", urlencoding::encode(season)));
        } else {
            get_url.push_str("&season=is.null");
        }

        let get_response = reqwest::Client::new()
            .get(&get_url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .send()
            .await?;

        let players: Vec<serde_json::Value> = get_response.json().await.unwrap_or_default();
        
        let player_data = serde_json::json!({
            "user_id": user_id,
            "name": player.name,
            "jersey_number": player.jersey_number,
            "position": player.position,
            "team": player.team,
            "school_name": player.school_name,
            "sport_type": player.sport_type,
            "face_image_base64": player.face_image_base64,
            "face_descriptor": player.face_descriptor,
            "season": player.season
        });

        if let Some(existing_player) = players.first() {
            if let Some(player_id) = existing_player.get("id").and_then(|id| id.as_str()) {
                // Update using id
                let patch_url = format!("{}/rest/v1/players?id=eq.{}", self.supabase_url, player_id);
                let patch_response = reqwest::Client::new()
                    .patch(&patch_url)
                    .header("apikey", &self.supabase_anon_key)
                    .header("Authorization", &format!("Bearer {}", access_token))
                    .header("Content-Type", "application/json")
                    .header("Prefer", "return=minimal")
                    .json(&player_data)
                    .send()
                    .await?;
                    
                if patch_response.status().is_success() {
                    Ok(())
                } else {
                    let error_text = patch_response.text().await?;
                    Err(anyhow::anyhow!("Failed to update player: {}", error_text))
                }
            } else {
                Err(anyhow::anyhow!("Failed to update player: existing player has no ID"))
            }
        } else {
            // Create
            self.create_player(player, user_id, access_token).await
        }
    }

    pub async fn get_all_players(&self, user_id: &str, access_token: &str) -> Result<Vec<Player>> {
        let url = format!("{}/rest/v1/players?user_id=eq.{}", self.supabase_url, user_id);

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if response.status().is_success() {
            let players: Vec<Player> = response.json().await?;
            Ok(players)
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get players: {}", error_text))
        }
    }

    #[allow(dead_code)]
    pub async fn delete_player(&self, player_id: &str, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/players?id=eq.{}", self.supabase_url, player_id);

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
            Err(anyhow::anyhow!("Failed to delete player: {}", error_text))
        }
    }

    // Photo metadata management methods
    pub async fn save_photo_metadata(&self, photo: PhotoMetadata, project_id: &str, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/photos?on_conflict=project_id,file_path", self.supabase_url);

        let photo_data = serde_json::json!({
            "project_id": project_id,
            "file_path": photo.file_path,
            "file_name": photo.file_name,
            "file_size": photo.file_size,
            "width": photo.width,
            "height": photo.height,
            "detected_players": photo.detected_players,
            "detected_faces": photo.detected_faces,
            "detected_jersey_numbers": photo.detected_jersey_numbers,
            "description": photo.description
        });

        let response = reqwest::Client::new()
            .post(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "resolution=merge-duplicates, return=minimal")
            .json(&photo_data)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to save photo metadata: {}", error_text))
        }
    }

    pub async fn get_photo_metadata(&self, project_id: &str, access_token: &str) -> Result<Vec<PhotoMetadata>> {
        let url = format!("{}/rest/v1/photos?project_id=eq.{}", self.supabase_url, project_id);

        let response = reqwest::Client::new()
            .get(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if response.status().is_success() {
            let photos: Vec<PhotoMetadata> = response.json().await?;
            Ok(photos)
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to get photo metadata: {}", error_text))
        }
    }

    #[allow(dead_code)]
    pub async fn update_photo_metadata(&self, photo_id: &str, photo: PhotoMetadata, access_token: &str) -> Result<()> {
        let url = format!("{}/rest/v1/photos?id=eq.{}", self.supabase_url, photo_id);

        let photo_data = serde_json::json!({
            "detected_players": photo.detected_players,
            "detected_faces": photo.detected_faces,
            "detected_jersey_numbers": photo.detected_jersey_numbers,
            "description": photo.description
        });

        let response = reqwest::Client::new()
            .patch(&url)
            .header("apikey", &self.supabase_anon_key)
            .header("Authorization", &format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&photo_data)
            .send()
            .await?;

        if response.status().is_success() {
            Ok(())
        } else {
            let error_text = response.text().await?;
            Err(anyhow::anyhow!("Failed to update photo metadata: {}", error_text))
        }
    }
}

// Alias for backward compatibility
pub type SupabaseClient = SupabaseService;
