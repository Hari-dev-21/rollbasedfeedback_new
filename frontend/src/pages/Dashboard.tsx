import React, { useState, useEffect, useRef } from 'react';
 import api from "../services/api";
 import { Dispatch, SetStateAction } from "react";

import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  PlusIcon,
  EyeIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { dashboardAPI } from '../services/api';
import { FormSummary } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface Admin {
  id: number;
  username: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<FormSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'1hr' | '6hr' | '24hr'>('24hr');
  const [responsesDropdownOpen, setResponsesDropdownOpen] = useState(false);
  const [analyticsDropdownOpen, setAnalyticsDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  
  const responsesDropdownRef = useRef<HTMLDivElement | null>(null);
  const analyticsDropdownRef = useRef<HTMLDivElement | null>(null);
  const adminDropdownRef = useRef<HTMLDivElement | null>(null);
  
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [currentUser, setCurrentUser] = useState(null);
  
  const [isSuperuser, setIsSuperuser] = useState(false);

const fetchAndSetCurrentUser = async (
) => {
  try {
    const response = await api.get("/api/auth/user/");
    setCurrentUser(response.data.username);
    setIsSuperuser(response.data.is_superuser);
  } catch (error) {
    console.error("Error fetching current user", error);
    setCurrentUser(null); // optional: reset state if fetch fails
  }
};

 useEffect(() => {
    fetchAndSetCurrentUser();
  }, []);





  // Admin filter states
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');


  // useEffect(() => {
  //   // Fetch user details (you should already have a similar API)
  //   const fetchUser = async () => {
  //     try {
  //       const response = await api.get("/api/admin/admins"); // your endpoint for current user
        
  //     } catch (error) {
  //       console.error("Error fetching user:", error);
  //     }
  //   };

  //   fetchUser();
  // }, []);

  // Load admins list on component mount
  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const adminList = await dashboardAPI.getAdmins();
        setAdmins(adminList);
      } catch (error) {
        console.error('Failed to load admins:', error);
      }
    };
    loadAdmins();
  }, []);

  // Update your existing loadDashboardData to accept admin filter
  const loadDashboardData = async (adminFilter?: string) => {
    try {
      setLoading(true);
      setError(null);
      const adminParam = adminFilter === 'all' ? undefined : adminFilter;
      const data = await dashboardAPI.getSummary(adminParam);
      setSummary(data);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError(error.response?.data?.error || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDashboardData();
    } else if (!authLoading && !isAuthenticated) {
      setError('You must be logged in to view the dashboard.');
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (responsesDropdownRef.current && !responsesDropdownRef.current.contains(event.target as Node)) {
        setResponsesDropdownOpen(false);
      }
      if (analyticsDropdownRef.current && !analyticsDropdownRef.current.contains(event.target as Node)) {
        setAnalyticsDropdownOpen(false);
      }
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setAdminDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle admin selection
  const handleAdminSelect = (adminUsername: string) => {
    setSelectedAdmin(adminUsername);
    setAdminDropdownOpen(false);
    loadDashboardData(adminUsername);
  };

  const getSelectedAdminName = () => {
    if (selectedAdmin === 'all') return 'All Admins';
    const admin = admins.find(a => a.username === selectedAdmin);
    return admin ? admin.username : 'All Admins';
  };

  // Filter responses based on time
  const getFilteredResponses = () => {
    if (!summary) return [];

    const now = new Date();
    let cutoffTime: Date;

    switch (timeFilter) {
      case '1hr':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6hr':
        cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24hr':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    return summary.recent_responses_list.filter(response =>
      new Date(response.submitted_at) >= cutoffTime
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading dashboard...'}
          </p>
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
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-3">
                {error?.includes('logged in') ? (
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Go to Login
                  </button>
                ) : (
                  <button
                    onClick={() => loadDashboardData(selectedAdmin)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  // Forms Overview with detailed form status
  const formsChartData = {
    labels: ['Active Forms', 'Inactive Forms', 'Expired Forms', 'Total Responses'],
    datasets: [
      {
        label: 'Count',
        data: [
          summary.active_forms,
          summary.total_forms - summary.active_forms, // Inactive forms
          Math.floor((summary.total_forms - summary.active_forms) * 0.3), // Simulated expired forms
          summary.total_responses,
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Green for active
          'rgba(156, 163, 175, 0.8)', // Gray for inactive
          'rgba(239, 68, 68, 0.8)',   // Red for expired
          'rgba(59, 130, 246, 0.8)',  // Blue for responses
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(156, 163, 175, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const formsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Forms Status & Responses',
        font: {
          size: 16,
          weight: 500,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Export functions for responses
  const handleExportAllResponsesExcel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/responses/export_all_excel/', {
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
        a.download = `all_responses_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    setResponsesDropdownOpen(false);
  };

  const handleExportAllResponsesCSV = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/responses/export_all_csv/', {
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
        a.download = `all_responses_${new Date().toISOString().split('T')[0]}.csv`;
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
    setResponsesDropdownOpen(false);
  };

  const handleExportAllResponsesPDF = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/responses/export_all_pdf/', {
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
        a.download = `all_responses_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      } else {
        const errorText = await response.text();
        console.error('Failed to export responses:', response.status, errorText);
        alert(`Failed to export responses. Status: ${response.status}. Please try again.`);
      }
    } catch (error) {
      console.error('Error exporting responses:', error);
      alert('Error exporting responses. Please try again.');
    }
    setResponsesDropdownOpen(false);
  };

  // Export functions for analytics
  const handleExportAnalyticsExcel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/responses/export_analytics_excel/', {
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
        a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    setAnalyticsDropdownOpen(false);
  };

  const handleExportAnalyticsCSV = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/responses/export_analytics_csv/', {
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
        a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.csv`;
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
    setAnalyticsDropdownOpen(false);
  };

  const handleExportAnalyticsPDF = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Please log in to export data.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/responses/export_analytics_pdf/', {
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
        a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.pdf`;
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
    setAnalyticsDropdownOpen(false);
  };

 




  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        {/* Left: Title and description */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your feedback forms and responses
          </p>
        </div>

        {/* Right: Admin Filter + Create Button */}
        {isSuperuser && ( <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0 w-full sm:w-auto">
          {/* Admin Filter Dropdown */}
          <div className="relative" ref={adminDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Admin:
            </label>
            <button
              type="button"
              className="inline-flex justify-between items-center w-full sm:w-64 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
            >
              <span className="truncate">{getSelectedAdminName()}</span>
              <ChevronDownIcon className="w-4 h-4 ml-2 flex-shrink-0" />
            </button>

            {adminDropdownOpen && (
              <div className="absolute right-0 z-20 w-full sm:w-64 mt-1 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="py-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleAdminSelect('all')}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      selectedAdmin === 'all' 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-medium">All Admins</span>
                    <span className="text-xs text-gray-500 ml-2">View all forms</span>
                  </button>
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      onClick={() => handleAdminSelect(admin.username)}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        selectedAdmin === admin.username 
                          ? 'bg-primary-100 text-primary-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                     <div className="font-medium truncate">
                          {admin.username}
                           {currentUser && currentUser === admin.username ? " (you)" : ""}
                           {/* {admin.current && <span className="text-gray-500"> (you)</span>} */}
                      </div>
                      {/* <div className="text-xs text-gray-500 truncate">{admin.email}</div> */}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* <Link
            to="/admin/forms/create"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Form
          </Link> */}
        </div>  )
        }
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Forms
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.total_forms}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Forms
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.active_forms}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Responses
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.total_responses}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Recent Responses (24 hrs)
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {summary.recent_responses}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <Bar data={formsChartData} options={formsChartOptions} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Data</h3>
            <p className="text-sm text-gray-600 mb-6">
              Download your feedback data and analytics in multiple formats
            </p>
            <div className="space-y-3">
              {/* Export All Responses Dropdown */}
              <div className="relative" ref={responsesDropdownRef}>
                <button
                  onClick={() => setResponsesDropdownOpen(!responsesDropdownOpen)}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export All Responses
                  <ChevronDownIcon className="h-5 w-5 ml-2" />
                </button>

                {responsesDropdownOpen && (
                  <div className="absolute left-0 right-0 z-10 mt-2 origin-top rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <button
                        onClick={handleExportAllResponsesExcel}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📊 Excel (.xlsx)
                      </button>
                      <button
                        onClick={handleExportAllResponsesCSV}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📋 CSV (.csv)
                      </button>
                      <button
                        onClick={handleExportAllResponsesPDF}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📄 PDF (.pdf)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Analytics Dropdown */}
              <div className="relative" ref={analyticsDropdownRef}>
                <button
                  onClick={() => setAnalyticsDropdownOpen(!analyticsDropdownOpen)}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Export Analytics Report
                  <ChevronDownIcon className="h-5 w-5 ml-2" />
                </button>

                {analyticsDropdownOpen && (
                  <div className="absolute left-0 right-0 z-10 mt-2 origin-top rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <button
                        onClick={handleExportAnalyticsExcel}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📊 Excel (.xlsx)
                      </button>
                      <button
                        onClick={handleExportAnalyticsCSV}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📋 CSV (.csv)
                      </button>
                      <button
                        onClick={handleExportAnalyticsPDF}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📄 PDF (.pdf)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Responses: {summary.total_responses} from {summary.total_forms} forms
            </div>
          </div>
        </div>
      </div>

      {/* Recent Feedback with Time Filter */}
      <div className="bg-white shadow rounded-lg mt-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Feedback (Last 24 Hours)
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeFilter('1hr')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  timeFilter === '1hr'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                1 Hour
              </button>
              <button
                onClick={() => setTimeFilter('6hr')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  timeFilter === '6hr'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                6 Hours
              </button>
              <button
                onClick={() => setTimeFilter('24hr')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  timeFilter === '24hr'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                24 Hours
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {getFilteredResponses().map((feedback) => (
              <div key={feedback.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{feedback.form_title}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(feedback.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {Math.round((Date.now() - new Date(feedback.submitted_at).getTime()) / (1000 * 60))} min ago
                  </span>
                  <Link
                    to={`/feedback/response/${feedback.id}`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
                  >
                    <EyeIcon className="h-3 w-3 mr-1" />
                    View
                  </Link>
                </div>
              </div>
            ))}
            {getFilteredResponses().length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <ClockIcon className="h-8 w-8 mx-auto mb-2" />
                <p>No feedback received in the selected time period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;