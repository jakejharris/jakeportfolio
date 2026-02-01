import PageLayout from "@/app/components/PageLayout";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function PostLoading() {
  return (
    <PageLayout>
      <div className="max-w-none">
        {/* Main image skeleton */}
        <Skeleton className="mb-6 h-[300px] md:h-[400px] w-full rounded-sm" />

        {/* Title skeleton */}
        <Skeleton className="h-8 md:h-10 w-3/4 mb-2" />

        {/* Meta info skeleton (date, views, tags) */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Excerpt skeleton */}
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-2/3 mb-8" />

        {/* Table of contents skeleton */}
        <div className="mb-8 p-4 border rounded-lg">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </PageLayout>
  );
}
