
import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="h-[80vh] lg:h-[85vh] relative flex flex-col items-center justify-center bg-card animate-pulse">
        <Skeleton className="h-full w-full absolute inset-0" />
        <div className="relative z-10 text-center px-6 space-y-6 w-full max-w-2xl">
          <Skeleton className="h-16 w-3/4 mx-auto rounded-xl" />
          <Skeleton className="h-6 w-1/2 mx-auto rounded-lg" />
          <div className="flex justify-center gap-4 pt-8">
            <Skeleton className="h-12 w-40 rounded-full" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-16">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="w-full aspect-[4/5] rounded-[2.5rem] mb-8" />
          ))}
        </div>
      </div>
    </div>
  );
}
