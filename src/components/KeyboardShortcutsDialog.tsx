import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { modKey } from "@/lib/platform";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts: { keys: string[]; description: string }[] = [
  { keys: [modKey, "N"], description: "Create a new task" },
  { keys: [modKey, "S"], description: "Save changes" },
  { keys: [modKey, "K"], description: "Jump to a page or command" },
  { keys: ["?"], description: "Show this list of shortcuts" },
];

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Work faster without leaving your keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {shortcuts.map((shortcut) => (
            <li key={shortcut.description} className="flex items-center justify-between gap-4">
              <span className="text-sm text-foreground">{shortcut.description}</span>
              <KbdGroup>
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
