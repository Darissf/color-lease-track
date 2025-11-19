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

// Build selector variants from raw path to improve matching across roots
function buildSelectorVariants(rawPath: string): string[] {
  const base = toCssSelector(rawPath);
  const variants = new Set<string>();
  variants.add(base);

  // Fallbacks: try :nth-child and index-less paths
  const nthChild = base.replace(/:nth-of-type\(/g, ':nth-child(');
  if (nthChild !== base) variants.add(nthChild);

  const noIndex = base.replace(/\[[0-9]+\]/g, '');
  if (noIndex !== base) variants.add(noIndex);

  const noIndexNthChild = nthChild.replace(/\[[0-9]+\]/g, '');
  if (noIndexNthChild !== nthChild) variants.add(noIndexNthChild);

  // Normalize div#root to #root for robustness
  if (base.startsWith('div#root')) {
    variants.add(base.replace(/^div#root\s*>\s*/, '#root > ').replace(/^div#root/, '#root'));
    variants.add(nthChild.replace(/^div#root\s*>\s*/, '#root > ').replace(/^div#root/, '#root'));
    variants.add(noIndex.replace(/^div#root\s*>\s*/, '#root > ').replace(/^div#root/, '#root'));
    variants.add(noIndexNthChild.replace(/^div#root\s*>\s*/, '#root > ').replace(/^div#root/, '#root'));
  }

  // Add #root scoping if missing
  if (!/^#root\b/.test(base) && !/^div#root\b/.test(base)) {
    variants.add(`#root > ${base}`);
    variants.add(`body > #root > ${base}`);
    variants.add(`#root > ${nthChild}`);
    variants.add(`body > #root > ${nthChild}`);
    variants.add(`#root > ${noIndex}`);
    variants.add(`body > #root > ${noIndex}`);
    variants.add(`#root > ${noIndexNthChild}`);
    variants.add(`body > #root > ${noIndexNthChild}`);
  }

  return Array.from(variants);
}

// Keep strong during this session: ensure DOM reverts are corrected
const observerMap = new Map<string, MutationObserver>();
const desiredMap = new WeakMap<HTMLElement, string>();

async function waitForElement(selector: string, timeoutMs = 8000): Promise<HTMLElement | null> {
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
  // Don't sync elements that should be skipped
  if (el.hasAttribute('data-skip-auto-apply')) {
    return;
  }
  
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

        const variants = buildSelectorVariants(rawPath);
        let el: HTMLElement | null = null;
        let usedSelector = "";

        for (const s of variants) {
          el = (document.querySelector(s) as HTMLElement | null) || await waitForElement(s, 8000);
          if (el) { usedSelector = s; break; }
        }
        if (!el) {
          notFound += 1;
          return;
        }

        // Skip elements with data-skip-auto-apply attribute
        if (el.hasAttribute('data-skip-auto-apply')) {
          skipped += 1;
          return;
        }

        const newValue = String(item.content_value ?? "");
        const current = (el.textContent || "").trim();
        if (current === newValue.trim()) {
          skipped += 1;
          // still ensure future changes remain synced
          keepSynced(usedSelector, el, newValue);
          return;
        }
        try {
          el.textContent = newValue;
          applied += 1;
          keepSynced(usedSelector, el, newValue);
        } catch {
          try {
            (el as any).innerText = newValue;
            applied += 1;
            keepSynced(usedSelector, el, newValue);
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
