import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { publicFeedbackAPI } from '../services/api';
import { FeedbackForm } from '../types';

const UserHome: React.FC = () => {
  const [availableForms, setAvailableForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicForms();
  }, []);

  const loadPublicForms = async () => {
    try {
      setLoading(true);
      setError(null);
      const forms = await publicFeedbackAPI.getPublicForms();
      setAvailableForms(forms);
    } catch (err) {
      console.error('Failed to load public forms:', err);
      setError('Failed to load feedback forms');
      // Fallback to mock data if API fails
      setAvailableForms([]);
    } finally {
      setLoading(false);
    }
  };

  const getFormTypeBadge = (formType: string) => {
    const typeColors = {
      customer_satisfaction: 'bg-blue-100 text-blue-800',
      product_feedback: 'bg-green-100 text-green-800',
      employee_feedback: 'bg-purple-100 text-purple-800',
      service_feedback: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800',
    };
    
    const typeLabels = {
      customer_satisfaction: 'Customer Satisfaction',
      product_feedback: 'Product Feedback',
      employee_feedback: 'Employee Feedback',
      service_feedback: 'Service Feedback',
      general: 'General Feedback',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[formType as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'}`}>
        {typeLabels[formType as keyof typeof typeLabels] || formType}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Feedback Portal</h1>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              Share Your Feedback
            </h1>
            <p className="mt-4 text-xl text-primary-100 max-w-2xl mx-auto">
              Your voice matters! Participate in our feedback forms and help us improve our services.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <DocumentTextIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <div className="text-3xl font-bold text-gray-900">{availableForms.length}</div>
            <div className="text-sm text-gray-500">Available Forms</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <div className="text-3xl font-bold text-gray-900">
              {availableForms.reduce((total, form) => total + form.response_count, 0)}
            </div>
            <div className="text-sm text-gray-500">Total Responses</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <UserGroupIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <div className="text-3xl font-bold text-gray-900">
              {availableForms.reduce((total, form) => total + form.response_count, 0)}
            </div>
            <div className="text-sm text-gray-500">Community Members</div>
          </div>
        </div>

        {/* Available Forms */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Available Feedback Forms</h2>
          
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Notice</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>{error}. Please try refreshing the page.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : availableForms.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No forms available</h3>
              <p className="mt-1 text-sm text-gray-500">
                {error ? 'Unable to load forms at the moment.' : 'Check back later for new feedback opportunities.'}
              </p>
              {error && (
                <button
                  onClick={loadPublicForms}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableForms.map((form) => (
                <div key={form.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {form.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                          {form.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {getFormTypeBadge(form.form_type)}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 space-x-4 mb-4">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(form.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                            {form.response_count} responses
                          </div>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/feedback/${form.id}`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Take Survey
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="bg-primary-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Want to create your own feedback forms?
          </h3>
          <p className="text-gray-600 mb-6">
            Join our platform as an administrator to create and manage your own feedback forms.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Get Started as Admin
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-300">
            <p>&copy; 2024 Feedback Portal. Built with React and Django.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserHome;