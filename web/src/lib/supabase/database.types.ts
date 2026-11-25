
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activation_codes": {
                  Row: {
                    "code_hash": string,"created_at": string,"created_by": string,"expires_at": string,"id": string,"profile_key": string,"revoked_at": string | null,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash": string,"created_at"?: string,"created_by": string,"expires_at": string,"id"?: string,"profile_key": string,"revoked_at"?: string | null,"used_at"?: string | null
                  }
                  Update: {
                    "code_hash"?: string,"created_at"?: string,"created_by"?: string,"expires_at"?: string,"id"?: string,"profile_key"?: string,"revoked_at"?: string | null,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_codes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    },{
      foreignKeyName: "activation_codes_profile_key_fkey"
      columns: ["profile_key"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    }
                  ]
                },"calendar_events": {
                  Row: {
                    "created_at": string,"created_by": string,"details": string | null,"event_date": string,"event_time": string | null,"event_type": string,"id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"details"?: string | null,"event_date": string,"event_time"?: string | null,"event_type": string,"id"?: string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"details"?: string | null,"event_date"?: string,"event_time"?: string | null,"event_type"?: string,"id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "calendar_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    }
                  ]
                },"care_completions": {
                  Row: {
                    "activity_date": string,"care_task_id": string | null,"completed_at": string,"completed_by": string,"feeding_schedule_id": string | null,"id": string,"medication_schedule_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"care_task_id"?: string | null,"completed_at"?: string,"completed_by": string,"feeding_schedule_id"?: string | null,"id"?: string,"medication_schedule_id"?: string | null
                  }
                  Update: {
                    "activity_date"?: string,"care_task_id"?: string | null,"completed_at"?: string,"completed_by"?: string,"feeding_schedule_id"?: string | null,"id"?: string,"medication_schedule_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "care_completions_care_task_id_fkey"
      columns: ["care_task_id"]
isOneToOne: false
      referencedRelation: "care_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_completions_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    },{
      foreignKeyName: "care_completions_feeding_schedule_id_fkey"
      columns: ["feeding_schedule_id"]
isOneToOne: false
      referencedRelation: "feeding_schedules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "care_completions_medication_schedule_id_fkey"
      columns: ["medication_schedule_id"]
isOneToOne: false
      referencedRelation: "medication_schedules"
      referencedColumns: ["id"]
    }
                  ]
                },"care_tasks": {
                  Row: {
                    "created_at": string,"created_by": string,"day_of_week": number,"id": string,"instructions": string | null,"is_active": boolean,"scheduled_time": string | null,"task_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"day_of_week": number,"id"?: string,"instructions"?: string | null,"is_active"?: boolean,"scheduled_time"?: string | null,"task_name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"day_of_week"?: number,"id"?: string,"instructions"?: string | null,"is_active"?: boolean,"scheduled_time"?: string | null,"task_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "care_tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    }
                  ]
                },"feeding_schedules": {
                  Row: {
                    "created_at": string,"created_by": string,"day_of_week": number,"id": string,"is_active": boolean,"meal_name": string,"portion": string | null,"scheduled_time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"day_of_week": number,"id"?: string,"is_active"?: boolean,"meal_name": string,"portion"?: string | null,"scheduled_time": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"day_of_week"?: number,"id"?: string,"is_active"?: boolean,"meal_name"?: string,"portion"?: string | null,"scheduled_time"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feeding_schedules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    }
                  ]
                },"medication_schedule_times": {
                  Row: {
                    "day_of_week": number,"medication_schedule_id": string,"scheduled_time": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day_of_week": number,"medication_schedule_id": string,"scheduled_time": string
                  }
                  Update: {
                    "day_of_week"?: number,"medication_schedule_id"?: string,"scheduled_time"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "medication_schedule_times_medication_schedule_id_fkey"
      columns: ["medication_schedule_id"]
isOneToOne: false
      referencedRelation: "medication_schedules"
      referencedColumns: ["id"]
    }
                  ]
                },"medication_schedules": {
                  Row: {
                    "created_at": string,"created_by": string,"end_date": string | null,"id": string,"instructions": string,"is_active": boolean,"medication_name": string,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"end_date"?: string | null,"id"?: string,"instructions": string,"is_active"?: boolean,"medication_name": string,"start_date": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"end_date"?: string | null,"id"?: string,"instructions"?: string,"is_active"?: boolean,"medication_name"?: string,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "medication_schedules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    }
                  ]
                },"notes": {
                  Row: {
                    "content": string,"created_at": string,"created_by": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"created_by": string,"id"?: string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"created_by"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    }
                  ]
                },"profile_sessions": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"profile_key": string,"revoked_at": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"profile_key": string,"revoked_at"?: string | null,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"profile_key"?: string,"revoked_at"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_sessions_profile_key_fkey"
      columns: ["profile_key"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["profile_key"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activated_at": string | null,"created_at": string,"display_name": string,"password_hash": string | null,"profile_key": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"created_at"?: string,"display_name": string,"password_hash"?: string | null,"profile_key": string,"role": string
                  }
                  Update: {
                    "activated_at"?: string | null,"created_at"?: string,"display_name"?: string,"password_hash"?: string | null,"profile_key"?: string,"role"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "activate_profile":
{ Args: { "p_code_hash": string,"p_password_hash": string,"p_profile_key": string }; Returns: boolean
                           },
"issue_activation_code":
{ Args: { "p_code_hash": string,"p_created_by": string,"p_expires_at": string,"p_profile_key": string }; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
