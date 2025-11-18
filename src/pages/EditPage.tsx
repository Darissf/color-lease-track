import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SearchPanel } from "@/components/content-studio/SearchPanel";
import { ContentList } from "@/components/content-studio/ContentList";
import { EditorPanel } from "@/components/content-studio/EditorPanel";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const EditPage = () => {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/");
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI-Powered Content Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced content management with AI assistance
          </p>
        </div>
      </div>

      {/* Search Panel */}
      <SearchPanel />

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-5 gap-4 min-h-0">
        {/* Content List - 2/5 width */}
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <ContentList />
        </Card>

        {/* Editor Panel - 3/5 width */}
        <Card className="col-span-3 flex flex-col overflow-hidden">
          <EditorPanel />
        </Card>
      </div>
    </div>
  );
};

export default EditPage;
