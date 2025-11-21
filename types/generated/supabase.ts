// This file is auto-generated via scripts/generate-supabase-types.mjs
// Run `npm run refresh-supabase-types` to update it.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alarm_templates: {
        Row: {
          created_at: string
          description: string | null
          download_count: number
          id: string
          metadata: Json
          owner_id: string
          payload: Json
          tags: string[] | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          metadata?: Json
          owner_id: string
          payload: Json
          tags?: string[] | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          metadata?: Json
          owner_id?: string
          payload?: Json
          tags?: string[] | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          calendar_id: string
          client_event_id: string | null
          created_at: string
          description: string | null
          end_at: string
          id: string
          last_modified_by: string | null
          location: string | null
          owner_id: string
          reminders: Json | null
          repeat_rule: Json | null
          source_device_id: string | null
          start_at: string
          timezone: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          all_day?: boolean
          calendar_id: string
          client_event_id?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          last_modified_by?: string | null
          location?: string | null
          owner_id: string
          reminders?: Json | null
          repeat_rule?: Json | null
          source_device_id?: string | null
          start_at: string
          timezone?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          all_day?: boolean
          calendar_id?: string
          client_event_id?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          last_modified_by?: string | null
          location?: string | null
          owner_id?: string
          reminders?: Json | null
          repeat_rule?: Json | null
          source_device_id?: string | null
          start_at?: string
          timezone?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_subscriptions: {
        Row: {
          calendar_id: string
          created_at: string
          granted_by: string | null
          id: string
          last_synced_at: string | null
          revoked_at: string | null
          share_link_id: string | null
          status: string
          subscriber_id: string
          subscription_settings: Json
          updated_at: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          last_synced_at?: string | null
          revoked_at?: string | null
          share_link_id?: string | null
          status?: string
          subscriber_id: string
          subscription_settings?: Json
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          last_synced_at?: string | null
          revoked_at?: string | null
          share_link_id?: string | null
          status?: string
          subscriber_id?: string
          subscription_settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_subscriptions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_subscriptions_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_primary: boolean
          metadata: Json
          owner_id: string
          sharing_policy: Json
          timezone: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_primary?: boolean
          metadata?: Json
          owner_id: string
          sharing_policy?: Json
          timezone?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_primary?: boolean
          metadata?: Json
          owner_id?: string
          sharing_policy?: Json
          timezone?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      routine_templates: {
        Row: {
          created_at: string
          description: string | null
          download_count: number
          id: string
          metadata: Json
          owner_id: string
          payload: Json
          tags: string[] | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          metadata?: Json
          owner_id: string
          payload: Json
          tags?: string[] | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          metadata?: Json
          owner_id?: string
          payload?: Json
          tags?: string[] | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          max_use_count: number
          metadata: Json
          owner_id: string
          policy: Json
          share_scope: Database["public"]["Enums"]["share_scope"]
          status: string
          target_id: string
          target_type: string
          token: string
          updated_at: string
          use_count: number
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          max_use_count?: number
          metadata?: Json
          owner_id: string
          policy?: Json
          share_scope?: Database["public"]["Enums"]["share_scope"]
          status?: string
          target_id: string
          target_type: string
          token: string
          updated_at?: string
          use_count?: number
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          max_use_count?: number
          metadata?: Json
          owner_id?: string
          policy?: Json
          share_scope?: Database["public"]["Enums"]["share_scope"]
          status?: string
          target_id?: string
          target_type?: string
          token?: string
          updated_at?: string
          use_count?: number
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      share_scope: "single_use" | "multi_use" | "open"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      share_scope: ["single_use", "multi_use", "open"],
    },
  },
} as const
