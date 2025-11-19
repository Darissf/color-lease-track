import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DiscoveredContent {
  id: string;
  element: HTMLElement;
  textContent: string;
  suggestedKey: string;
  page: string;
  category: string;
  selector: string;
  confidence: number;
  approved: boolean;
}

export const useContentAutoDiscovery = () => {
  const [discoveries, setDiscoveries] = useState<DiscoveredContent[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [smartAutoEnabled, setSmartAutoEnabled] = useState(true);
  const [autoSavedCount, setAutoSavedCount] = useState(0);
  const { toast } = useToast();

  const generateIntelligentKey = useCallback((element: HTMLElement, pagePath: string): string => {
    const tagName = element.tagName.toLowerCase();
    const className = element.className || "";
    const id = element.id || "";
    const text = element.textContent?.trim().slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, "_") || "";
    
    // Extract page name from path
    const pageName = pagePath.replace(/^\//, "").replace(/\//g, "_") || "home";
    
    // Determine element type
    let elementType = tagName;
    if (tagName === "h1") elementType = "title";
    else if (tagName.match(/h[2-6]/)) elementType = "heading";
    else if (tagName === "button") elementType = "button";
    else if (className.includes("card")) elementType = "card";
    else if (className.includes("title")) elementType = "title";
    else if (className.includes("description")) elementType = "description";
    else if (tagName === "p") elementType = "text";
    
    // Generate contextual key
    return `${pageName}.${elementType}.${text}`.slice(0, 100);
  }, []);

  const categorizeElement = useCallback((element: HTMLElement): string => {
    const className = element.className || "";
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === "h1" || className.includes("title")) return "titles";
    if (tagName.match(/h[2-6]/) || className.includes("heading")) return "headings";
    if (tagName === "button" || className.includes("button")) return "buttons";
    if (className.includes("card")) return "cards";
    if (className.includes("description")) return "descriptions";
    if (tagName === "p") return "paragraphs";
    if (tagName === "label") return "labels";
    
    return "general";
  }, []);

  const generateSelector = useCallback((element: HTMLElement): string => {
    let selector = element.tagName.toLowerCase();
    if (element.id) selector += `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(" ").filter(c => c && !c.includes("dark"));
      if (classes.length > 0) selector += `.${classes.slice(0, 3).join(".")}`;
    }
    return selector;
  }, []);

  const scanPage = useCallback(async (pagePath: string) => {
    setIsScanning(true);
    
    try {
      // Define selectors to scan
      const selectorsToScan = [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "button:not([aria-label=''])",
        "[class*='title']:not([class*='CardTitle'])",
        "[class*='heading']",
        "[class*='description']",
        "p.text-lg", "p.text-xl",
        "label[for]"
      ];

      const elements = document.querySelectorAll(selectorsToScan.join(", "));
      const discovered: DiscoveredContent[] = [];

      // Fetch existing keys to avoid duplicates
      const { data: existingContent } = await supabase
        .from("editable_content")
        .select("content_key");

      const existingKeys = new Set(existingContent?.map(c => c.content_key) || []);

      elements.forEach((el, index) => {
        const element = el as HTMLElement;
        const text = element.textContent?.trim();
        
        // Skip empty or very short text
        if (!text || text.length < 3) return;
        
        // Skip if already managed by getContent
        if (element.hasAttribute("data-editable-key")) return;

        const suggestedKey = generateIntelligentKey(element, pagePath);
        
        // Skip if key already exists
        if (existingKeys.has(suggestedKey)) return;

        // Calculate confidence based on element characteristics
        let confidence = 0.5;
        if (element.tagName === "H1") confidence = 0.95;
        else if (element.tagName.match(/H[2-3]/)) confidence = 0.85;
        else if (element.tagName === "BUTTON") confidence = 0.8;
        else if (element.className.includes("title")) confidence = 0.9;
        else if (element.className.includes("description")) confidence = 0.75;

        discovered.push({
          id: `discovery-${Date.now()}-${index}`,
          element,
          textContent: text,
          suggestedKey,
          page: pagePath,
          category: categorizeElement(element),
          selector: generateSelector(element),
          confidence,
          approved: false
        });
      });

      // Smart Auto: Auto-save high confidence items (>= 80%)
      if (smartAutoEnabled) {
        const highConfidence = discovered.filter(d => d.confidence >= 0.8);
        const lowConfidence = discovered.filter(d => d.confidence < 0.8);

        if (highConfidence.length > 0) {
          // Auto-save high confidence items
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || '';
          
          const inserts = highConfidence.map(d => ({
            content_key: d.suggestedKey,
            content_value: d.textContent,
            page: d.page,
            category: d.category,
            created_by: userId,
            updated_by: userId,
          }));

          const { error } = await supabase
            .from("editable_content")
            .insert(inserts);

          if (!error) {
            setAutoSavedCount(prev => prev + highConfidence.length);
            toast({
              title: "✨ Smart Auto-Saved",
              description: `${highConfidence.length} high-confidence items saved automatically. ${lowConfidence.length} items need review.`,
            });
          }
        }

        // Only show low confidence items for manual review
        setDiscoveries(lowConfidence);
        return lowConfidence;
      } else {
        setDiscoveries(discovered);
        
        toast({
          title: "Scan Complete",
          description: `Found ${discovered.length} potential content items`,
        });

        return discovered;
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [generateIntelligentKey, categorizeElement, generateSelector, toast]);

  const approveDiscovery = useCallback((id: string) => {
    setDiscoveries(prev => prev.map(d => 
      d.id === id ? { ...d, approved: !d.approved } : d
    ));
  }, []);

  const updateKey = useCallback((id: string, newKey: string) => {
    setDiscoveries(prev => prev.map(d => 
      d.id === id ? { ...d, suggestedKey: newKey } : d
    ));
  }, []);

  const updateCategory = useCallback((id: string, newCategory: string) => {
    setDiscoveries(prev => prev.map(d => 
      d.id === id ? { ...d, category: newCategory } : d
    ));
  }, []);

  const bulkApprove = useCallback((approved: boolean) => {
    setDiscoveries(prev => prev.map(d => ({ ...d, approved })));
  }, []);

  const saveApproved = useCallback(async (userId: string) => {
    const approved = discoveries.filter(d => d.approved);
    
    if (approved.length === 0) {
      toast({
        title: "No Content Selected",
        description: "Please approve at least one item to save",
        variant: "destructive",
      });
      return;
    }

    try {
      const inserts = approved.map(d => ({
        content_key: d.suggestedKey,
        content_value: d.textContent,
        page: d.page,
        category: d.category,
        created_by: userId,
        updated_by: userId,
      }));

      const { error } = await supabase
        .from("editable_content")
        .insert(inserts);

      if (error) throw error;

      toast({
        title: "Content Saved",
        description: `Successfully saved ${approved.length} content items`,
      });

      // Clear approved items
      setDiscoveries(prev => prev.filter(d => !d.approved));
      
      return approved.length;
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return 0;
    }
  }, [discoveries, toast]);

  const clearDiscoveries = useCallback(() => {
    setDiscoveries([]);
  }, []);

  const toggleSmartAuto = useCallback(() => {
    setSmartAutoEnabled(prev => {
      const newValue = !prev;
      toast({
        title: newValue ? "Smart Auto Enabled" : "Smart Auto Disabled",
        description: newValue 
          ? "High-confidence items (≥80%) will be auto-saved"
          : "Content will need manual approval",
      });
      return newValue;
    });
  }, [toast]);

  return {
    discoveries,
    isScanning,
    smartAutoEnabled,
    autoSavedCount,
    scanPage,
    approveDiscovery,
    updateKey,
    updateCategory,
    bulkApprove,
    saveApproved,
    clearDiscoveries,
    toggleSmartAuto,
  };
};
