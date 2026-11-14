import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthError } from "@supabase/supabase-js";
import { AuthDialog, friendlyAuthError } from "@/components/AuthDialog";

const signIn = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signIn })
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

describe("AuthDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn.mockResolvedValue({ error: null });
  });

  it("does not sign in when the user chooses to use the app on this device", async () => {
    const onClose = vi.fn();
    render(<AuthDialog isOpen onClose={onClose} />);

    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "hunter22");
    await userEvent.click(screen.getByRole("button", { name: "Use on device" }));

    expect(signIn).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("marks the fields for password-manager autofill", () => {
    render(<AuthDialog isOpen onClose={vi.fn()} />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("toggles password visibility", async () => {
    render(<AuthDialog isOpen onClose={vi.fn()} />);
    const password = screen.getByLabelText("Password");

    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");

    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("shows a readable error and links it to the fields", async () => {
    signIn.mockResolvedValue({ error: new AuthError("Invalid login credentials", 400) });
    render(<AuthDialog isOpen onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Email or password is incorrect.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "auth-error");
  });
});

describe("friendlyAuthError", () => {
  it("maps rate limiting", () => {
    expect(friendlyAuthError(new AuthError("Request rate limit reached", 429))).toBe(
      "Too many attempts. Wait a minute and try again."
    );
  });

  it("passes unknown messages through", () => {
    expect(friendlyAuthError(new AuthError("Something odd", 500))).toBe("Something odd");
  });
});
