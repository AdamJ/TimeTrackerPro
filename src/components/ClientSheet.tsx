import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Client } from "@/contexts/TimeTrackingContext";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";

interface ClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  client?: Client;
}

const clientFormSchema = z.object({
  name: z.string().trim().min(1, "Client name is required"),
  addressStreet: z.string().trim(),
  addressCity: z.string().trim(),
  addressState: z.string().trim(),
  addressZip: z.string().trim(),
  addressCountry: z.string().trim(),
  contactName: z.string().trim(),
  contactEmail: z.string().trim().refine((val) => !val || z.string().email().safeParse(val).success, {
    message: "Enter a valid email address",
  }),
  contactWebsite: z.string().trim(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const defaultFormValues: ClientFormValues = {
  name: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressZip: "",
  addressCountry: "",
  contactName: "",
  contactEmail: "",
  contactWebsite: "",
};

export const ClientSheet: React.FC<ClientSheetProps> = ({
  open,
  onOpenChange,
  mode,
  client,
}) => {
  const { addClient, updateClient, persistClient } = useTimeTracking();

  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    mode: "onBlur",
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && client) {
      form.reset({
        name: client.name,
        addressStreet: client.addressStreet ?? "",
        addressCity: client.addressCity ?? "",
        addressState: client.addressState ?? "",
        addressZip: client.addressZip ?? "",
        addressCountry: client.addressCountry ?? "",
        contactName: client.contactName ?? "",
        contactEmail: client.contactEmail ?? "",
        contactWebsite: client.contactWebsite ?? "",
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsSaving(false);
  }, [open, mode, client, form]);

  const onSubmit = async (values: ClientFormValues) => {
    const data = {
      name: values.name,
      addressStreet: values.addressStreet || undefined,
      addressCity: values.addressCity || undefined,
      addressState: values.addressState || undefined,
      addressZip: values.addressZip || undefined,
      addressCountry: values.addressCountry || undefined,
      contactName: values.contactName || undefined,
      contactEmail: values.contactEmail || undefined,
      contactWebsite: values.contactWebsite || undefined,
    };

    setIsSaving(true);
    try {
      if (mode === "add") {
        const created = addClient(data);
        if (created) await persistClient(created);
        toast({
          title: "Client added",
          description: `"${values.name}" has been added.`,
        });
      } else if (mode === "edit" && client) {
        const updated = updateClient(client.id, data);
        if (updated) await persistClient(updated);
        toast({
          title: "Client saved",
          description: `"${values.name}" has been saved.`,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? "Add Client" : "Edit Client"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Client Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <p className="text-sm font-medium border-b">Address</p>
              <FormField
                control={form.control}
                name="addressStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="addressCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Springfield" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input placeholder="IL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="addressZip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP / Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="62701" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium border-b">Contact</p>
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSaving ? "Saving..." : mode === "add" ? "Add" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
