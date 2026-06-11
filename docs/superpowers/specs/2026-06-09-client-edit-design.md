# Client Edit — Design Spec

**Date:** 2026-06-09
**Status:** Approved

## Overview

Add the ability to edit existing clients. Move the Add Client form into a Sheet (drawer) for consistency, and reuse the same Sheet for editing.

## Architecture

### New file: `src/components/ClientSheet.tsx`

Controlled Sheet component. Props:

```ts
interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  client?: Client; // required when mode = "edit"
}
```

- Renders a shadcn `Sheet` (side drawer)
- Title: "Add Client" (add mode) or "Edit Client" (edit mode)
- Form fields: same as current add form — Name (required), Address section (street, city, state, zip, country), Contact section (name, email, website)
- Footer: Cancel button + "Add" (add mode) or "Save" (edit mode) submit button
- On open in edit mode: `useEffect` pre-fills all form fields from `client` prop
- On open in add mode: form resets to empty

### Modified: `src/components/ClientManagement.tsx`

- Remove inline add card form and all related local state
- Add state: `sheetOpen: boolean`, `editingClient: Client | null`
- Add button → `setSheetOpen(true); setEditingClient(null)`
- Edit button on each active client card → `setSheetOpen(true); setEditingClient(client)`
- Archived clients: no Edit button (must restore first)
- Edit button placement: `ItemActions`, alongside Archive button, using `Pencil` icon from lucide-react
- Pass `open`, `onOpenChange`, `mode`, and `client` to `ClientSheet`

### Modified: `src/contexts/TimeTrackingContext.tsx`

New method:

```ts
updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt" | "archived">>
): Client | null
```

- Finds client by `id` in `clientsRef.current`; returns `null` if not found
- Merges `data` into the existing client object
- Updates `clientsRef.current` and calls `setClients([...clientsRef.current])`
- Returns the updated `Client` so the caller can call `persistClient(updated)`
- Added to context interface alongside `addClient`

## Data Flow

### Add

1. User clicks "Add Client" → sheet opens (empty)
2. User fills form → submits
3. `addClient(data)` → returns created `Client`
4. `persistClient(created)` → `upsertClient` (1 Supabase call or localStorage write)
5. Sheet closes, toast: "Client added"

### Edit

1. User clicks Edit on a client card → sheet opens (pre-filled)
2. User edits fields → submits
3. `updateClient(id, data)` → returns updated `Client`
4. `persistClient(updated)` → `upsertClient` (same code path as add — no new service methods)
5. Sheet closes, toast: "Client saved"

## UI Details

- Archive error alert remains on the Clients page (not inside the sheet)
- Archived client cards: no Edit button; Archive button replaced by Restore button (existing behavior unchanged)
- Sheet uses shadcn `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter`
- No changes to archived client card rendering

## What Is Not Changing

- Archive / restore flow
- Supabase `upsertClient` — already handles insert + update via `onConflict: id`
- localStorage `upsertClient` — same
- `persistClients` (full-list save) — not used for edit
- Client seeding / reconcile logic
