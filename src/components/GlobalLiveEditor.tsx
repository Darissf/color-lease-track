import { useEffect, useRef } from "react";
import { useEditableContent } from "@/contexts/EditableContentContext";
import { useLocation } from "react-router-dom";

// GlobalLiveEditor makes ALL leaf text elements on the page live-editable when edit mode is ON.
// It also applies saved content values to the DOM for every page without needing to wrap components.
export function GlobalLiveEditor() {
  const { isEditMode, content, updateContent } = useEditableContent();
  const location = useLocation();
  const observerRef = useRef<MutationObserver | null>(null);

  // Build a stable-ish DOM path for an element to serve as a unique key per page
  const getElementPath = (el: Element): string => {
    const parts: string[] = [];
    let current: Element | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const tag = current.tagName.toLowerCase();
      // Prefer IDs when available for stability
      const id = (current as HTMLElement).id ? `#${(current as HTMLElement).id}` : "";
      // Index among siblings of same tag for disambiguation
      let index = 0;
      if (!id) {
        let i = 0;
        let sibling = current.previousElementSibling;
        while (sibling) {
          if (sibling.tagName.toLowerCase() === tag) i++;
          sibling = sibling.previousElementSibling as Element | null;
        }
        index = i;
      }
      const part = id ? `${tag}${id}` : `${tag}[${index}]`;
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(">");
  };

  const hasDirectTextContent = (el: Element): boolean => {
    // Check if element has text nodes as direct children (not just in descendants)
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        return true;
      }
    }
    return false;
  };

  const isEditableElement = (el: Element): boolean => {
    const excludedTags = new Set([
      "SCRIPT", "STYLE", "SVG", "PATH", "TEXTAREA", "INPUT", 
      "SELECT", "OPTION", "BUTTON", "HTML", "HEAD", "BODY"
    ]);
    
    if (excludedTags.has(el.tagName)) return false;
    if ((el as HTMLElement).dataset.nonEditable === "true") return false;
    if ((el as HTMLElement).dataset.globalSkip === "true") return false;
    if ((el as HTMLElement).contentEditable === "true") return false;
    
    // Must have direct text content or be a leaf with text
    const hasText = hasDirectTextContent(el) || (el.childElementCount === 0 && el.textContent?.trim());
    return !!hasText;
  };

  const applySavedContent = (el: Element, key: string) => {
    const saved = content[key];
    if (typeof saved === "string" && saved.length > 0) {
      // Replace text content with saved value
      // Use textContent to avoid injecting HTML
      if (el.textContent !== saved) {
        el.textContent = saved;
      }
    }
  };

  const enableEditable = (el: HTMLElement, key: string) => {
    if (el.dataset.globalEditBound === "true") return;

    el.contentEditable = "true";
    el.dataset.globalEditKey = key;
    el.dataset.globalEditBound = "true";

    // Visual hint similar to EditableText
    el.classList.add(
      "hover:bg-yellow-50",
      "hover:outline",
      "hover:outline-2",
      "hover:outline-yellow-400",
      "rounded",
      "px-1",
      "transition-all"
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
      if (e.key === "Escape") {
        (e.target as HTMLElement).blur();
      }
    };

    const handleBlur = async (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const value = (target.textContent ?? "").trim();
      // Save under current page and auto category
      await updateContent(key, value, location.pathname, "auto");
    };

    el.addEventListener("keydown", handleKeyDown);
    el.addEventListener("blur", handleBlur);

    // Cleanup when edit mode toggles off
    (el as any)._cleanupGlobalLive = () => {
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("blur", handleBlur);
      el.removeAttribute("contenteditable");
      el.classList.remove(
        "hover:bg-yellow-50",
        "hover:outline",
        "hover:outline-2",
        "hover:outline-yellow-400",
        "rounded",
        "px-1",
        "transition-all"
      );
      delete (el as any)._cleanupGlobalLive;
      delete el.dataset.globalEditKey;
      delete el.dataset.globalEditBound;
    };
  };

  const disableEditable = (el: HTMLElement) => {
    const cleanup = (el as any)._cleanupGlobalLive as (() => void) | undefined;
    if (cleanup) cleanup();
  };

  const processAll = () => {
    // Find all elements in the page
    const allElements = Array.from(document.body.querySelectorAll("*"));
    
    for (const el of allElements) {
      if (!isEditableElement(el)) continue;
      
      const htmlEl = el as HTMLElement;
      const key = `${location.pathname}::${getElementPath(el)}`;
      
      // Apply saved content first
      applySavedContent(el, key);
      
      if (!isEditMode) {
        disableEditable(htmlEl);
      } else {
        enableEditable(htmlEl, key);
      }
    }
  };

  useEffect(() => {
    // Use a small delay to let React finish rendering before we process
    const timeoutId = setTimeout(() => {
      processAll();
    }, 100);

    // Observe DOM changes but debounce to avoid conflicts with React
    observerRef.current?.disconnect();
    let debounceTimer: number;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        processAll();
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observerRef.current = observer;

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(debounceTimer);
      observer.disconnect();
      // Cleanup all editable bindings
      const bound = Array.from(document.querySelectorAll("[data-global-edit-bound='true']"));
      for (const el of bound) disableEditable(el as HTMLElement);
    };
  }, [isEditMode, location.pathname, content]);

  return null;
}
