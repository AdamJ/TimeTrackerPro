# Client Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add edit support for clients by moving the add form into a reusable Sheet component and adding an edit path that pre-fills from the existing client.

**Architecture:** Add `updateClient` to the context (mutates `clientsRef`, returns updated `Client`). Extract a new `ClientSheet` component that handles both add and edit modes. `ClientManagement` removes its inline form, gains `sheetOpen`/`editingClient` state, and wires Add + Edit buttons to the sheet.

**Tech Stack:** React 18, TypeScript, shadcn/ui Sheet, Lucide icons, Vitest + React Testing Library

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/contexts/TimeTrackingContext.tsx` — add `updateClient` to interface + implementation + context value |
| Modify | `src/contexts/TimeTracking.test.tsx` — add `updateClient` tests |
| Create | `src/components/ClientSheet.tsx` — shared add/edit Sheet form |
| Modify | `src/components/ClientManagement.tsx` — remove inline form, add edit button, render ClientSheet |

---

### Task 1: Write failing test for `updateClient`

**Files:**
- Modify: `src/contexts/TimeTracking.test.tsx`

- [ ] **Step 1: Add tests inside the existing `Client Management` describe block**

Open `src/contexts/TimeTracking.test.tsx`. Inside the `describe("Client Management", ...)` block (around line 514), add these two tests after the existing ones:

```tsx
it("should update an existing client's fields", async () => {
  const { result } = renderHook(() => useTimeTracking(), { wrapper });

  await waitFor(() => expect(result.current.clients).toBeDefined());

  let created: import("@/contexts/TimeTrackingContext").Client | null = null;
  await act(async () => {
    created = result.current.addClient({ name: "Acme Corp", contactEmail: "old@acme.com" });
  });

  await waitFor(() =>
    expect(result.current.clients.some(c => c.name === "Acme Corp")).toBe(true)
  );

  let updated: import("@/contexts/TimeTrackingContext").Client | null = null;
  await act(async () => {
    updated = result.current.updateClient(created!.id, {
      name: "Acme Corp Updated",
      contactEmail: "new@acme.com",
      addressCity: "Chicago",
    });
  });

  expect(updated).not.toBeNull();
  expect(updated!.name).toBe("Acme Corp Updated");
  expect(updated!.contactEmail).toBe("new@acme.com");
  expect(updated!.addressCity).toBe("Chicago");
  expect(updated!.id).toBe(created!.id);
  expect(updated!.createdAt).toBe(created!.createdAt);
  expect(updated!.archived).toBe(false);

  await waitFor(() => {
    const found = result.current.clients.find(c => c.id === created!.id);
    expect(found?.name).toBe("Acme Corp Updated");
  });
});

it("should return null when updating a non-existent client", async () => {
  const { result } = renderHook(() => useTimeTracking(), { wrapper });

  await waitFor(() => expect(result.current.clients).toBeDefined());

  let updated: import("@/contexts/TimeTrackingContext").Client | null = null;
  await act(async () => {
    updated = result.current.updateClient("does-not-exist", { name: "Ghost" });
  });

  expect(updated).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose TimeTracking.test
```

Expected: FAIL — `result.current.updateClient is not a function` or similar.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/contexts/TimeTracking.test.tsx
git commit -m "test: add failing tests for updateClient"
```

---

### Task 2: Implement `updateClient` in the context

**Files:**
- Modify: `src/contexts/TimeTrackingContext.tsx`

- [ ] **Step 1: Add `updateClient` to the context interface**

Find the `// Client management` section in the interface (around line 190). After the `addClient` line, add:

```ts
updateClient: (id: string, data: Partial<Omit<Client, "id" | "createdAt" | "archived">>) => Client | null;
```

The block should look like:

```ts
// Client management
addClient: (data: { name: string; addressStreet?: string; addressCity?: string; addressState?: string; addressZip?: string; addressCountry?: string; contactName?: string; contactEmail?: string; contactWebsite?: string }) => Client | null;
updateClient: (id: string, data: Partial<Omit<Client, "id" | "createdAt" | "archived">>) => Client | null;
archiveClient: (clientId: string) => string | null;
restoreClient: (clientId: string) => void;
persistClients: () => Promise<void>;
persistClient: (client: Client) => Promise<void>;
```

- [ ] **Step 2: Add `updateClient` implementation**

Find the `restoreClient` function (around line 1059). Insert `updateClient` immediately after it (before `// Archive management functions`):

```ts
const updateClient = (
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt" | "archived">>
): Client | null => {
  const existing = clientsRef.current.find(c => c.id === id);
  if (!existing) return null;
  const updated: Client = { ...existing, ...data };
  const next = clientsRef.current.map(c => c.id === id ? updated : c);
  clientsRef.current = next;
  setClients(next);
  return updated;
};
```

- [ ] **Step 3: Add `updateClient` to the context value object**

Find the context value object (around line 1476) where `addClient` is listed. Add `updateClient` on the next line:

```ts
addClient,
updateClient,
archiveClient,
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- --reporter=verbose TimeTracking.test
```

Expected: all `Client Management` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/TimeTrackingContext.tsx src/contexts/TimeTracking.test.tsx
git commit -m "feat: add updateClient to TimeTrackingContext"
```

---

### Task 3: Create `ClientSheet` component

**Files:**
- Create: `src/components/ClientSheet.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/ClientSheet.tsx` with this content:

```tsx
import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Client } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  client?: Client;
}

export const ClientSheet: React.FC<ClientSheetProps> = ({
  open,
  onOpenChange,
  mode,
  client,
}) => {
  const { addClient, updateClient, persistClient } = useTimeTracking();

  const [name, setName] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && client) {
      setName(client.name);
      setAddressStreet(client.addressStreet ?? "");
      setAddressCity(client.addressCity ?? "");
      setAddressState(client.addressState ?? "");
      setAddressZip(client.addressZip ?? "");
      setAddressCountry(client.addressCountry ?? "");
      setContactName(client.contactName ?? "");
      setContactEmail(client.contactEmail ?? "");
      setContactWebsite(client.contactWebsite ?? "");
    } else {
      setName("");
      setAddressStreet("");
      setAddressCity("");
      setAddressState("");
      setAddressZip("");
      setAddressCountry("");
      setContactName("");
      setContactEmail("");
      setContactWebsite("");
    }
  }, [open, mode, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const data = {
      name: trimmed,
      addressStreet: addressStreet.trim() || undefined,
      addressCity: addressCity.trim() || undefined,
      addressState: addressState.trim() || undefined,
      addressZip: addressZip.trim() || undefined,
      addressCountry: addressCountry.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactWebsite: contactWebsite.trim() || undefined,
    };

    if (mode === "add") {
      const created = addClient(data);
      if (created) await persistClient(created);
      toast({ title: "Client added", description: `"${trimmed}" has been added.` });
    } else if (mode === "edit" && client) {
      const updated = updateClient(client.id, data);
      if (updated) await persistClient(updated);
      toast({ title: "Client saved", description: `"${trimmed}" has been saved.` });
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode === "add" ? "Add Client" : "Edit Client"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
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

          <SheetFooter className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{mode === "add" ? "Add" : "Save"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
```

- [ ] **Step 2: Run lint to verify no type errors**

```bash
npm run lint
```

Expected: no errors in `ClientSheet.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ClientSheet.tsx
git commit -m "feat: add ClientSheet component for add/edit"
```

---

### Task 4: Update `ClientManagement` to use the sheet

**Files:**
- Modify: `src/components/ClientManagement.tsx`

- [ ] **Step 1: Replace the file contents**

Replace `src/components/ClientManagement.tsx` with:

```tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Plus,
  Users,
  Archive,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";
import { toast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemActions } from "./ui/item";
import { ClientSheet } from "./ClientSheet";
import { Client } from "@/contexts/TimeTrackingContext";

export const ClientManagement: React.FC = () => {
  const {
    clients,
    archiveClient,
    restoreClient,
    persistClients,
  } = useTimeTracking();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeClients = clients.filter((client) => !client.archived);
  const archivedClients = clients.filter((client) => client.archived);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setSheetOpen(true);
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
      description: archivedName ? `"${archivedName}" has been archived.` : undefined,
    });
  };

  const handleRestore = async (clientId: string) => {
    setArchiveError(null);
    restoreClient(clientId);
    await persistClients();
    const restoredName = clients.find((client) => client.id === clientId)?.name;
    toast({
      title: "Client restored",
      description: restoredName ? `"${restoredName}" has been restored.` : undefined,
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
        <Button onClick={handleOpenAdd} variant="default">
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
                      onClick={() => handleOpenEdit(client)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      <span className="hidden sm:block">Edit</span>
                    </Button>
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

      <ClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={editingClient ? "edit" : "add"}
        client={editingClient ?? undefined}
      />
    </PageLayout>
  );
};
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: no errors or warnings.

- [ ] **Step 3: Run full test suite**

```bash
npm run test -- --reporter=verbose
```

Expected: all tests pass, including the two new `updateClient` tests.

- [ ] **Step 4: Commit**

```bash
git add src/components/ClientManagement.tsx
git commit -m "feat: wire ClientSheet into ClientManagement for add and edit"
```

---

### Task 5: Manual verification

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Open `http://localhost:8080/clients`

- [ ] **Step 2: Verify add flow**

1. Click "Add Client" — sheet opens empty with title "Add Client"
2. Fill in name + some fields → click "Add"
3. Sheet closes, toast "Client added", client appears in list with all filled fields

- [ ] **Step 3: Verify edit flow**

1. Click "Edit" on an active client — sheet opens pre-filled with title "Edit Client"
2. Change the name and one other field → click "Save"
3. Sheet closes, toast "Client saved", card updates immediately

- [ ] **Step 4: Verify edge cases**

- Edit then cancel → no changes saved
- Add with name only → works, no address/contact shown
- Archive still works after adding Edit button to ItemActions

- [ ] **Step 5: Stop dev server and do final commit if any cleanup needed**

```bash
git status
```

If clean, done. If any minor fixes were needed during verification, stage and commit them:

```bash
git add -p
git commit -m "fix: client edit verification cleanup"
```
