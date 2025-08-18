mod config;
mod supabase;

use anyhow::Result;
use std::fs;
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rfd::FileDialog;

use supabase::{SupabaseService, AuthUser, Profile, Project, CreateProjectRequest};


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
                if matches!(ext.as_str(), 
                    "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff" | "tif" |
                    "heic" | "heif" | "raw" | "cr2" | "nef" | "arw" | "dng" | "orf" |
                    "JPG" | "JPEG" | "PNG" | "GIF" | "BMP" | "WEBP" | "TIFF" | "TIF" |
                    "HEIC" | "HEIF" | "RAW" | "CR2" | "NEF" | "ARW" | "DNG" | "ORF"
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
        "cr3" | "nef" | "arw" | "dng" | "raf" | "orf" | "rw2" => {
            // Handle RAW formats
            let raw_data = rawloader::decode_file(&file_path)
                .map_err(|e| format!("Failed to decode RAW file: {}", e))?;
            
            // Convert to RGB
            let mut rgb_image = image::RgbImage::new(
                raw_data.width.try_into().unwrap_or(200), 
                raw_data.height.try_into().unwrap_or(150)
            );
            
            // Handle different RAW data formats
            match raw_data.data {
                rawloader::RawImageData::Integer(data) => {
                    for (i, pixel) in data.chunks(3).enumerate() {
                        if pixel.len() == 3 {
                            let x = i % rgb_image.width() as usize;
                            let y = i / rgb_image.width() as usize;
                            if x < rgb_image.width() as usize && y < rgb_image.height() as usize {
                                rgb_image.put_pixel(x as u32, y as u32, image::Rgb([pixel[0] as u8, pixel[1] as u8, pixel[2] as u8]));
                            }
                        }
                    }
                },
                rawloader::RawImageData::Float(data) => {
                    for (i, pixel) in data.chunks(3).enumerate() {
                        if pixel.len() == 3 {
                            let x = i % rgb_image.width() as usize;
                            let y = i / rgb_image.width() as usize;
                            if x < rgb_image.width() as usize && y < rgb_image.height() as usize {
                                let r = (pixel[0] * 255.0).clamp(0.0, 255.0) as u8;
                                let g = (pixel[1] * 255.0).clamp(0.0, 255.0) as u8;
                                let b = (pixel[2] * 255.0).clamp(0.0, 255.0) as u8;
                                rgb_image.put_pixel(x as u32, y as u32, image::Rgb([r, g, b]));
                            }
                        }
                    }
                }
            }
            
            image::DynamicImage::ImageRgb8(rgb_image)
        },
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
    let thumbnail = img.resize(width, height, image::imageops::FilterType::Lanczos3);
    
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
    use std::path::Path;
    
    println!("Reading metadata for file: {}", file_path); // Commented out to hide status message
    
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    // Create XMP sidecar file path
    let xmp_path = path.with_extension("xmp");
    
    // Check if XMP file exists
    if !xmp_path.exists() {
        // Return empty metadata if no XMP file exists
        let mut response = serde_json::Map::new();
        response.insert("success".to_string(), serde_json::Value::Bool(true));
        response.insert("hasMetadata".to_string(), serde_json::Value::Bool(false));
        response.insert("metadata".to_string(), serde_json::json!({
            "title": "",
            "description": "",
            "keywords": "",
            "creator": "",
            "copyright": "",
            "rating": 0,
            "colorLabel": "None"
        }));
        return Ok(serde_json::Value::Object(response));
    }
    
    // Read XMP file content
    let xmp_content = fs::read_to_string(&xmp_path)
        .map_err(|e| format!("Failed to read XMP file: {}", e))?;
    
    // Parse XMP content (simple XML parsing for basic fields)
    let mut metadata = serde_json::Map::new();
    metadata.insert("title".to_string(), serde_json::Value::String("".to_string()));
    metadata.insert("description".to_string(), serde_json::Value::String("".to_string()));
    metadata.insert("keywords".to_string(), serde_json::Value::String("".to_string()));
    metadata.insert("creator".to_string(), serde_json::Value::String("".to_string()));
    metadata.insert("copyright".to_string(), serde_json::Value::String("".to_string()));
    metadata.insert("rating".to_string(), serde_json::Value::Number(serde_json::Number::from(0)));
    metadata.insert("colorLabel".to_string(), serde_json::Value::String("None".to_string()));
    
    // Simple parsing of XMP content
    let lines: Vec<&str> = xmp_content.lines().collect();
    
    // Parse basic metadata fields
    for line in &lines {
        let line = line.trim();
        
        if line.contains("<dc:title>") && line.contains("</dc:title>") {
            if let Some(start) = line.find("<dc:title>") {
                if let Some(end) = line.find("</dc:title>") {
                    let title = &line[start + 10..end];
                    metadata.insert("title".to_string(), serde_json::Value::String(title.to_string()));
                }
            }
        } else if line.contains("<dc:description>") && line.contains("</dc:description>") {
            if let Some(start) = line.find("<dc:description>") {
                if let Some(end) = line.find("</dc:description>") {
                    let description = &line[start + 16..end];
                    metadata.insert("description".to_string(), serde_json::Value::String(description.to_string()));
                }
            }
        } else if line.contains("<dc:creator>") && line.contains("</dc:creator>") {
            if let Some(start) = line.find("<dc:creator>") {
                if let Some(end) = line.find("</dc:creator>") {
                    let creator = &line[start + 12..end];
                    metadata.insert("creator".to_string(), serde_json::Value::String(creator.to_string()));
                }
            }
        } else if line.contains("<dc:rights>") && line.contains("</dc:rights>") {
            if let Some(start) = line.find("<dc:rights>") {
                if let Some(end) = line.find("</dc:rights>") {
                    let copyright = &line[start + 11..end];
                    metadata.insert("copyright".to_string(), serde_json::Value::String(copyright.to_string()));
                }
            }
        } else if line.contains("<xmp:Rating>") && line.contains("</xmp:Rating>") {
            if let Some(start) = line.find("<xmp:Rating>") {
                if let Some(end) = line.find("</xmp:Rating>") {
                    let rating_str = &line[start + 12..end];
                    if let Ok(rating) = rating_str.parse::<u64>() {
                        metadata.insert("rating".to_string(), serde_json::Value::Number(serde_json::Number::from(rating)));
                    }
                }
            }
        } else if line.contains("<xmp:Label>") && line.contains("</xmp:Label>") {
            if let Some(start) = line.find("<xmp:Label>") {
                if let Some(end) = line.find("</xmp:Label>") {
                    let label = &line[start + 11..end];
                    metadata.insert("colorLabel".to_string(), serde_json::Value::String(label.to_string()));
                }
            }
        }
    }
    
    // Handle keywords (more complex due to RDF bag structure)
    let mut keywords = Vec::new();
    let mut in_subject = false;
    let mut in_bag = false;
    
    for line in &lines {
        let line = line.trim();
        
        if line.contains("<dc:subject>") {
            in_subject = true;
        } else if line.contains("</dc:subject>") {
            in_subject = false;
        } else if in_subject && line.contains("<rdf:Bag>") {
            in_bag = true;
        } else if in_subject && line.contains("</rdf:Bag>") {
            in_bag = false;
        } else if in_subject && in_bag && line.contains("<rdf:li>") && line.contains("</rdf:li>") {
            if let Some(start) = line.find("<rdf:li>") {
                if let Some(end) = line.find("</rdf:li>") {
                    let keyword = &line[start + 8..end];
                    keywords.push(keyword.to_string());
                }
            }
        }
    }
    
    if !keywords.is_empty() {
        metadata.insert("keywords".to_string(), serde_json::Value::String(keywords.join(", ")));
    }
    
    // Return success response with metadata
    let mut response = serde_json::Map::new();
    response.insert("success".to_string(), serde_json::Value::Bool(true));
    response.insert("hasMetadata".to_string(), serde_json::Value::Bool(true));
    response.insert("metadata".to_string(), serde_json::Value::Object(metadata));
    
    Ok(serde_json::Value::Object(response))
}

// Tauri command for updating photo XMP metadata
#[tauri::command]
async fn update_photo_metadata(file_path: String, metadata: serde_json::Value) -> Result<serde_json::Value, String> {
    use std::path::Path;

    
    println!("Updating metadata for file: {}", file_path);
    println!("New metadata: {:?}", metadata);
    
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    // Extract metadata values from JSON
    let title = metadata.get("title").and_then(|v| v.as_str()).unwrap_or("");
    let description = metadata.get("description").and_then(|v| v.as_str()).unwrap_or("");
    let keywords = metadata.get("keywords").and_then(|v| v.as_str()).unwrap_or("");
    let creator = metadata.get("creator").and_then(|v| v.as_str()).unwrap_or("");
    let copyright = metadata.get("copyright").and_then(|v| v.as_str()).unwrap_or("");
    let rating = metadata.get("rating").and_then(|v| v.as_u64()).unwrap_or(0);
    let color_label = metadata.get("colorLabel").and_then(|v| v.as_str()).unwrap_or("");
    
    // Create XMP metadata content
    let mut xmp_content = String::new();
    xmp_content.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xmp_content.push_str("<x:xmpmeta xmlns:x=\"adobe:ns:meta/\">\n");
    xmp_content.push_str("  <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n");
    xmp_content.push_str("    <rdf:Description rdf:about=\"\"\n");
    xmp_content.push_str("      xmlns:dc=\"http://purl.org/dc/elements/1.1/\"\n");
    xmp_content.push_str("      xmlns:xmp=\"http://ns.adobe.com/xap/1.0/\">\n");
    
    // Add metadata fields
    if !title.is_empty() {
        xmp_content.push_str(&format!("      <dc:title>{}</dc:title>\n", title));
    }
    
    if !description.is_empty() {
        xmp_content.push_str(&format!("      <dc:description>{}</dc:description>\n", description));
    }
    
    if !creator.is_empty() {
        xmp_content.push_str(&format!("      <dc:creator>{}</dc:creator>\n", creator));
    }
    
    if !keywords.is_empty() {
        let keywords_list: Vec<&str> = keywords.split(',').map(|s| s.trim()).collect();
        xmp_content.push_str("      <dc:subject>\n");
        xmp_content.push_str("        <rdf:Bag>\n");
        for keyword in keywords_list {
            xmp_content.push_str(&format!("          <rdf:li>{}</rdf:li>\n", keyword));
        }
        xmp_content.push_str("        </rdf:Bag>\n");
        xmp_content.push_str("      </dc:subject>\n");
    }
    
    if !copyright.is_empty() {
        xmp_content.push_str(&format!("      <dc:rights>{}</dc:rights>\n", copyright));
    }
    
    if rating > 0 {
        xmp_content.push_str(&format!("      <xmp:Rating>{}</xmp:Rating>\n", rating));
    }
    
    if !color_label.is_empty() && color_label != "None" {
        xmp_content.push_str(&format!("      <xmp:Label>{}</xmp:Label>\n", color_label));
    }
    
    // Close XML tags
    xmp_content.push_str("    </rdf:Description>\n");
    xmp_content.push_str("  </rdf:RDF>\n");
    xmp_content.push_str("</x:xmpmeta>\n");
    
    // Create XMP sidecar file path
    let xmp_path = path.with_extension("xmp");
    
    // Write XMP metadata to sidecar file
    fs::write(&xmp_path, xmp_content).map_err(|e| format!("Failed to write XMP file: {}", e))?;
    
    println!("XMP metadata written to: {:?}", xmp_path);
    
    // Return success response
    let mut response = serde_json::Map::new();
    response.insert("success".to_string(), serde_json::Value::Bool(true));
    response.insert("message".to_string(), serde_json::Value::String("XMP metadata file created successfully".to_string()));
    response.insert("xmpPath".to_string(), serde_json::Value::String(xmp_path.to_string_lossy().to_string()));
    
    Ok(serde_json::Value::Object(response))
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
            read_project_folder,
            get_image_data_url,
            get_image_thumbnail,
            read_photo_metadata,
            update_photo_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
