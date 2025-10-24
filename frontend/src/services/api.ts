import axios from 'axios';
import {
  FeedbackForm,
  CreateFeedbackFormData,
  FeedbackResponse,
  FormAnalytics,
  QuestionAnalytics,
  Notification as NotificationType,
  FormSummary,
  SubmitFeedbackData
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Response interceptor for error handling - UPDATED
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Only handle auth redirect for specific cases
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Only redirect if not already on login page and not a public route
      if (!currentPath.includes('/login') && !currentPath.includes('/feedback/')) {
        localStorage.removeItem('authToken');
        // Use window.location for auth redirects to avoid React Router conflicts
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/api/auth/login/', { username, password });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/api/auth/logout/');
    localStorage.removeItem('authToken');
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/user/');
    return response.data;
  },
};

// Forms API - IMPROVED ERROR HANDLING
export const formsAPI = {
  // Get all forms
  getForms: async (): Promise<FeedbackForm[]> => {
    try {
      const response = await api.get('/api/forms/');
      return response.data.results || response.data || [];
    } catch (error: any) {
      console.error('Failed to load forms:', error);
      // Return empty array instead of throwing for better UX
      return [];
    }
  },
  
  // Get a specific form - WITH BETTER ERROR HANDLING
  getForm: async (id: string): Promise<FeedbackForm> => {
    try {
      const response = await api.get(`/api/forms/${id}/`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to load form ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Form not found');
      }
      throw error;
    }
  },
  
  // Create a new form
  createForm: async (data: CreateFeedbackFormData): Promise<FeedbackForm> => {
    const response = await api.post('/api/forms/', data);
    return response.data;
  },
  
  // Update a form - WITH BETTER ERROR HANDLING
  updateForm: async (id: string, data: Partial<CreateFeedbackFormData>): Promise<FeedbackForm> => {
    try {
      const response = await api.patch(`/api/forms/${id}/`, data);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to update form ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Form not found');
      }
      if (error.response?.status === 403) {
        throw new Error('You do not have permission to edit this form');
      }
      throw error;
    }
  },
  
  // Delete a form
  deleteForm: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/forms/${id}/`);
    return response.data;
  },
  
  // Get form analytics - WITH BETTER ERROR HANDLING
  getFormAnalytics: async (id: string): Promise<FormAnalytics> => {
    try {
      const response = await api.get(`/api/forms/${id}/analytics/`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to load analytics for form ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Form not found');
      }
      // Return empty analytics object that matches the FormAnalytics type
      return {
        id: 0,
        form: id,
        form_title: 'Unknown Form',
        total_responses: 0,
        completion_rate: 0,
        average_rating: 0,
        last_updated: new Date().toISOString(),
      };
    }
  },
  
  // Get question analytics - WITH BETTER ERROR HANDLING
  getQuestionAnalytics: async (id: string): Promise<QuestionAnalytics[]> => {
    try {
      const response = await api.get(`/api/forms/${id}/question_analytics/`);
      return response.data;
    } catch (error: any) {
      console.error(`Failed to load question analytics for form ${id}:`, error);
      // Return empty array instead of throwing
      return [];
    }
  },
  
  // Get responses for a specific form
  getFormResponses: async (id: string): Promise<FeedbackResponse[]> => {
    try {
      const response = await api.get(`/api/forms/${id}/responses/`);
      return response.data.results || response.data || [];
    } catch (error: any) {
      console.error(`Failed to load responses for form ${id}:`, error);
      return [];
    }
  },
};

// Public Feedback API (for users submitting feedback)
export const publicFeedbackAPI = {
  // Get list of all public forms
  getPublicForms: async (): Promise<FeedbackForm[]> => {
    const response = await api.get('/api/public/forms/');
    return response.data;
  },
  
  // Get form for public access
  // In your api.ts - Update the publicFeedbackAPI.getPublicForm method
getPublicForm: async (formId: string): Promise<FeedbackForm> => {
  try {
    console.log(`🔍 Fetching public form: ${formId}`);
    
    // Use the correct endpoint with form_id parameter name
    const response = await api.get(`/api/public/feedback/${formId}/`);
    
    console.log('✅ Public form loaded successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to load public form ${formId}:`, error);
    
    if (error.response?.status === 404) {
      throw new Error('Form not found or is not publicly accessible');
    } else if (error.response?.status === 500) {
      // Log the actual server error details
      console.error('Server error details:', error.response?.data);
      throw new Error('Server error occurred. Please try again later.');
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else {
      throw new Error('Failed to load form. Please check the form ID and try again.');
    }
  }
},
  
  // Submit feedback response
  submitFeedback: async (formId: string, data: SubmitFeedbackData): Promise<{ message: string; response_id: string }> => {
    const response = await api.post(`/api/public/feedback/${formId}/`, data);
    return response.data;
  },
  
  // Get public response details
  getPublicResponse: async (responseId: string): Promise<FeedbackResponse> => {
    const response = await api.get(`/api/public/response/${responseId}/`);
    return response.data;
  },
};

// Responses API
export const responsesAPI = {
  // Get all responses
  getResponses: async (): Promise<FeedbackResponse[]> => {
    const response = await api.get('/api/responses/');
    return response.data.results || response.data || [];
  },
  
  // Get a specific response
  getResponse: async (id: string): Promise<FeedbackResponse> => {
    const response = await api.get(`/api/responses/${id}/`);
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  // Get all notifications
  getNotifications: async (): Promise<NotificationType[]> => {
    const response = await api.get('/api/notifications/');
    return response.data.results || response.data || [];
  },
  
  // Get unread count
  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await api.get('/api/notifications/unread_count/');
    return response.data;
  },
  
  // Mark notification as read
  markAsRead: async (id: number): Promise<{ status: string }> => {
    const response = await api.post(`/api/notifications/${id}/mark_as_read/`);
    return response.data;
  },
  
  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ status: string }> => {
    const response = await api.post('/api/notifications/mark_all_as_read/');
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getSummary: async (admin_name?: string): Promise<FormSummary> => {
    const response = await api.get('/api/dashboard/summary/', {
      params: admin_name ? { admin_name } : {},
    });
    return response.data;
  },

  getAdmins: async (): Promise<{id: number, username: string, email: string}[]> => {
    const response = await api.get('/api/admin/admins/');
    return response.data;
  },
};

// Sections API
export const sectionsAPI = {
  // Get all sections for a form
  getSections: async (formId: string) => {
    const response = await api.get(`/api/forms/${formId}/sections/`);
    return response.data.results || response.data || [];
  },

  // Create a new section
  createSection: async (formId: string, data: { title: string; description: string; order: number }) => {
    const response = await api.post('/api/sections/', { ...data, form: formId });
    return response.data;
  },

  // Update a section
  updateSection: async (id: number, data: Partial<{ title: string; description: string; order: number; next_section: number }>) => {
    const response = await api.patch(`/api/sections/${id}/`, data);
    return response.data;
  },

  // Delete a section
  deleteSection: async (id: number) => {
    const response = await api.delete(`/api/sections/${id}/`);
    return response.data;
  },
};

export default api;