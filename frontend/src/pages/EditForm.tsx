import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { formsAPI } from '../services/api';
import { CreateFeedbackFormData, CreateQuestionData, FeedbackForm, EditFormData } from '../types';
import { loadBuiltInQuestions, getBuiltInQuestionCount } from '../utils/builtInQuestions';
import SmallDatePicker from '../components/SmallDatePicker';



const EditForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // In EditForm.tsx, update the initial state
const [formData, setFormData] = useState<EditFormData>({
  title: '',
  description: '',
  form_type: 'general',
  is_active: true,
  expires_at: null,
  questions: [],
});

// Then update all references from formData.questions to formData.sections[0].questions
  const questionTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'radio', label: 'Single Choice' },
    { value: 'checkbox', label: 'Multiple Choice' },
    { value: 'rating', label: 'Rating (1-5)' },
    { value: 'rating_10', label: 'Rating (1-10)' },
    { value: 'yes_no', label: 'Yes/No' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' },
  ];



  // Function to handle form type change
  const handleFormTypeChange = (newFormType: string) => {
    // If switching to empty form, just clear questions
    if (newFormType === 'empty') {
      const shouldClear = formData.questions.length === 0 ||
        window.confirm('Switching to Empty Form will remove all current questions. Do you want to continue?');

      if (shouldClear) {
        setFormData({
          ...formData,
          form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty',
          questions: []
        });
      } else {
        // Just change the form type without clearing questions
        setFormData({
          ...formData,
          form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty'
        });
      }
      return;
    }

    // For other form types, load built-in questions
    const shouldLoadBuiltIn = formData.questions.length === 0 ||
      window.confirm('Changing form type will replace current questions with built-in questions for the selected type. Do you want to continue?');

    if (shouldLoadBuiltIn) {
      const builtInQuestions = loadBuiltInQuestions(newFormType);
      setFormData({
        ...formData,
        form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty',
        questions: builtInQuestions
      });
    } else {
      // Just change the form type without replacing questions
      setFormData({
        ...formData,
        form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty'
      });
    }
  };

  // Load existing form data
  useEffect(() => {
    const loadForm = async () => {
      if (!id) return;
      
      try {
        setInitialLoading(true);
        setError(null);
        const form: FeedbackForm = await formsAPI.getForm(id);
        
        // Convert form data to the format expected by the form
        const questions: CreateQuestionData[] = form.questions.map(q => ({
          text: q.text,
          question_type: q.question_type,
          is_required: q.is_required,
          order: q.order,
          options: q.options || [],
        }));

        setFormData({
          title: form.title,
          description: form.description,
          form_type: form.form_type,
          is_active: form.is_active,
          expires_at: form.expires_at,
          questions: questions,
        });
      } catch (err: any) {
        console.error('Failed to load form:', err);
        setError(err.response?.data?.error || 'Failed to load form. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadForm();
  }, [id]);

  // Function to validate if a question is properly completed
  const isQuestionComplete = (question: CreateQuestionData): { isComplete: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];

    // Check if question text is filled
    if (!question.text.trim()) {
      missingFields.push('Question text');
    }

    // Check if choice questions have at least 2 options
    if (['radio', 'checkbox'].includes(question.question_type)) {
      const validOptions = question.options?.filter(option => option.trim()) || [];
      if (validOptions.length < 2) {
        missingFields.push('At least 2 options');
      }
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  };

  // Function to check if all existing questions are complete
  const areAllQuestionsComplete = (): { allComplete: boolean; incompleteQuestions: number[] } => {
    const incompleteQuestions: number[] = [];

    formData.questions.forEach((question, index) => {
      const { isComplete } = isQuestionComplete(question);
      if (!isComplete) {
        incompleteQuestions.push(index + 1); // 1-based indexing for user display
      }
    });

    return {
      allComplete: incompleteQuestions.length === 0,
      incompleteQuestions
    };
  };

  const addQuestion = (insertAtIndex?: number, isFirstQuestion: boolean = false) => {
    // Prevent adding questions between or at the end if no questions exist
    // Only allow adding the first question through the designated button
    if (formData.questions.length === 0 && !isFirstQuestion) {
      alert('Please add your first question before adding additional questions.');
      return;
    }

    // If not the first question, check if all existing questions are complete
    if (!isFirstQuestion && formData.questions.length > 0) {
      const { allComplete, incompleteQuestions } = areAllQuestionsComplete();
      if (!allComplete) {
        const questionList = incompleteQuestions.join(', ');
        alert(`Please complete the following questions before adding a new one:\n\nIncomplete questions: ${questionList}\n\nRequired fields:\n- Question text must be filled\n- Choice questions need at least 2 options`);
        return;
      }
    }

    const newQuestion: CreateQuestionData = {
      text: '',
      question_type: 'text',
      is_required: false,
      order: 0, // Will be updated after insertion
      options: [],
    };

    let updatedQuestions;
    if (insertAtIndex !== undefined) {
      // Insert at specific position
      updatedQuestions = [...formData.questions];
      updatedQuestions.splice(insertAtIndex, 0, newQuestion);
    } else {
      // Add at the end
      updatedQuestions = [...formData.questions, newQuestion];
    }

    // Update order for all questions
    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));

    setFormData({
      ...formData,
      questions: reorderedQuestions,
    });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    // Update order for remaining questions
    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));
    setFormData({
      ...formData,
      questions: reorderedQuestions,
    });
  };

  const updateQuestion = (index: number, field: keyof CreateQuestionData, value: any) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      questions: updatedQuestions,
    });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.questions.length - 1)
    ) {
      return;
    }

    const updatedQuestions = [...formData.questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    [updatedQuestions[index], updatedQuestions[newIndex]] = [
      updatedQuestions[newIndex],
      updatedQuestions[index],
    ];

    // Update order
    updatedQuestions.forEach((q, i) => {
      q.order = i;
    });

    setFormData({
      ...formData,
      questions: updatedQuestions,
    });
  };

  const moveQuestionToPosition = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= formData.questions.length) {
      return;
    }

    const updatedQuestions = [...formData.questions];
    const [movedQuestion] = updatedQuestions.splice(fromIndex, 1);
    updatedQuestions.splice(toIndex, 0, movedQuestion);

    // Update order for all questions
    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));

    setFormData({
      ...formData,
      questions: reorderedQuestions,
    });
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = formData.questions[index];
    const duplicatedQuestion: CreateQuestionData = {
      ...questionToDuplicate,
      text: `${questionToDuplicate.text} (Copy)`,
      order: 0, // Will be updated after insertion
    };

    const updatedQuestions = [...formData.questions];
    updatedQuestions.splice(index + 1, 0, duplicatedQuestion);

    // Update order for all questions
    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));

    setFormData({
      ...formData,
      questions: reorderedQuestions,
    });
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...formData.questions];
    if (!updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options = [];
    }
    updatedQuestions[questionIndex].options!.push('');
    setFormData({
      ...formData,
      questions: updatedQuestions,
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[questionIndex].options!.splice(optionIndex, 1);
    setFormData({
      ...formData,
      questions: updatedQuestions,
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[questionIndex].options![optionIndex] = value;
    setFormData({
      ...formData,
      questions: updatedQuestions,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a form title');
      return;
    }

    if (formData.questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const question = formData.questions[i];
      if (!question.text.trim()) {
        alert(`Please enter text for question ${i + 1}`);
        return;
      }
      
      if (['radio', 'checkbox'].includes(question.question_type) && (!question.options || question.options.length < 2)) {
        alert(`Question ${i + 1} needs at least 2 options`);
        return;
      }
    }

    try {
      setLoading(true);
      const updatedForm = await formsAPI.updateForm(id!, formData);
      alert(`Form "${updatedForm.title}" updated successfully!`);
      navigate('/admin/forms');
    } catch (error) {
      console.error('Failed to update form:', error);
      alert('Failed to update form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to get visual indicator for question completion status
  const getQuestionStatusIndicator = (question: CreateQuestionData, index: number) => {
    const { isComplete, missingFields } = isQuestionComplete(question);

    if (isComplete) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Complete
        </span>
      );
    } else {
      return (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-help"
          title={`Missing: ${missingFields.join(', ')}`}
        >
          ⚠ Incomplete
        </span>
      );
    }
  };

  const renderQuestionOptions = (questionIndex: number) => {
    const question = formData.questions[questionIndex];
    
    if (!['radio', 'checkbox'].includes(question.question_type)) {
      return null;
    }

    return (
      <div className="mt-3 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Options</label>
        {(question.options || []).map((option, optionIndex) => (
          <div key={optionIndex} className="flex items-center space-x-2">
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
              className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder={`Option ${optionIndex + 1}`}
            />
            <button
              type="button"
              onClick={() => removeOption(questionIndex, optionIndex)}
              className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addOption(questionIndex)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Option
        </button>
      </div>
    );
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Form</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/admin/forms')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to Forms
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Form</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your feedback form
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Form Details</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Form Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter form title"
                required
              />
            </div>

            <div>
              <label htmlFor="form_type" className="block text-sm font-medium text-gray-700">
                Form Type
              </label>
              <select
                id="form_type"
                value={formData.form_type}
                onChange={(e) => handleFormTypeChange(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="empty">Empty Form (Start from scratch)</option>
                <option value="general">General Feedback ({getBuiltInQuestionCount('general')} built-in questions)</option>
                <option value="customer_satisfaction">Customer Satisfaction ({getBuiltInQuestionCount('customer_satisfaction')} built-in questions)</option>
                <option value="employee_feedback">Employee Feedback ({getBuiltInQuestionCount('employee_feedback')} built-in questions)</option>
                <option value="product_feedback">Product Feedback ({getBuiltInQuestionCount('product_feedback')} built-in questions)</option>
                <option value="service_feedback">Service Feedback ({getBuiltInQuestionCount('service_feedback')} built-in questions)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter form description"
              />
            </div>

            <div>
              <SmallDatePicker
                id="expires_at"
                label="Expiration Date"
                value={formData.expires_at}
                onChange={(value) => setFormData({ ...formData, expires_at: value })}
                placeholder="No expiration"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Questions</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  if (formData.form_type === 'empty') {
                    alert('Empty Form has no built-in questions. Please add your own questions or switch to a different form type.');
                    return;
                  }
                  const builtInQuestions = loadBuiltInQuestions(formData.form_type);
                  if (formData.questions.length > 0) {
                    if (window.confirm('This will replace all current questions with built-in questions. Do you want to continue?')) {
                      setFormData({ ...formData, questions: builtInQuestions });
                    }
                  } else {
                    setFormData({ ...formData, questions: builtInQuestions });
                  }
                }}
                disabled={formData.form_type === 'empty'}
                className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  formData.form_type === 'empty'
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Load Built-in Questions
              </button>
            </div>
          </div>

          {formData.questions.length === 0 ? (
            <div className="text-center py-8">
              {formData.form_type === 'empty' ? (
                <>
                  <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                      <PlusIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your Custom Form</h3>
                  <p className="text-gray-500 mb-6">
                    This form is set to Empty Form type. Build your feedback form from scratch by adding your own custom questions.
                  </p>
                  <button
                    type="button"
                    onClick={() => addQuestion(undefined, true)}
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Your First Question
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-4">No questions added yet. You can load built-in questions for this form type or add your own.</p>
                  <div className="space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        const builtInQuestions = loadBuiltInQuestions(formData.form_type);
                        setFormData({ ...formData, questions: builtInQuestions });
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Load Built-in Questions
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuestion(undefined, true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Custom Question
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {formData.questions.map((question, index) => (
                <div key={index}>
                  {/* Add Question Button Above (except for first question) */}
                  {index > 0 && (() => {
                    const { allComplete, incompleteQuestions } = areAllQuestionsComplete();
                    return (
                      <div className="flex justify-center mb-4">
                        <button
                          type="button"
                          onClick={() => addQuestion(index)}
                          disabled={!allComplete}
                          className={`inline-flex items-center px-3 py-1 border border-dashed rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            allComplete
                              ? 'border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 focus:ring-primary-500'
                              : 'border-red-300 text-red-400 bg-red-50 cursor-not-allowed'
                          }`}
                          title={!allComplete ? `Complete questions ${incompleteQuestions.join(', ')} first` : 'Add question here'}
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          {allComplete ? 'Add Question Here' : 'Complete Questions First'}
                        </button>
                      </div>
                    );
                  })()}

                  <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">Question {index + 1}</h4>
                        {getQuestionStatusIndicator(question, index)}
                        <div className="flex items-center space-x-1">
                          <select
                            value={index}
                            onChange={(e) => moveQuestionToPosition(index, parseInt(e.target.value))}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            title="Move to position"
                          >
                            {formData.questions.map((_, i) => (
                              <option key={i} value={i}>
                                Position {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          className="inline-flex items-center p-1 border border-transparent rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ChevronUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === formData.questions.length - 1}
                          className="inline-flex items-center p-1 border border-transparent rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ChevronUpIcon className="h-4 w-4 transform rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateQuestion(index)}
                          className="inline-flex items-center p-1 border border-transparent rounded text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Duplicate question"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="inline-flex items-center p-1 border border-transparent rounded text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Delete question"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Question Text *</label>
                      <input
                        type="text"
                        value={question.text}
                        onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="Enter your question"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Question Type</label>
                      <select
                        value={question.question_type}
                        onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        {questionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={question.is_required}
                        onChange={(e) => updateQuestion(index, 'is_required', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">Required</span>
                    </label>
                  </div>

                    {renderQuestionOptions(index)}
                  </div>
                </div>
              ))}

              {/* Add Question Button at the End */}
              <div className="flex justify-center mt-6">
                {(() => {
                  const { allComplete, incompleteQuestions } = areAllQuestionsComplete();
                  return (
                    <button
                      type="button"
                      onClick={() => addQuestion()}
                      disabled={!allComplete}
                      className={`inline-flex items-center px-4 py-2 border border-dashed rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        allComplete
                          ? 'border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 focus:ring-primary-500'
                          : 'border-red-300 text-red-400 bg-red-50 cursor-not-allowed focus:ring-red-500'
                      }`}
                      title={!allComplete ? `Complete questions ${incompleteQuestions.join(', ')} first` : 'Add question at the end'}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      {allComplete ? 'Add Question at End' : 'Complete Questions First'}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/forms')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Form'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditForm; 