import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  LayoutDashboardIcon,
  Kanban,
  FolderOpen,
  Tag,
  Users,
  Archive,
  CogIcon,
  Brain,
  ClipboardList,
  Save,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { setPendingMenuAction } from "@/lib/electronMenuActions";
import { modKey } from "@/lib/platform";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const destinations = [
  { title: "Dashboard", to: "/", icon: LayoutDashboardIcon },
  { title: "Tasks", to: "/tasks", icon: Kanban },
  { title: "Projects", to: "/projectlist", icon: FolderOpen },
  { title: "Categories", to: "/categories", icon: Tag },
  { title: "Clients", to: "/clients", icon: Users },
  { title: "Archive", to: "/archive", icon: Archive },
  { title: "Settings", to: "/settings", icon: CogIcon },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange, onSave }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const runAndClose = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Jump to a page or run a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              runAndClose(() => {
                setPendingMenuAction("new-task");
                navigate("/");
              })
            }
          >
            <ClipboardList />
            <span>New Task</span>
            <CommandShortcut>
              <KbdGroup>
                <Kbd>{modKey}</Kbd>
                <Kbd>N</Kbd>
              </KbdGroup>
            </CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(onSave)}>
            <Save />
            <span>Save Changes</span>
            <CommandShortcut>
              <KbdGroup>
                <Kbd>{modKey}</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          {destinations.map((destination) => (
            <CommandItem
              key={destination.to}
              value={destination.title}
              onSelect={() => runAndClose(() => navigate(destination.to))}
            >
              <destination.icon />
              <span>{destination.title}</span>
            </CommandItem>
          ))}
          {isAuthenticated && (
            <CommandItem value="Weekly Report" onSelect={() => runAndClose(() => navigate("/report"))}>
              <Brain />
              <span>Weekly Report</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
