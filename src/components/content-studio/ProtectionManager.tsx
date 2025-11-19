import { useState } from "react";
import { Shield, ShieldOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProtectionManagerProps {
  contentId: string;
  contentKey: string;
  isProtected: boolean;
  protectionReason?: string;
  onUpdate: () => void;
}

export default function ProtectionManager({
  contentId,
  contentKey,
  isProtected,
  protectionReason,
  onUpdate,
}: ProtectionManagerProps) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState(protectionReason || "");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleProtection = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("editable_content")
        .update({
          is_protected: !isProtected,
          protection_reason: !isProtected ? reason : null,
        })
        .eq("id", contentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Content ${!isProtected ? "protected" : "unprotected"}`,
      });

      onUpdate();
      setShowDialog(false);
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

  return (
    <>
      <div className="flex items-center gap-2">
        {isProtected ? (
          <>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              Protected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDialog(true)}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Unprotect
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDialog(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Protect Content
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isProtected ? "Unprotect Content" : "Protect Content"}
            </DialogTitle>
            <DialogDescription>
              {isProtected
                ? "Remove protection from this content. It will be affected by auto-apply system."
                : "Protect this content from being modified by the auto-apply system."}
            </DialogDescription>
          </DialogHeader>

          {!isProtected && (
            <div className="space-y-2">
              <Label htmlFor="reason">Protection Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Critical navigation element, User-facing label..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {isProtected && protectionReason && (
            <div className="space-y-2">
              <Label>Current Protection Reason</Label>
              <div className="p-3 rounded-md bg-muted text-sm">
                {protectionReason}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div className="text-sm text-warning-foreground">
              <strong>Content Key:</strong> {contentKey}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleToggleProtection}
              disabled={isProcessing}
              variant={isProtected ? "destructive" : "default"}
            >
              {isProcessing
                ? "Processing..."
                : isProtected
                ? "Unprotect"
                : "Protect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
