# TimeTracker Pro

A modern, feature-rich time tracking application built with React, TypeScript, and Tailwind CSS. Perfect for freelancers, consultants, and professionals who need to track time, manage projects, and generate invoices.

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

### Project Structure

```json
src/
├── components/          # Reusable UI components
├── contexts/           # React Context providers
├── pages/              # Main application pages
├── utils/              # Utility functions
└── lib/                # Library configurations
```

## 📄 License

This project is open source and available under the MIT License.

---

**Ready to take control of your time?** Start tracking today and see where your hours really go!

---

> This project originally began as a Lovable prompt [LOVABLE README](info/README-LOVABLE.md)
