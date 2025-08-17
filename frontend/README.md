# TagIt Frontend

This is the frontend application for TagIt, a photo organization and tagging application.

## Development Mode

The frontend can now run in development mode without requiring the Tauri backend. This allows developers to work on the UI and frontend logic independently.

### Features in Development Mode

- **Mock Authentication**: Sign in/up with any email/password combination
- **Mock Data**: Sample projects and user profiles are provided
- **Full Navigation**: All pages and routes are functional
- **Local Storage**: Data persists in browser localStorage during development

### Running in Development Mode

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Start Development Server**:

   ```bash
   npm run dev
   ```

3. **Access the Application**:
   - Open your browser to `http://localhost:5173` (or the port shown in terminal)
   - You'll see a "DEV" badge in the navbar indicating development mode
   - Sign in with any email/password to access the dashboard

### Development Mode Indicators

- **Navbar**: Shows "DEV" badge next to the TagIt logo
- **Dashboard**: Displays "Development Mode - Using Mock Data" notice
- **Create Project**: Shows development mode indicators and mock folder selection

### Mock Data

The development mode includes:

- Sample projects (Summer Soccer Tournament, Basketball Championship, Track & Field Meet)
- Mock user profiles
- Simulated project creation and management

### Switching to Production Mode

To run with the full Tauri backend:

1. Navigate to the `backend/TagIt` directory
2. Run `npm run tauri dev` to start the full application

### File Structure

- `src/pages/` - Main page components
- `src/components/` - Reusable UI components
- `src/contexts/` - React contexts (including mock data)
- `src/tauriClient.js` - Backend communication layer

### Notes

- All mock data is stored in browser localStorage
- Authentication state persists between page refreshes
- The application automatically detects development vs. production mode
- No backend connection is required for development
