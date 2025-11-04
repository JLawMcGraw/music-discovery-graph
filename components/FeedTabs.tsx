'use client'

import Link from 'next/link'

interface FeedTabsProps {
  activeTab: 'following' | 'discover'
}

export default function FeedTabs({ activeTab }: FeedTabsProps) {
  return (
    <div className="flex gap-2 border-b border-gray-700">
      <Link
        href="/feed?tab=following"
        className={`px-6 py-3 font-semibold transition-colors ${
          activeTab === 'following'
            ? 'text-purple-400 border-b-2 border-purple-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Following
      </Link>
      <Link
        href="/feed?tab=discover"
        className={`px-6 py-3 font-semibold transition-colors ${
          activeTab === 'discover'
            ? 'text-purple-400 border-b-2 border-purple-400'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Discover
      </Link>
    </div>
  )
}
