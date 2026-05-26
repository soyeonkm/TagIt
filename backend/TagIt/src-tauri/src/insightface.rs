use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use image::{DynamicImage, GenericImageView, imageops::FilterType};
use ndarray::Array4;
use crate::autotagger::DetectedFace;
use crate::error::AppError;

pub struct FaceDetector {
    _session: Session,
}

impl FaceDetector {
    pub fn new(model_path: &str) -> Result<Self, AppError> {
        // Initialize ONNX runtime session for detection
        let session = Session::builder()
            .map_err(|e| AppError::Internal(format!("Failed to build ONNX session: {}", e)))?
            .with_optimization_level(GraphOptimizationLevel::Level3)
            .map_err(|e| AppError::Internal(format!("Failed to set ONNX optimization: {}", e)))?
            .with_intra_threads(4)
            .map_err(|e| AppError::Internal(format!("Failed to set ONNX threads: {}", e)))?
            .commit_from_file(model_path)
            .map_err(|e| AppError::Internal(format!("Failed to load ONNX model {}: {}", model_path, e)))?;

        Ok(Self { _session: session })
    }

    pub fn detect_faces(&self, image: &DynamicImage) -> Result<Vec<DetectedFace>, AppError> {
        // 1. Preprocessing
        let target_size = 640;
        let (_width, _height) = image.dimensions();
        
        // Convert to RGB8 and resize
        let rgb_img = image.to_rgb8();
        let resized = image::imageops::resize(&rgb_img, target_size, target_size, FilterType::Triangle);
        
        // Convert to NCHW normalized tensor (1, 3, 640, 640)
        // InsightFace typically uses BGR, but we'll adapt based on standard RGB logic first
        // Mean and Std for InsightFace: mean=[127.5, 127.5, 127.5], std=[128.0, 128.0, 128.0]
        let mut input_tensor = Array4::<f32>::zeros((1, 3, target_size as usize, target_size as usize));
        
        for (x, y, pixel) in resized.enumerate_pixels() {
            let r = (pixel[0] as f32 - 127.5) / 128.0;
            let g = (pixel[1] as f32 - 127.5) / 128.0;
            let b = (pixel[2] as f32 - 127.5) / 128.0;
            
            // InsightFace models often expect BGR format
            input_tensor[[0, 0, y as usize, x as usize]] = b; // B
            input_tensor[[0, 1, y as usize, x as usize]] = g; // G
            input_tensor[[0, 2, y as usize, x as usize]] = r; // R
        }

        // 2. Inference
        // Note: We'll implement inference and parsing the raw output tensors next.
        // For now, we return a mock to prove compilation.
        
        // Placeholder return
        Ok(vec![])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inspect_onnx_model() {
        let session = ort::session::Session::builder()
            .unwrap()
            .commit_from_file("../../models/buffalo_l/det_10g.onnx")
            .unwrap();
        
        println!("=== ONNX INPUTS ===");
        for input in session.inputs().iter() {
            println!("Name: {}", input.name().unwrap_or_default());
        }
        
        println!("=== ONNX OUTPUTS ===");
        for output in session.outputs().iter() {
            println!("Name: {}", output.name().unwrap_or_default());
        }
    }
}
