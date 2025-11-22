import { Facebook, Twitter, Link2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export const ShareButtons = ({ url, title }: ShareButtonsProps) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link berhasil disalin!");
  };

  const handleShare = (platform: string) => {
    let shareUrl = "";
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-2">Bagikan:</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleShare("facebook")}
        className="hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors"
      >
        <Facebook className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleShare("twitter")}
        className="hover:bg-sky-500 hover:text-white hover:border-sky-500 transition-colors"
      >
        <Twitter className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleShare("whatsapp")}
        className="hover:bg-green-500 hover:text-white hover:border-green-500 transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopyLink}
        className="hover:bg-sky-blue hover:text-white hover:border-sky-blue transition-colors"
      >
        <Link2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
