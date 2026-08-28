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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      adjustment_suggestions: {
        Row: {
          based_on_session_id: string
          created_at: string
          dial_in_thread_id: string
          direction: string
          id: string
          parameter: string
          previous_value: string
          reason: string
          status: string
          suggested_value: string
          user_id: string
        }
        Insert: {
          based_on_session_id: string
          created_at?: string
          dial_in_thread_id: string
          direction: string
          id?: string
          parameter: string
          previous_value: string
          reason: string
          status?: string
          suggested_value: string
          user_id: string
        }
        Update: {
          based_on_session_id?: string
          created_at?: string
          dial_in_thread_id?: string
          direction?: string
          id?: string
          parameter?: string
          previous_value?: string
          reason?: string
          status?: string
          suggested_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_suggestions_owned_session_fkey"
            columns: ["based_on_session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "brew_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "adjustment_suggestions_owned_thread_fkey"
            columns: ["dial_in_thread_id", "user_id"]
            isOneToOne: false
            referencedRelation: "dial_in_threads"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      bean_profiles: {
        Row: {
          altitude: number | null
          created_at: string
          farm: string | null
          id: string
          origin_country_code: string
          process: string
          producer: string | null
          region: string | null
          roast_level: string
          user_id: string
          variety: string | null
        }
        Insert: {
          altitude?: number | null
          created_at?: string
          farm?: string | null
          id?: string
          origin_country_code: string
          process: string
          producer?: string | null
          region?: string | null
          roast_level: string
          user_id: string
          variety?: string | null
        }
        Update: {
          altitude?: number | null
          created_at?: string
          farm?: string | null
          id?: string
          origin_country_code?: string
          process?: string
          producer?: string | null
          region?: string | null
          roast_level?: string
          user_id?: string
          variety?: string | null
        }
        Relationships: []
      }
      brew_plan_steps: {
        Row: {
          brew_plan_id: string
          duration: number | null
          id: string
          note: string | null
          start_time: number
          step_order: number
          step_type: string
          target_water: number | null
        }
        Insert: {
          brew_plan_id: string
          duration?: number | null
          id?: string
          note?: string | null
          start_time: number
          step_order: number
          step_type: string
          target_water?: number | null
        }
        Update: {
          brew_plan_id?: string
          duration?: number | null
          id?: string
          note?: string | null
          start_time?: number
          step_order?: number
          step_type?: string
          target_water?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brew_plan_steps_brew_plan_id_fkey"
            columns: ["brew_plan_id"]
            isOneToOne: false
            referencedRelation: "brew_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_plans: {
        Row: {
          based_on_session_id: string | null
          coffee_dose: number
          coffee_id: string
          created_at: string
          dial_in_thread_id: string
          expected_flavor: string
          grind_level: string
          id: string
          parent_plan_id: string | null
          ratio: number
          recipe_template_id: string | null
          recommendation_reason: string
          recommendation_source: string
          target_brew_time_max: number
          target_brew_time_min: number
          user_id: string
          water_amount: number
          water_temperature: number
        }
        Insert: {
          based_on_session_id?: string | null
          coffee_dose: number
          coffee_id: string
          created_at?: string
          dial_in_thread_id: string
          expected_flavor: string
          grind_level: string
          id?: string
          parent_plan_id?: string | null
          ratio: number
          recipe_template_id?: string | null
          recommendation_reason: string
          recommendation_source: string
          target_brew_time_max: number
          target_brew_time_min: number
          user_id: string
          water_amount: number
          water_temperature: number
        }
        Update: {
          based_on_session_id?: string | null
          coffee_dose?: number
          coffee_id?: string
          created_at?: string
          dial_in_thread_id?: string
          expected_flavor?: string
          grind_level?: string
          id?: string
          parent_plan_id?: string | null
          ratio?: number
          recipe_template_id?: string | null
          recommendation_reason?: string
          recommendation_source?: string
          target_brew_time_max?: number
          target_brew_time_min?: number
          user_id?: string
          water_amount?: number
          water_temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "brew_plans_owned_coffee_fkey"
            columns: ["coffee_id", "user_id"]
            isOneToOne: false
            referencedRelation: "coffees"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "brew_plans_owned_parent_fkey"
            columns: ["parent_plan_id", "user_id"]
            isOneToOne: false
            referencedRelation: "brew_plans"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "brew_plans_owned_session_fkey"
            columns: ["based_on_session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "brew_sessions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "brew_plans_owned_thread_fkey"
            columns: ["dial_in_thread_id", "user_id"]
            isOneToOne: false
            referencedRelation: "dial_in_threads"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "brew_plans_recipe_template_id_fkey"
            columns: ["recipe_template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_session_steps: {
        Row: {
          actual_end_time: number | null
          actual_start_time: number | null
          actual_water: number | null
          brew_plan_step_id: string
          brew_session_id: string
          created_at: string
          id: string
        }
        Insert: {
          actual_end_time?: number | null
          actual_start_time?: number | null
          actual_water?: number | null
          brew_plan_step_id: string
          brew_session_id: string
          created_at?: string
          id?: string
        }
        Update: {
          actual_end_time?: number | null
          actual_start_time?: number | null
          actual_water?: number | null
          brew_plan_step_id?: string
          brew_session_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brew_session_steps_brew_plan_step_id_fkey"
            columns: ["brew_plan_step_id"]
            isOneToOne: false
            referencedRelation: "brew_plan_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_session_steps_brew_session_id_fkey"
            columns: ["brew_session_id"]
            isOneToOne: false
            referencedRelation: "brew_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_sessions: {
        Row: {
          actual_brew_time: number | null
          actual_coffee_dose: number | null
          actual_water_amount: number | null
          actual_water_temperature: number | null
          brew_plan_id: string
          created_at: string
          finished_at: string | null
          id: string
          notes: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          actual_brew_time?: number | null
          actual_coffee_dose?: number | null
          actual_water_amount?: number | null
          actual_water_temperature?: number | null
          brew_plan_id: string
          created_at?: string
          finished_at?: string | null
          id: string
          notes?: string | null
          started_at: string
          status?: string
          user_id: string
        }
        Update: {
          actual_brew_time?: number | null
          actual_coffee_dose?: number | null
          actual_water_amount?: number | null
          actual_water_temperature?: number | null
          brew_plan_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brew_sessions_owned_plan_fkey"
            columns: ["brew_plan_id", "user_id"]
            isOneToOne: false
            referencedRelation: "brew_plans"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      coffees: {
        Row: {
          bean_profile_id: string
          created_at: string
          id: string
          notes: string | null
          product_name: string | null
          purchase_date: string | null
          purchase_place: string | null
          roast_date: string | null
          roaster: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bean_profile_id: string
          created_at?: string
          id?: string
          notes?: string | null
          product_name?: string | null
          purchase_date?: string | null
          purchase_place?: string | null
          roast_date?: string | null
          roaster?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bean_profile_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_name?: string | null
          purchase_date?: string | null
          purchase_place?: string | null
          roast_date?: string | null
          roaster?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffees_owned_bean_profile_fkey"
            columns: ["bean_profile_id", "user_id"]
            isOneToOne: false
            referencedRelation: "bean_profiles"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      dial_in_threads: {
        Row: {
          coffee_id: string
          created_at: string
          id: string
          primary_taste_goal: string
          secondary_taste_goal: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coffee_id: string
          created_at?: string
          id?: string
          primary_taste_goal: string
          secondary_taste_goal?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coffee_id?: string
          created_at?: string
          id?: string
          primary_taste_goal?: string
          secondary_taste_goal?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dial_in_threads_owned_coffee_fkey"
            columns: ["coffee_id", "user_id"]
            isOneToOne: false
            referencedRelation: "coffees"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      recipe_steps: {
        Row: {
          duration: number | null
          id: string
          note: string | null
          recipe_template_id: string
          start_time: number
          step_order: number
          step_type: string
          target_water: number | null
        }
        Insert: {
          duration?: number | null
          id?: string
          note?: string | null
          recipe_template_id: string
          start_time: number
          step_order: number
          step_type: string
          target_water?: number | null
        }
        Update: {
          duration?: number | null
          id?: string
          note?: string | null
          recipe_template_id?: string
          start_time?: number
          step_order?: number
          step_type?: string
          target_water?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_template_id_fkey"
            columns: ["recipe_template_id"]
            isOneToOne: false
            referencedRelation: "recipe_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_templates: {
        Row: {
          brewer_type: string
          created_at: string
          default_grind_level: string
          default_ratio: number
          default_temperature: number
          description: string
          expected_flavor: string
          id: string
          is_public: boolean
          method_type: string
          name: string
          source: string
        }
        Insert: {
          brewer_type: string
          created_at?: string
          default_grind_level: string
          default_ratio: number
          default_temperature: number
          description: string
          expected_flavor: string
          id?: string
          is_public?: boolean
          method_type: string
          name: string
          source: string
        }
        Update: {
          brewer_type?: string
          created_at?: string
          default_grind_level?: string
          default_ratio?: number
          default_temperature?: number
          description?: string
          expected_flavor?: string
          id?: string
          is_public?: boolean
          method_type?: string
          name?: string
          source?: string
        }
        Relationships: []
      }
      taste_feedback: {
        Row: {
          acidity: number | null
          astringent: boolean
          body: number | null
          brew_session_id: string
          clarity: number | null
          complexity: number | null
          created_at: string
          flavor_tags: string[]
          id: string
          juiciness: number | null
          notes: string | null
          overall_rating: number | null
          pretty_good: boolean
          sweetness: number | null
          too_bitter: boolean
          too_sour: boolean
          too_strong: boolean
          too_weak: boolean
          user_id: string
        }
        Insert: {
          acidity?: number | null
          astringent?: boolean
          body?: number | null
          brew_session_id: string
          clarity?: number | null
          complexity?: number | null
          created_at?: string
          flavor_tags?: string[]
          id?: string
          juiciness?: number | null
          notes?: string | null
          overall_rating?: number | null
          pretty_good?: boolean
          sweetness?: number | null
          too_bitter?: boolean
          too_sour?: boolean
          too_strong?: boolean
          too_weak?: boolean
          user_id: string
        }
        Update: {
          acidity?: number | null
          astringent?: boolean
          body?: number | null
          brew_session_id?: string
          clarity?: number | null
          complexity?: number | null
          created_at?: string
          flavor_tags?: string[]
          id?: string
          juiciness?: number | null
          notes?: string | null
          overall_rating?: number | null
          pretty_good?: boolean
          sweetness?: number | null
          too_bitter?: boolean
          too_sour?: boolean
          too_strong?: boolean
          too_weak?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taste_feedback_owned_session_fkey"
            columns: ["brew_session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "brew_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
