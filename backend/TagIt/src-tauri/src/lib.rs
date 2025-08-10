mod supabase;

use supabase::{SupabaseService, AuthUser, Profile, Project};
// use serde::{Deserialize, Serialize};
use anyhow::Result;

// Tauri commands for authentication
#[tauri::command]
async fn sign_up(email: String, password: String) -> Result<AuthUser, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.sign_up(&email, &password).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn sign_in(email: String, password: String) -> Result<AuthUser, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.sign_in(&email, &password).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_user(access_token: String) -> Result<AuthUser, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.get_user(&access_token).await.map_err(|e| e.to_string())
}

// Tauri commands for profile management
#[tauri::command]
async fn create_profile(profile: Profile) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.create_profile(profile).await.map_err(|e| e.to_string())
}

// Tauri commands for project management
#[tauri::command]
async fn get_projects(user_id: String) -> Result<Vec<Project>, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.get_projects(&user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_project(project: Project) -> Result<Project, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.create_project(project).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_project(project_id: String, project: Project) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.update_project(&project_id, project).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_project(project_id: String) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.delete_project(&project_id).await.map_err(|e| e.to_string())
}

// Keep the original greet command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            sign_up,
            sign_in,
            get_user,
            create_profile,
            get_projects,
            create_project,
            update_project,
            delete_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
