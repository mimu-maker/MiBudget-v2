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
          merchant: string
          fingerprint: string
          id: string
          description: string | null
          planned: boolean
          recurring: boolean
          status: string
          sub_category: string | null
          updated_at: string
          clean_merchant: string | null
          budget_month: string | null
          suggested_category: string | null
          suggested_sub_category: string | null
          merchant_description: string | null
          excluded: boolean | null
          confidence: number | null
        }
        Insert: {
          account: string
          amount: number
          budget: string
          category: string
          created_at?: string
          date: string
          merchant: string
          fingerprint: string
          id?: string
          description?: string | null
          planned?: boolean
          recurring?: boolean
          status: string
          sub_category?: string | null
          updated_at?: string
          clean_merchant?: string
          budget_month?: string
          suggested_category?: string
          suggested_sub_category?: string
          merchant_description?: string
          excluded?: boolean | null
          confidence?: number | null
        }
        Update: {
          account?: string
          amount?: number
          budget?: string
          category?: string
          created_at?: string
          date?: string
          merchant?: string
          fingerprint?: string
          id?: string
          description?: string | null
          planned?: boolean
          recurring?: boolean
          status?: string
          sub_category?: string | null
          updated_at?: string
          clean_merchant?: string
          budget_month?: string
          suggested_category?: string
          suggested_sub_category?: string
          merchant_description?: string
          excluded?: boolean | null
          confidence?: number | null
        }
        Relationships: []
      }
      merchant_rules: {
        Row: {
          id: string
          clean_merchant_name: string
          auto_category: string | null
          auto_sub_category: string | null
          skip_triage: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clean_merchant_name: string
          auto_category?: string | null
          auto_sub_category?: string | null
          skip_triage?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clean_merchant_name?: string
          auto_category?: string | null
          auto_sub_category?: string | null
          skip_triage?: boolean | null
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
