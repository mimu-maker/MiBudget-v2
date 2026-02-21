export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
          account: string
          amount: number
          budget: string
          category: string
          created_at: string
          date: string
          source: string
          fingerprint: string
          id: string
          description: string | null
          planned: boolean
          recurring: boolean
          status: string
          sub_category: string | null
          updated_at: string
          clean_source: string | null
          budget_month: string | null
          suggested_category: string | null
          suggested_sub_category: string | null
          source_description: string | null
          excluded: boolean | null
          confidence: number | null
          projection_id: string | null
        }
        Insert: {
          account: string
          amount: number
          budget: string
          category: string
          created_at?: string
          date: string
          source: string
          fingerprint: string
          id?: string
          description?: string | null
          planned?: boolean
          recurring?: boolean
          status: string
          sub_category?: string | null
          updated_at?: string
          clean_source?: string
          budget_month?: string
          suggested_category?: string
          suggested_sub_category?: string
          source_description?: string
          excluded?: boolean | null
          confidence?: number | null
          projection_id?: string | null
        }
        Update: {
          account?: string
          amount?: number
          budget?: string
          category?: string
          created_at?: string
          date?: string
          source?: string
          fingerprint?: string
          id?: string
          description?: string | null
          planned?: boolean
          recurring?: boolean
          status?: string
          sub_category?: string | null
          updated_at?: string
          clean_source?: string
          budget_month?: string
          suggested_category?: string
          suggested_sub_category?: string
          source_description?: string
          excluded?: boolean | null
          confidence?: number | null
          projection_id?: string | null
        }
        Relationships: []
      }
      source_rules: {
        Row: {
          id: string
          source_name: string | null
          clean_source_name: string
          auto_category: string | null
          auto_sub_category: string | null
          auto_recurring: string | null
          auto_planned: boolean | null
          skip_triage: boolean | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_name?: string | null
          clean_source_name: string
          auto_category?: string | null
          auto_sub_category?: string | null
          auto_recurring?: string | null
          auto_planned?: boolean | null
          skip_triage?: boolean | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_name?: string | null
          clean_source_name?: string
          auto_category?: string | null
          auto_sub_category?: string | null
          auto_recurring?: string | null
          auto_planned?: boolean | null
          skip_triage?: boolean | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projections: {
        Row: {
          id: string
          date: string
          source: string | null
          amount: number
          category: string | null
          stream: string | null
          planned: boolean | null
          recurring: string | null
          overrides: Json | null
          budget_year: number | null
          description: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          source?: string | null
          amount: number
          category?: string | null
          stream?: string | null
          planned?: boolean | null
          recurring?: string | null
          overrides?: Json | null
          budget_year?: number | null
          description?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          source?: string | null
          amount?: number
          category?: string | null
          stream?: string | null
          planned?: boolean | null
          recurring?: string | null
          overrides?: Json | null
          budget_year?: number | null
          description?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          name: string
          year: number
          budget_type: string
          start_date: string
          is_active: boolean
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          year: number
          budget_type: string
          start_date: string
          is_active?: boolean
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          year?: number
          budget_type?: string
          start_date?: string
          is_active?: boolean
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
          updated_at: string
          label: Database["public"]["Enums"]["expense_label"] | null
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
          updated_at?: string
          label?: Database["public"]["Enums"]["expense_label"] | null
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          label?: Database["public"]["Enums"]["expense_label"] | null
        }
        Relationships: []
      }
      sub_categories: {
        Row: {
          id: string
          name: string
          category_id: string
          budget_amount: number
          spent: number
          is_active: boolean
          first_used_date: string
          created_at?: string
          updated_at?: string
          label: Database["public"]["Enums"]["expense_label"] | null
        }
        Update: {
          id?: string
          name?: string
          category_id?: string
          budget_amount?: number
          created_at?: string
          updated_at?: string
          label?: Database["public"]["Enums"]["expense_label"] | null
        }
        Relationships: []
      }
      budget_category_limits: {
        Row: {
          id: string
          budget_id: string
          category_id: string
          limit_amount: number
          alert_threshold: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          budget_id: string
          category_id: string
          limit_amount: number
          alert_threshold: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          budget_id?: string
          category_id?: string
          limit_amount?: number
          alert_threshold?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_sub_categories: {
        Row: {
          budget_id: string
          sub_category_id: string
          is_active: boolean
          first_used_date: string | null
        }
        Insert: {
          budget_id: string
          sub_category_id: string
          is_active?: boolean
          first_used_date?: string | null
        }
        Update: {
          budget_id?: string
          sub_category_id?: string
          is_active?: boolean
          first_used_date?: string | null
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
      expense_label: "Fixed Committed" | "Variable Essential" | "Discretionary"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
