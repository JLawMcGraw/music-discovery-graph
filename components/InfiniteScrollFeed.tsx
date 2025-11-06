'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { DropCard } from './DropCard'
import { Drop } from '@/lib/types'

interface InfiniteScrollFeedProps {
  initialDrops: Drop[]
  initialCursor: string | null
  initialHasMore: boolean
  tab: 'following' | 'discover'
  currentUserId?: string
}

export default function InfiniteScrollFeed({
  initialDrops,
  initialCursor,
  initialHasMore,
  tab,
  currentUserId,
}: InfiniteScrollFeedProps) {
  const [drops, setDrops] = useState<Drop[]>(initialDrops)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return

    setLoading(true)

    try {
      const response = await fetch(
        `/api/feed?tab=${tab}&limit=20&cursor=${encodeURIComponent(cursor)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch more drops')
      }

      const data = await response.json()

      setDrops((prev) => [...prev, ...data.drops])
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Failed to load more drops:', error)
    } finally {
      setLoading(false)
    }
  }, [cursor, hasMore, loading, tab])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadMore, hasMore, loading])

  return (
    <div className="space-y-6">
      {/* Drops list */}
      {drops.map((drop) => (
        <DropCard
          key={drop.id}
          drop={drop}
          currentUserId={currentUserId}
        />
      ))}

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Intersection observer target */}
      {hasMore && <div ref={observerTarget} className="h-10" />}

      {/* End of feed message */}
      {!hasMore && drops.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          You've reached the end! 🎵
        </div>
      )}

      {/* Empty state */}
      {drops.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🎵</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No drops yet
          </h3>
          <p className="text-gray-400">
            {tab === 'following'
              ? "Drops from curators you follow will appear here. Try discovering some curators!"
              : "Be the first to share a drop!"}
          </p>
        </div>
      )}
    </div>
  )
}
