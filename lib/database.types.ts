export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      drop_saves: {
        Row: {
          created_at: string | null
          drop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drop_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          drop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drop_saves_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drop_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          album_art_url: string | null
          album_name: string | null
          artist_name: string
          context: string
          created_at: string | null
          external_url: string | null
          genres: string[] | null
          id: string
          listening_notes: string | null
          moods: string[] | null
          platform: string | null
          preview_url: string | null
          save_count: number | null
          track_id: string
          track_name: string
          user_id: string
        }
        Insert: {
          album_art_url?: string | null
          album_name?: string | null
          artist_name: string
          context: string
          created_at?: string | null
          external_url?: string | null
          genres?: string[] | null
          id?: string
          listening_notes?: string | null
          moods?: string[] | null
          platform?: string | null
          preview_url?: string | null
          save_count?: number | null
          track_id: string
          track_name: string
          user_id: string
        }
        Update: {
          album_art_url?: string | null
          album_name?: string | null
          artist_name?: string
          context?: string
          created_at?: string | null
          external_url?: string | null
          genres?: string[] | null
          id?: string
          listening_notes?: string | null
          moods?: string[] | null
          platform?: string | null
          preview_url?: string | null
          save_count?: number | null
          track_id?: string
          track_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drops_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_clicks: {
        Row: {
          clicked_at: string | null
          drop_id: string
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          drop_id: string
          id?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          drop_id?: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_clicks_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          curation_statement: string | null
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          genre_preferences: string[] | null
          id: string
          onboarded: boolean | null
          total_drops: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          curation_statement?: string | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          genre_preferences?: string[] | null
          id: string
          onboarded?: boolean | null
          total_drops?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          curation_statement?: string | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          genre_preferences?: string[] | null
          id?: string
          onboarded?: boolean | null
          total_drops?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      user_genre_stats: {
        Row: {
          activity_level: string | null
          genre: string
          last_drop_at: string | null
          total_drops: number | null
          total_saves_received: number | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          genre: string
          last_drop_at?: string | null
          total_drops?: number | null
          total_saves_received?: number | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          genre?: string
          last_drop_at?: string | null
          total_drops?: number | null
          total_saves_received?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_genre_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_activity_level: {
        Args: {
          drop_count: number
        }
        Returns: string
      }
      get_next_week_reset: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_top_genres: {
        Args: {
          user_uuid: string
        }
        Returns: string[]
      }
      get_weekly_drop_count: {
        Args: {
          user_uuid: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

