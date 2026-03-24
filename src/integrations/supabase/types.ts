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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      academic_records: {
        Row: {
          grade: string | null
          id: string
          marks_obtained: number
          max_marks: number
          recorded_at: string
          recorded_by: string
          student_id: string
          subject_id: string
          test_name: string
        }
        Insert: {
          grade?: string | null
          id?: string
          marks_obtained: number
          max_marks: number
          recorded_at?: string
          recorded_by: string
          student_id: string
          subject_id: string
          test_name: string
        }
        Update: {
          grade?: string | null
          id?: string
          marks_obtained?: number
          max_marks?: number
          recorded_at?: string
          recorded_by?: string
          student_id?: string
          subject_id?: string
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          date: string | null
          description: string | null
          id: string
          organizer: string | null
          proof_url: string | null
          skills: string[] | null
          status: string
          student_id: string
          submitted_at: string
          title: string
          type: string
        }
        Insert: {
          date?: string | null
          description?: string | null
          id?: string
          organizer?: string | null
          proof_url?: string | null
          skills?: string[] | null
          status?: string
          student_id: string
          submitted_at?: string
          title: string
          type?: string
        }
        Update: {
          date?: string | null
          description?: string | null
          id?: string
          organizer?: string | null
          proof_url?: string | null
          skills?: string[] | null
          status?: string
          student_id?: string
          submitted_at?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          date: string
          id: string
          marked_at: string
          marked_by: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject_id: string
        }
        Insert: {
          date: string
          id?: string
          marked_at?: string
          marked_by: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject_id: string
        }
        Update: {
          date?: string
          id?: string
          marked_at?: string
          marked_by?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          department_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_batches: {
        Row: {
          course_id: string | null
          generated_at: string
          generated_by: string
          id: string
          pdf_url: string | null
          role_target: Database["public"]["Enums"]["app_role"]
          section_id: string | null
          year: number | null
        }
        Insert: {
          course_id?: string | null
          generated_at?: string
          generated_by: string
          id?: string
          pdf_url?: string | null
          role_target: Database["public"]["Enums"]["app_role"]
          section_id?: string | null
          year?: number | null
        }
        Update: {
          course_id?: string | null
          generated_at?: string
          generated_by?: string
          id?: string
          pdf_url?: string | null
          role_target?: Database["public"]["Enums"]["app_role"]
          section_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_batches_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_blocked: boolean
          name: string
          section_id: string | null
          updated_at: string
          username: string
          year: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id: string
          is_blocked?: boolean
          name: string
          section_id?: string | null
          updated_at?: string
          username: string
          year?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_blocked?: boolean
          name?: string
          section_id?: string | null
          updated_at?: string
          username?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          course_id: string
          created_at: string
          id: string
          section_name: string
          year: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          section_name: string
          year: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          section_name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          course_id: string
          created_at: string
          faculty_id: string | null
          id: string
          name: string
          year: number
        }
        Insert: {
          course_id: string
          created_at?: string
          faculty_id?: string | null
          id?: string
          name: string
          year: number
        }
        Update: {
          course_id?: string
          created_at?: string
          faculty_id?: string | null
          id?: string
          name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      verifications: {
        Row: {
          achievement_id: string
          faculty_id: string
          id: string
          remarks: string | null
          status: string
          verified_at: string
        }
        Insert: {
          achievement_id: string
          faculty_id: string
          id?: string
          remarks?: string | null
          status: string
          verified_at?: string
        }
        Update: {
          achievement_id?: string
          faculty_id?: string
          id?: string
          remarks?: string | null
          status?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_faculty_id_fkey"
            columns: ["faculty_id"]
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
      calculate_engagement_score: {
        Args: { _student_id: string }
        Returns: number
      }
      get_leaderboard: {
        Args: never
        Returns: {
          course_id: string
          course_name: string
          score: number
          section_id: string
          section_name: string
          student_id: string
          student_name: string
          year: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "student" | "faculty" | "admin"
      attendance_status: "present" | "absent" | "late"
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
      app_role: ["student", "faculty", "admin"],
      attendance_status: ["present", "absent", "late"],
    },
  },
} as const
