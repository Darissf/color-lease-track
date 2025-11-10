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
    // Avoid nested contenteditables: if an ancestor is already bound, skip
    if (htmlEl.closest?.("[data-global-edit-bound='true']")) return false;

    // Always allow interactive containers even if currently empty
    if (
      el.tagName === "BUTTON" ||
      el.tagName === "A" ||
      htmlEl.getAttribute("role") === "button"
    ) {
      return true;
    }

    // Editable if it's a leaf or it contains direct text nodes (preserving child elements like icons)
    if (el.childElementCount === 0) return true;
    if (hasDirectTextContent(el)) return true;

    return false;
  };
  const applySavedContent = (el: Element, key: string) => {
    const saved = content[key];
    if (saved === undefined || saved === null) return;

    const htmlEl = el as HTMLElement;

    // If this is an interactive container, target the inner wrapper if present
    const isInteractive =
      htmlEl.tagName === "BUTTON" ||
      htmlEl.tagName === "A" ||
      htmlEl.getAttribute("role") === "button";

    const wrapper = isInteractive
      ? (htmlEl.querySelector('[data-global-edit-wrapper="true"]') as HTMLElement | null)
      : null;

    const targetEl = (wrapper ?? htmlEl) as HTMLElement;

    // Get current visible text (innerText strips hidden/script content)
    const currentText = targetEl.innerText?.trim() ?? "";

    // Only update if different
    if (currentText !== saved) {
      // For elements with no children, just update textContent
      if (targetEl.childElementCount === 0) {
        targetEl.textContent = saved;
      } else {
        // For elements with children (like buttons with icons),
        // find and update only the text nodes
        const walker = document.createTreeWalker(
          targetEl,
          NodeFilter.SHOW_TEXT,
          null
        );

        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (node.textContent?.trim()) {
            textNodes.push(node as Text);
          }
        }

        // Replace the first text node with saved content, remove others
        if (textNodes.length > 0) {
          textNodes[0].textContent = saved;
          for (let i = 1; i < textNodes.length; i++) {
            textNodes[i].textContent = "";
          }
        }
      }
    }
  };

  const enableEditable = (el: HTMLElement, key: string) => {
    if (el.dataset.globalEditBound === "true") return;

    const isInteractive =
      el.tagName === "BUTTON" ||
      el.tagName === "A" ||
      el.getAttribute("role") === "button";

    const host = el; // element we mark as bound
    let target: HTMLElement = el; // element we actually make editable

    if (isInteractive) {
      let wrapper = host.querySelector(
        '[data-global-edit-wrapper="true"]'
      ) as HTMLElement | null;

      if (!wrapper) {
        wrapper = document.createElement("span");
        wrapper.setAttribute("data-global-edit-wrapper", "true");

        // Move direct text nodes into wrapper to allow editing just the text
        const textNodes: Node[] = [];
        for (const child of Array.from(host.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) textNodes.push(child);
        }
        if (textNodes.length > 0) {
          textNodes.forEach((n) => wrapper!.appendChild(n));
        } else {
          // Seed with any visible text to ensure caret appears
          wrapper.textContent = host.innerText?.trim() || "";
        }

        // Place wrapper at the start so icons/elements remain intact
        if (host.firstChild) host.insertBefore(wrapper, host.firstChild);
        else host.appendChild(wrapper);
      }

      target = wrapper;
    }

    // Mark the host as bound and key'd
    host.dataset.globalEditKey = key;
    host.dataset.globalEditBound = "true";

    // Make the target contenteditable
    target.contentEditable = "true";
    target.dataset.globalEditKey = key;

    // Visual hint similar to EditableText (on target)
    target.classList.add(
      "hover:bg-yellow-50",
      "hover:outline",
      "hover:outline-2",
      "hover:outline-yellow-400",
      "rounded",
      "px-1",
      "transition-all"
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
        return;
      }
      // Allow spaces and other keys to behave normally inside the editable wrapper
      // No extra prevention here; focusing the wrapper avoids button/anchor activation
    };

    const handleBlur = async (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      const value = (t.innerText ?? "").trim();
      await updateContent(key, value, location.pathname, "auto");
    };

    // Prevent clicks/navigations while editing in edit mode, and keep focus on target
    const handleMouseDown = (e: MouseEvent) => {
      if (!isEditMode) return;
      const t = e.target as HTMLElement;
      if (t.closest('[data-edit-mode-control]')) return;

      e.stopPropagation();

      // Block navigation/submit if host is a link/button
      const linkOrButton = host.closest?.("a, button") || t.closest("a, button");
      if (linkOrButton) {
        e.preventDefault();
      }

      target.focus();
    };

    const handleClick = (e: MouseEvent) => {
      if (!isEditMode) return;
      const t = e.target as HTMLElement;
      if (t.closest('[data-edit-mode-control]')) return;

      e.stopPropagation();

      const linkOrButton = host.closest?.("a, button") || t.closest("a, button");
      if (linkOrButton) {
        e.preventDefault();
      }

      target.focus();
    };

    target.addEventListener("keydown", handleKeyDown);
    target.addEventListener("blur", handleBlur);
    // Use capture to intercept before parent handlers (e.g., buttons/links)
    target.addEventListener("mousedown", handleMouseDown, true);
    target.addEventListener("click", handleClick, true);

    // Cleanup stored on the host element so disableEditable(host) works
    (host as any)._cleanupGlobalLive = () => {
      target.removeEventListener("keydown", handleKeyDown);
      target.removeEventListener("blur", handleBlur);
      target.removeEventListener("mousedown", handleMouseDown, true);
      target.removeEventListener("click", handleClick, true);
      target.removeAttribute("contenteditable");
      target.classList.remove(
        "hover:bg-yellow-50",
        "hover:outline",
        "hover:outline-2",
        "hover:outline-yellow-400",
        "rounded",
        "px-1",
        "transition-all"
      );
      const wrapper = host.querySelector('[data-global-edit-wrapper="true"]') as HTMLElement | null;
      if (wrapper) wrapper.removeAttribute("contenteditable");
      delete (host as any)._cleanupGlobalLive;
      delete host.dataset.globalEditKey;
      delete host.dataset.globalEditBound;
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
