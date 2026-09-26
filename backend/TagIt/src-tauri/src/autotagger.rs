use crate::error::AppError;
use crate::supabase::SupabaseClient;
use serde::{Deserialize, Serialize};
use crate::{raw, xmp};
use std::path::{Path, PathBuf};
use std::fs;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

const GEMINI_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models";
/// Tried in order. Individual models are often overloaded (503) or retired (404), so fall through.
const GEMINI_MODELS: &[&str] = &["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
/// Detections below this confidence are never written to a photo: naming the wrong
/// player is worse than leaving a photo untagged.
const MIN_CONFIDENCE: f64 = 75.0;

// ─── Core Types ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default)]
pub struct Player {
    pub name: String,
    /// Text, not an integer: "0" and "00" are different jerseys.
    pub jersey_number: Option<String>,
}

/// One uploaded roster PDF. `pdf_hash` (SHA-256 of the file) identifies duplicates.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Roster {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub sport: String,
    /// Always "YYYY-YYYY", e.g. "2026-2027"
    pub season: String,
    pub created_at: Option<String>,
}

/// A jersey number Gemini saw, with how sure it is (0-100).
#[derive(Debug, Serialize, Clone)]
pub struct DetectedNumber {
    pub number: String,
    pub confidence: f64,
    /// Worn by a player in our team's jersey color. Only these are ever tagged.
    pub our_team: bool,
}

/// Outcome of tagging one RAW photo.
#[derive(Debug, Serialize, Clone)]
pub struct TagResult {
    pub file_name: String,
    pub file_path: String,
    /// Every jersey number Gemini saw — including low-confidence ones and ones not on the roster
    pub detected_numbers: Vec<DetectedNumber>,
    pub matched_players: Vec<Player>,
    /// Text added to the sidecar's description
    pub description: Option<String>,
    /// False when nothing matched or the description already had this text
    pub xmp_updated: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsingResult {
    /// True when this exact PDF was already uploaded; parsing was skipped.
    pub duplicate: bool,
    pub message: String,
    pub roster: Option<Roster>,
    pub players: Vec<Player>,
}

/// What Gemini extracted from a roster PDF, before it is saved.
pub struct ParsedRoster {
    pub sport: String,
    pub season: String,
    pub players: Vec<Player>,
}

/// Normalize a season to "YYYY-YYYY". Accepts "2026-2027", "2026–27", "2026/2027", "2026 - 2027".
/// Returns None for anything that isn't two consecutive years (including a single year).
pub fn normalize_season(raw: &str) -> Option<String> {
    let parts: Vec<&str> = raw
        .split(|c: char| !c.is_ascii_digit())
        .filter(|s| !s.is_empty())
        .collect();
    let [start, end] = parts.as_slice() else { return None };
    if start.len() != 4 {
        return None;
    }
    let s: i32 = start.parse().ok()?;
    let e: i32 = match end.len() {
        4 => end.parse().ok()?,
        2 if end.parse::<i32>().ok()? == (s + 1) % 100 => s + 1,
        _ => return None,
    };
    (e == s + 1).then(|| format!("{}-{}", s, e))
}

// ─── AutoTagger ──────────────────────────────────────────────────────────────

pub struct AutoTagger {
    supabase: SupabaseClient,
    gemini_api_key: Option<String>,
}

impl AutoTagger {
    pub fn new(supabase: SupabaseClient) -> Result<Self, AppError> {
        dotenv::dotenv().ok();
        let gemini_api_key = std::env::var("GEMINI_API_KEY").ok();
        if gemini_api_key.is_none() {
            log::warn!("⚠️  GEMINI_API_KEY not set — PDF parsing will fail");
        }
        Ok(Self { supabase, gemini_api_key })
    }

    async fn call_gemini(&self, mime_type: &str, data: &[u8], prompt: &str) -> Result<String, AppError> {
        let api_key = self.gemini_api_key.as_deref().ok_or_else(|| {
            AppError::Internal("GEMINI_API_KEY is not set. Please add it to your .env file.".to_string())
        })?;

        let body = serde_json::json!({
            "contents": [{
                "parts": [
                    { "inline_data": { "mime_type": mime_type, "data": BASE64.encode(data) } },
                    { "text": prompt }
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 32768,
                "responseMimeType": "application/json"
            }
        });

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(180))
            .build()?;
        let mut last_error = String::new();

        for round in 0..3u64 {
            if round > 0 {
                tokio::time::sleep(std::time::Duration::from_secs(15 * round)).await;
            }
            for model in GEMINI_MODELS {
                let url = format!("{}/{}:generateContent?key={}", GEMINI_BASE_URL, model, api_key);
                let response = match client.post(&url).json(&body).send().await {
                    Ok(r) => r,
                    Err(e) => {
                        // Don't log `e` with the URL: it contains the API key
                        last_error = format!("{}: request failed ({})", model, if e.is_timeout() { "timed out" } else { "network error" });
                        continue;
                    }
                };

                let status = response.status();
                if status.is_success() {
                    if !last_error.is_empty() {
                        log::info!("Gemini: {} succeeded after earlier failures", model);
                    }
                    let json: serde_json::Value = response.json().await?;
                    let candidate = &json["candidates"][0];
                    return match candidate["content"]["parts"].as_array()
                        .and_then(|parts| parts.iter().filter_map(|p| p["text"].as_str()).last())
                    {
                        Some(text) => Ok(text.to_string()),
                        None => Err(AppError::Internal(format!(
                            "Gemini ({}) returned no text (finishReason: {})",
                            model, candidate["finishReason"].as_str().unwrap_or("unknown")
                        ))),
                    };
                }

                let error_text = response.text().await.unwrap_or_default();
                last_error = format!("{} returned {}: {}", model, status, error_text.chars().take(1200).collect::<String>());
                // Bad request / bad key won't be fixed by another model
                if !matches!(status.as_u16(), 404 | 429 | 500 | 502 | 503 | 504) {
                    return Err(AppError::Internal(format!("Gemini API error — {}", last_error)));
                }
                log::warn!("Gemini fallback: {}", last_error);
            }
        }

        Err(AppError::Internal(format!("All Gemini models are unavailable right now. Last error — {}", last_error)))
    }

    // ─── PDF Roster Parsing ───────────────────────────────────────────────────

    /// Send the roster PDF to Gemini and extract sport, season and players.
    pub async fn parse_roster_pdf(&self, pdf_bytes: &[u8]) -> Result<ParsedRoster, AppError> {
        let prompt = r#"You are a sports roster data extractor. You are given a roster PDF.

Extract:
- "sport": the sport, prefixed with "Men's" or "Women's" when the roster says so (e.g. "Men's Basketball", "Football", "Women's Soccer").
- "season": the season as two consecutive years joined by a hyphen, exactly "YYYY-YYYY" (e.g. "2026-2027").
  Convert other forms ("2026-27", "2026/2027") to this format. If only one year is shown, return the
  season that year belongs to (e.g. a fall sport in "2026" is "2026-2027", a spring sport in "2026" is "2025-2026").
  Use null only if no year appears anywhere.
- "players": every player. Only players — NOT coaches, staff, or managers.
  For each: "name" (full name) and "jersey_number" (a string exactly as printed, e.g. "00", "7"; null if none).

Return ONLY JSON in this format:
{"sport": "Basketball", "season": "2026-2027", "players": [{"name": "John Smith", "jersey_number": "23"}]}"#;

        let text = self.call_gemini("application/pdf", pdf_bytes, prompt).await?;
        let json: serde_json::Value = serde_json::from_str(text.trim())
            .map_err(|e| AppError::Internal(format!("Could not read Gemini's response: {} — {}", e, text.chars().take(300).collect::<String>())))?;

        let sport = json["sport"].as_str().map(str::trim).filter(|s| !s.is_empty())
            .ok_or_else(|| AppError::InvalidInput("Couldn't determine the sport from this roster PDF.".to_string()))?
            .to_string();

        let raw_season = json["season"].as_str().unwrap_or("");
        let season = normalize_season(raw_season).ok_or_else(|| AppError::InvalidInput(format!(
            "Couldn't find the season as a year range (e.g. 2026-2027) in this roster PDF (got {:?}).", raw_season
        )))?;

        let players: Vec<Player> = json["players"].as_array().into_iter().flatten()
            .filter_map(|p| {
                let name = p["name"].as_str()?.trim();
                if name.is_empty() {
                    return None;
                }
                let jersey_number = p["jersey_number"].as_str().map(|s| s.trim().trim_start_matches('#').to_string())
                    .or_else(|| p["jersey_number"].as_i64().map(|n| n.to_string()))
                    .filter(|s| !s.is_empty());
                Some(Player { name: name.to_string(), jersey_number })
            })
            .collect();

        if players.is_empty() {
            return Err(AppError::InvalidInput("No players found in this roster PDF.".to_string()));
        }

        Ok(ParsedRoster { sport, season, players })
    }

    // ─── Photo Folder Processing ──────────────────────────────────────────────

    /// Jersey numbers visible in a JPEG, as printed (e.g. "00"), each with a confidence.
    async fn detect_jersey_numbers(&self, jpeg: &[u8], jersey_color: &str) -> Result<Vec<DetectedNumber>, AppError> {
        let prompt = format!(r#"Identify the jersey numbers worn by players in this image.

Our team wears: "{jersey_color}". Other players (opponents, referees) wear different colors.

For each one return an object: {{"number": "42", "confidence": 88, "our_team": true}}
- "number": the digits exactly as printed on the jersey ("00" and "0" are different numbers).
- "confidence": 0-100, how certain you are that you read every digit correctly AND that it is a
  player's jersey number — not a scoreboard, clock, banner, advertisement, or logo.
- "our_team": true ONLY if that number is on a jersey matching our team's colors above. false for
  any other jersey color, or when you cannot tell whose jersey it is.

Be strict and conservative. Give a LOW confidence (under 75) when digits are partly hidden, blurry,
cut off, seen at a steep angle, or when you are guessing between similar digits (3/8, 5/6, 0/8).
Only give a high confidence when the full number is clearly legible. Never guess a number to be helpful.

Return ONLY a JSON array, e.g. [{{"number": "42", "confidence": 88, "our_team": true}}]. If none are visible, return []."#);

        let text = self.call_gemini("image/jpeg", jpeg, &prompt).await?;
        let json: serde_json::Value = serde_json::from_str(text.trim())
            .map_err(|e| AppError::Internal(format!("Could not read Gemini's response: {}", e)))?;

        let mut numbers: Vec<DetectedNumber> = json.as_array().into_iter().flatten()
            .filter_map(|v| {
                let number = v["number"].as_str().map(|s| s.trim().trim_start_matches('#').to_string())
                    .or_else(|| v["number"].as_i64().map(|n| n.to_string()))
                    .filter(|s| !s.is_empty())?;
                // A detection without a confidence is treated as unusable rather than certain
                let confidence = v["confidence"].as_f64().unwrap_or(0.0).clamp(0.0, 100.0);
                // Unknown team counts as not ours, so opponents are never tagged by accident
                let our_team = v["our_team"].as_bool().unwrap_or(false);
                Some(DetectedNumber { number, confidence, our_team })
            })
            .collect();

        // Same number seen twice on the same team: keep the most confident reading.
        // Both teams can wear the same number, so those stay separate.
        numbers.sort_by(|a, b| a.number.cmp(&b.number).then(b.our_team.cmp(&a.our_team)).then(b.confidence.total_cmp(&a.confidence)));
        numbers.dedup_by(|a, b| a.number == b.number && a.our_team == b.our_team);
        Ok(numbers)
    }

    /// Tag every RAW photo in a folder (not subfolders) against one roster.
    /// JPEGs and other non-RAW files are skipped. `on_progress(done, total, file_name)` fires before each photo.
    pub async fn process_photo_folder(
        &self,
        roster_id: &str,
        jersey_color: &str,
        folder_path: &str,
        access_token: &str,
        on_progress: impl Fn(usize, usize, &str),
    ) -> Result<Vec<TagResult>, AppError> {
        if self.gemini_api_key.is_none() {
            return Err(AppError::Internal("GEMINI_API_KEY is not set. Please add it to your .env file.".to_string()));
        }

        let jersey_color = jersey_color.trim();
        if jersey_color.is_empty() {
            return Err(AppError::InvalidInput("Enter your team's jersey color.".to_string()));
        }

        let roster = self.supabase.get_roster_players(roster_id, access_token).await?;
        if roster.is_empty() {
            return Err(AppError::InvalidInput("The selected roster has no players.".to_string()));
        }

        let mut photos: Vec<PathBuf> = fs::read_dir(folder_path)?
            .filter_map(|entry| entry.ok().map(|e| e.path()))
            .filter(|p| p.is_file() && raw::is_raw(p))
            .collect();
        photos.sort();
        if photos.is_empty() {
            return Err(AppError::InvalidInput("No RAW photos found in this folder (JPEGs are not tagged).".to_string()));
        }

        let mut results = Vec::with_capacity(photos.len());
        for (i, path) in photos.iter().enumerate() {
            let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            on_progress(i, photos.len(), &file_name);

            let mut result = TagResult {
                file_name,
                file_path: path.to_string_lossy().to_string(),
                detected_numbers: Vec::new(),
                matched_players: Vec::new(),
                description: None,
                xmp_updated: false,
                error: None,
            };
            if let Err(e) = self.tag_photo(&roster, jersey_color, path, &mut result).await {
                log::warn!("Failed to tag {}: {}", result.file_name, e);
                result.error = Some(e.to_string());
            }
            results.push(result);
        }
        on_progress(photos.len(), photos.len(), "");

        Ok(results)
    }

    async fn tag_photo(&self, roster: &[Player], jersey_color: &str, path: &Path, result: &mut TagResult) -> Result<(), AppError> {
        let jpeg = gemini_jpeg(raw::preview_image(path).map_err(AppError::Internal)?)?;

        result.detected_numbers = self.detect_jersey_numbers(&jpeg, jersey_color).await?;
        result.matched_players = match_players(roster, &result.detected_numbers);
        result.description = generate_photo_description(&result.matched_players);

        if let Some(description) = &result.description {
            result.xmp_updated = xmp::append_description_file(&xmp::sidecar_path(path), description)
                .map_err(AppError::Internal)?;
        }
        Ok(())
    }
}

/// Re-encode as a JPEG no larger than 2048px on the long edge: plenty for jersey numbers,
/// and keeps requests far below Gemini's inline size limit.
fn gemini_jpeg(img: image::DynamicImage) -> Result<Vec<u8>, AppError> {
    const MAX_DIM: u32 = 2048;
    let img = if img.width().max(img.height()) > MAX_DIM {
        img.resize(MAX_DIM, MAX_DIM, image::imageops::FilterType::Triangle)
    } else {
        img
    };
    let mut buf = Vec::new();
    image::DynamicImage::ImageRgb8(img.to_rgb8())
        .write_to(&mut std::io::Cursor::new(&mut buf), image::ImageOutputFormat::Jpeg(85))?;
    Ok(buf)
}

/// Roster players whose number was seen on our team's jersey, confidently enough to tag.
fn match_players(roster: &[Player], numbers: &[DetectedNumber]) -> Vec<Player> {
    numbers
        .iter()
        .filter(|d| d.our_team && d.confidence >= MIN_CONFIDENCE)
        .filter_map(|d| roster.iter().find(|p| p.jersey_number.as_deref() == Some(d.number.as_str())))
        .cloned()
        .collect()
}

fn generate_photo_description(players: &[Player]) -> Option<String> {
    if players.is_empty() {
        return None;
    }
    let names: Vec<String> = players
        .iter()
        .map(|p| match &p.jersey_number {
            Some(num) => format!("{} (#{})", p.name, num),
            None => p.name.clone(),
        })
        .collect();
    Some(format!("Players: {}", names.join(", ")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn season_normalization() {
        assert_eq!(normalize_season("2026-2027").as_deref(), Some("2026-2027"));
        assert_eq!(normalize_season("2026–27").as_deref(), Some("2026-2027"));
        assert_eq!(normalize_season("2026 / 2027").as_deref(), Some("2026-2027"));
        assert_eq!(normalize_season("1999-00").as_deref(), Some("1999-2000"));
        assert_eq!(normalize_season("2026"), None);
        assert_eq!(normalize_season("2026-2028"), None);
        assert_eq!(normalize_season("2026-28"), None);
        assert_eq!(normalize_season(""), None);
    }

    #[test]
    fn matches_only_roster_numbers() {
        let roster = vec![
            Player { name: "A".into(), jersey_number: Some("0".into()) },
            Player { name: "B".into(), jersey_number: Some("00".into()) },
        ];
        let det = |n: &str, c: f64| DetectedNumber { number: n.into(), confidence: c, our_team: true };
        let matched = match_players(&roster, &[det("00", 90.0), det("99", 99.0)]);
        assert_eq!(generate_photo_description(&matched).as_deref(), Some("Players: B (#00)"));
        // Anything under 75% confidence is discarded, even when it is on the roster
        assert!(match_players(&roster, &[det("0", 74.9), det("00", 0.0)]).is_empty());
        assert_eq!(match_players(&roster, &[det("0", 75.0)]).len(), 1);
        // A roster number on the other team's jersey is never tagged
        let opponent = DetectedNumber { number: "0".into(), confidence: 99.0, our_team: false };
        assert!(match_players(&roster, &[opponent]).is_empty());
    }
}


