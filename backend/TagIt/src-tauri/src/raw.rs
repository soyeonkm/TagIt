//! RAW photo helpers.

use std::path::Path;

const RAW_EXTENSIONS: &[&str] = &[
    "3fr", "arw", "cr2", "cr3", "dcr", "dng", "erf", "iiq", "kdc", "mos", "nef", "nrw",
    "orf", "pef", "raf", "raw", "rw2", "rwl", "sr2", "srf", "srw", "x3f",
];

pub fn is_raw(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map_or(false, |e| RAW_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
}

/// Decode the camera's JPEG preview embedded in a RAW file.
// ponytail: preview size depends on the camera (full-res on most Canon/Nikon, ~1600px on some Sony/Fuji)
// and EXIF orientation is ignored; decode the sensor data with libraw if that proves too limiting.
pub fn preview_image(path: &Path) -> Result<image::DynamicImage, String> {
    let data = std::fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
    let jpeg = extract_preview_jpeg(&data).ok_or("No embedded JPEG preview found in RAW file")?;
    image::load_from_memory(jpeg).map_err(|e| format!("Failed to decode RAW preview: {}", e))
}

/// The largest well-formed JPEG embedded anywhere in `data`.
/// Nearly every RAW format (CR2/CR3/NEF/ARW/DNG/ORF/RAF/RW2...) stores at least one.
fn extract_preview_jpeg(data: &[u8]) -> Option<&[u8]> {
    let mut best: Option<&[u8]> = None;
    let mut i = 0;
    while let Some(off) = data[i..].windows(3).position(|w| w == [0xFF, 0xD8, 0xFF]) {
        let start = i + off;
        match jpeg_len(&data[start..]) {
            Some(len) => {
                if best.map_or(true, |b| len > b.len()) {
                    best = Some(&data[start..start + len]);
                }
                i = start + len;
            }
            None => i = start + 2,
        }
    }
    best
}

/// Length of the JPEG starting at `data[0]` (SOI), found by walking its segments so that
/// thumbnails nested inside EXIF segments don't end it early. None if malformed/truncated.
fn jpeg_len(data: &[u8]) -> Option<usize> {
    let mut p = 2;
    loop {
        if p + 1 >= data.len() || data[p] != 0xFF {
            return None;
        }
        let marker = data[p + 1];
        match marker {
            0xFF => p += 1,                           // fill byte
            0xD9 => return Some(p + 2),               // EOI
            0x01 | 0xD0..=0xD7 => p += 2,             // markers without a length
            _ => {
                if p + 3 >= data.len() {
                    return None;
                }
                let seg_len = u16::from_be_bytes([data[p + 2], data[p + 3]]) as usize;
                if seg_len < 2 {
                    return None;
                }
                p += 2 + seg_len;
                if marker == 0xDA {
                    // Entropy-coded scan data: runs until an FF that isn't stuffing (FF00) or a restart marker.
                    loop {
                        if p + 1 >= data.len() {
                            return None;
                        }
                        let next = data[p + 1];
                        if data[p] == 0xFF && next != 0x00 && !(0xD0..=0xD7).contains(&next) {
                            break;
                        }
                        p += 1;
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tiny_jpeg(w: u32, h: u32) -> Vec<u8> {
        let mut buf = Vec::new();
        image::DynamicImage::new_rgb8(w, h)
            .write_to(&mut std::io::Cursor::new(&mut buf), image::ImageOutputFormat::Jpeg(80))
            .unwrap();
        buf
    }

    #[test]
    fn finds_largest_embedded_jpeg() {
        let small = tiny_jpeg(8, 8);
        let big = tiny_jpeg(64, 48);
        // A JPEG whose APP1 segment contains a nested "thumbnail" with its own SOI/EOI
        let mut nested = vec![0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x06, 0xFF, 0xD8, 0xFF, 0xD9];
        nested.extend_from_slice(&[0xFF, 0xDA, 0x00, 0x02, 0x12, 0xFF, 0x00, 0x34, 0xFF, 0xD9]);

        let mut raw = b"II*\0 sensor junk \xFF\xD8\xFF garbage".to_vec();
        raw.extend_from_slice(&small);
        raw.extend_from_slice(&nested);
        raw.extend_from_slice(b"more junk");
        raw.extend_from_slice(&big);
        raw.extend_from_slice(b"trailer");

        assert_eq!(extract_preview_jpeg(&raw), Some(big.as_slice()));
        assert_eq!(jpeg_len(&nested), Some(nested.len()));
        assert_eq!(extract_preview_jpeg(b"no jpeg here"), None);
        assert!(is_raw(Path::new("/a/IMG_1.CR2")) && !is_raw(Path::new("/a/IMG_1.jpg")));
    }
}
