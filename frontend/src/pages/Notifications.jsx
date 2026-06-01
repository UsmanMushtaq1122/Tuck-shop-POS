import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiShoppingCart, FiRefreshCw, FiInfo, FiCheck, FiDollarSign, FiClock, FiTrash2, FiFilter, FiTrendingUp } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import notificationEngine from '@/services/notificationEngine';

const TYPE_CONFIG = {
  low_stock: { icon: FiAlertTriangle, color: 'text-warning bg-warning/10', label: 'Low Stock' },
  sync_failed: { icon: FiRefreshCw, color: 'text-danger bg-danger/10', label: 'Sync Failed' },
  new_update: { icon: FiTrendingUp, color: 'text-accent bg-accent/10', label: 'Update' },
  daily_summary: { icon: FiClock, color: 'text-success bg-success/10', label: 'Daily Summary' },
  pending_payment: { icon: FiDollarSign, color: 'text-purple-400 bg-purple-400/10', label: 'Pending Payment' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'low_stock', label: 'Low Stock' },
  { id: 'sync_failed', label: 'Sync' },
  { id: 'daily_summary', label: 'Summary' },
  { id: 'pending_payment', label: 'Payments' },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const unsub = notificationEngine.subscribe(setNotifications);
    notificationEngine.checkOnce();
    return unsub;
  }, []);

  const filtered = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const unreadCount = notifications.filter(n => !n.read).length;
  const typeCounts = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  const handleMarkRead = (id) => {
    notificationEngine.markAsRead(id);
  };

  const handleMarkAllRead = () => {
    notificationEngine.markAllAsRead();
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Notifications</h1>
          <p className="text-foreground-muted">Stay updated with alerts and messages</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
              <FiCheck className="w-4 h-4 mr-1" /> Mark All Read
            </Button>
          )}
          <Badge variant={unreadCount > 0 ? 'warning' : 'default'}>
            {unreadCount} unread
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              'p-3 rounded-xl border text-left transition-all',
              activeFilter === f.id
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50 bg-background-secondary'
            )}
          >
            <p className="text-sm font-medium">{f.label}</p>
            <p className="text-xs text-foreground-muted mt-0.5">
              {f.id === 'all' ? notifications.length : (typeCounts[f.id] || 0)} items
            </p>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-foreground-muted">
          <FiClock className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">
            {activeFilter === 'all' ? 'You\'re all caught up!' : 'No notifications of this type'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification, index) => {
            const config = TYPE_CONFIG[notification.type] || { icon: FiInfo, color: 'text-foreground-muted bg-background-tertiary', label: notification.type };
            const Icon = config.icon;
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={cn('transition-all', !notification.read && 'border-l-4 border-l-accent')}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={cn('p-2.5 rounded-xl shrink-0', config.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{notification.title}</h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-accent rounded-full shrink-0" />
                        )}
                        <Badge variant="ghost" className="text-[10px]">{config.label}</Badge>
                      </div>
                      <p className="text-sm text-foreground-muted">{notification.message}</p>
                      <p className="text-xs text-foreground-muted mt-2">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="p-2 hover:bg-background-tertiary rounded-lg transition-colors shrink-0"
                        title="Mark as read"
                      >
                        <FiCheck className="w-4 h-4 text-foreground-muted hover:text-accent" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
