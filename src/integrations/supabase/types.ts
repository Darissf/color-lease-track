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
      ai_content_suggestions: {
        Row: {
          applied: boolean | null
          confidence_score: number | null
          content_key: string
          created_at: string | null
          id: string
          original_content: string
          suggested_content: string
          suggestion_type: string
        }
        Insert: {
          applied?: boolean | null
          confidence_score?: number | null
          content_key: string
          created_at?: string | null
          id?: string
          original_content: string
          suggested_content: string
          suggestion_type: string
        }
        Update: {
          applied?: boolean | null
          confidence_score?: number | null
          content_key?: string
          created_at?: string | null
          id?: string
          original_content?: string
          suggested_content?: string
          suggestion_type?: string
        }
        Relationships: []
      }
      ai_custom_tools: {
        Row: {
          created_at: string | null
          description: string | null
          endpoint_url: string | null
          function_definition: Json
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          endpoint_url?: string | null
          function_definition: Json
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          endpoint_url?: string | null
          function_definition?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_memory: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          importance: number | null
          memory_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          memory_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          memory_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personas: {
        Row: {
          avatar_emoji: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          system_prompt: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_emoji?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          system_prompt: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_emoji?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          system_prompt?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_analytics: {
        Row: {
          ai_provider: string
          conversation_id: string | null
          cost_estimate: number | null
          created_at: string
          error_message: string | null
          id: string
          model_name: string
          request_tokens: number | null
          response_time_ms: number | null
          response_tokens: number | null
          status: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          ai_provider: string
          conversation_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_name: string
          request_tokens?: number | null
          response_time_ms?: number | null
          response_tokens?: number | null
          status?: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          ai_provider?: string
          conversation_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_name?: string
          request_tokens?: number | null
          response_time_ms?: number | null
          response_tokens?: number | null
          status?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_history: {
        Row: {
          alert_id: string | null
          category: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          monthly_budget_id: string | null
          severity: string
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          category?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          monthly_budget_id?: string | null
          severity: string
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          category?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          monthly_budget_id?: string | null
          severity?: string
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "budget_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_history_monthly_budget_id_fkey"
            columns: ["monthly_budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_account_balance_history: {
        Row: {
          bank_account_id: string
          bank_name: string
          change_amount: number | null
          change_type: string | null
          created_at: string
          id: string
          new_balance: number
          notes: string | null
          old_balance: number
          user_id: string
        }
        Insert: {
          bank_account_id: string
          bank_name: string
          change_amount?: number | null
          change_type?: string | null
          created_at?: string
          id?: string
          new_balance: number
          notes?: string | null
          old_balance: number
          user_id: string
        }
        Update: {
          bank_account_id?: string
          bank_name?: string
          change_amount?: number | null
          change_type?: string | null
          created_at?: string
          id?: string
          new_balance?: number
          notes?: string | null
          old_balance?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_account_balance_history_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_holder_name: string | null
          account_number: string
          account_type: string
          balance: number | null
          bank_name: string
          created_at: string
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number: string
          account_type?: string
          balance?: number | null
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string
          account_type?: string
          balance?: number | null
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_alerts: {
        Row: {
          alert_type: string
          category: string | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_triggered_at: string | null
          monthly_budget_id: string | null
          notification_method: string | null
          threshold_percentage: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_triggered_at?: string | null
          monthly_budget_id?: string | null
          notification_method?: string | null
          threshold_percentage?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_triggered_at?: string | null
          monthly_budget_id?: string | null
          notification_method?: string | null
          threshold_percentage?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_alerts_monthly_budget_id_fkey"
            columns: ["monthly_budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_automation_rules: {
        Row: {
          configuration: Json
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_executed_at: string | null
          rule_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          configuration: Json
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_executed_at?: string | null
          rule_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_executed_at?: string | null
          rule_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budget_templates: {
        Row: {
          category_allocations: Json
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          is_public: boolean | null
          template_name: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category_allocations: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category_allocations?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          is_public?: boolean | null
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          allocated_amount: number
          category: string
          created_at: string | null
          id: string
          monthly_budget_id: string | null
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allocated_amount?: number
          category: string
          created_at?: string | null
          id?: string
          monthly_budget_id?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allocated_amount?: number
          category?: string
          created_at?: string | null
          id?: string
          monthly_budget_id?: string | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_monthly_budget_id_fkey"
            columns: ["monthly_budget_id"]
            isOneToOne: false
            referencedRelation: "monthly_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          message_id: string | null
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_bookmarks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          ai_provider: string
          created_at: string
          folder: string | null
          id: string
          is_active: boolean | null
          message_count: number | null
          model_name: string
          persona_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_provider: string
          created_at?: string
          folder?: string | null
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          model_name: string
          persona_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_provider?: string
          created_at?: string
          folder?: string | null
          id?: string
          is_active?: boolean | null
          message_count?: number | null
          model_name?: string
          persona_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "ai_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_documents: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          extracted_text: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          storage_path: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          storage_path: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_documents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string | null
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_groups: {
        Row: {
          created_at: string
          has_whatsapp: boolean | null
          icon: string | null
          id: string
          ktp_files: Json | null
          nama: string
          nomor_telepon: string
          updated_at: string
          user_id: string
          whatsapp_checked_at: string | null
        }
        Insert: {
          created_at?: string
          has_whatsapp?: boolean | null
          icon?: string | null
          id?: string
          ktp_files?: Json | null
          nama: string
          nomor_telepon: string
          updated_at?: string
          user_id: string
          whatsapp_checked_at?: string | null
        }
        Update: {
          created_at?: string
          has_whatsapp?: boolean | null
          icon?: string | null
          id?: string
          ktp_files?: Json | null
          nama?: string
          nomor_telepon?: string
          updated_at?: string
          user_id?: string
          whatsapp_checked_at?: string | null
        }
        Relationships: []
      }
      content_analysis: {
        Row: {
          analyzed_at: string | null
          analyzed_by: string | null
          content_key: string
          duplicates: Json | null
          id: string
          readability_score: number | null
          seo_score: number | null
          suggestions: Json | null
          tone: string | null
        }
        Insert: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          content_key: string
          duplicates?: Json | null
          id?: string
          readability_score?: number | null
          seo_score?: number | null
          suggestions?: Json | null
          tone?: string | null
        }
        Update: {
          analyzed_at?: string | null
          analyzed_by?: string | null
          content_key?: string
          duplicates?: Json | null
          id?: string
          readability_score?: number | null
          seo_score?: number | null
          suggestions?: Json | null
          tone?: string | null
        }
        Relationships: []
      }
      content_comments: {
        Row: {
          comment: string
          content_key: string
          created_at: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          comment: string
          content_key: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          content_key?: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_file_mapping: {
        Row: {
          component_name: string | null
          content_key: string
          file_path: string
          id: string
          last_scanned: string | null
          line_number: number | null
        }
        Insert: {
          component_name?: string | null
          content_key: string
          file_path: string
          id?: string
          last_scanned?: string | null
          line_number?: number | null
        }
        Update: {
          component_name?: string | null
          content_key?: string
          file_path?: string
          id?: string
          last_scanned?: string | null
          line_number?: number | null
        }
        Relationships: []
      }
      content_history: {
        Row: {
          category: string
          content_key: string
          content_value: string
          created_at: string
          id: string
          page: string
          user_id: string
          version_number: number
        }
        Insert: {
          category?: string
          content_key: string
          content_value: string
          created_at?: string
          id?: string
          page: string
          user_id: string
          version_number?: number
        }
        Update: {
          category?: string
          content_key?: string
          content_value?: string
          created_at?: string
          id?: string
          page?: string
          user_id?: string
          version_number?: number
        }
        Relationships: []
      }
      content_render_stats: {
        Row: {
          content_key: string
          created_at: string
          id: string
          last_seen_at: string
          page: string
          rendered_value: string
          user_id: string
        }
        Insert: {
          content_key: string
          created_at?: string
          id?: string
          last_seen_at?: string
          page: string
          rendered_value: string
          user_id: string
        }
        Update: {
          content_key?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          page?: string
          rendered_value?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_sharing: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_public: boolean | null
          share_token: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_token: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sharing_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      database_backups: {
        Row: {
          backup_size_kb: number | null
          commit_url: string | null
          created_at: string
          error_message: string | null
          file_path: string | null
          id: string
          status: string
          tables_backed_up: string[] | null
          user_id: string
        }
        Insert: {
          backup_size_kb?: number | null
          commit_url?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          id?: string
          status: string
          tables_backed_up?: string[] | null
          user_id: string
        }
        Update: {
          backup_size_kb?: number | null
          commit_url?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          id?: string
          status?: string
          tables_backed_up?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      editable_content: {
        Row: {
          category: string | null
          content_key: string
          content_value: string
          created_at: string | null
          created_by: string | null
          id: string
          is_protected: boolean | null
          last_applied_at: string | null
          page: string
          protection_reason: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          content_key: string
          content_value: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_protected?: boolean | null
          last_applied_at?: string | null
          page: string
          protection_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          content_key?: string
          content_value?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_protected?: boolean | null
          last_applied_at?: string | null
          page?: string
          protection_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string
          checked: boolean | null
          created_at: string
          date: string
          description: string | null
          id: string
          is_fixed: boolean | null
          sub_category: string | null
          transaction_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category: string
          checked?: boolean | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          is_fixed?: boolean | null
          sub_category?: string | null
          transaction_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string
          checked?: boolean | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_fixed?: boolean | null
          sub_category?: string | null
          transaction_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expense_history: {
        Row: {
          created_at: string
          expense_id: string | null
          fixed_expense_id: string
          id: string
          notes: string | null
          paid_amount: number
          paid_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expense_id?: string | null
          fixed_expense_id: string
          id?: string
          notes?: string | null
          paid_amount: number
          paid_date: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expense_id?: string | null
          fixed_expense_id?: string
          id?: string
          notes?: string | null
          paid_amount?: number
          paid_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expense_history_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_expense_history_fixed_expense_id_fkey"
            columns: ["fixed_expense_id"]
            isOneToOne: false
            referencedRelation: "fixed_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          auto_create_expense: boolean | null
          bank_account_id: string | null
          category: string
          created_at: string
          due_date_day: number
          estimated_amount: number | null
          expense_name: string
          expense_type: string
          fixed_amount: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          reminder_days_before: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_create_expense?: boolean | null
          bank_account_id?: string | null
          category: string
          created_at?: string
          due_date_day: number
          estimated_amount?: number | null
          expense_name: string
          expense_type: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          reminder_days_before?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_create_expense?: boolean | null
          bank_account_id?: string | null
          category?: string
          created_at?: string
          due_date_day?: number
          estimated_amount?: number | null
          expense_name?: string
          expense_type?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          reminder_days_before?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          amount: number | null
          bank_name: string | null
          contract_id: string | null
          created_at: string
          date: string | null
          id: string
          source_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          bank_name?: string | null
          contract_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          source_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          bank_name?: string | null
          contract_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          source_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          created_at: string
          id: string
          jangka_belakang: string | null
          month: string
          notes: string | null
          tanggal_pembelian: string | null
          target_belanja: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          jangka_belakang?: string | null
          month: string
          notes?: string | null
          tanggal_pembelian?: string | null
          target_belanja?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          jangka_belakang?: string | null
          month?: string
          notes?: string | null
          tanggal_pembelian?: string | null
          target_belanja?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          created_at: string
          id: string
          month: string
          pemasukan: number | null
          pengeluaran: number | null
          pengeluaran_tetap: number | null
          sisa_tabungan: number | null
          target_belanja: number | null
          target_keuangan: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          pemasukan?: number | null
          pengeluaran?: number | null
          pengeluaran_tetap?: number | null
          sisa_tabungan?: number | null
          target_belanja?: number | null
          target_keuangan?: number | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          pemasukan?: number | null
          pengeluaran?: number | null
          pengeluaran_tetap?: number | null
          sisa_tabungan?: number | null
          target_belanja?: number | null
          target_keuangan?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      payments_tracking: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          paid_date: string | null
          payment_type: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          paid_date?: string | null
          payment_type: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          paid_date?: string | null
          payment_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          nomor_telepon: string | null
          notification_budget_alert: boolean | null
          notification_due_date: boolean | null
          notification_email: boolean | null
          notification_monthly_report: boolean | null
          notification_payment: boolean | null
          notification_push: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          nomor_telepon?: string | null
          notification_budget_alert?: boolean | null
          notification_due_date?: boolean | null
          notification_email?: boolean | null
          notification_monthly_report?: boolean | null
          notification_payment?: boolean | null
          notification_push?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          nomor_telepon?: string | null
          notification_budget_alert?: boolean | null
          notification_due_date?: boolean | null
          notification_email?: boolean | null
          notification_monthly_report?: boolean | null
          notification_payment?: boolean | null
          notification_push?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      recurring_income: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          notes: string | null
          source_name: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_name: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_name?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_income_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount: number
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          next_execution_date: string
          notes: string | null
          savings_plan_id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          next_execution_date: string
          notes?: string | null
          savings_plan_id: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          next_execution_date?: string
          notes?: string | null
          savings_plan_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_savings_plan_id_fkey"
            columns: ["savings_plan_id"]
            isOneToOne: false
            referencedRelation: "savings_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_contracts: {
        Row: {
          bank_account_id: string | null
          bukti_pembayaran_files: Json | null
          client_group_id: string
          created_at: string
          end_date: string
          google_maps_link: string | null
          id: string
          invoice: string | null
          jumlah_lunas: number | null
          keterangan: string | null
          notes: string | null
          start_date: string
          status: string
          tagihan_belum_bayar: number | null
          tanggal: string | null
          tanggal_lunas: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          bukti_pembayaran_files?: Json | null
          client_group_id: string
          created_at?: string
          end_date: string
          google_maps_link?: string | null
          id?: string
          invoice?: string | null
          jumlah_lunas?: number | null
          keterangan?: string | null
          notes?: string | null
          start_date: string
          status?: string
          tagihan_belum_bayar?: number | null
          tanggal?: string | null
          tanggal_lunas?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_id?: string | null
          bukti_pembayaran_files?: Json | null
          client_group_id?: string
          created_at?: string
          end_date?: string
          google_maps_link?: string | null
          id?: string
          invoice?: string | null
          jumlah_lunas?: number | null
          keterangan?: string | null
          notes?: string | null
          start_date?: string
          status?: string
          tagihan_belum_bayar?: number | null
          tanggal?: string | null
          tanggal_lunas?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_contracts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_contracts_client_group_id_fkey"
            columns: ["client_group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_plans: {
        Row: {
          category: string | null
          created_at: string
          current_amount: number | null
          deadline: string | null
          id: string
          notes: string | null
          plan_name: string
          target_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          id?: string
          notes?: string | null
          plan_name: string
          target_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_amount?: number | null
          deadline?: string | null
          id?: string
          notes?: string | null
          plan_name?: string
          target_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_settings: {
        Row: {
          auto_save_enabled: boolean | null
          created_at: string
          default_allocation_percentage: number | null
          emergency_fund_current: number | null
          emergency_fund_target: number | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_save_enabled?: boolean | null
          created_at?: string
          default_allocation_percentage?: number | null
          emergency_fund_current?: number | null
          emergency_fund_target?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_save_enabled?: boolean | null
          created_at?: string
          default_allocation_percentage?: number | null
          emergency_fund_current?: number | null
          emergency_fund_target?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          savings_plan_id: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          savings_plan_id: string
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          savings_plan_id?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_transactions_savings_plan_id_fkey"
            columns: ["savings_plan_id"]
            isOneToOne: false
            referencedRelation: "savings_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_settings: {
        Row: {
          ai_provider: string
          api_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_provider: string
          api_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_provider?: string
          api_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      content_render_latest: {
        Row: {
          content_key: string | null
          last_seen_at: string | null
          page: string | null
          rendered_value: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_budget_template: {
        Args: { p_budget_id: string; p_template_id: string; p_user_id: string }
        Returns: undefined
      }
      check_user_role: {
        Args: { role_name: string; user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      is_user: { Args: { user_id: string }; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
