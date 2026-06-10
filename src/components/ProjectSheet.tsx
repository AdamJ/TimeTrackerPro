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
      toast({
        title: "Client added",
        description: `"${trimmed}" has been added.`,
      });
    } else if (mode === "edit" && client) {
      const updated = updateClient(client.id, data);
      if (updated) await persistClient(updated);
      toast({
        title: "Client saved",
        description: `"${trimmed}" has been saved.`,
      });
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? "Add Client" : "Edit Client"}
          </SheetTitle>
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
            <p className="text-sm font-medium border-b">Address</p>
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
            <p className="text-sm font-medium border-b">Contact</p>
            <div>
              <Label htmlFor="contact-name">Name</Label>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{mode === "add" ? "Add" : "Save"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
