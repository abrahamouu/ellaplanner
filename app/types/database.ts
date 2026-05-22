export type ActivityKind = "exam" | "hw" | "lab" | "study" | "other";
export type ActivityStatus = "in_progress" | "done" | "not_done";

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          instructor: string | null;
          color: string;
          description: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          instructor?: string | null;
          color: string;
          description?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          instructor?: string | null;
          color?: string;
          description?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_links: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          label: string;
          url: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          label: string;
          url: string;
          description?: string | null;
        };
        Update: {
          label?: string;
          url?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          kind: ActivityKind;
          status: ActivityStatus;
          scheduled_for: string;
          time_label: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          kind: ActivityKind;
          status: ActivityStatus;
          scheduled_for: string;
          time_label?: string | null;
          description?: string | null;
        };
        Update: {
          course_id?: string | null;
          title?: string;
          kind?: ActivityKind;
          status?: ActivityStatus;
          scheduled_for?: string;
          time_label?: string | null;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string;
          kind: ActivityKind;
          due_date: string;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title: string;
          kind: ActivityKind;
          due_date: string;
          points?: number;
        };
        Update: {
          course_id?: string | null;
          title?: string;
          kind?: ActivityKind;
          due_date?: string;
          points?: number;
        };
        Relationships: [];
      };
      non_school_items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string | null;
          scheduled_for: string;
          time_label: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category?: string | null;
          scheduled_for: string;
          time_label?: string | null;
          description?: string | null;
        };
        Update: {
          title?: string;
          category?: string | null;
          scheduled_for?: string;
          time_label?: string | null;
          description?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
