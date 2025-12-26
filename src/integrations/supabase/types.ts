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
      ai_feature_config: {
        Row: {
          config: Json
          created_at: string
          feature_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          feature_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          feature_name?: string
          id?: string
          updated_at?: string
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
          function_name: string | null
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
          function_name?: string | null
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
          function_name?: string | null
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
      bank_mutations: {
        Row: {
          amount: number
          balance_after: number | null
          bank_account_id: string | null
          created_at: string
          description: string
          id: string
          is_processed: boolean
          matched_contract_id: string | null
          processed_at: string | null
          raw_data: Json | null
          reference_number: string | null
          source: string
          transaction_date: string
          transaction_time: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          bank_account_id?: string | null
          created_at?: string
          description: string
          id?: string
          is_processed?: boolean
          matched_contract_id?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          source?: string
          transaction_date: string
          transaction_time?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          bank_account_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_processed?: boolean
          matched_contract_id?: string | null
          processed_at?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          source?: string
          transaction_date?: string
          transaction_time?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_mutations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_mutations_matched_contract_id_fkey"
            columns: ["matched_contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      bca_credentials: {
        Row: {
          allowed_ip: string | null
          burst_duration_seconds: number
          burst_interval_seconds: number
          created_at: string
          default_interval_minutes: number
          error_count: number
          error_message: string | null
          id: string
          is_active: boolean
          klikbca_pin_encrypted: string
          klikbca_user_id_encrypted: string
          last_sync_at: string | null
          status: string
          updated_at: string
          user_id: string
          vps_host: string
          vps_password_encrypted: string
          vps_port: number
          vps_username: string
          webhook_secret: string
        }
        Insert: {
          allowed_ip?: string | null
          burst_duration_seconds?: number
          burst_interval_seconds?: number
          created_at?: string
          default_interval_minutes?: number
          error_count?: number
          error_message?: string | null
          id?: string
          is_active?: boolean
          klikbca_pin_encrypted: string
          klikbca_user_id_encrypted: string
          last_sync_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vps_host: string
          vps_password_encrypted: string
          vps_port?: number
          vps_username: string
          webhook_secret?: string
        }
        Update: {
          allowed_ip?: string | null
          burst_duration_seconds?: number
          burst_interval_seconds?: number
          created_at?: string
          default_interval_minutes?: number
          error_count?: number
          error_message?: string | null
          id?: string
          is_active?: boolean
          klikbca_pin_encrypted?: string
          klikbca_user_id_encrypted?: string
          last_sync_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vps_host?: string
          vps_password_encrypted?: string
          vps_port?: number
          vps_username?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      bca_sync_logs: {
        Row: {
          bca_credential_id: string
          completed_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          mode: string
          mutations_found: number
          mutations_matched: number
          mutations_new: number
          started_at: string
          status: string
        }
        Insert: {
          bca_credential_id: string
          completed_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          mode?: string
          mutations_found?: number
          mutations_matched?: number
          mutations_new?: number
          started_at?: string
          status: string
        }
        Update: {
          bca_credential_id?: string
          completed_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          mode?: string
          mutations_found?: number
          mutations_matched?: number
          mutations_new?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bca_sync_logs_bca_credential_id_fkey"
            columns: ["bca_credential_id"]
            isOneToOne: false
            referencedRelation: "bca_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          display_order: number
          icon: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          post_id: string
          status: string
          user_email: string
          user_name: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
          user_email: string
          user_name: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          user_email?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
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
          linked_user_id: string | null
          nama: string
          nomor_telepon: string
          phone_numbers: Json | null
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
          linked_user_id?: string | null
          nama: string
          nomor_telepon: string
          phone_numbers?: Json | null
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
          linked_user_id?: string | null
          nama?: string
          nomor_telepon?: string
          phone_numbers?: Json | null
          updated_at?: string
          user_id?: string
          whatsapp_checked_at?: string | null
        }
        Relationships: []
      }
      cloud_usage_snapshots: {
        Row: {
          active_users: number | null
          ai_calls: number | null
          ai_cost_usd: number | null
          created_at: string | null
          database_size_bytes: number | null
          edge_function_calls: number | null
          email_sent: number | null
          id: string
          snapshot_date: string
          storage_size_bytes: number | null
          user_id: string
        }
        Insert: {
          active_users?: number | null
          ai_calls?: number | null
          ai_cost_usd?: number | null
          created_at?: string | null
          database_size_bytes?: number | null
          edge_function_calls?: number | null
          email_sent?: number | null
          id?: string
          snapshot_date: string
          storage_size_bytes?: number | null
          user_id: string
        }
        Update: {
          active_users?: number | null
          ai_calls?: number | null
          ai_cost_usd?: number | null
          created_at?: string | null
          database_size_bytes?: number | null
          edge_function_calls?: number | null
          email_sent?: number | null
          id?: string
          snapshot_date?: string
          storage_size_bytes?: number | null
          user_id?: string
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
      contract_payments: {
        Row: {
          amount: number
          confirmed_by: string | null
          contract_id: string
          created_at: string
          id: string
          income_source_id: string | null
          notes: string | null
          payment_date: string
          payment_number: number
          payment_source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          income_source_id?: string | null
          notes?: string | null
          payment_date: string
          payment_number?: number
          payment_source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          income_source_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_number?: number
          payment_source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_payments_income_source_id_fkey"
            columns: ["income_source_id"]
            isOneToOne: false
            referencedRelation: "income_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_public_links: {
        Row: {
          access_code: string
          contract_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          access_code: string
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          access_code?: string
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_public_links_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
        ]
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
      delivery_location_history: {
        Row: {
          accuracy: number | null
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string | null
          speed: number | null
          trip_id: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string | null
          speed?: number | null
          trip_id: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string | null
          speed?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_location_history_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "delivery_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_stops: {
        Row: {
          actual_arrival: string | null
          completed_at: string | null
          contract_id: string | null
          created_at: string | null
          delivery_notes: string | null
          destination_address: string | null
          destination_lat: number
          destination_lng: number
          driver_notes: string | null
          estimated_arrival: string | null
          id: string
          proof_photos: string[] | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string | null
          stop_order: number
          tracking_code: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          actual_arrival?: string | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          destination_address?: string | null
          destination_lat: number
          destination_lng: number
          driver_notes?: string | null
          estimated_arrival?: string | null
          id?: string
          proof_photos?: string[] | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string | null
          stop_order: number
          tracking_code: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          actual_arrival?: string | null
          completed_at?: string | null
          contract_id?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          destination_address?: string | null
          destination_lat?: number
          destination_lng?: number
          driver_notes?: string | null
          estimated_arrival?: string | null
          id?: string
          proof_photos?: string[] | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string | null
          stop_order?: number
          tracking_code?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_stops_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_stops_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "delivery_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_trips: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          current_location_updated_at: string | null
          driver_name: string
          driver_phone: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string | null
          trip_code: string
          updated_at: string | null
          user_id: string
          vehicle_info: string | null
          warehouse_address: string | null
          warehouse_lat: number
          warehouse_lng: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          driver_name: string
          driver_phone?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          trip_code: string
          updated_at?: string | null
          user_id: string
          vehicle_info?: string | null
          warehouse_address?: string | null
          warehouse_lat: number
          warehouse_lng: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          driver_name?: string
          driver_phone?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          trip_code?: string
          updated_at?: string | null
          user_id?: string
          vehicle_info?: string | null
          warehouse_address?: string | null
          warehouse_lat?: number
          warehouse_lng?: number
        }
        Relationships: []
      }
      driver_templates: {
        Row: {
          created_at: string | null
          driver_name: string
          driver_phone: string | null
          id: string
          is_default: boolean | null
          template_name: string
          updated_at: string | null
          user_id: string
          vehicle_info: string | null
          warehouse_address: string | null
          warehouse_gmaps_link: string | null
          warehouse_lat: number | null
          warehouse_lng: number | null
        }
        Insert: {
          created_at?: string | null
          driver_name: string
          driver_phone?: string | null
          id?: string
          is_default?: boolean | null
          template_name: string
          updated_at?: string | null
          user_id: string
          vehicle_info?: string | null
          warehouse_address?: string | null
          warehouse_gmaps_link?: string | null
          warehouse_lat?: number | null
          warehouse_lng?: number | null
        }
        Update: {
          created_at?: string | null
          driver_name?: string
          driver_phone?: string | null
          id?: string
          is_default?: boolean | null
          template_name?: string
          updated_at?: string | null
          user_id?: string
          vehicle_info?: string | null
          warehouse_address?: string | null
          warehouse_gmaps_link?: string | null
          warehouse_lat?: number | null
          warehouse_lng?: number | null
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
      email_logs: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          error_message: string | null
          external_message_id: string | null
          fallback_attempts: number | null
          id: string
          metadata: Json | null
          opened_at: string | null
          provider_id: string | null
          provider_name: string | null
          recipient_email: string
          recipient_name: string | null
          resend_email_id: string | null
          response_time_ms: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_type: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          external_message_id?: string | null
          fallback_attempts?: number | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider_id?: string | null
          provider_name?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_email_id?: string | null
          response_time_ms?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_type?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          external_message_id?: string | null
          fallback_attempts?: number | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider_id?: string | null
          provider_name?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_email_id?: string | null
          response_time_ms?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "email_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_providers: {
        Row: {
          api_endpoint: string | null
          api_key_encrypted: string
          auto_disabled_at: string | null
          consecutive_errors: number | null
          created_at: string | null
          daily_limit: number | null
          display_name: string | null
          emails_sent_month: number | null
          emails_sent_today: number | null
          health_status: string | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_month_reset: string | null
          last_reset_date: string | null
          last_success_at: string | null
          last_used_at: string | null
          monthly_limit: number | null
          priority: number | null
          provider_name: string
          purpose: string | null
          sender_email: string
          sender_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key_encrypted: string
          auto_disabled_at?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          daily_limit?: number | null
          display_name?: string | null
          emails_sent_month?: number | null
          emails_sent_today?: number | null
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_month_reset?: string | null
          last_reset_date?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          monthly_limit?: number | null
          priority?: number | null
          provider_name: string
          purpose?: string | null
          sender_email: string
          sender_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_endpoint?: string | null
          api_key_encrypted?: string
          auto_disabled_at?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          daily_limit?: number | null
          display_name?: string | null
          emails_sent_month?: number | null
          emails_sent_today?: number | null
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_month_reset?: string | null
          last_reset_date?: string | null
          last_success_at?: string | null
          last_used_at?: string | null
          monthly_limit?: number | null
          priority?: number | null
          provider_name?: string
          purpose?: string | null
          sender_email?: string
          sender_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_signatures: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          signature_html: string
          signature_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          signature_html: string
          signature_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          signature_html?: string
          signature_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_template: string
          created_at: string | null
          id: string
          is_active: boolean | null
          subject_template: string
          template_name: string
          template_type: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          body_template: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject_template: string
          template_name: string
          template_type: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          body_template?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          subject_template?: string
          template_name?: string
          template_type?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          change_type: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          new_email: string | null
          token: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          change_type?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          new_email?: string | null
          token: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          change_type?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          new_email?: string | null
          token?: string
          user_id?: string
          verified?: boolean | null
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
      fixed_monthly_income: {
        Row: {
          admin_notes: string | null
          admin_notes_edited_at: string | null
          admin_notes_edited_by: string | null
          bank_account_id: string | null
          catatan: string | null
          client_group_id: string | null
          created_at: string | null
          id: string
          invoice: string
          is_paid: boolean | null
          jenis_scaffolding: string | null
          jumlah_unit: number | null
          keterangan: string | null
          lokasi_proyek: string | null
          nominal: number
          ongkos_transport: number | null
          paid_date: string | null
          penanggung_jawab: string | null
          period_end_month: string
          period_start_month: string
          rental_date_end: string | null
          rental_date_start: string | null
          status: string | null
          status_pengambilan: string | null
          status_pengiriman: string | null
          tagihan: number | null
          tagihan_belum_bayar: number | null
          tanggal: string | null
          tanggal_bayar_terakhir: string | null
          tanggal_pengambilan: string | null
          tanggal_pengiriman: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_notes_edited_at?: string | null
          admin_notes_edited_by?: string | null
          bank_account_id?: string | null
          catatan?: string | null
          client_group_id?: string | null
          created_at?: string | null
          id?: string
          invoice: string
          is_paid?: boolean | null
          jenis_scaffolding?: string | null
          jumlah_unit?: number | null
          keterangan?: string | null
          lokasi_proyek?: string | null
          nominal?: number
          ongkos_transport?: number | null
          paid_date?: string | null
          penanggung_jawab?: string | null
          period_end_month: string
          period_start_month: string
          rental_date_end?: string | null
          rental_date_start?: string | null
          status?: string | null
          status_pengambilan?: string | null
          status_pengiriman?: string | null
          tagihan?: number | null
          tagihan_belum_bayar?: number | null
          tanggal?: string | null
          tanggal_bayar_terakhir?: string | null
          tanggal_pengambilan?: string | null
          tanggal_pengiriman?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_notes_edited_at?: string | null
          admin_notes_edited_by?: string | null
          bank_account_id?: string | null
          catatan?: string | null
          client_group_id?: string | null
          created_at?: string | null
          id?: string
          invoice?: string
          is_paid?: boolean | null
          jenis_scaffolding?: string | null
          jumlah_unit?: number | null
          keterangan?: string | null
          lokasi_proyek?: string | null
          nominal?: number
          ongkos_transport?: number | null
          paid_date?: string | null
          penanggung_jawab?: string | null
          period_end_month?: string
          period_start_month?: string
          rental_date_end?: string | null
          rental_date_start?: string | null
          status?: string | null
          status_pengambilan?: string | null
          status_pengiriman?: string | null
          tagihan?: number | null
          tagihan_belum_bayar?: number | null
          tanggal?: string | null
          tanggal_bayar_terakhir?: string | null
          tanggal_pengambilan?: string | null
          tanggal_pengiriman?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_monthly_income_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_monthly_income_client_group_id_fkey"
            columns: ["client_group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          amount: number | null
          bank_account_id: string | null
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
          bank_account_id?: string | null
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
          bank_account_id?: string | null
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
            foreignKeyName: "income_sources_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_sources_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_code: string
          item_name: string
          minimum_stock: number
          total_quantity: number
          unit_price: number | null
          unit_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_code: string
          item_name: string
          minimum_stock?: number
          total_quantity?: number
          unit_price?: number | null
          unit_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_code?: string
          item_name?: string
          minimum_stock?: number
          total_quantity?: number
          unit_price?: number | null
          unit_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          contract_id: string | null
          created_at: string
          id: string
          inventory_item_id: string
          movement_date: string
          movement_type: string
          notes: string | null
          quantity: number
          user_id: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          movement_date?: string
          movement_type: string
          notes?: string | null
          quantity: number
          user_id: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          movement_date?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      login_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          ip_address: string | null
          last_active: string | null
          logged_out_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          logged_out_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          logged_out_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mail_inbox: {
        Row: {
          attachments: Json | null
          bcc: string[] | null
          body_html: string | null
          body_text: string | null
          cc: string[] | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email_id: string
          from_address: string
          from_name: string | null
          id: string
          is_deleted: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          mail_type: string | null
          received_at: string
          reply_to_id: string | null
          subject: string | null
          to_address: string
        }
        Insert: {
          attachments?: Json | null
          bcc?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc?: string[] | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email_id: string
          from_address: string
          from_name?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          mail_type?: string | null
          received_at?: string
          reply_to_id?: string | null
          subject?: string | null
          to_address: string
        }
        Update: {
          attachments?: Json | null
          bcc?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc?: string[] | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email_id?: string
          from_address?: string
          from_name?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          mail_type?: string | null
          received_at?: string
          reply_to_id?: string | null
          subject?: string | null
          to_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_inbox_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "mail_inbox"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_settings: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          pixel_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pixel_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meta_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_name: string
          id: string
          user_data: Json | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_name: string
          id?: string
          user_data?: Json | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_name?: string
          id?: string
          user_data?: Json | null
        }
        Relationships: []
      }
      meta_whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          local_template_type: string
          meta_template_category: string | null
          meta_template_language: string | null
          meta_template_name: string
          meta_template_status: string | null
          updated_at: string | null
          user_id: string
          variables_mapping: Json | null
          whatsapp_number_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          local_template_type: string
          meta_template_category?: string | null
          meta_template_language?: string | null
          meta_template_name: string
          meta_template_status?: string | null
          updated_at?: string | null
          user_id: string
          variables_mapping?: Json | null
          whatsapp_number_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          local_template_type?: string
          meta_template_category?: string | null
          meta_template_language?: string | null
          meta_template_name?: string
          meta_template_status?: string | null
          updated_at?: string | null
          user_id?: string
          variables_mapping?: Json | null
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_whatsapp_templates_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_email_addresses: {
        Row: {
          badge_color: string
          can_send_from: boolean | null
          created_at: string
          created_by: string | null
          display_name: string
          display_order: number
          email_address: string
          id: string
          is_active: boolean
        }
        Insert: {
          badge_color?: string
          can_send_from?: boolean | null
          created_at?: string
          created_by?: string | null
          display_name: string
          display_order?: number
          email_address: string
          id?: string
          is_active?: boolean
        }
        Update: {
          badge_color?: string
          can_send_from?: boolean | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          display_order?: number
          email_address?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
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
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          notification_type: string
          preferred_time_end: string | null
          preferred_time_start: string | null
          priority: number | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_type: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority?: number | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_type?: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority?: number | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_confirmation_requests: {
        Row: {
          amount_expected: number
          contract_id: string
          created_at: string
          customer_name: string
          customer_phone: string | null
          expires_at: string | null
          id: string
          matched_at: string | null
          matched_mutation_id: string | null
          requested_at: string
          status: string
          unique_amount: number | null
          unique_code: string | null
          updated_at: string
          user_id: string
          whatsapp_sent: boolean
          whatsapp_sent_at: string | null
        }
        Insert: {
          amount_expected: number
          contract_id: string
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          matched_at?: string | null
          matched_mutation_id?: string | null
          requested_at?: string
          status?: string
          unique_amount?: number | null
          unique_code?: string | null
          updated_at?: string
          user_id: string
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
        }
        Update: {
          amount_expected?: number
          contract_id?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          matched_at?: string | null
          matched_mutation_id?: string | null
          requested_at?: string
          status?: string
          unique_amount?: number | null
          unique_code?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_sent?: boolean
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmation_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmation_requests_matched_mutation_id_fkey"
            columns: ["matched_mutation_id"]
            isOneToOne: false
            referencedRelation: "bank_mutations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_edit_requests: {
        Row: {
          contract_id: string
          created_at: string
          current_amount: number
          current_notes: string | null
          current_payment_date: string
          id: string
          new_amount: number
          new_notes: string | null
          new_payment_date: string
          payment_id: string
          rejection_reason: string | null
          request_reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          current_amount: number
          current_notes?: string | null
          current_payment_date: string
          id?: string
          new_amount: number
          new_notes?: string | null
          new_payment_date: string
          payment_id: string
          rejection_reason?: string | null
          request_reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          current_amount?: number
          current_notes?: string | null
          current_payment_date?: string
          id?: string
          new_amount?: number
          new_notes?: string | null
          new_payment_date?: string
          payment_id?: string
          rejection_reason?: string | null
          request_reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_edit_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_edit_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "contract_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_settings: {
        Row: {
          api_key_encrypted: string | null
          config: Json | null
          created_at: string
          error_count: number | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_webhook_at: string | null
          provider: string
          updated_at: string
          user_id: string
          webhook_secret_encrypted: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_webhook_at?: string | null
          provider?: string
          updated_at?: string
          user_id: string
          webhook_secret_encrypted?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          config?: Json | null
          created_at?: string
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_webhook_at?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
          webhook_secret_encrypted?: string | null
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
      portfolio_projects: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_featured: boolean | null
          location: string
          project_date: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_featured?: boolean | null
          location: string
          project_date?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_featured?: boolean | null
          location?: string
          project_date?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          is_suspended: boolean | null
          nomor_telepon: string | null
          notification_budget_alert: boolean | null
          notification_due_date: boolean | null
          notification_email: boolean | null
          notification_monthly_report: boolean | null
          notification_payment: boolean | null
          notification_push: boolean | null
          temp_email: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id: string
          is_suspended?: boolean | null
          nomor_telepon?: string | null
          notification_budget_alert?: boolean | null
          notification_due_date?: boolean | null
          notification_email?: boolean | null
          notification_monthly_report?: boolean | null
          notification_payment?: boolean | null
          notification_push?: boolean | null
          temp_email?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean | null
          nomor_telepon?: string | null
          notification_budget_alert?: boolean | null
          notification_due_date?: boolean | null
          notification_email?: boolean | null
          notification_monthly_report?: boolean | null
          notification_payment?: boolean | null
          notification_push?: boolean | null
          temp_email?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      recurring_income: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          notes: string | null
          source_name: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_name: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_name?: string
          start_date?: string
          updated_at?: string | null
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
      recurring_income_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          income_source_id: string | null
          notes: string | null
          payment_date: string
          payment_number: number
          recurring_income_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          income_source_id?: string | null
          notes?: string | null
          payment_date: string
          payment_number?: number
          recurring_income_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          income_source_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_number?: number
          recurring_income_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_income_payments_income_source_id_fkey"
            columns: ["income_source_id"]
            isOneToOne: false
            referencedRelation: "income_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_income_payments_recurring_income_id_fkey"
            columns: ["recurring_income_id"]
            isOneToOne: false
            referencedRelation: "fixed_monthly_income"
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
          admin_notes: string | null
          admin_notes_edited_at: string | null
          admin_notes_edited_by: string | null
          bank_account_id: string | null
          biaya_kirim: number | null
          bukti_pembayaran_files: Json | null
          client_group_id: string
          created_at: string
          end_date: string
          google_maps_link: string | null
          id: string
          inventory_item_id: string | null
          invoice: string | null
          jenis_scaffolding: string | null
          jumlah_unit: number | null
          keterangan: string | null
          lokasi_detail: string | null
          notes: string | null
          penanggung_jawab: string | null
          start_date: string
          status: string
          status_pengambilan: string | null
          status_pengiriman: string | null
          tagihan: number | null
          tagihan_belum_bayar: number | null
          tanggal: string | null
          tanggal_ambil: string | null
          tanggal_bayar_terakhir: string | null
          tanggal_kirim: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_notes_edited_at?: string | null
          admin_notes_edited_by?: string | null
          bank_account_id?: string | null
          biaya_kirim?: number | null
          bukti_pembayaran_files?: Json | null
          client_group_id: string
          created_at?: string
          end_date: string
          google_maps_link?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice?: string | null
          jenis_scaffolding?: string | null
          jumlah_unit?: number | null
          keterangan?: string | null
          lokasi_detail?: string | null
          notes?: string | null
          penanggung_jawab?: string | null
          start_date: string
          status?: string
          status_pengambilan?: string | null
          status_pengiriman?: string | null
          tagihan?: number | null
          tagihan_belum_bayar?: number | null
          tanggal?: string | null
          tanggal_ambil?: string | null
          tanggal_bayar_terakhir?: string | null
          tanggal_kirim?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_notes_edited_at?: string | null
          admin_notes_edited_by?: string | null
          bank_account_id?: string | null
          biaya_kirim?: number | null
          bukti_pembayaran_files?: Json | null
          client_group_id?: string
          created_at?: string
          end_date?: string
          google_maps_link?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice?: string | null
          jenis_scaffolding?: string | null
          jumlah_unit?: number | null
          keterangan?: string | null
          lokasi_detail?: string | null
          notes?: string | null
          penanggung_jawab?: string | null
          start_date?: string
          status?: string
          status_pengambilan?: string | null
          status_pengiriman?: string | null
          tagihan?: number | null
          tagihan_belum_bayar?: number | null
          tanggal?: string | null
          tanggal_ambil?: string | null
          tanggal_bayar_terakhir?: string | null
          tanggal_kirim?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_rental_contracts_inventory_item"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "rental_contracts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
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
      security_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      short_links: {
        Row: {
          click_count: number | null
          created_at: string | null
          destination_url: string
          id: string
          is_active: boolean | null
          slug: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          destination_url: string
          id?: string
          is_active?: boolean | null
          slug: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          destination_url?: string
          id?: string
          is_active?: boolean | null
          slug?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          api_key_encrypted: string | null
          created_at: string | null
          daily_limit: number | null
          emails_sent_today: number | null
          id: string
          is_active: boolean | null
          last_reset_date: string | null
          provider: string | null
          reply_to_email: string | null
          sender_email: string
          sender_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string | null
          daily_limit?: number | null
          emails_sent_today?: number | null
          id?: string
          is_active?: boolean | null
          last_reset_date?: string | null
          provider?: string | null
          reply_to_email?: string | null
          sender_email: string
          sender_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string | null
          daily_limit?: number | null
          emails_sent_today?: number | null
          id?: string
          is_active?: boolean | null
          last_reset_date?: string | null
          provider?: string | null
          reply_to_email?: string | null
          sender_email?: string
          sender_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      temporary_access_codes: {
        Row: {
          attempts_count: number | null
          code: string
          created_at: string | null
          created_by: string
          expires_at: string
          force_password_change: boolean | null
          id: string
          last_attempt_at: string | null
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          code: string
          created_at?: string | null
          created_by: string
          expires_at: string
          force_password_change?: boolean | null
          id?: string
          last_attempt_at?: string | null
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          code?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string
          force_password_change?: boolean | null
          id?: string
          last_attempt_at?: string | null
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          attempts_count: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          attempts_count?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          attempts_count?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      unified_notification_queue: {
        Row: {
          attempts: number | null
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          message_content: string
          metadata: Json | null
          notification_type: string
          recipient_identifier: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          subject: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          message_content: string
          metadata?: Json | null
          notification_type: string
          recipient_identifier: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          message_content?: string
          metadata?: Json | null
          notification_type?: string
          recipient_identifier?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          user_id?: string
        }
        Relationships: []
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
      vip_design_settings: {
        Row: {
          animation: string
          brand_image_url: string | null
          brand_text: string
          color_type: string
          created_at: string | null
          display_mode: string | null
          favicon_type: string | null
          favicon_url: string | null
          font_family: string
          font_size: number
          font_weight: string
          glow_blur: number
          glow_color: string
          glow_enabled: boolean
          gradient_angle: number
          gradient_colors: Json
          gradient_type: string
          id: string
          image_height: number | null
          image_max_width: number | null
          letter_spacing: number
          outline_color: string
          outline_enabled: boolean
          outline_width: number
          shadow_blur: number
          shadow_color: string
          shadow_enabled: boolean
          shadow_x: number
          shadow_y: number
          sidebar_display_mode: string | null
          sidebar_logo_height: number | null
          sidebar_logo_max_width: number | null
          sidebar_logo_url: string | null
          sidebar_text: string | null
          solid_color: string
          text_align: string
          text_transform: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          animation?: string
          brand_image_url?: string | null
          brand_text?: string
          color_type?: string
          created_at?: string | null
          display_mode?: string | null
          favicon_type?: string | null
          favicon_url?: string | null
          font_family?: string
          font_size?: number
          font_weight?: string
          glow_blur?: number
          glow_color?: string
          glow_enabled?: boolean
          gradient_angle?: number
          gradient_colors?: Json
          gradient_type?: string
          id?: string
          image_height?: number | null
          image_max_width?: number | null
          letter_spacing?: number
          outline_color?: string
          outline_enabled?: boolean
          outline_width?: number
          shadow_blur?: number
          shadow_color?: string
          shadow_enabled?: boolean
          shadow_x?: number
          shadow_y?: number
          sidebar_display_mode?: string | null
          sidebar_logo_height?: number | null
          sidebar_logo_max_width?: number | null
          sidebar_logo_url?: string | null
          sidebar_text?: string | null
          solid_color?: string
          text_align?: string
          text_transform?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          animation?: string
          brand_image_url?: string | null
          brand_text?: string
          color_type?: string
          created_at?: string | null
          display_mode?: string | null
          favicon_type?: string | null
          favicon_url?: string | null
          font_family?: string
          font_size?: number
          font_weight?: string
          glow_blur?: number
          glow_color?: string
          glow_enabled?: boolean
          gradient_angle?: number
          gradient_colors?: Json
          gradient_type?: string
          id?: string
          image_height?: number | null
          image_max_width?: number | null
          letter_spacing?: number
          outline_color?: string
          outline_enabled?: boolean
          outline_width?: number
          shadow_blur?: number
          shadow_color?: string
          shadow_enabled?: boolean
          shadow_x?: number
          shadow_y?: number
          sidebar_display_mode?: string | null
          sidebar_logo_height?: number | null
          sidebar_logo_max_width?: number | null
          sidebar_logo_url?: string | null
          sidebar_text?: string | null
          solid_color?: string
          text_align?: string
          text_transform?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      warehouse_settings: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          lat: number
          lng: number
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          lat: number
          lng: number
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          lat?: number
          lng?: number
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_analytics: {
        Row: {
          avg_response_time_seconds: number | null
          breakdown_by_type: Json | null
          created_at: string | null
          date: string
          delivery_rate: number | null
          id: string
          messages_delivered: number | null
          messages_failed: number | null
          messages_read: number | null
          messages_received: number | null
          messages_sent: number | null
          read_rate: number | null
          response_rate: number | null
          total_link_clicks: number | null
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          avg_response_time_seconds?: number | null
          breakdown_by_type?: Json | null
          created_at?: string | null
          date: string
          delivery_rate?: number | null
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          read_rate?: number | null
          response_rate?: number | null
          total_link_clicks?: number | null
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          avg_response_time_seconds?: number | null
          breakdown_by_type?: Json | null
          created_at?: string | null
          date?: string
          delivery_rate?: number | null
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          read_rate?: number | null
          response_rate?: number | null
          total_link_clicks?: number | null
          user_id?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_analytics_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          client_group_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          customer_profile_pic: string | null
          engagement_score: number | null
          id: string
          is_starred: boolean | null
          last_message_at: string | null
          last_message_direction: string | null
          last_message_preview: string | null
          tags: string[] | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          client_group_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          customer_profile_pic?: string | null
          engagement_score?: number | null
          id?: string
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          client_group_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          customer_profile_pic?: string | null
          engagement_score?: number | null
          id?: string
          is_starred?: boolean | null
          last_message_at?: string | null
          last_message_direction?: string | null
          last_message_preview?: string | null
          tags?: string[] | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_client_group_id_fkey"
            columns: ["client_group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_customer_tags: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_health_checks: {
        Row: {
          check_type: string
          checked_at: string | null
          error_message: string | null
          id: string
          response_time_ms: number | null
          session_status: string | null
          status: string
          user_id: string
          waha_version: string | null
        }
        Insert: {
          check_type: string
          checked_at?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          session_status?: string | null
          status: string
          user_id: string
          waha_version?: string | null
        }
        Update: {
          check_type?: string
          checked_at?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          session_status?: string | null
          status?: string
          user_id?: string
          waha_version?: string | null
        }
        Relationships: []
      }
      whatsapp_message_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          template_content: string
          template_name: string
          template_type: string
          updated_at: string | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content: string
          template_name: string
          template_type: string
          updated_at?: string | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          template_content?: string
          template_name?: string
          template_type?: string
          updated_at?: string | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          contract_id: string | null
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_message: string | null
          external_message_id: string | null
          id: string
          is_scheduled: boolean | null
          media_mime_type: string | null
          media_url: string | null
          message_content: string | null
          message_type: string | null
          notification_type: string | null
          provider: string | null
          provider_response: Json | null
          read_at: string | null
          response_time_seconds: number | null
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          template_name: string | null
          template_variables: Json | null
          tracked_links: Json | null
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          contract_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          is_scheduled?: boolean | null
          media_mime_type?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          notification_type?: string | null
          provider?: string | null
          provider_response?: Json | null
          read_at?: string | null
          response_time_seconds?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_variables?: Json | null
          tracked_links?: Json | null
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          contract_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          is_scheduled?: boolean | null
          media_mime_type?: string | null
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          notification_type?: string | null
          provider?: string | null
          provider_response?: Json | null
          read_at?: string | null
          response_time_seconds?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_variables?: Json | null
          tracked_links?: Json | null
          user_id?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notification_queue: {
        Row: {
          contract_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          priority: number | null
          processing_started_at: string | null
          scheduled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          priority?: number | null
          processing_started_at?: string | null
          scheduled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          priority?: number | null
          processing_started_at?: string | null
          scheduled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_queue_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications_log: {
        Row: {
          contract_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message_content: string
          message_id: string | null
          next_retry_at: string | null
          notification_type: string
          provider: string | null
          read_at: string | null
          recipient_name: string | null
          recipient_phone: string
          retry_count: number | null
          sender_phone: string | null
          sent_at: string | null
          status: string
          user_id: string
          waha_response: Json | null
          whatsapp_number_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          message_id?: string | null
          next_retry_at?: string | null
          notification_type: string
          provider?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone: string
          retry_count?: number | null
          sender_phone?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
          waha_response?: Json | null
          whatsapp_number_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          message_id?: string | null
          next_retry_at?: string | null
          notification_type?: string
          provider?: string | null
          read_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          retry_count?: number | null
          sender_phone?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
          waha_response?: Json | null
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_log_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "rental_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_log_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_numbers: {
        Row: {
          business_days: number[] | null
          business_hours_enabled: boolean | null
          business_hours_end: string | null
          business_hours_start: string | null
          connection_status: string | null
          consecutive_errors: number | null
          created_at: string | null
          daily_limit: number | null
          error_message: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_connection_test: string | null
          last_reset_date: string | null
          messages_sent_today: number | null
          meta_access_token: string | null
          meta_business_account_id: string | null
          meta_phone_number_id: string | null
          meta_webhook_verify_token: string | null
          name: string
          notification_types: string[] | null
          phone_number: string
          priority: number | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_days?: number[] | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          connection_status?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          daily_limit?: number | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_reset_date?: string | null
          messages_sent_today?: number | null
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          meta_webhook_verify_token?: string | null
          name: string
          notification_types?: string[] | null
          phone_number: string
          priority?: number | null
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_days?: number[] | null
          business_hours_enabled?: boolean | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          connection_status?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          daily_limit?: number | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_connection_test?: string | null
          last_reset_date?: string | null
          messages_sent_today?: number | null
          meta_access_token?: string | null
          meta_business_account_id?: string | null
          meta_phone_number_id?: string | null
          meta_webhook_verify_token?: string | null
          name?: string
          notification_types?: string[] | null
          phone_number?: string
          priority?: number | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_scheduled_messages: {
        Row: {
          contract_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          media_url: string | null
          message_content: string | null
          message_type: string | null
          notification_type: string | null
          recipient_name: string | null
          recipient_phone: string
          scheduled_at: string
          sent_at: string | null
          status: string | null
          template_name: string | null
          template_variables: Json | null
          timezone: string | null
          user_id: string
          whatsapp_number_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          notification_type?: string | null
          recipient_name?: string | null
          recipient_phone: string
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_variables?: Json | null
          timezone?: string | null
          user_id: string
          whatsapp_number_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message_content?: string | null
          message_type?: string | null
          notification_type?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          template_variables?: Json | null
          timezone?: string | null
          user_id?: string
          whatsapp_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_scheduled_messages_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          auto_retry_enabled: boolean | null
          connection_status: string | null
          created_at: string | null
          error_message: string | null
          id: string
          is_active: boolean | null
          last_connection_test: string | null
          max_retry_attempts: number | null
          retry_delay_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_retry_enabled?: boolean | null
          connection_status?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_connection_test?: string | null
          max_retry_attempts?: number | null
          retry_delay_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_retry_enabled?: boolean | null
          connection_status?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          is_active?: boolean | null
          last_connection_test?: string | null
          max_retry_attempts?: number | null
          retry_delay_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_tracked_links: {
        Row: {
          click_count: number | null
          clicks: Json | null
          created_at: string | null
          first_click_at: string | null
          id: string
          last_click_at: string | null
          message_id: string | null
          original_url: string
          short_code: string
          user_id: string
        }
        Insert: {
          click_count?: number | null
          clicks?: Json | null
          created_at?: string | null
          first_click_at?: string | null
          id?: string
          last_click_at?: string | null
          message_id?: string | null
          original_url: string
          short_code: string
          user_id: string
        }
        Update: {
          click_count?: number | null
          clicks?: Json | null
          created_at?: string | null
          first_click_at?: string | null
          id?: string
          last_click_at?: string | null
          message_id?: string | null
          original_url?: string
          short_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tracked_links_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_bank_balance: {
        Args: { p_bank_account_id: string }
        Returns: number
      }
      check_user_role: {
        Args: { role_name: string; user_id: string }
        Returns: boolean
      }
      cleanup_old_agent_logs: { Args: never; Returns: number }
      cleanup_old_agent_outputs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      expire_burst_requests: { Args: never; Returns: number }
      generate_contract_access_code: { Args: never; Returns: string }
      generate_tracking_code: { Args: never; Returns: string }
      generate_trip_code: { Args: never; Returns: string }
      get_available_years: {
        Args: { p_user_id: string }
        Returns: {
          year: number
        }[]
      }
      get_dashboard_summary: {
        Args: { p_user_id: string }
        Returns: {
          active_contracts: number
          pending_payments: number
          total_balance: number
          total_expense_this_month: number
          total_income_this_month: number
        }[]
      }
      get_email_daily_trends: {
        Args: { days: number }
        Returns: {
          count: number
          date: string
          template_type: string
        }[]
      }
      get_email_provider_distribution: {
        Args: never
        Returns: {
          count: number
          provider_name: string
          template_type: string
        }[]
      }
      get_email_usage_by_type: {
        Args: { start_date: string }
        Returns: {
          failed: number
          pending: number
          sent: number
          template_type: string
          total: number
        }[]
      }
      get_monthly_trend: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          expenses: number
          income: number
          month: string
        }[]
      }
      get_pending_burst_requests: {
        Args: { p_user_id?: string }
        Returns: {
          amount_expected: number
          burst_expires_at: string
          contract_id: string
          customer_name: string
          id: string
          requested_at: string
          seconds_remaining: number
        }[]
      }
      get_table_sizes: {
        Args: never
        Returns: {
          last_modified: string
          row_count: number
          size_bytes: number
          table_name: string
        }[]
      }
      get_transaction_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          expense_count: number
          income_count: number
          net_balance: number
          total_expense: number
          total_income: number
        }[]
      }
      get_user_bank_balances: {
        Args: { p_user_id: string }
        Returns: {
          account_number: string
          bank_account_id: string
          bank_name: string
          calculated_balance: number
        }[]
      }
      get_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email_verified: boolean
          full_name: string
          id: string
          is_suspended: boolean
          nomor_telepon: string
          role: string
          role_id: string
          temp_email: boolean
          username: string
        }[]
      }
      increment_contract_link_views: {
        Args: { p_access_code: string }
        Returns: undefined
      }
      increment_provider_usage: {
        Args: { p_provider_id: string }
        Returns: undefined
      }
      increment_short_link_clicks: {
        Args: { link_id: string }
        Returns: undefined
      }
      increment_template_usage: {
        Args: { p_template_type: string }
        Returns: undefined
      }
      initialize_whatsapp_templates: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      is_user: { Args: { user_id: string }; Returns: boolean }
      match_mutation_with_request: {
        Args: { p_amount: number; p_mutation_id: string }
        Returns: string
      }
      process_whatsapp_notification_queue: {
        Args: never
        Returns: {
          error_count: number
          processed_count: number
        }[]
      }
      reset_daily_email_counter: { Args: never; Returns: undefined }
      reset_email_provider_daily_counters: { Args: never; Returns: undefined }
      reset_email_provider_monthly_counters: { Args: never; Returns: undefined }
      reset_whatsapp_daily_counts: { Args: never; Returns: undefined }
      update_provider_error: {
        Args: { p_error_message: string; p_provider_id: string }
        Returns: undefined
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
