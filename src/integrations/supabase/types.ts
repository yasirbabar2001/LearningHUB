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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_user_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          cert_no: string
          certificate_title: string
          designation_name: string | null
          employee_code: string
          employee_name: string
          id: string
          issued_at: string
          revoked: boolean
          score_pct: number | null
          session_id: string
          signatory_designation: string | null
          signatory_name: string | null
          training_id: string
          training_name: string
          user_id: string
        }
        Insert: {
          cert_no?: string
          certificate_title: string
          designation_name?: string | null
          employee_code: string
          employee_name: string
          id?: string
          issued_at?: string
          revoked?: boolean
          score_pct?: number | null
          session_id: string
          signatory_designation?: string | null
          signatory_name?: string | null
          training_id: string
          training_name: string
          user_id: string
        }
        Update: {
          cert_no?: string
          certificate_title?: string
          designation_name?: string | null
          employee_code?: string
          employee_name?: string
          id?: string
          issued_at?: string
          revoked?: boolean
          score_pct?: number | null
          session_id?: string
          signatory_designation?: string | null
          signatory_name?: string | null
          training_id?: string
          training_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "virtual_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          body: string
          created_at: string
          department_name: string | null
          designation_name: string | null
          employee_code: string | null
          employee_name: string | null
          id: string
          is_error: boolean
          rating: number | null
          response_ms: number | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          department_name?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          id?: string
          is_error?: boolean
          rating?: number | null
          response_ms?: number | null
          role: string
          session_id: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          department_name?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          id?: string
          is_error?: boolean
          rating?: number | null
          response_ms?: number | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      designations: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          body: string
          created_at: string
          delivered_at: string | null
          id: string
          liked_at: string | null
          read_at: string | null
          recipient_id: string
          reply_to_id: string | null
          sender_id: string
          team_admin_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          body: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          liked_at?: string | null
          read_at?: string | null
          recipient_id: string
          reply_to_id?: string | null
          sender_id: string
          team_admin_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          body?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          liked_at?: string | null
          read_at?: string | null
          recipient_id?: string
          reply_to_id?: string | null
          sender_id?: string
          team_admin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      emp_types: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          branch: string | null
          cnic: string | null
          created_at: string
          department: string | null
          designation: string | null
          emp_type: string | null
          employee_code: string
          gender: string | null
          id: string
          mobile: string | null
          name: string
          region: string | null
          status: string
          sub_department: string | null
          synced_at: string
          system_role: string | null
          updated_at: string
          wing: string | null
        }
        Insert: {
          branch?: string | null
          cnic?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          emp_type?: string | null
          employee_code: string
          gender?: string | null
          id?: string
          mobile?: string | null
          name: string
          region?: string | null
          status?: string
          sub_department?: string | null
          synced_at?: string
          system_role?: string | null
          updated_at?: string
          wing?: string | null
        }
        Update: {
          branch?: string | null
          cnic?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          emp_type?: string | null
          employee_code?: string
          gender?: string | null
          id?: string
          mobile?: string | null
          name?: string
          region?: string | null
          status?: string
          sub_department?: string | null
          synced_at?: string
          system_role?: string | null
          updated_at?: string
          wing?: string | null
        }
        Relationships: []
      }
      evaluation_answers: {
        Row: {
          attempt_id: string
          correct_option: string | null
          id: string
          is_correct: boolean
          question_id: string | null
          question_text: string | null
          selected_option: string | null
        }
        Insert: {
          attempt_id: string
          correct_option?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string | null
          question_text?: string | null
          selected_option?: string | null
        }
        Update: {
          attempt_id?: string
          correct_option?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string | null
          question_text?: string | null
          selected_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "evaluation_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "evaluation_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_attempts: {
        Row: {
          correct_count: number
          department_id: string | null
          department_name: string | null
          designation_id: string | null
          designation_name: string | null
          employee_code: string
          employee_name: string
          gender_id: string | null
          gender_name: string | null
          id: string
          location_id: string | null
          location_name: string | null
          passed: boolean
          phase: string
          region_id: string | null
          region_name: string | null
          score_pct: number
          started_at: string | null
          submitted_at: string
          total_questions: number
          trainer_name: string | null
          training_code: string | null
          training_date: string | null
          training_id: string
          training_name: string | null
          training_type: string | null
          wing_id: string | null
          wing_name: string | null
        }
        Insert: {
          correct_count?: number
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code: string
          employee_name: string
          gender_id?: string | null
          gender_name?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          passed?: boolean
          phase: string
          region_id?: string | null
          region_name?: string | null
          score_pct?: number
          started_at?: string | null
          submitted_at?: string
          total_questions?: number
          trainer_name?: string | null
          training_code?: string | null
          training_date?: string | null
          training_id: string
          training_name?: string | null
          training_type?: string | null
          wing_id?: string | null
          wing_name?: string | null
        }
        Update: {
          correct_count?: number
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code?: string
          employee_name?: string
          gender_id?: string | null
          gender_name?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          passed?: boolean
          phase?: string
          region_id?: string | null
          region_name?: string | null
          score_pct?: number
          started_at?: string | null
          submitted_at?: string
          total_questions?: number
          trainer_name?: string | null
          training_code?: string | null
          training_date?: string | null
          training_id?: string
          training_name?: string | null
          training_type?: string | null
          wing_id?: string | null
          wing_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_attempts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_gender_id_fkey"
            columns: ["gender_id"]
            isOneToOne: false
            referencedRelation: "genders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_attempts_wing_id_fkey"
            columns: ["wing_id"]
            isOneToOne: false
            referencedRelation: "wings"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_questions: {
        Row: {
          correct_option: string
          created_at: string
          display_order: number
          id: string
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          question_text: string
          status: string
          training_id: string
          updated_at: string
        }
        Insert: {
          correct_option: string
          created_at?: string
          display_order?: number
          id?: string
          option_a: string
          option_b: string
          option_c?: string | null
          option_d?: string | null
          question_text: string
          status?: string
          training_id: string
          updated_at?: string
        }
        Update: {
          correct_option?: string
          created_at?: string
          display_order?: number
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string | null
          option_d?: string | null
          question_text?: string
          status?: string
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_questions_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          additional_comments: string | null
          content_rating: number | null
          department_name: string | null
          designation_name: string | null
          employee_code: string | null
          employee_name: string | null
          gender_name: string | null
          id: string
          improvement_suggestion: string | null
          location_name: string | null
          overall_rating: number | null
          quality_score: number | null
          recommendation: boolean | null
          region_name: string | null
          respondent_id: string
          submitted_at: string
          trainer_name: string | null
          trainer_rating: number | null
          training_code: string | null
          training_date: string | null
          training_id: string
          training_mandatory: string | null
          training_name: string | null
          training_type: string | null
          useful_aspect: string | null
          venue_rating: number | null
          wing_name: string | null
        }
        Insert: {
          additional_comments?: string | null
          content_rating?: number | null
          department_name?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          gender_name?: string | null
          id?: string
          improvement_suggestion?: string | null
          location_name?: string | null
          overall_rating?: number | null
          quality_score?: number | null
          recommendation?: boolean | null
          region_name?: string | null
          respondent_id: string
          submitted_at?: string
          trainer_name?: string | null
          trainer_rating?: number | null
          training_code?: string | null
          training_date?: string | null
          training_id: string
          training_mandatory?: string | null
          training_name?: string | null
          training_type?: string | null
          useful_aspect?: string | null
          venue_rating?: number | null
          wing_name?: string | null
        }
        Update: {
          additional_comments?: string | null
          content_rating?: number | null
          department_name?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          gender_name?: string | null
          id?: string
          improvement_suggestion?: string | null
          location_name?: string | null
          overall_rating?: number | null
          quality_score?: number | null
          recommendation?: boolean | null
          region_name?: string | null
          respondent_id?: string
          submitted_at?: string
          trainer_name?: string | null
          trainer_rating?: number | null
          training_code?: string | null
          training_date?: string | null
          training_id?: string
          training_mandatory?: string | null
          training_name?: string | null
          training_type?: string | null
          useful_aspect?: string | null
          venue_rating?: number | null
          wing_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "respondents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_questions: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          options: Json | null
          question_text: string
          question_type: string
          status: string
          training_type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number
          id?: string
          options?: Json | null
          question_text: string
          question_type?: string
          status?: string
          training_type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
          status?: string
          training_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          answer_text: string | null
          category: string | null
          feedback_id: string
          id: string
          question_id: string
          question_text: string | null
          rating: number | null
        }
        Insert: {
          answer_text?: string | null
          category?: string | null
          feedback_id: string
          id?: string
          question_id: string
          question_text?: string | null
          rating?: number | null
        }
        Update: {
          answer_text?: string | null
          category?: string | null
          feedback_id?: string
          id?: string
          question_id?: string
          question_text?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "feedback_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      genders: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      idea_assessments: {
        Row: {
          assessed_by: string | null
          business: string | null
          complexity: string | null
          customer: string | null
          estimated_cost: number | null
          estimated_revenue: number | null
          estimated_saving: number | null
          final_impact: string | null
          financial: string | null
          idea_id: string
          implementation_time: string | null
          operational: string | null
          risk: string | null
          strategic: string | null
          updated_at: string
        }
        Insert: {
          assessed_by?: string | null
          business?: string | null
          complexity?: string | null
          customer?: string | null
          estimated_cost?: number | null
          estimated_revenue?: number | null
          estimated_saving?: number | null
          final_impact?: string | null
          financial?: string | null
          idea_id: string
          implementation_time?: string | null
          operational?: string | null
          risk?: string | null
          strategic?: string | null
          updated_at?: string
        }
        Update: {
          assessed_by?: string | null
          business?: string | null
          complexity?: string | null
          customer?: string | null
          estimated_cost?: number | null
          estimated_revenue?: number | null
          estimated_saving?: number | null
          final_impact?: string | null
          financial?: string | null
          idea_id?: string
          implementation_time?: string | null
          operational?: string | null
          risk?: string | null
          strategic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_assessments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: true
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          comment: string | null
          created_at: string
          field: string | null
          id: string
          idea_id: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          comment?: string | null
          created_at?: string
          field?: string | null
          id?: string
          idea_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          comment?: string | null
          created_at?: string
          field?: string | null
          id?: string
          idea_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "idea_audit_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_comments: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          author_id: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          idea_id: string
          is_internal: boolean
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          author_id?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          idea_id: string
          is_internal?: boolean
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          author_id?: string | null
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          idea_id?: string
          is_internal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "idea_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_impacts: {
        Row: {
          actual_annual_saving: number | null
          actual_revenue: number | null
          complaint_reduction_pct: number | null
          control_improvements: string | null
          csat_improvement_pct: number | null
          customer_tat_improvement_pct: number | null
          customers_affected: number | null
          employee_experience: string | null
          employee_hours_saved: number | null
          est_annual_saving: number | null
          est_revenue: number | null
          hours_saved: number | null
          idea_id: string
          loss_prevented: number | null
          manual_steps_eliminated: number | null
          processes_simplified: number | null
          productivity_improvement_pct: number | null
          risks_reduced: number | null
          tat_reduction_pct: number | null
          updated_at: string
        }
        Insert: {
          actual_annual_saving?: number | null
          actual_revenue?: number | null
          complaint_reduction_pct?: number | null
          control_improvements?: string | null
          csat_improvement_pct?: number | null
          customer_tat_improvement_pct?: number | null
          customers_affected?: number | null
          employee_experience?: string | null
          employee_hours_saved?: number | null
          est_annual_saving?: number | null
          est_revenue?: number | null
          hours_saved?: number | null
          idea_id: string
          loss_prevented?: number | null
          manual_steps_eliminated?: number | null
          processes_simplified?: number | null
          productivity_improvement_pct?: number | null
          risks_reduced?: number | null
          tat_reduction_pct?: number | null
          updated_at?: string
        }
        Update: {
          actual_annual_saving?: number | null
          actual_revenue?: number | null
          complaint_reduction_pct?: number | null
          control_improvements?: string | null
          csat_improvement_pct?: number | null
          customer_tat_improvement_pct?: number | null
          customers_affected?: number | null
          employee_experience?: string | null
          employee_hours_saved?: number | null
          est_annual_saving?: number | null
          est_revenue?: number | null
          hours_saved?: number | null
          idea_id?: string
          loss_prevented?: number | null
          manual_steps_eliminated?: number | null
          processes_simplified?: number | null
          productivity_improvement_pct?: number | null
          risks_reduced?: number | null
          tat_reduction_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_impacts_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: true
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_implementations: {
        Row: {
          actual_benefit: number | null
          actual_cost: number | null
          actual_date: string | null
          budget: number | null
          estimated_benefit: number | null
          idea_id: string
          notes: string | null
          owner: string | null
          start_date: string | null
          status: string | null
          supporting_department: string | null
          target_date: string | null
          updated_at: string
        }
        Insert: {
          actual_benefit?: number | null
          actual_cost?: number | null
          actual_date?: string | null
          budget?: number | null
          estimated_benefit?: number | null
          idea_id: string
          notes?: string | null
          owner?: string | null
          start_date?: string | null
          status?: string | null
          supporting_department?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_benefit?: number | null
          actual_cost?: number | null
          actual_date?: string | null
          budget?: number | null
          estimated_benefit?: number | null
          idea_id?: string
          notes?: string | null
          owner?: string | null
          start_date?: string | null
          status?: string | null
          supporting_department?: string | null
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_implementations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: true
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_options: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          sort_order: number
          status: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          name: string
          sort_order?: number
          status?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          sort_order?: number
          status?: string
        }
        Relationships: []
      }
      idea_recognitions: {
        Row: {
          awarded_by: string | null
          created_at: string
          id: string
          idea_id: string
          period: string | null
          recognition_id: string | null
          recognition_name: string
        }
        Insert: {
          awarded_by?: string | null
          created_at?: string
          id?: string
          idea_id: string
          period?: string | null
          recognition_id?: string | null
          recognition_name: string
        }
        Update: {
          awarded_by?: string | null
          created_at?: string
          id?: string
          idea_id?: string
          period?: string | null
          recognition_id?: string | null
          recognition_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_recognitions_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_recognitions_recognition_id_fkey"
            columns: ["recognition_id"]
            isOneToOne: false
            referencedRelation: "idea_options"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_reviewers: {
        Row: {
          created_at: string
          employee_code: string | null
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_code?: string | null
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          employee_code?: string | null
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          assigned_function: string | null
          assigned_owner: string | null
          assigned_reviewer: string | null
          attachment_name: string | null
          attachment_path: string | null
          beneficiary_ids: string[]
          benefit_ids: string[]
          category_id: string | null
          complexity: string | null
          department_name: string | null
          designation_name: string | null
          employee_code: string | null
          employee_name: string | null
          expected_impact: string | null
          id: string
          implement_scope: string | null
          is_anonymous: boolean
          is_public: boolean
          location_name: string | null
          manager_name: string | null
          problem: string
          ref_no: string | null
          region_name: string | null
          solution: string
          status: string
          submitted_at: string
          target_date: string | null
          title: string
          type_id: string | null
          updated_at: string
          user_id: string
          wing_name: string | null
        }
        Insert: {
          assigned_function?: string | null
          assigned_owner?: string | null
          assigned_reviewer?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          beneficiary_ids?: string[]
          benefit_ids?: string[]
          category_id?: string | null
          complexity?: string | null
          department_name?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          expected_impact?: string | null
          id?: string
          implement_scope?: string | null
          is_anonymous?: boolean
          is_public?: boolean
          location_name?: string | null
          manager_name?: string | null
          problem: string
          ref_no?: string | null
          region_name?: string | null
          solution: string
          status?: string
          submitted_at?: string
          target_date?: string | null
          title: string
          type_id?: string | null
          updated_at?: string
          user_id: string
          wing_name?: string | null
        }
        Update: {
          assigned_function?: string | null
          assigned_owner?: string | null
          assigned_reviewer?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          beneficiary_ids?: string[]
          benefit_ids?: string[]
          category_id?: string | null
          complexity?: string | null
          department_name?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          expected_impact?: string | null
          id?: string
          implement_scope?: string | null
          is_anonymous?: boolean
          is_public?: boolean
          location_name?: string | null
          manager_name?: string | null
          problem?: string
          ref_no?: string | null
          region_name?: string | null
          solution?: string
          status?: string
          submitted_at?: string
          target_date?: string | null
          title?: string
          type_id?: string | null
          updated_at?: string
          user_id?: string
          wing_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ideas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "idea_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "idea_options"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_comments: {
        Row: {
          author_designation: string | null
          author_name: string
          author_user_id: string
          body: string
          created_at: string
          id: string
          is_admin_post: boolean
          like_count: number
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          author_designation?: string | null
          author_name?: string
          author_user_id?: string
          body: string
          created_at?: string
          id?: string
          is_admin_post?: boolean
          like_count?: number
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_designation?: string | null
          author_name?: string
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          is_admin_post?: boolean
          like_count?: number
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_posts: {
        Row: {
          approved_at: string | null
          author_designation: string | null
          author_location: string | null
          author_name: string
          author_user_id: string
          body: string | null
          clap_count: number
          created_at: string
          dislike_count: number
          heart_count: number
          id: string
          is_admin_post: boolean
          like_count: number
          media_type: string | null
          media_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          author_designation?: string | null
          author_location?: string | null
          author_name?: string
          author_user_id?: string
          body?: string | null
          clap_count?: number
          created_at?: string
          dislike_count?: number
          heart_count?: number
          id?: string
          is_admin_post?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          author_designation?: string | null
          author_location?: string | null
          author_name?: string
          author_user_id?: string
          body?: string | null
          clap_count?: number
          created_at?: string
          dislike_count?: number
          heart_count?: number
          id?: string
          is_admin_post?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_reactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      lnd_survey_responses: {
        Row: {
          choices: Json
          comments: Json
          department_id: string | null
          department_name: string | null
          designation_id: string | null
          designation_name: string | null
          employee_code: string | null
          id: string
          nps: number | null
          overall_rating: number | null
          ratings: Json
          submitted_at: string
          survey_id: string | null
          survey_title: string | null
          tenure: string | null
        }
        Insert: {
          choices?: Json
          comments?: Json
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code?: string | null
          id?: string
          nps?: number | null
          overall_rating?: number | null
          ratings?: Json
          submitted_at?: string
          survey_id?: string | null
          survey_title?: string | null
          tenure?: string | null
        }
        Update: {
          choices?: Json
          comments?: Json
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code?: string | null
          id?: string
          nps?: number | null
          overall_rating?: number | null
          ratings?: Json
          submitted_at?: string
          survey_id?: string | null
          survey_title?: string | null
          tenure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lnd_survey_responses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lnd_survey_responses_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lnd_survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_attendance: {
        Row: {
          cnic: string
          created_at: string
          designation_id: string | null
          designation_name: string | null
          feedback_id: string | null
          feedback_submitted_at: string | null
          id: string
          location_id: string | null
          location_name: string | null
          new_joiner_name: string
          photo_path: string | null
          region_name: string | null
          trainer_designation: string | null
          trainer_employee_code: string | null
          trainer_location: string | null
          trainer_name: string | null
          trainer_user_id: string
          training_date: string
          training_id: string | null
          updated_at: string
          venue_location_id: string | null
          venue_name: string | null
          wing_name: string | null
        }
        Insert: {
          cnic: string
          created_at?: string
          designation_id?: string | null
          designation_name?: string | null
          feedback_id?: string | null
          feedback_submitted_at?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          new_joiner_name: string
          photo_path?: string | null
          region_name?: string | null
          trainer_designation?: string | null
          trainer_employee_code?: string | null
          trainer_location?: string | null
          trainer_name?: string | null
          trainer_user_id: string
          training_date: string
          training_id?: string | null
          updated_at?: string
          venue_location_id?: string | null
          venue_name?: string | null
          wing_name?: string | null
        }
        Update: {
          cnic?: string
          created_at?: string
          designation_id?: string | null
          designation_name?: string | null
          feedback_id?: string | null
          feedback_submitted_at?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          new_joiner_name?: string
          photo_path?: string | null
          region_name?: string | null
          trainer_designation?: string | null
          trainer_employee_code?: string | null
          trainer_location?: string | null
          trainer_name?: string | null
          trainer_user_id?: string
          training_date?: string
          training_id?: string | null
          updated_at?: string
          venue_location_id?: string | null
          venue_name?: string | null
          wing_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_attendance_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_attendance_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_attendance_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_attendance_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_attendance_venue_location_id_fkey"
            columns: ["venue_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_admins: {
        Row: {
          created_at: string
          email: string
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      portal_active_sessions: {
        Row: {
          created_at: string
          last_seen: string
          session_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_seen?: string
          session_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_seen?: string
          session_key?: string
          user_id?: string
        }
        Relationships: []
      }
      portal_users: {
        Row: {
          avatar_path: string | null
          cnic: string | null
          created_at: string
          department_id: string | null
          department_name: string | null
          designation_id: string | null
          designation_name: string | null
          employee_code: string
          failed_attempts: number
          gender_id: string | null
          gender_name: string | null
          id: string
          location_id: string | null
          location_name: string | null
          locked_at: string | null
          must_change_password: boolean
          name: string
          onboarding_enabled: boolean
          password_changed_at: string
          region_id: string | null
          region_name: string | null
          status: string
          updated_at: string
          wing_id: string | null
          wing_name: string | null
        }
        Insert: {
          avatar_path?: string | null
          cnic?: string | null
          created_at?: string
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code: string
          failed_attempts?: number
          gender_id?: string | null
          gender_name?: string | null
          id: string
          location_id?: string | null
          location_name?: string | null
          locked_at?: string | null
          must_change_password?: boolean
          name: string
          onboarding_enabled?: boolean
          password_changed_at?: string
          region_id?: string | null
          region_name?: string | null
          status?: string
          updated_at?: string
          wing_id?: string | null
          wing_name?: string | null
        }
        Update: {
          avatar_path?: string | null
          cnic?: string | null
          created_at?: string
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code?: string
          failed_attempts?: number
          gender_id?: string | null
          gender_name?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          locked_at?: string | null
          must_change_password?: boolean
          name?: string
          onboarding_enabled?: boolean
          password_changed_at?: string
          region_id?: string | null
          region_name?: string | null
          status?: string
          updated_at?: string
          wing_id?: string | null
          wing_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_gender_id_fkey"
            columns: ["gender_id"]
            isOneToOne: false
            referencedRelation: "genders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_wing_id_fkey"
            columns: ["wing_id"]
            isOneToOne: false
            referencedRelation: "wings"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_change_requests: {
        Row: {
          avatar_path: string | null
          created_at: string
          current_department_name: string | null
          current_designation_name: string | null
          current_location_name: string | null
          current_region_name: string | null
          current_wing_name: string | null
          department_id: string | null
          department_name: string | null
          designation_id: string | null
          designation_name: string | null
          employee_code: string | null
          employee_name: string | null
          id: string
          location_id: string | null
          location_name: string | null
          region_id: string | null
          region_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          wing_id: string | null
          wing_name: string | null
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          current_department_name?: string | null
          current_designation_name?: string | null
          current_location_name?: string | null
          current_region_name?: string | null
          current_wing_name?: string | null
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          region_id?: string | null
          region_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wing_id?: string | null
          wing_name?: string | null
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          current_department_name?: string | null
          current_designation_name?: string | null
          current_location_name?: string | null
          current_region_name?: string | null
          current_wing_name?: string | null
          department_id?: string | null
          department_name?: string | null
          designation_id?: string | null
          designation_name?: string | null
          employee_code?: string | null
          employee_name?: string | null
          id?: string
          location_id?: string | null
          location_name?: string | null
          region_id?: string | null
          region_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wing_id?: string | null
          wing_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_change_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_requests_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_change_requests_wing_id_fkey"
            columns: ["wing_id"]
            isOneToOne: false
            referencedRelation: "wings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          employee_code: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      respondents: {
        Row: {
          cnic: string
          created_at: string
          department_id: string | null
          designation_id: string | null
          employee_code: string
          gender_id: string | null
          id: string
          location_id: string | null
          name: string
          region_id: string | null
          wing_id: string | null
        }
        Insert: {
          cnic: string
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          employee_code: string
          gender_id?: string | null
          id?: string
          location_id?: string | null
          name: string
          region_id?: string | null
          wing_id?: string | null
        }
        Update: {
          cnic?: string
          created_at?: string
          department_id?: string | null
          designation_id?: string | null
          employee_code?: string
          gender_id?: string | null
          id?: string
          location_id?: string | null
          name?: string
          region_id?: string | null
          wing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respondents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respondents_designation_id_fkey"
            columns: ["designation_id"]
            isOneToOne: false
            referencedRelation: "designations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respondents_gender_id_fkey"
            columns: ["gender_id"]
            isOneToOne: false
            referencedRelation: "genders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respondents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respondents_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respondents_wing_id_fkey"
            columns: ["wing_id"]
            isOneToOne: false
            referencedRelation: "wings"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_departments: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_questions: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          max_select: number | null
          num: number
          optional: boolean
          options: Json | null
          qtype: string
          question_text: string
          scale_labels: Json | null
          section: string
          section_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          id?: string
          max_select?: number | null
          num?: number
          optional?: boolean
          options?: Json | null
          qtype?: string
          question_text: string
          scale_labels?: Json | null
          section?: string
          section_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          max_select?: number | null
          num?: number
          optional?: boolean
          options?: Json | null
          qtype?: string
          question_text?: string
          scale_labels?: Json | null
          section?: string
          section_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      surveys: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tna_assessments: {
        Row: {
          avg_overall: number | null
          avg_soft: number | null
          avg_technical: number | null
          branch: string | null
          comments: string | null
          cycle_id: string
          department: string | null
          designation: string | null
          employee_code: string
          employee_name: string
          gap_count: number
          gender: string | null
          id: string
          manager_code: string | null
          manager_name: string | null
          region: string | null
          staff_id: string
          sub_department: string | null
          submitted_at: string
          wing: string | null
        }
        Insert: {
          avg_overall?: number | null
          avg_soft?: number | null
          avg_technical?: number | null
          branch?: string | null
          comments?: string | null
          cycle_id: string
          department?: string | null
          designation?: string | null
          employee_code: string
          employee_name: string
          gap_count?: number
          gender?: string | null
          id?: string
          manager_code?: string | null
          manager_name?: string | null
          region?: string | null
          staff_id: string
          sub_department?: string | null
          submitted_at?: string
          wing?: string | null
        }
        Update: {
          avg_overall?: number | null
          avg_soft?: number | null
          avg_technical?: number | null
          branch?: string | null
          comments?: string | null
          cycle_id?: string
          department?: string | null
          designation?: string | null
          employee_code?: string
          employee_name?: string
          gap_count?: number
          gender?: string | null
          id?: string
          manager_code?: string | null
          manager_name?: string | null
          region?: string | null
          staff_id?: string
          sub_department?: string | null
          submitted_at?: string
          wing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tna_assessments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "tna_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tna_assessments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "tna_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tna_cycles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      tna_ratings: {
        Row: {
          assessment_id: string
          created_at: string
          cycle_id: string
          id: string
          rating: number
          skill_id: string | null
          skill_name: string
          skill_type: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          cycle_id: string
          id?: string
          rating: number
          skill_id?: string | null
          skill_name: string
          skill_type: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          cycle_id?: string
          id?: string
          rating?: number
          skill_id?: string | null
          skill_name?: string
          skill_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tna_ratings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "tna_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tna_ratings_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "tna_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tna_ratings_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "tna_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      tna_skills: {
        Row: {
          created_at: string
          cycle_id: string
          department: string | null
          description: string | null
          designation: string | null
          display_order: number
          id: string
          name: string
          skill_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          department?: string | null
          description?: string | null
          designation?: string | null
          display_order?: number
          id?: string
          name: string
          skill_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          department?: string | null
          description?: string | null
          designation?: string | null
          display_order?: number
          id?: string
          name?: string
          skill_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tna_skills_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "tna_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      tna_staff: {
        Row: {
          branch: string | null
          created_at: string
          cycle_id: string
          department: string | null
          designation: string | null
          employee_code: string
          gender: string | null
          id: string
          manager_code: string | null
          manager_name: string | null
          name: string
          region: string | null
          sub_department: string | null
          updated_at: string
          wing: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string
          cycle_id: string
          department?: string | null
          designation?: string | null
          employee_code: string
          gender?: string | null
          id?: string
          manager_code?: string | null
          manager_name?: string | null
          name: string
          region?: string | null
          sub_department?: string | null
          updated_at?: string
          wing?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string
          cycle_id?: string
          department?: string | null
          designation?: string | null
          employee_code?: string
          gender?: string | null
          id?: string
          manager_code?: string | null
          manager_name?: string | null
          name?: string
          region?: string | null
          sub_department?: string | null
          updated_at?: string
          wing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tna_staff_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "tna_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_feedback: {
        Row: {
          additional_comments: string | null
          avg_rating: number | null
          challenges: string | null
          engagement_rating: number | null
          id: string
          knowledge_rating: number | null
          logistics_rating: number | null
          material_rating: number | null
          objectives_achieved: boolean | null
          overall_rating: number | null
          participants_count: number | null
          strengths: string | null
          submitted_at: string
          suggestions: string | null
          support_rating: number | null
          time_rating: number | null
          trainer_id: string | null
          trainer_name: string | null
          training_code: string | null
          training_date: string | null
          training_id: string
          training_mandatory: string | null
          training_name: string | null
          training_type: string | null
        }
        Insert: {
          additional_comments?: string | null
          avg_rating?: number | null
          challenges?: string | null
          engagement_rating?: number | null
          id?: string
          knowledge_rating?: number | null
          logistics_rating?: number | null
          material_rating?: number | null
          objectives_achieved?: boolean | null
          overall_rating?: number | null
          participants_count?: number | null
          strengths?: string | null
          submitted_at?: string
          suggestions?: string | null
          support_rating?: number | null
          time_rating?: number | null
          trainer_id?: string | null
          trainer_name?: string | null
          training_code?: string | null
          training_date?: string | null
          training_id: string
          training_mandatory?: string | null
          training_name?: string | null
          training_type?: string | null
        }
        Update: {
          additional_comments?: string | null
          avg_rating?: number | null
          challenges?: string | null
          engagement_rating?: number | null
          id?: string
          knowledge_rating?: number | null
          logistics_rating?: number | null
          material_rating?: number | null
          objectives_achieved?: boolean | null
          overall_rating?: number | null
          participants_count?: number | null
          strengths?: string | null
          submitted_at?: string
          suggestions?: string | null
          support_rating?: number | null
          time_rating?: number | null
          trainer_id?: string | null
          trainer_name?: string | null
          training_code?: string | null
          training_date?: string | null
          training_id?: string
          training_mandatory?: string | null
          training_name?: string | null
          training_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_feedback_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_feedback_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          created_at: string
          employee_code: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_code?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_code?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_calendar: {
        Row: {
          affected_count: number
          audience: string | null
          avg_rating: number | null
          created_at: string
          cycle_id: string
          delivery_mode: string
          id: string
          month: number
          notes: string | null
          priority: string
          priority_score: number
          quarter: number
          skill_name: string
          skill_type: string
          skills_covered: string[]
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          affected_count?: number
          audience?: string | null
          avg_rating?: number | null
          created_at?: string
          cycle_id: string
          delivery_mode?: string
          id?: string
          month?: number
          notes?: string | null
          priority?: string
          priority_score?: number
          quarter?: number
          skill_name: string
          skill_type: string
          skills_covered?: string[]
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          affected_count?: number
          audience?: string | null
          avg_rating?: number | null
          created_at?: string
          cycle_id?: string
          delivery_mode?: string
          id?: string
          month?: number
          notes?: string | null
          priority?: string
          priority_score?: number
          quarter?: number
          skill_name?: string
          skill_type?: string
          skills_covered?: string[]
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_calendar_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "tna_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_calendar_participants: {
        Row: {
          avg_rating: number | null
          branch: string | null
          calendar_id: string | null
          created_at: string
          cycle_id: string
          delivery_mode: string
          department: string | null
          designation: string | null
          employee_code: string
          employee_name: string
          id: string
          month: number
          priority: string
          program_name: string
          quarter: number
          region: string | null
          skills: string[]
          sub_department: string | null
          training_date: string
          updated_at: string
          wing: string | null
          year: number
        }
        Insert: {
          avg_rating?: number | null
          branch?: string | null
          calendar_id?: string | null
          created_at?: string
          cycle_id: string
          delivery_mode?: string
          department?: string | null
          designation?: string | null
          employee_code: string
          employee_name: string
          id?: string
          month: number
          priority?: string
          program_name: string
          quarter: number
          region?: string | null
          skills?: string[]
          sub_department?: string | null
          training_date: string
          updated_at?: string
          wing?: string | null
          year: number
        }
        Update: {
          avg_rating?: number | null
          branch?: string | null
          calendar_id?: string | null
          created_at?: string
          cycle_id?: string
          delivery_mode?: string
          department?: string | null
          designation?: string | null
          employee_code?: string
          employee_name?: string
          id?: string
          month?: number
          priority?: string
          program_name?: string
          quarter?: number
          region?: string | null
          skills?: string[]
          sub_department?: string | null
          training_date?: string
          updated_at?: string
          wing?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_calendar_participants_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "training_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_calendar_participants_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "tna_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_participants: {
        Row: {
          created_at: string
          employee_code: string
          employee_name: string | null
          id: string
          portal_user_id: string | null
          training_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_code: string
          employee_name?: string | null
          id?: string
          portal_user_id?: string | null
          training_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_code?: string
          employee_name?: string | null
          id?: string
          portal_user_id?: string | null
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_participants_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          business_unit: string | null
          created_at: string
          department_id: string | null
          department_ids: string[]
          description: string | null
          end_time: string | null
          eval_duration_minutes: number
          id: string
          location_id: string | null
          start_time: string | null
          status: string
          trainer_id: string | null
          training_code: string | null
          training_date: string
          training_end_date: string | null
          training_mandatory: string
          training_name: string
          training_type: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          business_unit?: string | null
          created_at?: string
          department_id?: string | null
          department_ids?: string[]
          description?: string | null
          end_time?: string | null
          eval_duration_minutes?: number
          id?: string
          location_id?: string | null
          start_time?: string | null
          status?: string
          trainer_id?: string | null
          training_code?: string | null
          training_date: string
          training_end_date?: string | null
          training_mandatory?: string
          training_name: string
          training_type: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          business_unit?: string | null
          created_at?: string
          department_id?: string | null
          department_ids?: string[]
          description?: string | null
          end_time?: string | null
          eval_duration_minutes?: number
          id?: string
          location_id?: string | null
          start_time?: string | null
          status?: string
          trainer_id?: string | null
          training_code?: string | null
          training_date?: string
          training_end_date?: string | null
          training_mandatory?: string
          training_name?: string
          training_type?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          last_seen_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      virtual_content_views: {
        Row: {
          completed: boolean
          content_id: string
          employee_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          content_id: string
          employee_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          content_id?: string
          employee_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_content_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "virtual_session_content"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_session_content: {
        Row: {
          created_at: string
          display_order: number
          id: string
          kind: string
          session_id: string
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          kind: string
          session_id: string
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: string
          session_id?: string
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_session_content_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "virtual_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_sessions: {
        Row: {
          certificate_title: string
          created_at: string
          description: string | null
          id: string
          require_all_content: boolean
          signatory_designation: string | null
          signatory_name: string | null
          status: string
          title: string
          training_id: string
          updated_at: string
        }
        Insert: {
          certificate_title?: string
          created_at?: string
          description?: string | null
          id?: string
          require_all_content?: boolean
          signatory_designation?: string | null
          signatory_name?: string | null
          status?: string
          title: string
          training_id: string
          updated_at?: string
        }
        Update: {
          certificate_title?: string
          created_at?: string
          description?: string | null
          id?: string
          require_all_content?: boolean
          signatory_designation?: string | null
          signatory_name?: string | null
          status?: string
          title?: string
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_sessions_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: true
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      wings: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      employees_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          designation_name: string
          employee_code: string
          id: string
          name: string
        }[]
      }
      is_active_portal_user: { Args: { _uid: string }; Returns: boolean }
      is_admin_user: { Args: { _uid: string }; Returns: boolean }
      lookup_employee_names: {
        Args: { _codes: string[] }
        Returns: {
          employee_code: string
          name: string
        }[]
      }
      notify_user: {
        Args: {
          _body: string
          _kind: string
          _link: string
          _title: string
          _user_id: string
        }
        Returns: undefined
      }
      search_employees: {
        Args: { _q: string }
        Returns: {
          designation_name: string
          employee_code: string
          id: string
          location_name: string
          name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "viewer" | "owner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "viewer", "owner"],
    },
  },
} as const
