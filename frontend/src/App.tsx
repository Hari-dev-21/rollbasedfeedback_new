

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FormsList from './pages/FormsList';
import CreateForm from './pages/CreateForm';
import EditForm from './pages/EditForm';
import FormAnalytics from './pages/FormAnalytics';
import ResponsesList from './pages/ResponsesList';
import Settings from './pages/Settings';
import PublicFeedbackForm from './pages/PublicFeedbackForm';
import FeedbackResponse from './pages/FeedbackResponse';
import Login from './pages/Login';
import SuperUser from './pages/SuperUser';
import QuestionAnalyze from './pages/QuestionsAnalyze';
import RegisterPage from './pages/RegisterPage';
import UserApprovalPage from './pages/ApprovalPage';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/feedback/:formId" element={<PublicFeedbackForm />} />
              <Route path="/feedback/response/:id" element={<FeedbackResponse />} />
              
              {/* Protected admin routes */}
              <Route path="/admin" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="forms" element={<FormsList />} />
                <Route path="forms/create" element={<CreateForm />} />
                <Route path="forms/:id/edit" element={<EditForm />} />
                <Route path="forms/:id/analytics" element={<FormAnalytics />} />
                <Route path="responses" element={<ResponsesList />} />
                <Route path="settings" element={<Settings />} />
                <Route path="approval" element={<UserApprovalPage />} />

                <Route path='manage-admin' element={<SuperUser />} />
                <Route path='question_analyze' element={<QuestionAnalyze formId={'a40ded27-30c4-49db-b08c-2849537bac35'} />} />
              </Route>
              
              {/* Default redirect for unknown routes */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
