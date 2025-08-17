mod config;
mod supabase;

use supabase::{SupabaseService, AuthUser, Profile, Project, CreateProjectRequest};
// use serde::{Deserialize, Serialize};
use anyhow::Result;
use std::path::PathBuf;
use std::fs;
use rfd::FileDialog;


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
async fn create_profile(profile: Profile, access_token: String) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.create_profile(profile, &access_token).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_profile(user_id: String, access_token: String) -> Result<Option<Profile>, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.get_profile(&user_id, &access_token).await.map_err(|e| e.to_string())
}

// Tauri commands for project management
#[tauri::command]
async fn get_projects(user_id: String, access_token: String) -> Result<Vec<Project>, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.get_projects(&user_id, &access_token).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_project_by_id(project_id: String, user_id: String, access_token: String) -> Result<Option<Project>, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.get_project_by_id(&project_id, &user_id, &access_token).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_project(project: CreateProjectRequest, access_token: String) -> Result<Project, String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.create_project(project, &access_token).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_project(project_id: String, project: Project, access_token: String) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.update_project(&project_id, project, &access_token).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_project(project_id: String, access_token: String) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.delete_project(&project_id, &access_token).await.map_err(|e| e.to_string())
}

// Tauri commands for password reset
#[tauri::command]
async fn reset_password(email: String) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.reset_password(&email).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_password(access_token: String, new_password: String) -> Result<(), String> {
    let service = SupabaseService::new().map_err(|e| e.to_string())?;
    service.update_password(&access_token, &new_password).await.map_err(|e| e.to_string())
}

// Tauri command for folder selection with validation
#[tauri::command]
async fn select_folder() -> Result<String, String> {
    // Use rfd to open folder picker dialog
    let folder_path = FileDialog::new()
        .set_title("Select Project Folder")
        .pick_folder()
        .ok_or("No folder selected")?;

    // Convert to absolute path and normalize separators
    let absolute_path = folder_path.to_string_lossy().to_string();

    // Validate write permissions by attempting to create a test file
    let test_file_path = PathBuf::from(&absolute_path).join(".tagit_test_write");
    
    match fs::write(&test_file_path, "test") {
        Ok(_) => {
            // Clean up test file
            let _ = fs::remove_file(&test_file_path);
            Ok(absolute_path)
        }
        Err(e) => {
            let error_msg = match e.kind() {
                std::io::ErrorKind::PermissionDenied => {
                    "Permission denied: Cannot write to selected folder"
                }
                std::io::ErrorKind::ReadOnlyFilesystem => {
                    "Read-only filesystem: Cannot write to selected folder"
                }
                _ => {
                    "Cannot write to selected folder. Please ensure you have write permissions."
                }
            };
            Err(error_msg.to_string())
        }
    }
}

// Alternative command that returns more detailed information
#[tauri::command]
async fn select_folder_with_info() -> Result<serde_json::Value, String> {
    // Use rfd to open folder picker dialog
    let folder_path = FileDialog::new()
        .set_title("Select Project Folder")
        .pick_folder()
        .ok_or("No folder selected")?;

    // Convert to absolute path and normalize separators
    let absolute_path = folder_path.to_string_lossy().to_string();

    // Get folder metadata
    let metadata = fs::metadata(&absolute_path)
        .map_err(|e| format!("Failed to read folder metadata: {}", e))?;

    // Validate write permissions
    let test_file_path = PathBuf::from(&absolute_path).join(".tagit_test_write");
    let can_write = fs::write(&test_file_path, "test").is_ok();
    
    if can_write {
        // Clean up test file
        let _ = fs::remove_file(&test_file_path);
    }

    // Return detailed information
    Ok(serde_json::json!({
        "path": absolute_path,
        "exists": true,
        "is_directory": metadata.is_dir(),
        "can_write": can_write,
        "permissions": {
            "readonly": metadata.permissions().readonly()
        },
        "size": metadata.len(),
        "modified": metadata.modified().map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs()).unwrap_or(0)
    }))
}

// Command to read photos from a project folder
#[tauri::command]
async fn read_project_folder(project_id: String, folder_path: String, access_token: String) -> Result<Vec<serde_json::Value>, String> {
    // Validate the folder path exists and is accessible
    let path = PathBuf::from(&folder_path);
    if !path.exists() {
        return Err("Folder path does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Read directory contents
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut photos = Vec::new();
    
    for entry in entries {
        if let Ok(entry) = entry {
            let file_path = entry.path();
            
            // Check if it's an image file
            if let Some(extension) = file_path.extension() {
                let ext = extension.to_string_lossy().to_lowercase();
                if matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff") {
                    // Get file metadata
                    if let Ok(metadata) = fs::metadata(&file_path) {
                        let photo_info = serde_json::json!({
                            "id": file_path.file_name().unwrap_or_default().to_string_lossy(),
                            "name": file_path.file_name().unwrap_or_default().to_string_lossy(),
                            "path": file_path.to_string_lossy(),
                            "size": format!("{:.1} MB", metadata.len() as f64 / 1024.0 / 1024.0),
                            "dimensions": "Unknown", // Would need image processing library to get actual dimensions
                            "dateModified": metadata.modified()
                                .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                                .unwrap_or(0),
                            "type": format!("image/{}", ext)
                        });
                        
                        photos.push(photo_info);
                    }
                }
            }
        }
    }

    Ok(photos)
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
            get_profile,
            get_projects,
            get_project_by_id,
            create_project,
            update_project,
            delete_project,
            reset_password,
            update_password,
            select_folder,
            select_folder_with_info,
            read_project_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
