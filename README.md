# TimeTracker Pro

[![Run Tests](https://github.com/adamjolicoeur/TimeTrackerPro/actions/workflows/test.yml/badge.svg)](https://github.com/adamjolicoeur/TimeTrackerPro/actions/workflows/test.yml)

A modern, feature-rich Progressive Web App (PWA) for time tracking built with React, TypeScript, and Tailwind CSS. Installable on desktop and mobile devices with full offline support. Perfect for freelancers, consultants, and professionals who need to track time, manage projects, and generate invoices.

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

## 📑 Table of Contents

- [Progressive Web App Features](#-progressive-web-app-features)
- [Authentication & Data Storage](#-authentication--data-storage)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation as PWA](#-installation-as-pwa)
- [Usage Guide](#-usage-guide)
- [Technical Details](#-technical-details)
- [Perfect For](#-perfect-for)
- [Development](#-development)
- [Documentation](#-documentation)
- [License](#-license)

## 📱 Progressive Web App Features

**TimeTracker Pro is a fully-featured Progressive Web App!**

### Install Like a Native App
- ✅ **Desktop Installation**: Install from Chrome, Edge, or Firefox on Windows, Mac, and Linux
- ✅ **Mobile Installation**: Add to home screen on iOS (Safari) and Android (Chrome)
- ✅ **Standalone Mode**: Launches in its own window without browser UI
- ✅ **App Icon**: Professional app icon on your device
- ✅ **Splash Screen**: Native-like launch experience

### Work Offline
- ✅ **Full Offline Support**: Continue tracking time without internet connection
- ✅ **Service Worker**: Intelligent caching for instant loading
- ✅ **Offline Queue**: Actions sync automatically when connection restored
- ✅ **Smart Caching**: Static assets cached for blazing-fast performance
- ✅ **Background Sync**: Data syncs even when app is closed

### Mobile-Optimized
- ✅ **Touch-Friendly**: 44×44px minimum touch targets
- ✅ **Bottom Navigation**: Easy thumb access on mobile devices
- ✅ **Safe Areas**: Proper spacing for notched devices (iPhone X+)
- ✅ **Responsive Design**: Adapts to any screen size
- ✅ **Landscape Support**: Optimized for both orientations

### Smart Updates
- ✅ **Auto-Update**: New versions install automatically
- ✅ **Update Notifications**: Prompts to refresh when updates available
- ✅ **Install Prompts**: Smart timing for installation suggestions
- ✅ **Version Management**: Seamless updates without data loss

## 🔐 Authentication & Data Storage

**NEW**: TimeTracker Pro now supports both authenticated and guest usage!

- **🔄 Cloud Sync**: Sign in with Supabase to sync data across devices
- **💾 Local Storage**: Use without an account - data stays on your device
- **🔄 Data Migration**: Existing data automatically migrates when you sign in
- **⚡ Offline-First**: Full functionality available with or without internet
- **🎯 Manual Sync**: Optimized for single-device usage with on-demand syncing

See [AUTHENTICATION.md](docs/AUTHENTICATION.md) for detailed setup instructions.

## ✨ Features

### Core Time Tracking

- **Start/Stop Day Tracking**: Begin and end your work day with clear boundaries
- **Task Management**: Create, edit, and delete tasks with real-time duration tracking
- **Project & Client Organization**: Assign tasks to specific projects and clients
- **Category Management**: Organize tasks with billable/non-billable categories
- **Persistent Data**: Data saved to localStorage (guest) or Supabase (authenticated)

### Advanced Features

- **Archive System**: Complete days are archived with full task details and history
- **Category System**: Flexible categorization with billable/non-billable flags
- **Export Capabilities**: Export data as CSV or JSON for external use
- **Invoice Generation**: Generate invoice data for specific clients and date ranges
- **Project Management**: Create projects with hourly rates and client assignments
- **Print Support**: Print-friendly archive views for physical records

### Professional Tools

- **Revenue Tracking**: Automatic calculation of earnings based on hourly rates
- **Billable Hours Tracking**: Separate billable and non-billable time
- **Time Analytics**: View total hours and revenue across all projects
- **Data Export**: Multiple export formats for integration with accounting software
- **CSV Import**: Import existing time data from compatible CSV files
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/AdamJ/TimeTrackerPro.git

# Navigate to project directory
cd TimeTrackerPro

# Install dependencies
npm install

# 🔒 OPTIONAL: Setup environment variables for cloud sync
cp .env.example .env
# Edit .env with your Supabase credentials (see .env.example for instructions)

# Start development server
npm run dev
```

The application will be available at **http://localhost:8080**

## 📲 Installation as PWA

### Desktop Installation (Chrome/Edge)

1. Open the app in your browser
2. Look for the install icon (⊕) in the address bar
3. Click "Install" when prompted
4. The app will open in its own window
5. Find it in your applications/start menu

### Mobile Installation (iOS)

1. Open the app in Safari
2. Tap the Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. Find the app icon on your home screen

### Mobile Installation (Android)

1. Open the app in Chrome
2. Tap the menu (⋮) in the top-right
3. Tap "Install app" or "Add to Home screen"
4. Follow the prompts
5. Find the app icon in your app drawer

### First Time Setup

1. **🔒 Environment Setup** (Optional - for cloud sync):
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key (see `.env.example` for detailed instructions)
   - **⚠️ Never commit .env to version control!**

2. **Start Your First Day**: Click "Start Day" to begin time tracking

3. **Authentication** (Optional): Click "Sign In" in the top-right corner to enable cloud sync

4. **Add Projects** (Optional): Navigate to Archive → Projects to set up your clients and hourly rates

5. **Configure Categories** (Optional): Navigate to Categories page to customize task categories

6. **Create Tasks**: Use "New Task" to start tracking specific work items

7. **End Your Day**: Click "End Day" when finished, then "Post Time to Archive"

## 📱 Usage Guide

### Daily Workflow

1. **Morning**: Click "Start Day" to begin tracking
2. **Throughout the day**: Create new tasks as you switch between different work items
3. **Evening**: Click "End Day" to stop tracking and review your summary
4. **Archive**: Click "Post Time to Archive" to save the day permanently

### Project Management

- Access via Archive → Projects button
- Set up clients with hourly rates for automatic revenue calculation
- Assign projects to tasks for better organization
- Mark projects as billable or non-billable

### Category Management

- Access via the Categories navigation menu
- Create custom categories for organizing tasks
- Set categories as billable or non-billable
- Customize category colors for visual organization

### Data Export

- Access via Archive → Export button
- Choose from CSV, JSON, or Invoice formats
- Filter by date range for specific periods
- Perfect for submitting timesheets to employers or generating client invoices

### Data Import

- Import existing time data from CSV files
- Use the CSV templates in `tests/` directory as examples
- Validate data before import to ensure compatibility
- Available test scripts: `npm run test-csv-import`

## 🛠 Technical Details

### Built With

- **React 18** - Modern UI framework with TypeScript
- **TypeScript 5.8** - Type safety and enhanced developer experience
- **Vite 5** - Lightning-fast build tool with SWC
- **Vite PWA Plugin** - Service worker and PWA manifest generation
- **Workbox** - Advanced service worker caching strategies
- **Tailwind CSS 3** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **Radix UI** - Unstyled, accessible component primitives
- **React Router 6** - Client-side routing and navigation
- **Supabase** (optional) - Backend as a Service for cloud sync and authentication
- **Local Storage** - Browser storage for offline data persistence
- **Playwright** - Automated screenshot generation and testing

### Architecture

- **Context API** - Global state management
- **Custom hooks** - Reusable stateful logic
- **Service layer pattern** - Data persistence abstraction (localStorage/Supabase)
- **PWA Components** - Install prompts, update notifications, offline queue
- **Service Worker** - Workbox-powered caching and offline support
- **Component-based** architecture for maintainability
- **Lazy loading** - Code splitting for optimal performance
- **Responsive design** - Works on all device sizes
- **Mobile-first** - Touch-optimized with bottom navigation

### Data Storage

- **Default**: All data stored locally in your browser (localStorage)
- **Optional**: Cloud storage via [Supabase](https://www.supabase.com) project
- **Manual sync**: Optimized for single-device usage
  - Data saves on critical events (day end, window close)
  - Manual sync button available for on-demand saves
  - Prevents unnecessary database calls
- **No external servers required** - Works completely offline
- **Data persistence** - All data persists between sessions
- **Export capabilities** - Full backup and integration support
- **Smart migration** - Automatic data migration between localStorage and Supabase

## 🎯 Perfect For

- **Freelancers**: Track billable hours and generate client invoices
- **Consultants**: Organize time by project and client with revenue tracking
- **Remote Workers**: Submit detailed timesheets to employers
- **Students**: Track study time and project work efficiently
- **Small Businesses**: Monitor team time and project profitability
- **Anyone**: Who needs professional time tracking without the complexity

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server (http://localhost:8080)
- `npm run build` - Build for production
- `npm run build:dev` - Build with development mode
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality
- `npm run test` - Run Vitest unit tests

### PWA Screenshot Scripts

- `npm run screenshots:install` - Install Playwright browsers (first time only)
- `npm run screenshots` - Capture PWA screenshots (headless mode)
- `npm run screenshots:headed` - Capture screenshots with visible browser (debugging)

**Usage:**
1. Run `npm run screenshots:install` once to install browsers
2. Start dev server: `npm run dev` (keep running)
3. In new terminal: `npm run screenshots`
4. Screenshots saved to `public/screenshots/`

See [tests/SCREENSHOTS_README.md](tests/SCREENSHOTS_README.md) for detailed documentation.

### Testing Scripts

- `npm run test-full-import` - Test full CSV import functionality
- `npm run test-error-handling` - Test CSV import error handling
- `npm run test-csv-import` - Test standard CSV import process

### Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui base components (49 files)
│   ├── InstallPrompt.tsx      # PWA install prompt
│   ├── UpdateNotification.tsx # PWA update notification
│   ├── MobileNav.tsx          # Mobile bottom navigation
│   └── ...                    # Other feature components
├── config/            # Category and Project configuration files
├── contexts/          # React Context providers
│   ├── AuthContext.tsx        # Authentication state
│   ├── TimeTrackingContext.tsx # Time tracking state
│   └── OfflineContext.tsx     # Offline queue management
├── hooks/             # Custom React hooks
│   ├── useAuth.tsx            # Authentication hook
│   ├── useTimeTracking.tsx    # Time tracking hook
│   └── useOffline.tsx         # Offline state hook
├── lib/               # Utility libraries and helpers
├── pages/             # Main application pages
├── services/          # Data service layer (localStorage/Supabase)
└── utils/             # Utility functions
public/
├── icons/             # PWA app icons (8 sizes)
├── screenshots/       # PWA screenshots (desktop + mobile)
├── manifest.json      # PWA manifest
├── pwa.css           # PWA-specific styles
└── ...               # Other static assets
tests/
├── screenshots.spec.ts        # Playwright screenshot automation
└── SCREENSHOTS_README.md      # Screenshot documentation
```

### Code Conventions

- **Indentation**: Tabs (2 space width)
- **Quotes**: Double quotes (`""`) always
- **Imports**: Use `@/` alias for src imports
- **Components**: PascalCase naming
- **Hooks**: camelCase with `use` prefix
- **Styling**: Follow Radix UI design system

See [CLAUDE.md](CLAUDE.md) for comprehensive development guidelines.

## 📚 Documentation

### For Developers

- [**CLAUDE.md**](CLAUDE.md) - Comprehensive AI assistant codebase guide
- [**AGENTS.md**](AGENTS.md) - General agent instructions and workflows
  - [Styles](agents/styles.md) - UI/UX style guidelines and rules
  - [Pull Requests](agents/pull_requests.md) - PR creation and review rules
- [Project Rules](.continue/rules/project-rules.md) - Continue extension configuration

### Technical Documentation

- [**Authentication**](docs/AUTHENTICATION.md) - Authentication setup and configuration guide
- [**Data Persistence**](docs/AUTH_DATA_PERSISTENCE_FIX.md) - Data persistence implementation details
- [**Schema Compatibility**](docs/SCHEMA_COMPATIBILITY.md) - Database schema updates and history
- [**Migration**](docs/MIGRATION.md) - Supabase data migration guide
- [**Security**](docs/SECURITY.md) - Security configuration and best practices

### Testing & Data

- [**CSV Templates**](docs/CSV_TEMPLATES_README.md) - CSV import/export templates and examples
- [**Screenshot Generation**](tests/SCREENSHOTS_README.md) - Automated PWA screenshot capture with Playwright
- [**Features**](docs/FEATURES.md) - Feature requests and improvement notes
- [**Chatbot Notes**](docs/chatbot.md) - AI interaction development records

### Additional Resources

- [LOVABLE README](info/README-LOVABLE.md) - Project origin and history

## 📄 License

This project is open source and available under the MIT License.

---

## 🚀 Getting Started

**Ready to take control of your time?**

1. Clone the repository
2. Run `npm install`
3. Start with `npm run dev`
4. Open http://localhost:8080
5. Click "Start Day" and begin tracking!

See where your hours really go with TimeTracker Pro.

---

## 🙏 Credits

- This project originally began as a Lovable prompt - [Learn more](info/README-LOVABLE.md)
- Badges from [markdown-badges](https://github.com/Ileriayo/markdown-badges)
- Built with [React](https://react.dev), [Vite](https://vitejs.dev), and [Supabase](https://supabase.com)
