import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api, { publicFeedbackAPI } from '../services/api';
import { FeedbackForm, SubmitFeedbackData, Question } from '../types';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

// Define the missing interfaces
interface OptionLink {
  text: string;
  next_section: string | null;
}

interface ExtendedQuestion extends Question {
  option_links?: OptionLink[];
  enable_option_navigation?: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: ExtendedQuestion[];
  next_section_on_submit?: string | null;
}

interface ExtendedFeedbackForm extends Omit<FeedbackForm, 'sections'> {
  sections?: Section[];
}

interface NavigationState {
  currentSectionIndex: number;
  visitedSections: Set<number>;
  sectionHistory: number[];
  nextSectionFromAnswers: number | null;
}

const PublicFeedbackForm: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<ExtendedFeedbackForm | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  
  // Enhanced navigation state
  const [navigation, setNavigation] = useState<NavigationState>({
    currentSectionIndex: 0,
    visitedSections: new Set([0]),
    sectionHistory: [0],
    nextSectionFromAnswers: null
  });

  // Debug answers state
  useEffect(() => {
    console.log('📊 Current answers state:', answers);
  }, [answers]);

  // FIXED: Enhanced form loading with proper data structure
  const loadForm = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      console.log(`🔄 Loading public form with ID: ${formId}`);
      
      const response = await api.get(`/api/public/feedback/${formId}/`);
      console.log('📦 RAW API RESPONSE:', response.data);
      
      const formData = response.data;
      
      // CRITICAL FIX: The backend returns questions in a separate array
      // but we need them nested within sections
      if (formData.questions && formData.sections) {
        console.log('🔧 Processing form data structure...');
        
        // Create a map of questions by ID for easy lookup
        const questionsMap = new Map();
        formData.questions.forEach((question: any) => {
          questionsMap.set(question.id, question);
        });
        
        // Rebuild sections with their proper questions
        formData.sections = formData.sections.map((section: any) => {
          // Find questions that belong to this section
          const sectionQuestions = formData.questions.filter((q: any) => 
            q.section_id === section.id
          );
          
          return {
            ...section,
            questions: sectionQuestions.map((q: any) => ({
              ...q,
              // Ensure option_links is always an array
              option_links: q.option_links || [],
              // Ensure enable_option_navigation has a default
              enable_option_navigation: q.enable_option_navigation || false
            }))
          };
        });
        
        // Remove the top-level questions array to avoid confusion
        delete formData.questions;
      }
      
      console.log('🔍 Processed form data:', formData);
      console.log('🔍 Section questions after processing:', formData.sections?.[0]?.questions);
      
      setForm(formData as ExtendedFeedbackForm);
      
      // Reset navigation state when form loads
      setNavigation({
        currentSectionIndex: 0,
        visitedSections: new Set([0]),
        sectionHistory: [0],
        nextSectionFromAnswers: null
      });
      
      // Reset answers when form loads
      setAnswers({});
      
    } catch (error: any) {
      console.error('❌ Error loading form:', error);
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

  // FIXED: Proper answer state management
  const handleAnswerChange = (questionId: number, value: any): void => {
    console.log(`🔄 handleAnswerChange called:`, {
      questionId,
      value,
      currentAnswers: answers
    });

    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: value
      };
      console.log('✅ Answers after update:', newAnswers);
      return newAnswers;
    });

    // Clear next section navigation when answer changes
    setNavigation(prev => ({
      ...prev,
      nextSectionFromAnswers: null
    }));
  };

  // Phone number validation function
  const validatePhoneNumber = (phone: string): boolean => {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10 && /^\d+$/.test(digitsOnly);
  };

  const handlePhoneChange = (questionId: number, value: string): void => {
    const sanitizedValue = value.replace(/[^\d\s\-\(\)\+]/g, '');
    console.log(`📞 Phone change:`, { questionId, value, sanitizedValue });
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: sanitizedValue
    }));
  };

  // Get current section
  const getCurrentSection = (): Section | undefined => {
    return form?.sections?.[navigation.currentSectionIndex];
  };

  // Get option links for a question
  const getOptionLinks = (question: ExtendedQuestion): OptionLink[] => {
    return question.option_links || [];
  };

  // FIXED: Calculate option-based navigation
  const calculateNextSectionFromAnswers = (): number | null => {
    const currentSection = getCurrentSection();
    if (!currentSection || !form?.sections) return null;

    let nextSectionIndex: number | null = null;

    // Check all questions in current section for navigation rules
    for (const question of currentSection.questions || []) {
      const optionLinks = getOptionLinks(question);
      const currentAnswer = answers[question.id];

      if (currentAnswer && optionLinks.length > 0 && question.enable_option_navigation) {
        console.log(`🔍 Checking navigation for question ${question.id}:`, {
          answer: currentAnswer,
          optionLinks,
          options: question.options
        });

        if (question.question_type === 'radio' || question.question_type === 'dropdown' || question.question_type === 'yes_no') {
          // For single choice questions
          const selectedOptionIndex = question.options?.indexOf(currentAnswer);
          if (selectedOptionIndex !== undefined && selectedOptionIndex !== -1 && selectedOptionIndex < optionLinks.length) {
            const nextSectionId = optionLinks[selectedOptionIndex].next_section;
            if (nextSectionId) {
              const targetSectionIndex = form.sections.findIndex(s => s.id === nextSectionId);
              if (targetSectionIndex !== -1) {
                console.log(`📍 Option-based navigation: "${currentAnswer}" → Section ${targetSectionIndex + 1}`);
                nextSectionIndex = targetSectionIndex;
                break;
              }
            }
          }
        } else if (question.question_type === 'checkbox') {
          // For multiple choice questions - use the first matching navigation
          const selectedOptions = Array.isArray(currentAnswer) ? currentAnswer : [currentAnswer];
          for (const selectedOption of selectedOptions) {
            const selectedOptionIndex = question.options?.indexOf(selectedOption);
            if (selectedOptionIndex !== undefined && selectedOptionIndex !== -1 && selectedOptionIndex < optionLinks.length) {
              const nextSectionId = optionLinks[selectedOptionIndex].next_section;
              if (nextSectionId) {
                const targetSectionIndex = form.sections.findIndex(s => s.id === nextSectionId);
                if (targetSectionIndex !== -1) {
                  console.log(`📍 Option-based navigation: "${selectedOption}" → Section ${targetSectionIndex + 1}`);
                  nextSectionIndex = targetSectionIndex;
                  break;
                }
              }
            }
          }
          if (nextSectionIndex !== null) break;
        }
      }
    }

    return nextSectionIndex;
  };

  // FIXED: Calculate section-based navigation
  const calculateNextSectionFromSectionConfig = (): number | null => {
    const currentSection = getCurrentSection();
    if (!currentSection || !form?.sections) return null;

    // Check if current section has a configured next section
    if (currentSection.next_section_on_submit) {
      const nextSectionId = currentSection.next_section_on_submit;
      const targetSectionIndex = form.sections.findIndex(s => s.id === nextSectionId);
      if (targetSectionIndex !== -1) {
        console.log(`📍 Section-based navigation: "${currentSection.title}" → Section ${targetSectionIndex + 1}`);
        return targetSectionIndex;
      }
    }

    return null;
  };

  // FIXED: Get the final next section considering all navigation rules
  const getFinalNextSection = (): number | null => {
    const totalSections = form?.sections?.length || 0;
    
    // Priority 1: Option-based navigation (highest priority)
    const optionBasedNextSection = calculateNextSectionFromAnswers();
    if (optionBasedNextSection !== null && optionBasedNextSection < totalSections) {
      console.log(`📍 Option-based navigation to section ${optionBasedNextSection + 1}`);
      return optionBasedNextSection;
    }

    // Priority 2: Section-based navigation
    const sectionBasedNextSection = calculateNextSectionFromSectionConfig();
    if (sectionBasedNextSection !== null && sectionBasedNextSection < totalSections) {
      console.log(`📍 Section-based navigation to section ${sectionBasedNextSection + 1}`);
      return sectionBasedNextSection;
    }

    // Priority 3: Sequential navigation (fallback)
    const sequentialNextSection = navigation.currentSectionIndex + 1;
    if (sequentialNextSection < totalSections) {
      console.log(`📍 Sequential navigation to section ${sequentialNextSection + 1}`);
      return sequentialNextSection;
    }

    console.log('📍 End of form reached');
    return null;
  };

  // FIXED: Enhanced goToNextSection function
  const goToNextSection = (): void => {
    if (!form?.sections) return;

    // Calculate next section based on all navigation rules
    const nextSectionIndex = getFinalNextSection();
    
    // Validate next section exists
    if (nextSectionIndex === null) {
      console.log('📍 End of form reached - should submit');
      return;
    }

    if (nextSectionIndex >= form.sections.length) {
      console.log('❌ Invalid next section index:', nextSectionIndex);
      return;
    }

    console.log(`🔄 Navigating from section ${navigation.currentSectionIndex + 1} to ${nextSectionIndex + 1}`);

    setNavigation(prev => ({
      currentSectionIndex: nextSectionIndex,
      visitedSections: new Set([...prev.visitedSections, nextSectionIndex]),
      sectionHistory: [...prev.sectionHistory, nextSectionIndex],
      nextSectionFromAnswers: null
    }));
  };

  // Navigate to previous section
  const goToPreviousSection = (): void => {
    if (navigation.sectionHistory.length > 1) {
      const newHistory = [...navigation.sectionHistory];
      newHistory.pop(); // Remove current
      const previousSectionIndex = newHistory[newHistory.length - 1];
      
      setNavigation(prev => ({
        ...prev,
        currentSectionIndex: previousSectionIndex,
        sectionHistory: newHistory,
        nextSectionFromAnswers: null
      }));
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
  // const isFormComplete = (): boolean => {
  //   if (!form?.sections) return false;

  //   // Check ALL sections, not just visited ones
  //   for (const section of form.sections) {
  //     for (const question of section.questions || []) {
  //       if (question.is_required) {
  //         const answer = answers[question.id];
  //         if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
  //           console.log(`❌ Missing required question: Q${question.id} - "${question.text}"`);
  //           return false;
  //         }
          
  //         // Validate phone numbers
  //         if (question.question_type === 'phone' && answer) {
  //           if (!validatePhoneNumber(answer)) {
  //             console.log(`❌ Invalid phone number: Q${question.id} - "${question.text}"`);
  //             return false;
  //           }
  //         }
  //       }
  //     }
  //   }
  //   return true;
  // };

  // FIXED: Only check visited sections for completion
// const isFormComplete = (): boolean => {
//   if (!form?.sections) return false;

//   // Only check visited sections, not all sections
//   for (const sectionIndex of Array.from(navigation.visitedSections)) {
//     const section = form.sections[sectionIndex];
//     if (!section) continue;
    
//     for (const question of section.questions || []) {
//       if (question.is_required) {
//         const answer = answers[question.id];
//         if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
//           console.log(`❌ Missing required question in visited section ${sectionIndex + 1}: Q${question.id} - "${question.text}"`);
//           return false;
//         }
        
//         // Validate phone numbers
//         if (question.question_type === 'phone' && answer) {
//           if (!validatePhoneNumber(answer)) {
//             console.log(`❌ Invalid phone number in visited section ${sectionIndex + 1}: Q${question.id} - "${question.text}"`);
//             return false;
//           }
//         }
//       }
//     }
//   }
  
//   console.log(`✅ All required questions in visited sections are answered`);
//   return true;
// };

// FIXED: Only check visited sections for completion
const isFormComplete = (): boolean => {
  if (!form?.sections) return false;

  console.log('🔍 Checking form completion for visited sections only:');
  console.log('Visited sections:', Array.from(navigation.visitedSections).map(i => i + 1));

  // Only check visited sections, not all sections
  for (const sectionIndex of Array.from(navigation.visitedSections)) {
    const section = form.sections[sectionIndex];
    if (!section) {
      console.log(`❌ Section ${sectionIndex + 1} not found`);
      continue;
    }
    
    console.log(`\n📋 Checking section ${sectionIndex + 1}: "${section.title}"`);
    
    for (const question of section.questions || []) {
      if (question.is_required) {
        const answer = answers[question.id];
        const isAnswered = answer !== undefined && 
                          answer !== '' && 
                          !(Array.isArray(answer) && answer.length === 0);
        
        console.log(`   ${isAnswered ? '✅' : '❌'} Q${question.id}: "${question.text}" - Answer:`, answer);
        
        if (!isAnswered) {
          console.log(`🚨 Missing required question in section ${sectionIndex + 1}`);
          return false;
        }
        
        // Validate phone numbers
        if (question.question_type === 'phone' && answer) {
          if (!validatePhoneNumber(answer)) {
            console.log(`🚨 Invalid phone number in section ${sectionIndex + 1}`);
            return false;
          }
        }
      }
    }
  }
  
  console.log('✅ All required questions in visited sections are answered correctly');
  return true;
};

  // Get the display text for the next section button
  const getNextButtonText = (): string => {
    const nextSectionIndex = getFinalNextSection();
    const isLastSection = nextSectionIndex === null;
    
    if (isLastSection) {
      return 'Submit Feedback';
    }

    const targetSection = form?.sections?.[nextSectionIndex];
    if (targetSection) {
      // Check what triggered the navigation
      const optionBasedNext = calculateNextSectionFromAnswers();
      const sectionBasedNext = calculateNextSectionFromSectionConfig();
      
      if (optionBasedNext !== null) {
        return `Continue to ${targetSection.title || `Section ${nextSectionIndex + 1}`}`;
      } else if (sectionBasedNext !== null) {
        return `Continue to ${targetSection.title || `Section ${nextSectionIndex + 1}`}`;
      } else {
        return 'Next Section';
      }
    }
    
    return 'Next Section';
  };

  // Get navigation hints for the current section
  const getNavigationHints = (): string[] => {
    const hints: string[] = [];
    const currentSection = getCurrentSection();
    
    if (!currentSection) return hints;

    // Check for section-level navigation
    if (currentSection.next_section_on_submit) {
      const targetSectionIndex = form?.sections?.findIndex(s => s.id === currentSection.next_section_on_submit);
      if (targetSectionIndex !== undefined && targetSectionIndex !== -1) {
        const targetSection = form?.sections?.[targetSectionIndex];
        hints.push(`This section will continue to: ${targetSection?.title || `Section ${targetSectionIndex + 1}`}`);
      }
    }

    // Check for option-level navigation
    for (const question of currentSection.questions || []) {
      const optionLinks = getOptionLinks(question);
      optionLinks.forEach((link, index) => {
        if (link.next_section) {
          const targetSectionIndex = form?.sections?.findIndex(s => s.id === link.next_section);
          if (targetSectionIndex !== undefined && targetSectionIndex !== -1) {
            const targetSection = form?.sections?.[targetSectionIndex];
            const optionText = question.options?.[index] || `Option ${index + 1}`;
            hints.push(`Selecting "${optionText}" will jump to: ${targetSection?.title || `Section ${targetSectionIndex + 1}`}`);
          }
        }
      });
    }

    return hints;
  };

  // Enhanced debugging for navigation
  const debugNavigation = () => {
    const currentSection = getCurrentSection();
    console.log('\n🧭 NAVIGATION DEBUG:');
    console.log('Current section:', navigation.currentSectionIndex + 1, `"${currentSection?.title}"`);
    console.log('Visited sections:', Array.from(navigation.visitedSections).map(i => i + 1));
    
    const optionBasedNext = calculateNextSectionFromAnswers();
    const sectionBasedNext = calculateNextSectionFromSectionConfig();
    const sequentialNext = navigation.currentSectionIndex + 1;
    const finalNext = getFinalNextSection();
    
    console.log('Navigation calculations:');
    console.log('  - Option-based next:', optionBasedNext !== null ? optionBasedNext + 1 : 'None');
    console.log('  - Section-based next:', sectionBasedNext !== null ? sectionBasedNext + 1 : 'None');
    console.log('  - Sequential next:', sequentialNext + 1);
    console.log('  - Final next:', finalNext !== null ? finalNext + 1 : 'Submit form');
    
    // Debug current section's navigation rules
    if (currentSection) {
      console.log('Current section navigation rules:');
      console.log('  - next_section_on_submit:', currentSection.next_section_on_submit);
      
      currentSection.questions?.forEach((q, qIndex) => {
        if (q.enable_option_navigation && q.option_links?.length) {
          console.log(`  - Question "${q.text}":`);
          q.option_links.forEach((link, lIndex) => {
            console.log(`    Option "${q.options?.[lIndex]}": ${link.next_section ? 'Jumps to section' : 'No jump'}`);
          });
        }
      });
    }
  };

  // Call debugNavigation when navigation changes
  useEffect(() => {
    if (form) {
      debugNavigation();
    }
  }, [navigation.currentSectionIndex, form, answers]);

  const debugAllFormQuestions = () => {
    if (!form) return;
    
    console.log('🔍 DEBUG: ALL QUESTIONS IN FORM:');
    let totalRequired = 0;
    let answeredRequired = 0;
    
    form.sections?.forEach((section, sectionIndex) => {
      console.log(`📂 Section ${sectionIndex + 1}: "${section.title}"`);
      section.questions?.forEach(question => {
        const isRequired = question.is_required;
        const isAnswered = answers[question.id] !== undefined && 
                          answers[question.id] !== '' && 
                          !(Array.isArray(answers[question.id]) && answers[question.id].length === 0);
        
        if (isRequired) {
          totalRequired++;
          if (isAnswered) answeredRequired++;
        }
        
        const status = isRequired ? (isAnswered ? '✅' : '❌') : '⚪';
        console.log(`   ${status} Q${question.id}: "${question.text}"`);
        console.log(`      - Required: ${isRequired}`);
        console.log(`      - Answered: ${isAnswered}`);
        console.log(`      - Answer: ${answers[question.id]}`);
      });
    });
    
    console.log(`📊 REQUIRED QUESTIONS SUMMARY: ${answeredRequired}/${totalRequired} answered`);
    console.log(`📍 Visited sections:`, Array.from(navigation.visitedSections));
    console.log(`📦 Questions being submitted:`, Object.keys(answers).map(id => parseInt(id)));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    // Debug: Check all required questions across all visited sections
    console.log('🔍 DEBUG: Checking required questions across all visited sections:');
    const allRequiredQuestions: any[] = [];
    const unansweredRequiredQuestions: any[] = [];
    
    Array.from(navigation.visitedSections).forEach(sectionIndex => {
      const section = form?.sections?.[sectionIndex];
      if (section) {
        console.log(`📋 Section ${sectionIndex + 1}: "${section.title}"`);
        
        section.questions.forEach(question => {
          if (question.is_required) {
            const answer = answers[question.id];
            const isAnswered = answer !== undefined && 
                              answer !== '' && 
                              !(Array.isArray(answer) && answer.length === 0);
            
            const questionInfo = {
              section: section.title,
              questionId: question.id,
              questionText: question.text,
              questionType: question.question_type,
              isAnswered: isAnswered,
              answer: answer,
              answerType: typeof answer
            };
            
            allRequiredQuestions.push(questionInfo);
            
            if (!isAnswered) {
              unansweredRequiredQuestions.push(questionInfo);
              console.log(`❌ MISSING: Q${question.id} - "${question.text}"`);
            } else {
              console.log(`✅ ANSWERED: Q${question.id} - "${question.text}":`, answer);
            }
          }
        });
      }
    });

    // Call the debug function
    debugAllFormQuestions();
    
    console.log('📊 SUMMARY:');
    console.log(`- Total required questions: ${allRequiredQuestions.length}`);
    console.log(`- Answered: ${allRequiredQuestions.filter(q => q.isAnswered).length}`);
    console.log(`- Missing: ${unansweredRequiredQuestions.length}`);
    console.log('📋 All required questions status:', allRequiredQuestions);
    
    // Check if form is complete using the same logic as isFormComplete()
    let isComplete = true;
    Array.from(navigation.visitedSections).forEach(sectionIndex => {
      const section = form?.sections?.[sectionIndex];
      if (section) {
        section.questions.forEach(question => {
          if (question.is_required) {
            const answer = answers[question.id];
            if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
              isComplete = false;
              console.log(`🚨 Validation failed for Q${question.id}: "${question.text}"`);
            }
            
            // Validate phone numbers
            if (question.question_type === 'phone' && answer && !validatePhoneNumber(answer)) {
              isComplete = false;
              console.log(`🚨 Phone validation failed for Q${question.id}: "${question.text}"`);
            }
          }
        });
      }
    });
    
    console.log(`🎯 isFormComplete() result: ${isComplete}`);
    
    if (!isComplete) {
      if (unansweredRequiredQuestions.length > 0) {
        const missingTexts = unansweredRequiredQuestions.map(q => `"${q.questionText}"`).join(', ');
        alert(`Please answer these required questions: ${missingTexts}`);
      } else {
        alert('Please complete all required fields correctly.');
      }
      return;
    }

    try {
      setSubmitting(true);
      
      // Debug: Show exactly what will be submitted
      console.log('🔄 Preparing answers for submission...');
      const submittedQuestionIds: number[] = [];
      
      // Prepare answers in the correct format
      const formattedAnswers = Object.entries(answers).map(([questionId, value]) => {
        const questionIdNum = parseInt(questionId);
        submittedQuestionIds.push(questionIdNum);
        
        // Find the question to get its type
        const question = form?.sections?.flatMap(s => s.questions || [])
          .find(q => q.id === questionIdNum);
        
        // Handle different answer formats based on question type
        let answerText = '';
        let answerValue: any = {};

        if (Array.isArray(value)) {
          // For checkbox questions
          answerText = value.join(', ');
          answerValue = { values: value };
        } else if (typeof value === 'number') {
          // For rating questions
          answerText = value.toString();
          answerValue = { value: value };
        } else if (typeof value === 'string') {
          // For text, email, phone, etc.
          answerText = value;
          answerValue = { value: value };
        }

        const formattedAnswer = {
          question: questionIdNum,
          answer_text: answerText,
          answer_value: answerValue
        };

        console.log(`📝 Formatted answer for Q${questionIdNum} ("${question?.text}"):`, formattedAnswer);
        return formattedAnswer;
      });

      // Debug: Check which required questions are being submitted
      console.log('🔍 Checking submission coverage:');
      allRequiredQuestions.forEach(reqQ => {
        const isIncluded = submittedQuestionIds.includes(reqQ.questionId);
        console.log(`- Q${reqQ.questionId} "${reqQ.questionText}": ${isIncluded ? '✅ INCLUDED' : '❌ MISSING'}`);
      });

      const submitData = {
        form: formId!,
        answers: formattedAnswers
      };

      console.log('📤 Final submit data:', JSON.stringify(submitData, null, 2));
      console.log('📤 Sending to URL:', `/api/public/feedback/${formId}/`);
      console.log('📦 Questions being submitted:', submittedQuestionIds);

      await publicFeedbackAPI.submitFeedback(formId!, submitData);
      setSuccess(true);
    } catch (error: any) {
      console.error('❌ Failed to submit feedback:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      
      // Enhanced error handling with better missing questions display
      const serverError = error.response?.data;
      if (serverError) {
        console.log('🔍 Server error details:', serverError);
        
        if (serverError.missing_questions) {
          // Log the exact missing question IDs for debugging
          console.log('🔍 Exact missing_questions array:', serverError.missing_questions);
          
          // Try to get question texts for better error message
          const missingQuestionsWithText = serverError.missing_questions.map((mq: any) => {
            const questionId = mq.question_id || mq.id || mq;
            const question = form?.sections?.flatMap(s => s.questions || [])
              .find(q => q.id === questionId);
            return question ? `"${question.text}" (ID: ${questionId})` : `Question ID: ${questionId}`;
          });
          
          setError(`Please answer these required questions: ${missingQuestionsWithText.join(', ')}`);
        } else if (serverError.invalid_questions) {
          setError(`Invalid questions submitted: ${JSON.stringify(serverError.invalid_questions)}`);
        } else if (serverError.error) {
          setError(`Server error: ${serverError.error}`);
        } else {
          setError(`Validation error: ${JSON.stringify(serverError)}`);
        }
      } else {
        setError('Failed to submit feedback. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Add this useEffect to debug form structure when it loads
  useEffect(() => {
    if (form) {
      console.log('🏗️ FORM STRUCTURE DEBUG:');
      form.sections?.forEach((section, sectionIndex) => {
        console.log(`📂 Section ${sectionIndex + 1}: "${section.title}" (ID: ${section.id})`);
        section.questions?.forEach(question => {
          console.log(`   ❓ Q${question.id}: "${question.text}"`);
          console.log(`      - Required: ${question.is_required}`);
          console.log(`      - Type: ${question.question_type}`);
          console.log(`      - Options: ${question.options?.join(', ') || 'None'}`);
          console.log(`      - Enable Option Navigation: ${question.enable_option_navigation}`);
          console.log(`      - Option Links:`, question.option_links);
        });
      });
      
      // Log all question IDs for reference
      const allQuestionIds = form.sections?.flatMap(s => s.questions?.map(q => q.id) || []) || [];
      console.log('🆔 All question IDs in form:', allQuestionIds);
    }
  }, [form]);

  const renderQuestionInput = (question: ExtendedQuestion): React.ReactElement => {
    // Validate question ID - this is critical!
    if (!question.id || typeof question.id !== 'number') {
      console.error('❌ Question missing valid numeric ID:', question);
      return <div className="text-red-500">Error: Question missing valid ID</div>;
    }

    const value = answers[question.id] || ''; // This should now be unique per question
    const optionLinks = getOptionLinks(question);

    console.log(`🎯 Rendering question:`, {
      questionId: question.id,
      questionText: question.text,
      currentValue: value,
      questionType: question.question_type
    });

    const baseInputProps = {
      required: question.is_required,
      'data-question-id': question.id,
      'data-question-type': question.question_type
    };

    switch (question.question_type) {
      case 'text':
      case 'email':
        return (
          <input
            {...baseInputProps}
            type={question.question_type}
            value={value}
            onChange={(e) => {
              console.log(`📝 Text input change:`, {
                questionId: question.id,
                newValue: e.target.value,
                currentAnswers: answers
              });
              handleAnswerChange(question.id, e.target.value);
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm p-3 border"
          />
        );

      case 'textarea':
        return (
          <textarea
            {...baseInputProps}
            value={value}
            onChange={(e) => {
              console.log(`📝 Textarea change:`, {
                questionId: question.id,
                newValue: e.target.value
              });
              handleAnswerChange(question.id, e.target.value);
            }}
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm p-3 border"
          />
        );

      case 'radio':
        return (
          <div className="mt-2 space-y-3">
            {(question.options || []).map((option: string, index: number) => {
              const hasNavigation = optionLinks[index]?.next_section;
              const targetSection = hasNavigation 
                ? form?.sections?.find((s: Section) => s.id === optionLinks[index].next_section)
                : null;
              
              const isChecked = value === option;
              
              console.log(`🔘 Radio option:`, {
                questionId: question.id,
                option,
                isChecked,
                currentValue: value
              });

              return (
                <label key={index} className="flex items-center group cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    {...baseInputProps}
                    type="radio"
                    name={`radio-${question.id}`}
                    value={option}
                    checked={isChecked}
                    onChange={(e) => {
                      console.log(`🔘 Radio selected:`, {
                        questionId: question.id,
                        selectedOption: e.target.value,
                        wasChecked: isChecked,
                        currentAnswers: answers
                      });
                      handleAnswerChange(question.id, e.target.value);
                    }}
                    className="focus:ring-violet-500 h-4 w-4 text-violet-600 border-gray-300"
                  />
                  <span className="ml-3 text-sm text-gray-900">{option}</span>
                  {hasNavigation && targetSection && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800 border border-violet-200">
                      <ArrowRightIcon className="h-3 w-3 mr-1" />
                      Goes to {targetSection.title || `Section ${(form?.sections?.indexOf(targetSection) || 0) + 1}`}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
        return (
          <div className="mt-2 space-y-3">
            {(question.options || []).map((option: string, index: number) => {
              const currentValues = Array.isArray(value) ? value : [];
              const isChecked = currentValues.includes(option);
              
              return (
                <label key={index} className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    {...baseInputProps}
                    type="checkbox"
                    value={option}
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option);
                      
                      console.log(`☑️ Checkbox change:`, {
                        questionId: question.id,
                        option,
                        checked: e.target.checked,
                        newValues
                      });
                      
                      handleAnswerChange(question.id, newValues);
                    }}
                    className="focus:ring-violet-500 h-4 w-4 text-violet-600 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-900">{option}</span>
                </label>
              );
            })}
          </div>
        );

      case 'dropdown':
        return (
          <div>
            <select
              {...baseInputProps}
              value={value}
              onChange={(e) => {
                console.log(`🔽 Dropdown change:`, {
                  questionId: question.id,
                  selectedValue: e.target.value
                });
                handleAnswerChange(question.id, e.target.value);
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm p-3 border bg-white"
            >
              <option value="">Select an option</option>
              {(question.options || []).map((option: string, index: number) => {
                const hasNavigation = optionLinks[index]?.next_section;
                const targetSection = hasNavigation 
                  ? form?.sections?.find((s: Section) => s.id === optionLinks[index].next_section)
                  : null;
                
                return (
                  <option key={index} value={option}>
                    {option} {hasNavigation ? `→ ${targetSection?.title || 'Section'}` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        );

      case 'rating':
        return (
          <div className="mt-2 flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => {
                  console.log(`⭐ Rating selected:`, {
                    questionId: question.id,
                    rating
                  });
                  handleAnswerChange(question.id, rating);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  value === rating
                    ? 'bg-violet-600 text-white border-2 border-violet-700 shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-400'
                }`}
              >
                {rating}
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
                onClick={() => {
                  console.log(`🔟 Rating selected:`, {
                    questionId: question.id,
                    rating
                  });
                  handleAnswerChange(question.id, rating);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  value === rating
                    ? 'bg-violet-600 text-white border-2 border-violet-700 shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-400'
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
            <label className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                {...baseInputProps}
                type="radio"
                name={`yes-no-${question.id}`}
                value="Yes"
                checked={value === 'Yes'}
                onChange={(e) => {
                  console.log(`✅ Yes/No change:`, {
                    questionId: question.id,
                    value: e.target.value
                  });
                  handleAnswerChange(question.id, e.target.value);
                }}
                className="focus:ring-violet-500 h-4 w-4 text-violet-600 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-900">Yes</span>
            </label>
            <label className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                {...baseInputProps}
                type="radio"
                name={`yes-no-${question.id}`}
                value="No"
                checked={value === 'No'}
                onChange={(e) => {
                  console.log(`❌ Yes/No change:`, {
                    questionId: question.id,
                    value: e.target.value
                  });
                  handleAnswerChange(question.id, e.target.value);
                }}
                className="focus:ring-violet-500 h-4 w-4 text-violet-600 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-900">No</span>
            </label>
          </div>
        );

      case 'phone':
        return (
          <div>
            <input
              {...baseInputProps}
              type="tel"
              value={value}
              onChange={(e) => {
                console.log(`📞 Phone input change:`, {
                  questionId: question.id,
                  newValue: e.target.value
                });
                handlePhoneChange(question.id, e.target.value);
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm p-3 border"
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
            {...baseInputProps}
            type="text"
            value={value}
            onChange={(e) => {
              console.log(`📝 Default input change:`, {
                questionId: question.id,
                newValue: e.target.value
              });
              handleAnswerChange(question.id, e.target.value);
            }}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-violet-500 focus:border-violet-500 sm:text-sm p-3 border"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error && !success) {
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
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors"
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
  const nextButtonText = getNextButtonText();
  const navigationHints = getNavigationHints();
  const isLastSection = getFinalNextSection() === null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with Google Forms-like styling */}
        <div className="mb-8">
          <div className="bg-white rounded-t-lg border-t-4 border-t-violet-600 border border-gray-200 p-6 shadow-sm">
            <h1 className="text-2xl font-normal text-gray-900 mb-2">{form.title}</h1>
            {form.description && (
              <p className="text-sm text-gray-600">{form.description}</p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-red-500">* Indicates required question</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit}>
          {/* Current Section */}
          {currentSection && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
              {/* Section Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    {currentSection.title && (
                      <h2 className="text-lg font-medium text-gray-900">
                        {currentSection.title}
                      </h2>
                    )}
                    {currentSection.description && (
                      <p className="text-sm text-gray-600 mt-1">{currentSection.description}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                    Section {navigation.currentSectionIndex + 1} of {form.sections?.length || 0}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="px-6 py-3 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(((navigation.visitedSections.size) / (form.sections?.length || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((navigation.visitedSections.size) / (form.sections?.length || 1)) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Navigation Hints */}
              {navigationHints.length > 0 && (
                <div className="px-6 py-3 bg-violet-50 border-b border-violet-100">
                  <div className="flex items-start">
                    <svg className="h-4 w-4 text-violet-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-violet-800 mb-1">Navigation Rules Active</p>
                      <ul className="text-violet-700 space-y-1">
                        {navigationHints.map((hint: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <ArrowRightIcon className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                            {hint}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Questions */}
              <div className="p-6 space-y-8">
                {(currentSection.questions || []).map((question: ExtendedQuestion, index: number) => (
                  <div key={question.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                    <label className="block text-sm font-normal text-gray-900 mb-3">
                      <span className="text-base">
                        {question.text}
                        {question.is_required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </label>
                    {renderQuestionInput(question)}
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={goToPreviousSection}
                  disabled={navigation.sectionHistory.length <= 1}
                  className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Previous
                </button>

                {!isLastSection ? (
                  <button
                    type="button"
                    onClick={goToNextSection}
                    disabled={!isCurrentSectionComplete()}
                    className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {nextButtonText}
                  </button>
                ) : (
                 <button
  type="submit"
  disabled={!isFormComplete() || submitting}  // This now only checks visited sections
  className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 shadow-sm"
>
  {submitting ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      Submitting...
    </>
  ) : (
    'Submit Feedback'
  )}
</button>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8">
          <p>This form is powered by User Feedback Portal</p>
        </div>
      </div>
    </div>
  );
};

export default PublicFeedbackForm;