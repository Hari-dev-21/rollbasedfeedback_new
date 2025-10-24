import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
 Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  EyeIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { formsAPI } from '../services/api';
import { FormAnalytics as FormAnalyticsType, QuestionAnalytics, FeedbackForm, FeedbackResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import QuestionAnalyze from './QuestionsAnalyze';


// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type HorizontalBarProps = {
  label: React.ReactNode;
  icon?: React.ReactNode;
  color: string;
  value: number;
  max: number;
  countLabel: React.ReactNode;
};

const HorizontalBar: React.FC<HorizontalBarProps> = ({ label, icon, color, value, max, countLabel }) => {
  const percent = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center mb-2">
      <div className="flex items-center w-8 min-w-[2rem]">
        {icon}
        <span className="ml-0 text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex-1 mx-0 bg-gray-200 rounded h-2 relative">
        <div
          className="h-2 rounded"
          style={{ width: `${percent}%`, backgroundColor: color, transition: 'width 0.3s' }}
        ></div>
      </div>
      <span className="ml-2 text-sm text-gray-700 min-w-[1rem] text-right">{countLabel}</span>
    </div>
  );
};

const FormAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [analytics, setAnalytics] = useState<FormAnalyticsType | null>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'network' | 'notfound' | 'generic'>('generic');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const [retryCount, setRetryCount] = useState(0);



  useEffect(() => {
    if (!user) {
      setError('You must be logged in to view analytics');
      setErrorType('auth');
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        setErrorType('generic');

        // First load form data to check if it exists
        const formData = await formsAPI.getForm(id);
        setForm(formData);

        // Then load analytics data and responses
        const [analyticsData, questionData, responsesData] = await Promise.all([
          formsAPI.getFormAnalytics(id),
          formsAPI.getQuestionAnalytics(id),
          formsAPI.getFormResponses(id)
        ]);

        setAnalytics(analyticsData);
        setQuestionAnalytics(questionData);
        setResponses(responsesData);
      } catch (error: any) {
        console.error('Failed to load analytics:', error);
        
        // More specific error handling
        if (error.response?.status === 401) {
          setError('You are not authorized to view this form\'s analytics. Please log in again.');
          setErrorType('auth');
        } else if (error.response?.status === 404) {
          setError('The requested form was not found or you don\'t have permission to view it.');
          setErrorType('notfound');
        } else if (error.response?.status >= 500) {
          setError('Server error occurred while loading analytics. Please try again later.');
          setErrorType('network');
        } else if (error.code === 'NETWORK_ERROR' || !error.response) {
          setError('Network connection error. Please check your internet connection and try again.');
          setErrorType('network');
        } else {
          setError(error.response?.data?.error || 'Failed to load analytics data. Please try again.');
          setErrorType('generic');
        }
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [id, user, retryCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Prepare chart data for question analytics
  const getQuestionChartData = (question: QuestionAnalytics) => {
    // Helper: get color array for options
    const getColors = (options: string[], type: string) => {
      if (type === 'yes_no') {
        // Always Yes = blue, No = red
        return options.map(opt =>
          opt.toLowerCase() === 'yes' ? '#3B82F6' : opt.toLowerCase() === 'no' ? '#EF4444' : '#6B7280'
        );
      }
      const palette = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
      ];
      return options.map((_, i) => palette[i % palette.length]);
    };


    interface ChartRendererProps {
  q: QuestionAnalytics; // make sure QuestionAnalytics is imported
}





    if (question.question_type === 'radio' || question.question_type === 'checkbox') {
      // Use only predefined options, show their response counts
      const predefinedOptions = question.options || [];
      const labels = predefinedOptions.length > 0 ? predefinedOptions : ['No options available'];
      const data = labels.map(label => question.answer_distribution?.[label] || 0);



      // Use consistent colors for multiple choice questions
      const colors = labels.map((_, index) => {
        const palette = [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
          '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
        ];
        return palette[index % palette.length];
      });

      return {
        labels,
        datasets: [
          {
            label: 'Total Selections',
            data,
            backgroundColor: colors.map(color => color + '80'), // Add transparency
            borderColor: colors,
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
            barThickness: 30,
          },
        ],
      };
    }

    if (question.question_type === 'yes_no') {
      // Keep existing logic for yes_no (will be handled by pie chart)
      const options = question.options || Object.keys(question.answer_distribution);
      const labels = options;
      const data = labels.map(label => question.answer_distribution[label] || 0);
      const colors = getColors(labels, question.question_type);
      return {
        labels,
        datasets: [
          {
            label: 'Count',
            data,
            backgroundColor: colors,
            borderColor: colors,
            borderWidth: 1,
            barThickness: 24,
          },
        ],
      };
    }
    return null;
  };

  // Prepare pie chart data specifically for yes/no questions
  const getPieChartData = (question: QuestionAnalytics) => {
    if (question.question_type === 'yes_no') {
      const yesCount = question.answer_distribution['Yes'] || 0;
      const noCount = question.answer_distribution['No'] || 0;

      return {
        labels: ['Yes', 'No'],
        datasets: [
          {
            data: [yesCount, noCount],
            backgroundColor: ['#10B981', '#EF4444'], // Green for Yes, Red for No
            borderColor: ['#059669', '#DC2626'],
            borderWidth: 2,
            hoverBackgroundColor: ['#34D399', '#F87171'],
            hoverBorderColor: ['#047857', '#B91C1C'],
          },
        ],
      };
    }
    return null;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        display: true,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        grid: {
          display: true,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Specific chart options for multiple choice questions (radio/checkbox)
  const multipleChoiceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function() {
            return '';
          },
          label: function(context: any) {
            return `${context.label}: ${context.parsed.y} selection${context.parsed.y !== 1 ? 's' : ''}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        title: {
          display: true,
          text: 'Number of Selections',
          font: {
            size: 12,
            weight: 'bold' as const,
          }
        },
        grid: {
          display: true,
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
        title: {
          display: true,
          text: 'Options',
          font: {
            size: 12,
            weight: 'bold' as const,
          }
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        display: true,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  // Get text input answers organized by questions
  const getTextInputAnswersByQuestion = () => {
    const questionMap = new Map<string, {
      questionText: string;
      questionType: string;
      answers: Array<{
        responseId: string;
        // submittedAt: string;
        answerText: string;
        responseNumber: number;
      }>;
    }>();

    responses.forEach((response, responseIndex) => {
      const textAnswers = response.answers.filter(answer =>
        ['text', 'textarea', 'email', 'phone'].includes(answer.question_type)
      );

      textAnswers.forEach(answer => {
        const questionKey = answer.question_text || `Question ${answer.question}`;

        if (!questionMap.has(questionKey)) {
          questionMap.set(questionKey, {
            questionText: questionKey,
            questionType: answer.question_type || 'text',
            answers: []
          });
        }

        questionMap.get(questionKey)!.answers.push({
          responseId: response.id,
          // submittedAt: response.submitted_at,
          answerText: answer.answer_text || '',
          responseNumber: responseIndex + 1
        });
      });
    });

    return Array.from(questionMap.values());
  };



  // Retry function
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Handle authentication redirect
  const handleLoginRedirect = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {errorType === 'auth' ? 'Authentication Required' : 
                 errorType === 'network' ? 'Connection Error' : 'Error Loading Analytics'}
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-3">
                {errorType === 'auth' ? (
                  <button
                    onClick={handleLoginRedirect}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Go to Login
                  </button>
                ) : (
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => navigate('/admin/forms')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Forms
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || !form) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gray-600 mb-4">No analytics data available for this form</p>
          <button
            onClick={() => navigate('/admin/forms')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  // Export functions
  const handleExportAnalyticsExcel = async () => {
    if (!id || !form) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/forms/${id}/export_analytics_excel/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${form.title}_analytics.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        console.error('Failed to export analytics:', response.status, errorText);
        alert(`Failed to export analytics. Status: ${response.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Error exporting analytics. Please try again.');
    }
    setExportDropdownOpen(false);
  };

  const handleExportAnalyticsCSV = async () => {
    if (!id || !form) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/forms/${id}/export_analytics_csv/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${form.title}_analytics.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        console.error('Failed to export analytics:', response.status, errorText);
        alert(`Failed to export analytics. Status: ${response.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Error exporting analytics. Please try again.');
    }
    setExportDropdownOpen(false);
  };

  const handleExportAnalyticsPDF = async () => {
    if (!id || !form) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/forms/${id}/export_analytics_pdf/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${form.title}_analytics.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        console.error('Failed to export analytics:', response.status, errorText);
        alert(`Failed to export analytics. Status: ${response.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Error exporting analytics. Please try again.');
    }
    setExportDropdownOpen(false);
  };

  const handleExportResponsesExcel = async () => {
    if (!id || !form) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/forms/${id}/export_excel/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${form.title}_responses.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        console.error('Failed to export responses:', response.status, errorText);
        alert(`Failed to export responses. Status: ${response.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Error exporting responses:', error);
      alert('Error exporting responses. Please try again.');
    }
    setExportDropdownOpen(false);
  };

  const handleExportResponsesCSV = async () => {
    if (!id || !form) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/forms/${id}/export_csv/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${form.title}_responses.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        console.error('Failed to export responses:', response.status, errorText);
        alert(`Failed to export responses. Status: ${response.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Error exporting responses:', error);
      alert('Error exporting responses. Please try again.');
    }
    setExportDropdownOpen(false);
  };

  const handleExportResponsesPDF = async () => {
    if (!id || !form) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch(`http://localhost:8000/api/forms/${id}/export_pdf/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${form.title}_responses.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        console.error('Failed to export responses:', response.status, errorText);
        alert(`Failed to export responses. Status: ${response.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Error exporting responses:', error);
      alert('Error exporting responses. Please try again.');
    }
    setExportDropdownOpen(false);
  };

  const statsCards = [
    {
      name: 'Total Responses',
      value: analytics.total_responses,
      icon: UsersIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Last Updated',
      value: new Date(analytics.last_updated).toLocaleDateString(),
      icon: CalendarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const textInputQuestions = getTextInputAnswersByQuestion();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/admin/forms')}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Forms
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Form Analytics</h1>
              <p className="text-gray-600">{form.title}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/admin/responses`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                View Responses
              </button>

              {/* Export Dropdown */}
              <div className="relative inline-block text-left" ref={exportDropdownRef}>
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                  Export Data
                  <ChevronDownIcon className="h-4 w-4 ml-2" />
                </button>

                {exportDropdownOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      {/* Analytics Export Section */}
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        Analytics Data
                      </div>
                      <button
                        onClick={handleExportAnalyticsExcel}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📊 Analytics Excel (.xlsx)
                      </button>
                      <button
                        onClick={handleExportAnalyticsCSV}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📋 Analytics CSV (.csv)
                      </button>
                      <button
                        onClick={handleExportAnalyticsPDF}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📄 Analytics PDF (.pdf)
                      </button>

                      {/* Responses Export Section */}
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 mt-2">
                        Response Data
                      </div>
                      <button
                        onClick={handleExportResponsesExcel}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📊 Responses Excel (.xlsx)
                      </button>
                      <button
                        onClick={handleExportResponsesCSV}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📋 Responses CSV (.csv)
                      </button>
                      <button
                        onClick={handleExportResponsesPDF}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📄 Responses PDF (.pdf)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 mb-8">
          {statsCards.map((item) => (
            <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {item.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {item.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Text Input Responses Section - Organized by Questions */}
        {textInputQuestions.length > 0 && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Text Input Responses</h3>
            </div>

            {textInputQuestions.map((questionData, questionIndex) => {

              return (
                <div key={questionIndex} className="bg-white shadow rounded-lg p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-semibold text-gray-800">
                        {questionData.questionText}
                      </h4>
                      {/* <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        {questionData.questionType}
                      </span> */}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {questionData.answers.length} response{questionData.answers.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Table of responses */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Response 
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Answer
                          </th>
                          {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submitted At
                          </th> */}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {questionData.answers.map((answer, answerIndex) => (
                          <tr key={answerIndex} className={answerIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {answer.responseNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="max-w-xs break-words">
                                {answer.answerText || <span className="text-gray-400 italic">No answer</span>}
                              </div>
                            </td>
                            {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {new Date(answer.submittedAt).toLocaleString()}
                            </td> */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        

        {/* Question Analytics */}
        <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-4">📊 Question Analytics</h2>

          
          {questionAnalytics.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No question analytics available yet.</p>
              <p className="text-sm text-gray-500 mt-2">Analytics will appear once responses are submitted.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {questionAnalytics
                .filter(question => !['text', 'textarea', 'email', 'phone'].includes(question.question_type))
                .map((question, index) => (
                <div key={question.question_id} className="bg-white shadow rounded-lg p-6">
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">
                      {question.question_text}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {question.response_count} response{question.response_count !== 1 ? 's' : ''}
                      {question.average_rating && (
                        <span className="ml-2">• Avg: {question.average_rating.toFixed(1)}</span>
                      )}
                    </p>
                  </div>
                  {/* Custom horizontal bars for rating */}
                  {['rating', 'rating_10'].includes(question.question_type) && (
                    <div className="space-y-1 mt-4">
 {/* Main average rating display */}
<div className="flex items-center mb-2">
  {/* Scale average to 5 */}
  {(() => {
    const scale = 5;
    const rawAverage = question.average_rating || 0;
    const scaledAverage = question.question_type === 'rating_10'
      ? (rawAverage / 10) * scale
      : rawAverage;
    return (
      <>
        <span className="text-2xl font-bold text-gray-900">
          {scaledAverage.toFixed(1)}
        </span>
        <span className="ml-2 flex items-center">
          {[...Array(scale)].map((_, i) => {
            const starFill = scaledAverage - i;
            if (starFill >= 1) {
              return <StarSolid key={i} className="h-5 w-5 text-orange-400" />;
            } else if (starFill > 0) {
              return (
                <StarSolid
                  key={i}
                  className="h-5 w-5 text-orange-400"
                  style={{ clipPath: `inset(0 ${100 - starFill * 100}% 0 0)` }}
                />
              );
            } else {
              return <StarSolid key={i} className="h-5 w-5 text-gray-300" />;
            }
          })}
        </span>
        <span className="ml-4 text-gray-500 text-sm">
          {question.response_count?.toLocaleString()} ratings
        </span>
      </>
    );
  })()}
</div>


  {/* Horizontal bars for each rating value (1–5) */}
  {(() => {
    const maxScale = 5;
    const labels = Array.from({ length: maxScale }, (_, i) => `${i + 1}`);
    const maxCount = Math.max(...labels.map(label => {
      // Scale "rating_10" to 5
      if (question.question_type === 'rating_10') {
        // Combine two counts: 1&2 → 1, 3&4 → 2, etc.
        const idx = parseInt(label) - 1;
        const count = (question.answer_distribution[(idx * 2 + 1).toString()] || 0)
                    + (question.answer_distribution[(idx * 2 + 2).toString()] || 0);
        return count;
      }
      return question.answer_distribution[label] || 0;
    }), 1);

    return labels.reverse().map(label => {
      let count = 0;
      if (question.question_type === 'rating_10') {
        const idx = parseInt(label) - 1;
        count = (question.answer_distribution[(idx * 2 + 1).toString()] || 0)
              + (question.answer_distribution[(idx * 2 + 2).toString()] || 0);
      } else {
        count = question.answer_distribution[label] || 0;
      }

      return (
        <HorizontalBar
          key={label}
          label={<span className="font-bold text-gray-900">{label}</span>}
          icon={null}
          color="#F59E0B"
          value={count}
          max={maxCount}
          countLabel={<span className="font-semibold text-gray-700">{count}</span>}
        />
      );
    });
  })()}
</div>

                  )}
                  {/* Pie chart for yes/no questions */}
                  {question.question_type === 'yes_no' && (
                    <div className="mt-4">
                      {getPieChartData(question) && (
                        <div className="h-64 flex justify-center">
                          <div className="w-64">
                            <Pie
                              data={getPieChartData(question)!}
                              options={pieChartOptions}
                            />
                          </div>
                        </div>
                      )}
                      {/* Summary stats below pie chart */}
                      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-green-600">
                            {question.answer_distribution['Yes'] || 0}
                          </div>
                          <div className="text-sm text-green-700">Yes Responses</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-red-600">
                            {question.answer_distribution['No'] || 0}
                          </div>
                          <div className="text-sm text-red-700">No Responses</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Bar charts for multiple choice questions */}
                  {(question.question_type === 'radio' || question.question_type === 'checkbox') && (
                    <>
                      {getQuestionChartData(question) && (
                        <div className="h-64">
                          <Bar
                            data={getQuestionChartData(question)!}
                            options={multipleChoiceChartOptions}
                          />
                        </div>
                      )}
                      {/* Summary stats below bar chart */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">Selection Summary</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {(() => {
                            // Use only predefined options, show their response counts
                            const predefinedOptions = question.options || [];
                            const optionsToShow = predefinedOptions.length > 0 ? predefinedOptions : ['No options available'];

                            return optionsToShow.map((option, index) => {
                              const count = question.answer_distribution?.[option] || 0;
                              const palette = [
                                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                                '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
                              ];
                              const color = palette[index % palette.length];
                              return (
                                <div key={option} className="flex items-center space-x-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: color }}
                                  ></div>
                                  <span className="text-xs text-gray-600 truncate" title={option}>
                                    {option}: {count}
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Total responses: {question.response_count}
                        </div>
                      </div>
                    </>
                  )}

                  {/* For other types, keep the existing chart/legend */}
                  {!(question.question_type === 'rating' || question.question_type === 'rating_10' || question.question_type === 'yes_no' || question.question_type === 'radio' || question.question_type === 'checkbox') && (
                    <>
                      {getQuestionChartData(question) && (
                        <div className="h-64">
                          <Bar
                            data={getQuestionChartData(question)!}
                            options={chartOptions}
                          />
                        </div>
                      )}
                      {(question.question_type === 'radio' || question.question_type === 'checkbox') && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex flex-wrap gap-2">
                            {(question.options || []).map((option, index) => {
                              const palette = [
                                '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                                '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
                              ];
                              const color = palette[index % palette.length];
                              const count = question.answer_distribution[option] || 0;
                              return (
                                <div key={option} className="flex items-center space-x-2">
                                  <div 
                                    className="w-4 h-4 rounded-full" 
                                    style={{ backgroundColor: color }}
                                  ></div>
                                  <span className="text-sm text-gray-600">{option}</span>
                                  <span className="text-xs text-gray-500">({count})</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
     {/* {id && <QuestionAnalyze formId={id} />} */}
    </div>
  );
};

export default FormAnalytics;