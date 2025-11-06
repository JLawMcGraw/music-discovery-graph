/**
 * Shared type definitions for the application
 */

export interface Drop {
  id: string
  user_id: string
  track_name: string
  artist_name: string
  album_name: string | null
  album_art_url: string | null
  external_url: string | null
  preview_url: string | null
  platform: string
  context: string
  listening_notes: string | null
  genres: string[] | null
  mood_tags: string[] | null
  created_at: string
  profiles: {
    username: string
    display_name?: string | null
    avatar_url: string | null
    follower_count: number
  }
  is_saved?: boolean
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  curation_statement: string | null
  avatar_url: string | null
  genre_preferences: string[] | null
  follower_count: number
  following_count: number
  total_drops: number
  onboarded: boolean
  created_at: string
  updated_at: string
}

export interface Curator {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  curation_statement: string | null
  avatar_url: string | null
  follower_count: number
  following_count: number
  total_drops: number
  genre_preferences: string[]
  top_genres: string[]
  created_at: string
}
