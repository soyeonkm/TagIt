# Database Setup Guide for TagIt

This guide helps you choose the right SQL setup script for your TagIt database.

## 🚀 **Choose Your Setup Script**

### **For NEW Installations (Fresh Database)**

Use: **`complete_database_setup.sql`**

- Creates all tables from scratch
- Sets up complete schema with all features
- Includes RLS policies and indexes
- Best for new projects

### **For EXISTING Databases (Migration)**

Use: **`safe_database_setup.sql`**

- Safely adds missing columns and tables
- Checks for existing objects before creating
- Won't overwrite existing data
- Best for production databases

### **For Step-by-Step Setup**

Use: **`simple_database_setup.sql`**

- Breaks down setup into individual steps
- Good for learning or troubleshooting
- Alternative to complete setup

## 📋 **What Each Script Creates**

All scripts create these tables:

- **`projects`** - User projects and roster configuration
- **`players`** - Team roster information (names, numbers, positions)
- **`photos`** - Photo metadata and tagging results
- **`profiles`** - User profile information

## 🔧 **Quick Start**

1. **New Installation**: Run `complete_database_setup.sql`
2. **Existing Database**: Run `safe_database_setup.sql`
3. **Verify Setup**: Check that all tables exist with correct columns

## 📁 **File Structure**

```
TagIt/
├── complete_database_setup.sql    # New installations
├── safe_database_setup.sql        # Existing databases
├── simple_database_setup.sql      # Step-by-step setup
└── DATABASE_SETUP_README.md       # This guide
```

## ⚠️ **Important Notes**

- **Backup First**: Always backup your database before running migrations
- **Test Environment**: Test scripts in development before production
- **Permissions**: Ensure your Supabase user has necessary permissions
- **RLS Policies**: All tables have Row Level Security enabled

## 🆘 **Need Help?**

If you encounter errors:

1. Check the error message for specific details
2. Verify your database permissions
3. Ensure you're running the right script for your situation
4. Check the Supabase logs for additional information
