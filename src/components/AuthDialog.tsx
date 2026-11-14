import React, { useState } from "react";
import { AuthError } from "@supabase/supabase-js";
import { EyeClosedIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

const ERROR_ID = "auth-error";

// Supabase returns developer-facing messages; translate the common ones into
// something a person can act on.
export function friendlyAuthError(error: AuthError): string {
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email address first. Check your inbox for the confirmation link.";
  }
  if (error.status === 429 || message.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return error.message;
}

export const AuthDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setPassword("");
    setShowPassword(false);
    setError(null);
    onClose();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setError(friendlyAuthError(error));
      return;
    }

    toast({ title: "Signed in", description: "Your data now syncs across devices." });
    setEmail("");
    handleClose();
  };

  const errorProps = error ? { "aria-invalid": true, "aria-describedby": ERROR_ID } : {};

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
          <DialogDescription>Sign in to sync your data across devices.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSignIn}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="signin-email">Email</FieldLabel>
              <Input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                {...errorProps}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="signin-password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="signin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  {...errorProps}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </Button>
              </div>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Field>
            <Field>
              <Button type="button" variant="outline" className="w-full" onClick={handleClose}>
                Use on device
              </Button>
            </Field>
          </FieldGroup>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription id={ERROR_ID}>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};
