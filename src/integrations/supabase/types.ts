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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_members: {
        Row: {
          account_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          account_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          account_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      budget_accounts: {
        Row: {
          account_name: string
          account_type: string | null
          budget_id: string
          created_at: string
          id: string
          opening_balance: number
          updated_at: string
        }
        Insert: {
          account_name: string
          account_type?: string | null
          budget_id: string
          created_at?: string
          id?: string
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_type?: string | null
          budget_id?: string
          created_at?: string
          id?: string
          opening_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_accounts_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_category_limits: {
        Row: {
          alert_threshold: number | null
          budget_id: string
          category_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          limit_amount: number
          sub_category_id: string | null
          updated_at: string
        }
        Insert: {
          alert_threshold?: number | null
          budget_id: string
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          limit_amount: number
          sub_category_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_threshold?: number | null
          budget_id?: string
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          limit_amount?: number
          sub_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_category_limits_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_category_limits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_category_limits_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_groups: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_collapsed_by_default: boolean | null
          name: string
          slug: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_collapsed_by_default?: boolean | null
          name: string
          slug: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_collapsed_by_default?: boolean | null
          name?: string
          slug?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_sub_categories: {
        Row: {
          budget_id: string
          created_at: string
          first_used_date: string | null
          id: string
          is_active: boolean
          sub_category_id: string
          updated_at: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          first_used_date?: string | null
          id?: string
          is_active?: boolean
          sub_category_id: string
          updated_at?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          first_used_date?: string | null
          id?: string
          is_active?: boolean
          sub_category_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_sub_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_sub_categories_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          account_id: string
          budget_type: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          period_type: string | null
          start_date: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          account_id: string
          budget_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          period_type?: string | null
          start_date: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Update: {
          account_id?: string
          budget_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          period_type?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          account_id: string
          category_group: string | null
          color: string | null
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          is_system: boolean
          label: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          category_group?: string | null
          color?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_system?: boolean
          label?: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string
          category_group?: string | null
          color?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_system?: boolean
          label?: Database["public"]["Enums"]["expense_label"] | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_rules: {
        Row: {
          account_id: string
          auto_budget: string | null
          auto_category: string | null
          auto_planned: boolean
          auto_recurring: string | null
          auto_sub_category: string | null
          auto_verify: boolean
          clean_name: string
          created_at: string
          id: string
          match_mode: string
          match_type: string
          raw_name: string | null
          secondary_categories: string[] | null
          skip_triage: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          auto_budget?: string | null
          auto_category?: string | null
          auto_planned?: boolean
          auto_recurring?: string | null
          auto_sub_category?: string | null
          auto_verify?: boolean
          clean_name: string
          created_at?: string
          id?: string
          match_mode?: string
          match_type: string
          raw_name?: string | null
          secondary_categories?: string[] | null
          skip_triage?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          auto_budget?: string | null
          auto_category?: string | null
          auto_planned?: boolean
          auto_recurring?: string | null
          auto_sub_category?: string | null
          auto_verify?: boolean
          clean_name?: string
          created_at?: string
          id?: string
          match_mode?: string
          match_type?: string
          raw_name?: string | null
          secondary_categories?: string[] | null
          skip_triage?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classification_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_seed_bcl: {
        Row: {
          alert_threshold: number | null
          budget_id: string
          category_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_percentage: boolean | null
          limit_amount: number
          sub_category_id: string | null
          updated_at: string
        }
        Insert: {
          alert_threshold?: number | null
          budget_id: string
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          limit_amount: number
          sub_category_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_threshold?: number | null
          budget_id?: string
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_percentage?: boolean | null
          limit_amount?: number
          sub_category_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      demo_seed_budgets: {
        Row: {
          account_id: string | null
          budget_type: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          period_type: string | null
          start_date: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          account_id?: string | null
          budget_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          period_type?: string | null
          start_date: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Update: {
          account_id?: string | null
          budget_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          period_type?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      demo_seed_categories: {
        Row: {
          account_id: string | null
          category_group: string | null
          color: string | null
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          is_system: boolean
          label: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          category_group?: string | null
          color?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_system?: boolean
          label?: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_id?: string | null
          category_group?: string | null
          color?: string | null
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_system?: boolean
          label?: Database["public"]["Enums"]["expense_label"] | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      demo_seed_projections: {
        Row: {
          account_id: string | null
          amount: number
          budget_year: number | null
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          merchant: string
          overrides: Json | null
          planned: boolean | null
          recurring: string | null
          scenario_id: string | null
          stream: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          budget_year?: number | null
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          merchant: string
          overrides?: Json | null
          planned?: boolean | null
          recurring?: string | null
          scenario_id?: string | null
          stream?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          budget_year?: number | null
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          merchant?: string
          overrides?: Json | null
          planned?: boolean | null
          recurring?: string | null
          scenario_id?: string | null
          stream?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      demo_seed_sub_categories: {
        Row: {
          budget_amount: number
          category_id: string
          created_at: string
          display_order: number | null
          id: string
          label: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number
          category_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          label?: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          category_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          label?: Database["public"]["Enums"]["expense_label"] | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_seed_transactions: {
        Row: {
          account: string | null
          account_id: string | null
          amount: number
          budget: string
          budget_month: string | null
          budget_year: number | null
          category: string | null
          clean_merchant: string | null
          clean_source: string | null
          confidence: number | null
          created_at: string | null
          date: string
          description: string | null
          entity: string | null
          excluded: boolean | null
          fingerprint: string | null
          id: string
          is_split: boolean | null
          merchant: string
          merchant_description: string | null
          notes: string | null
          parent_id: string | null
          planned: boolean | null
          projection_id: string | null
          recurring: string | null
          status: string
          sub_category: string | null
          suggested_category: string | null
          suggested_sub_category: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account?: string | null
          account_id?: string | null
          amount: number
          budget?: string
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          clean_source?: string | null
          confidence?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string
          is_split?: boolean | null
          merchant: string
          merchant_description?: string | null
          notes?: string | null
          parent_id?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          account?: string | null
          account_id?: string | null
          amount?: number
          budget?: string
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          clean_source?: string | null
          confidence?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string
          is_split?: boolean | null
          merchant?: string
          merchant_description?: string | null
          notes?: string | null
          parent_id?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      income_streams: {
        Row: {
          created_at: string
          expected_amount: number | null
          frequency: string | null
          id: string
          is_active: boolean
          merchant_pattern: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_amount?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          merchant_pattern?: string | null
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          expected_amount?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          merchant_pattern?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_phases: string[] | null
          created_at: string
          current_phase: number | null
          id: string
          import_summary: Json | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_phases?: string[] | null
          created_at?: string
          current_phase?: number | null
          id?: string
          import_summary?: Json | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_phases?: string[] | null
          created_at?: string
          current_phase?: number | null
          id?: string
          import_summary?: Json | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projections: {
        Row: {
          account_id: string
          amount: number
          budget_year: number | null
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          merchant: string
          overrides: Json | null
          planned: boolean | null
          recurring: string | null
          scenario_id: string | null
          stream: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          budget_year?: number | null
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          merchant: string
          overrides?: Json | null
          planned?: boolean | null
          recurring?: string | null
          scenario_id?: string | null
          stream?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          budget_year?: number | null
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          merchant?: string
          overrides?: Json | null
          planned?: boolean | null
          recurring?: string | null
          scenario_id?: string | null
          stream?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projections_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          settings: Json | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      source_rules_backup_20260221: {
        Row: {
          auto_budget: string | null
          auto_category: string | null
          auto_planned: boolean | null
          auto_recurring: string | null
          auto_sub_category: string | null
          clean_source_name: string | null
          created_at: string | null
          id: string | null
          match_mode: string | null
          skip_triage: boolean | null
          source_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_budget?: string | null
          auto_category?: string | null
          auto_planned?: boolean | null
          auto_recurring?: string | null
          auto_sub_category?: string | null
          clean_source_name?: string | null
          created_at?: string | null
          id?: string | null
          match_mode?: string | null
          skip_triage?: boolean | null
          source_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_budget?: string | null
          auto_category?: string | null
          auto_planned?: boolean | null
          auto_recurring?: string | null
          auto_sub_category?: string | null
          clean_source_name?: string | null
          created_at?: string | null
          id?: string | null
          match_mode?: string | null
          skip_triage?: boolean | null
          source_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          created_at: string
          id: string
          is_auto_complete: boolean
          name: string
          recurring: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_auto_complete?: boolean
          name: string
          recurring?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_auto_complete?: boolean
          name?: string
          recurring?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sub_categories: {
        Row: {
          budget_amount: number
          category_id: string
          created_at: string
          display_order: number | null
          id: string
          label: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at: string
        }
        Insert: {
          budget_amount?: number
          category_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          label?: Database["public"]["Enums"]["expense_label"] | null
          name: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          category_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          label?: Database["public"]["Enums"]["expense_label"] | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          id: string
          name: string
          sub_category: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          id?: string
          name: string
          sub_category?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          sub_category?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items_backup_20260204: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          id: string | null
          name: string | null
          sub_category: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          sub_category?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          sub_category?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account: string | null
          account_id: string
          amount: number
          budget: string
          budget_month: string | null
          budget_year: number | null
          category: string | null
          clean_merchant: string | null
          clean_source: string | null
          confidence: number | null
          created_at: string | null
          date: string
          description: string | null
          entity: string | null
          excluded: boolean | null
          fingerprint: string | null
          id: string
          is_split: boolean | null
          merchant: string
          merchant_description: string | null
          notes: string | null
          parent_id: string | null
          planned: boolean | null
          projection_id: string | null
          recurring: string | null
          status: string
          sub_category: string | null
          suggested_category: string | null
          suggested_sub_category: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account?: string | null
          account_id: string
          amount: number
          budget?: string
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          clean_source?: string | null
          confidence?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string
          is_split?: boolean | null
          merchant: string
          merchant_description?: string | null
          notes?: string | null
          parent_id?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          account?: string | null
          account_id?: string
          amount?: number
          budget?: string
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          clean_source?: string | null
          confidence?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string
          is_split?: boolean | null
          merchant?: string
          merchant_description?: string | null
          notes?: string | null
          parent_id?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_projection_id_fkey"
            columns: ["projection_id"]
            isOneToOne: false
            referencedRelation: "projections"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_backup_20260204: {
        Row: {
          account: string | null
          amount: number | null
          budget: string | null
          budget_month: string | null
          budget_year: number | null
          category: string | null
          clean_merchant: string | null
          confidence: number | null
          created_at: string | null
          date: string | null
          description: string | null
          entity: string | null
          excluded: boolean | null
          fingerprint: string | null
          id: string | null
          is_split: boolean | null
          merchant: string | null
          merchant_description: string | null
          notes: string | null
          planned: boolean | null
          projection_id: string | null
          recurring: string | null
          status: string | null
          sub_category: string | null
          suggested_category: string | null
          suggested_sub_category: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account?: string | null
          amount?: number | null
          budget?: string | null
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string | null
          is_split?: boolean | null
          merchant?: string | null
          merchant_description?: string | null
          notes?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string | null
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account?: string | null
          amount?: number | null
          budget?: string | null
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string | null
          is_split?: boolean | null
          merchant?: string | null
          merchant_description?: string | null
          notes?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string | null
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions_backup_20260221: {
        Row: {
          account: string | null
          amount: number | null
          budget: string | null
          budget_month: string | null
          budget_year: number | null
          category: string | null
          clean_merchant: string | null
          clean_source: string | null
          confidence: number | null
          created_at: string | null
          date: string | null
          description: string | null
          entity: string | null
          excluded: boolean | null
          fingerprint: string | null
          id: string | null
          is_split: boolean | null
          merchant: string | null
          merchant_description: string | null
          notes: string | null
          parent_id: string | null
          planned: boolean | null
          projection_id: string | null
          recurring: string | null
          status: string | null
          sub_category: string | null
          suggested_category: string | null
          suggested_sub_category: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account?: string | null
          amount?: number | null
          budget?: string | null
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          clean_source?: string | null
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string | null
          is_split?: boolean | null
          merchant?: string | null
          merchant_description?: string | null
          notes?: string | null
          parent_id?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string | null
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account?: string | null
          amount?: number | null
          budget?: string | null
          budget_month?: string | null
          budget_year?: number | null
          category?: string | null
          clean_merchant?: string | null
          clean_source?: string | null
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          entity?: string | null
          excluded?: boolean | null
          fingerprint?: string | null
          id?: string | null
          is_split?: boolean | null
          merchant?: string | null
          merchant_description?: string | null
          notes?: string | null
          parent_id?: string | null
          planned?: boolean | null
          projection_id?: string | null
          recurring?: string | null
          status?: string | null
          sub_category?: string | null
          suggested_category?: string | null
          suggested_sub_category?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          active_device_id: string | null
          amount_format: string | null
          created_at: string
          currency: string
          current_account_id: string | null
          date_format: string | null
          email: string
          full_name: string
          id: string
          is_setup_complete: boolean
          language: string | null
          onboarding_status: string
          role: string
          show_time: boolean | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_device_id?: string | null
          amount_format?: string | null
          created_at?: string
          currency?: string
          current_account_id?: string | null
          date_format?: string | null
          email: string
          full_name: string
          id?: string
          is_setup_complete?: boolean
          language?: string | null
          onboarding_status?: string
          role?: string
          show_time?: boolean | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_device_id?: string | null
          amount_format?: string | null
          created_at?: string
          currency?: string
          current_account_id?: string | null
          date_format?: string | null
          email?: string
          full_name?: string
          id?: string
          is_setup_complete?: boolean
          language?: string | null
          onboarding_status?: string
          role?: string
          show_time?: boolean | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          accounts: Json
          balancing_sub_category: Json | null
          budget_types: Json
          categories: Json
          category_budgets: Json
          category_configs: Json
          currency: string
          dark_mode: boolean
          id: string
          noise_filters: Json | null
          sub_categories: Json
          sub_category_budgets: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accounts?: Json
          balancing_sub_category?: Json | null
          budget_types?: Json
          categories?: Json
          category_budgets?: Json
          category_configs?: Json
          currency?: string
          dark_mode?: boolean
          id?: string
          noise_filters?: Json | null
          sub_categories?: Json
          sub_category_budgets?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          accounts?: Json
          balancing_sub_category?: Json | null
          budget_types?: Json
          categories?: Json
          category_budgets?: Json
          category_configs?: Json
          currency?: string
          dark_mode?: boolean
          id?: string
          noise_filters?: Json | null
          sub_categories?: Json
          sub_category_budgets?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      carry_forward_sub_categories: {
        Args: { p_budget_id: string }
        Returns: number
      }
      create_scenario_from_master: {
        Args: { p_description: string; p_name: string }
        Returns: string
      }
      get_active_sub_categories: {
        Args: { p_budget_id: string }
        Returns: {
          category_name: string
          first_used_date: string
          is_active: boolean
          sub_category_id: string
          sub_category_name: string
        }[]
      }
      get_hierarchical_categories: {
        Args: { p_budget_id: string }
        Returns: {
          budget_amount: number
          category_group: string
          category_id: string
          category_name: string
          category_order: number
          remaining_amount: number
          spent_amount: number
          sub_categories: Json
        }[]
      }
      get_household_master_user_id: { Args: never; Returns: string }
      get_my_account_id: { Args: never; Returns: string }
      get_my_profile_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      initialize_hierarchical_categories: {
        Args: { p_user_id: string }
        Returns: {
          category_group: string
          category_id: string
          category_name: string
        }[]
      }
      initialize_klintemarken_subcategories: {
        Args: { p_user_id: string }
        Returns: {
          sub_category_id: string
          sub_category_name: string
        }[]
      }
      initialize_special_subcategories: {
        Args: { p_user_id: string }
        Returns: {
          sub_category_id: string
          sub_category_name: string
        }[]
      }
      is_household_member: { Args: never; Returns: boolean }
      reset_demo_account: { Args: never; Returns: undefined }
    }
    Enums: {
      expense_label: "Fixed Committed" | "Variable Essential" | "Discretionary"
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
      expense_label: ["Fixed Committed", "Variable Essential", "Discretionary"],
    },
  },
} as const

