import React, { useState } from 'react';
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
  Cog6ToothIcon,
  PaperAirplaneIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formsAPI } from '../services/api';
import { CreateQuestionData } from '../types';
import { loadBuiltInQuestions, getBuiltInQuestionCount } from '../utils/builtInQuestions';
import SmallDatePicker from '../components/SmallDatePicker';

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: CreateQuestionData[];
  next_section_on_submit: string | null;
}

interface FormDataWithSections {
  title: string;
  description: string;
  form_type: 'customer_satisfaction' | 'employee_feedback' | 'product_feedback' | 'service_feedback' | 'general' | 'empty';
  is_active: boolean;
  expires_at: string | null;
  sections: Section[];
}

interface ExtendedQuestionData extends CreateQuestionData {
  option_links?: Array<{
    text: string;
    next_section: string | null;
  }>;
  enable_option_navigation?: boolean;
}

// Utility function to generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Question types array
const questionTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'radio', label: 'Single Choice' },
  { value: 'checkbox', label: 'Multiple Choice' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'yes_no', label: 'Yes or No' },
];

// Sortable Section Component with drag handle
const SortableSection: React.FC<{
  section: Section;
  sectionIndex: number;
  formData: FormDataWithSections;
  setFormData: React.Dispatch<React.SetStateAction<FormDataWithSections>>;
  updateSectionField: (sectionIndex: number, field: keyof Section, value: string | null) => void;
  removeSection: (sectionIndex: number) => void;
  addQuestion: (sectionIndex: number) => void;
  updateQuestion: (sectionIndex: number, questionIndex: number, field: keyof CreateQuestionData, value: any) => void;
  removeQuestion: (sectionIndex: number, questionIndex: number) => void;
  moveQuestion: (sectionIndex: number, questionIndex: number, direction: 'up' | 'down') => void;
  duplicateQuestion: (sectionIndex: number, questionIndex: number) => void;
  renderQuestionOptions: (sectionIndex: number, questionIndex: number) => React.JSX.Element | null;
  getAvailableSectionsForNavigation: (currentSectionIndex: number) => Array<{id: string; title: string; order: number}>;
  getSectionTitleById: (sectionId: string) => string;
}> = ({
  section,
  sectionIndex,
  formData,
  setFormData,
  updateSectionField,
  removeSection,
  addQuestion,
  updateQuestion,
  removeQuestion,
  moveQuestion,
  duplicateQuestion,
  renderQuestionOptions,
  getAvailableSectionsForNavigation,
  getSectionTitleById
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white shadow-md rounded-2xl p-6 border border-gray-200"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <input
  type="text"
  value={section.title}
  onChange={(e) => updateSectionField(sectionIndex, 'title', e.target.value)}
  className={`w-full text-xl font-semibold text-gray-800 border-b focus:outline-none mb-2 ${
    !section.title ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-purple-600'
  }`}
  placeholder={`Section ${sectionIndex + 1} title *`}
  required
/>
          <input
            type="text"
            value={section.description}
            onChange={(e) => updateSectionField(sectionIndex, 'description', e.target.value)}
            className="w-full text-sm text-gray-600 border-b border-transparent focus:border-purple-600 focus:outline-none"
            placeholder="Section description (optional)"
          />
        </div>
        
        {/* Section Controls */}
        <div className="flex items-center gap-2 ml-4">
          {/* Drag Handle Button */}
          <button
            {...attributes}
            {...listeners}
            className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            title="Drag to reorder section"
          >
            <ArrowsUpDownIcon className="w-5 h-5" />
          </button>
          
          {formData.sections.length > 1 && (
            <button
              type="button"
              onClick={() => removeSection(sectionIndex)}
              className="p-2 text-red-400 hover:text-red-600"
              title="Remove section"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Section Navigation Setting */}
      <div className="p-4 bg-white rounded-lg mb-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Section Navigation
          </label>
        </div>
        <div className="flex items-center justify-between">
          <select
            value={section.next_section_on_submit || ''}
            onChange={(e) =>
              updateSectionField(
                sectionIndex,
                'next_section_on_submit',
                e.target.value || null
              )
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-0 focus:border-gray-500"
          >
            <option value="">Continue to next section (default)</option>
            {getAvailableSectionsForNavigation(sectionIndex).map(({ id, title }) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </div>

        {section.next_section_on_submit && (
          <div className="mt-2 text-sm text-blue-600 flex items-center gap-1">
            <ArrowRightIcon className="h-4 w-4" />
            <span>
              Will navigate to:{' '}
              <strong>{getSectionTitleById(section.next_section_on_submit)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {section.questions.map((question: CreateQuestionData, questionIndex: number) => (
          <div key={questionIndex} className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <input
  type="text"
  value={question.text}
  onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'text', e.target.value)}
  className={`w-full font-medium text-gray-700 border-b focus:outline-none mb-3 ${
    !question.text ? 'border-red-300 focus:border-red-500' : 'border-transparent focus:border-purple-600'
  }`}
  placeholder="Question text *"
  required
/>
                
                <div className="flex items-center gap-4">
                  <select
                    value={question.question_type}
                    onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'question_type', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={question.is_required}
                      onChange={(e) => updateQuestion(sectionIndex, questionIndex, 'is_required', e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    Required
                  </label>

                  {/* Option Navigation Toggle */}
                  {['radio', 'checkbox', 'dropdown', 'yes_no', 'rating'].includes(question.question_type) && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={(question as ExtendedQuestionData).enable_option_navigation || false}
                        onChange={(e) => {
                          const updatedSections = [...formData.sections];
                          const section = updatedSections[sectionIndex];
                          const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
                          extendedQuestion.enable_option_navigation = e.target.checked;
                          setFormData({ ...formData, sections: updatedSections });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-blue-600 font-medium">Option Navigation</span>
                    </label>
                  )}
                </div>
              </div>
              
              {/* Question Controls */}
              <div className="flex items-center gap-1 ml-4">
                <button
                  type="button"
                  onClick={() => moveQuestion(sectionIndex, questionIndex, 'up')}
                  disabled={questionIndex === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move question up"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(sectionIndex, questionIndex, 'down')}
                  disabled={questionIndex === section.questions.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Move question down"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateQuestion(sectionIndex, questionIndex)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Duplicate question"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(sectionIndex, questionIndex)}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="Delete question"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Options with Section Navigation - Only show if enabled */}
            {(question as ExtendedQuestionData).enable_option_navigation && renderQuestionOptions(sectionIndex, questionIndex)}
          </div>
        ))}
      </div>

      {/* Add Question Button */}
      <div className='my-3'>
        <button
          onClick={() => addQuestion(sectionIndex)}
          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mt-4 text-sm font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Add Question
        </button>
      </div>
    </div>
  );
};

const CreateForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [formData, setFormData] = useState<FormDataWithSections>({
    title: 'Untitled Form',
    description: 'Form description',
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
        next_section_on_submit: null,
      },
    ],
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for sections
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = formData.sections.findIndex((section) => section.id === active.id);
      const newIndex = formData.sections.findIndex((section) => section.id === over?.id);

      const reorderedSections = arrayMove(formData.sections, oldIndex, newIndex);
      
      // Update order property for all sections
      const updatedSections = reorderedSections.map((section, index) => ({
        ...section,
        order: index,
      }));

      setFormData({
        ...formData,
        sections: updatedSections,
      });
    }
  };

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

  // Helper function to get enable_option_navigation
  const getEnableOptionNavigation = (question: CreateQuestionData): boolean => {
    return (question as ExtendedQuestionData).enable_option_navigation || false;
  };

  // Calculate total questions count
  const getTotalQuestions = () => {
    return formData.sections.reduce((total, section) => total + section.questions.length, 0);
  };

  // Get available sections for navigation (exclude current section)
  const getAvailableSectionsForNavigation = (currentSectionIndex: number) => {
    return formData.sections
      .filter((_, index) => index !== currentSectionIndex)
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
            next_section_on_submit: null,
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
          questions: builtInQuestions,
          next_section_on_submit: null,
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
      next_section_on_submit: null,
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

  const updateSectionField = (sectionIndex: number, field: keyof Section, value: string | null) => {
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], [field]: value };
    setFormData({ ...formData, sections: updatedSections });
  };

  // QUESTION MANAGEMENT
  const addQuestion = (sectionIndex: number) => {
    const section = formData.sections[sectionIndex];
    const newQuestion: ExtendedQuestionData = {
      text: '',
      question_type: 'text',
      is_required: false,
      order: section.questions.length,
      options: [],
      option_links: [],
      enable_option_navigation: false,
    };

    const updatedQuestions = [...section.questions, newQuestion];
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex] = {
      ...section,
      questions: updatedQuestions,
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

  // const updateQuestion = (sectionIndex: number, questionIndex: number, field: keyof CreateQuestionData, value: any) => {
  //   const updatedSections = [...formData.sections];
  //   const section = updatedSections[sectionIndex];
    
  //   section.questions[questionIndex] = {
  //     ...section.questions[questionIndex],
  //     [field]: value,
  //   };
    
  //   if (field === 'question_type') {
  //     // Handle special cases for different question types
  //     if (value === 'yes_no') {
  //       // Set default Yes/No options
  //       section.questions[questionIndex].options = ['Yes', 'No'];
  //       const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
  //       extendedQuestion.option_links = [
  //         { text: 'Yes', next_section: null },
  //         { text: 'No', next_section: null }
  //       ];
  //       extendedQuestion.enable_option_navigation = false;
  //     } else if (value === 'rating') {
  //       // Set default rating options (1-5)
  //       section.questions[questionIndex].options = ['1', '2', '3', '4', '5'];
  //       const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
  //       extendedQuestion.option_links = [
  //         { text: '1', next_section: null },
  //         { text: '2', next_section: null },
  //         { text: '3', next_section: null },
  //         { text: '4', next_section: null },
  //         { text: '5', next_section: null }
  //       ];
  //       extendedQuestion.enable_option_navigation = false;
  //     } else if (!['radio', 'checkbox', 'dropdown'].includes(value)) {
  //       // Clear options for non-choice questions
  //       section.questions[questionIndex].options = [];
  //       const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
  //       extendedQuestion.option_links = [];
  //       extendedQuestion.enable_option_navigation = false;
  //     } else {
  //       // For choice questions, initialize with empty option_links if needed
  //       const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
  //       if (!extendedQuestion.option_links) {
  //         extendedQuestion.option_links = [];
  //       }
  //     }
  //   }
    
  //   setFormData({
  //     ...formData,
  //     sections: updatedSections,
  //   });
  // };


  const updateQuestion = (sectionIndex: number, questionIndex: number, field: keyof CreateQuestionData, value: any) => {
  const updatedSections = [...formData.sections];
  const section = updatedSections[sectionIndex];
  
  section.questions[questionIndex] = {
    ...section.questions[questionIndex],
    [field]: value,
  };
  
  if (field === 'question_type') {
    // Handle special cases for different question types
    if (value === 'yes_no') {
      // Set default Yes/No options
      section.questions[questionIndex].options = ['Yes', 'No'];
      const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
      extendedQuestion.option_links = [
        { text: 'Yes', next_section: null },
        { text: 'No', next_section: null }
      ];
      extendedQuestion.enable_option_navigation = false;
    } else if (value === 'rating') {
      // Set default rating options (1-5)
      section.questions[questionIndex].options = ['1', '2', '3', '4', '5'];
      const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
      extendedQuestion.option_links = [
        { text: '1', next_section: null },
        { text: '2', next_section: null },
        { text: '3', next_section: null },
        { text: '4', next_section: null },
        { text: '5', next_section: null }
      ];
      extendedQuestion.enable_option_navigation = false;
    } else if (value === 'dropdown') {
      // Initialize dropdown with empty options
      section.questions[questionIndex].options = ['Option 1', 'Option 2'];
      const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
      extendedQuestion.option_links = [
        { text: 'Option 1', next_section: null },
        { text: 'Option 2', next_section: null }
      ];
      extendedQuestion.enable_option_navigation = false;
    } else if (!['radio', 'checkbox', 'dropdown'].includes(value)) {
      // Clear options for non-choice questions
      section.questions[questionIndex].options = [];
      const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
      extendedQuestion.option_links = [];
      extendedQuestion.enable_option_navigation = false;
    } else {
      // For choice questions, initialize with empty option_links if needed
      const extendedQuestion = section.questions[questionIndex] as ExtendedQuestionData;
      if (!extendedQuestion.option_links) {
        extendedQuestion.option_links = [];
      }
    }
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
      enable_option_navigation: (questionToDuplicate as ExtendedQuestionData).enable_option_navigation || false,
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
    
    if (updatedOptions.length < 2 && ['radio', 'checkbox', 'dropdown', 'yes_no', 'rating'].includes(question.question_type)) {
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

  // Enhanced question options rendering with section navigation
  const renderQuestionOptions = (sectionIndex: number, questionIndex: number) => {
    const question = formData.sections[sectionIndex].questions[questionIndex];
    
    if (!['radio', 'checkbox', 'dropdown', 'yes_no', 'rating'].includes(question.question_type)) {
      return null;
    }

    const availableSections = getAvailableSectionsForNavigation(sectionIndex);
    const hasAvailableSections = availableSections.length > 0;
    const optionLinks = getOptionLinks(question);
    const enableOptionNavigation = getEnableOptionNavigation(question);

    // Only render if option navigation is enabled
    if (!enableOptionNavigation) {
      return null;
    }

    return (
      <div className="mt-4 p-4 bg-white rounded-lg border border-white">
        <div className="flex items-center justify-between mb-3">
          {/* <label className="block text-sm font-medium text-blue-700">
            Option-based Navigation (Active)
          </label> */}
        </div>
        
        <div className="space-y-3">
          {(question.options || []).map((option: string, optionIndex: number) => (
            <div key={optionIndex} className="border border-white rounded-lg p-3 bg-white">
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(sectionIndex, questionIndex, optionIndex, e.target.value)}
                  className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                  placeholder={`Option ${optionIndex + 1}`}
                  disabled={question.question_type === 'rating' || question.question_type === 'yes_no'}
                />
                
                {(question.question_type !== 'rating' && question.question_type !== 'yes_no') && (
                  <button
                    type="button"
                    onClick={() => removeOption(sectionIndex, questionIndex, optionIndex)}
                    className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    title="Remove option"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Section Navigation Setting */}
              <div className="pl-2">
                <div className="flex items-center space-x-2 mb-2">
                  {/* <ArrowRightIcon className="h-4 w-4 text-blue-400" /> */}
                  {/* <label className="text-sm font-medium text-blue-700">
                    Navigate to section when this option is selected:
                  </label> */}
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={optionLinks[optionIndex]?.next_section || ''}
                    onChange={(e) => updateOptionNavigation(sectionIndex, questionIndex, optionIndex, e.target.value || null)}
                    className="block w-full border border-blue-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                  >
                    <option value="">Continue to next section (default)</option>
                    {hasAvailableSections ? (
                      availableSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No sections available</option>
                    )}
                  </select>
                  
                  {optionLinks[optionIndex]?.next_section && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      ✓ {getSectionTitleById(optionLinks[optionIndex].next_section!)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {(question.question_type !== 'rating' && question.question_type !== 'yes_no') && (
          <button
            type="button"
            onClick={() => addOption(sectionIndex, questionIndex)}
            className="mt-3 inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add option
          </button>
        )}
      </div>
    );
  };

  // VALIDATION
  const isQuestionComplete = (question: CreateQuestionData): { isComplete: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];

    if (!question.text.trim()) {
      missingFields.push('Question text');
    }

    if (['radio', 'checkbox', 'dropdown', 'yes_no', 'rating'].includes(question.question_type)) {
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


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  console.log('🎯 DEBUG: Checking dropdown questions before submission');
  
  // Debug: Check all dropdown questions
  formData.sections.forEach((section, sectionIndex) => {
    section.questions.forEach((question, questionIndex) => {
      if (question.question_type === 'dropdown') {
        console.log(`📊 Dropdown Question in Section ${sectionIndex + 1}:`, {
          questionText: question.text,
          options: question.options,
          option_links: getOptionLinks(question),
          enable_option_navigation: getEnableOptionNavigation(question)
        });
      }
    });
  });

  // Check if any section title is empty
  const emptySectionTitles = formData.sections.filter(section => !section.title.trim());
  if (emptySectionTitles.length > 0) {
    alert('Please fill in all section titles before submitting the form.');
    return;
  }

  if (!formData.title.trim()) {
    alert('Please enter a form title');
    return;
  }

  try {
    setLoading(true);
    
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
        next_section_on_submit: section.next_section_on_submit,
        questions: section.questions.map(question => {
          // Special handling for dropdown questions
          const questionData: any = {
            text: question.text.trim(),
            question_type: question.question_type,
            is_required: question.is_required,
            order: question.order,
            options: question.options || [],
            enable_option_navigation: getEnableOptionNavigation(question)
          };
          
          // Only include option_links if enable_option_navigation is true
          if (getEnableOptionNavigation(question)) {
            questionData.option_links = getOptionLinks(question).map(link => ({
              text: link.text,
              next_section: link.next_section
            }));
          } else {
            questionData.option_links = [];
          }
          
          console.log(`✅ Processed question: ${question.text}`, questionData);
          return questionData;
        })
      }))
    };

    console.log('📤 FINAL DATA BEING SENT TO API:');
    console.log(JSON.stringify(backendFormData, null, 2));

    const createdForm = await formsAPI.createForm(backendFormData);
    alert(`Form "${createdForm.title}" created successfully!`);
    navigate('/admin/forms');
  } catch (error: any) {
    console.error('❌ FAILED TO CREATE FORM:');
    console.error('Error details:', error);
    
    if (error.response?.data) {
      console.error('🔍 SERVER VALIDATION ERRORS:', error.response.data);
      
      // Show specific error message
      if (error.response.data.sections) {
        const sectionErrors = error.response.data.sections;
        sectionErrors.forEach((error: any, index: number) => {
          if (error.questions) {
            error.questions.forEach((qError: any, qIndex: number) => {
              console.error(`Section ${index + 1}, Question ${qIndex + 1} errors:`, qError);
            });
          }
        });
      }
      
      alert(`Validation error: ${JSON.stringify(error.response.data)}`);
    } else {
      alert('Failed to create form. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
    
  //   if (!formData.title.trim()) {
  //     alert('Please enter a form title');
  //     return;
  //   }

  //   const hasQuestions = formData.sections.some(section => section.questions.length > 0);
  //   if (!hasQuestions) {
  //     alert('Please add at least one question');
  //     return;
  //   }

  //   try {
  //     setLoading(true);
      
  //     const backendFormData = {
  //       title: formData.title.trim(),
  //       description: formData.description.trim(),
  //       form_type: formData.form_type,
  //       is_active: formData.is_active,
  //       expires_at: formData.expires_at,
  //       sections: formData.sections.map(section => ({
  //         title: section.title.trim(),
  //         description: section.description.trim(),
  //         order: section.order,
  //         next_section_on_submit: section.next_section_on_submit,
  //         questions: section.questions.map(question => ({
  //           text: question.text.trim(),
  //           question_type: question.question_type,
  //           is_required: question.is_required,
  //           order: question.order,
  //           options: question.options || [],
  //           option_links: getOptionLinks(question).map(link => ({
  //             text: link.text,
  //             next_section: link.next_section
  //           })),
  //           enable_option_navigation: getEnableOptionNavigation(question)
  //         }))
  //       }))
  //     };

  //     const createdForm = await formsAPI.createForm(backendFormData);
  //     alert(`Form "${createdForm.title}" created successfully!`);
  //     navigate('/admin/forms');
  //   } catch (error: any) {
  //     console.error('Failed to create form:', error);
  //     alert('Failed to create form. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Enhanced preview mode rendering
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
              
              {/* Section Navigation in Preview */}
              {section.next_section_on_submit && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <ArrowRightIcon className="h-4 w-4" />
                    <span>
                      After submitting this section, will continue to: <strong>{getSectionTitleById(section.next_section_on_submit!)}</strong>
                    </span>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {section.questions.map((question: CreateQuestionData, questionIndex: number) => {
                  const optionLinks = getOptionLinks(question);
                  const enableOptionNavigation = getEnableOptionNavigation(question);
                  
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-600"
                            placeholder="Your answer"
                          />
                        )}
                        
                        {question.question_type === 'textarea' && (
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-600 resize-none"
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
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-gray-700">{option}</span>
                                {enableOptionNavigation && optionLinks[optionIndex]?.next_section && (
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
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-gray-700">{option}</span>
                                {enableOptionNavigation && optionLinks[optionIndex]?.next_section && (
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
                          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-600">
                            <option value="">Select an option</option>
                            {(question.options || []).map((option: string, optionIndex: number) => (
                              <option key={optionIndex} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {question.question_type === 'email' && (
                          <input
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-600"
                            placeholder="your@email.com"
                          />
                        )}
                        
                        {question.question_type === 'phone' && (
                          <input
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-600"
                            placeholder="Your phone number"
                          />
                        )}
                        
                        {question.question_type === 'rating' && (
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                className="w-10 h-10 rounded-full border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-600"
                              >
                                {star}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {question.question_type === 'yes_no' && (
                          <div className="flex space-x-4">
                            <label className="flex items-center space-x-2">
                              <input type="radio" name={`yes-no-${sectionIndex}-${questionIndex}`} className="text-purple-600" />
                              <span>Yes</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input type="radio" name={`yes-no-${sectionIndex}-${questionIndex}`} className="text-purple-600" />
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
    <>
      <div className="min-h-screen bg-[#f5f3ff] text-gray-800">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-lg">
              F
            </div>
            <h1 className="text-xl font-semibold text-gray-800">FormCraft</h1>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsPreview(!isPreview)}
              className="flex items-center gap-2 text-gray-700 border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-100"
            >
              <EyeIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Preview</span>
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 text-white rounded-full px-4 py-2 hover:bg-purple-700 shadow-sm disabled:opacity-50"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              <span className="text-sm font-medium">
                {loading ? 'Creating...' : 'Create Form'}
              </span>
            </button>
          </div>
        </header>

        {/* Form Wrapper */}
        <main className="max-w-5xl mx-auto mt-8 flex gap-6 px-4">
          {/* Left Side: Form Content */}
          <div className="flex-1 space-y-6">
            {/* Form Title Section */}
            <div className="bg-white shadow-md rounded-2xl p-6 border-t-8 border-purple-600">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-2xl font-semibold text-gray-800 border-b border-transparent focus:border-purple-600 focus:outline-none mb-3"
                placeholder="Untitled Form"
              />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full text-sm text-gray-600 border-b border-transparent focus:border-purple-600 focus:outline-none resize-none"
                placeholder="Form description"
                rows={2}
              />
            </div>

            {/* Form Type Selection */}
            <div className="bg-white shadow-md rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Form Type</h3>
              <select
                value={formData.form_type}
                onChange={(e) => handleFormTypeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="empty">Empty Form (Start from scratch)</option>
                <option value="general">General Feedback ({getBuiltInQuestionCount('general')} built-in questions)</option>
                <option value="customer_satisfaction">Customer Satisfaction ({getBuiltInQuestionCount('customer_satisfaction')} built-in questions)</option>
                <option value="employee_feedback">Employee Feedback ({getBuiltInQuestionCount('employee_feedback')} built-in questions)</option>
                <option value="product_feedback">Product Feedback ({getBuiltInQuestionCount('product_feedback')} built-in questions)</option>
                <option value="service_feedback">Service Feedback ({getBuiltInQuestionCount('service_feedback')} built-in questions)</option>
              </select>
            </div>

            {/* Draggable Sections */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={formData.sections.map(section => section.id)}
                strategy={verticalListSortingStrategy}
              >
                {formData.sections.map((section: Section, sectionIndex: number) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    sectionIndex={sectionIndex}
                    formData={formData}
                    setFormData={setFormData}
                    updateSectionField={updateSectionField}
                    removeSection={removeSection}
                    addQuestion={addQuestion}
                    updateQuestion={updateQuestion}
                    removeQuestion={removeQuestion}
                    moveQuestion={moveQuestion}
                    duplicateQuestion={duplicateQuestion}
                    renderQuestionOptions={renderQuestionOptions}
                    getAvailableSectionsForNavigation={getAvailableSectionsForNavigation}
                    getSectionTitleById={getSectionTitleById}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Add Section Button */}
            <button
              onClick={addSection}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 shadow-md mx-auto"
            >
              <PlusIcon className="w-5 h-5" />
              Add Section
            </button>
          </div>

          {/* Right Sidebar */}
          <aside className="w-80 bg-white shadow-md rounded-2xl p-6 border border-gray-200 h-fit">
            <h3 className="font-semibold text-gray-800 mb-4">Form Settings</h3>
            
            {/* Active Status */}
            <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Form Status</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Expiration Date */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date
              </label>
              <SmallDatePicker
                id="expires_at"
                value={formData.expires_at}
                onChange={(value) => setFormData({ ...formData, expires_at: value })}
                placeholder="No expiration"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800 mb-2">Quick Actions</h4>
              <button
                type="button"
                onClick={() => setIsPreview(!isPreview)}
                className="w-full flex items-center gap-2 text-gray-700 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 text-sm font-medium"
              >
                <EyeIcon className="w-4 h-4" />
                {isPreview ? 'Exit Preview' : 'Preview Form'}
              </button>
              
              {formData.form_type !== 'empty' && (
                <button
                  type="button"
                  onClick={() => {
                    const builtInQuestions = loadBuiltInQuestions(formData.form_type);
                    const updatedSections = formData.sections.map((section, index) => 
                      index === 0 ? { ...section, questions: builtInQuestions } : section
                    );
                    setFormData({ ...formData, sections: updatedSections });
                  }}
                  className="w-full flex items-center gap-2 text-purple-600 border border-purple-200 rounded-lg px-4 py-3 hover:bg-purple-50 text-sm font-medium"
                >
                  <RectangleGroupIcon className="w-4 h-4" />
                  Load Built-in Questions
                </button>
              )}
            </div>

            {/* Form Stats */}
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-800 mb-2">Form Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-600">Sections:</span>
                  <span className="font-medium text-purple-800">{formData.sections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Total Questions:</span>
                  <span className="font-medium text-purple-800">
                    {formData.sections.reduce((total, section) => total + section.questions.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Form Type:</span>
                  <span className="font-medium text-purple-800 capitalize">
                    {formData.form_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </main>

        {/* Preview Modal */}
        {isPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {renderPreview()}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateForm;