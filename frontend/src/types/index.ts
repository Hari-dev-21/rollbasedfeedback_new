export interface CreateQuestionData {
  id?: string;
  text: string;
  question_type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'rating' | 'dropdown' | 'rating_10' | 'yes_no' | 'email' | 'phone';
  is_required: boolean;
  order: number;
  options?: string[];
  option_links?: Array<{
    text: string;
    next_section: string | null;
  }>;
}

export interface Question {
  id: number;
  text: string;
  question_type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'rating' | 'rating_10' | 'yes_no' | 'email' | 'phone';
  is_required: boolean;
  order: number;
  options: string[];
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  form_type: 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty';
  created_by: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  expires_at: string | null;
  questions: Question[];
  response_count: number;
  shareable_link: string;
  is_expired: boolean;
}

export interface Answer {
  id: number;
  question: number;
  question_text: string;
  question_type: string;
  answer_text: string;
  answer_value: Record<string, any>;
}

export interface FeedbackResponse {
  id: string;
  form: string;
  form_title: string;
  submitted_at: string;
  answers: Answer[];
}

export interface FormAnalytics {
  id: number;
  form: string;
  form_title: string;
  total_responses: number;
  completion_rate: number;
  average_rating: number;
  last_updated: string;
}

export interface QuestionAnalytics {
  question_id: number;
  question_text: string;
  question_type: string;
  response_count: number;
  average_rating: number | null;
  answer_distribution: Record<string, number>;
  options?: string[];
  responses?: string[];
  data?: Record<string, number> | number[] | string[];
}

export interface Notification {
  id: number;
  notification_type: 'new_response' | 'form_created' | 'form_updated' | 'analytics_update';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, any>;
}

export interface FormSummary {
  total_forms: number;
  active_forms: number;
  total_responses: number;
  recent_responses: number;
  average_completion_rate: number;
  recent_responses_list: Array<{
    id: string;
    form_title: string;
    submitted_at: string;
    form_id: string;
  }>;
}

// ✅ SINGLE CORRECTED INTERFACE - Remove the duplicate below
export interface CreateFeedbackFormData {
  title: string;
  description: string;
  form_type: 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty';
  is_active: boolean;
  expires_at: string | null;
  sections: Array<{
    title: string;
    description: string;
    order: number;
    questions: CreateQuestionData[];
  }>;
}

export interface SubSectionData {
  id?: string;
  title: string;
  description: string;
  order: number;
  questions: CreateQuestionData[];
}

export interface SubmitFeedbackData {
  form: string;
  answers: Array<{
    question: number;
    answer_text: string;
    answer_value: Record<string, any>;
  }>;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}


export interface EditFormData {
  title: string;
  description: string;
  form_type: 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty';
  is_active: boolean;
  expires_at: string | null;
  questions: CreateQuestionData[];
  sections?: Array<{
    title: string;
    description: string;
    order: number;
    questions: CreateQuestionData[];
  }>;
}