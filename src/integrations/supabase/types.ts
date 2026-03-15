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
      api_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_key?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendant_profiles: {
        Row: {
          active_conversations: number | null
          avatar_url: string | null
          created_at: string | null
          csm_id: string
          display_name: string
          id: string
          max_conversations: number | null
          previous_status: string | null
          skill_level: string | null
          sound_enabled: boolean | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_conversations?: number | null
          avatar_url?: string | null
          created_at?: string | null
          csm_id: string
          display_name: string
          id?: string
          max_conversations?: number | null
          previous_status?: string | null
          skill_level?: string | null
          sound_enabled?: boolean | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_conversations?: number | null
          avatar_url?: string | null
          created_at?: string | null
          csm_id?: string
          display_name?: string
          id?: string
          max_conversations?: number | null
          previous_status?: string | null
          skill_level?: string | null
          sound_enabled?: boolean | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendant_profiles_csm_id_fkey"
            columns: ["csm_id"]
            isOneToOne: false
            referencedRelation: "csms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendant_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_settings: {
        Row: {
          accent_color: string | null
          brand_name: string
          company_name: string | null
          created_at: string
          id: string
          logo_url: string | null
          nps_widget_position: string | null
          nps_widget_primary_color: string | null
          primary_color: string | null
          secondary_color: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nps_widget_position?: string | null
          nps_widget_primary_color?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string
          company_name?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nps_widget_position?: string | null
          nps_widget_primary_color?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_contacts: {
        Row: {
          campaign_id: string
          company_contact_id: string | null
          contact_id: string
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          embedded_viewed: boolean | null
          embedded_viewed_at: string | null
          id: string
          link_token: string
          response_channel: string | null
        }
        Insert: {
          campaign_id: string
          company_contact_id?: string | null
          contact_id: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          embedded_viewed?: boolean | null
          embedded_viewed_at?: string | null
          id?: string
          link_token?: string
          response_channel?: string | null
        }
        Update: {
          campaign_id?: string
          company_contact_id?: string | null
          contact_id?: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          embedded_viewed?: boolean | null
          embedded_viewed_at?: string | null
          id?: string
          link_token?: string
          response_channel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          attempt: number
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          response_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attempt: number
          campaign_id: string
          contact_id: string
          created_at?: string
          id?: string
          response_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempt?: number
          campaign_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          response_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          attempt_current: number | null
          attempts_total: number | null
          brand_settings_id: string | null
          campaign_type: string
          created_at: string | null
          cycle_type: string | null
          id: string
          message: string
          name: string
          next_send: string | null
          send_channels: string[] | null
          sent_at: string | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          attempt_current?: number | null
          attempts_total?: number | null
          brand_settings_id?: string | null
          campaign_type?: string
          created_at?: string | null
          cycle_type?: string | null
          id?: string
          message: string
          name: string
          next_send?: string | null
          send_channels?: string[] | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          attempt_current?: number | null
          attempts_total?: number | null
          brand_settings_id?: string | null
          campaign_type?: string
          created_at?: string | null
          cycle_type?: string | null
          id?: string
          message?: string
          name?: string
          next_send?: string | null
          send_channels?: string[] | null
          sent_at?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_settings_id_fkey"
            columns: ["brand_settings_id"]
            isOneToOne: false
            referencedRelation: "brand_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_assignment_configs: {
        Row: {
          advanced_notify_enabled: boolean
          advanced_prefer_senior: boolean
          advanced_reassign_enabled: boolean
          advanced_reassign_minutes: number
          allow_over_capacity: boolean
          capacity_limit: number
          category_team_id: string
          created_at: string | null
          enabled: boolean
          fallback_mode: string
          fallback_team_id: string | null
          id: string
          model: string
          online_only: boolean
          priority_bypass: boolean
          rr_last_attendant_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          advanced_notify_enabled?: boolean
          advanced_prefer_senior?: boolean
          advanced_reassign_enabled?: boolean
          advanced_reassign_minutes?: number
          allow_over_capacity?: boolean
          capacity_limit?: number
          category_team_id: string
          created_at?: string | null
          enabled?: boolean
          fallback_mode?: string
          fallback_team_id?: string | null
          id?: string
          model?: string
          online_only?: boolean
          priority_bypass?: boolean
          rr_last_attendant_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          advanced_notify_enabled?: boolean
          advanced_prefer_senior?: boolean
          advanced_reassign_enabled?: boolean
          advanced_reassign_minutes?: number
          allow_over_capacity?: boolean
          capacity_limit?: number
          category_team_id?: string
          created_at?: string | null
          enabled?: boolean
          fallback_mode?: string
          fallback_team_id?: string | null
          id?: string
          model?: string
          online_only?: boolean
          priority_bypass?: boolean
          rr_last_attendant_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_assignment_configs_category_team_id_fkey"
            columns: ["category_team_id"]
            isOneToOne: false
            referencedRelation: "chat_category_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_assignment_configs_fallback_team_id_fkey"
            columns: ["fallback_team_id"]
            isOneToOne: false
            referencedRelation: "chat_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_auto_rules: {
        Row: {
          close_resolution_status: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          message_content: string | null
          rule_type: string
          sort_order: number | null
          tenant_id: string | null
          trigger_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          close_resolution_status?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message_content?: string | null
          rule_type: string
          sort_order?: number | null
          tenant_id?: string | null
          trigger_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          close_resolution_status?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          message_content?: string | null
          rule_type?: string
          sort_order?: number | null
          tenant_id?: string | null
          trigger_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_auto_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_banner_assignments: {
        Row: {
          banner_id: string
          contact_id: string
          created_at: string | null
          dismissed_at: string | null
          id: string
          is_active: boolean | null
          tenant_id: string | null
          views_count: number | null
          vote: string | null
          voted_at: string | null
        }
        Insert: {
          banner_id: string
          contact_id: string
          created_at?: string | null
          dismissed_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string | null
          views_count?: number | null
          vote?: string | null
          voted_at?: string | null
        }
        Update: {
          banner_id?: string
          contact_id?: string
          created_at?: string | null
          dismissed_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string | null
          views_count?: number | null
          vote?: string | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_banner_assignments_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "chat_banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_banner_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_banner_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_banner_field_rules: {
        Row: {
          banner_id: string
          created_at: string | null
          field_key: string
          field_source: string
          field_value: string
          id: string
          operator: string
          tenant_id: string | null
        }
        Insert: {
          banner_id: string
          created_at?: string | null
          field_key: string
          field_source?: string
          field_value: string
          id?: string
          operator?: string
          tenant_id?: string | null
        }
        Update: {
          banner_id?: string
          created_at?: string | null
          field_key?: string
          field_source?: string
          field_value?: string
          id?: string
          operator?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_banner_field_rules_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "chat_banners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_banner_field_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_banners: {
        Row: {
          auto_assign_by_rules: boolean
          auto_dismiss_seconds: number | null
          banner_type: string
          bg_color: string | null
          border_style: string
          content: string
          content_html: string | null
          created_at: string | null
          display_frequency: string
          expires_at: string | null
          has_decorations: boolean | null
          has_voting: boolean | null
          id: string
          is_active: boolean | null
          link_label: string | null
          link_url: string | null
          max_views: number | null
          outbound_type: string
          page_html: string | null
          position: string
          priority: number
          shadow_style: string
          starts_at: string | null
          target_all: boolean
          tenant_id: string | null
          text_align: string
          text_color: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_assign_by_rules?: boolean
          auto_dismiss_seconds?: number | null
          banner_type?: string
          bg_color?: string | null
          border_style?: string
          content: string
          content_html?: string | null
          created_at?: string | null
          display_frequency?: string
          expires_at?: string | null
          has_decorations?: boolean | null
          has_voting?: boolean | null
          id?: string
          is_active?: boolean | null
          link_label?: string | null
          link_url?: string | null
          max_views?: number | null
          outbound_type?: string
          page_html?: string | null
          position?: string
          priority?: number
          shadow_style?: string
          starts_at?: string | null
          target_all?: boolean
          tenant_id?: string | null
          text_align?: string
          text_color?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_assign_by_rules?: boolean
          auto_dismiss_seconds?: number | null
          banner_type?: string
          bg_color?: string | null
          border_style?: string
          content?: string
          content_html?: string | null
          created_at?: string | null
          display_frequency?: string
          expires_at?: string | null
          has_decorations?: boolean | null
          has_voting?: boolean | null
          id?: string
          is_active?: boolean | null
          link_label?: string | null
          link_url?: string | null
          max_views?: number | null
          outbound_type?: string
          page_html?: string | null
          position?: string
          priority?: number
          shadow_style?: string
          starts_at?: string | null
          target_all?: boolean
          tenant_id?: string | null
          text_align?: string
          text_color?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_broadcast_recipients: {
        Row: {
          broadcast_id: string
          chat_room_id: string | null
          clicked_at: string | null
          company_contact_id: string | null
          contact_id: string | null
          created_at: string
          delivered_at: string | null
          id: string
          sent_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          broadcast_id: string
          chat_room_id?: string | null
          clicked_at?: string | null
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          broadcast_id?: string
          chat_room_id?: string | null
          clicked_at?: string | null
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "chat_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_broadcast_recipients_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_broadcast_recipients_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_broadcast_recipients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_broadcasts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          message: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          tenant_id: string | null
          title: string
          total_recipients: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          total_recipients?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          total_recipients?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_broadcasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_business_hour_breaks: {
        Row: {
          business_hour_id: string
          created_at: string
          end_time: string
          id: string
          message: string | null
          start_time: string
          tenant_id: string | null
        }
        Insert: {
          business_hour_id: string
          created_at?: string
          end_time?: string
          id?: string
          message?: string | null
          start_time?: string
          tenant_id?: string | null
        }
        Update: {
          business_hour_id?: string
          created_at?: string
          end_time?: string
          id?: string
          message?: string | null
          start_time?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_business_hour_breaks_business_hour_id_fkey"
            columns: ["business_hour_id"]
            isOneToOne: false
            referencedRelation: "chat_business_hours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_business_hour_breaks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_business_hour_overrides: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_closed: boolean
          label: string | null
          offline_message: string | null
          override_date: string
          start_time: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          label?: string | null
          offline_message?: string | null
          override_date: string
          start_time?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          label?: string | null
          offline_message?: string | null
          override_date?: string
          start_time?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_business_hour_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_business_hours: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string | null
          id: string
          is_active: boolean | null
          start_time: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          start_time?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_category_field_rules: {
        Row: {
          category_id: string
          created_at: string | null
          field_key: string
          field_source: string
          field_value: string
          id: string
          operator: string
          tenant_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          field_key: string
          field_source?: string
          field_value: string
          id?: string
          operator?: string
          tenant_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          field_key?: string
          field_source?: string
          field_value?: string
          id?: string
          operator?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_category_field_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chat_service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_category_field_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_category_teams: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          priority_order: number | null
          team_id: string
          tenant_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          priority_order?: number | null
          team_id: string
          tenant_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          priority_order?: number | null
          team_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_category_teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chat_service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_category_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "chat_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_category_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_custom_field_definitions: {
        Row: {
          created_at: string | null
          display_order: number | null
          field_type: string
          id: string
          is_active: boolean | null
          key: string
          label: string
          maps_to: string | null
          target: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          maps_to?: string | null
          target?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          maps_to?: string | null
          target?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_custom_fields: {
        Row: {
          created_at: string | null
          field_type: string | null
          id: string
          is_required: boolean | null
          label: string
          name: string
          placeholder: string | null
          sort_order: number | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          field_type?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          name: string
          placeholder?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          field_type?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          name?: string
          placeholder?: string | null
          sort_order?: number | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_macros: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_private: boolean
          shortcut: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean
          shortcut?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean
          shortcut?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_macros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          is_internal: boolean | null
          message_type: string | null
          metadata: Json | null
          room_id: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          room_id: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_internal?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          room_id?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_reads: {
        Row: {
          id: string
          last_read_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_reads_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_tags: {
        Row: {
          room_id: string
          tag_id: string
        }
        Insert: {
          room_id: string
          tag_id: string
        }
        Update: {
          room_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_tags_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "chat_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          assigned_at: string | null
          attendant_id: string | null
          attendant_last_read_at: string | null
          closed_at: string | null
          company_contact_id: string | null
          contact_id: string | null
          created_at: string | null
          csat_comment: string | null
          csat_score: number | null
          id: string
          metadata: Json | null
          owner_user_id: string
          priority: string | null
          resolution_status: string | null
          started_at: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          visitor_id: string
          visitor_last_read_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          attendant_id?: string | null
          attendant_last_read_at?: string | null
          closed_at?: string | null
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          csat_comment?: string | null
          csat_score?: number | null
          id?: string
          metadata?: Json | null
          owner_user_id: string
          priority?: string | null
          resolution_status?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          visitor_id: string
          visitor_last_read_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          attendant_id?: string | null
          attendant_last_read_at?: string | null
          closed_at?: string | null
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          csat_comment?: string | null
          csat_score?: number | null
          id?: string
          metadata?: Json | null
          owner_user_id?: string
          priority?: string | null
          resolution_status?: string | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          visitor_id?: string
          visitor_last_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "chat_visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_service_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          all_busy_message: string | null
          all_busy_title: string | null
          allow_file_attachments: boolean
          allow_multiple_chats: boolean
          allow_reopen_resolved: boolean
          auto_assignment: boolean | null
          business_hours: Json | null
          created_at: string | null
          form_intro_text: string | null
          id: string
          max_queue_size: number | null
          offline_message: string | null
          outside_hours_message: string | null
          outside_hours_title: string | null
          require_approval: boolean | null
          show_all_busy_banner: boolean
          show_chat_history: boolean
          show_csat: boolean
          show_email_field: boolean
          show_outside_hours_banner: boolean
          show_phone_field: boolean
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          waiting_message: string | null
          welcome_message: string | null
          widget_button_shape: string
          widget_company_name: string | null
          widget_position: string | null
          widget_primary_color: string | null
          ws_default_panel_open: boolean
          ws_hidden_custom_fields: string[]
          ws_recent_chats_count: number
          ws_show_company_cnpj: boolean
          ws_show_company_external_id: boolean
          ws_show_company_info: boolean
          ws_show_company_location: boolean
          ws_show_company_sector: boolean
          ws_show_contact_chat_stats: boolean
          ws_show_contact_data: boolean
          ws_show_contact_department: boolean
          ws_show_contact_external_id: boolean
          ws_show_custom_fields: boolean
          ws_show_metric_contract: boolean
          ws_show_metric_health: boolean
          ws_show_metric_mrr: boolean
          ws_show_metric_nps: boolean
          ws_show_metric_renewal: boolean
          ws_show_metrics: boolean
          ws_show_recent_chats: boolean
          ws_show_timeline: boolean
          ws_sort_order: string
          ws_timeline_max_events: number
        }
        Insert: {
          all_busy_message?: string | null
          all_busy_title?: string | null
          allow_file_attachments?: boolean
          allow_multiple_chats?: boolean
          allow_reopen_resolved?: boolean
          auto_assignment?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          form_intro_text?: string | null
          id?: string
          max_queue_size?: number | null
          offline_message?: string | null
          outside_hours_message?: string | null
          outside_hours_title?: string | null
          require_approval?: boolean | null
          show_all_busy_banner?: boolean
          show_chat_history?: boolean
          show_csat?: boolean
          show_email_field?: boolean
          show_outside_hours_banner?: boolean
          show_phone_field?: boolean
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
          waiting_message?: string | null
          welcome_message?: string | null
          widget_button_shape?: string
          widget_company_name?: string | null
          widget_position?: string | null
          widget_primary_color?: string | null
          ws_default_panel_open?: boolean
          ws_hidden_custom_fields?: string[]
          ws_recent_chats_count?: number
          ws_show_company_cnpj?: boolean
          ws_show_company_external_id?: boolean
          ws_show_company_info?: boolean
          ws_show_company_location?: boolean
          ws_show_company_sector?: boolean
          ws_show_contact_chat_stats?: boolean
          ws_show_contact_data?: boolean
          ws_show_contact_department?: boolean
          ws_show_contact_external_id?: boolean
          ws_show_custom_fields?: boolean
          ws_show_metric_contract?: boolean
          ws_show_metric_health?: boolean
          ws_show_metric_mrr?: boolean
          ws_show_metric_nps?: boolean
          ws_show_metric_renewal?: boolean
          ws_show_metrics?: boolean
          ws_show_recent_chats?: boolean
          ws_show_timeline?: boolean
          ws_sort_order?: string
          ws_timeline_max_events?: number
        }
        Update: {
          all_busy_message?: string | null
          all_busy_title?: string | null
          allow_file_attachments?: boolean
          allow_multiple_chats?: boolean
          allow_reopen_resolved?: boolean
          auto_assignment?: boolean | null
          business_hours?: Json | null
          created_at?: string | null
          form_intro_text?: string | null
          id?: string
          max_queue_size?: number | null
          offline_message?: string | null
          outside_hours_message?: string | null
          outside_hours_title?: string | null
          require_approval?: boolean | null
          show_all_busy_banner?: boolean
          show_chat_history?: boolean
          show_csat?: boolean
          show_email_field?: boolean
          show_outside_hours_banner?: boolean
          show_phone_field?: boolean
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          waiting_message?: string | null
          welcome_message?: string | null
          widget_button_shape?: string
          widget_company_name?: string | null
          widget_position?: string | null
          widget_primary_color?: string | null
          ws_default_panel_open?: boolean
          ws_hidden_custom_fields?: string[]
          ws_recent_chats_count?: number
          ws_show_company_cnpj?: boolean
          ws_show_company_external_id?: boolean
          ws_show_company_info?: boolean
          ws_show_company_location?: boolean
          ws_show_company_sector?: boolean
          ws_show_contact_chat_stats?: boolean
          ws_show_contact_data?: boolean
          ws_show_contact_department?: boolean
          ws_show_contact_external_id?: boolean
          ws_show_custom_fields?: boolean
          ws_show_metric_contract?: boolean
          ws_show_metric_health?: boolean
          ws_show_metric_mrr?: boolean
          ws_show_metric_nps?: boolean
          ws_show_metric_renewal?: boolean
          ws_show_metrics?: boolean
          ws_show_recent_chats?: boolean
          ws_show_timeline?: boolean
          ws_sort_order?: string
          ws_timeline_max_events?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_team_members: {
        Row: {
          attendant_id: string
          created_at: string | null
          id: string
          team_id: string
          tenant_id: string | null
        }
        Insert: {
          attendant_id: string
          created_at?: string | null
          id?: string
          team_id: string
          tenant_id?: string | null
        }
        Update: {
          attendant_id?: string
          created_at?: string | null
          id?: string
          team_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_team_members_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "attendant_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "chat_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_teams: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_visitors: {
        Row: {
          company_contact_id: string | null
          contact_id: string | null
          created_at: string | null
          department: string | null
          email: string | null
          id: string
          metadata: Json | null
          name: string
          owner_user_id: string
          phone: string | null
          role: string | null
          tenant_id: string | null
          visitor_token: string | null
        }
        Insert: {
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name: string
          owner_user_id: string
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          visitor_token?: string | null
        }
        Update: {
          company_contact_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          role?: string | null
          tenant_id?: string | null
          visitor_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_visitors_company_contact_id_fkey"
            columns: ["company_contact_id"]
            isOneToOne: false
            referencedRelation: "company_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_visitors_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_visitors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_contacts: {
        Row: {
          chat_avg_csat: number | null
          chat_last_at: string | null
          chat_total: number | null
          chat_visitor_id: string | null
          company_id: string
          created_at: string | null
          custom_fields: Json | null
          department: string | null
          email: string
          external_id: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          public_token: string | null
          role: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_avg_csat?: number | null
          chat_last_at?: string | null
          chat_total?: number | null
          chat_visitor_id?: string | null
          company_id: string
          created_at?: string | null
          custom_fields?: Json | null
          department?: string | null
          email: string
          external_id?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          public_token?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_avg_csat?: number | null
          chat_last_at?: string | null
          chat_total?: number | null
          chat_visitor_id?: string | null
          company_id?: string
          created_at?: string | null
          custom_fields?: Json | null
          department?: string | null
          email?: string
          external_id?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          public_token?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          company_document: string | null
          company_sector: string | null
          complement: string | null
          contract_value: number | null
          country: string | null
          created_at: string | null
          cs_status: string | null
          csm_id: string | null
          custom_fields: Json | null
          email: string | null
          external_id: string | null
          health_score: number | null
          id: string
          is_company: boolean
          last_nps_date: string | null
          last_nps_score: number | null
          mrr: number | null
          name: string
          neighborhood: string | null
          phone: string | null
          renewal_date: string | null
          service_category_id: string | null
          service_priority: string | null
          state: string | null
          street: string | null
          street_number: string | null
          tenant_id: string | null
          trade_name: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          company_document?: string | null
          company_sector?: string | null
          complement?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string | null
          cs_status?: string | null
          csm_id?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          health_score?: number | null
          id?: string
          is_company?: boolean
          last_nps_date?: string | null
          last_nps_score?: number | null
          mrr?: number | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          renewal_date?: string | null
          service_category_id?: string | null
          service_priority?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          company_document?: string | null
          company_sector?: string | null
          complement?: string | null
          contract_value?: number | null
          country?: string | null
          created_at?: string | null
          cs_status?: string | null
          csm_id?: string | null
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          health_score?: number | null
          id?: string
          is_company?: boolean
          last_nps_date?: string | null
          last_nps_score?: number | null
          mrr?: number | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          renewal_date?: string | null
          service_category_id?: string | null
          service_priority?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          tenant_id?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_csm_id_fkey"
            columns: ["csm_id"]
            isOneToOne: false
            referencedRelation: "csms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "chat_service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      csms: {
        Row: {
          chat_max_conversations: number | null
          created_at: string | null
          department: string | null
          email: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          is_chat_enabled: boolean | null
          name: string
          phone: string | null
          specialty: string[] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_max_conversations?: number | null
          created_at?: string | null
          department?: string | null
          email: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_chat_enabled?: boolean | null
          name: string
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_max_conversations?: number | null
          created_at?: string | null
          department?: string | null
          email?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_chat_enabled?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_events: {
        Row: {
          article_id: string
          event_meta: Json
          event_type: string
          id: string
          occurred_at: string
          session_id: string | null
          tenant_id: string
          version_id: string | null
          visitor_id: string | null
        }
        Insert: {
          article_id: string
          event_meta?: Json
          event_type: string
          id?: string
          occurred_at?: string
          session_id?: string | null
          tenant_id: string
          version_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          article_id?: string
          event_meta?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          session_id?: string | null
          tenant_id?: string
          version_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_events_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_article_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_article_events_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "help_article_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_feedback: {
        Row: {
          article_id: string
          created_at: string
          helpful: boolean
          id: string
          tenant_id: string
          visitor_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          helpful: boolean
          id?: string
          tenant_id: string
          visitor_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          helpful?: boolean
          id?: string
          tenant_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_versions: {
        Row: {
          article_id: string
          change_summary: string | null
          created_at: string
          created_by_user_id: string
          editor_schema_json: Json
          html_snapshot: string | null
          id: string
          tenant_id: string
          version_number: number
        }
        Insert: {
          article_id: string
          change_summary?: string | null
          created_at?: string
          created_by_user_id: string
          editor_schema_json?: Json
          html_snapshot?: string | null
          id?: string
          tenant_id: string
          version_number?: number
        }
        Update: {
          article_id?: string
          change_summary?: string | null
          created_at?: string
          created_by_user_id?: string
          editor_schema_json?: Json
          html_snapshot?: string | null
          id?: string
          tenant_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "help_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_article_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          archived_at: string | null
          collection_id: string | null
          created_at: string
          created_by_user_id: string
          current_version_id: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          subtitle: string | null
          tenant_id: string
          title: string
          updated_at: string
          updated_by_user_id: string | null
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          created_by_user_id: string
          current_version_id?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          collection_id?: string | null
          created_at?: string
          created_by_user_id?: string
          current_version_id?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "help_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "help_article_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      help_collections: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number
          slug: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          slug: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          slug?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_collections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      help_site_settings: {
        Row: {
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          contact_channels_json: Json
          created_at: string
          custom_css: string | null
          favicon_url: string | null
          footer_bg_color: string | null
          footer_html: string | null
          footer_links_json: Json | null
          footer_logo_url: string | null
          footer_social_json: Json | null
          footer_text: string | null
          header_bg_color: string | null
          header_links_json: Json | null
          hero_image_url: string | null
          hero_overlay_opacity: number | null
          home_subtitle: string | null
          home_title: string | null
          public_base_url: string | null
          tenant_id: string
          theme: string
          updated_at: string
        }
        Insert: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          contact_channels_json?: Json
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          footer_bg_color?: string | null
          footer_html?: string | null
          footer_links_json?: Json | null
          footer_logo_url?: string | null
          footer_social_json?: Json | null
          footer_text?: string | null
          header_bg_color?: string | null
          header_links_json?: Json | null
          hero_image_url?: string | null
          hero_overlay_opacity?: number | null
          home_subtitle?: string | null
          home_title?: string | null
          public_base_url?: string | null
          tenant_id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          contact_channels_json?: Json
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          footer_bg_color?: string | null
          footer_html?: string | null
          footer_links_json?: Json | null
          footer_logo_url?: string | null
          footer_social_json?: Json | null
          footer_text?: string | null
          header_bg_color?: string | null
          header_links_json?: Json | null
          hero_image_url?: string | null
          hero_overlay_opacity?: number | null
          home_subtitle?: string | null
          home_title?: string | null
          public_base_url?: string | null
          tenant_id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          landing_page: string | null
          name: string
          notes: string | null
          phone: string | null
          referrer: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          landing_page?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          landing_page?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      responses: {
        Row: {
          campaign_id: string
          comment: string | null
          contact_id: string
          created_at: string | null
          id: string
          responded_at: string | null
          score: number
          token: string
        }
        Insert: {
          campaign_id: string
          comment?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          score: number
          token: string
        }
        Update: {
          campaign_id?: string
          comment?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          score?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          contact_id: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          metadata: Json | null
          tenant_id: string | null
          title: string
          type: Database["public"]["Enums"]["timeline_event_type"]
          updated_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          title: string
          type: Database["public"]["Enums"]["timeline_event_type"]
          updated_at?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["timeline_event_type"]
          updated_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_activity_logs: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          contact_id: string
          created_at: string | null
          id: string
          notes: string | null
          trail_id: string
          trail_template_activity_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          trail_id: string
          trail_template_activity_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          trail_id?: string
          trail_template_activity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_activity_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_activity_logs_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_activity_logs_trail_template_activity_id_fkey"
            columns: ["trail_template_activity_id"]
            isOneToOne: false
            referencedRelation: "trail_template_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_template_activities: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_days: number | null
          id: string
          is_required: boolean | null
          name: string
          order_index: number | null
          trail_template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_days?: number | null
          id?: string
          is_required?: boolean | null
          name: string
          order_index?: number | null
          trail_template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_days?: number | null
          id?: string
          is_required?: boolean | null
          name?: string
          order_index?: number | null
          trail_template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_template_activities_trail_template_id_fkey"
            columns: ["trail_template_id"]
            isOneToOne: false
            referencedRelation: "trail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["trail_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          contact_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          progress_percentage: number | null
          started_at: string | null
          status: string | null
          tenant_id: string | null
          trail_template_id: string | null
          type: Database["public"]["Enums"]["trail_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trail_template_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          progress_percentage?: number | null
          started_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trail_template_id?: string | null
          type?: Database["public"]["Enums"]["trail_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_trail_template_id_fkey"
            columns: ["trail_template_id"]
            isOneToOne: false
            referencedRelation: "trail_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_settings: {
        Row: {
          created_at: string | null
          gmail_client_id: string | null
          gmail_client_secret: string | null
          gmail_refresh_token: string | null
          id: string
          is_verified: boolean | null
          provider: string
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_refresh_token?: string | null
          id?: string
          is_verified?: boolean | null
          provider?: string
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          gmail_client_id?: string | null
          gmail_client_secret?: string | null
          gmail_refresh_token?: string | null
          id?: string
          is_verified?: boolean | null
          provider?: string
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_email_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          created_at: string | null
          id: string
          notify_detractors: boolean | null
          notify_email: string | null
          notify_neutrals: boolean | null
          notify_on_response: boolean | null
          notify_promoters: boolean | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notify_detractors?: boolean | null
          notify_email?: string | null
          notify_neutrals?: boolean | null
          notify_on_response?: boolean | null
          notify_promoters?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notify_detractors?: boolean | null
          notify_email?: string | null
          notify_neutrals?: boolean | null
          notify_on_response?: boolean | null
          notify_promoters?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_manage: boolean | null
          can_view: boolean | null
          created_at: string | null
          granted_by: string | null
          id: string
          module: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_manage?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          granted_by?: string | null
          id?: string
          module: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_manage?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          granted_by?: string | null
          id?: string
          module?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          display_name: string | null
          email: string
          id: string
          invite_status: string | null
          invite_token: string | null
          invited_by: string | null
          is_active: boolean | null
          last_sign_in_at: string | null
          phone: string | null
          specialty: string[] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email: string
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string
          id?: string
          invite_status?: string | null
          invite_token?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_sign_in_at?: string | null
          phone?: string | null
          specialty?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      search_help_articles: {
        Args: { p_limit?: number; p_query: string; p_tenant_id: string }
        Returns: {
          body_snippet: string
          id: string
          relevance: number
          slug: string
          subtitle: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "attendant" | "master"
      timeline_event_type:
        | "meeting"
        | "email"
        | "call"
        | "contract"
        | "payment"
        | "activity"
        | "nps_response"
        | "chat_opened"
        | "chat_closed"
      trail_type: "default" | "overdue" | "attention" | "nps"
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
      app_role: ["admin", "attendant", "master"],
      timeline_event_type: [
        "meeting",
        "email",
        "call",
        "contract",
        "payment",
        "activity",
        "nps_response",
        "chat_opened",
        "chat_closed",
      ],
      trail_type: ["default", "overdue", "attention", "nps"],
    },
  },
} as const
