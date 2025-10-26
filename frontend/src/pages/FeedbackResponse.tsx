import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatBubbleLeftRightIcon, CalendarIcon, DocumentTextIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { publicFeedbackAPI, responsesAPI } from '../services/api';
import { FeedbackResponse as FeedbackResponseType } from '../types';

// Using the Answer and FeedbackResponse interfaces from types

const FeedbackResponse: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [response, setResponse] = useState<FeedbackResponseType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to render rating display
  const renderRatingDisplay = (rating: number, maxRating: number = 5) => {
    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
      if (i <= rating) {
        stars.push(
          <StarSolidIcon key={i} className="h-5 w-5 text-yellow-400" />
        );
      } else {
        stars.push(
          <StarIcon key={i} className="h-5 w-5 text-gray-300" />
        );
      }
    }
    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="ml-2 text-sm font-medium text-gray-700">
          {rating}/{maxRating}
        </span>
      </div>
    );
  };

  // Function to render rating_10 display
  const renderRating10Display = (rating: number) => {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-violet-100 px-3 py-1 rounded-full">
          <span className="text-lg font-bold text-violet-800">{rating}</span>
          <span className="text-sm text-violet-600 ml-1">/10</span>
        </div>
        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
          <div
            className="bg-violet-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(rating / 10) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchResponse = async () => {
      if (!id) return;
      
      setLoading(true);
      setError('');
      try {
        // Try public API first
        let data;
        try {
          data = await publicFeedbackAPI.getPublicResponse(id);
        } catch (publicError) {
          console.log('Public API failed, trying authenticated API:', publicError);
          // Fallback to authenticated API
          data = await responsesAPI.getResponse(id);
        }
        setResponse(data);
      } catch (err: any) {
        console.error('Failed to load response:', err);
        setError(err.response?.data?.error || 'Failed to load response. You may not have permission to view this response.');
      } finally {
        setLoading(false);
      }
    };
    fetchResponse();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading response...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Response Not Found</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors shadow-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!response) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-t-lg border-t-4 border-t-violet-600 border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-violet-100">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-violet-600" />
            </div>
          </div>
          <h2 className="text-2xl font-normal text-gray-900 text-center mb-2">
            Feedback Response
          </h2>
          <p className="text-gray-600 text-center mb-4">{response.form_title}</p>
          
          <div className="flex items-center justify-center text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
            <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>Submitted {new Date(response.submitted_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Answers Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
              Response Details
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {response.answers.length} question{response.answers.length !== 1 ? 's' : ''} answered
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {response.answers.map((ans, idx) => (
              <div key={ans.id || idx} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-violet-100 text-violet-600 text-sm font-medium mt-0.5 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-normal text-gray-900 mb-1">
                        {ans.question_text}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ans.question_type === 'rating' ? 'bg-orange-100 text-orange-800' :
                          ans.question_type === 'rating_10' ? 'bg-violet-100 text-violet-800' :
                          ans.question_type === 'checkbox' ? 'bg-blue-100 text-blue-800' :
                          ans.question_type === 'radio' ? 'bg-green-100 text-green-800' :
                          ans.question_type === 'yes_no' ? 'bg-purple-100 text-purple-800' :
                          ans.question_type === 'textarea' ? 'bg-indigo-100 text-indigo-800' :
                          ans.question_type === 'email' ? 'bg-pink-100 text-pink-800' :
                          ans.question_type === 'phone' ? 'bg-teal-100 text-teal-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ans.question_type === 'rating' ? 'Rating (1-5)' :
                           ans.question_type === 'rating_10' ? 'Rating (1-10)' :
                           ans.question_type === 'checkbox' ? 'Multiple Choice' :
                           ans.question_type === 'radio' ? 'Single Choice' :
                           ans.question_type === 'yes_no' ? 'Yes/No' :
                           ans.question_type === 'textarea' ? 'Long Text' :
                           ans.question_type === 'email' ? 'Email' :
                           ans.question_type === 'phone' ? 'Phone' :
                           'Text'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-9">
                  {ans.question_type === 'rating' && ans.answer_text && !isNaN(Number(ans.answer_text)) ? (
                    <div className="space-y-3">
                      {renderRatingDisplay(Number(ans.answer_text), 5)}
                      <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <span className="font-medium">Rating Value:</span> {ans.answer_text}/5
                      </div>
                    </div>
                  ) : ans.question_type === 'rating_10' && ans.answer_text && !isNaN(Number(ans.answer_text)) ? (
                    <div className="space-y-3">
                      {renderRating10Display(Number(ans.answer_text))}
                      <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <span className="font-medium">Rating Value:</span> {ans.answer_text}/10
                      </div>
                    </div>
                  ) : ans.question_type === 'checkbox' ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                        <div className="text-gray-900 whitespace-pre-wrap">{ans.answer_text}</div>
                      </div>
                      <div className="text-sm text-gray-500 bg-violet-50 px-3 py-2 rounded-lg border border-violet-100">
                        <span className="font-medium text-violet-700">
                          Selected {ans.answer_text.split(', ').length} option{ans.answer_text.split(', ').length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ) : ans.question_type === 'yes_no' ? (
                    <div className="flex items-center space-x-3">
                      <span className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                        ans.answer_text === 'Yes'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {ans.answer_text}
                      </span>
                      <div className="text-sm text-gray-500">
                        {ans.answer_text === 'Yes' ? '✓ Affirmative response' : '✗ Negative response'}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <div className="text-gray-900 whitespace-pre-wrap">{ans.answer_text}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-6">
          <p>Response ID: {id}</p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackResponse;