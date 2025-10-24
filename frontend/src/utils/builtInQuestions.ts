import { CreateQuestionData } from '../types';

// Built-in question templates for different form types
export const BUILT_IN_QUESTIONS: Record<string, CreateQuestionData[]> = {
  empty: [],
  general: [
    {
      text: 'What is your overall experience?',
      question_type: 'rating',
      is_required: true,
      order: 0,
      options: []
    },
    {
      text: 'Please provide any additional comments or suggestions',
      question_type: 'textarea',
      is_required: false,
      order: 1,
      options: []
    }
  ],
  customer_satisfaction: [
    {
      text: 'How satisfied are you with our service?',
      question_type: 'rating',
      is_required: true,
      order: 0,
      options: []
    },
    {
      text: 'How likely are you to recommend us to others?',
      question_type: 'rating_10',
      is_required: true,
      order: 1,
      options: []
    },
    {
      text: 'What did you like most about our service?',
      question_type: 'textarea',
      is_required: false,
      order: 2,
      options: []
    },
    {
      text: 'What could we improve?',
      question_type: 'textarea',
      is_required: false,
      order: 3,
      options: []
    },
    {
      text: 'Would you use our service again?',
      question_type: 'yes_no',
      is_required: true,
      order: 4,
      options: []
    }
  ],
  employee_feedback: [
    {
      text: 'How satisfied are you with your current role?',
      question_type: 'rating',
      is_required: true,
      order: 0,
      options: []
    },
    {
      text: 'How would you rate your work-life balance?',
      question_type: 'rating',
      is_required: true,
      order: 1,
      options: []
    },
    {
      text: 'Do you feel valued by your manager?',
      question_type: 'yes_no',
      is_required: true,
      order: 2,
      options: []
    },
    {
      text: 'What motivates you most at work?',
      question_type: 'radio',
      is_required: true,
      order: 3,
      options: ['Recognition', 'Career Growth', 'Compensation', 'Work Environment', 'Other']
    },
    {
      text: 'What suggestions do you have for improving our workplace?',
      question_type: 'textarea',
      is_required: false,
      order: 4,
      options: []
    }
  ],
  product_feedback: [
    {
      text: 'How would you rate this product overall?',
      question_type: 'rating',
      is_required: true,
      order: 0,
      options: []
    },
    {
      text: 'How easy was it to use this product?',
      question_type: 'rating',
      is_required: true,
      order: 1,
      options: []
    },
    {
      text: 'Which features do you find most valuable?',
      question_type: 'checkbox',
      is_required: false,
      order: 2,
      options: ['User Interface', 'Performance', 'Reliability', 'Customer Support', 'Documentation']
    },
    {
      text: 'What problems did you encounter while using this product?',
      question_type: 'textarea',
      is_required: false,
      order: 3,
      options: []
    },
    {
      text: 'Would you recommend this product to others?',
      question_type: 'yes_no',
      is_required: true,
      order: 4,
      options: []
    }
  ],
  service_feedback: [
    {
      text: 'How would you rate the quality of service you received?',
      question_type: 'rating',
      is_required: true,
      order: 0,
      options: []
    },
    {
      text: 'How responsive was our team to your needs?',
      question_type: 'rating',
      is_required: true,
      order: 1,
      options: []
    },
    {
      text: 'How professional was our staff?',
      question_type: 'rating',
      is_required: true,
      order: 2,
      options: []
    },
    {
      text: 'Which aspect of our service impressed you most?',
      question_type: 'radio',
      is_required: false,
      order: 3,
      options: ['Speed', 'Quality', 'Communication', 'Problem Resolution', 'Expertise']
    },
    {
      text: 'How can we improve our service?',
      question_type: 'textarea',
      is_required: false,
      order: 4,
      options: []
    }
  ]
};

/**
 * Load built-in questions for a specific form type
 * @param formType - The type of form to load questions for
 * @returns Array of built-in questions with proper ordering
 */
export const loadBuiltInQuestions = (formType: string): CreateQuestionData[] => {
  const builtInQuestions = BUILT_IN_QUESTIONS[formType] || [];
  return builtInQuestions.map((question, index) => ({
    ...question,
    order: index
  }));
};

/**
 * Get form type display names
 */
export const FORM_TYPE_LABELS: Record<string, string> = {
  empty: 'Empty Form',
  general: 'General Feedback',
  customer_satisfaction: 'Customer Satisfaction',
  employee_feedback: 'Employee Feedback',
  product_feedback: 'Product Feedback',
  service_feedback: 'Service Feedback'
};

/**
 * Get the number of built-in questions for a form type
 * @param formType - The type of form
 * @returns Number of built-in questions available
 */
export const getBuiltInQuestionCount = (formType: string): number => {
  return BUILT_IN_QUESTIONS[formType]?.length || 0;
};
