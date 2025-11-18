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

export function useContentAutoApply() {
  async function applyForPage(pagePath: string) {
    try {
      const { data, error } = await supabase
        .from("editable_content")
        .select("content_key, content_value, page")
        .eq("page", pagePath);
      if (error) throw error;

      let applied = 0;
      let skipped = 0;
      let notFound = 0;

      (data || []).forEach((item) => {
        const [page, rawPath] = String(item.content_key).split("::");
        if (!rawPath) return;
        // Safety: only apply for current page
        if (page !== pagePath) return;

        const selector = toCssSelector(rawPath);
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) {
          notFound += 1;
          return;
        }
        const newValue = String(item.content_value ?? "");
        const current = (el.textContent || "").trim();
        if (current === newValue.trim()) {
          skipped += 1;
          return;
        }
        try {
          el.textContent = newValue;
          applied += 1;
        } catch {
          // fallback: innerText
          try {
            (el as any).innerText = newValue;
            applied += 1;
          } catch {
            notFound += 1;
          }
        }
      });

      return { applied, skipped, notFound };
    } catch (e) {
      console.error("Auto apply content failed", e);
      throw e;
    }
  }

  return { applyForPage };
}
