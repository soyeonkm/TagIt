//! Minimal XMP sidecar editing.
//!
//! String-based on purpose: only the properties we set are touched, so everything else in the
//! sidecar (Lightroom / Capture One develop settings, etc.) stays byte-for-byte intact.
//! A DOM round-trip would reformat the whole file.

use std::fs;
use std::path::{Path, PathBuf};

const NEW_SIDECAR: &str = "<?xpacket begin=\"\u{feff}\" id=\"W5M0MpCehiHzreSzNTczkc9d\"?>
<x:xmpmeta xmlns:x=\"adobe:ns:meta/\">
 <rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">
  <rdf:Description rdf:about=\"\"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end=\"w\"?>
";

const NAMESPACES: &[(&str, &str)] = &[
    ("dc", "http://purl.org/dc/elements/1.1/"),
    ("xmp", "http://ns.adobe.com/xap/1.0/"),
];

/// How a property's value is structured.
#[derive(Clone, Copy)]
pub enum Kind {
    /// Plain text (xmp:Rating, xmp:Label)
    Simple,
    /// Language alternative (dc:title, dc:description, dc:rights)
    Alt,
    /// Ordered list (dc:creator)
    Seq,
    /// Unordered list (dc:subject)
    Bag,
}

/// Adobe convention: IMG_0001.CR2 -> IMG_0001.xmp
pub fn sidecar_path(photo: &Path) -> PathBuf {
    photo.with_extension("xmp")
}

/// Existing sidecar contents, or a new empty XMP packet.
pub fn read_or_new(path: &Path) -> Result<String, String> {
    match fs::read_to_string(path) {
        Ok(s) => Ok(s),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(NEW_SIDECAR.to_string()),
        Err(e) => Err(format!("Failed to read {}: {}", path.display(), e)),
    }
}

/// Write via temp file + rename so a crash mid-write can't leave a truncated sidecar.
pub fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let tmp = path.with_extension("xmp.tagit-tmp");
    fs::write(&tmp, content)
        .and_then(|_| fs::rename(&tmp, path))
        .map_err(|e| format!("Failed to write {}: {}", path.display(), e))
}

/// Append `text` to the photo's description, creating the sidecar if needed.
/// Returns false (and writes nothing) if the description already contains `text`.
pub fn append_description_file(xmp_path: &Path, text: &str) -> Result<bool, String> {
    let xml = read_or_new(xmp_path)?;
    match append_description(&xml, text)? {
        Some(updated) => write_atomic(xmp_path, &updated).map(|_| true),
        None => Ok(false),
    }
}

fn append_description(xml: &str, text: &str) -> Result<Option<String>, String> {
    let existing = get(xml, "dc:description").into_iter().next().unwrap_or_default();
    if existing.contains(text) {
        return Ok(None);
    }
    let combined = if existing.trim().is_empty() {
        text.to_string()
    } else {
        format!("{}\n{}", existing, text)
    };
    set(xml, "dc:description", Kind::Alt, &[combined]).map(Some)
}

/// A property's values: the rdf:li items of an array, or its plain text / attribute value.
/// For language alternatives the first item is x-default.
pub fn get(xml: &str, name: &str) -> Vec<String> {
    if let Some(el) = find_element(xml, name) {
        let Some((a, b)) = el.inner else { return Vec::new() };
        let inner = &xml[a..b];
        if inner.contains('<') {
            return li_values(inner);
        }
        let text = inner.trim();
        return if text.is_empty() { Vec::new() } else { vec![unescape(text)] };
    }
    find_attribute(xml, name)
        .map(|attr| vec![unescape(&xml[attr.value.0..attr.value.1])])
        .unwrap_or_default()
}

/// Replace a property, whether it's currently stored as an element or an attribute.
/// Empty `values` removes it. (A multi-language Alt is replaced by a single x-default value.)
pub fn set(xml: &str, name: &str, kind: Kind, values: &[String]) -> Result<String, String> {
    let mut xml = xml.to_string();
    while let Some(el) = find_element(&xml, name) {
        xml.replace_range(el.start..el.end, "");
    }
    while let Some(attr) = find_attribute(&xml, name) {
        xml.replace_range(attr.start..attr.end, "");
    }

    let values: Vec<&String> = values.iter().filter(|v| !v.trim().is_empty()).collect();
    if values.is_empty() {
        return Ok(xml);
    }

    let no_description = || "XMP file has no rdf:Description".to_string();
    let prefix = name.split(':').next().unwrap_or_default();
    let (_, tag_end) = find_start_tag(&xml, "rdf:Description", 0).ok_or_else(no_description)?;
    // Ancestors of the first rdf:Description all start before its tag ends
    if !xml[..tag_end].contains(&format!("xmlns:{}=", prefix)) {
        let uri = NAMESPACES.iter().find(|(p, _)| *p == prefix).map(|(_, u)| *u)
            .ok_or_else(|| format!("Unknown XMP namespace: {}", prefix))?;
        let insert_at = tag_end - if xml[..tag_end].ends_with("/>") { 2 } else { 1 };
        xml.insert_str(insert_at, &format!(" xmlns:{}=\"{}\"", prefix, uri));
    }

    let list = |container: &str| {
        let items: String = values.iter().map(|v| format!("<rdf:li>{}</rdf:li>", escape(v))).collect();
        format!("<{0}>{1}</{0}>", container, items)
    };
    let body = match kind {
        Kind::Simple => escape(values[0]),
        Kind::Alt => format!("<rdf:Alt><rdf:li xml:lang=\"x-default\">{}</rdf:li></rdf:Alt>", escape(values[0])),
        Kind::Seq => list("rdf:Seq"),
        Kind::Bag => list("rdf:Bag"),
    };
    let element = format!("<{0}>{1}</{0}>", name, body);

    let (_, tag_end) = find_start_tag(&xml, "rdf:Description", 0).ok_or_else(no_description)?;
    if xml[..tag_end].ends_with("/>") {
        xml.replace_range(tag_end - 2..tag_end, &format!(">\n   {}\n  </rdf:Description>", element));
    } else {
        xml.insert_str(tag_end, &format!("\n   {}", element));
    }
    Ok(xml)
}

// ─── Scanning helpers ────────────────────────────────────────────────────────

/// (start, end) of the start tag `<name ...>` or `<name .../>` at or after `from`.
fn find_start_tag(xml: &str, name: &str, from: usize) -> Option<(usize, usize)> {
    let needle = format!("<{}", name);
    let bytes = xml.as_bytes();
    let mut pos = from;
    while let Some(off) = xml[pos..].find(&needle) {
        let start = pos + off;
        let after = start + needle.len();
        pos = after;
        match bytes.get(after) {
            Some(b'>') | Some(b'/') => {}
            Some(c) if c.is_ascii_whitespace() => {}
            _ => continue, // e.g. <dc:descriptionX
        }
        let mut quote = None;
        for (i, &c) in bytes[after..].iter().enumerate() {
            match (quote, c) {
                (None, b'"') | (None, b'\'') => quote = Some(c),
                (Some(q), c) if c == q => quote = None,
                (None, b'>') => return Some((start, after + i + 1)),
                _ => {}
            }
        }
        return None;
    }
    None
}

struct Element {
    start: usize,
    end: usize,
    inner: Option<(usize, usize)>,
}

fn find_element(xml: &str, name: &str) -> Option<Element> {
    let (start, tag_end) = find_start_tag(xml, name, 0)?;
    if xml[..tag_end].ends_with("/>") {
        return Some(Element { start, end: tag_end, inner: None });
    }
    let close = format!("</{}>", name);
    let close_start = tag_end + xml[tag_end..].find(&close)?;
    Some(Element { start, end: close_start + close.len(), inner: Some((tag_end, close_start)) })
}

struct Attribute {
    /// Includes the leading whitespace, so removing start..end leaves the tag tidy
    start: usize,
    end: usize,
    value: (usize, usize),
}

/// `name="value"` on any rdf:Description start tag.
fn find_attribute(xml: &str, name: &str) -> Option<Attribute> {
    let mut from = 0;
    while let Some((tag_start, tag_end)) = find_start_tag(xml, "rdf:Description", from) {
        let tag = &xml[tag_start..tag_end];
        let b = tag.as_bytes();
        let mut pos = 0;
        while let Some(off) = tag[pos..].find(name) {
            let s = pos + off;
            pos = s + name.len();
            if s == 0 || !b[s - 1].is_ascii_whitespace() {
                continue;
            }
            let mut p = pos;
            while b.get(p).map_or(false, |c| c.is_ascii_whitespace()) { p += 1; }
            if b.get(p) != Some(&b'=') {
                continue;
            }
            p += 1;
            while b.get(p).map_or(false, |c| c.is_ascii_whitespace()) { p += 1; }
            let quote = match b.get(p) {
                Some(&q) if q == b'"' || q == b'\'' => q as char,
                _ => continue,
            };
            let Some(len) = tag[p + 1..].find(quote) else { continue };
            let mut ws = s;
            while ws > 0 && b[ws - 1].is_ascii_whitespace() { ws -= 1; }
            return Some(Attribute {
                start: tag_start + ws,
                end: tag_start + p + 1 + len + 1,
                value: (tag_start + p + 1, tag_start + p + 1 + len),
            });
        }
        from = tag_end;
    }
    None
}

fn li_values(inner: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut from = 0;
    while let Some((_, tag_end)) = find_start_tag(inner, "rdf:li", from) {
        from = tag_end;
        if inner[..tag_end].ends_with("/>") {
            continue;
        }
        let Some(len) = inner[tag_end..].find("</rdf:li>") else { break };
        out.push(unescape(&inner[tag_end..tag_end + len]));
        from = tag_end + len;
    }
    out
}

fn escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

fn unescape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(i) = rest.find('&') {
        out.push_str(&rest[..i]);
        rest = &rest[i..];
        let decoded = rest.find(';').and_then(|end| {
            let entity = &rest[1..end];
            let c = match entity {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" => Some('\''),
                _ => entity.strip_prefix("#x").or_else(|| entity.strip_prefix("#X"))
                    .map(|h| u32::from_str_radix(h, 16).ok())
                    .or_else(|| entity.strip_prefix('#').map(|d| d.parse().ok()))
                    .flatten()
                    .and_then(char::from_u32),
            };
            c.map(|c| (c, end))
        });
        match decoded {
            Some((c, end)) => {
                out.push(c);
                rest = &rest[end + 1..];
            }
            None => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const LIGHTROOM: &str = r#"<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmp:Rating="3"
   crs:Exposure2012="+0.35">
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">Senior night &amp; warmups</rdf:li>
    </rdf:Alt>
   </dc:description>
   <crs:ToneCurvePV2012>
    <rdf:Seq><rdf:li>0, 0</rdf:li></rdf:Seq>
   </crs:ToneCurvePV2012>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>"#;

    #[test]
    fn appends_to_existing_description_and_preserves_everything_else() {
        let out = append_description(LIGHTROOM, "Players: A (#1)").unwrap().unwrap();
        assert_eq!(get(&out, "dc:description"), vec!["Senior night & warmups\nPlayers: A (#1)"]);
        assert!(out.contains(r#"crs:Exposure2012="+0.35""#));
        assert!(out.contains("<rdf:Seq><rdf:li>0, 0</rdf:li></rdf:Seq>"));
        assert_eq!(get(&out, "xmp:Rating"), vec!["3"]);
        // Re-running is a no-op
        assert!(append_description(&out, "Players: A (#1)").unwrap().is_none());
    }

    #[test]
    fn creates_description_in_new_sidecar() {
        let out = append_description(NEW_SIDECAR, "Players: O'Neil & Co (#00)").unwrap().unwrap();
        assert!(out.contains(r#"xmlns:dc="http://purl.org/dc/elements/1.1/""#));
        assert!(out.contains("</rdf:Description>"));
        assert_eq!(get(&out, "dc:description"), vec!["Players: O'Neil & Co (#00)"]);
    }

    #[test]
    fn handles_plain_description_and_attribute_properties() {
        let old = "<x:xmpmeta><rdf:RDF><rdf:Description xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n<dc:description>old</dc:description>\n</rdf:Description></rdf:RDF></x:xmpmeta>";
        let out = append_description(old, "new").unwrap().unwrap();
        assert_eq!(get(&out, "dc:description"), vec!["old\nnew"]);
        assert!(!out.contains("<dc:description>old"));

        let out = set(LIGHTROOM, "xmp:Rating", Kind::Simple, &["5".into()]).unwrap();
        assert_eq!(get(&out, "xmp:Rating"), vec!["5"]);
        assert!(!out.contains(r#"xmp:Rating="3""#));

        let out = set(&out, "dc:subject", Kind::Bag, &["a".into(), "b".into()]).unwrap();
        assert_eq!(get(&out, "dc:subject"), vec!["a", "b"]);
        assert_eq!(unescape("x&#xA;y &bogus z"), "x\ny &bogus z");
    }
}
