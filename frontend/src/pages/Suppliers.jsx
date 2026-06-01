import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FiPlus, FiPhone, FiMail, FiMapPin, FiEdit2, FiTrash2,
  FiSearch, FiPackage, FiClock, FiTruck, FiRefreshCw
} from 'react-icons/fi';
import { supplierService } from '@/services/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RoleGuard } from '@/components/RoleGuard';

export default function Suppliers() {
  const { user } = useSelector((state) => state.auth);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [viewingProducts, setViewingProducts] = useState([]);
  const [viewingOrders, setViewingOrders] = useState([]);
  const [form, setForm] = useState({ name: '', contact: '', phone: '', email: '', address: '' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierService.getAll();
      setSuppliers(res.suppliers || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery)
  );

  const resetForm = () => setForm({ name: '', contact: '', phone: '', email: '', address: '' });

  const handleSubmit = async () => {
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, form);
      } else {
        await supplierService.create(form);
      }
      setShowModal(false);
      setEditingSupplier(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await supplierService.delete(deletingSupplier.id);
      setShowDeleteModal(false);
      setDeletingSupplier(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    }
  };

  const openDetail = async (supplier) => {
    try {
      const res = await supplierService.getById(supplier.id);
      setViewingSupplier(res.supplier);
      setViewingProducts(res.products || []);
      setViewingOrders(res.orders || []);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load supplier details:', error);
    }
  };

  const openEdit = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contact: supplier.contact || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-background-tertiary rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Suppliers</h1>
          <p className="text-foreground-muted">Manage your suppliers and vendors</p>
        </div>
        <RoleGuard roles={['admin', 'manager']}>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <FiPlus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input type="text" placeholder="Search suppliers by name, contact, phone..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier, index) => (
          <motion.div key={supplier.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
            <Card hover className="cursor-pointer group" onClick={() => openDetail(supplier)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-2xl">
                    🚚
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(supplier); }}
                      className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <RoleGuard roles={['admin']}>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingSupplier(supplier); setShowDeleteModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </RoleGuard>
                  </div>
                </div>
                <h3 className="font-semibold font-heading text-lg mb-3">{supplier.name}</h3>
                <div className="space-y-2 text-sm text-foreground-muted">
                  {supplier.contact && (
                    <div className="flex items-center gap-2">
                      <FiPhone className="w-4 h-4" />
                      <span>{supplier.contact}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <FiPhone className="w-4 h-4" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <FiMail className="w-4 h-4" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-2">
                      <FiMapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{supplier.address}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
                    <FiPackage className="w-4 h-4" />
                    <span>{supplier.product_count || 0} products</span>
                  </div>
                  <Badge variant="info">View Details</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-background-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <FiTruck className="w-8 h-8 text-foreground-muted" />
          </div>
          <h3 className="text-lg font-medium mb-1">No suppliers found</h3>
          <p className="text-sm text-foreground-muted mb-4">
            {searchQuery ? 'Try a different search term' : 'Add your first supplier to get started'}
          </p>
          <RoleGuard roles={['admin', 'manager']}>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <FiPlus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </RoleGuard>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal open={showModal} onClose={() => { setShowModal(false); setEditingSupplier(null); resetForm(); }}
            title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'} size="md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Supplier Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., ABC Distributors" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Contact Person</label>
                <input type="text" value={form.contact} onChange={(e) => setForm(prev => ({ ...prev, contact: e.target.value }))}
                  placeholder="e.g., Mr. Khan" className="input" />
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
                <Button variant="secondary" onClick={() => { setShowModal(false); setEditingSupplier(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.name}>{editingSupplier ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </Modal>
        )}

        {showDeleteModal && deletingSupplier && (
          <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletingSupplier(null); }} title="Delete Supplier" size="sm">
            <div className="space-y-4">
              <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
                <p className="text-sm">Are you sure you want to delete <strong>{deletingSupplier.name}</strong>?</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeletingSupplier(null); }}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </Modal>
        )}

        {showDetailModal && viewingSupplier && (
          <Modal open={showDetailModal} onClose={() => { setShowDetailModal(false); setViewingSupplier(null); setViewingProducts([]); setViewingOrders([]); }}
            title={viewingSupplier.name} size="xl">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-background-tertiary/50 rounded-lg">
                <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center text-3xl">🚚</div>
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {viewingSupplier.contact && <div><span className="text-foreground-muted">Contact:</span> {viewingSupplier.contact}</div>}
                    {viewingSupplier.phone && <div><span className="text-foreground-muted">Phone:</span> {viewingSupplier.phone}</div>}
                    {viewingSupplier.email && <div><span className="text-foreground-muted">Email:</span> {viewingSupplier.email}</div>}
                    {viewingSupplier.address && <div className="col-span-2"><span className="text-foreground-muted">Address:</span> {viewingSupplier.address}</div>}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FiPackage className="w-4 h-4" />
                  Products ({viewingProducts.length})
                </h4>
                {viewingProducts.length > 0 ? (
                  <div className="divide-y divide-border border border-border rounded-lg">
                    {viewingProducts.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm">{p.name}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-foreground-muted">{p.sku}</span>
                          <span className="font-medium">{formatCurrency(p.selling_price)}</span>
                          <Badge variant={p.stock_quantity > 0 ? 'success' : 'danger'}>{p.stock_quantity} in stock</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted">No products from this supplier</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Purchase Orders ({viewingOrders.length})
                </h4>
                {viewingOrders.length > 0 ? (
                  <div className="divide-y divide-border border border-border rounded-lg">
                    {viewingOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <span className="text-sm font-medium">{o.order_number}</span>
                          <span className="text-xs text-foreground-muted ml-2">{formatDate(o.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{formatCurrency(o.total_amount)}</span>
                          <Badge variant={o.status === 'received' ? 'success' : o.status === 'cancelled' ? 'danger' : 'warning'}>{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted">No purchase orders yet</p>
                )}
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
