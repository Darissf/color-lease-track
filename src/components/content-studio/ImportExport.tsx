import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, FileJson, FileSpreadsheet, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useContentStore } from "@/stores/contentStore";

type ExportFormat = "json" | "csv" | "sql";
type ImportStrategy = "merge" | "replace" | "skip-existing";

export default function ImportExport() {
  const { toast } = useToast();
  const { filters } = useContentStore();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>("merge");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExport = async () => {
    setIsProcessing(true);
    try {
      let query = supabase.from("editable_content").select("*");

      // Apply filters
      if (filters.page !== "all") {
        query = query.eq("page", filters.page);
      }
      if (filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      let content = "";
      let filename = `content-export-${new Date().toISOString()}`;

      switch (exportFormat) {
        case "json":
          content = JSON.stringify(data, null, 2);
          filename += ".json";
          break;

        case "csv":
          if (data && data.length > 0) {
            const headers = Object.keys(data[0]).join(",");
            const rows = data.map((item) =>
              Object.values(item)
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(",")
            );
            content = [headers, ...rows].join("\n");
          }
          filename += ".csv";
          break;

        case "sql":
          content = data
            ?.map(
              (item) =>
                `INSERT INTO editable_content (${Object.keys(item).join(
                  ", "
                )}) VALUES (${Object.values(item)
                  .map((v) => `'${String(v).replace(/'/g, "''")}'`)
                  .join(", ")});`
            )
            .join("\n") || "";
          filename += ".sql";
          break;
      }

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${data?.length} items as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPreviewData(content.slice(0, 500) + "...");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsProcessing(true);
    try {
      const content = await importFile.text();
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        throw new Error("Invalid format: Expected array of objects");
      }

      let inserted = 0;
      let skipped = 0;

      for (const item of data) {
        if (importStrategy === "skip-existing") {
          const { data: existing } = await supabase
            .from("editable_content")
            .select("id")
            .eq("content_key", item.content_key)
            .maybeSingle();

          if (existing) {
            skipped++;
            continue;
          }
        }

        if (importStrategy === "replace") {
          await supabase
            .from("editable_content")
            .delete()
            .eq("content_key", item.content_key);
        }

        const { error } = await supabase.from("editable_content").upsert({
          content_key: item.content_key,
          content_value: item.content_value,
          page: item.page,
          category: item.category,
          is_protected: item.is_protected || false,
        });

        if (!error) inserted++;
      }

      toast({
        title: "Import Successful",
        description: `Imported ${inserted} items${skipped > 0 ? `, skipped ${skipped}` : ""}`,
      });

      setImportFile(null);
      setPreviewData("");
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Import / Export</h2>
        <p className="text-muted-foreground">
          Backup and migrate your content
        </p>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Content
          </CardTitle>
          <CardDescription>
            Export your content in various formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  JSON (recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV (spreadsheet)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sql" id="sql" />
                <Label htmlFor="sql" className="flex items-center gap-2 cursor-pointer">
                  <Database className="h-4 w-4" />
                  SQL (insert statements)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-history">Include History</Label>
            <Switch
              id="include-history"
              checked={includeHistory}
              onCheckedChange={setIncludeHistory}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-metadata">Include Metadata</Label>
            <Switch
              id="include-metadata"
              checked={includeMetadata}
              onCheckedChange={setIncludeMetadata}
            />
          </div>

          <Button onClick={handleExport} disabled={isProcessing} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {isProcessing ? "Exporting..." : "Export Content"}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Content
          </CardTitle>
          <CardDescription>
            Import content from a JSON file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Import Strategy</Label>
            <RadioGroup value={importStrategy} onValueChange={(v) => setImportStrategy(v as ImportStrategy)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge" id="merge" />
                <Label htmlFor="merge" className="cursor-pointer">
                  Merge (update existing, add new)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="cursor-pointer">
                  Replace (overwrite existing)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="skip-existing" id="skip" />
                <Label htmlFor="skip" className="cursor-pointer">
                  Skip Existing (only add new)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {previewData && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Textarea
                value={previewData}
                readOnly
                className="font-mono text-xs h-32"
              />
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!importFile || isProcessing}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? "Importing..." : "Import Content"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
