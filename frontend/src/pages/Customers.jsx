import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FiSearch, FiPlus, FiPhone, FiUser, FiMail, FiMapPin,
  FiX, FiShoppingBag, FiStar, FiEdit2, FiTrash2,
  FiRefreshCw, FiDollarSign, FiCreditCard, FiCalendar
} from 'react-icons/fi';
import { customerService } from '@/services/api';
import { formatCurrency, formatDate, getInitials, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RoleGuard } from '@/components/RoleGuard';

export default function Customers() {
  const { user } = useSelector((state) => state.auth);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [viewingOrders, setViewingOrders] = useState([]);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: ''
  });

  const [creditForm, setCreditForm] = useState({
    amount: 0, type: 'add'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = searchQuery ? { search: searchQuery } : {};
      const res = await customerService.getAll(params);
      setCustomers(res.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => setForm({ name: '', phone: '', email: '', address: '' });

  const handleSubmit = async () => {
    try {
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, form);
      } else {
        await customerService.create(form);
      }
      setShowModal(false);
      setEditingCustomer(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save customer:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await customerService.delete(deletingCustomer.id);
      setShowDeleteModal(false);
      setDeletingCustomer(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const openDetail = async (customer) => {
    try {
      const res = await customerService.getById(customer.id);
      setViewingCustomer(res.customer);
      setViewingOrders(res.orders || []);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load customer details:', error);
    }
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setShowModal(true);
  };

  const handleCreditAdjust = async () => {
    try {
      await customerService.update(viewingCustomer.id, {
        ...viewingCustomer,
        credit_balance: creditForm.type === 'add'
          ? (viewingCustomer.credit_balance || 0) + Math.abs(creditForm.amount)
          : Math.max(0, (viewingCustomer.credit_balance || 0) - Math.abs(creditForm.amount))
      });
      setShowCreditModal(false);
      setCreditForm({ amount: 0, type: 'add' });
      if (viewingCustomer) openDetail(viewingCustomer);
      loadData();
    } catch (error) {
      console.error('Credit adjustment failed:', error);
    }
  };

  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
  const avgValue = customers.length > 0 ? totalRevenue / customers.length : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-background-tertiary rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-background-tertiary rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Customers</h1>
          <p className="text-foreground-muted">Manage your customer database & loyalty program</p>
        </div>
        <RoleGuard roles={['admin', 'manager', 'cashier']}>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </RoleGuard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-3xl font-bold">{customers.length}</p>
            <p className="text-sm text-foreground-muted">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-3xl font-bold">{customers.reduce((a, c) => a + (c.loyalty_points || 0), 0).toLocaleString()}</p>
            <p className="text-sm text-foreground-muted">Total Loyalty Points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-foreground-muted">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-3xl font-bold">{formatCurrency(avgValue)}</p>
            <p className="text-sm text-foreground-muted">Avg. Customer Value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input type="text" placeholder="Search customers by name, phone, email..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer, index) => (
          <motion.div key={customer.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
            <Card hover className="cursor-pointer group" onClick={() => openDetail(customer)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {getInitials(customer.name)}
                  </div>
                  <div className="flex items-center gap-1">
                    {(customer.loyalty_points || 0) > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 rounded-full">
                        <FiStar className="w-3 h-3 text-accent" />
                        <span className="text-xs font-medium text-accent">{customer.loyalty_points} pts</span>
                      </div>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-1">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                        className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <RoleGuard roles={['admin']}>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingCustomer(customer); setShowDeleteModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </RoleGuard>
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold font-heading text-lg mb-3">{customer.name}</h3>
                <div className="space-y-2 text-sm text-foreground-muted">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <FiPhone className="w-4 h-4 shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <FiMail className="w-4 h-4 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.credit_balance > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg">
                      <FiCreditCard className="w-4 h-4 text-warning" />
                      <span className="text-warning font-medium">Credit: {formatCurrency(customer.credit_balance)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span>Total Spent</span>
                    <span className="font-semibold text-accent">{formatCurrency(customer.total_purchases || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Joined</span>
                    <span>{formatDate(customer.created_at)}</span>
                  </div>
                </div>
                {(customer.loyalty_points || 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground-muted">Loyalty Progress</span>
                      <span className="text-xs font-medium">{Math.floor((customer.loyalty_points || 0) / 100)} / 10 tiers</span>
                    </div>
                    <div className="w-full h-2 bg-background-tertiary rounded-full mt-2 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${((customer.loyalty_points || 0) % 1000) / 10}%` }}
                        className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUser className="w-8 h-8 text-foreground-muted" />
          </div>
          <h3 className="text-lg font-medium mb-1">No customers found</h3>
          <p className="text-sm text-foreground-muted mb-4">
            {searchQuery ? 'Try a different search term' : 'Add your first customer'}
          </p>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal open={showModal} onClose={() => { setShowModal(false); setEditingCustomer(null); resetForm(); }}
            title={editingCustomer ? 'Edit Customer' : 'Add New Customer'} size="md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Customer Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="03XX-XXXXXXX" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com" className="input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Address</label>
                <textarea value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address" rows={2} className="input resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowModal(false); setEditingCustomer(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.name}>{editingCustomer ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </Modal>
        )}

        {showDeleteModal && deletingCustomer && (
          <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletingCustomer(null); }} title="Delete Customer" size="sm">
            <div className="space-y-4">
              <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
                <p className="text-sm">Are you sure you want to delete <strong>{deletingCustomer.name}</strong>?</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeletingCustomer(null); }}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </Modal>
        )}

        {showDetailModal && viewingCustomer && (
          <Modal open={showDetailModal} onClose={() => { setShowDetailModal(false); setViewingCustomer(null); setViewingOrders([]); }}
            title="Customer Profile" size="xl">
            <div className="space-y-5">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 bg-gradient-to-br from-accent to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0">
                  {getInitials(viewingCustomer.name)}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold font-heading">{viewingCustomer.name}</h2>
                  <p className="text-sm text-foreground-muted">Customer since {formatDate(viewingCustomer.created_at)}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="info">{viewingCustomer.loyalty_points || 0} Points</Badge>
                    {viewingCustomer.credit_balance > 0 ? (
                      <Badge variant="warning">Credit: {formatCurrency(viewingCustomer.credit_balance)}</Badge>
                    ) : (
                      <Badge variant="success">No Credit</Badge>
                    )}
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <RoleGuard roles={['admin', 'manager']}>
                    <Button variant="secondary" size="sm" onClick={() => { setCreditForm({ amount: 0, type: 'add' }); setShowCreditModal(true); }}>
                      <FiCreditCard className="w-4 h-4 mr-1" />
                      Adjust Credit
                    </Button>
                  </RoleGuard>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(viewingCustomer)}>
                    <FiEdit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {viewingCustomer.phone && (
                  <div className="p-3 bg-background-tertiary rounded-lg">
                    <FiPhone className="w-4 h-4 text-foreground-muted mb-1" />
                    <p className="text-sm">{viewingCustomer.phone}</p>
                  </div>
                )}
                {viewingCustomer.email && (
                  <div className="p-3 bg-background-tertiary rounded-lg">
                    <FiMail className="w-4 h-4 text-foreground-muted mb-1" />
                    <p className="text-sm truncate">{viewingCustomer.email}</p>
                  </div>
                )}
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <FiDollarSign className="w-4 h-4 text-foreground-muted mb-1" />
                  <p className="text-sm font-medium">{formatCurrency(viewingCustomer.total_purchases || 0)}</p>
                </div>
              </div>
              {viewingCustomer.address && (
                <div className="p-3 bg-background-tertiary rounded-lg">
                  <FiMapPin className="w-4 h-4 text-foreground-muted mb-1" />
                  <p className="text-sm">{viewingCustomer.address}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FiShoppingBag className="w-4 h-4" />
                  Purchase History
                </h3>
                {viewingOrders.length > 0 ? (
                  <div className="divide-y divide-border border border-border rounded-lg">
                    {viewingOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-sm font-medium">{order.order_number}</span>
                            <span className="text-xs text-foreground-muted ml-2">{formatDate(order.created_at)}</span>
                          </div>
                          <Badge variant="info">{order.payment_method}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatCurrency(order.total)}</span>
                          <Badge variant={order.status === 'completed' ? 'success' : 'warning'}>{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-foreground-muted bg-background-tertiary/30 rounded-lg">
                    <FiShoppingBag className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No orders yet</p>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {showCreditModal && viewingCustomer && (
          <Modal open={showCreditModal} onClose={() => { setShowCreditModal(false); setCreditForm({ amount: 0, type: 'add' }); }} title="Adjust Credit" size="sm">
            <div className="space-y-4">
              <div className="p-4 bg-background-tertiary rounded-lg text-center">
                <p className="text-sm text-foreground-muted">Current Credit Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(viewingCustomer.credit_balance || 0)}</p>
              </div>
              <div className="flex gap-2">
                {['add', 'deduct', 'set'].map(opt => (
                  <button key={opt} onClick={() => setCreditForm(prev => ({ ...prev, type: opt }))}
                    className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                      creditForm.type === opt
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-background-tertiary border-border text-foreground-muted')}>
                    {opt === 'add' ? 'Add' : opt === 'deduct' ? 'Deduct' : 'Set'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Amount</label>
                <input type="number" value={creditForm.amount} onChange={(e) => setCreditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  min="0" step="0.01" className="input" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowCreditModal(false); setCreditForm({ amount: 0, type: 'add' }); }}>Cancel</Button>
                <Button onClick={handleCreditAdjust} disabled={!creditForm.amount}>Apply</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
