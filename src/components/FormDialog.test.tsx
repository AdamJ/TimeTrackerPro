import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormDialog } from "@/components/FormDialog";

const renderDialog = (props: Partial<React.ComponentProps<typeof FormDialog>> = {}) => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <FormDialog
      open
      onClose={onClose}
      onSubmit={onSubmit}
      title="Shell"
      description="Shell description"
      submitLabel="Do it"
      {...props}
    >
      <label htmlFor="f">Field</label>
      <input id="f" />
    </FormDialog>,
  );
  return { onClose, onSubmit };
};

describe("FormDialog", () => {
  it("is a named, described modal dialog around a form that the fields validate themselves", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Shell" });
    expect(dialog).toHaveAccessibleDescription("Shell description");
    const form = dialog.querySelector("form");
    expect(form).toHaveAttribute("novalidate");
    // fills the panel on phones so the footer stays at the bottom and an error message never moves the submit button
    expect(form).toHaveClass("flex-1", "flex-col");
  });

  it("submits via the submit button or Enter, and prevents the page reload", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Do it" }));
    await user.type(screen.getByLabelText("Field"), "{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("closes from Cancel and Escape, never submitting", async () => {
    const user = userEvent.setup();
    const { onClose, onSubmit } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables only the submit button when told to", () => {
    renderDialog({ submitDisabled: true });
    expect(screen.getByRole("button", { name: "Do it" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("while submitting, disables both buttons and shows the submitting label", () => {
    renderDialog({ isSubmitting: true, submittingLabel: "Working..." });
    expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("keeps focus in the field when the buttons are pressed, so blur validation can't shift the layout under the click", () => {
    renderDialog();
    for (const name of ["Do it", "Cancel"]) {
      const button = screen.getByRole("button", { name });
      // mousedown's default action is what moves focus (and blurs the field); it must be prevented
      expect(fireEvent.mouseDown(button)).toBe(false);
    }
  });
});
