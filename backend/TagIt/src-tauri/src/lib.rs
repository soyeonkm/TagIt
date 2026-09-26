mod config;
mod supabase;
mod autotagger;
mod error;
mod raw;
mod xmp;

use anyhow::Result;
use std::fs;
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rfd::FileDialog;

use supabase::{SupabaseService, AuthUser, Profile, Project, CreateProjectRequest};
use autotagger::{AutoTagger, ParsingResult, Roster, TagResult};


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

/// Open a native file picker dialog filtered to PDF files.
/// Returns the absolute path of the selected file, or an error if cancelled.
#[tauri::command]
async fn select_pdf_file() -> Result<String, String> {
    let file_path = FileDialog::new()
        .set_title("Select Roster PDF")
        .add_filter("PDF Roster", &["pdf"])
        .pick_file()
        .ok_or("No file selected")?;

    Ok(file_path.to_string_lossy().to_string())
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
async fn read_project_folder(_project_id: String, folder_path: String, _access_token: String) -> Result<Vec<serde_json::Value>, String> {
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
    let mut total_files = 0;
    let mut image_files = 0;
    let mut skipped_files = 0;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let file_path = entry.path();
            total_files += 1;
            
            // Skip hidden files and system files
            if let Some(file_name) = file_path.file_name() {
                let name = file_name.to_string_lossy();
                if name.starts_with('.') || name.starts_with('~') || name == "Thumbs.db" || name == "desktop.ini" {
                    skipped_files += 1;
                    continue;
                }
            }
            
            // Check if it's an image file - expanded list of extensions
            if let Some(extension) = file_path.extension() {
                let ext = extension.to_string_lossy().to_lowercase();
                if raw::is_raw(&file_path) || matches!(ext.as_str(),
                    "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff" | "tif" | "heic" | "heif"
                ) {
                    image_files += 1;
                    
                    // Get file metadata
                    match fs::metadata(&file_path) {
                        Ok(metadata) => {
                            let photo_info = serde_json::json!({
                                "id": file_path.file_name().unwrap_or_default().to_string_lossy(),
                                "name": file_path.file_name().unwrap_or_default().to_string_lossy(),
                                "path": file_path.to_string_lossy(),
                                "size": format!("{:.1} MB", metadata.len() as f64 / 1024.0 / 1024.0),
                                "dimensions": "Unknown", // Would need image processing library to get actual dimensions
                                "dateModified": metadata.modified()
                                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                                    .unwrap_or(0),
                                "type": format!("image/{}", ext.to_lowercase())
                            });
                            
                            photos.push(photo_info);
                        }
                        Err(e) => {
                            eprintln!("Failed to read metadata for {}: {}", file_path.display(), e);
                            skipped_files += 1;
                        }
                    }
                } else {
                    skipped_files += 1;
                }
            } else {
                // Files without extensions
                skipped_files += 1;
            }
        }
    }

    // Log summary for debugging
    eprintln!("Folder scan complete: {} total files, {} image files, {} skipped", total_files, image_files, skipped_files);

    Ok(photos)
}

// Command to convert local image file to data URL for display
#[tauri::command]
async fn get_image_data_url(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    
    // Validate the file exists and is an image
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    if !path.is_file() {
        return Err("Path is not a file".to_string());
    }
    
    // Check if it's an image file
    if let Some(extension) = path.extension() {
        let ext = extension.to_string_lossy().to_lowercase();
        if !matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff") {
            return Err("File is not a supported image format".to_string());
        }
    } else {
        return Err("File has no extension".to_string());
    }
    
    // Read the file and convert to base64
    let file_bytes = fs::read(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // Determine MIME type based on extension
    let mime_type = if let Some(extension) = path.extension() {
        let ext = extension.to_string_lossy().to_lowercase();
        match ext.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "bmp" => "image/bmp",
            "webp" => "image/webp",
            "tiff" => "image/tiff",
            _ => "image/jpeg"
        }
    } else {
        "image/jpeg"
    };
    
    // Convert to base64 and create data URL
    let base64_string = BASE64.encode(&file_bytes);
    let data_url = format!("data:{};base64,{}", mime_type, base64_string);
    
    Ok(data_url)
}

#[tauri::command]
async fn get_image_thumbnail(file_path: String, width: u32, height: u32, quality: u8) -> Result<String, String> {
    use std::fs::File;
    use std::io::BufReader;
    use image::io::Reader as ImageReader;
    use base64::{Engine as _, engine::general_purpose};
    use std::path::Path;
    
    // Read the image file
    let file = File::open(&file_path).map_err(|e| format!("Failed to open file: {}", e))?;
    let reader = BufReader::new(file);
    
    // Get file extension to determine format
    let path = Path::new(&file_path);
    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    // Decode the image based on format
    let img = match extension.as_str() {
        "heic" | "heif" => {
            // For HEIC files, just create a simple camera icon thumbnail
            let mut fallback = image::RgbImage::new(width, height);
            
            // Fill with a light gray background
            for y in 0..height {
                for x in 0..width {
                    fallback.put_pixel(x, y, image::Rgb([240, 240, 240]));
                }
            }
            
            // Create a simple camera icon (basic geometric shapes)
            let center_x = width / 2;
            let center_y = height / 2;
            let icon_size = std::cmp::min(width, height) / 3;
            
            // Camera body (rectangle)
            let body_width = icon_size;
            let body_height = icon_size * 3 / 4;
            let body_x = center_x - body_width / 2;
            let body_y = center_y - body_height / 2;
            
            for y in body_y..body_y + body_height {
                for x in body_x..body_x + body_width {
                    if x < width && y < height {
                        fallback.put_pixel(x, y, image::Rgb([100, 100, 100]));
                    }
                }
            }
            
            // Camera lens (circle approximation)
            let lens_radius = icon_size / 4;
            for y in center_y - lens_radius..center_y + lens_radius {
                for x in center_x - lens_radius..center_x + lens_radius {
                    let dx = x as i32 - center_x as i32;
                    let dy = y as i32 - center_y as i32;
                    let distance_squared = dx * dx + dy * dy;
                    if distance_squared <= (lens_radius * lens_radius) as i32 && x < width && y < height {
                        fallback.put_pixel(x, y, image::Rgb([50, 50, 50]));
                    }
                }
            }
            
            image::DynamicImage::ImageRgb8(fallback)
        },
        _ if raw::is_raw(path) => raw::preview_image(path)?,
        _ => {
            // Handle standard formats (JPEG, PNG, etc.)
            ImageReader::new(reader)
                .with_guessed_format()
                .map_err(|e| format!("Failed to guess format: {}", e))?
                .decode()
                .map_err(|e| format!("Failed to decode image: {}", e))?
        }
    };
    
    // Resize the image to thumbnail dimensions
    let thumbnail = img.thumbnail(width, height);
    
    // Convert to RGB8 if needed
    let rgb_thumbnail = thumbnail.to_rgb8();
    
    // Encode to JPEG with specified quality
    let mut output = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut output, quality);
    
    // Use the actual dimensions from the resized image
    let (actual_width, actual_height) = rgb_thumbnail.dimensions();
    encoder.encode(&rgb_thumbnail, actual_width, actual_height, image::ColorType::Rgb8)
        .map_err(|e| format!("Failed to encode thumbnail: {}", e))?;
    
    // Convert to base64
    let base64_string = general_purpose::STANDARD.encode(&output);
    let data_url = format!("data:image/jpeg;base64,{}", base64_string);
    
    Ok(data_url)
}

// Tauri command for reading photo XMP metadata
#[tauri::command]
async fn read_photo_metadata(file_path: String) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let xmp_path = xmp::sidecar_path(&path);
    let has_metadata = raw::is_raw(&path) && xmp_path.exists();
    let xml = if has_metadata {
        fs::read_to_string(&xmp_path).map_err(|e| format!("Failed to read XMP file: {}", e))?
    } else {
        String::new()
    };
    let first = |name: &str| xmp::get(&xml, name).into_iter().next().unwrap_or_default();

    Ok(serde_json::json!({
        "success": true,
        "hasMetadata": has_metadata,
        "metadata": {
            "title": first("dc:title"),
            "description": first("dc:description"),
            "keywords": xmp::get(&xml, "dc:subject").join(", "),
            "creator": xmp::get(&xml, "dc:creator").join(", "),
            "copyright": first("dc:rights"),
            "rating": first("xmp:Rating").parse::<u64>().unwrap_or(0),
            "colorLabel": Some(first("xmp:Label")).filter(|l| !l.is_empty()).unwrap_or_else(|| "None".to_string())
        }
    }))
}

// Tauri command for updating photo XMP metadata. Only RAW files get sidecars; existing
// sidecar content (e.g. Lightroom develop settings) is preserved.
#[tauri::command]
async fn update_photo_metadata(file_path: String, metadata: serde_json::Value) -> Result<serde_json::Value, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    if !raw::is_raw(&path) {
        return Err("XMP sidecar files are only written for RAW photos".to_string());
    }

    let text = |key: &str| metadata.get(key).and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    let list = |key: &str| text(key).split(',').map(|s| s.trim().to_string()).collect::<Vec<_>>();
    let rating = metadata.get("rating").and_then(|v| v.as_u64()).unwrap_or(0);
    let label = Some(text("colorLabel")).filter(|l| l != "None").unwrap_or_default();

    let xmp_path = xmp::sidecar_path(&path);
    let mut xml = xmp::read_or_new(&xmp_path)?;
    for (name, kind, values) in [
        ("dc:title", xmp::Kind::Alt, vec![text("title")]),
        ("dc:description", xmp::Kind::Alt, vec![text("description")]),
        ("dc:creator", xmp::Kind::Seq, list("creator")),
        ("dc:subject", xmp::Kind::Bag, list("keywords")),
        ("dc:rights", xmp::Kind::Alt, vec![text("copyright")]),
        ("xmp:Rating", xmp::Kind::Simple, vec![if rating > 0 { rating.to_string() } else { String::new() }]),
        ("xmp:Label", xmp::Kind::Simple, vec![label]),
    ] {
        xml = xmp::set(&xml, name, kind, &values)?;
    }
    xmp::write_atomic(&xmp_path, &xml)?;

    Ok(serde_json::json!({
        "success": true,
        "message": "XMP metadata saved",
        "xmpPath": xmp_path.to_string_lossy()
    }))
}

// PDF Roster Parsing command
/// Parse a roster PDF into its own roster. If this user already uploaded the exact
/// same PDF, parsing is skipped entirely and `duplicate: true` is returned.
#[tauri::command]
async fn parse_roster_from_pdf(
    pdf_path: String,
    name: String,
    user_id: String,
    access_token: String,
) -> Result<ParsingResult, String> {
    use sha2::{Digest, Sha256};

    let name = name.trim();
    if name.is_empty() {
        return Err("Roster name is required".to_string());
    }
    let pdf_bytes = fs::read(&pdf_path).map_err(|e| format!("Failed to read PDF: {}", e))?;
    // ponytail: exact-file match only; a re-exported PDF of the same roster hashes differently
    let pdf_hash = format!("{:x}", Sha256::digest(&pdf_bytes));
    let file_name = PathBuf::from(&pdf_path).file_name().unwrap_or_default().to_string_lossy().to_string();

    let supabase = SupabaseService::new().map_err(|e| e.to_string())?;
    let duplicate = |roster: Roster| ParsingResult {
        duplicate: true,
        message: format!(
            "This roster already exists as \"{}\" ({} {}). Parsing was skipped.",
            roster.name, roster.sport, roster.season
        ),
        roster: Some(roster),
        players: Vec::new(),
    };

    if let Some(existing) = supabase.find_roster_by_hash(&user_id, &pdf_hash, &access_token).await.map_err(|e| e.to_string())? {
        return Ok(duplicate(existing));
    }

    let autotagger = AutoTagger::new(supabase.clone()).map_err(|e| e.to_string())?;
    let parsed = autotagger.parse_roster_pdf(&pdf_bytes).await.map_err(|e| e.to_string())?;

    match supabase.create_roster(&user_id, name, &file_name, &pdf_hash, &parsed, &access_token).await.map_err(|e| e.to_string())? {
        Some(roster) => Ok(ParsingResult {
            duplicate: false,
            message: format!("Saved \"{}\" with {} players ({} {}).", roster.name, parsed.players.len(), roster.sport, roster.season),
            roster: Some(roster),
            players: parsed.players,
        }),
        // Lost a race with an identical upload
        None => match supabase.find_roster_by_hash(&user_id, &pdf_hash, &access_token).await.map_err(|e| e.to_string())? {
            Some(existing) => Ok(duplicate(existing)),
            None => Err("Roster already exists but could not be loaded".to_string()),
        },
    }
}

#[tauri::command]
async fn list_rosters(user_id: String, access_token: String) -> Result<Vec<Roster>, String> {
    let supabase = SupabaseService::new().map_err(|e| e.to_string())?;
    supabase.list_rosters(&user_id, &access_token).await.map_err(|e| e.to_string())
}

/// Tag the RAW photos in `folder_path` using one roster. Emits `tag-progress`
/// events ({ done, total, fileName }) so the UI can show progress.
#[tauri::command]
async fn process_photo_folder(
    app: tauri::AppHandle,
    roster_id: String,
    jersey_color: String,
    folder_path: String,
    access_token: String,
) -> Result<Vec<TagResult>, String> {
    use tauri::Emitter;

    let supabase = SupabaseService::new().map_err(|e| e.to_string())?;
    let autotagger = AutoTagger::new(supabase).map_err(|e| e.to_string())?;

    autotagger
        .process_photo_folder(&roster_id, &jersey_color, &folder_path, &access_token, |done, total, file_name| {
            let _ = app.emit("tag-progress", serde_json::json!({ "done": done, "total": total, "fileName": file_name }));
        })
        .await
        .map_err(|e| e.to_string())
}

// Keep the original greet command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // RUST_LOG=info surfaces the pipeline's progress/warning logs
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

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
            select_pdf_file,
            read_project_folder,
            get_image_data_url,
            get_image_thumbnail,
            read_photo_metadata,
            update_photo_metadata,
            // Autotagger commands
            parse_roster_from_pdf,
            list_rosters,
            process_photo_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
