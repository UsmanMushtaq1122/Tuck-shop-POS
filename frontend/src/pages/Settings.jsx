import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiSettings, FiUser, FiCreditCard, FiBell, FiDatabase,
  FiMoon, FiSun, FiSave, FiPrinter, FiGlobe,
  FiCheck, FiX, FiAlertTriangle, FiDollarSign, FiClock,
  FiMail, FiPhone, FiImage,
  FiPlus, FiTrash2, FiLock, FiShield
} from 'react-icons/fi';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { settingsService, userService } from '@/services/api';
import { ROLES, ROLE_PERMISSIONS } from '@/lib/roles';
import { addToast } from '@/store/slices/uiSlice';
import { useDispatch } from 'react-redux';

const tabs = [
  { id: 'shop', label: 'Shop', icon: FiSettings },
  { id: 'tax', label: 'Tax', icon: FiCreditCard },
  { id: 'currency', label: 'Currency', icon: FiDollarSign },
  { id: 'receipt', label: 'Receipt', icon: FiPrinter },
  { id: 'users', label: 'Users', icon: FiUser },
];

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'w-12 h-6 rounded-full transition-colors relative shrink-0',
        enabled ? 'bg-accent' : 'bg-border'
      )}
    >
      <motion.span
        animate={{ x: enabled ? 24 : 0 }}
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  );
}

const ROLE_COLORS = {
  admin: { bg: 'bg-danger/10', text: 'text-danger', label: 'Admin' },
  manager: { bg: 'bg-accent/10', text: 'text-accent', label: 'Manager' },
  cashier: { bg: 'bg-success/10', text: 'text-success', label: 'Cashier' },
  inventory: { bg: 'bg-warning/10', text: 'text-warning', label: 'Inventory' },
};

const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
];

function UserModal({ isOpen, onClose, user, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'cashier', phone: '', password: '', pin: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, role: user.role, phone: user.phone || '', password: '', pin: user.pin || '' });
    } else {
      setForm({ name: '', email: '', role: 'cashier', phone: '', password: '', pin: '' });
    }
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    try {
      if (user) {
        const payload = { name: form.name, email: form.email, role: form.role, phone: form.phone, pin: form.pin, is_active: 1 };
        await userService.update(user.id, payload);
      } else {
        await userService.create({ ...form, password: form.password || 'password123' });
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add User'} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input w-full" placeholder="Full name" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input w-full" placeholder="email@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input w-full" placeholder="+92 300 1234567" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input w-full">
            {Object.entries(ROLE_COLORS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        {!user && (
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input w-full" placeholder="Default: password123" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">PIN Code</label>
          <input type="text" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} className="input w-32" placeholder="1234" maxLength={4} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name || !form.email}>
            {saving ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RolePermissions({ role }) {
  const perms = ROLE_PERMISSIONS[role] || [];
  const grouped = {
    core: ['dashboard', 'pos', 'orders', 'customers', 'notifications', 'settings'],
    management: ['products', 'categories', 'inventory', 'suppliers', 'expenses'],
    advanced: ['reports', 'employees', 'analytics'],
    admin: ['users:manage', 'products:manage', 'backup:manage', 'inventory:adjust'],
  };

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([group, items]) => {
        const hasAny = items.some(p => perms.includes(p));
        if (!hasAny) return null;
        return (
          <div key={group} className="flex flex-wrap gap-1">
            {items.filter(p => perms.includes(p)).map(p => (
              <Badge key={p} variant="ghost" className="text-[10px] capitalize">{p.replace(':', ' ')}</Badge>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('shop');
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, usersRes] = await Promise.all([
        settingsService.getAll(),
        userService.getAll(),
      ]);
      setSettings(settingsRes.settings || {});
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: String(value) }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await settingsService.update(settings);
      dispatch(addToast({ title: 'Settings Saved', description: 'All settings have been saved successfully', variant: 'success' }));
    } catch (err) {
      dispatch(addToast({ title: 'Error', description: 'Failed to save settings', variant: 'danger' }));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      setLogoPreview(dataUrl);
      updateSetting('shop_logo', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await userService.delete(userId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserModal(true);
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserModal(true);
  };

  const sampleAmount = 1234.56;

  const formatAmount = (amount) => {
    const sym = settings.currency_symbol || 'Rs.';
    const pos = settings.currency_position || 'before';
    const dec = parseInt(settings.decimal_places || '0');
    const formatted = Number(amount).toFixed(dec);
    return pos === 'before' ? `${sym} ${formatted}` : `${formatted} ${sym}`;
  };

  const userRoleColor = (role) => ROLE_COLORS[role] || ROLE_COLORS.cashier;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Settings</h1>
          <p className="text-foreground-muted">Configure your POS system preferences</p>
        </div>
        <Button onClick={saveAll} disabled={saving}>
          <FiSave className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="flex gap-6">
        <div className="w-56 shrink-0">
          <Card className="p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200',
                    activeTab === tab.id ? 'bg-accent/10 text-accent' : 'hover:bg-background-tertiary text-foreground-secondary'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold font-heading">{tabs.find(t => t.id === activeTab)?.label} Settings</h2>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* ========== SHOP TAB ========== */}
              {activeTab === 'shop' && (
                <div className="space-y-6">
                  <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-background flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {logoPreview || settings.shop_logo ? (
                        <img src={logoPreview || settings.shop_logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <FiImage className="w-6 h-6 text-foreground-muted" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Shop Logo</p>
                      <p className="text-xs text-foreground-muted">Upload your shop logo (will appear on receipts)</p>
                      <label className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-accent cursor-pointer hover:underline">
                        <FiImage className="w-3 h-3" /> Upload Logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Shop Name</label>
                      <input type="text" value={settings.shop_name || ''} onChange={e => updateSetting('shop_name', e.target.value)} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input type="email" value={settings.shop_email || ''} onChange={e => updateSetting('shop_email', e.target.value)} className="input w-full" placeholder="info@tuckshop.com" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <textarea rows={2} value={settings.shop_address || ''} onChange={e => updateSetting('shop_address', e.target.value)} className="input w-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone</label>
                      <input type="text" value={settings.shop_phone || ''} onChange={e => updateSetting('shop_phone', e.target.value)} className="input w-full" />
                    </div>
                  </div>
                </div>
              )}

              {/* ========== TAX TAB ========== */}
              {activeTab === 'tax' && (
                <div className="space-y-6">
                  <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                    <p className="text-sm text-accent font-medium">Tax Configuration</p>
                    <p className="text-xs text-foreground-muted mt-1">Configure tax rates applied to all sales</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                      <div className="relative">
                        <input type="number" min="0" max="100" step="0.1"
                          value={settings.tax_rate || '0'}
                          onChange={e => updateSetting('tax_rate', e.target.value)}
                          className="input w-32 pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Tax Registration Number</label>
                      <input type="text" value={settings.tax_number || ''} onChange={e => updateSetting('tax_number', e.target.value)} className="input w-full" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg">
                    <div>
                      <p className="font-medium">Tax Inclusive Pricing</p>
                      <p className="text-sm text-foreground-muted">Prices shown include tax (GST inclusive)</p>
                    </div>
                    <Toggle enabled={settings.tax_inclusive === 'true'} onChange={(val) => updateSetting('tax_inclusive', val ? 'true' : 'false')} />
                  </div>

                  <div className="p-4 bg-background-tertiary rounded-lg">
                    <p className="text-xs text-foreground-muted mb-2">Preview</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Base: <strong>{formatAmount(sampleAmount)}</strong></span>
                      <FiPlus className="w-3 h-3 text-foreground-muted" />
                      <span>Tax ({settings.tax_rate || 0}%): <strong className="text-accent">{formatAmount(Number(sampleAmount) * (Number(settings.tax_rate || 0) / 100))}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* ========== CURRENCY TAB ========== */}
              {activeTab === 'currency' && (
                <div className="space-y-6">
                  <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                    <p className="text-sm text-accent font-medium">Currency Settings</p>
                    <p className="text-xs text-foreground-muted mt-1">Configure how monetary values are displayed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Currency</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CURRENCIES.map(c => (
                        <button
                          key={c.code}
                          onClick={() => {
                            updateSetting('currency', c.code);
                            updateSetting('currency_symbol', c.symbol);
                          }}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all',
                            settings.currency === c.code ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                          )}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <p className="text-sm font-medium mt-1">{c.code}</p>
                          <p className="text-xs text-foreground-muted">{c.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Symbol</label>
                      <input type="text" value={settings.currency_symbol || 'Rs.'} onChange={e => updateSetting('currency_symbol', e.target.value)} className="input w-24" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Symbol Position</label>
                      <div className="flex gap-2">
                        {['before', 'after'].map(pos => (
                          <button
                            key={pos}
                            onClick={() => updateSetting('currency_position', pos)}
                            className={cn(
                              'flex-1 p-2 rounded-lg text-sm font-medium capitalize transition-colors',
                              settings.currency_position === pos ? 'bg-accent text-white' : 'bg-background-tertiary text-foreground-secondary hover:bg-border'
                            )}
                          >
                            {pos === 'before' ? `${settings.currency_symbol || 'Rs.'} 100` : `100 ${settings.currency_symbol || 'Rs.'}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Decimal Places</label>
                    <div className="flex gap-2">
                      {[0, 2].map(d => (
                        <button
                          key={d}
                          onClick={() => updateSetting('decimal_places', String(d))}
                          className={cn(
                            'px-6 py-2 rounded-lg text-sm font-medium transition-colors',
                            parseInt(settings.decimal_places || '0') === d ? 'bg-accent text-white' : 'bg-background-tertiary text-foreground-secondary hover:bg-border'
                          )}
                        >
                          {d === 0 ? '0 (No decimals)' : '2 (e.g. 1,234.56)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-background-tertiary rounded-lg">
                    <p className="text-xs text-foreground-muted mb-2">Live Preview</p>
                    <p className="text-2xl font-bold text-accent font-mono">{formatAmount(sampleAmount)}</p>
                    <p className="text-xs text-foreground-muted mt-1">
                      {settings.currency || 'PKR'} &middot; Symbol: {settings.currency_position || 'before'} &middot; {settings.decimal_places || '0'} decimals
                    </p>
                  </div>
                </div>
              )}

              {/* ========== RECEIPT TAB ========== */}
              {activeTab === 'receipt' && (
                <div className="space-y-6">
                  <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                    <p className="text-sm text-accent font-medium">Thermal Printer & Receipt Setup</p>
                    <p className="text-xs text-foreground-muted mt-1">Configure receipt printing for 58mm and 80mm thermal printers</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Paper Size</label>
                    <div className="flex gap-3">
                      {[
                        { value: '58', label: '58mm', desc: '2.28 inches - Small receipts' },
                        { value: '80', label: '80mm', desc: '3.15 inches - Standard receipts' },
                      ].map((p) => (
                        <button
                          key={p.value}
                          onClick={() => updateSetting('paper_width', p.value)}
                          className={cn(
                            'flex-1 p-4 rounded-xl border-2 text-center transition-all',
                            settings.paper_width === p.value ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                          )}
                        >
                          <FiPrinter className={cn('w-6 h-6 mx-auto mb-2', settings.paper_width === p.value ? 'text-accent' : 'text-foreground-muted')} />
                          <p className="font-medium text-sm">{p.label}</p>
                          <p className="text-xs text-foreground-muted">{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Receipt Header</label>
                      <textarea rows={2} value={settings.receipt_header || ''} onChange={e => updateSetting('receipt_header', e.target.value)} className="input w-full" placeholder="Thank you for your purchase!" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Receipt Footer</label>
                      <textarea rows={2} value={settings.receipt_footer || ''} onChange={e => updateSetting('receipt_footer', e.target.value)} className="input w-full" placeholder="Visit us again!" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Number of Copies</label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          onClick={() => updateSetting('copies', String(n))}
                          className={cn(
                            'w-10 h-10 rounded-lg text-sm font-medium transition-colors',
                            (settings.copies || '1') === String(n) ? 'bg-accent text-white' : 'bg-background-tertiary text-foreground-secondary hover:bg-border'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                      <span className="text-xs text-foreground-muted ml-2">copies per print</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg">
                      <div>
                        <p className="font-medium">Show Logo on Receipt</p>
                        <p className="text-sm text-foreground-muted">Print shop logo at the top of receipts</p>
                      </div>
                      <Toggle enabled={settings.show_logo === 'true'} onChange={(val) => updateSetting('show_logo', val ? 'true' : 'false')} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg">
                      <div>
                        <p className="font-medium">Show Tax Breakdown</p>
                        <p className="text-sm text-foreground-muted">Display tax amount separately on receipts</p>
                      </div>
                      <Toggle enabled={settings.show_tax === 'true'} onChange={(val) => updateSetting('show_tax', val ? 'true' : 'false')} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background-tertiary rounded-lg">
                      <div>
                        <p className="font-medium">Auto Print Receipt</p>
                        <p className="text-sm text-foreground-muted">Automatically print receipt after each sale</p>
                      </div>
                      <Toggle enabled={settings.auto_print === 'true'} onChange={(val) => updateSetting('auto_print', val ? 'true' : 'false')} />
                    </div>
                  </div>

                  <div className="p-4 bg-background-tertiary rounded-lg border border-border">
                    <p className="text-xs text-foreground-muted mb-2">Receipt Preview</p>
                    <div className="font-mono text-xs leading-relaxed bg-white text-black rounded-lg p-4 max-w-xs mx-auto">
                      {settings.show_logo === 'true' && <div className="text-center text-lg mb-1">{settings.shop_logo ? '🖼️' : '🏪'}</div>}
                      <div className="text-center font-bold text-sm">{settings.shop_name || 'Shop Name'}</div>
                      <div className="text-center text-[10px] text-gray-500">{settings.shop_address || 'Address'}</div>
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      <div>Invoice: INV-000001</div>
                      <div>Item{' '.repeat(12)}Qty  Total</div>
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      <div className="flex justify-between font-bold">TOTAL <span className="text-accent">{formatAmount(sampleAmount)}</span></div>
                      <div className="border-t border-dashed border-gray-300 my-2" />
                      <div className="text-center text-[10px] text-gray-500">{settings.receipt_header || 'Thank you!'}</div>
                      {settings.receipt_footer && <div className="text-center text-[10px] text-gray-500">{settings.receipt_footer}</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* ========== USERS TAB ========== */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg flex-1">
                      <p className="text-sm text-accent font-medium">User Management</p>
                      <p className="text-xs text-foreground-muted mt-1">{users.length} users &middot; Manage roles and permissions</p>
                    </div>
                    <Button onClick={openAddUser} className="ml-4">
                      <FiPlus className="w-4 h-4 mr-2" /> Add User
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {users.map((u) => {
                      const rc = userRoleColor(u.role);
                      return (
                        <div key={u.id} className="flex items-center gap-4 p-4 bg-background-tertiary rounded-xl border border-border">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold', rc.bg, rc.text)}>
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{u.name}</p>
                              <Badge variant={u.is_active ? 'success' : 'danger'} className="text-[10px]">
                                {u.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-xs text-foreground-muted">{u.email} {u.phone ? `· ${u.phone}` : ''}</p>
                            <RolePermissions role={u.role} />
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className={cn('text-[11px] capitalize', rc.bg, rc.text)}>{rc.label}</Badge>
                            <div className="flex gap-1 mt-2">
                              <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg hover:bg-border transition-colors" title="Edit">
                                <FiSettings className="w-3.5 h-3.5 text-foreground-muted" />
                              </button>
                              {u.is_active && (
                                <button onClick={() => handleDeactivateUser(u.id)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors" title="Deactivate">
                                  <FiTrash2 className="w-3.5 h-3.5 text-danger" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {users.length === 0 && (
                      <div className="text-center py-12 text-foreground-muted">
                        <FiUser className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No users found</p>
                        <p className="text-xs mt-1">Add your first user to get started</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-background-tertiary rounded-lg">
                    <p className="text-sm font-medium mb-3 flex items-center gap-2"><FiShield className="w-4 h-4 text-accent" /> Role Permissions Reference</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { role: 'Admin', perms: 'Full access to all features including user management and backups', color: 'text-danger' },
                        { role: 'Manager', perms: 'All features except user/backup management', color: 'text-accent' },
                        { role: 'Cashier', perms: 'POS, orders, customers, and dashboard only', color: 'text-success' },
                        { role: 'Inventory', perms: 'Products, categories, inventory, suppliers', color: 'text-warning' },
                      ].map(r => (
                        <div key={r.role} className="p-3 rounded-lg bg-background-secondary border border-border">
                          <p className={cn('font-medium text-sm', r.color)}>{r.role}</p>
                          <p className="text-xs text-foreground-muted mt-0.5">{r.perms}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>

      <UserModal isOpen={userModal} onClose={() => setUserModal(false)} user={editingUser} onSave={loadData} />
    </motion.div>
  );
}
