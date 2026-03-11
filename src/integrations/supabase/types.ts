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
      admin_card_order: {
        Row: {
          card_key: string | null
          card_order: Json | null
          created_at: string | null
          display_order: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_key?: string | null
          card_order?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_key?: string | null
          card_order?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_conversations: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          messages: Json | null
          topic: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          messages?: Json | null
          topic?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          messages?: Json | null
          topic?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      allah_names: {
        Row: {
          audio_url: string | null
          created_at: string | null
          display_order: number | null
          explanation: string | null
          id: number
          image_url: string | null
          name_arabic: string
          name_french: string
          transliteration: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: number
          image_url?: string | null
          name_arabic: string
          name_french: string
          transliteration?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: number
          image_url?: string | null
          name_arabic?: string
          name_french?: string
          transliteration?: string | null
        }
        Relationships: []
      }
      alphabet_content: {
        Row: {
          content_type: string
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_url: string
          id: string
          letter_id: number
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          letter_id: number
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          letter_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alphabet_content_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "alphabet_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      alphabet_letters: {
        Row: {
          audio_url: string | null
          created_at: string | null
          display_order: number | null
          id: number
          letter_arabic: string
          name_arabic: string
          name_french: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: number
          letter_arabic: string
          name_arabic: string
          name_french: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: number
          letter_arabic?: string
          name_arabic?: string
          name_french?: string
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          is_read: boolean | null
          level: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          level?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          level?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string | null
          date: string
          id: string
          marked_by: string | null
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      connexion_logs: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          login_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dashboard_card_visibility: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          is_visible: boolean | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_card_visibility_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "dashboard_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_cards: {
        Row: {
          bg_color: string | null
          card_key: string | null
          content: string | null
          content_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          file_name: string | null
          file_url: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          route: string | null
          title: string
        }
        Insert: {
          bg_color?: string | null
          card_key?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          route?: string | null
          title: string
        }
        Update: {
          bg_color?: string | null
          card_key?: string | null
          content?: string | null
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          route?: string | null
          title?: string
        }
        Relationships: []
      }
      homework_assignments: {
        Row: {
          audio_url: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_active: boolean | null
          lesson_reference: string | null
          status: string | null
          subject: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          lesson_reference?: string | null
          status?: string | null
          subject?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          lesson_reference?: string | null
          status?: string | null
          subject?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      homework_submissions: {
        Row: {
          assignment_id: string
          audio_url: string | null
          created_at: string | null
          feedback: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          grade: string | null
          id: string
          notes: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          assignment_id: string
          audio_url?: string | null
          created_at?: string | null
          feedback?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string
          audio_url?: string | null
          created_at?: string | null
          feedback?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      invocation_content: {
        Row: {
          content_type: string
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_url: string
          id: string
          invocation_id: number
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          invocation_id: number
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          invocation_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invocation_content_invocation_id_fkey"
            columns: ["invocation_id"]
            isOneToOne: false
            referencedRelation: "invocations"
            referencedColumns: ["id"]
          },
        ]
      }
      invocation_validation_requests: {
        Row: {
          created_at: string | null
          id: string
          invocation_id: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invocation_id: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invocation_id?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invocation_validation_requests_invocation_id_fkey"
            columns: ["invocation_id"]
            isOneToOne: false
            referencedRelation: "invocations"
            referencedColumns: ["id"]
          },
        ]
      }
      invocations: {
        Row: {
          category: string | null
          created_at: string | null
          display_order: number | null
          id: number
          image_url: string | null
          is_locked: boolean | null
          title_arabic: string
          title_french: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: number
          image_url?: string | null
          is_locked?: boolean | null
          title_arabic: string
          title_french: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: number
          image_url?: string | null
          is_locked?: boolean | null
          title_arabic?: string
          title_french?: string
        }
        Relationships: []
      }
      learning_modules: {
        Row: {
          builtin_path: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          gradient: string | null
          icon: string | null
          icon_color: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_builtin: boolean | null
          module_type: string
          title: string
          title_arabic: string | null
        }
        Insert: {
          builtin_path?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          gradient?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_builtin?: boolean | null
          module_type: string
          title: string
          title_arabic?: string | null
        }
        Update: {
          builtin_path?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          gradient?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_builtin?: boolean | null
          module_type?: string
          title?: string
          title_arabic?: string | null
        }
        Relationships: []
      }
      module_card_content: {
        Row: {
          card_id: string
          content_type: string
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          card_id: string
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          card_id?: string
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_card_content_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "module_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      module_cards: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_locked: boolean | null
          module_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_locked?: boolean | null
          module_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_locked?: boolean | null
          module_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_cards_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_content: {
        Row: {
          content_type: string
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_url: string
          id: string
          module_id: string
          title: string | null
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          module_id: string
          title?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          module_id?: string
          title?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_content_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_confirmations: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_confirmations_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_history"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          sent_by: string | null
          target_type: string | null
          target_user_id: string | null
          title: string
          type: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          sent_by?: string | null
          target_type?: string | null
          target_user_id?: string | null
          title: string
          type?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          sent_by?: string | null
          target_type?: string | null
          target_user_id?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          asr_reminder: boolean | null
          created_at: string | null
          daily_reminder_time: string | null
          dhuhr_reminder: boolean | null
          fajr_reminder: boolean | null
          id: string
          isha_reminder: boolean | null
          maghrib_reminder: boolean | null
          prayer_reminders: boolean | null
          ramadan_activities: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asr_reminder?: boolean | null
          created_at?: string | null
          daily_reminder_time?: string | null
          dhuhr_reminder?: boolean | null
          fajr_reminder?: boolean | null
          id?: string
          isha_reminder?: boolean | null
          maghrib_reminder?: boolean | null
          prayer_reminders?: boolean | null
          ramadan_activities?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asr_reminder?: boolean | null
          created_at?: string | null
          daily_reminder_time?: string | null
          dhuhr_reminder?: boolean | null
          fajr_reminder?: boolean | null
          id?: string
          isha_reminder?: boolean | null
          maghrib_reminder?: boolean | null
          prayer_reminders?: boolean | null
          ramadan_activities?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nourania_lesson_content: {
        Row: {
          content_type: string
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_url: string
          id: string
          lesson_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          lesson_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          lesson_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nourania_lesson_content_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "nourania_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      nourania_lessons: {
        Row: {
          audio_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_locked: boolean | null
          lesson_number: number
          page_end: number | null
          page_start: number | null
          title_arabic: string
          title_french: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_locked?: boolean | null
          lesson_number: number
          page_end?: number | null
          page_start?: number | null
          title_arabic: string
          title_french: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_locked?: boolean | null
          lesson_number?: number
          page_end?: number | null
          page_start?: number | null
          title_arabic?: string
          title_french?: string
        }
        Relationships: []
      }
      nourania_validation_requests: {
        Row: {
          created_at: string | null
          id: string
          lesson_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lesson_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lesson_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nourania_validation_requests_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "nourania_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      point_settings: {
        Row: {
          action_key: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          module_key: string | null
          module_label: string | null
          points: number
          points_per_validation: number | null
        }
        Insert: {
          action_key: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          module_key?: string | null
          module_label?: string | null
          points?: number
          points_per_validation?: number | null
        }
        Update: {
          action_key?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          module_key?: string | null
          module_label?: string | null
          points?: number
          points_per_validation?: number | null
        }
        Relationships: []
      }
      prayer_card_content: {
        Row: {
          card_id: string
          content_type: string
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          card_id: string
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          card_id?: string
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_card_content_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_cards: {
        Row: {
          category_id: string
          created_at: string | null
          display_order: number | null
          group_key: string | null
          id: string
          image_url: string | null
          is_locked: boolean | null
          title: string | null
          title_arabic: string
          title_french: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          display_order?: number | null
          group_key?: string | null
          id?: string
          image_url?: string | null
          is_locked?: boolean | null
          title?: string | null
          title_arabic: string
          title_french: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          display_order?: number | null
          group_key?: string | null
          id?: string
          image_url?: string | null
          is_locked?: boolean | null
          title?: string | null
          title_arabic?: string
          title_french?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "prayer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_default: boolean | null
          name_arabic: string
          name_french: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name_arabic: string
          name_french: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name_arabic?: string
          name_french?: string
        }
        Relationships: []
      }
      prayer_content: {
        Row: {
          audio_url: string | null
          category_id: string | null
          created_at: string | null
          display_order: number | null
          id: string
          text_arabic: string | null
          text_french: string | null
          title: string | null
        }
        Insert: {
          audio_url?: string | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          text_arabic?: string | null
          text_french?: string | null
          title?: string | null
        }
        Update: {
          audio_url?: string | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          text_arabic?: string | null
          text_french?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_content_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "prayer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          dob_set_by_user: boolean | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_admin: boolean | null
          is_approved: boolean | null
          last_seen: string | null
          notification_prompt_dismissed: string | null
          notification_prompt_later_at: string | null
          notification_prompt_later_count: number | null
          phone: string | null
          points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          dob_set_by_user?: boolean | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          last_seen?: string | null
          notification_prompt_dismissed?: string | null
          notification_prompt_later_at?: string | null
          notification_prompt_later_count?: number | null
          phone?: string | null
          points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          dob_set_by_user?: boolean | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          last_seen?: string | null
          notification_prompt_dismissed?: string | null
          notification_prompt_later_at?: string | null
          notification_prompt_later_count?: number | null
          phone?: string | null
          points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_info: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_info?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_info?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          quiz_id: string
          selected_answer: string
          user_id: string
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          quiz_id: string
          selected_answer: string
          user_id: string
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          quiz_id?: string
          selected_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "ramadan_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_day_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          day_id: string
          description: string | null
          display_order: number | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          order_index: number | null
          title: string | null
          type: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          day_id: string
          description?: string | null
          display_order?: number | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          order_index?: number | null
          title?: string | null
          type?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          day_id?: string
          description?: string | null
          display_order?: number | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          order_index?: number | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_day_activities_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_day_exceptions: {
        Row: {
          created_at: string | null
          day_id: string
          id: string
          is_unlocked: boolean | null
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_id: string
          id?: string
          is_unlocked?: boolean | null
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_id?: string
          id?: string
          is_unlocked?: boolean | null
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_day_exceptions_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_day_videos: {
        Row: {
          created_at: string | null
          day_id: string
          display_order: number | null
          file_name: string | null
          id: string
          title: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          day_id: string
          display_order?: number | null
          file_name?: string | null
          id?: string
          title?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          day_id?: string
          display_order?: number | null
          file_name?: string | null
          id?: string
          title?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_day_videos_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_days: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          is_locked: boolean | null
          pdf_url: string | null
          theme: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          is_locked?: boolean | null
          pdf_url?: string | null
          theme?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          is_locked?: boolean | null
          pdf_url?: string | null
          theme?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      ramadan_quizzes: {
        Row: {
          correct_answer: string
          correct_option: number | null
          correct_options: Json | null
          created_at: string | null
          day_id: string
          display_order: number | null
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          options: Json | null
          question: string
          question_order: number | null
        }
        Insert: {
          correct_answer: string
          correct_option?: number | null
          correct_options?: Json | null
          created_at?: string | null
          day_id: string
          display_order?: number | null
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c?: string | null
          option_d?: string | null
          options?: Json | null
          question: string
          question_order?: number | null
        }
        Update: {
          correct_answer?: string
          correct_option?: number | null
          correct_options?: Json | null
          created_at?: string | null
          day_id?: string
          display_order?: number | null
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string | null
          option_d?: string | null
          options?: Json | null
          question?: string
          question_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ramadan_quizzes_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      ramadan_settings: {
        Row: {
          auto_unlock: boolean | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string | null
          start_enabled: boolean | null
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          auto_unlock?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          start_enabled?: boolean | null
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_unlock?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          start_enabled?: boolean | null
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          is_sent: boolean | null
          message: string | null
          module: string | null
          recipients: Json | null
          require_confirmation: boolean | null
          scheduled_at: string | null
          send_time: string | null
          sent_at: string | null
          start_date: string | null
          target_type: string | null
          target_user_id: string | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          module?: string | null
          recipients?: Json | null
          require_confirmation?: boolean | null
          scheduled_at?: string | null
          send_time?: string | null
          sent_at?: string | null
          start_date?: string | null
          target_type?: string | null
          target_user_id?: string | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          module?: string | null
          recipients?: Json | null
          require_confirmation?: boolean | null
          scheduled_at?: string | null
          send_time?: string | null
          sent_at?: string | null
          start_date?: string | null
          target_type?: string | null
          target_user_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      sourate_admin_unlocks: {
        Row: {
          created_at: string | null
          id: string
          sourate_id: string
          unlocked_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          sourate_id: string
          unlocked_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          sourate_id?: string
          unlocked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourate_admin_unlocks_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
      sourate_content: {
        Row: {
          content_type: string
          created_at: string | null
          display_order: number | null
          file_name: string | null
          file_url: string
          id: string
          sourate_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url: string
          id?: string
          sourate_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          display_order?: number | null
          file_name?: string | null
          file_url?: string
          id?: string
          sourate_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sourate_content_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
      sourate_validation_requests: {
        Row: {
          created_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sourate_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sourate_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sourate_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourate_validation_requests_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
      sourates: {
        Row: {
          audio_url: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_locked: boolean | null
          name_arabic: string
          name_french: string
          number: number
          verses_count: number | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_locked?: boolean | null
          name_arabic: string
          name_french: string
          number: number
          verses_count?: number | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_locked?: boolean | null
          name_arabic?: string
          name_french?: string
          number?: number
          verses_count?: number | null
        }
        Relationships: []
      }
      student_group_members: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      student_groups: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_ranking: {
        Row: {
          created_at: string | null
          id: string
          month_points: number | null
          rank_position: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
          week_points: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_points?: number | null
          rank_position?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
          week_points?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          month_points?: number | null
          rank_position?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
          week_points?: number | null
        }
        Relationships: []
      }
      user_alphabet_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          is_validated: boolean | null
          letter_id: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_validated?: boolean | null
          letter_id: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_validated?: boolean | null
          letter_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_alphabet_progress_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "alphabet_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_prayers: {
        Row: {
          asr: boolean | null
          created_at: string | null
          date: string
          dhuhr: boolean | null
          fajr: boolean | null
          id: string
          is_checked: boolean | null
          isha: boolean | null
          maghrib: boolean | null
          prayer_name: string | null
          user_id: string
        }
        Insert: {
          asr?: boolean | null
          created_at?: string | null
          date?: string
          dhuhr?: boolean | null
          fajr?: boolean | null
          id?: string
          is_checked?: boolean | null
          isha?: boolean | null
          maghrib?: boolean | null
          prayer_name?: string | null
          user_id: string
        }
        Update: {
          asr?: boolean | null
          created_at?: string | null
          date?: string
          dhuhr?: boolean | null
          fajr?: boolean | null
          id?: string
          is_checked?: boolean | null
          isha?: boolean | null
          maghrib?: boolean | null
          prayer_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_invocation_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          invocation_id: number
          is_completed: boolean | null
          is_memorized: boolean | null
          is_validated: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invocation_id: number
          is_completed?: boolean | null
          is_memorized?: boolean | null
          is_validated?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          invocation_id?: number
          is_completed?: boolean | null
          is_memorized?: boolean | null
          is_validated?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invocation_progress_invocation_id_fkey"
            columns: ["invocation_id"]
            isOneToOne: false
            referencedRelation: "invocations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_messages: {
        Row: {
          audio_url: string | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          message_type: string | null
          read_at: string | null
          receiver_id: string | null
          sender_id: string | null
          sender_type: string | null
          user_id: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          message_type?: string | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          sender_type?: string | null
          user_id?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          message_type?: string | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          sender_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_nourania_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          is_validated: boolean | null
          lesson_id: string
          progress_percentage: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_validated?: boolean | null
          lesson_id: string
          progress_percentage?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_validated?: boolean | null
          lesson_id?: string
          progress_percentage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nourania_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "nourania_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prayer_progress: {
        Row: {
          card_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          is_validated: boolean | null
          user_id: string
        }
        Insert: {
          card_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_validated?: boolean | null
          user_id: string
        }
        Update: {
          card_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_validated?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prayer_progress_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "prayer_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ramadan_fasting: {
        Row: {
          created_at: string | null
          date: string
          day_number: number | null
          has_fasted: boolean | null
          id: string
          is_fasting: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          day_number?: number | null
          has_fasted?: boolean | null
          id?: string
          is_fasting?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          day_number?: number | null
          has_fasted?: boolean | null
          id?: string
          is_fasting?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_ramadan_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          day_id: string
          id: string
          is_completed: boolean | null
          pdf_read: boolean | null
          quiz_completed: boolean | null
          quiz_score: number | null
          user_id: string
          video_watched: boolean | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          day_id: string
          id?: string
          is_completed?: boolean | null
          pdf_read?: boolean | null
          quiz_completed?: boolean | null
          quiz_score?: number | null
          user_id: string
          video_watched?: boolean | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          day_id?: string
          id?: string
          is_completed?: boolean | null
          pdf_read?: boolean | null
          quiz_completed?: boolean | null
          quiz_score?: number | null
          user_id?: string
          video_watched?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ramadan_progress_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "ramadan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ramadan_video_watched: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          video_id: string
          watched_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
          watched_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_ramadan_video_watched_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "ramadan_day_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sourate_progress: {
        Row: {
          created_at: string | null
          id: string
          is_validated: boolean | null
          progress_percentage: number | null
          sourate_id: string
          user_id: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_validated?: boolean | null
          progress_percentage?: number | null
          sourate_id: string
          user_id: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_validated?: boolean | null
          progress_percentage?: number | null
          sourate_id?: string
          user_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sourate_progress_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sourate_verse_progress: {
        Row: {
          created_at: string | null
          id: string
          is_memorized: boolean | null
          sourate_id: string
          user_id: string
          verse_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_memorized?: boolean | null
          sourate_id: string
          user_id: string
          verse_number: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_memorized?: boolean | null
          sourate_id?: string
          user_id?: string
          verse_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_sourate_verse_progress_sourate_id_fkey"
            columns: ["sourate_id"]
            isOneToOne: false
            referencedRelation: "sourates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_student_points: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
