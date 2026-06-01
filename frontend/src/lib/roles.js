export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  INVENTORY: 'inventory',
};

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.MANAGER]: 3,
  [ROLES.INVENTORY]: 2,
  [ROLES.CASHIER]: 1,
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'dashboard', 'pos', 'products', 'categories', 'inventory',
    'orders', 'customers', 'expenses', 'reports', 'employees',
    'suppliers', 'analytics', 'notifications', 'settings',
    'users:manage', 'products:manage', 'backup:manage', 'inventory:adjust',
  ],
  [ROLES.MANAGER]: [
    'dashboard', 'pos', 'products', 'categories', 'inventory',
    'orders', 'customers', 'expenses', 'reports', 'employees',
    'suppliers', 'analytics', 'notifications', 'settings',
    'products:manage', 'inventory:adjust',
  ],
  [ROLES.CASHIER]: [
    'dashboard', 'pos', 'orders', 'customers', 'notifications',
  ],
  [ROLES.INVENTORY]: [
    'dashboard', 'products', 'categories', 'inventory', 'suppliers',
    'notifications', 'inventory:adjust',
  ],
};

export function hasRole(userRole, requiredRoles) {
  if (!userRole || !requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(userRole);
}

export function hasPermission(userRole, permission) {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function getRoleHierarchyLevel(role) {
  return ROLE_HIERARCHY[role] || 0;
}

export function hasHigherOrEqualRole(userRole, targetRole) {
  return getRoleHierarchyLevel(userRole) >= getRoleHierarchyLevel(targetRole);
}
