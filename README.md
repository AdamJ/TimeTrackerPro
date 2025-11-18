# TimeTracker Pro

A modern, feature-rich time tracking application built with React, TypeScript, and Tailwind CSS. Perfect for freelancers, consultants, and professionals who need to track time, manage projects, and generate invoices.

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

## 📑 Table of Contents

- [Authentication & Data Storage](#-authentication--data-storage)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [Technical Details](#-technical-details)
- [Perfect For](#-perfect-for)
- [Development](#-development)
- [Documentation](#-documentation)
- [License](#-license)

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
- **Tailwind CSS 3** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **Radix UI** - Unstyled, accessible component primitives
- **React Router 6** - Client-side routing and navigation
- **Supabase** (optional) - Backend as a Service for cloud sync and authentication
- **Local Storage** - Browser storage for offline data persistence

### Architecture

- **Context API** - Global state management
- **Custom hooks** - Reusable stateful logic
- **Service layer pattern** - Data persistence abstraction (localStorage/Supabase)
- **Component-based** architecture for maintainability
- **Lazy loading** - Code splitting for optimal performance
- **Responsive design** - Works on all device sizes

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

### Testing Scripts

- `npm run test-full-import` - Test full CSV import functionality
- `npm run test-error-handling` - Test CSV import error handling
- `npm run test-csv-import` - Test standard CSV import process

### Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/            # shadcn/ui base components
│   └── ...            # Feature components
├── config/            # Category and Project configuration files
├── contexts/          # React Context providers
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries and helpers
├── pages/             # Main application pages
├── services/          # Data service layer (localStorage/Supabase)
└── utils/             # Utility functions
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
