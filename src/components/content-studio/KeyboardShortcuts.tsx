import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl/Cmd", "K"], description: "Show keyboard shortcuts" },
      { keys: ["Ctrl/Cmd", "S"], description: "Save current content" },
      { keys: ["Ctrl/Cmd", "F"], description: "Focus search" },
      { keys: ["Esc"], description: "Deselect all / Close dialogs" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["↑"], description: "Move up in list" },
      { keys: ["↓"], description: "Move down in list" },
      { keys: ["Enter"], description: "Edit selected item" },
      { keys: ["Ctrl/Cmd", "P"], description: "Toggle preview panel" },
    ],
  },
  {
    title: "Selection",
    shortcuts: [
      { keys: ["Ctrl/Cmd", "A"], description: "Select all visible items" },
      { keys: ["Ctrl/Cmd", "Click"], description: "Multi-select items" },
      { keys: ["Shift", "Click"], description: "Select range" },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { keys: ["Ctrl/Cmd", "Z"], description: "Undo" },
      { keys: ["Ctrl/Cmd", "Shift", "Z"], description: "Redo" },
      { keys: ["Ctrl/Cmd", "F"], description: "Find & Replace" },
      { keys: ["Ctrl/Cmd", "D"], description: "Duplicate content" },
    ],
  },
  {
    title: "Bulk Actions",
    shortcuts: [
      { keys: ["Ctrl/Cmd", "D"], description: "Delete selected" },
      { keys: ["Ctrl/Cmd", "E"], description: "Export selected" },
      { keys: ["Ctrl/Cmd", "Shift", "P"], description: "Protect selected" },
    ],
  },
];

export default function KeyboardShortcuts({
  open,
  onOpenChange,
}: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-3">
                <h4 className="font-semibold text-sm">{group.title}</h4>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <Badge
                            key={keyIndex}
                            variant="secondary"
                            className="font-mono text-xs px-2 py-1"
                          >
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {groupIndex < shortcutGroups.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>Tip: You can customize these shortcuts in Settings</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
