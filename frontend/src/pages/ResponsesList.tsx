import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  EyeIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { responsesAPI, formsAPI } from '../services/api';
import { FeedbackResponse, FeedbackForm } from '../types';

const ResponsesList: React.FC = () => {
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterFormType, setFilterFormType] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [responsesData, formsData] = await Promise.all([
        responsesAPI.getResponses(),
        formsAPI.getForms()
      ]);
      setResponses(responsesData);
      setForms(formsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  // Get form details for each response
  const getFormDetails = (formId: string) => {
    return forms.find(form => form.id === formId);
  };



  // Filter responses based on search and filters
  const filteredResponses = responses.filter(response => {
    const formDetails = getFormDetails(response.form);

    // Search logic - if no search term, match all; otherwise check multiple fields
    const matchesSearch = !searchTerm ||
                         response.form_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         // Also search in answer text for more comprehensive search
                         response.answers?.some(answer =>
                           answer.answer_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           answer.question_text?.toLowerCase().includes(searchTerm.toLowerCase())
                         );

    // Form filter logic
    const matchesForm = !filterForm || response.form === filterForm;

    // Form type filter logic
    const matchesFormType = !filterFormType || formDetails?.form_type === filterFormType;

    return matchesSearch && matchesForm && matchesFormType;
  });

  // Get unique forms for filter dropdown
  const uniqueForms = Array.from(new Set(responses.map(r => r.form)));

  // Get unique form types for filter dropdown
  const uniqueFormTypes = Array.from(new Set(forms.map(form => form.form_type)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFormTypeBadge = (formType: string) => {
    const typeColors = {
      customer_satisfaction: 'bg-blue-100 text-blue-800',
      employee_feedback: 'bg-green-100 text-green-800',
      product_feedback: 'bg-purple-100 text-purple-800',
      service_feedback: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColors[formType as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'}`}>
        {formType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterForm('');
    setFilterFormType('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || filterForm || filterFormType;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Responses</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all feedback responses
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear all
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Search by form title, response ID, questions, or answers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Form Filter */}
          <div>
            <label htmlFor="form-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Form
            </label>
            <select
              id="form-filter"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={filterForm}
              onChange={(e) => setFilterForm(e.target.value)}
            >
              <option value="">All Forms</option>
              {uniqueForms.map((formId) => {
                const form = responses.find(r => r.form === formId);
                return (
                  <option key={formId} value={formId}>
                    {form?.form_title || formId}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Form Type Filter */}
          <div>
            <label htmlFor="form-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Form Type
            </label>
            <select
              id="form-type-filter"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={filterFormType}
              onChange={(e) => setFilterFormType(e.target.value)}
            >
              <option value="">All Types</option>
              {uniqueFormTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              Showing {filteredResponses.length} of {responses.length} responses
            </div>
          </div>
        </div>
      </div>

      {/* Responses List */}
      {filteredResponses.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {responses.length === 0 ? 'No responses' : 'No responses match your filters'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {responses.length === 0 
              ? "No responses have been submitted yet." 
              : "Try adjusting your search criteria or filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredResponses.map((response) => {
              const formDetails = getFormDetails(response.form);
              return (
                <li key={response.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900">
                              Response #{response.id.slice(-8)}
                            </h3>
                            {formDetails && (
                              <div className="ml-2">
                                {getFormTypeBadge(formDetails.form_type)}
                              </div>
                            )}
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            <p>{response.form_title}</p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            <p>Submitted {formatDate(response.submitted_at)}</p>
                          </div>
                          {response.answers && (
                            <div className="mt-2 text-sm text-gray-500">
                              <p>{response.answers.length} questions answered</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/feedback/response/${response.id}`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                        >
                          <EyeIcon className="h-3 w-3 mr-1" />
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Summary */}
      {responses.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Showing {filteredResponses.length} of {responses.length} responses
          </p>
        </div>
      )}
    </div>
  );
};

export default ResponsesList;