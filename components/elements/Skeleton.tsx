import { cn } from "@/lib/cn";

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-xl bg-surface-2 motion-reduce:animate-none", className)} />
);

export const PageSkeleton = () => (
  <div className="container-x flex flex-col gap-6 py-8 md:py-12" aria-busy="true" aria-label="Loading">
    <Skeleton className="h-10 w-56" />
    <Skeleton className="h-5 w-80 max-w-full" />
    <div className="flex flex-col gap-3 pt-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);
