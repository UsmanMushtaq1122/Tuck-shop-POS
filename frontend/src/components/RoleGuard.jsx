import React from 'react';
import { useSelector } from 'react-redux';
import { hasRole, hasPermission } from '@/lib/roles';

export function RoleGuard({ roles, permission, children, fallback = null }) {
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role;

  if (roles && !hasRole(userRole, roles)) {
    return fallback;
  }

  if (permission && !hasPermission(userRole, permission)) {
    return fallback;
  }

  return children;
}

export function RoleButton({ roles, permission, children, fallback = null, ...props }) {
  return (
    <RoleGuard roles={roles} permission={permission} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export default RoleGuard;
