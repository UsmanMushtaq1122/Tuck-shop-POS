import { notificationService } from '@/services/api';

const CHECK_INTERVAL = 60000;
const NOTIFICATION_TYPES = {
  low_stock: { icon: '⚠️', color: '#F59E0B' },
  sync_failed: { icon: '🔴', color: '#EF4444' },
  new_update: { icon: '📦', color: '#3B82F6' },
  daily_summary: { icon: '📊', color: '#10B981' },
  pending_payment: { icon: '💳', color: '#8B5CF6' },
};

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('notification_settings') || '{}');
  } catch { return {}; }
}

function hasPermission() {
  return 'Notification' in window && Notification.permission === 'granted';
}

async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function showDesktopNotification(notification) {
  if (!hasPermission()) return;
  const config = NOTIFICATION_TYPES[notification.type] || {};
  try {
    const n = new Notification(notification.title, {
      body: notification.message,
      icon: '/vite.svg',
      tag: notification.id,
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      if (notification.link) {
        window.location.href = notification.link;
      }
      n.close();
    };
  } catch {}
}

class NotificationEngine {
  constructor() {
    this.intervalId = null;
    this.lastDailySummary = null;
    this.callbacks = [];
    this.notifications = [];
  }

  subscribe(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  emit() {
    this.callbacks.forEach(cb => cb(this.notifications));
  }

  async start() {
    await requestPermission();
    await this.checkOnce();
    this.intervalId = setInterval(() => this.checkOnce(), CHECK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkOnce() {
    try {
      const settings = loadSettings();

      const result = await notificationService.getAll({ unreadOnly: 'true' });
      const serverNotifs = result.notifications || [];
      const newNotifs = [];

      for (const n of serverNotifs) {
        const exists = this.notifications.find(ex => ex.id === n.id);
        if (!exists) {
          newNotifs.push(n);

          if (settings[n.type] !== false) {
            showDesktopNotification(n);
          }
        }
      }

      if (newNotifs.length > 0) {
        this.notifications = [...newNotifs, ...this.notifications].slice(0, 200);
        this.emit();
      }

      if (settings.low_stock !== false) {
        try {
          await notificationService.generate();
        } catch {}
      }
    } catch {}
  }

  markAsRead(id) {
    this.notifications = this.notifications.map(n =>
      n.id === id ? { ...n, read: 1 } : n
    );
    this.emit();
    notificationService.markRead(id).catch(() => {});
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, read: 1 }));
    this.emit();
    notificationService.markAllRead().catch(() => {});
  }

  generateDailySummary() {
    const today = new Date().toDateString();
    if (this.lastDailySummary === today) return;
    this.lastDailySummary = today;
    notificationService.dailySummary().catch(() => {});
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  getNotifications() {
    return this.notifications;
  }
}

const engine = new NotificationEngine();
export default engine;
