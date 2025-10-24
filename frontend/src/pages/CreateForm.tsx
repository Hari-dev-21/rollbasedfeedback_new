import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  RectangleGroupIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { formsAPI } from '../services/api';
import { CreateFeedbackFormData, CreateQuestionData } from '../types';
import { loadBuiltInQuestions, getBuiltInQuestionCount } from '../utils/builtInQuestions';
import SmallDatePicker from '../components/SmallDatePicker';

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: CreateQuestionData[];
}

interface FormDataWithSections {
  title: string;
  description: string;
  form_type: 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty';
  is_active: boolean;
  expires_at: string | null;
  sections: Section[];
}

// Extended interface to include option_links
interface ExtendedQuestionData extends CreateQuestionData {
  option_links?: Array<{
    text: string;
    next_section: string | null;
  }>;
}

const CreateForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [formData, setFormData] = useState<FormDataWithSections>({
    title: '',
    description: '',
    form_type: 'empty',
    is_active: true,
    expires_at: null,
    sections: [
      {
        id: generateId(),
        title: '',
        description: '',
        order: 0,
        questions: [],
      },
    ],
  });

  const questionTypes = [
    { value: 'text', label: 'Short Answer' },
    { value: 'textarea', label: 'Paragraph' },
    { value: 'radio', label: 'Multiple Choice' },
    { value: 'checkbox', label: 'Checkboxes' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'rating', label: 'Rating (1-5)' },
    { value: 'rating_10', label: 'Rating (1-10)' },
    { value: 'yes_no', label: 'Yes/No' },
  ];

  // Utility function to generate unique IDs
  function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Helper function to safely access option_links
  const getOptionLinks = (question: CreateQuestionData): Array<{text: string; next_section: string | null}> => {
    return (question as ExtendedQuestionData).option_links || [];
  };

  // Helper function to set option_links safely
  const setOptionLinks = (question: CreateQuestionData, links: Array<{text: string; next_section: string | null}>): CreateQuestionData => {
    return {
      ...question,
      option_links: links,
    } as ExtendedQuestionData;
  };

  // Calculate total questions count
  const getTotalQuestions = () => {
    return formData.sections.reduce((total, section) => total + section.questions.length, 0);
  };

  // Function to handle form type change
  const handleFormTypeChange = (newFormType: string) => {
    if (newFormType === 'empty') {
      const shouldClear = formData.sections[0].questions.length === 0 ||
        window.confirm('Switching to Empty Form will remove all current questions. Do you want to continue?');

      if (shouldClear) {
        setFormData({
          ...formData,
          form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty',
          sections: [{
            id: generateId(),
            title: '',
            description: '',
            order: 0,
            questions: [],
          }]
        });
      } else {
        setFormData({
          ...formData,
          form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty'
        });
      }
      return;
    }

    const shouldLoadBuiltIn = formData.sections[0].questions.length === 0 ||
      window.confirm('Changing form type will replace current questions with built-in questions for the selected type. Do you want to continue?');

    if (shouldLoadBuiltIn) {
      const builtInQuestions = loadBuiltInQuestions(newFormType);
      setFormData({
        ...formData,
        form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty',
        sections: [{
          id: generateId(),
          title: '',
          description: '',
          order: 0,
          questions: builtInQuestions
        }]
      });
    } else {
      setFormData({
        ...formData,
        form_type: newFormType as 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty'
      });
    }
  };

  // SECTION MANAGEMENT
  const addSection = () => {
    const newSection: Section = {
      id: generateId(),
      title: '',
      description: '',
      order: formData.sections.length,
      questions: [],
    };
    setFormData({
      ...formData,
      sections: [...formData.sections, newSection],
    });
  };

  const removeSection = (sectionIndex: number) => {
    if (formData.sections.length === 1) {
      alert("Cannot remove the last section");
      return;
    }
    const updatedSections = formData.sections
      .filter((_, i) => i !== sectionIndex)
      .map((sec, i) => ({ ...sec, order: i }));
    setFormData({ ...formData, sections: updatedSections });
  };

  const updateSectionField = (sectionIndex: number, field: keyof Section, value: string) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], [field]: value };
    setFormData({ ...formData, sections: updatedSections });
  };

  const moveSection = (sectionIndex: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && sectionIndex === 0) ||
      (direction === 'down' && sectionIndex === formData.sections.length - 1)
    ) {
      return;
    }

    const updatedSections = [...formData.sections];
    const newIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    [updatedSections[sectionIndex], updatedSections[newIndex]] = [
      updatedSections[newIndex],
      updatedSections[sectionIndex],
    ];

    updatedSections.forEach((sec, i) => {
      sec.order = i;
    });

    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  // QUESTION MANAGEMENT
  const addQuestion = (sectionIndex: number, insertAtIndex?: number, isFirstQuestion: boolean = false) => {
    const section = formData.sections[sectionIndex];
    
    if (section.questions.length === 0 && !isFirstQuestion) {
      alert('Please add your first question before adding additional questions.');
      return;
    }

    if (!isFirstQuestion && section.questions.length > 0) {
      const { allComplete } = areAllQuestionsComplete();
      if (!allComplete) {
        alert('Please complete all existing questions before adding a new one.');
        return;
      }
    }

    const newQuestion: ExtendedQuestionData = {
      text: '',
      question_type: 'text',
      is_required: false,
      order: 0,
      options: [],
      option_links: [],
    };

    let updatedQuestions;
    if (insertAtIndex !== undefined) {
      updatedQuestions = [...section.questions];
      updatedQuestions.splice(insertAtIndex, 0, newQuestion);
    } else {
      updatedQuestions = [...section.questions, newQuestion];
    }

    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));

    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex] = {
      ...section,
      questions: reorderedQuestions,
    };

    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    const section = formData.sections[sectionIndex];
    const updatedQuestions = section.questions.filter((_, i) => i !== questionIndex);
    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));

    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex] = {
      ...section,
      questions: reorderedQuestions,
    };

    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const updateQuestion = (sectionIndex: number, questionIndex: number, field: keyof CreateQuestionData, value: any) => {
    const updatedSections = [...formData.sections];
    const section = updatedSections[sectionIndex];
    
    section.questions[questionIndex] = {
      ...section.questions[questionIndex],
      [field]: value,
    };
    
    if (field === 'question_type' && !['radio', 'checkbox', 'dropdown'].includes(value)) {
      section.questions[questionIndex].options = [];
      // Clear option_links when switching from choice type
      const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
      extendedQuestion.option_links = [];
    }
    
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const moveQuestion = (sectionIndex: number, questionIndex: number, direction: 'up' | 'down') => {
    const section = formData.sections[sectionIndex];
    if (
      (direction === 'up' && questionIndex === 0) ||
      (direction === 'down' && questionIndex === section.questions.length - 1)
    ) {
      return;
    }

    const updatedQuestions = [...section.questions];
    const newIndex = direction === 'up' ? questionIndex - 1 : questionIndex + 1;
    [updatedQuestions[questionIndex], updatedQuestions[newIndex]] = [
      updatedQuestions[newIndex],
      updatedQuestions[questionIndex],
    ];

    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));

    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex] = {
      ...section,
      questions: reorderedQuestions,
    };

    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const duplicateQuestion = (sectionIndex: number, questionIndex: number) => {
    const section = formData.sections[sectionIndex];
    const questionToDuplicate = section.questions[questionIndex];
    const duplicatedQuestion: ExtendedQuestionData = {
      ...questionToDuplicate,
      text: `${questionToDuplicate.text} (Copy)`,
      order: 0,
      options: questionToDuplicate.options ? [...questionToDuplicate.options] : [],
      option_links: questionToDuplicate.option_links ? [...questionToDuplicate.option_links] : [],
    };

    const updatedQuestions = [...section.questions];
    updatedQuestions.splice(questionIndex + 1, 0, duplicatedQuestion);

    const reorderedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      order: i,
    }));

    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex] = {
      ...section,
      questions: reorderedQuestions,
    };

    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  // OPTION MANAGEMENT
  const addOption = (sectionIndex: number, questionIndex: number) => {
    const section = formData.sections[sectionIndex];
    const question = section.questions[questionIndex];
    const currentOptions = question.options || [];
    const currentOptionLinks = getOptionLinks(question);
    const newOptionNumber = currentOptions.length + 1;
    const updatedOptions = [...currentOptions, `Option ${newOptionNumber}`];
    const updatedOptionLinks = [...currentOptionLinks, { text: `Option ${newOptionNumber}`, next_section: null }];
    
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].questions[questionIndex] = setOptionLinks(
      { ...question, options: updatedOptions },
      updatedOptionLinks
    );
    
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const removeOption = (sectionIndex: number, questionIndex: number, optionIndex: number) => {
    const section = formData.sections[sectionIndex];
    const question = section.questions[questionIndex];
    const updatedOptions = question.options?.filter((_, i: number) => i !== optionIndex) || [];
    const currentOptionLinks = getOptionLinks(question);
    const updatedOptionLinks = currentOptionLinks.filter((_, i: number) => i !== optionIndex);
    
    if (updatedOptions.length < 2 && ['radio', 'checkbox', 'dropdown'].includes(question.question_type)) {
      alert('Choice questions must have at least 2 options. Add another option before removing this one.');
      return;
    }
    
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].questions[questionIndex] = setOptionLinks(
      { ...question, options: updatedOptions },
      updatedOptionLinks
    );
    
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  const updateOption = (sectionIndex: number, questionIndex: number, optionIndex: number, value: string) => {
    const section = formData.sections[sectionIndex];
    const question = section.questions[questionIndex];
    const updatedOptions = [...(question.options || [])];
    const currentOptionLinks = getOptionLinks(question);
    const updatedOptionLinks = [...currentOptionLinks];
    
    updatedOptions[optionIndex] = value;
    
    // Ensure option_links array is long enough
    while (updatedOptionLinks.length <= optionIndex) {
      updatedOptionLinks.push({ text: value, next_section: null });
    }
    
    // Update the text in option_links as well
    updatedOptionLinks[optionIndex] = {
      ...updatedOptionLinks[optionIndex],
      text: value,
    };
    
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].questions[questionIndex] = setOptionLinks(
      { ...question, options: updatedOptions },
      updatedOptionLinks
    );
    
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  // SECTION NAVIGATION FOR OPTIONS
  const updateOptionNavigation = (sectionIndex: number, questionIndex: number, optionIndex: number, sectionId: string | null) => {
    const section = formData.sections[sectionIndex];
    const question = section.questions[questionIndex];
    const currentOptionLinks = getOptionLinks(question);
    const updatedOptionLinks = [...currentOptionLinks];
    
    // Ensure the array is long enough
    while (updatedOptionLinks.length <= optionIndex) {
      updatedOptionLinks.push({ 
        text: question.options?.[optionIndex] || `Option ${optionIndex + 1}`,
        next_section: null 
      });
    }
    
    updatedOptionLinks[optionIndex] = {
      ...updatedOptionLinks[optionIndex],
      next_section: sectionId || null,
    };
    
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].questions[questionIndex] = setOptionLinks(
      question,
      updatedOptionLinks
    );
    
    setFormData({
      ...formData,
      sections: updatedSections,
    });
  };

  // Get available sections for navigation (exclude current section and previous sections)
  const getAvailableSectionsForNavigation = (currentSectionIndex: number) => {
    return formData.sections
      .filter((_, index) => index > currentSectionIndex)
      .map(section => ({
        id: section.id,
        title: section.title || `Section ${formData.sections.findIndex(s => s.id === section.id) + 1}`,
        order: section.order,
      }));
  };

  // Get section title by ID
  const getSectionTitleById = (sectionId: string) => {
    const section = formData.sections.find(s => s.id === sectionId);
    return section?.title || `Section ${formData.sections.findIndex(s => s.id === sectionId) + 1}`;
  };

  // VALIDATION
  const isQuestionComplete = (question: CreateQuestionData): { isComplete: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];

    if (!question.text.trim()) {
      missingFields.push('Question text');
    }

    if (['radio', 'checkbox', 'dropdown'].includes(question.question_type)) {
      const validOptions = question.options?.filter(option => option.trim()) || [];
      if (validOptions.length < 2) {
        missingFields.push('At least 2 options');
      }
      
      const uniqueOptions = new Set(validOptions.map(opt => opt.toLowerCase().trim()));
      if (uniqueOptions.size !== validOptions.length) {
        missingFields.push('Duplicate options found');
      }
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields
    };
  };

  const areAllQuestionsComplete = (): { allComplete: boolean; incompleteQuestions: { section: number; question: number }[] } => {
    const incompleteQuestions: { section: number; question: number }[] = [];

    formData.sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        const { isComplete } = isQuestionComplete(question);
        if (!isComplete) {
          incompleteQuestions.push({ section: sectionIndex + 1, question: questionIndex + 1 });
        }
      });
    });

    return {
      allComplete: incompleteQuestions.length === 0,
      incompleteQuestions
    };
  };

  const getQuestionStatusIndicator = (question: CreateQuestionData) => {
    const { isComplete, missingFields } = isQuestionComplete(question);

    if (isComplete) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          ✓ Complete
        </span>
      );
    } else {
      return (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 cursor-help"
          title={`Missing: ${missingFields.join(', ')}`}
        >
          ⚠ Incomplete
        </span>
      );
    }
  };

  // CORRECTED handleSubmit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a form title');
      return;
    }

    // Check if any section has questions
    const hasQuestions = formData.sections.some(section => section.questions.length > 0);
    if (!hasQuestions) {
      alert('Please add at least one question');
      return;
    }

    // Enhanced validation
    const { allComplete, incompleteQuestions } = areAllQuestionsComplete();
    if (!allComplete) {
      const incompleteList = incompleteQuestions.map(item => `Section ${item.section}, Question ${item.question}`).join('\n');
      alert(`Please complete all questions before submitting:\n\n${incompleteList}`);
      return;
    }

    try {
      setLoading(true);
      
      // Prepare data for backend
      const backendFormData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        form_type: formData.form_type,
        is_active: formData.is_active,
        expires_at: formData.expires_at,
        sections: formData.sections.map(section => ({
          title: section.title.trim(),
          description: section.description.trim(),
          order: section.order,
          questions: section.questions.map(question => ({
            text: question.text.trim(),
            question_type: question.question_type,
            is_required: question.is_required,
            order: question.order,
            options: question.options || [],
            option_links: getOptionLinks(question).map(link => ({
              text: link.text,
              next_section: link.next_section
            }))
          }))
        }))
      };

      // Debug log
      console.log('Sending data to backend:', JSON.stringify(backendFormData, null, 2));

      const createdForm = await formsAPI.createForm(backendFormData);
      alert(`Form "${createdForm.title}" created successfully!`);
      navigate('/admin/forms');
    } catch (error: any) {
      console.error('Failed to create form:', error);
      // Also log the response data if available
      if (error.response) {
        console.error('Backend response:', error.response.data);
      }
      alert('Failed to create form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced question options rendering with section navigation
  const renderQuestionOptions = (sectionIndex: number, questionIndex: number) => {
    const question = formData.sections[sectionIndex].questions[questionIndex];
    
    if (!['radio', 'checkbox', 'dropdown'].includes(question.question_type)) {
      return null;
    }

    const isSingleChoice = question.question_type === 'radio' || question.question_type === 'dropdown';
    const availableSections = getAvailableSectionsForNavigation(sectionIndex);
    const hasAvailableSections = availableSections.length > 0;
    const optionLinks = getOptionLinks(question);

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {question.question_type === 'radio' ? 'Multiple Choice Options' : 
             question.question_type === 'checkbox' ? 'Checkboxes Options' : 'Dropdown Options'}
          </label>
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
            {isSingleChoice ? 'User can select one option' : 'User can select multiple options'}
          </span>
        </div>
        
        <div className="space-y-4">
          {(question.options || []).map((option: string, optionIndex: number) => (
            <div key={optionIndex} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center space-x-3 group mb-3">
                {/* Option preview indicator */}
                <div className="flex items-center justify-center w-6 h-6">
                  {question.question_type === 'radio' ? (
                    <div className="w-4 h-4 border-2 border-gray-400 rounded-full group-hover:border-gray-600 transition-colors" />
                  ) : question.question_type === 'checkbox' ? (
                    <div className="w-4 h-4 border-2 border-gray-400 rounded group-hover:border-gray-600 transition-colors" />
                  ) : (
                    <div className="w-4 h-4 border border-gray-400 rounded group-hover:border-gray-600 transition-colors" />
                  )}
                </div>
                
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(sectionIndex, questionIndex, optionIndex, e.target.value)}
                  className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder={`Option ${optionIndex + 1}`}
                />
                
                <button
                  type="button"
                  onClick={() => removeOption(sectionIndex, questionIndex, optionIndex)}
                  className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove option"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Section Navigation Setting */}
              <div className="mt-2 pl-9">
                <div className="flex items-center space-x-2">
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                  <label className="text-sm font-medium text-gray-700">
                    Go to:
                  </label>
                </div>
                <div className="mt-1 flex items-center space-x-2">
                  <select
                    value={optionLinks[optionIndex]?.next_section || ''}
                    onChange={(e) => updateOptionNavigation(sectionIndex, questionIndex, optionIndex, e.target.value || null)}
                    className="block w-full max-w-xs border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">No navigation (continue to next section)</option>
                    {hasAvailableSections ? (
                      availableSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No sections available for navigation</option>
                    )}
                  </select>
                  
                  {optionLinks[optionIndex]?.next_section && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      ✓ Will jump to {getSectionTitleById(optionLinks[optionIndex].next_section!)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button
          type="button"
          onClick={() => addOption(sectionIndex, questionIndex)}
          className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add option
        </button>
        
        {(question.options || []).length < 2 && (
          <p className="mt-2 text-sm text-yellow-600">
            {isSingleChoice ? 'Single choice' : 'Multiple choice'} questions need at least 2 options
          </p>
        )}

        {hasAvailableSections && (
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center space-x-2">
              <ArrowRightIcon className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-blue-700">
                <strong>Section Navigation:</strong> When users select an option with section navigation enabled, 
                they will jump directly to the specified section instead of continuing to the next one.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Enhanced preview mode rendering with sections and navigation indicators
  const renderPreview = () => {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Form Preview</h3>
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <EyeSlashIcon className="h-4 w-4 mr-2" />
            Exit Preview
          </button>
        </div>

        <div className="space-y-8">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{formData.title || 'Untitled Form'}</h1>
            {formData.description && (
              <p className="mt-2 text-gray-600">{formData.description}</p>
            )}
          </div>

          {formData.sections.map((section: Section, sectionIndex: number) => (
            <div key={section.id} className="border border-gray-200 rounded-lg p-6">
              {(section.title || section.description) && (
                <div className="mb-6 pb-4 border-b border-gray-200">
                  {section.title && (
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {section.title}
                    </h2>
                  )}
                  {section.description && (
                    <p className="text-gray-600">{section.description}</p>
                  )}
                </div>
              )}
              
              <div className="space-y-6">
                {section.questions.map((question: CreateQuestionData, questionIndex: number) => {
                  const optionLinks = getOptionLinks(question);
                  
                  return (
                    <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {question.text || 'Untitled Question'}
                          {question.is_required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {question.question_type === 'text' && (
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Your answer"
                          />
                        )}
                        
                        {question.question_type === 'textarea' && (
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                            rows={4}
                            placeholder="Your answer"
                          />
                        )}
                        
                        {question.question_type === 'radio' && (
                          <div className="space-y-2">
                            {(question.options || []).map((option: string, optionIndex: number) => (
                              <label key={optionIndex} className="flex items-center space-x-3 group">
                                <input
                                  type="radio"
                                  name={`preview-${sectionIndex}-${questionIndex}`}
                                  className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-gray-700">{option}</span>
                                {optionLinks[optionIndex]?.next_section && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <ArrowRightIcon className="h-3 w-3 mr-1" />
                                    Jump to {getSectionTitleById(optionLinks[optionIndex].next_section!)}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {question.question_type === 'checkbox' && (
                          <div className="space-y-2">
                            {(question.options || []).map((option: string, optionIndex: number) => (
                              <label key={optionIndex} className="flex items-center space-x-3 group">
                                <input
                                  type="checkbox"
                                  className="text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-gray-700">{option}</span>
                                {optionLinks[optionIndex]?.next_section && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <ArrowRightIcon className="h-3 w-3 mr-1" />
                                    Jump to {getSectionTitleById(optionLinks[optionIndex].next_section!)}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        )}

                        {question.question_type === 'dropdown' && (
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500">
                            <option value="">Select an option</option>
                            {(question.options || []).map((option: string, optionIndex: number) => (
                              <option key={optionIndex} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {/* Other question types remain the same */}
                        {question.question_type === 'email' && (
                          <input
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="your@email.com"
                          />
                        )}
                        
                        {question.question_type === 'phone' && (
                          <input
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Your phone number"
                          />
                        )}
                        
                        {question.question_type === 'rating' && (
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className="w-10 h-10 rounded-full border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                {star}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {question.question_type === 'rating_10' && (
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <button
                                key={num}
                                type="button"
                                className="w-8 h-8 rounded border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {question.question_type === 'yes_no' && (
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input type="radio" name={`yes-no-${sectionIndex}-${questionIndex}`} className="text-primary-600" />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input type="radio" name={`yes-no-${sectionIndex}-${questionIndex}`} className="text-primary-600" />
                              <span>No</span>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with preview toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Form</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new feedback form with sections and conditional navigation
          </p>
        </div>
        {getTotalQuestions() > 0 && (
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {isPreview ? <EyeSlashIcon className="h-4 w-4 mr-2" /> : <EyeIcon className="h-4 w-4 mr-2" />}
            {isPreview ? 'Exit Preview' : 'Preview Form'}
          </button>
        )}
      </div>

      {isPreview ? (
        renderPreview()
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Details - Updated UI */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Form Details</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Form Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter form title"
                  required
                />
              </div>

              <div>
                <label htmlFor="form_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Form Type
                </label>
                <select
                  id="form_type"
                  value={formData.form_type}
                  onChange={(e) => handleFormTypeChange(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {formData.sections.map((section: Section, sectionIndex: number) => (
              <div key={section.id} className="bg-white shadow-sm rounded-lg border border-gray-200">
                {/* Section Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Section {sectionIndex + 1}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => moveSection(sectionIndex, 'up')}
                        disabled={sectionIndex === 0}
                        className="inline-flex items-center p-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move section up"
                      >
                        <ChevronUpIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(sectionIndex, 'down')}
                        disabled={sectionIndex === formData.sections.length - 1}
                        className="inline-flex items-center p-2 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move section down"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </button>
                      {formData.sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(sectionIndex)}
                          className="inline-flex items-center p-2 border border-transparent rounded text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Remove section"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Section Title
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionField(sectionIndex, 'title', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={`Section ${sectionIndex + 1} title`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Section Description
                      </label>
                      <input
                        type="text"
                        value={section.description}
                        onChange={(e) => updateSectionField(sectionIndex, 'description', e.target.value)}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Section description (optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Questions in Section */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-medium text-gray-900">
                      Questions ({section.questions.length})
                    </h4>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.form_type === 'empty') {
                            alert('Empty Form has no built-in questions. Please add your own questions.');
                            return;
                          }
                          const builtInQuestions = loadBuiltInQuestions(formData.form_type);
                          if (section.questions.length > 0) {
                            if (window.confirm('This will replace all current questions in this section with built-in questions. Do you want to continue?')) {
                              const updatedSections = [...formData.sections];
                              updatedSections[sectionIndex] = {
                                ...section,
                                questions: builtInQuestions
                              };
                              setFormData({ ...formData, sections: updatedSections });
                            }
                          } else {
                            const updatedSections = [...formData.sections];
                            updatedSections[sectionIndex] = {
                              ...section,
                              questions: builtInQuestions
                            };
                            setFormData({ ...formData, sections: updatedSections });
                          }
                        }}
                        disabled={formData.form_type === 'empty'}
                        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formData.form_type === 'empty'
                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                            : 'text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        Load Built-in Questions
                      </button>
                    </div>
                  </div>

                  {section.questions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mb-4">
                        <RectangleGroupIcon className="h-12 w-12 mx-auto text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Questions in This Section</h4>
                      <p className="text-gray-500 mb-4">
                        {sectionIndex === 0 
                          ? 'Start by adding questions to your first section.'
                          : 'Add questions to this section.'
                        }
                      </p>
                      <button
                        type="button"
                        onClick={() => addQuestion(sectionIndex, undefined, true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add First Question
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {section.questions.map((question: CreateQuestionData, questionIndex: number) => (
                        <div key={questionIndex}>
                          {/* Add Question Button Above */}
                          {questionIndex > 0 && (
                            <div className="flex justify-center mb-4">
                              <button
                                type="button"
                                onClick={() => addQuestion(sectionIndex, questionIndex)}
                                className="inline-flex items-center px-3 py-1 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Add question here"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add Question Here
                              </button>
                            </div>
                          )}

                          <div className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <h4 className="text-sm font-medium text-gray-900">
                                  Question {questionIndex + 1}
                                </h4>
                                {getQuestionStatusIndicator(question)}
                                {['radio', 'checkbox', 'dropdown'].includes(question.question_type) && 
                                 getAvailableSectionsForNavigation(sectionIndex).length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <ArrowRightIcon className="h-3 w-3 mr-1" />
                                    Section Navigation Available
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => moveQuestion(sectionIndex, questionIndex, 'up')}
                                  disabled={questionIndex === 0}
                                  className="inline-flex items-center p-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Move up"
                                >
                                  <ChevronUpIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveQuestion(sectionIndex, questionIndex, 'down')}
                                  disabled={questionIndex === section.questions.length - 1}
                                  className="inline-flex items-center p-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Move down"
                                >
                                  <ChevronDownIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => duplicateQuestion(sectionIndex, questionIndex)}
                                  className="inline-flex items-center p-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  title="Duplicate question"
                                >
                                  <DocumentDuplicateIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(sectionIndex, questionIndex)}
                                  className="inline-flex items-center p-1 border border-transparent rounded text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                  title="Delete question"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
                                <input
                                  type="text"
                                  value={question.text}
                                  onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'text', e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                  placeholder="Enter your question"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                                <select
                                  value={question.question_type}
                                  onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'question_type', e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                  {questionTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center">
                              <input
                                type="checkbox"
                                checked={question.is_required}
                                onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'is_required', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label className="ml-2 block text-sm text-gray-900">Required</label>
                            </div>

                            {renderQuestionOptions(sectionIndex, questionIndex)}
                          </div>
                        </div>
                      ))}

                      {/* Add Question Button at the End of Section */}
                      <div className="flex justify-center mt-6">
                        <button
                          type="button"
                          onClick={() => addQuestion(sectionIndex)}
                          className="inline-flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add Question to This Section
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Section Button */}
            <div className="text-center">
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New Section
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/admin/forms')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateForm;