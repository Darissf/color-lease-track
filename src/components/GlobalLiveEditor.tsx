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

  const isLeafTextElement = (el: Element) => {
    if (
      el.tagName === "SCRIPT" ||
      el.tagName === "STYLE" ||
      el.tagName === "SVG" ||
      el.tagName === "PATH" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "INPUT"
    ) return false;

    if ((el as HTMLElement).dataset.nonEditable === "true") return false;

    // Only leaf elements (no child elements) to avoid breaking nested structures
    if (el.childElementCount > 0) return false;

    const text = el.textContent?.trim() ?? "";
    return text.length > 0;
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
    // Wrap all text nodes across the page so EVERY piece of text becomes editable
    const excludedTags = new Set(["SCRIPT", "STYLE", "SVG", "PATH", "TEXTAREA", "INPUT"]);

    const shouldSkip = (el: Element | null): boolean => {
      let cur: Element | null = el;
      while (cur && cur !== document.body) {
        const tag = cur.tagName?.toUpperCase();
        if (tag && excludedTags.has(tag)) return true;
        if ((cur as HTMLElement).dataset.nonEditable === "true") return true;
        if ((cur as HTMLElement).dataset.globalSkip === "true") return true;
        if ((cur as HTMLElement).isContentEditable) return true;
        cur = cur.parentElement;
      }
      return false;
    };

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const text = node.nodeValue?.trim() ?? "";
          if (!text) return NodeFilter.FILTER_REJECT;
          const parent = (node as Text).parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
          if (parent.closest('[data-global-text-wrapper="true"]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const toWrap: Text[] = [];
    let current: Node | null;
    while ((current = walker.nextNode())) {
      toWrap.push(current as Text);
    }

    for (const textNode of toWrap) {
      const span = document.createElement("span");
      span.dataset.globalTextWrapper = "true";
      textNode.parentNode?.insertBefore(span, textNode);
      span.appendChild(textNode);
    }

    const wrappers = Array.from(
      document.querySelectorAll<HTMLElement>('span[data-global-text-wrapper="true"]')
    );

    for (const el of wrappers) {
      const key = `${location.pathname}::${getElementPath(el)}`;
      applySavedContent(el, key);
      if (!isEditMode) {
        disableEditable(el);
      } else {
        enableEditable(el, key);
      }
    }
  };

  useEffect(() => {
    // Initial run
    processAll();

    // Observe DOM changes to re-apply behavior after React re-renders
    observerRef.current?.disconnect();
    const observer = new MutationObserver(() => {
      processAll();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      // Cleanup all editable bindings
      const bound = Array.from(document.querySelectorAll("[data-global-edit-bound='true']"));
      for (const el of bound) disableEditable(el as HTMLElement);
    };
    // Re-run when edit mode toggles, route changes, or content map updates
  }, [isEditMode, location.pathname, content]);

  return null;
}
