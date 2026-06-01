import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FiHome, FiShoppingBag, FiPackage, FiGrid, FiLayers,
  FiShoppingCart, FiUsers, FiCreditCard, FiBarChart2,
  FiUser, FiTruck, FiActivity, FiBell, FiSettings,
  FiChevronLeft, FiChevronRight, FiLogOut, FiZap, FiBox
} from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { logout } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const menuGroups = [
  {
    label: 'Main',
    items: [
      { path: '/', icon: FiHome, label: 'Dashboard', permission: 'dashboard' },
      { path: '/pos', icon: FiShoppingBag, label: 'POS Billing', permission: 'pos' },
    ],
  },
  {
    label: 'Products',
    items: [
      { path: '/products', icon: FiPackage, label: 'Products', permission: 'products' },
      { path: '/categories', icon: FiGrid, label: 'Categories', permission: 'categories' },
      { path: '/inventory', icon: FiLayers, label: 'Inventory', permission: 'inventory' },
      { path: '/suppliers', icon: FiTruck, label: 'Suppliers', permission: 'suppliers' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { path: '/orders', icon: FiShoppingCart, label: 'Orders', permission: 'orders' },
      { path: '/customers', icon: FiUsers, label: 'Customers', permission: 'customers' },
      { path: '/expenses', icon: FiCreditCard, label: 'Expenses', permission: 'expenses' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { path: '/reports', icon: FiBarChart2, label: 'Reports', permission: 'reports' },
      { path: '/analytics', icon: FiActivity, label: 'Analytics', permission: 'analytics' },
      { path: '/employees', icon: FiUser, label: 'Employees', permission: 'employees' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/notifications', icon: FiBell, label: 'Notifications', permission: 'notifications' },
      { path: '/settings', icon: FiSettings, label: 'Settings', permission: 'settings' },
    ],
  },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-background-secondary border-r border-border z-40 flex flex-col shadow-sm"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                <FiZap className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-heading font-bold text-base">Tuck Shop</span>
                <p className="text-[10px] text-foreground-muted -mt-0.5">POS System</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-purple-500 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-accent/20">
            <FiZap className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            hasPermission(user?.role, item.permission)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-4">
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative group',
                          isActive
                            ? 'bg-accent/10 text-accent font-medium'
                            : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="navIndicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent rounded-r-full"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                        <Icon className={cn('w-4.5 h-4.5 shrink-0', isActive && 'text-accent')} />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              className="text-sm whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {collapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-background-tertiary border border-border rounded-lg text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 shadow-lg">
                            {item.label}
                          </div>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border shrink-0 space-y-2">
        <div className={cn(
          'flex items-center gap-3 p-2.5 rounded-xl',
          collapsed && 'justify-center'
        )}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate leading-tight">{user?.name || 'User'}</p>
                <Badge variant={user?.role === 'admin' ? 'warning' : user?.role === 'manager' ? 'info' : 'success'} className="text-[10px] px-1.5 py-0 capitalize mt-0.5">
                  {user?.role || 'cashier'}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors text-foreground-muted hover:text-danger"
              title="Logout"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-background-secondary border border-border rounded-full flex items-center justify-center hover:bg-background-tertiary transition-colors shadow-md z-10"
      >
        {collapsed ? (
          <FiChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
        ) : (
          <FiChevronLeft className="w-3.5 h-3.5 text-foreground-muted" />
        )}
      </button>
    </motion.aside>
  );
}
