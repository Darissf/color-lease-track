import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

const shortcuts = [
  { keys: ["Ctrl", "B"], action: "Buat budget baru" },
  { keys: ["Ctrl", "E"], action: "Tambah pengeluaran" },
  { keys: ["Ctrl", "S"], action: "Simpan perubahan" },
  { keys: ["Ctrl", "K"], action: "Buka command palette" },
  { keys: ["Esc"], action: "Tutup dialog" },
];

export const KeyboardShortcutsHelp = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Keyboard className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-semibold">Keyboard Shortcuts</h4>
          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{shortcut.action}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-1 bg-muted rounded text-xs font-mono"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
