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
      "SELECT", "OPTION", "HTML", "HEAD", "BODY"
    ]);

    if (excludedTags.has(el.tagName)) return false;
    const htmlEl = el as HTMLElement;
    if (htmlEl.dataset.nonEditable === "true") return false;
    if (htmlEl.dataset.globalSkip === "true") return false;
    if (htmlEl.contentEditable === "true") return false;
    // Skip any element that is itself or inside an edit-mode control
    if (htmlEl.closest?.("[data-edit-mode-control]")) return false;

    // Allow elements with visible text: either true leaf elements or elements
    // that contain direct text nodes (preserving child elements like icons)
    const text = el.textContent?.trim() ?? "";
    if (!text) return false;
    if (el.childElementCount === 0) return true;
    return hasDirectTextContent(el);
  };
  const applySavedContent = (el: Element, key: string) => {
    const saved = content[key];
    if (typeof saved !== "string" || saved.length === 0) return;

    // If element has no child elements, safe to replace textContent entirely
    if (el.childElementCount === 0) {
      if (el.textContent !== saved) {
        el.textContent = saved;
      }
      return;
    }

    // Preserve child elements (e.g., icons). Update only direct text nodes.
    let updated = false;
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!updated) {
          if (child.textContent !== saved) {
            child.textContent = saved;
          }
          updated = true;
        } else if (child.textContent?.trim()) {
          // Collapse extra text nodes
          child.textContent = "";
        }
      }
    }

    // If no direct text node existed, insert one at the beginning
    if (!updated) {
      el.insertBefore(document.createTextNode(saved), el.firstChild);
    }
  };

  const enableEditable = (el: HTMLElement, key: string) => {
    if (el.dataset.globalEditBound === "true") return;

    el.setAttribute("contenteditable", "plaintext-only");
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

    // Prevent clicks/navigations while editing in edit mode
    // But allow clicks on edit mode controls
    const handleMouseDown = (e: MouseEvent) => {
      if (!isEditMode) return;
      const target = e.target as HTMLElement;
      // Allow clicks on edit mode controls
      if (target.closest('[data-edit-mode-control]')) return;
      // Always stop propagation so parent handlers (like cards/links) don't fire
      e.stopPropagation();
      // Prevent navigation/submission on anchors and buttons
      if (el.tagName === 'BUTTON' || el.tagName === 'A') {
        e.preventDefault();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!isEditMode) return;
      const target = e.target as HTMLElement;
      // Allow clicks on edit mode controls
      if (target.closest('[data-edit-mode-control]')) return;
      // Always stop propagation so parent handlers (like cards/links) don't fire
      e.stopPropagation();
      // Prevent navigation/submission on anchors and buttons
      if (el.tagName === 'BUTTON' || el.tagName === 'A') {
        e.preventDefault();
      }
    };

    el.addEventListener("keydown", handleKeyDown);
    el.addEventListener("blur", handleBlur);
    // Use capture to intercept before parent handlers (e.g., buttons/links)
    el.addEventListener("mousedown", handleMouseDown, true);
    el.addEventListener("click", handleClick, true);

    // Cleanup when edit mode toggles off
    (el as any)._cleanupGlobalLive = () => {
      el.removeEventListener("keydown", handleKeyDown);
      el.removeEventListener("blur", handleBlur);
      el.removeEventListener("mousedown", handleMouseDown, true);
      el.removeEventListener("click", handleClick, true);
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
    // Cleanup all existing bindings first
    const existingBound = Array.from(document.querySelectorAll("[data-global-edit-bound='true']"));
    for (const el of existingBound) {
      disableEditable(el as HTMLElement);
    }

    // Disconnect any existing observer
    observerRef.current?.disconnect();
    observerRef.current = null;

    // Use requestAnimationFrame + setTimeout to ensure React has completely finished rendering
    let rafId: number;
    let timeoutId: number;
    
    rafId = requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        processAll();
      }, 300); // Longer delay to ensure React is done
    });

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      // Cleanup all editable bindings
      const bound = Array.from(document.querySelectorAll("[data-global-edit-bound='true']"));
      for (const el of bound) disableEditable(el as HTMLElement);
    };
  }, [isEditMode, location.pathname, content]);

  return null;
}
