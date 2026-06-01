import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiSearch, FiBell, FiMoon, FiSun, FiWifi, FiWifiOff,
  FiPlus, FiUser, FiSettings, FiLogOut, FiChevronDown,
  FiShoppingBag, FiBarChart2, FiRefreshCw, FiAlertTriangle, FiDollarSign, FiClock
} from 'react-icons/fi';
import { useTheme } from '@/hooks/useTheme';
import { cn, getInitials } from '@/lib/utils';
import { hasPermission } from '@/lib/roles';
import { Badge } from '@/components/ui/Badge';
import { logout } from '@/store/slices/authSlice';
import { processSync, fetchSyncStatus } from '@/store/slices/syncSlice';
import notificationEngine from '@/services/notificationEngine';

export default function Navbar({ sidebarCollapsed }) {
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isOnline, pending, syncing } = useSelector((state) => state.sync);
  const [searchFocused, setSearchFocused] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    dispatch(fetchSyncStatus());
    const interval = setInterval(() => dispatch(fetchSyncStatus()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const unsub = notificationEngine.subscribe(setNotifications);
    notificationEngine.start();
    return () => {
      unsub();
      notificationEngine.stop();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };
  const handleSync = () => { dispatch(processSync()); };

  const unreadCount = notifications.filter(n => !n.read).length;
  const initials = user ? getInitials(user.name) : 'U';

  const notifTypeIcon = (type) => {
    switch (type) {
      case 'low_stock': return <FiAlertTriangle className="w-4 h-4 text-warning" />;
      case 'pending_payment': return <FiDollarSign className="w-4 h-4 text-purple-400" />;
      case 'daily_summary': return <FiClock className="w-4 h-4 text-success" />;
      default: return <FiBell className="w-4 h-4 text-accent" />;
    }
  };

  const formatTime = (date) => date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'fixed top-0 right-0 h-16 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-[72px]' : 'left-[260px]'
      )}
    >
      <div className="h-full px-6 flex items-center justify-between glass">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center">
            <motion.div
              animate={{ width: searchFocused ? 400 : 280 }}
              className="relative"
            >
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search products, orders, customers..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full pl-10 pr-4 py-2 bg-background-tertiary/60 border border-transparent rounded-xl text-sm focus:outline-none focus:border-accent/50 focus:bg-background-secondary transition-all placeholder:text-foreground-muted/60"
              />
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            to="/pos"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 active:scale-[0.97]"
          >
            <FiPlus className="w-4 h-4" />
            <span className="text-sm font-medium hidden md:inline">New Order</span>
          </Link>

          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl',
            isOnline ? 'bg-success/8' : 'bg-danger/8'
          )}>
            <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-success' : 'bg-danger')} />
            <span className={cn('text-xs hidden sm:inline font-medium', isOnline ? 'text-success' : 'text-danger')}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {pending > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-all relative"
              title={`Sync ${pending} pending items`}
            >
              <FiRefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-warning rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {pending}
              </span>
            </button>
          )}

          <div className="hidden md:flex flex-col items-end px-3 py-1 border-r border-border mr-1">
            <p className="text-sm font-semibold leading-tight tabular-nums">{formatTime(currentTime)}</p>
            <p className="text-[11px] text-foreground-muted leading-tight">{formatDate(currentTime)}</p>
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl hover:bg-background-tertiary transition-all relative"
            >
              <FiBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] bg-danger rounded-full text-[9px] text-white flex items-center justify-center font-bold shadow-lg shadow-danger/30">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-background-secondary border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <Badge variant={unreadCount > 0 ? 'warning' : 'default'}>{unreadCount} new</Badge>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-foreground-muted text-sm">
                        <FiBell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>No notifications yet</p>
                      </div>
                    ) : notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          'p-3.5 border-b border-border hover:bg-background-tertiary/50 transition-colors cursor-pointer',
                          !notif.read && 'bg-accent/3'
                        )}
                        onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{notifTypeIcon(notif.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{notif.title}</p>
                              {!notif.read && <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0" />}
                            </div>
                            <p className="text-xs text-foreground-secondary mt-0.5 line-clamp-2">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                    className="w-full p-3 text-sm font-medium text-accent hover:bg-accent/5 transition-colors text-center border-t border-border"
                  >
                    View All Notifications
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-background-tertiary transition-all"
          >
            {theme === 'dark' ? <FiSun className="w-4.5 h-4.5" /> : <FiMoon className="w-4.5 h-4.5" />}
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-background-tertiary transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {initials}
              </div>
              <FiChevronDown className={cn('w-4 h-4 text-foreground-muted transition-transform hidden md:block', showUserMenu && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-background-secondary border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold">{user?.name || 'User'}</p>
                        <p className="text-xs text-foreground-muted capitalize">{user?.role || 'cashier'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 space-y-0.5">
                    {hasPermission(user?.role, 'settings') && (
                      <Link to="/settings" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background-tertiary transition-colors text-sm">
                        <FiSettings className="w-4 h-4" /> Settings
                      </Link>
                    )}
                    {hasPermission(user?.role, 'reports') && (
                      <Link to="/reports" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background-tertiary transition-colors text-sm">
                        <FiBarChart2 className="w-4 h-4" /> Reports
                      </Link>
                    )}
                    {hasPermission(user?.role, 'pos') && (
                      <Link to="/pos" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-background-tertiary transition-colors text-sm">
                        <FiShoppingBag className="w-4 h-4" /> POS Billing
                      </Link>
                    )}
                  </div>
                  <div className="p-2 border-t border-border">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-danger/10 text-danger transition-colors text-sm w-full">
                      <FiLogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
