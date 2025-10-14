# TimeTracker Pro

A modern, feature-rich time tracking application built with React, TypeScript, and Tailwind CSS. Perfect for freelancers, consultants, and professionals who need to track time, manage projects, and generate invoices.

![GitHub Copilot](https://img.shields.io/badge/github_copilot-8957E5?style=for-the-badge&logo=github-copilot&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🔐 Authentication & Data Storage

**NEW**: TimeTracker Pro now supports both authenticated and guest usage!

- **🔄 Cloud Sync**: Sign in with Supabase to sync data across devices
- **💾 Local Storage**: Use without an account - data stays on your device
- **🔄 Data Migration**: Existing data automatically migrates when you sign in
- **⚡ Offline-First**: Full functionality available with or without internet

See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed setup instructions.

## ✨ Features

### Core Time Tracking

- **Start/Stop Day Tracking**: Begin and end your work day with clear boundaries
- **Task Management**: Create, edit, and delete tasks with real-time duration tracking
- **Project & Client Organization**: Assign tasks to specific projects and clients
- **Persistent Data**: Data saved to localStorage (guest) or Supabase (authenticated)

### Advanced Features

- **Archive System**: Complete days are archived with full task details
- **Export Capabilities**: Export data as CSV or JSON for external use
- **Invoice Generation**: Generate invoice data for specific clients and date ranges
- **Project Management**: Create projects with hourly rates and client assignments
- **Print Support**: Print-friendly archive views for physical records

### Professional Tools

- **Revenue Tracking**: Automatic calculation of earnings based on hourly rates
- **Time Analytics**: View total hours and revenue across all projects
- **Data Export**: Multiple export formats for integration with accounting software
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# 🔒 IMPORTANT: Setup environment variables for cloud sync (optional)
cp .env.example .env
# Edit .env with your Supabase credentials (see .env.example for instructions)

# Start development server
npm run dev
```

### First Time Setup

1. **🔒 Environment Setup** (Optional - for cloud sync):
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key (see `.env.example` for detailed instructions)
   - **⚠️ Never commit .env to version control!**
2. **Start Your First Day**: Click "Start Day" to begin time tracking
3. **Authentication** (Optional): Click "Sign In" in the top-right corner to enable cloud sync
4. **Add Projects** (Optional): Go to Archive → Projects to set up your clients and hourly rates
5. **Create Tasks**: Use "New Task" to start tracking specific work items
6. **End Your Day**: Click "End Day" when finished, then "Post Time to Archive"

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

### Data Export

- Access via Archive → Export button
- Choose from CSV, JSON, or Invoice formats
- Filter by date range for specific periods
- Perfect for submitting timesheets to employers or generating client invoices

## 🛠 Technical Details

### Built With

- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive styling
- **shadcn/ui** for beautiful, accessible components
- **React Router** for navigation
- **Local Storage** for data persistence

### Architecture

- **Context API** for state management
- **Custom hooks** for reusable logic
- **Component-based** architecture for maintainability
- **Responsive design** for all device sizes

### Data Storage

- By default, all data is stored locally in your browser
- Optionally, data can be stored in a [Supabase](https://www.supabase.com) project
- No external servers or accounts required
- Data persists between sessions
- Export capabilities for backup and integration

## 🎯 Perfect For

- **Freelancers**: Track billable hours and generate client invoices
- **Consultants**: Organize time by project and client
- **Remote Workers**: Submit detailed timesheets to employers
- **Students**: Track study time and project work
- **Anyone**: Who needs professional time tracking without the complexity

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test-full-import` - Run test of full CSV import
- `npm run test-error-handling` - Run test of CSV import error handling
- `npm run test-csv-import` - Run test of standard CSV import

### Project Structure

```json
src/
├── components/         # Reusable UI components
├── config/             # Category and Project configuration files
├── contexts/           # React Context providers
├── hooks/              # Use files
├── lib/                # Libraries
├── pages/              # Main application pages
├── services/           # Data service configuration
└── utils/              # Utility functions
```

## Supporting Documents

- [Security](docs/SECURITY.md)
      - Configuration for project security with Chat Agents
- [Scheme Compatibility](docs/SCHEMA_COMPATIBILITY.md)
      - Chat record of updating DB schema for Supabase
- [Chatbot Notes](docs/chatbot.md)
      - Chat records from interactions with GitHub CoPilot
- [Authentication](docs/AUTHENTICATION.md)
      - Record for how authentication was configured and is handled
- [Data Persistence](docs/AUTH_DATA_PERSISTENCE_FIX.md)
      - Record on how data persistence issues were fixed
- [CSV Templates](docs/CSV_TEMPLATES_README.md)
      - Available CSV templates for importing, testing, and exporting of time entries
- [Migration](docs/MIGRATION.md)
      - Document for migrating data to Supabase database
- [ChatGPT Features](docs/FEATURES.md)
      - Notes from ChatGPT related to updates and improvements requests

### Agents

[AGENTS.md](AGENTS.md)

- [Styles](agents/styles.md)
      - Rules to govern the style choices for Agents
- [Pull Requests](agents/pull_requests.md)
      - Rules for Agents to create pull requests

### Local Agents

- [Project Rules](.continue/rules/project-rules.md)
      - Setting project rules when using the local agent editor extension "Continue"

## 📄 License

This project is open source and available under the MIT License.

---

**Ready to take control of your time?** Start tracking today and see where your hours really go!

---

- This project originally began as a Lovable prompt [LOVABLE README](info/README-LOVABLE.md)

- Badges from [https://github.com/Ileriayo/markdown-badges](https://github.com/Ileriayo/markdown-badges)
