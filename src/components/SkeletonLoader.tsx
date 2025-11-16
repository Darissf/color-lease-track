import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const StatCardSkeleton = () => (
  <Card className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
         style={{ backgroundSize: '200% 100%' }} />
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="relative h-[300px] flex items-end justify-around gap-2 p-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-full bg-gradient-to-t from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-t animate-pulse"
            style={{
              height: `${Math.random() * 60 + 40}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const PieChartSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-center h-[300px]">
        <div className="relative">
          <div className="h-48 w-48 rounded-full border-[24px] border-gray-200 dark:border-gray-700 animate-pulse" />
          <div className="absolute inset-0 h-48 w-48 rounded-full border-[24px] border-t-purple-300 border-r-blue-300 border-b-pink-300 border-l-green-300 dark:border-t-purple-600 dark:border-r-blue-600 dark:border-b-pink-600 dark:border-l-green-600 animate-spin"
               style={{ animationDuration: '3s' }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ExpenseItemSkeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
  </div>
);

export const BudgetSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-purple-300 to-blue-300 dark:from-purple-600 dark:to-blue-600 animate-pulse" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const QuickActionsSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </CardContent>
  </Card>
);

export const DashboardLoadingSkeleton = () => (
  <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950">
    {/* Animated Background Shapes */}
    <div className="absolute top-20 right-20 w-96 h-96 bg-purple-300/30 dark:bg-purple-500/20 rounded-full blur-3xl animate-float" />
    <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-300/30 dark:bg-blue-500/20 rounded-full blur-3xl animate-float-delayed" />
    <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-300/20 dark:bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '5s' }} />
    
    <div className="relative z-10 p-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-[180px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Monthly Trend Skeleton */}
      <div className="mb-8">
        <ChartSkeleton />
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <ChartSkeleton />
        <PieChartSkeleton />
      </div>

      {/* Budget and Expenses Row Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <BudgetSkeleton />
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
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <QuickActionsSkeleton />
      </div>
    </div>
  </div>
);
