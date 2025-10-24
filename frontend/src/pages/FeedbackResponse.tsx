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
        <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
          <span className="text-lg font-bold text-blue-800">{rating}</span>
          <span className="text-sm text-blue-600 ml-1">/10</span>
        </div>
        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!response) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full bg-white shadow rounded-lg p-8">
        <div className="mb-6 text-center">
          <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-primary-500" />
          <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Feedback Response</h2>
          <p className="text-gray-600">{response.form_title}</p>
          <div className="flex items-center justify-center text-sm text-gray-500 mt-2">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>Submitted {new Date(response.submitted_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="space-y-6">
          {response.answers.map((ans, idx) => (
            <div key={ans.id || idx} className="border-b pb-4">
              <div className="flex items-center text-gray-700 mb-2">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                <span className="font-medium">{ans.question_text}</span>
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
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
              <div className="ml-6">
                {ans.question_type === 'rating' && ans.answer_text && !isNaN(Number(ans.answer_text)) ? (
                  <div className="space-y-2">
                    {renderRatingDisplay(Number(ans.answer_text), 5)}
                    <div className="text-sm text-gray-600">
                      Rating: {ans.answer_text}/5
                    </div>
                  </div>
                ) : ans.question_type === 'rating_10' && ans.answer_text && !isNaN(Number(ans.answer_text)) ? (
                  <div className="space-y-2">
                    {renderRating10Display(Number(ans.answer_text))}
                    <div className="text-sm text-gray-600">
                      Rating: {ans.answer_text}/10
                    </div>
                  </div>
                ) : ans.question_type === 'checkbox' ? (
                  <div className="space-y-1">
                    <div className="text-gray-900">{ans.answer_text}</div>
                    <div className="text-sm text-gray-500">
                      Selected: {ans.answer_text.split(', ').length} option(s)
                    </div>
                  </div>
                ) : ans.question_type === 'yes_no' ? (
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ans.answer_text === 'Yes'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {ans.answer_text}
                    </span>
                  </div>
                ) : (
                  <div className="text-gray-900 whitespace-pre-wrap">{ans.answer_text}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedbackResponse;