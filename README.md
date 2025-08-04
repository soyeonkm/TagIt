# TagIt

A modern desktop application for project management and organization, built with React, Tauri, and Supabase.

## 🚀 Features

- **User Authentication**: Secure login/signup with password reset functionality
- **Project Management**: Create, view, and manage projects
- **Dashboard**: Clean, intuitive interface for project overview
- **Cross-Platform**: Desktop application that works on Windows, macOS, and Linux
- **Real-time Database**: Cloud-based data storage with Supabase
- **Modern UI**: Beautiful, responsive interface built with React

## 🛠️ Tech Stack

### Frontend

- **React 18** - Modern UI library for building user interfaces
- **Vite** - Fast build tool and development server
- **React Router DOM** - Client-side routing
- **CSS-in-JS** - Styled components with CSS variables

### Backend & Database

- **Tauri** - Cross-platform desktop application framework
- **Rust** - High-performance backend for desktop functionality
- **Supabase** - Open-source Firebase alternative
  - PostgreSQL database
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Authentication system

### Development Tools

- **Node.js** - JavaScript runtime
- **npm** - Package manager
- **Cargo** - Rust package manager
- **Git** - Version control

## 📁 Project Structure

```
TagIt/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Project.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── supabaseClient.js # Supabase configuration
│   │   └── main.jsx        # Application entry point
│   ├── dist/               # Production build output
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
├── backend/
│   └── TagIt/             # Tauri desktop application
│       ├── src-tauri/     # Rust backend
│       │   ├── src/       # Rust source code
│       │   ├── tauri.conf.json # Tauri configuration
│       │   └── Cargo.toml # Rust dependencies
│       └── package.json   # Tauri CLI dependencies
├── projects_table.sql      # Database schema
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Rust (latest stable)
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd TagIt
   ```

2. **Install frontend dependencies**

   ```bash
   cd frontend
   npm install
   ```

3. **Set up Supabase**

   - Create a new Supabase project
   - Run the SQL from `projects_table.sql` in your Supabase SQL editor
   - Update `frontend/src/supabaseClient.js` with your project credentials

4. **Install backend dependencies**
   ```bash
   cd backend/TagIt
   npm install
   ```

### Development

#### Frontend Only (Web Development)

```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:5173`

#### Full Desktop Application

```bash
cd backend/TagIt
npm run tauri dev
```

This launches the desktop application with both frontend and backend.

### Building for Production

#### Frontend Build

```bash
cd frontend
npm run build
```

#### Desktop Application

```bash
cd backend/TagIt
npm run tauri build
```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Enable Row Level Security (RLS)
3. Run the database schema from `projects_table.sql`
4. Configure authentication providers
5. Update the Supabase client configuration

### Tauri Configuration

The Tauri configuration is located at `backend/TagIt/src-tauri/tauri.conf.json` and includes:

- Frontend build paths
- Development commands
- Application metadata
- Security policies

## 🗄️ Database Schema

The application uses the following Supabase tables:

### `profiles` table

- User profile information
- First name, last name
- Profile color preferences

### `projects` table

- Project management data
- User-specific projects
- Project metadata (name, description, image)

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Password Reset**: Secure email-based password reset flow
- **Authentication**: Supabase Auth with email/password
- **CORS Protection**: Configured for secure API access

## 🎨 UI/UX Features

- **Responsive Design**: Works on different screen sizes
- **Modern Interface**: Clean, intuitive user experience
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages
- **Form Validation**: Client-side and server-side validation

## 🚀 Deployment

### Web Deployment

- Build the frontend: `npm run build`
- Deploy the `dist` folder to your hosting provider
- Configure environment variables for Supabase

### Desktop Distribution

- Build the Tauri app: `npm run tauri build`
- Distribute the generated executable files
- Available for Windows, macOS, and Linux

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

- Check the documentation
- Open an issue on GitHub
- Contact the development team

---

**TagIt** - Organize your projects with style and efficiency! 🎯
