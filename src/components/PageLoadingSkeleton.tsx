import { Skeleton } from "@/components/ui/skeleton";

interface PageLoadingSkeletonProps {
  variant?: "full" | "content";
}

const PageLoadingSkeleton = ({ variant = "full" }: PageLoadingSkeletonProps) => {
  if (variant === "content") {
    // Content-only skeleton for inside Layout
    return (
      <div className="p-6 space-y-6 animate-pulse">
        {/* Page Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg border bg-card">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-lg border bg-card">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-card">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full page skeleton with simulated sidebar
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex w-64 flex-col border-r bg-card p-4 space-y-4">
        <Skeleton className="h-10 w-32 mb-6" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="h-14 border-b bg-card px-4 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 p-6 space-y-6 animate-pulse">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg border bg-card">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
          
          <div className="p-4 rounded-lg border bg-card">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoadingSkeleton;
