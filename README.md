# TagIt

Desktop app for sports photographers: upload a team roster PDF, point at a folder of RAW photos, and TagIt reads jersey numbers with Gemini and writes the matching player names into each photo's XMP sidecar.

_Last updated: 2026-11-11 (branch `cv-jersey-detection`)._

## Stack

| Layer | What |
|---|---|
| Shell | Tauri 2 (`backend/TagIt/src-tauri`, Rust) |
| UI | React 18 + Vite + React Router (`frontend/`) |
| Data / auth | Supabase (Postgres + RLS + Auth), called **only from Rust** via REST |
| AI | Google Gemini (roster PDF parsing, jersey number reading) |

The frontend never talks to Supabase or Gemini directly. Every call goes through a Tauri command (`frontend/src/tauriClient.js` → `invoke(...)` → `src-tauri/src/lib.rs`). Opened in a plain browser, the app only shows `TauriRequired`; there is no mock/browser mode.

## Running it (macOS)

Prereqs: Node, Rust (stable), Xcode command-line tools.

1. Create `backend/TagIt/src-tauri/.env` (gitignored):
   ```
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   GEMINI_API_KEY=...
   ```
   The Supabase vars are required (the app panics without them). Without `GEMINI_API_KEY` the app starts, but roster parsing and tagging return an error.
2. Install deps:
   ```bash
   (cd frontend && npm install)
   (cd backend/TagIt && npm install)
   ```
3. Run:
   ```bash
   cd backend/TagIt && npm run tauri dev
   ```
   This starts Vite on port 1420 (`beforeDevCommand`) and opens the desktop window. `npm run tauri build` makes a release build from `frontend/dist`.

Dependencies are built with `opt-level = 3` even in dev, because RAW preview decoding is very slow when unoptimized.

## Database setup

Run `supabase_schema.sql` in the Supabase SQL editor. It's idempotent (`IF NOT EXISTS`) and never drops data, so it's safe on a fresh or an existing database.

### Data model (current)

```
auth.users ─┬─ profiles
            ├─ projects   (folder_path, roster_data = roster id, roster_type = 'file', sport_type)
            └─ rosters    (name, file_name, pdf_hash, sport, season)
                 └─ players (name, jersey_number TEXT)
```

- RLS: every row is scoped to `auth.uid()`. Players are reachable only through a roster you own.
- `UNIQUE (user_id, pdf_hash)`: the same PDF can't be uploaded twice.
- `season` must look like `2026-2027` (two consecutive years; enforced by a CHECK constraint).
- `jersey_number` is TEXT so that `0` and `00` stay distinct.
- Projects link to a roster through the generic `roster_data` column rather than a real foreign key.
- Tag results aren't stored in the database. They live in XMP sidecars only.

## What's implemented

### Auth and profile
Sign up, sign in, password reset and update, profile view and edit (`Login`, `ResetPassword`, `Profile` pages). The Supabase access token is passed into every Tauri command.

### Rosters (`/rosters`)
- Pick a roster PDF. The bytes go to Gemini with a prompt that extracts sport, season and players (name and number).
- You give each roster a name, and it is saved to `rosters`/`players`. Rosters can be listed and deleted.
- Code: `autotagger.rs` (`parse_roster_from_pdf`), `supabase.rs` (roster CRUD), `pages/Rosters.jsx`.

### Projects (`/dashboard`, `/create-project`, `/project/:id`, `/project/:id/edit`)
- Creating a project requires a photo folder and a roster. The name defaults to `<date> <roster name>`.
- The project page lists the photos in the folder, with thumbnails (RAW files via their embedded preview) and a metadata side panel. Edits there write an XMP sidecar next to the photo.

### Auto-tagging (`AutoTagger.jsx` → `process_photo_folder`)
For each **RAW** file at the top level of the project folder (JPEGs and subfolders are skipped):
1. Extract the largest embedded JPEG preview from the RAW file (`raw.rs`; no LibRaw).
2. Downscale it to at most 2048px on the long edge and send it to Gemini along with the team's jersey color.
3. Gemini returns the jersey numbers it sees **on players wearing that color**, each with a 0–100 confidence.
4. Match the numbers against the roster's players, build a description, and append it to `<photo>.xmp` (`xmp.rs`).
5. The UI shows progress events and per-photo results (numbers detected, players matched, errors).

The jersey color is remembered per project in `localStorage` (`jerseyColor:<projectId>`).

### Gemini calls
`call_gemini` tries `gemini-3.6-flash`, then `gemini-3.5-flash`, then `gemini-flash-latest`. A 503 or 404 falls through to the next model. A 400 or an auth error stops immediately.

## Decisions log

Taken from commit history and code comments. Add a **why** to the Notes column when you remember it.

| When | Decision | Notes |
|---|---|---|
| 2025-06 | Vercel config added, then removed (2026-05) | |
| 2025-08 | All Supabase calls go through Rust, not the JS client | |
| 2025-08 | Edited metadata goes to XMP sidecars, not into the RAW file | |
| 2026-05 | Roster input changed from URL scraping/regex to **PDF + Gemini vision** | |
| 2026-05 | Jersey detection changed from local CV (OpenCV/Tesseract/ONNX) to **Gemini vision** | |
| 2026-05 | Players belong to a **roster** (previously a project); rosters belong to a user | |
| 2026-05 | Added sport, school and season dropdowns; seasons use the `YYYY-YYYY` form | |
| 2026-07 | Primary dev platform moved from Windows to macOS | |
| 2026-09 | Roster parsing moved to its own `/rosters` page with user-chosen names | |
| 2026-09 | Tag only players wearing **the team's jersey color** | Keeps opponents with the same number from being tagged |
| 2026-09 | InsightFace (face recognition) removed; RAW previews read from the embedded JPEG instead of LibRaw | |
| 2026-11 | Repo cleanup: one schema file, one README, Windows/LibRaw/vcpkg leftovers deleted | |

## Known gaps and next steps

- **Face-to-player mapping**: removed with InsightFace. There's no fallback when a number isn't visible.
- **Player matching** is exact-number only and needs work (noted 2026-05).
- RAW preview size depends on the camera (some Sony and Fuji previews are about 1600px), and EXIF orientation is ignored. See the `ponytail:` note in `raw.rs`.
- Tag results aren't stored in the database, so re-running tagging appends to the XMP again.
- The profile lookup queries `profiles?id=eq.<user id>`, but rows are keyed by `user_id`. Worth checking.

## Code map

```
backend/TagIt/src-tauri/src/
  lib.rs         Tauri commands (auth, projects, folders, thumbnails, metadata, autotagger)
  supabase.rs    Supabase REST client (auth, profiles, projects, rosters, players)
  autotagger.rs  Gemini calls, roster parsing, folder tagging, player matching
  raw.rs         RAW detection and embedded JPEG preview extraction
  xmp.rs         XMP sidecar read/write
  config.rs      .env loading
  error.rs       AppError
frontend/src/
  tauriClient.js         invoke() wrappers
  contexts/AuthContext   session state
  pages/                 Dashboard, CreateProject, Project, ProjectEdit, Rosters, Login, Profile, ...
  components/AutoTagger  tagging UI
```
