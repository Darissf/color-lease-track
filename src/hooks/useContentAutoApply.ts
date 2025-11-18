import { supabase } from "@/integrations/supabase/client";

function toCssSelector(domPath: string): string {
  // Convert custom path like "div#root>div[1]>span[0]" to CSS selector
  // Rules:
  // - Keep ids/classes as-is (div#root, .class)
  // - Convert tag[index] where index is 0-based to :nth-of-type(index+1)
  const parts = domPath.split(">").map((seg) => seg.trim()).filter(Boolean);
  const conv = parts.map((seg) => {
    // e.g., "div#root" (no index)
    if (!seg.includes("[")) return seg;
    const match = seg.match(/^(?<tag>[a-zA-Z0-9#.-]+)\[(?<idx>\d+)\]$/);
    if (!match || !match.groups) return seg;
    const tag = match.groups.tag;
    const idx = Number(match.groups.idx);
    return `${tag}:nth-of-type(${idx + 1})`;
  });
  return conv.join(" > ");
}

// Keep strong during this session: ensure DOM reverts are corrected
const observerMap = new Map<string, MutationObserver>();
const desiredMap = new WeakMap<HTMLElement, string>();

async function waitForElement(selector: string, timeoutMs = 4000): Promise<HTMLElement | null> {
  const start = performance.now();
  return new Promise((resolve) => {
    function check() {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) return resolve(el);
      if (performance.now() - start >= timeoutMs) return resolve(null);
      requestAnimationFrame(check);
    }
    check();
  });
}

function keepSynced(selector: string, el: HTMLElement, value: string) {
  desiredMap.set(el, value);
  el.setAttribute("data-auto-applied", "true");
  const existing = observerMap.get(selector);
  if (existing) return; // already observing

  const parent = el.parentElement ?? document.body;
  const obs = new MutationObserver(() => {
    const target = document.querySelector(selector) as HTMLElement | null;
    if (!target) return;
    const desired = desiredMap.get(target) ?? value;
    if ((target.textContent || "").trim() !== desired.trim()) {
      target.textContent = desired;
    }
  });
  obs.observe(parent, { subtree: true, childList: true, characterData: true });
  observerMap.set(selector, obs);
}

export function useContentAutoApply() {
  async function applyForPage(pagePath: string) {
    try {
      const { data, error } = await supabase
        .from("editable_content")
        .select("content_key, content_value, page, updated_at")
        .eq("page", pagePath);
      if (error) throw error;

      let applied = 0;
      let skipped = 0;
      let notFound = 0;

      await Promise.all((data || []).map(async (item) => {
        const [page, rawPath] = String(item.content_key).split("::");
        if (!rawPath) return;
        if (page !== pagePath) return;
        const selector = toCssSelector(rawPath);

        // Wait if element not mounted yet (charts, async sections, etc.)
        let el = (document.querySelector(selector) as HTMLElement | null) || await waitForElement(selector, 4000);
        if (!el) {
          notFound += 1;
          return;
        }

        const newValue = String(item.content_value ?? "");
        const current = (el.textContent || "").trim();
        if (current === newValue.trim()) {
          skipped += 1;
          // still ensure future changes remain synced
          keepSynced(selector, el, newValue);
          return;
        }
        try {
          el.textContent = newValue;
          applied += 1;
          keepSynced(selector, el, newValue);
        } catch {
          try {
            (el as any).innerText = newValue;
            applied += 1;
            keepSynced(selector, el, newValue);
          } catch {
            notFound += 1;
          }
        }
      }));

      return { applied, skipped, notFound };
    } catch (e) {
      console.error("Auto apply content failed", e);
      throw e;
    }
  }

  return { applyForPage };
}
