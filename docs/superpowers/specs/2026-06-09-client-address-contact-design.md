---
title: Client Address & Contact Fields
date: 2026-06-09
status: approved
---

## Overview

Add structured address and contact fields to the `Client` entity. Persisted in localStorage (auto) and Supabase (new migration). Partially implemented in `ClientManagement.tsx`; this spec covers completing the full stack.

## Data Model

New optional fields added to the `Client` interface:

```ts
export interface Client {
  id: string;
  name: string;              // required
  archived: boolean;
  createdAt: string;

  // Address (structured)
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;

  // Contact
  contactName?: string;
  contactEmail?: string;
  contactWebsite?: string;
}
```

All new fields optional. `name` remains the only required field.

## Context Changes

- `addClient` signature: `addClient(data: { name: string; addressStreet?: string; addressCity?: string; addressState?: string; addressZip?: string; addressCountry?: string; contactName?: string; contactEmail?: string; contactWebsite?: string }): Client | null`
- Internal `newClient` construction maps all fields from `data`

## Persistence

### localStorage
No schema changes needed — the `Client` object is serialized as-is. New fields serialize automatically.

### Supabase
New migration `supabase/migrations/20260609_clients_address_contact.sql`:
- Adds 8 nullable `text` columns: `address_street`, `address_city`, `address_state`, `address_zip`, `address_country`, `contact_name`, `contact_email`, `contact_website`
- Existing rows default to `null`

`supabaseService.ts` updated in `saveClients`, `upsertClient`, and `getClients` to map snake_case DB columns ↔ camelCase TypeScript fields.

## UI

### Add Client Form (ClientManagement.tsx)
- Remove `required` from address field (it was incorrectly set)
- Two optional field groups below the required Name field:
  - **Address**: Street, City, State, Zip, Country (each its own Input)
  - **Contact**: Contact Name, Email, Website (each its own Input)
- `handleSubmit` passes all form state to `addClient`

### Client Card Display
- Show address lines and contact fields only when non-empty
- Archived client cards: name only (no change)

## Out of Scope
- Edit existing client fields (separate feature)
- Phone number field
- Address validation
