import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEditableContent } from "@/contexts/EditableContentContext";

const generateStableKey = (pathname: string, element: Element): string => {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      );
      const index = siblings.indexOf(current);
      path.unshift(`${current.tagName.toLowerCase()}[${index}]`);
    }
    current = parent;
  }

  return `${pathname}::${path.join(">")}`;
};

const isValidTextNode = (text: string): boolean => {
  const trimmed = text.trim();
  return (
    trimmed.length > 3 &&
    !/^[\d\s.,!?;:(){}[\]]+$/.test(trimmed) &&
    !/^[^\w\s]+$/.test(trimmed)
  );
};

export const useAutoCaptureText = () => {
  const { isEditMode, isSuperAdmin } = useEditableContent();
  const location = useLocation();

  useEffect(() => {
    if (!isEditMode || !isSuperAdmin) return;

    const captureTexts = async () => {
      const textNodes: { key: string; value: string; element: Element }[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const text = node.textContent || "";
            if (!isValidTextNode(text)) return NodeFilter.FILTER_REJECT;

            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            // Skip script, style, and editable elements
            const tagName = parent.tagName.toLowerCase();
            if (
              ["script", "style", "textarea", "input", "svg", "path"].includes(tagName) ||
              parent.isContentEditable
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const seenKeys = new Set<string>();
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!parent) continue;

        const text = (node.textContent || "").trim();
        const key = generateStableKey(location.pathname, parent);

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          textNodes.push({ key, value: text, element: parent });
        }
      }

      // Check which keys don't exist yet
      const { data: existing } = await supabase
        .from("editable_content")
        .select("content_key")
        .in(
          "content_key",
          textNodes.map((n) => n.key)
        );

      const existingKeys = new Set(existing?.map((e) => e.content_key) || []);
      const newNodes = textNodes.filter((n) => !existingKeys.has(n.key));

      if (newNodes.length > 0) {
        const inserts = newNodes.map((n) => ({
          content_key: n.key,
          content_value: n.value,
          page: location.pathname,
          category: "auto",
        }));

        await supabase.from("editable_content").insert(inserts);
        console.log(`Auto-captured ${newNodes.length} new text items`);
      }
    };

    // Initial capture
    const timer = setTimeout(captureTexts, 1000);

    // Observe DOM changes
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      setTimeout(captureTexts, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isEditMode, isSuperAdmin, location.pathname]);
};
