import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { publicFeedbackAPI } from '../services/api';
import { FeedbackForm, SubmitFeedbackData, Question } from '../types';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

interface OptionLink {
  text: string;
  next_section: string | null;
}

interface ExtendedQuestion extends Question {
  option_links?: OptionLink[];
}

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: ExtendedQuestion[];
}

interface ExtendedFeedbackForm extends Omit<FeedbackForm, 'sections'> {
  sections?: Section[];
}

const PublicFeedbackForm: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<ExtendedFeedbackForm | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  
  // Section navigation state
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [visitedSections, setVisitedSections] = useState<Set<number>>(new Set([0]));
  const [sectionNavigationHistory, setSectionNavigationHistory] = useState<number[]>([0]);

  const loadForm = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      console.log(`🔄 Loading public form with ID: ${formId}`);
      
      const formData = await publicFeedbackAPI.getPublicForm(formId!);
      console.log('✅ Form data loaded successfully:', formData);
      console.log('📋 Form sections:', (formData as ExtendedFeedbackForm).sections);
      
      setForm(formData as ExtendedFeedbackForm);
      
      // Reset navigation state when form loads
      setCurrentSectionIndex(0);
      setVisitedSections(new Set([0]));
      setSectionNavigationHistory([0]);
    } catch (error: any) {
      console.error('❌ Error loading form:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      setError(error.response?.data?.error || error.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId, loadForm]);

  const handleAnswerChange = (questionId: number, value: any): void => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Phone number validation function
  const validatePhoneNumber = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10 && /^\d+$/.test(digitsOnly);
  };

  const handlePhoneChange = (questionId: number, value: string): void => {
    const sanitizedValue = value.replace(/[^\d\s\-\(\)\+]/g, '');
    setAnswers(prev => ({
      ...prev,
      [questionId]: sanitizedValue
    }));
  };

  // Get current section
  const getCurrentSection = (): Section | undefined => {
    return form?.sections?.[currentSectionIndex];
  };

  // Get option links for a question
  const getOptionLinks = (question: ExtendedQuestion): OptionLink[] => {
    return question.option_links || [];
  };

  // Handle section navigation based on option selection
  const handleOptionSelection = (question: ExtendedQuestion, selectedValue: string): void => {
    const optionLinks = getOptionLinks(question);
    const selectedOptionIndex = question.options?.indexOf(selectedValue);
    
    if (selectedOptionIndex !== -1 && optionLinks[selectedOptionIndex]?.next_section) {
      const nextSectionId = optionLinks[selectedOptionIndex].next_section;
      const nextSectionIndex = form?.sections?.findIndex(section => section.id === nextSectionId);
      
      if (nextSectionIndex !== undefined && nextSectionIndex !== -1) {
        // Add current section to visited sections
        setVisitedSections(prev => new Set([...prev, currentSectionIndex, nextSectionIndex]));
        
        // Add to navigation history
        setSectionNavigationHistory(prev => [...prev, nextSectionIndex]);
        
        // Navigate to the specified section
        setCurrentSectionIndex(nextSectionIndex);
      }
    }
  };

  // Navigate to next section (normal flow)
  const goToNextSection = (): void => {
    if (!form?.sections) return;
    
    const nextSectionIndex = currentSectionIndex + 1;
    if (nextSectionIndex < form.sections.length) {
      setVisitedSections(prev => new Set([...prev, nextSectionIndex]));
      setSectionNavigationHistory(prev => [...prev, nextSectionIndex]);
      setCurrentSectionIndex(nextSectionIndex);
    }
  };

  // Navigate to previous section
  const goToPreviousSection = (): void => {
    if (sectionNavigationHistory.length > 1) {
      const newHistory = [...sectionNavigationHistory];
      newHistory.pop(); // Remove current
      const previousSectionIndex = newHistory[newHistory.length - 1];
      
      setSectionNavigationHistory(newHistory);
      setCurrentSectionIndex(previousSectionIndex);
    }
  };

  // Check if current section is complete
  const isCurrentSectionComplete = (): boolean => {
    const currentSection = getCurrentSection();
    if (!currentSection) return false;

    for (const question of currentSection.questions || []) {
      if (question.is_required) {
        const answer = answers[question.id];
        if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
          return false;
        }
        
        // Validate phone numbers
        if (question.question_type === 'phone' && answer) {
          if (!validatePhoneNumber(answer)) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Check if form is complete (all visited sections are complete)
  const isFormComplete = (): boolean => {
    if (!form?.sections) return false;

    for (const sectionIndex of Array.from(visitedSections)) {
      const section = form.sections[sectionIndex];
      for (const question of section.questions || []) {
        if (question.is_required) {
          const answer = answers[question.id];
          if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
            return false;
          }
          
          // Validate phone numbers
          if (question.question_type === 'phone' && answer) {
            if (!validatePhoneNumber(answer)) {
              return false;
            }
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!isFormComplete()) {
      // Find incomplete sections
      const incompleteSections: number[] = [];
      Array.from(visitedSections).forEach(sectionIndex => {
        const section = form?.sections?.[sectionIndex];
        if (section) {
          const hasIncomplete = section.questions?.some(question => 
            question.is_required && 
            (!answers[question.id] || 
             answers[question.id] === '' || 
             (Array.isArray(answers[question.id]) && answers[question.id].length === 0) ||
             (question.question_type === 'phone' && answers[question.id] && !validatePhoneNumber(answers[question.id]))
          ));
          if (hasIncomplete) {
            incompleteSections.push(sectionIndex + 1);
          }
        }
      });
      
      if (incompleteSections.length > 0) {
        alert(`Please complete all required questions in sections: ${incompleteSections.join(', ')}`);
        return;
      }
      
      alert('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const submitData: SubmitFeedbackData = {
        form: formId!,
        answers: Object.entries(answers).map(([questionId, value]) => ({
          question: parseInt(questionId),
          answer_text: Array.isArray(value) ? value.join(', ') : String(value),
          answer_value: { value }
        }))
      };

      await publicFeedbackAPI.submitFeedback(formId!, submitData);
      setSuccess(true);
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      setError(error.response?.data?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: ExtendedQuestion): React.ReactElement => {
    const value = answers[question.id] || '';

    switch (question.question_type) {
      case 'text':
      case 'email':
        return (
          <input
            type={question.question_type}
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            required={question.is_required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            rows={4}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            required={question.is_required}
          />
        );

      case 'radio':
        const radioOptionLinks = getOptionLinks(question);
        return (
          <div className="mt-2 space-y-2">
            {(question.options || []).map((option: string, index: number) => {
              const hasNavigation = radioOptionLinks[index]?.next_section;
              const targetSection = hasNavigation 
                ? form?.sections?.find(s => s.id === radioOptionLinks[index].next_section)
                : null;
              
              return (
                <label key={index} className="flex items-center group">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={option}
                    checked={value === option}
                    onChange={(e) => {
                      handleAnswerChange(question.id, e.target.value);
                      handleOptionSelection(question, e.target.value);
                    }}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                    required={question.is_required}
                  />
                  <span className="ml-2 text-sm text-gray-900">{option}</span>
                  {hasNavigation && targetSection && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      <ArrowRightIcon className="h-3 w-3 mr-1" />
                      Jump to {targetSection.title || `Section ${(form?.sections?.indexOf(targetSection) || 0) + 1}`}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
        return (
          <div className="mt-2 space-y-2">
            {(question.options || []).map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    let newValues: string[];
                    if (e.target.checked) {
                      newValues = [...currentValues, option];
                    } else {
                      newValues = currentValues.filter((v: string) => v !== option);
                    }
                    handleAnswerChange(question.id, newValues);
                  }}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'rating':
        return (
          <div className="mt-2 flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleAnswerChange(question.id, rating)}
                className={`p-2 rounded-full ${
                  value === rating
                    ? 'bg-yellow-400 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
        );

      case 'rating_10':
        return (
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleAnswerChange(question.id, rating)}
                className={`px-3 py-1 rounded ${
                  value === rating
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );

      case 'yes_no':
        return (
          <div className="mt-2 flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="Yes"
                checked={value === 'Yes'}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                required={question.is_required}
              />
              <span className="ml-2 text-sm text-gray-900">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="No"
                checked={value === 'No'}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                required={question.is_required}
              />
              <span className="ml-2 text-sm text-gray-900">No</span>
            </label>
          </div>
        );

      case 'phone':
        return (
          <div>
            <input
              type="tel"
              value={value}
              onChange={(e) => handlePhoneChange(question.id, e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              required={question.is_required}
              placeholder="Enter phone number (e.g., +1 234-567-8900)"
            />
            {value && !validatePhoneNumber(value) && (
              <p className="mt-1 text-sm text-red-600">
                Please enter a valid phone number (exactly 10 digits)
              </p>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            required={question.is_required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadForm}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Form not found</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h2>
          <p className="text-lg text-gray-600 mb-6">
            Your feedback has been submitted successfully and will be reviewed by the administrator.
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Your response has been recorded and saved.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Submission ID: {formId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentSection = getCurrentSection();
  const isLastSection = currentSectionIndex === (form.sections?.length || 0) - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Feedback Portal</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          {/* Form Header */}
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
            {form.description && (
              <p className="mt-2 text-gray-600">{form.description}</p>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Section {currentSectionIndex + 1} of {form.sections?.length || 0}
              </span>
              <span className="text-sm text-gray-500">
                {visitedSections.size} of {form.sections?.length || 0} sections visited
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((visitedSections.size) / (form.sections?.length || 1)) * 100}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Current Section */}
          {currentSection && (
            <div className="space-y-6">
              {/* Section Header */}
              {(currentSection.title || currentSection.description) && (
                <div className="border-b border-gray-200 pb-4">
                  {currentSection.title && (
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {currentSection.title}
                    </h2>
                  )}
                  {currentSection.description && (
                    <p className="text-gray-600">{currentSection.description}</p>
                  )}
                </div>
              )}

              {/* Section Questions */}
              <div className="space-y-6">
                {(currentSection.questions || []).map((question, index) => (
                  <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {index + 1}. {question.text}
                      {question.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderQuestionInput(question)}
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={goToPreviousSection}
                  disabled={sectionNavigationHistory.length <= 1}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {!isLastSection ? (
                  <button
                    type="button"
                    onClick={goToNextSection}
                    disabled={!isCurrentSectionComplete()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Section
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!isFormComplete() || submitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PublicFeedbackForm;