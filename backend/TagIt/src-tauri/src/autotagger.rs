use crate::error::AppError;
use crate::supabase::SupabaseClient;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;
use image::{DynamicImage, GenericImageView};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

// ─── Core Player Struct ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Player {
    pub name: String,
    pub jersey_number: Option<i32>,
    pub position: Option<String>,
    pub team: Option<String>,
    pub image_url: Option<String>,
    pub school_name: Option<String>,
    pub sport_type: Option<String>,
    /// Base64-encoded face/headshot image extracted from the roster PDF
    pub face_image_base64: Option<String>,
    /// Textual description of the player's appearance, for later action-photo matching
    pub face_descriptor: Option<String>,
}

// ─── Photo Metadata Types ────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectedFace {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectedJerseyNumber {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub number: String,
    pub confidence: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PhotoMetadata {
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub width: u32,
    pub height: u32,
    pub detected_players: Vec<Player>,
    pub detected_faces: Vec<DetectedFace>,
    pub detected_jersey_numbers: Vec<DetectedJerseyNumber>,
    pub description: Option<String>,
}

// ─── PDF Parsing Result ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsingResult {
    pub players: Vec<Player>,
    pub parsing_method: String,
    pub parsing_details: String,
    pub player_count: usize,
    pub success: bool,
    pub error_message: Option<String>,
}

// ─── AutoTagger ──────────────────────────────────────────────────────────────

pub struct AutoTagger {
    supabase: SupabaseClient,
    gemini_api_key: Option<String>,
    insightface_detector: Option<crate::insightface::FaceDetector>,
}

impl AutoTagger {
    pub fn new(supabase: SupabaseClient) -> Result<Self, AppError> {
        dotenv::dotenv().ok();
        let gemini_api_key = std::env::var("GEMINI_API_KEY").ok();

        if gemini_api_key.is_some() {
            log::info!("✅ Gemini API key loaded");
        } else {
            log::warn!("⚠️  GEMINI_API_KEY not set — PDF parsing will fail");
        }

        let insightface_detector = crate::insightface::FaceDetector::new("models/buffalo_l/det_10g.onnx")
            .map_err(|e| log::warn!("Failed to load InsightFace ONNX model: {:?}", e))
            .ok();

        Ok(Self {
            supabase,
            gemini_api_key,
            insightface_detector,
        })
    }

    // ─── PDF Roster Parsing ───────────────────────────────────────────────────

    /// Main entry point: parse a roster from a local PDF file path.
    ///
    /// Strategy:
    /// 1. Extract raw text from the PDF using `pdf-extract`.
    /// 2. Extract all embedded image bytes from the PDF using `lopdf`.
    /// 3. Send both the extracted text AND the PDF as a base64 Vision payload
    ///    to the Gemini API, asking it to return a structured JSON roster where
    ///    each player entry includes appearance/face description.
    /// 4. Try to match embedded images → players by page proximity so we can
    ///    attach `face_image_base64` to each player.
    pub async fn parse_roster_from_pdf(&self, pdf_path: &str) -> Result<ParsingResult, AppError> {
        log::info!("📄 Starting PDF roster parsing: {}", pdf_path);

        // ── Step 1: Read raw PDF bytes ──────────────────────────────────────
        let pdf_bytes = fs::read(pdf_path)
            .map_err(|e| AppError::Internal(format!("Failed to read PDF: {}", e)))?;

        // ── Step 2: Extract plain text from PDF ────────────────────────────
        let extracted_text = self.extract_pdf_text(&pdf_bytes);
        log::info!("📝 PDF text extracted ({} chars)", extracted_text.len());

        // ── Step 3: Extract embedded images from PDF ────────────────────────
        let embedded_images = self.extract_pdf_images(&pdf_bytes);
        log::info!("🖼️  Found {} embedded images in PDF", embedded_images.len());

        // ── Step 4: Send to Gemini Vision API ──────────────────────────────
        let api_key = self.gemini_api_key.as_deref().ok_or_else(|| {
            AppError::Internal("GEMINI_API_KEY is not set. Please add it to your .env file.".to_string())
        })?;

        let pdf_b64 = BASE64.encode(&pdf_bytes);

        match self.call_gemini_vision_pdf(api_key, &pdf_b64, &extracted_text).await {
            Ok(mut players) => {
                // ── Step 5: Attach embedded face images to matched players ──
                if !embedded_images.is_empty() {
                    self.attach_face_images_to_players(&mut players, &embedded_images);
                }

                let count = players.len();
                log::info!("✅ PDF parsing complete: {} players found", count);

                Ok(ParsingResult {
                    players,
                    parsing_method: "Gemini Vision PDF".to_string(),
                    parsing_details: format!(
                        "Extracted from PDF using Gemini Vision. {} embedded images found.",
                        embedded_images.len()
                    ),
                    player_count: count,
                    success: true,
                    error_message: None,
                })
            }
            Err(e) => {
                log::error!("❌ Gemini Vision PDF parsing failed: {}", e);
                Ok(ParsingResult {
                    players: Vec::new(),
                    parsing_method: "Gemini Vision PDF".to_string(),
                    parsing_details: "Gemini Vision parsing failed".to_string(),
                    player_count: 0,
                    success: false,
                    error_message: Some(e.to_string()),
                })
            }
        }
    }

    /// Extract plain text from PDF bytes using the `pdf-extract` crate.
    fn extract_pdf_text(&self, pdf_bytes: &[u8]) -> String {
        match pdf_extract::extract_text_from_mem(pdf_bytes) {
            Ok(text) => text,
            Err(e) => {
                log::warn!("pdf-extract failed ({}), continuing with empty text", e);
                String::new()
            }
        }
    }

    /// Extract all embedded image XObjects from a PDF as raw bytes.
    fn extract_pdf_images(&self, pdf_bytes: &[u8]) -> Vec<Vec<u8>> {
        let mut images: Vec<Vec<u8>> = Vec::new();

        let doc = match lopdf::Document::load_mem(pdf_bytes) {
            Ok(d) => d,
            Err(e) => {
                log::warn!("lopdf failed to parse PDF for image extraction: {}", e);
                return images;
            }
        };

        for (_, page_id) in doc.get_pages() {
            // get_page_resources returns (Option<&Dictionary>, Vec<ObjectId>)
            let (resources_opt, _) = doc.get_page_resources(page_id);

            let resources = match resources_opt {
                Some(r) => r,
                None => continue,
            };

            // Get the XObject sub-dictionary (may be inline or a reference)
            let xobjects: lopdf::Dictionary = match resources.get(b"XObject") {
                Ok(lopdf::Object::Dictionary(d)) => d.clone(),
                Ok(lopdf::Object::Reference(id)) => match doc.get_object(*id) {
                    Ok(lopdf::Object::Dictionary(d)) => d.clone(),
                    _ => continue,
                },
                _ => continue,
            };

            for (_, xobj_val) in xobjects.iter() {
                let xobj_id = match xobj_val {
                    lopdf::Object::Reference(id) => *id,
                    _ => continue,
                };

                let stream = match doc.get_object(xobj_id) {
                    Ok(lopdf::Object::Stream(s)) => s,
                    _ => continue,
                };

                // Only extract Image XObjects
                let subtype_ok = match stream.dict.get(b"Subtype") {
                    Ok(lopdf::Object::Name(n)) => n == b"Image",
                    _ => false,
                };
                if !subtype_ok {
                    continue;
                }

                let content = stream.decompressed_content().unwrap_or_else(|_| stream.content.clone());
                if !content.is_empty() {
                    images.push(content);
                }
            }
        }

        images
    }



    /// Call the Gemini Vision API with the PDF as inline base64 data.
    /// Returns a Vec<Player> parsed from Gemini's JSON response.
    async fn call_gemini_vision_pdf(
        &self,
        api_key: &str,
        pdf_b64: &str,
        extracted_text: &str,
    ) -> Result<Vec<Player>, AppError> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={}",
            api_key
        );

        let prompt = format!(
            r#"You are an expert sports roster data extractor. You are given a PDF roster document.

Your task:
1. Extract ALL players listed in the roster.
2. For each player, determine:
   - Full name
   - Jersey number (integer, null if not present)
   - Position (null if not listed)
   - Sport type (e.g. "Basketball", "Football", "Soccer")
   - Team classification: "university", "professional", "amateur", or "other"
   - School name (if university team, otherwise null)
   - Team name (if professional team, otherwise null)
   - Whether the player has a headshot/photo visible next to their entry (true/false)
   - A brief physical appearance description IF a headshot is visible (e.g. "young male, dark hair, medium build, jersey #23"). Otherwise null.
3. Only include actual players — NOT coaches, staff, or managers.

Return ONLY valid JSON in exactly this format, no extra text:
{{
  "sport_type": "Basketball",
  "team_classification": "university",
  "school_name": "Michigan Wolverines",
  "team_name": null,
  "players": [
    {{
      "name": "John Smith",
      "jersey_number": 23,
      "position": "Forward",
      "has_headshot": true,
      "face_descriptor": "young male, dark curly hair, light skin, #23 jersey"
    }},
    {{
      "name": "Mike Johnson",
      "jersey_number": 11,
      "position": "Guard",
      "has_headshot": false,
      "face_descriptor": null
    }}
  ]
}}

Supplementary extracted text from PDF (use as reference):
{}
"#,
            &extracted_text[..extracted_text.len().min(8000)]
        );

        let body = serde_json::json!({
            "contents": [{
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": "application/pdf",
                            "data": pdf_b64
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 8192
            }
        });

        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Gemini API request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(AppError::Internal(format!(
                "Gemini API error {}: {}",
                status, error_text
            )));
        }

        let json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse Gemini response: {}", e)))?;

        // Extract text from Gemini response structure
        let text = json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .unwrap_or("");

        self.parse_gemini_pdf_response(text)
    }

    /// Parse Gemini's JSON text response into a Vec<Player>.
    fn parse_gemini_pdf_response(&self, response_text: &str) -> Result<Vec<Player>, AppError> {
        // Strip markdown code fences if present
        let cleaned = response_text
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        let json_start = cleaned.find('{').ok_or_else(|| {
            AppError::Internal(format!("No JSON object found in Gemini response: {}", &cleaned[..cleaned.len().min(200)]))
        })?;
        let json_end = cleaned.rfind('}').ok_or_else(|| {
            AppError::Internal("Malformed JSON in Gemini response".to_string())
        })?;

        let json_str = &cleaned[json_start..=json_end];
        let json: serde_json::Value = serde_json::from_str(json_str)
            .map_err(|e| AppError::Internal(format!("JSON parse error: {} — snippet: {}", e, &json_str[..json_str.len().min(300)])))?;

        let sport_type = json["sport_type"].as_str().map(|s| s.to_string());
        let team_classification = json["team_classification"].as_str().map(|s| s.to_string());
        let school_name = json["school_name"].as_str().map(|s| s.to_string());
        let team_name = json["team_name"].as_str().map(|s| s.to_string());

        let mut players = Vec::new();

        if let Some(arr) = json["players"].as_array() {
            for p in arr {
                let name = match p["name"].as_str() {
                    Some(n) if !n.is_empty() => n.to_string(),
                    _ => continue,
                };

                let jersey_number = p["jersey_number"].as_i64().map(|n| n as i32)
                    .or_else(|| p["jersey_number"].as_str().and_then(|s| s.parse().ok()));

                let position = p["position"].as_str().map(|s| s.to_string());
                let face_descriptor = p["face_descriptor"].as_str().map(|s| s.to_string());

                // Determine team field (university → school name, professional → team name)
                let team = match team_classification.as_deref() {
                    Some("university") => school_name.clone(),
                    Some("professional") => team_name.clone(),
                    _ => school_name.clone().or_else(|| team_name.clone()),
                };

                players.push(Player {
                    name,
                    jersey_number,
                    position,
                    team,
                    image_url: None,
                    school_name: school_name.clone(),
                    sport_type: sport_type.clone(),
                    face_image_base64: None, // filled in by attach_face_images_to_players
                    face_descriptor,
                });
            }
        }

        Ok(players)
    }

    /// Try to match extracted PDF images to players.
    ///
    /// If there is exactly one image per player (common in athletics PDFs), we
    /// assign images to players in order. If counts differ, we still assign as
    /// many as we can.
    fn attach_face_images_to_players(
        &self,
        players: &mut Vec<Player>,
        images: &[Vec<u8>],
    ) {
        for (i, player) in players.iter_mut().enumerate() {
            if let Some(img_bytes) = images.get(i) {
                // Validate it looks like an image (JPEG magic bytes FF D8 FF or PNG 89 50 4E 47)
                let is_jpeg = img_bytes.starts_with(&[0xFF, 0xD8, 0xFF]);
                let is_png  = img_bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]);
                if is_jpeg || is_png {
                    player.face_image_base64 = Some(BASE64.encode(img_bytes));
                }
            }
        }
    }

    // ─── Photo Folder Processing ──────────────────────────────────────────────

    /// Detect faces in a photo — placeholder using bounding box heuristic.
    fn detect_faces(&self, _image: &DynamicImage) -> Result<Vec<DetectedFace>, AppError> {
        // Real implementation would use InsightFace ONNX model.
        // Returning empty vec for now; the insightface module handles this separately.
        Ok(Vec::new())
    }

    /// Detect jersey numbers in a photo — placeholder.
    fn detect_jersey_numbers(&self, _image: &DynamicImage) -> Result<Vec<DetectedJerseyNumber>, AppError> {
        Ok(Vec::new())
    }

    /// Process a folder of photos and tag them automatically
    pub async fn process_photo_folder(
        &self,
        project_id: &str,
        folder_path: &str,
        access_token: &str,
    ) -> Result<Vec<PhotoMetadata>, AppError> {
        let mut photo_metadata = Vec::new();

        let image_extensions = ["jpg", "jpeg", "png", "bmp", "tiff", "webp"];
        let entries = fs::read_dir(folder_path)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            if let Some(extension) = path.extension() {
                if let Some(ext_str) = extension.to_str() {
                    if image_extensions.contains(&ext_str.to_lowercase().as_str()) {
                        if let Ok(metadata) = self.process_single_photo(project_id, &path, access_token).await {
                            photo_metadata.push(metadata);
                        }
                    }
                }
            }
        }

        Ok(photo_metadata)
    }

    /// Process a single photo and extract metadata
    async fn process_single_photo(
        &self,
        project_id: &str,
        file_path: &Path,
        access_token: &str,
    ) -> Result<PhotoMetadata, AppError> {
        let image = image::open(file_path)?;
        let (width, height) = image.dimensions();

        let metadata = fs::metadata(file_path)?;
        let file_size = metadata.len();
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let detected_faces = self.detect_faces(&image)?;
        let detected_jersey_numbers = self.detect_jersey_numbers(&image)?;

        let detected_players = self.match_players_with_detections(
            project_id,
            &detected_faces,
            &detected_jersey_numbers,
            access_token,
        ).await?;

        let description = self.generate_photo_description(&detected_players);

        Ok(PhotoMetadata {
            file_path: file_path.to_string_lossy().to_string(),
            file_name,
            file_size,
            width,
            height,
            detected_players,
            detected_faces,
            detected_jersey_numbers,
            description,
        })
    }

    /// Match detected faces and jersey numbers with players in the database
    async fn match_players_with_detections(
        &self,
        project_id: &str,
        faces: &[DetectedFace],
        jersey_numbers: &[DetectedJerseyNumber],
        access_token: &str,
    ) -> Result<Vec<Player>, AppError> {
        let players = self.supabase.get_players(project_id, access_token).await?;
        let mut matched_players = Vec::new();

        // Match by jersey number first (most reliable)
        for jersey_detection in jersey_numbers {
            if let Some(player) = players.iter().find(|p| {
                p.jersey_number.map(|num| num.to_string() == jersey_detection.number).unwrap_or(false)
            }) {
                matched_players.push(player.clone());
            }
        }

        // If faces detected but no jersey matches, mark as unknown
        if matched_players.is_empty() && !faces.is_empty() {
            matched_players.push(Player {
                name: "Unknown Player".to_string(),
                jersey_number: None,
                position: None,
                team: None,
                image_url: None,
                school_name: None,
                sport_type: None,
                face_image_base64: None,
                face_descriptor: None,
            });
        }

        Ok(matched_players)
    }

    /// Generate a description for the photo based on detected players
    fn generate_photo_description(&self, players: &[Player]) -> Option<String> {
        if players.is_empty() {
            return None;
        }

        let player_names: Vec<String> = players
            .iter()
            .map(|p| {
                if let Some(num) = p.jersey_number {
                    format!("{} (#{})", p.name, num)
                } else {
                    p.name.clone()
                }
            })
            .collect();

        Some(format!("Players: {}", player_names.join(", ")))
    }
}
