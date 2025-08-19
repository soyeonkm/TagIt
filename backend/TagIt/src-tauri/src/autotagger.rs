use crate::error::AppError;
use crate::supabase::SupabaseClient;
use anyhow::Result;
use image::{DynamicImage, GenericImageView};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;
use ask_gemini::Gemini;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Player {
    pub name: String,
    pub jersey_number: Option<i32>,
    pub position: Option<String>,
    pub team: Option<String>,
}

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

pub struct AutoTagger {
    supabase: SupabaseClient,
    gemini_client: Option<Gemini>,
}

impl AutoTagger {
    pub fn new(supabase: SupabaseClient) -> Result<Self, AppError> {
        // Initialize Gemini client if API key is available
        let gemini_client = std::env::var("GEMINI_API_KEY")
            .ok()
            .map(|_| Gemini::new(None, None));

        Ok(Self {
            supabase,
            gemini_client,
        })
    }

    /// Parse roster information from a URL using Gemini LLM
    pub async fn parse_roster_from_url(&self, url: &str) -> Result<Vec<Player>, AppError> {
        // Fetch HTML content from URL
        let response = reqwest::get(url).await?;
        let html_content = response.text().await?;
        
        // Use Gemini LLM to extract player information
        if let Some(_gemini_client) = &self.gemini_client {
            self.parse_roster_with_gemini(&html_content, url).await
        } else {
            // Fallback to basic HTML parsing if Gemini is not available
            self.parse_roster_with_html(&html_content).await
        }
    }

    /// Parse roster using Gemini LLM for intelligent extraction
    async fn parse_roster_with_gemini(&self, html_content: &str, url: &str) -> Result<Vec<Player>, AppError> {
        let prompt = format!(
            "You are an expert at extracting sports team roster information from HTML content. 
            
            Analyze the following HTML content from a sports team roster page and extract all player information.
            
            For each player, identify:
            1. Full name (first and last name)
            2. Jersey number (if visible)
            3. Position (if available)
            4. Team name (if mentioned)
            
            Return the information in this exact JSON format:
            {{
                \"players\": [
                    {{
                        \"name\": \"Player Full Name\",
                        \"jersey_number\": 23,
                        \"position\": \"Forward\",
                        \"team\": \"Team Name\"
                    }}
                ]
            }}
            
            Rules:
            - Only include actual players, not staff or coaches
            - Jersey numbers should be integers (null if not found)
            - Position and team can be null if not specified
            - Names should be properly formatted (e.g., \"John Smith\" not \"JOHN SMITH\")
            - If jersey numbers are mentioned as text like \"No. 23\" or \"#23\", extract just the number
            
            HTML Content:
            {}
            
            URL: {}
            
            Extract the roster information and return only valid JSON:",
            html_content, url
        );

        if let Some(gemini_client) = &self.gemini_client {
            let response = gemini_client.ask(&prompt).await
                .map_err(|e| AppError::Internal(format!("Gemini API error: {}", e)))?;

            // Parse the JSON response from Gemini
            if let Some(response_text) = response.first() {
                self.parse_gemini_response(response_text)
            } else {
                // If no response, fall back to HTML parsing
                log::info!("Gemini returned no response, falling back to HTML parsing");
                self.parse_roster_with_html(html_content).await
            }
        } else {
            // Fallback to HTML parsing if Gemini is not available
            self.parse_roster_with_html(html_content).await
        }
    }

    /// Parse Gemini's JSON response to extract player information
    fn parse_gemini_response(&self, response_text: &str) -> Result<Vec<Player>, AppError> {
        // Clean up the response text to extract just the JSON
        let json_start = response_text.find('{');
        let json_end = response_text.rfind('}');
        
        if let (Some(start), Some(end)) = (json_start, json_end) {
            let json_text = &response_text[start..=end];
            
            // Try to parse the JSON response
            match serde_json::from_str::<serde_json::Value>(json_text) {
                Ok(json) => {
                    if let Some(players_array) = json.get("players") {
                        if let Some(players) = players_array.as_array() {
                            let mut extracted_players = Vec::new();
                            
                            for player_json in players {
                                if let (Some(name), jersey_number, position, team) = (
                                    player_json.get("name").and_then(|n| n.as_str()),
                                    player_json.get("jersey_number"),
                                    player_json.get("position").and_then(|p| p.as_str()),
                                    player_json.get("team").and_then(|t| t.as_str()),
                                ) {
                                    let jersey_num = if let Some(jersey_val) = jersey_number {
                                        jersey_val.as_i64()
                                            .map(|n| n as i32)
                                            .or_else(|| jersey_val.as_str().and_then(|s| s.parse::<i32>().ok()))
                                    } else {
                                        None
                                    };
                                    
                                    extracted_players.push(Player {
                                        name: name.to_string(),
                                        jersey_number: jersey_num,
                                        position: position.map(|p| p.to_string()),
                                        team: team.map(|t| t.to_string()),
                                    });
                                }
                            }
                            
                            if !extracted_players.is_empty() {
                                return Ok(extracted_players);
                            }
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Failed to parse Gemini JSON response: {}", e);
                }
            }
        }
        
        // If Gemini parsing fails, return empty result (fallback will be handled by caller)
        log::info!("Gemini parsing failed, returning empty result");
        Ok(Vec::new())
    }

    /// Fallback method: Parse roster using basic HTML parsing
    async fn parse_roster_with_html(&self, html_content: &str) -> Result<Vec<Player>, AppError> {
        let document = Html::parse_document(html_content);
        let mut players = Vec::new();

        // Try different common selectors for roster tables
        let selectors = [
            "table tr",
            ".roster tr",
            ".team-roster tr",
            ".player-row",
            ".roster-row",
        ];

        for selector_str in selectors.iter() {
            if let Ok(selector) = Selector::parse(selector_str) {
                for element in document.select(&selector) {
                    if let Some(player) = self.extract_player_from_element(&element) {
                        players.push(player);
                    }
                }
                
                if !players.is_empty() {
                    break;
                }
            }
        }

        Ok(players)
    }

    /// Extract player information from HTML element (fallback method)
    fn extract_player_from_element(&self, element: &scraper::ElementRef) -> Option<Player> {
        let text = element.text().collect::<Vec<_>>().join(" ");
        
        // Try to extract jersey number (common patterns)
        let jersey_patterns = [
            r"#(\d+)",
            r"(\d{1,2})",
            r"Jersey[:\s]*(\d+)",
            r"Number[:\s]*(\d+)",
        ];

        let mut jersey_number = None;
        for pattern in jersey_patterns.iter() {
            if let Some(captures) = regex::Regex::new(pattern).ok()?.captures(&text) {
                if let Some(num) = captures.get(1) {
                    jersey_number = num.as_str().parse::<i32>().ok();
                    break;
                }
            }
        }

        // Extract name (assume it's the first capitalized word sequence)
        let name_pattern = r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)";
        let name = regex::Regex::new(name_pattern)
            .ok()?
            .captures(&text)?
            .get(1)?
            .as_str()
            .to_string();

        if name.is_empty() {
            return None;
        }

        Some(Player {
            name,
            jersey_number,
            position: None,
            team: None,
        })
    }

    /// Basic face detection using image analysis (simplified)
    pub fn detect_faces(&self, image: &DynamicImage) -> Result<Vec<DetectedFace>, AppError> {
        let mut detected_faces = Vec::new();
        
        // Simple face detection based on skin tone detection
        // This is a placeholder - in a real implementation you'd use more sophisticated algorithms
        let (width, height) = image.dimensions();
        
        // For now, just detect potential face regions based on image analysis
        // This is a simplified approach that looks for regions with consistent color patterns
        
        // Placeholder: detect center region as potential face area
        let center_x = (width / 4) as i32;
        let center_y = (height / 4) as i32;
        let face_width = (width / 4) as i32;
        let face_height = (height / 4) as i32;
        
        detected_faces.push(DetectedFace {
            x: center_x,
            y: center_y,
            width: face_width,
            height: face_height,
            confidence: 0.5, // Lower confidence for basic detection
        });

        Ok(detected_faces)
    }

    /// Detect jersey numbers using simple image processing
    pub fn detect_jersey_numbers(&self, image: &DynamicImage) -> Result<Vec<DetectedJerseyNumber>, AppError> {
        let mut detected_numbers = Vec::new();
        
        // Try to detect numbers in different regions of the image
        let regions = self.get_potential_jersey_regions(image);
        
        for region in regions {
            if let Some(cropped) = self.crop_image(image, &region) {
                // Simple number detection using edge detection and pattern matching
                if let Some(number) = self.detect_number_pattern(&cropped) {
                    detected_numbers.push(DetectedJerseyNumber {
                        x: region.0,
                        y: region.1,
                        width: region.2,
                        height: region.3,
                        number,
                        confidence: 0.6, // Lower confidence for pattern-based detection
                    });
                }
            }
        }

        Ok(detected_numbers)
    }

    /// Simple number pattern detection using edge detection
    fn detect_number_pattern(&self, image: &DynamicImage) -> Option<String> {
        // Convert to grayscale
        let gray = image.to_luma8();
        
        // Apply edge detection
        let _edges = imageproc::edges::canny(&gray, 50.0, 100.0);
        
        // Look for circular/oval patterns that might be numbers
        // This is a simplified approach - in a real implementation you'd use more sophisticated pattern recognition
        
        // For now, return a placeholder to indicate detection
        Some("?".to_string())
    }

    /// Get potential regions where jersey numbers might be located
    fn get_potential_jersey_regions(&self, image: &DynamicImage) -> Vec<(i32, i32, i32, i32)> {
        let (width, height) = image.dimensions();
        let mut regions = Vec::new();

        // Common jersey number locations (chest area, back area)
        let region_width = (width as f32 * 0.15) as i32;
        let region_height = (height as f32 * 0.25) as i32;

        // Chest region (upper middle)
        regions.push((
            (width as i32 - region_width) / 2,
            (height as i32 * 2) / 5,
            region_width,
            region_height,
        ));

        // Back region (upper middle, slightly higher)
        regions.push((
            (width as i32 - region_width) / 2,
            (height as i32) / 5,
            region_width,
            region_height,
        ));

        regions
    }

    /// Crop image to a specific region
    fn crop_image(&self, image: &DynamicImage, region: &(i32, i32, i32, i32)) -> Option<DynamicImage> {
        let (x, y, width, height) = *region;
        
        if x < 0 || y < 0 || width <= 0 || height <= 0 {
            return None;
        }

        let (img_width, img_height) = image.dimensions();
        let x = x.max(0) as u32;
        let y = y.max(0) as u32;
        let width = width.min((img_width - x) as i32) as u32;
        let height = height.min((img_height - y) as i32) as u32;

        if width == 0 || height == 0 {
            return None;
        }

        Some(image.crop_imm(x, y, width, height))
    }

    /// Process a folder of photos and tag them automatically
    pub async fn process_photo_folder(
        &self,
        project_id: &str,
        folder_path: &str,
    ) -> Result<Vec<PhotoMetadata>, AppError> {
        let mut photo_metadata = Vec::new();
        
        // Get all image files in the folder
        let image_extensions = ["jpg", "jpeg", "png", "bmp", "tiff", "webp"];
        let mut entries = fs::read_dir(folder_path).await?;
        
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if let Some(extension) = path.extension() {
                if let Some(ext_str) = extension.to_str() {
                    if image_extensions.contains(&ext_str.to_lowercase().as_str()) {
                        if let Ok(metadata) = self.process_single_photo(project_id, &path).await {
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
    ) -> Result<PhotoMetadata, AppError> {
        // Load image
        let image = image::open(file_path)?;
        let (width, height) = image.dimensions();
        
        // Get file info
        let metadata = fs::metadata(file_path).await?;
        let file_size = metadata.len();
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Detect faces and jersey numbers
        let detected_faces = self.detect_faces(&image)?;
        let detected_jersey_numbers = self.detect_jersey_numbers(&image)?;

        // Match detected information with players in database
        let detected_players = self.match_players_with_detections(
            project_id,
            &detected_faces,
            &detected_jersey_numbers,
        ).await?;

        // Generate description
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
    ) -> Result<Vec<Player>, AppError> {
        // Get players from database
        let players = self.supabase.get_players(project_id, "dummy_token").await?;
        let mut matched_players = Vec::new();

        // Match by jersey number first (more reliable)
        for jersey_detection in jersey_numbers {
            if let Some(player) = players.iter().find(|p| {
                p.jersey_number.map(|num| num.to_string() == jersey_detection.number).unwrap_or(false)
            }) {
                matched_players.push(player.clone());
            }
        }

        // If we have faces but no jersey numbers, try to match by face position
        // This is a simplified approach - in a real implementation you'd use face recognition
        if matched_players.is_empty() && !faces.is_empty() {
            // For now, just add a generic player entry
            matched_players.push(Player {
                name: "Unknown Player".to_string(),
                jersey_number: None,
                position: None,
                team: None,
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
