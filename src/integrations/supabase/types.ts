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
      ai_solutions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          image_hash: string
          model_used: string | null
          question_id: string
          reasoning_steps: Json
          solution_text: string
          study_recommendation: string | null
          topic_analysis: string | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_hash: string
          model_used?: string | null
          question_id: string
          reasoning_steps?: Json
          solution_text: string
          study_recommendation?: string | null
          topic_analysis?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          image_hash?: string
          model_used?: string | null
          question_id?: string
          reasoning_steps?: Json
          solution_text?: string
          study_recommendation?: string | null
          topic_analysis?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_solutions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          coach_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          note: string | null
          recurring: boolean
          recurring_day: number | null
          recurring_time: string | null
          scheduled_at: string
          series_ended_at: string | null
          status: string
          student_id: string
          type: string
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          note?: string | null
          recurring?: boolean
          recurring_day?: number | null
          recurring_time?: string | null
          scheduled_at: string
          series_ended_at?: string | null
          status?: string
          student_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          note?: string | null
          recurring?: boolean
          recurring_day?: number | null
          recurring_time?: string | null
          scheduled_at?: string
          series_ended_at?: string | null
          status?: string
          student_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
          type: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_name?: string | null
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_availability: {
        Row: {
          coach_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_info: {
        Row: {
          appointment_hours: string | null
          ayt_net: string | null
          bio: string
          daily_quote: string | null
          experience: string | null
          id: string
          instagram: string | null
          title: string
          tyt_net: string | null
          updated_at: string
          whatsapp_link: string | null
          yks_ranking: string | null
        }
        Insert: {
          appointment_hours?: string | null
          ayt_net?: string | null
          bio?: string
          daily_quote?: string | null
          experience?: string | null
          id?: string
          instagram?: string | null
          title?: string
          tyt_net?: string | null
          updated_at?: string
          whatsapp_link?: string | null
          yks_ranking?: string | null
        }
        Update: {
          appointment_hours?: string | null
          ayt_net?: string | null
          bio?: string
          daily_quote?: string | null
          experience?: string | null
          id?: string
          instagram?: string | null
          title?: string
          tyt_net?: string | null
          updated_at?: string
          whatsapp_link?: string | null
          yks_ranking?: string | null
        }
        Relationships: []
      }
      deneme_results: {
        Row: {
          ayt_biyoloji_dogru: number
          ayt_biyoloji_net: number
          ayt_biyoloji_yanlis: number
          ayt_cografya1_dogru: number
          ayt_cografya1_net: number
          ayt_cografya1_yanlis: number
          ayt_cografya2_dogru: number
          ayt_cografya2_net: number
          ayt_cografya2_yanlis: number
          ayt_din_dogru: number
          ayt_din_net: number
          ayt_din_yanlis: number
          ayt_edebiyat_dogru: number
          ayt_edebiyat_net: number
          ayt_edebiyat_yanlis: number
          ayt_felsefe_dogru: number
          ayt_felsefe_net: number
          ayt_felsefe_yanlis: number
          ayt_fizik_dogru: number
          ayt_fizik_net: number
          ayt_fizik_yanlis: number
          ayt_kimya_dogru: number
          ayt_kimya_net: number
          ayt_kimya_yanlis: number
          ayt_matematik_dogru: number
          ayt_matematik_net: number
          ayt_matematik_yanlis: number
          ayt_tarih1_dogru: number
          ayt_tarih1_net: number
          ayt_tarih1_yanlis: number
          ayt_tarih2_dogru: number
          ayt_tarih2_net: number
          ayt_tarih2_yanlis: number
          created_at: string
          exam_type: string
          fen_dogru: number
          fen_net: number
          fen_yanlis: number
          id: string
          matematik_dogru: number
          matematik_net: number
          matematik_yanlis: number
          sosyal_dogru: number
          sosyal_net: number
          sosyal_yanlis: number
          student_area: string | null
          student_id: string
          total_net: number
          turkce_dogru: number
          turkce_net: number
          turkce_yanlis: number
        }
        Insert: {
          ayt_biyoloji_dogru?: number
          ayt_biyoloji_net?: number
          ayt_biyoloji_yanlis?: number
          ayt_cografya1_dogru?: number
          ayt_cografya1_net?: number
          ayt_cografya1_yanlis?: number
          ayt_cografya2_dogru?: number
          ayt_cografya2_net?: number
          ayt_cografya2_yanlis?: number
          ayt_din_dogru?: number
          ayt_din_net?: number
          ayt_din_yanlis?: number
          ayt_edebiyat_dogru?: number
          ayt_edebiyat_net?: number
          ayt_edebiyat_yanlis?: number
          ayt_felsefe_dogru?: number
          ayt_felsefe_net?: number
          ayt_felsefe_yanlis?: number
          ayt_fizik_dogru?: number
          ayt_fizik_net?: number
          ayt_fizik_yanlis?: number
          ayt_kimya_dogru?: number
          ayt_kimya_net?: number
          ayt_kimya_yanlis?: number
          ayt_matematik_dogru?: number
          ayt_matematik_net?: number
          ayt_matematik_yanlis?: number
          ayt_tarih1_dogru?: number
          ayt_tarih1_net?: number
          ayt_tarih1_yanlis?: number
          ayt_tarih2_dogru?: number
          ayt_tarih2_net?: number
          ayt_tarih2_yanlis?: number
          created_at?: string
          exam_type?: string
          fen_dogru?: number
          fen_net?: number
          fen_yanlis?: number
          id?: string
          matematik_dogru?: number
          matematik_net?: number
          matematik_yanlis?: number
          sosyal_dogru?: number
          sosyal_net?: number
          sosyal_yanlis?: number
          student_area?: string | null
          student_id: string
          total_net?: number
          turkce_dogru?: number
          turkce_net?: number
          turkce_yanlis?: number
        }
        Update: {
          ayt_biyoloji_dogru?: number
          ayt_biyoloji_net?: number
          ayt_biyoloji_yanlis?: number
          ayt_cografya1_dogru?: number
          ayt_cografya1_net?: number
          ayt_cografya1_yanlis?: number
          ayt_cografya2_dogru?: number
          ayt_cografya2_net?: number
          ayt_cografya2_yanlis?: number
          ayt_din_dogru?: number
          ayt_din_net?: number
          ayt_din_yanlis?: number
          ayt_edebiyat_dogru?: number
          ayt_edebiyat_net?: number
          ayt_edebiyat_yanlis?: number
          ayt_felsefe_dogru?: number
          ayt_felsefe_net?: number
          ayt_felsefe_yanlis?: number
          ayt_fizik_dogru?: number
          ayt_fizik_net?: number
          ayt_fizik_yanlis?: number
          ayt_kimya_dogru?: number
          ayt_kimya_net?: number
          ayt_kimya_yanlis?: number
          ayt_matematik_dogru?: number
          ayt_matematik_net?: number
          ayt_matematik_yanlis?: number
          ayt_tarih1_dogru?: number
          ayt_tarih1_net?: number
          ayt_tarih1_yanlis?: number
          ayt_tarih2_dogru?: number
          ayt_tarih2_net?: number
          ayt_tarih2_yanlis?: number
          created_at?: string
          exam_type?: string
          fen_dogru?: number
          fen_net?: number
          fen_yanlis?: number
          id?: string
          matematik_dogru?: number
          matematik_net?: number
          matematik_yanlis?: number
          sosyal_dogru?: number
          sosyal_net?: number
          sosyal_yanlis?: number
          student_area?: string | null
          student_id?: string
          total_net?: number
          turkce_dogru?: number
          turkce_net?: number
          turkce_yanlis?: number
        }
        Relationships: [
          {
            foreignKeyName: "deneme_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_questions: {
        Row: {
          ai_solution: string | null
          created_at: string
          exam_type: string
          id: string
          image_url: string
          note: string | null
          status: string
          student_id: string
          subject: string
        }
        Insert: {
          ai_solution?: string | null
          created_at?: string
          exam_type?: string
          id?: string
          image_url: string
          note?: string | null
          status?: string
          student_id: string
          subject: string
        }
        Update: {
          ai_solution?: string | null
          created_at?: string
          exam_type?: string
          id?: string
          image_url?: string
          note?: string | null
          status?: string
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_questions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          icon: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          birthday: string | null
          coach_id: string | null
          coach_selected: boolean
          created_at: string
          email: string | null
          expectations: string | null
          full_name: string
          goals: string | null
          grade: string | null
          high_school: string | null
          id: string
          obp: string | null
          parent_phone: string | null
          phone: string | null
          profile_completed: boolean
          target_department: string | null
          target_university: string | null
          updated_at: string
          user_id: string
          username: string | null
          username_changed_at: string | null
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          birthday?: string | null
          coach_id?: string | null
          coach_selected?: boolean
          created_at?: string
          email?: string | null
          expectations?: string | null
          full_name?: string
          goals?: string | null
          grade?: string | null
          high_school?: string | null
          id?: string
          obp?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_completed?: boolean
          target_department?: string | null
          target_university?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          username_changed_at?: string | null
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          birthday?: string | null
          coach_id?: string | null
          coach_selected?: boolean
          created_at?: string
          email?: string | null
          expectations?: string | null
          full_name?: string
          goals?: string | null
          grade?: string | null
          high_school?: string | null
          id?: string
          obp?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_completed?: boolean
          target_department?: string | null
          target_university?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          username_changed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      question_answers: {
        Row: {
          author_id: string
          best_answer_xp_awarded: boolean | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_best: boolean
          question_id: string
          xp_awarded: boolean | null
        }
        Insert: {
          author_id: string
          best_answer_xp_awarded?: boolean | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_best?: boolean
          question_id: string
          xp_awarded?: boolean | null
        }
        Update: {
          author_id?: string
          best_answer_xp_awarded?: boolean | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_best?: boolean
          question_id?: string
          xp_awarded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          best_answer_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          status: string
          student_id: string
          subject: string
          title: string
          xp_awarded: boolean | null
        }
        Insert: {
          best_answer_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          status?: string
          student_id: string
          subject: string
          title: string
          xp_awarded?: boolean | null
        }
        Update: {
          best_answer_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          status?: string
          student_id?: string
          subject?: string
          title?: string
          xp_awarded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_best_answer_id_fkey"
            columns: ["best_answer_id"]
            isOneToOne: false
            referencedRelation: "question_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          coach_id: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          title: string
          updated_at: string
          uploaded_at: string
          visibility: string
        }
        Insert: {
          coach_id: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          title: string
          updated_at?: string
          uploaded_at?: string
          visibility?: string
        }
        Update: {
          coach_id?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          title?: string
          updated_at?: string
          uploaded_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_books: {
        Row: {
          book_name: string
          created_at: string
          current_test: number
          exam_type: string
          id: string
          is_custom: boolean
          student_id: string
          subject: string
          total_tests: number
          updated_at: string
        }
        Insert: {
          book_name: string
          created_at?: string
          current_test?: number
          exam_type?: string
          id?: string
          is_custom?: boolean
          student_id: string
          subject: string
          total_tests?: number
          updated_at?: string
        }
        Update: {
          book_name?: string
          created_at?: string
          current_test?: number
          exam_type?: string
          id?: string
          is_custom?: boolean
          student_id?: string
          subject?: string
          total_tests?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_books_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_tasks: {
        Row: {
          actual_minutes: number | null
          book_name: string | null
          completed: boolean
          created_at: string
          day_of_week: number
          description: string | null
          estimated_minutes: number
          id: string
          student_id: string
          subject: string
          topic: string
          week_start_date: string
        }
        Insert: {
          actual_minutes?: number | null
          book_name?: string | null
          completed?: boolean
          created_at?: string
          day_of_week: number
          description?: string | null
          estimated_minutes?: number
          id?: string
          student_id: string
          subject: string
          topic?: string
          week_start_date?: string
        }
        Update: {
          actual_minutes?: number | null
          book_name?: string | null
          completed?: boolean
          created_at?: string
          day_of_week?: number
          description?: string | null
          estimated_minutes?: number
          id?: string
          student_id?: string
          subject?: string
          topic?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_timer_logs: {
        Row: {
          elapsed_seconds: number
          id: string
          log_date: string
          student_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          elapsed_seconds?: number
          id?: string
          log_date?: string
          student_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          elapsed_seconds?: number
          id?: string
          log_date?: string
          student_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_timer_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_timer_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "study_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          allowed_areas: string[] | null
          exam_type: string
          icon: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          allowed_areas?: string[] | null
          exam_type?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          allowed_areas?: string[] | null
          exam_type?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          duration_days: number | null
          features: string[] | null
          id: string
          is_active: boolean | null
          is_dynamic: boolean | null
          name: string
          price_amount: number
        }
        Insert: {
          created_at?: string | null
          duration_days?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          name: string
          price_amount: number
        }
        Update: {
          created_at?: string | null
          duration_days?: number | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          name?: string
          price_amount?: number
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: string
          name: string
          sort_order: number
          subject_id: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          subject_id: string
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: string
          earned_at: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      user_stats: {
        Row: {
          answers_written: number
          best_answers_count: number
          created_at: string
          id: string
          profile_id: string
          questions_asked: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answers_written?: number
          best_answers_count?: number
          created_at?: string
          id?: string
          profile_id: string
          questions_asked?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answers_written?: number
          best_answers_count?: number
          created_at?: string
          id?: string
          profile_id?: string
          questions_asked?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          payment_method: string | null
          plan_id: string
          profile_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_id: string
          profile_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string
          profile_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_topic_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          student_id: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          student_id: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          student_id?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          profile_id: string
          reason: string
          reference_id: string | null
          reference_table: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          profile_id: string
          reason: string
          reference_id?: string | null
          reference_table?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string
          reference_id?: string | null
          reference_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_profile_id_fkey"
            columns: ["profile_id"]
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
      award_xp: {
        Args: {
          _amount: number
          _profile_id: string
          _reason: string
          _reference_id?: string
          _reference_table?: string
        }
        Returns: undefined
      }
      check_and_award_badges: {
        Args: { _profile_id: string }
        Returns: string[]
      }
      create_notification: {
        Args: {
          _icon?: string
          _link?: string
          _message: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      get_admin_profile_id: { Args: never; Returns: string }
      get_admin_profile_info: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_coach_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          ayt_net: string
          bio: string
          experience: string
          full_name: string
          id: string
          title: string
          tyt_net: string
          username: string
          yks_ranking: string
        }[]
      }
      get_my_profile_id: { Args: never; Returns: string }
      get_my_student_ids: { Args: never; Returns: string[] }
      has_coach_info: { Args: { _profile_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach_profile: { Args: { _profile_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student" | "koc"
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
      app_role: ["admin", "student", "koc"],
    },
  },
} as const
