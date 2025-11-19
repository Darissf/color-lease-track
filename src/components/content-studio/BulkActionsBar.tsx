import { useState } from "react";
import { useContentStore } from "@/stores/contentStore";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Shield, ShieldOff, Download, Tag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function BulkActionsBar() {
  const { selectedIds, clearSelection } = useContentStore();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("editable_content")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedIds.size} items`,
      });
      clearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkProtect = async (protect: boolean) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("editable_content")
        .update({ 
          is_protected: protect,
          protection_reason: protect ? "Bulk protected" : null 
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `${protect ? "Protected" : "Unprotected"} ${selectedIds.size} items`,
      });
      clearSelection();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update protection",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkCategoryChange = async () => {
    if (!newCategory) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("editable_content")
        .update({ category: newCategory })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated category for ${selectedIds.size} items`,
      });
      clearSelection();
      setShowCategoryDialog(false);
      setNewCategory("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      const { data, error } = await supabase
        .from("editable_content")
        .select("*")
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `content-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Exported ${selectedIds.size} items`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export items",
        variant: "destructive",
      });
    }
  };

  if (selectedIds.size === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-card border shadow-lg rounded-lg p-4 flex items-center gap-4">
          <Badge variant="secondary" className="text-base px-3 py-1">
            {selectedIds.size} selected
          </Badge>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryDialog(true)}
              disabled={isProcessing}
            >
              <Tag className="h-4 w-4 mr-2" />
              Category
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkProtect(true)}
              disabled={isProcessing}
            >
              <Shield className="h-4 w-4 mr-2" />
              Protect
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkProtect(false)}
              disabled={isProcessing}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Unprotect
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              disabled={isProcessing}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isProcessing}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected content items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Change Dialog */}
      <AlertDialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Category</AlertDialogTitle>
            <AlertDialogDescription>
              Update category for {selectedIds.size} selected items
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select new category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="navigation">Navigation</SelectItem>
                <SelectItem value="button">Button</SelectItem>
                <SelectItem value="heading">Heading</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkCategoryChange}
              disabled={isProcessing || !newCategory}
            >
              {isProcessing ? "Updating..." : "Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
