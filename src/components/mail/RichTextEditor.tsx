import { useRef, useCallback, useEffect } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  List, 
  ListOrdered, 
  RemoveFormatting 
} from "lucide-react";
import { useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Tulis pesan Anda di sini...",
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  // Update content when value changes externally (e.g., reply quote)
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleUnorderedList = () => execCommand('insertUnorderedList');
  const handleOrderedList = () => execCommand('insertOrderedList');
  const handleRemoveFormat = () => execCommand('removeFormat');

  // Sanitize URL to prevent XSS attacks
  const sanitizeUrl = (url: string): string => {
    const trimmed = url.trim();
    // Block dangerous protocols
    const dangerous = /^(javascript|data|vbscript|file):/i;
    if (dangerous.test(trimmed)) return '#';
    
    // Escape HTML special characters
    return trimmed.replace(/[\"'<>]/g, (char) => {
      const escapes: Record<string, string> = {
        '"': '&quot;',
        "'": '&#39;',
        '<': '&lt;',
        '>': '&gt;'
      };
      return escapes[char] || char;
    });
  };

  const handleInsertLink = () => {
    if (linkUrl) {
      const safeLinkUrl = sanitizeUrl(linkUrl);
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        execCommand('createLink', safeLinkUrl);
      } else {
        // Insert link with sanitized URL as text
        execCommand('insertHTML', `<a href="${safeLinkUrl}" target="_blank" rel="noopener noreferrer">${safeLinkUrl}</a>`);
      }
      setLinkUrl("");
      setLinkPopoverOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleBold();
          break;
        case 'i':
          e.preventDefault();
          handleItalic();
          break;
        case 'u':
          e.preventDefault();
          handleUnderline();
          break;
      }
    }
  };

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        <Toggle
          size="sm"
          onClick={handleBold}
          aria-label="Bold"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          onClick={handleItalic}
          aria-label="Italic"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          onClick={handleUnderline}
          aria-label="Underline"
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={linkPopoverOpen}
              aria-label="Insert Link"
              title="Insert Link"
            >
              <Link className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <p className="text-sm font-medium">Masukkan URL</p>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLinkPopoverOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleInsertLink}
                  disabled={!linkUrl}
                >
                  Sisipkan
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        <Toggle
          size="sm"
          onClick={handleUnorderedList}
          aria-label="Bullet List"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          onClick={handleOrderedList}
          aria-label="Numbered List"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <div className="w-px h-6 bg-border mx-1" />

        <Toggle
          size="sm"
          onClick={handleRemoveFormat}
          aria-label="Clear Formatting"
          title="Clear Formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[250px] max-h-[400px] overflow-y-auto p-4 focus:outline-none prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          minHeight: '250px',
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
