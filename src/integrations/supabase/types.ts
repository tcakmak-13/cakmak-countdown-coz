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
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          birthday: string | null
          created_at: string
          email: string | null
          full_name: string
          goals: string | null
          grade: string | null
          high_school: string | null
          id: string
          obp: string | null
          parent_phone: string | null
          phone: string | null
          profile_completed: boolean
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          goals?: string | null
          grade?: string | null
          high_school?: string | null
          id?: string
          obp?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          goals?: string | null
          grade?: string | null
          high_school?: string | null
          id?: string
          obp?: string | null
          parent_phone?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      study_tasks: {
        Row: {
          completed: boolean
          created_at: string
          day_of_week: number
          description: string | null
          estimated_minutes: number
          id: string
          student_id: string
          subject: string
          topic: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          day_of_week: number
          description?: string | null
          estimated_minutes?: number
          id?: string
          student_id: string
          subject: string
          topic?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          day_of_week?: number
          description?: string | null
          estimated_minutes?: number
          id?: string
          student_id?: string
          subject?: string
          topic?: string
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
      get_admin_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
