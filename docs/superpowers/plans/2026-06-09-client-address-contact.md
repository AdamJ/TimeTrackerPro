# Client Address & Contact Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured address (street, city, state, zip, country) and contact (name, email, website) fields to the `Client` entity, persisted in localStorage and Supabase.

**Architecture:** Extend the `Client` TypeScript interface with 8 optional fields, update `addClient` to accept an object instead of a bare name string, add a Supabase migration adding 8 nullable text columns, and update all read/write paths in `supabaseService.ts`. The `ClientManagement.tsx` form and card display are completed last.

**Tech Stack:** React 18, TypeScript, Supabase (postgres), localStorage, Vitest + RTL, shadcn/ui

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/contexts/TimeTrackingContext.tsx` — `Client` interface (line 69), context type `addClient` signature (line 183), `addClient` implementation (line 1001) |
| Modify | `src/services/supabaseService.ts` — `saveClients`, `getClients`, `upsertClient` |
| Modify | `src/components/ClientManagement.tsx` — form fields, `handleSubmit`, card display |
| Create | `supabase/migrations/20260609_clients_address_contact.sql` |
| Modify | `src/services/dataService.test.ts` — add localStorage round-trip tests |
| Modify | `src/contexts/TimeTracking.test.tsx` — add `addClient` object-signature test |

---

### Task 1: Extend `Client` interface and update `addClient`

**Files:**
- Modify: `src/contexts/TimeTrackingContext.tsx:69-74` (interface)
- Modify: `src/contexts/TimeTrackingContext.tsx:183` (context type)
- Modify: `src/contexts/TimeTrackingContext.tsx:1001-1013` (implementation)
- Test: `src/contexts/TimeTracking.test.tsx`

- [ ] **Step 1: Write failing test for new `addClient` signature**

Add inside the `describe("TimeTrackingContext")` block in `src/contexts/TimeTracking.test.tsx`:

```tsx
describe("Client Management", () => {
  it("should add a client with address and contact fields", async () => {
    const { result } = renderHook(() => useTimeTracking(), { wrapper });

    await waitFor(() => expect(result.current.clients).toBeDefined());

    let created: import("@/contexts/TimeTrackingContext").Client | null = null;
    await act(async () => {
      created = result.current.addClient({
        name: "Acme Corp",
        addressStreet: "123 Main St",
        addressCity: "Springfield",
        addressState: "IL",
        addressZip: "62701",
        addressCountry: "USA",
        contactName: "Jane Doe",
        contactEmail: "jane@acme.com",
        contactWebsite: "https://acme.com",
      });
    });

    expect(created).not.toBeNull();
    expect(created!.name).toBe("Acme Corp");
    expect(created!.addressStreet).toBe("123 Main St");
    expect(created!.addressCity).toBe("Springfield");
    expect(created!.addressState).toBe("IL");
    expect(created!.addressZip).toBe("62701");
    expect(created!.addressCountry).toBe("USA");
    expect(created!.contactName).toBe("Jane Doe");
    expect(created!.contactEmail).toBe("jane@acme.com");
    expect(created!.contactWebsite).toBe("https://acme.com");

    await waitFor(() => {
      expect(result.current.clients.some(c => c.name === "Acme Corp")).toBe(true);
    });
  });

  it("should add a client with name only (all fields optional)", async () => {
    const { result } = renderHook(() => useTimeTracking(), { wrapper });

    await waitFor(() => expect(result.current.clients).toBeDefined());

    let created: import("@/contexts/TimeTrackingContext").Client | null = null;
    await act(async () => {
      created = result.current.addClient({ name: "Solo Client" });
    });

    expect(created).not.toBeNull();
    expect(created!.name).toBe("Solo Client");
    expect(created!.addressStreet).toBeUndefined();
    expect(created!.contactEmail).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test -- --run src/contexts/TimeTracking.test.tsx
```

Expected: FAIL — `addClient` does not accept an object yet.

- [ ] **Step 3: Update `Client` interface**

In `src/contexts/TimeTrackingContext.tsx`, replace the `Client` interface (lines 69–74):

```typescript
export interface Client {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string; // ISO string
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  contactName?: string;
  contactEmail?: string;
  contactWebsite?: string;
}
```

- [ ] **Step 4: Update `addClient` signature in context type (line 183)**

Replace:
```typescript
addClient: (name: string) => Client | null;
```
With:
```typescript
addClient: (data: { name: string; addressStreet?: string; addressCity?: string; addressState?: string; addressZip?: string; addressCountry?: string; contactName?: string; contactEmail?: string; contactWebsite?: string }) => Client | null;
```

- [ ] **Step 5: Update `addClient` implementation (~line 1001)**

Replace the existing `addClient` function body:

```typescript
const addClient = (data: { name: string; addressStreet?: string; addressCity?: string; addressState?: string; addressZip?: string; addressCountry?: string; contactName?: string; contactEmail?: string; contactWebsite?: string }): Client | null => {
  const trimmed = data.name.trim();
  if (!trimmed) return null;
  const newClient: Client = {
    id: Date.now().toString(),
    name: trimmed,
    archived: false,
    createdAt: new Date().toISOString(),
    addressStreet: data.addressStreet,
    addressCity: data.addressCity,
    addressState: data.addressState,
    addressZip: data.addressZip,
    addressCountry: data.addressCountry,
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactWebsite: data.contactWebsite,
  };
  const next = [...clientsRef.current, newClient];
  clientsRef.current = next;
  setClients(next);
  return newClient;
};
```

- [ ] **Step 6: Run test to confirm it passes**

```bash
npm run test -- --run src/contexts/TimeTracking.test.tsx
```

Expected: PASS for the new Client Management tests.

- [ ] **Step 7: Lint and build check**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/contexts/TimeTrackingContext.tsx src/contexts/TimeTracking.test.tsx
git commit -m "feat: extend Client interface with address and contact fields"
```

---

### Task 2: Supabase migration

**Files:**
- Create: `supabase/migrations/20260609_clients_address_contact.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/20260609_clients_address_contact.sql`:

```sql
-- Add structured address and contact columns to the clients table.
-- All columns nullable so existing rows are unaffected.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS address_street  text,
  ADD COLUMN IF NOT EXISTS address_city    text,
  ADD COLUMN IF NOT EXISTS address_state   text,
  ADD COLUMN IF NOT EXISTS address_zip     text,
  ADD COLUMN IF NOT EXISTS address_country text,
  ADD COLUMN IF NOT EXISTS contact_name    text,
  ADD COLUMN IF NOT EXISTS contact_email   text,
  ADD COLUMN IF NOT EXISTS contact_website text;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260609_clients_address_contact.sql
git commit -m "feat: add address and contact columns to clients table"
```

---

### Task 3: Update Supabase service read/write paths

**Files:**
- Modify: `src/services/supabaseService.ts` — `saveClients`, `getClients`, `upsertClient`

- [ ] **Step 1: Write failing test for localStorage round-trip with new fields**

Add to `src/services/dataService.test.ts` inside `describe("LocalStorageService (via factory)")`:

```typescript
describe("clients", () => {
  it("should round-trip a client with address and contact fields", async () => {
    const client: import("@/contexts/TimeTrackingContext").Client = {
      id: "test-1",
      name: "Acme Corp",
      archived: false,
      createdAt: "2026-06-09T00:00:00.000Z",
      addressStreet: "123 Main St",
      addressCity: "Springfield",
      addressState: "IL",
      addressZip: "62701",
      addressCountry: "USA",
      contactName: "Jane Doe",
      contactEmail: "jane@acme.com",
      contactWebsite: "https://acme.com",
    };

    await service.saveClients([client]);
    const loaded = await service.getClients();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].addressStreet).toBe("123 Main St");
    expect(loaded[0].addressCity).toBe("Springfield");
    expect(loaded[0].addressState).toBe("IL");
    expect(loaded[0].addressZip).toBe("62701");
    expect(loaded[0].addressCountry).toBe("USA");
    expect(loaded[0].contactName).toBe("Jane Doe");
    expect(loaded[0].contactEmail).toBe("jane@acme.com");
    expect(loaded[0].contactWebsite).toBe("https://acme.com");
  });

  it("should round-trip a client with only name (all new fields undefined)", async () => {
    const client: import("@/contexts/TimeTrackingContext").Client = {
      id: "test-2",
      name: "Solo Client",
      archived: false,
      createdAt: "2026-06-09T00:00:00.000Z",
    };

    await service.saveClients([client]);
    const loaded = await service.getClients();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].addressStreet).toBeUndefined();
    expect(loaded[0].contactEmail).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it passes (localStorage auto-handles new fields)**

```bash
npm run test -- --run src/services/dataService.test.ts
```

Expected: PASS — localStorage serializes the full object, no code change needed for that service.

- [ ] **Step 3: Update `saveClients` in `supabaseService.ts`**

Locate the `clientsToUpsert` mapping in `saveClients` and replace it:

```typescript
const clientsToUpsert = clients.map((client) => ({
  id: client.id,
  user_id: user.id,
  name: client.name,
  archived: client.archived === true,
  created_at: client.createdAt,
  address_street: client.addressStreet ?? null,
  address_city: client.addressCity ?? null,
  address_state: client.addressState ?? null,
  address_zip: client.addressZip ?? null,
  address_country: client.addressCountry ?? null,
  contact_name: client.contactName ?? null,
  contact_email: client.contactEmail ?? null,
  contact_website: client.contactWebsite ?? null,
}));
```

- [ ] **Step 4: Update `getClients` result mapping in `supabaseService.ts`**

Replace the `result` mapping inside `getClients`:

```typescript
const result = (data || []).map((client) => ({
  id: client.id,
  name: client.name,
  archived: client.archived === true,
  createdAt: client.created_at,
  addressStreet: client.address_street ?? undefined,
  addressCity: client.address_city ?? undefined,
  addressState: client.address_state ?? undefined,
  addressZip: client.address_zip ?? undefined,
  addressCountry: client.address_country ?? undefined,
  contactName: client.contact_name ?? undefined,
  contactEmail: client.contact_email ?? undefined,
  contactWebsite: client.contact_website ?? undefined,
}));
```

- [ ] **Step 5: Update `upsertClient` in `supabaseService.ts`**

Replace the upsert object literal inside `upsertClient`:

```typescript
const { error } = await supabase
  .from("clients")
  .upsert({
    id: client.id,
    user_id: user.id,
    name: client.name,
    archived: client.archived === true,
    created_at: client.createdAt,
    address_street: client.addressStreet ?? null,
    address_city: client.addressCity ?? null,
    address_state: client.addressState ?? null,
    address_zip: client.addressZip ?? null,
    address_country: client.addressCountry ?? null,
    contact_name: client.contactName ?? null,
    contact_email: client.contactEmail ?? null,
    contact_website: client.contactWebsite ?? null,
  }, { onConflict: "id" });
```

- [ ] **Step 6: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/supabaseService.ts src/services/dataService.test.ts
git commit -m "feat: map address and contact fields in Supabase client read/write"
```

---

### Task 4: Complete `ClientManagement.tsx` form and display

**Files:**
- Modify: `src/components/ClientManagement.tsx`

- [ ] **Step 1: Replace `ClientManagement.tsx` with the completed implementation**

Replace the entire file content:

```tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Plus,
  Users,
  Archive,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";
import { toast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "./ui/item";

export const ClientManagement: React.FC = () => {
  const {
    clients,
    addClient,
    archiveClient,
    restoreClient,
    persistClients,
    persistClient,
  } = useTimeTracking();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeClients = clients.filter((client) => !client.archived);
  const archivedClients = clients.filter((client) => client.archived);

  const resetForm = () => {
    setName("");
    setAddressStreet("");
    setAddressCity("");
    setAddressState("");
    setAddressZip("");
    setAddressCountry("");
    setContactName("");
    setContactEmail("");
    setContactWebsite("");
    setIsAddingNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = addClient({
      name: trimmed,
      addressStreet: addressStreet.trim() || undefined,
      addressCity: addressCity.trim() || undefined,
      addressState: addressState.trim() || undefined,
      addressZip: addressZip.trim() || undefined,
      addressCountry: addressCountry.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactWebsite: contactWebsite.trim() || undefined,
    });
    if (created) await persistClient(created);
    toast({
      title: "Client added",
      description: `"${trimmed}" has been added.`,
    });
    resetForm();
  };

  const handleArchive = async (clientId: string) => {
    setArchiveError(null);
    const error = archiveClient(clientId);
    if (error) {
      setArchiveError(error);
      return;
    }
    await persistClients();
    const archivedName = clients.find((client) => client.id === clientId)?.name;
    toast({
      title: "Client archived",
      description: archivedName
        ? `"${archivedName}" has been archived.`
        : undefined,
    });
  };

  const handleRestore = async (clientId: string) => {
    setArchiveError(null);
    restoreClient(clientId);
    await persistClients();
    const restoredName = clients.find((client) => client.id === clientId)?.name;
    toast({
      title: "Client restored",
      description: restoredName
        ? `"${restoredName}" has been restored.`
        : undefined,
    });
  };

  return (
    <PageLayout
      title={
        <>
          Clients <Badge variant="outline">{activeClients.length}</Badge>
        </>
      }
      actions={
        <Button
          onClick={() => setIsAddingNew(true)}
          variant="default"
          disabled={isAddingNew}
        >
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:block">Add Client</span>
        </Button>
      }
    >
      <div className="max-w-6xl mx-auto p-6 print:p-4 space-y-6">
        {archiveError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot archive client</AlertTitle>
            <AlertDescription>{archiveError}</AlertDescription>
          </Alert>
        )}

        {isAddingNew && (
          <Card>
            <CardHeader>
              <CardTitle>Add Client</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="client-name">
                    Client Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="client-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter client name"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <div>
                    <Label htmlFor="address-street">Street</Label>
                    <Input
                      id="address-street"
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="address-city">City</Label>
                      <Input
                        id="address-city"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        placeholder="Springfield"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address-state">State / Province</Label>
                      <Input
                        id="address-state"
                        value={addressState}
                        onChange={(e) => setAddressState(e.target.value)}
                        placeholder="IL"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="address-zip">ZIP / Postal Code</Label>
                      <Input
                        id="address-zip"
                        value={addressZip}
                        onChange={(e) => setAddressZip(e.target.value)}
                        placeholder="62701"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address-country">Country</Label>
                      <Input
                        id="address-country"
                        value={addressCountry}
                        onChange={(e) => setAddressCountry(e.target.value)}
                        placeholder="USA"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <div>
                    <Label htmlFor="contact-name">Contact Name</Label>
                    <Input
                      id="contact-name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-website">Website</Label>
                    <Input
                      id="contact-website"
                      type="url"
                      value={contactWebsite}
                      onChange={(e) => setContactWebsite(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">Add</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {activeClients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No clients yet. Add your first client to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeClients.map((client) => (
                <Item
                  key={client.id}
                  variant="outline"
                  className="shadow-none duration-100 hover:shadow-md transition-shadow"
                >
                  <ItemContent>
                    <ItemTitle>{client.name}</ItemTitle>
                    <ItemDescription>
                      {(client.addressStreet || client.addressCity) && (
                        <p>
                          {[
                            client.addressStreet,
                            client.addressCity,
                            client.addressState,
                            client.addressZip,
                            client.addressCountry,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {client.contactName && <p>{client.contactName}</p>}
                      {client.contactEmail && (
                        <p>
                          <a
                            href={`mailto:${client.contactEmail}`}
                            className="text-primary hover:underline"
                          >
                            {client.contactEmail}
                          </a>
                        </p>
                      )}
                      {client.contactWebsite && (
                        <p>
                          <a
                            href={client.contactWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {client.contactWebsite}
                          </a>
                        </p>
                      )}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="outline"
                      onClick={() => handleArchive(client.id)}
                    >
                      <Archive className="w-4 h-4 mr-1" />
                      <span className="hidden sm:block">Archive</span>
                    </Button>
                  </ItemActions>
                </Item>
              ))}
            </div>
          )}
        </div>

        {archivedClients.length > 0 && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setShowArchived((prev) => !prev)}
              className="px-0 hover:bg-transparent"
            >
              {showArchived ? (
                <ChevronDown className="w-4 h-4 mr-2" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2" />
              )}
              Archived ({archivedClients.length})
            </Button>
            {showArchived && (
              <div className="grid gap-4">
                {archivedClients.map((client) => (
                  <Card key={client.id} className="opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-muted-foreground">
                          {client.name}
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(client.id)}
                        >
                          <RotateCcw className="w-3 h-3 sm:mr-2" />
                          <span className="hidden sm:block">Restore</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
};
```

- [ ] **Step 2: Run full test suite**

```bash
npm run test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ClientManagement.tsx
git commit -m "feat: complete client address and contact form and card display"
```
