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
