# Authentication and Storage Integration

The TimeTrackerPro app now supports both authenticated and unauthenticated usage:

## 🔐 Authentication Features

### **Authenticated Users (Supabase)**

- Data synced across devices
- Cloud backup and restore
- Secure user accounts
- Automatic data migration from localStorage

### **Unauthenticated Users (Local Storage)**

- Works completely offline
- No account required
- Data stored locally in browser
- Full app functionality available

## 🚀 Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and add your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Database Setup

Run the SQL commands in `supabase/schema.sql` in your Supabase dashboard to create the required tables.

### 3. Run the App

```bash
npm install
npm run dev
```

## 📱 How It Works

### **Without Supabase Configuration**

- App automatically uses localStorage
- All features work normally
- No authentication required
- Data stays on device

### **With Supabase Configuration**

- Users can choose to sign in or continue without account
- Authenticated users get cloud sync
- Unauthenticated users still use localStorage
- Seamless migration when signing in

## 🔄 Data Migration

When a user signs in for the first time, their existing localStorage data is automatically migrated to Supabase, ensuring no data loss.

## 🛠️ Technical Implementation

### **Data Service Abstraction**

- `LocalStorageService`: Handles browser storage
- `SupabaseService`: Handles cloud storage
- Automatic service selection based on auth status

### **Authentication Context**

- Manages user authentication state
- Provides sign in/up/out functions
- Handles session management

### **Components**

- `UserMenu`: Shows auth status and options
- `AuthDialog`: Sign in/up modal
- Seamless integration with existing UI

## 🔒 Security

- Environment variables keep credentials secure
- Row Level Security (RLS) in Supabase
- User data isolation
- No sensitive data in client code

## 📊 Data Storage

### **Current Day Data**

- Active tasks with full metadata (title, description, project, client, category)
- Day start/end times
- Current task information
- Real-time duration tracking

### **Archived Days**

- Completed day records with task details
- Individual task records in relational format
- Searchable by project, client, category, date ranges

### **Projects & Categories**

- User-defined projects with hourly rates
- Custom categories with colors
- Proper relational storage for advanced filtering

## 🔧 Development

The app uses a factory pattern to create the appropriate data service:

```typescript
const dataService = createDataService(isAuthenticated);
```

This ensures that the same interface is used regardless of storage backend, making the code maintainable and testable.
