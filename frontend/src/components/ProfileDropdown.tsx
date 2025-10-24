import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  UserIcon, 
  CogIcon, 
  ArrowRightOnRectangleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || user?.username?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black bg-opacity-25"
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className="fixed right-4 top-20 z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {getInitials(user?.first_name || '', user?.last_name || '')}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}`
                  : user?.username || 'User'
                }
              </p>
              <p className="text-sm text-gray-500">
                {user?.email || 'No email provided'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {user?.is_staff ? 'Administrator' : 'User'}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <button
            onClick={() => {
              onClose();
              navigate('/admin/settings');
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <CogIcon className="h-4 w-4 mr-3 text-gray-400" />
            Settings
          </button>
          
          <button
            onClick={() => {
              onClose();
              navigate('/admin/dashboard');
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <UserIcon className="h-4 w-4 mr-3 text-gray-400" />
            Dashboard
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-md"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown; 