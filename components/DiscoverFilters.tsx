'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface DiscoverFiltersProps {
  genres: string[]
}

export function DiscoverFilters({ genres }: DiscoverFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedGenre = searchParams.get('genre') || ''
  const sortBy = searchParams.get('sort') || 'followers'

  const handleGenreChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('genre', value)
    } else {
      params.delete('genre')
    }
    router.push(`/discover?${params.toString()}`)
  }

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', value)
    router.push(`/discover?${params.toString()}`)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genre Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Filter by Genre
          </label>
          <select
            value={selectedGenre}
            onChange={(e) => handleGenreChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="followers">Most Followers</option>
            <option value="active">Most Active</option>
            <option value="new">Newest Curators</option>
          </select>
        </div>
      </div>
    </div>
  )
}
