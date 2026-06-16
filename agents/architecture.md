# Architecture — Timetraked

## Overall Architecture

Timetraked follows a **context-driven architecture** with a **service-oriented data layer**:

```mermaid
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │           AuthProvider (Context)                   │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │     TimeTrackingProvider (Context)           │ │ │
│  │  │                                              │ │ │
│  │  │  ┌────────────────────────────────────────┐ │ │ │
│  │  │  │         Pages & Components              │ │ │ │
│  │  │  └────────────────────────────────────────┘ │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   DataService Layer   │
              │  (Factory Pattern)    │
              └───────────────────────┘
                    │           │
        ┌───────────┘           └───────────┐
        ▼                                   ▼
┌──────────────────┐            ┌──────────────────┐
│ LocalStorage     │            │ Supabase         │
│ Service          │            │ Service          │
└──────────────────┘            └──────────────────┘
```

## Key Patterns

### 1. Context Provider Pattern

All global state is managed through React Context:

- `AuthContext` — User authentication and session
- `TimeTrackingContext` — All time tracking operations

### 2. Service Layer Pattern

Data persistence is abstracted through the `DataService` interface:

- **Interface**: `DataService` defines all data operations
- **Implementations**:
  - `LocalStorageService` — For guest/offline mode
  - `SupabaseService` — For authenticated/cloud mode
- **Factory**: `createDataService(isAuthenticated)` returns appropriate implementation

### 3. Custom Hook Pattern

Complex logic is extracted into custom hooks:

- `useAuth()` — Access authentication state and methods
- `useTimeTracking()` — Access time tracking state and methods

### 4. Lazy Loading Pattern

Pages are lazy-loaded for code splitting:

```typescript
const Index = lazy(() => import('./pages/Index'));
```

### 5. Optimistic UI Updates

UI updates immediately, then syncs to backend:

```typescript
setTasks(prev => [...prev, newTask]); // Update UI
await dataService.saveCurrentDay(state); // Sync to backend
```

---

## Data Flow & State Management

### Authentication Flow

```md
1. User opens app
   ↓
2. AuthProvider checks for existing session
   ↓
3. If authenticated → Load from Supabase
   If guest → Load from localStorage
   ↓
4. AuthContext provides: { user, isAuthenticated, loading, signIn, signUp, signOut }
```

### Time Tracking Flow

```md
1. User starts day (via StartDayDialog)
   ↓
2. TimeTrackingContext updates state
   ↓
3. New Task form auto-opens (defaultOpen prop)
   ↓
4. User creates tasks
   ↓
5. Tasks saved to state (in-memory)
   ↓
6. Manual sync OR critical events (end day, window close)
   ↓
7. DataService persists to localStorage or Supabase
```

### User Action → Persistence Flow

```md
User Action
  ↓
Context Method
  ↓
State Update (in-memory)
  ↓
(Optional) DataService Call
  ↓
localStorage or Supabase
```

### Data Service Selection

```typescript
// Factory pattern selects service based on auth state
const service = createDataService(isAuthenticated);
// Returns: LocalStorageService OR SupabaseService
```

### State Management Strategy — Manual Sync (Single-Device Optimized)

- **No automatic saves** — Saves only on critical events
- **Critical save events**:
  1. Day end (`postDay()`)
  2. Window close (`beforeunload`)
  3. Manual sync button (`forceSyncToDatabase()`)
- **Why?** Optimized for single-device usage, reduces unnecessary database calls
- **Trade-off**: Users must manually sync or complete critical events

### Data Migration — localStorage ↔ Supabase

- **Login**: Migrates localStorage data to Supabase (smart merge)
- **Logout**: Syncs Supabase data to localStorage for offline access
- **Logic**: Compares data freshness, prevents overwriting newer data

---

## Client Management

Clients are a first-class entity distinct from projects. A project has an optional client; multiple projects can share the same client. Clients can be archived independently of projects (but not if they own active projects).

**Data shape**:
- `clients` state in TimeTrackingContext: `Client[]`
- Persisted separately from other data (single-row upserts, not bulk save)
- Guest mode: localStorage blob (`localStorageService/clients.ts`)
- Authenticated mode: Supabase `clients` table with RLS

**Reconciliation** (runs at app init, idempotent):
- Scans all projects for unique `client` names
- Adds any missing client names as active clients
- Prevents orphaning clients that users created during CSV import

**Persistence pattern**:
- Add/Edit: `persistClient(client)` → single-row upsert
- Archive/Restore: `persistClients()` → full list reconcile (select distinct, upsert)
- Not part of `forceSyncToDatabase()` bulk save
