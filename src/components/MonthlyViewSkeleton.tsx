import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCardSkeleton, ChartSkeleton, PieChartSkeleton, ExpenseItemSkeleton } from "./SkeletonLoader";
import { useAppTheme } from "@/contexts/AppThemeContext";
import { cn } from "@/lib/utils";

export const MonthlyViewLoadingSkeleton = () => {
  const { activeTheme } = useAppTheme();
  
  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden",
      activeTheme === 'japanese'
        ? "bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950"
        : "bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50"
    )}>
      {/* Animated Background Shapes - only for Japanese theme */}
      {activeTheme === 'japanese' && (
        <>
          <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '5s' }} />
        </>
      )}
    
    <div className="relative z-10 max-w-7xl mx-auto space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div>
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <PieChartSkeleton />
        <PieChartSkeleton />
      </div>

      {/* Budget Overview Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-purple-300 to-blue-300 dark:from-purple-600 dark:to-blue-600 animate-pulse" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <ExpenseItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>

      {/* Income from Rental Contracts Skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
    </div>
  );
};
