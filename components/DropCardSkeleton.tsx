/**
 * Loading skeleton for DropCard component
 * Provides visual feedback while content is loading
 */
export function DropCardSkeleton() {
  return (
    <div
      className="bg-gray-800 rounded-lg p-6 space-y-4 animate-pulse"
      role="status"
      aria-label="Loading music drop"
    >
      {/* Header - User Info Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-700" />
          <div>
            {/* Username */}
            <div className="h-4 bg-gray-700 rounded w-24 mb-2" />
            {/* Stats */}
            <div className="h-3 bg-gray-700 rounded w-32" />
          </div>
        </div>
      </div>

      {/* Track Info Skeleton */}
      <div className="flex gap-4">
        {/* Album Art */}
        <div className="w-[120px] h-[120px] bg-gray-700 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Track Name */}
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-2" />
          {/* Artist Name */}
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
          {/* Album Name */}
          <div className="h-3 bg-gray-700 rounded w-2/3 mb-3" />
          {/* Button */}
          <div className="h-10 bg-gray-700 rounded-lg w-40" />
        </div>
      </div>

      {/* Context Section Skeleton */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="h-4 bg-gray-700 rounded w-32 mb-2" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-700 rounded w-5/6" />
          <div className="h-3 bg-gray-700 rounded w-4/6" />
        </div>
      </div>

      {/* Tags Skeleton */}
      <div className="flex flex-wrap gap-2">
        <div className="h-7 bg-gray-700 rounded-full w-16" />
        <div className="h-7 bg-gray-700 rounded-full w-20" />
        <div className="h-7 bg-gray-700 rounded-full w-14" />
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Loading music drop...</span>
    </div>
  )
}

/**
 * Render multiple skeleton cards for feed loading state
 */
export function DropCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <DropCardSkeleton key={index} />
      ))}
    </>
  )
}
