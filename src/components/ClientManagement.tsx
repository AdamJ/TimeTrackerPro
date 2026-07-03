import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Plus,
  Users,
  Archive,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Globe,
  Mail,
  MapPin,
  User,
  Loader2,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { PageLayout } from "@/components/PageLayout";
import { toast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "./ui/item";
import { ClientSheet } from "./ClientSheet";
import { Client } from "@/contexts/TimeTrackingContext";

export const ClientManagement: React.FC = () => {
  const { clients, archiveClient, restoreClient, persistClients } =
    useTimeTracking();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const activeClients = clients.filter((client) => !client.archived);
  const archivedClients = clients.filter((client) => client.archived);

  const handleOpenAdd = useCallback(() => {
    setEditingClient(null);
    setSheetOpen(true);
  }, []);

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
    setPendingId(clientId);
    try {
      await persistClients();
      const archivedName = clients.find((client) => client.id === clientId)?.name;
      toast({
        title: "Client archived",
        description: archivedName
          ? `"${archivedName}" has been archived.`
          : undefined,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleRestore = async (clientId: string) => {
    setArchiveError(null);
    restoreClient(clientId);
    setPendingId(clientId);
    try {
      await persistClients();
      const restoredName = clients.find((client) => client.id === clientId)?.name;
      toast({
        title: "Client restored",
        description: restoredName
          ? `"${restoredName}" has been restored.`
          : undefined,
      });
    } finally {
      setPendingId(null);
    }
  };

  const pageTitle = useMemo(() => <>Clients</>, []);
  const pageBadge = useMemo(
    () => <Badge variant="outline">{activeClients.length}</Badge>,
    [activeClients.length]
  );
  const pageActions = useMemo(
    () => (
      <Button onClick={handleOpenAdd} size="sm" variant="default">
        <Plus className="w-4 h-4 sm:mr-1" />
        <span className="hidden sm:block">Add Client</span>
      </Button>
    ),
    [handleOpenAdd]
  );

  return (
    <PageLayout
      title={pageTitle}
      badge={pageBadge}
      actions={pageActions}
    >
      <div className="max-w-6xl mx-auto p-6 print:p-4 space-y-6">
        {archiveError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot archive client</AlertTitle>
            <AlertDescription>{archiveError}</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={() => setArchiveError(null)}>
                Dismiss
              </Button>
            </AlertAction>
          </Alert>
        )}

        <div className="space-y-4">
          {activeClients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users aria-hidden="true" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
                  className="items-start shadow-none duration-100 hover:shadow-md transition-shadow"
                >
                  <ItemContent>
                    <ItemTitle>{client.name}</ItemTitle>
                    <ItemDescription className="flex flex-col">
                      {(client.addressStreet || client.addressCity) && (
                        <p>
                          <Button variant="link" className="p-0" asChild>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${[
                                client.addressStreet,
                                client.addressCity,
                                client.addressState,
                                client.addressZip,
                                client.addressCountry,
                              ]
                                .filter(Boolean)
                                .join(", ")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MapPin className="w-4 h-4" />
                              {[
                                client.addressStreet,
                                client.addressCity,
                                client.addressState,
                                client.addressZip,
                                client.addressCountry,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </a>
                          </Button>
                        </p>
                      )}
                      {client.contactName && (
                        <p>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            {client.contactName}
                          </span>
                        </p>
                      )}
                      {client.contactEmail && (
                        <p>
                          <Button variant="link" className="p-0" asChild>
                            <a href={`mailto:${client.contactEmail}`}>
                              <Mail className="w-4 h-4" />
                              {client.contactEmail}
                            </a>
                          </Button>
                        </p>
                      )}
                      {client.contactWebsite && (() => {
                        let safeUrl: string | null = null;
                        try {
                          const parsed = new URL(client.contactWebsite);
                          if (parsed.protocol === "https:" || parsed.protocol === "http:") {
                            safeUrl = client.contactWebsite;
                          }
                        } catch {
                          // invalid URL — render as plain text below
                        }
                        return safeUrl ? (
                        <p>
                          <Button variant="link" className="p-0" asChild>
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Globe className="w-4 h-4" />
                              {client.contactWebsite}
                            </a>
                          </Button>
                        </p>
                        ) : (
                          <p>
                            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                              <Globe className="w-4 h-4" />
                              {client.contactWebsite}
                            </span>
                          </p>
                        );
                      })()}
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
                      disabled={pendingId === client.id}
                    >
                      {pendingId === client.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Archive className="w-4 h-4 mr-1" />
                      )}
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
                          disabled={pendingId === client.id}
                        >
                          {pendingId === client.id ? (
                            <Loader2 className="w-3 h-3 sm:mr-2 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3 sm:mr-2" />
                          )}
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
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingClient(null);
        }}
        mode={editingClient ? "edit" : "add"}
        client={editingClient ?? undefined}
      />
    </PageLayout>
  );
};
