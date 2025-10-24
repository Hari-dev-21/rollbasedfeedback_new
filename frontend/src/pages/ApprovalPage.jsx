import React, { useState, useEffect } from 'react';
import api from '../services/api';

const UserApprovalPage = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch pending users on mount
  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/pending-users/');
      console.log('Pending users response:', res.data);
      setPendingUsers(res.data.results || []);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view pending users.');
      } else {
        setError('Failed to fetch pending users.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId, username) => {
    if (!window.confirm(`Approve user "${username}"?`)) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.patch(`/api/approve-user/${userId}/`, { action: 'approve' });
      console.log('Approve user response:', res.data);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess(`User "${username}" approved successfully!`);
    } catch (err) {
      console.error('Error approving user:', err);
      setError('Failed to approve user.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (userId, username) => {
    if (!window.confirm(`Reject user "${username}"? This cannot be undone.`)) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.patch(`/api/approve-user/${userId}/`, { action: 'reject' });
      console.log('Reject user response:', res.data);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess(`User "${username}" rejected successfully!`);
    } catch (err) {
      console.error('Error rejecting user:', err);
      setError('Failed to reject user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">User Approval Management</h1>
          <p className="text-gray-600">Review and approve pending user registrations</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <span className="text-red-700">{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
                ✕
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <span className="text-green-700">{success}</span>
              <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
                ✕
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-600">Processing request...</p>
            </div>
          )}

          {/* Pending Users Table */}
          {!loading && pendingUsers.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pending Approvals</h3>
              <p className="text-gray-500">All user registrations have been reviewed.</p>
            </div>
          )}

          {!loading && pendingUsers.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-gray-500">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex gap-2 justify-end">
                        <button
                          onClick={() => handleApproveUser(user.id, user.username)}
                          disabled={loading}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id, user.username)}
                          disabled={loading}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserApprovalPage;
