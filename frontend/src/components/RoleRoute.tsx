import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleRouteProps {
  allowedRoles: ('admin' | 'superadmin')[];
  element: React.ReactElement;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, element }) => {
  const { user } = useAuth();

  const role = user?.is_superuser
    ? 'superadmin'
    : user?.is_staff
    ? 'admin'
    : null;

  if (!user || !role || !allowedRoles.includes(role)) {
    return <Navigate to="/admin/dashboard" />;
  }

  return element;
};

export default RoleRoute;
