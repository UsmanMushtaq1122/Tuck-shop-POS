import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FiAlertTriangle, FiPackage, FiTrendingDown, FiClock,
  FiTruck, FiPlus, FiSearch, FiChevronDown, FiChevronUp,
  FiMinus, FiCheck, FiX, FiCalendar, FiAlertCircle,
  FiRefreshCw, FiDollarSign, FiFilter, FiEye, FiTrash2
} from 'react-icons/fi';
import { inventoryService, productService, purchaseOrderService, supplierService } from '@/services/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RoleGuard } from '@/components/RoleGuard';

const expiryConfig = {
  expired: { label: 'Expired', variant: 'danger' },
  critical: { label: 'Expiring Soon', variant: 'danger' },
  warning: { label: 'Warning', variant: 'warning' },
  good: { label: 'Good', variant: 'success' },
};

export default function Inventory() {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState({ lowStock: [], outOfStock: [] });
  const [logs, setLogs] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [activeTab, setActiveTab] = useState('alerts');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showPOCreateModal, setShowPOCreateModal] = useState(false);
  const [showDeletePOModal, setShowDeletePOModal] = useState(false);
  const [expandedPO, setExpandedPO] = useState(null);
  const [deletingPO, setDeletingPO] = useState(null);

  const [adjustForm, setAdjustForm] = useState({
    product_id: '', type: 'in', quantity: 1, notes: ''
  });

  const [poForm, setPoForm] = useState({
    supplier_id: '', supplier_name: '', notes: '', items: [{ product_id: '', product_name: '', quantity: 1, unit_cost: 0 }]
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, alertsRes, logsRes, expiringRes, poRes, productsRes] = await Promise.all([
        productService.getStats(),
        inventoryService.getAlerts(),
        inventoryService.getLogs(),
        productService.getExpiring(),
        purchaseOrderService.getAll(),
        productService.getAll(),
      ]);
      setStats(statsRes);
      setAlerts(alertsRes);
      setLogs(logsRes.logs || []);
      setExpiringProducts(expiringRes.products || []);
      setPurchaseOrders(poRes.orders || []);
      setProducts(productsRes.products || []);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await supplierService.getAll();
      setSuppliers(res.suppliers || []);
    } catch { }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (showPOCreateModal) loadSuppliers(); }, [showPOCreateModal]);

  const handleAdjust = async () => {
    try {
      await inventoryService.adjust(adjustForm);
      setShowAdjustModal(false);
      setAdjustForm({ product_id: '', type: 'in', quantity: 1, notes: '' });
      loadData();
    } catch (error) {
      console.error('Adjustment failed:', error);
    }
  };

  const handleCreatePO = async () => {
    try {
      const payload = {
        supplier_id: poForm.supplier_id,
        supplier_name: poForm.supplier_name || suppliers.find(s => s.id === poForm.supplier_id)?.name || '',
        notes: poForm.notes,
        items: poForm.items.filter(i => i.product_name && i.quantity > 0),
      };
      await purchaseOrderService.create(payload);
      setShowPOCreateModal(false);
      setPoForm({ supplier_id: '', supplier_name: '', notes: '', items: [{ product_id: '', product_name: '', quantity: 1, unit_cost: 0 }] });
      loadData();
    } catch (error) {
      console.error('Create PO failed:', error);
    }
  };

  const handleReceivePO = async (id) => {
    try {
      await purchaseOrderService.receive(id);
      loadData();
    } catch (error) {
      console.error('Receive PO failed:', error);
    }
  };

  const handleDeletePO = async () => {
    try {
      await purchaseOrderService.delete(deletingPO.id);
      setShowDeletePOModal(false);
      setDeletingPO(null);
      loadData();
    } catch (error) {
      console.error('Delete PO failed:', error);
    }
  };

  const addPOItem = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', product_name: '', quantity: 1, unit_cost: 0 }]
    }));
  };

  const removePOItem = (idx) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const updatePOItem = (idx, field, value) => {
    setPoForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const poTotal = poForm.items.reduce((sum, i) => sum + (parseFloat(i.unit_cost) || 0) * (parseInt(i.quantity) || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-background-tertiary rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-background-tertiary rounded-xl animate-pulse" />
      </div>
    );
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const wellStocked = products.filter(p => p.stock_quantity > p.min_stock).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Inventory</h1>
          <p className="text-foreground-muted">Stock levels, adjustments, and purchase management</p>
        </div>
        <div className="flex items-center gap-2">
          <RoleGuard roles={['admin', 'manager', 'inventory']}>
            <Button variant="secondary" onClick={() => setShowPOCreateModal(true)}>
              <FiTruck className="w-4 h-4 mr-2" />
              New PO
            </Button>
            <Button onClick={() => setShowAdjustModal(true)}>
              <FiPlus className="w-4 h-4 mr-2" />
              Adjust Stock
            </Button>
          </RoleGuard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-warning/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-xl">
              <FiAlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.lowStock || 0}</p>
              <p className="text-sm text-foreground-muted">Low Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-danger/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-danger/10 rounded-xl">
              <FiX className="w-6 h-6 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.outOfStock || 0}</p>
              <p className="text-sm text-foreground-muted">Out of Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-accent/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-xl">
              <FiPackage className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStock}</p>
              <p className="text-sm text-foreground-muted">Total Units</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-xl">
              <FiCheck className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{wellStocked}</p>
              <p className="text-sm text-foreground-muted">Well Stocked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex border-b border-border">
            {[
              { id: 'alerts', label: 'Alerts', icon: FiAlertTriangle, count: alerts.lowStock.length + alerts.outOfStock.length },
              { id: 'expiry', label: 'Expiry', icon: FiCalendar, count: expiringProducts.length },
              { id: 'logs', label: 'History', icon: FiClock },
              { id: 'purchase-orders', label: 'Purchase Orders', icon: FiTruck, count: purchaseOrders.length },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-foreground-muted hover:text-foreground')}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && <Badge variant={tab.id === 'alerts' ? 'danger' : tab.id === 'expiry' ? 'warning' : 'info'}>{tab.count}</Badge>}
                </button>
              );
            })}
          </div>

          {activeTab === 'alerts' && (
            <div>
              {alerts.outOfStock.length === 0 && alerts.lowStock.length === 0 ? (
                <div className="p-8 text-center text-foreground-muted">
                  <FiCheck className="w-12 h-12 mx-auto mb-3 text-success" />
                  <p>All products are well stocked</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {alerts.outOfStock.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 hover:bg-background-tertiary/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-danger/10 rounded-lg flex items-center justify-center text-xl">
                          {p.image || '📦'}
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-foreground-muted">{p.category_name} | SKU: {p.sku}</p>
                        </div>
                      </div>
                      <Badge variant="danger">Out of Stock</Badge>
                    </div>
                  ))}
                  {alerts.lowStock.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 hover:bg-background-tertiary/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center text-xl">
                          {p.image || '📦'}
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-foreground-muted">{p.category_name} | Min: {p.min_stock}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="warning">{p.stock_quantity} left</Badge>
                        <Button size="sm" variant="secondary" onClick={() => { setAdjustForm({ product_id: p.id, type: 'in', quantity: p.min_stock, notes: 'Auto reorder' }); setShowAdjustModal(true); }}>Reorder</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'expiry' && (
            <div>
              {expiringProducts.length === 0 ? (
                <div className="p-8 text-center text-foreground-muted">
                  <FiCalendar className="w-12 h-12 mx-auto mb-3 text-success" />
                  <p>No products expiring soon</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {expiringProducts.map(p => {
                    const status = expiryConfig[p.expiry_status] || expiryConfig.good;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 hover:bg-background-tertiary/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-background-tertiary rounded-lg flex items-center justify-center text-xl">
                            {p.image || '📦'}
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-foreground-muted">Expires: {p.expiry_date}</p>
                          </div>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              {logs.length === 0 ? (
                <div className="p-8 text-center text-foreground-muted">
                  <FiClock className="w-12 h-12 mx-auto mb-3" />
                  <p>No inventory history yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-center justify-between p-4 hover:bg-background-tertiary/30">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                          log.type === 'in' ? 'bg-success/10' : log.type === 'out' ? 'bg-danger/10' : 'bg-warning/10')}>
                          {log.type === 'in' ? <FiPlus className="w-5 h-5 text-success" /> :
                           log.type === 'out' ? <FiMinus className="w-5 h-5 text-danger" /> :
                           <FiAlertCircle className="w-5 h-5 text-warning" />}
                        </div>
                        <div>
                          <p className="font-medium">{log.product_name}</p>
                          <p className="text-xs text-foreground-muted">
                            {log.type === 'in' ? 'Stock In' : log.type === 'out' ? 'Stock Out' : 'Adjustment'}
                            {log.user_name && ` by ${log.user_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn('font-medium', log.type === 'in' ? 'text-success' : log.type === 'out' ? 'text-danger' : 'text-warning')}>
                          {log.type === 'in' ? '+' : ''}{log.quantity} ({log.previous_stock} → {log.new_stock})
                        </p>
                        <p className="text-xs text-foreground-muted">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'purchase-orders' && (
            <div>
              {purchaseOrders.length === 0 ? (
                <div className="p-8 text-center text-foreground-muted">
                  <FiTruck className="w-12 h-12 mx-auto mb-3" />
                  <p>No purchase orders yet</p>
                  <Button className="mt-3" onClick={() => setShowPOCreateModal(true)}>
                    <FiPlus className="w-4 h-4 mr-2" />
                    Create PO
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {purchaseOrders.map(po => (
                    <div key={po.id}>
                      <div className="flex items-center justify-between p-4 hover:bg-background-tertiary/30">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-background-tertiary rounded-lg flex items-center justify-center">
                            <FiTruck className="w-5 h-5 text-foreground-muted" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{po.order_number}</p>
                            <p className="text-xs text-foreground-muted">{po.supplier_name || 'Unknown'} | {formatDate(po.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(po.total_amount)}</p>
                            <p className="text-xs text-foreground-muted">{po.total_quantity} units</p>
                          </div>
                          <Badge variant={po.status === 'received' ? 'success' : po.status === 'cancelled' ? 'danger' : 'warning'}>
                            {po.status}
                          </Badge>
                          <div className="flex gap-1">
                            <button onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                              className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
                              <FiEye className="w-4 h-4" />
                            </button>
                            {po.status === 'pending' && (
                              <>
                                <RoleGuard roles={['admin', 'manager', 'inventory']}>
                                  <button onClick={() => handleReceivePO(po.id)}
                                    className="p-2 rounded-lg hover:bg-success/10 text-success transition-colors" title="Receive">
                                    <FiCheck className="w-4 h-4" />
                                  </button>
                                </RoleGuard>
                                <RoleGuard roles={['admin']}>
                                  <button onClick={() => { setDeletingPO(po); setShowDeletePOModal(true); }}
                                    className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors" title="Delete">
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </RoleGuard>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {expandedPO === po.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 bg-background-tertiary/30">
                              <p className="text-xs text-foreground-muted mb-2">{po.notes || 'No notes'}</p>
                              {po.status === 'received' && <p className="text-xs text-success">Received: {formatDate(po.received_date)}</p>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showAdjustModal && (
          <Modal open={showAdjustModal} onClose={() => { setShowAdjustModal(false); setAdjustForm({ product_id: '', type: 'in', quantity: 1, notes: '' }); }} title="Adjust Stock" size="md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Product *</label>
                <select value={adjustForm.product_id} onChange={(e) => setAdjustForm(prev => ({ ...prev, product_id: e.target.value }))} className="input">
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Adjustment Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'in', label: 'Stock In', color: 'success' },
                    { value: 'out', label: 'Stock Out', color: 'danger' },
                    { value: 'set', label: 'Set Quantity', color: 'warning' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setAdjustForm(prev => ({ ...prev, type: opt.value }))}
                      className={cn('flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                        adjustForm.type === opt.value
                          ? `bg-${opt.color}/10 border-${opt.color}/30 text-${opt.color}`
                          : 'bg-background-tertiary border-border text-foreground-muted hover:bg-border')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {adjustForm.product_id && (
                <div className={cn('p-3 rounded-lg border text-sm',
                  adjustForm.type === 'in' ? 'bg-success/5 border-success/20' :
                  adjustForm.type === 'out' ? 'bg-danger/5 border-danger/20' : 'bg-warning/5 border-warning/20')}>
                  Current stock:{' '}
                  <strong>{products.find(p => p.id === adjustForm.product_id)?.stock_quantity || 0}</strong>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity *</label>
                <input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  min="1" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes</label>
                <input type="text" value={adjustForm.notes} onChange={(e) => setAdjustForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Reason for adjustment" className="input" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowAdjustModal(false); setAdjustForm({ product_id: '', type: 'in', quantity: 1, notes: '' }); }}>Cancel</Button>
                <Button onClick={handleAdjust} disabled={!adjustForm.product_id || !adjustForm.quantity}>Apply Adjustment</Button>
              </div>
            </div>
          </Modal>
        )}

        {showPOCreateModal && (
          <Modal open={showPOCreateModal} onClose={() => { setShowPOCreateModal(false); setPoForm({ supplier_id: '', supplier_name: '', notes: '', items: [{ product_id: '', product_name: '', quantity: 1, unit_cost: 0 }] }); }} title="Create Purchase Order" size="xl">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Supplier</label>
                  <select value={poForm.supplier_id} onChange={(e) => setPoForm(prev => ({ ...prev, supplier_id: e.target.value }))} className="input">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notes</label>
                  <input type="text" value={poForm.notes} onChange={(e) => setPoForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes" className="input" />
                </div>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-background-tertiary/50 px-4 py-2 flex items-center text-xs font-medium text-foreground-muted">
                  <span className="flex-[2]">Product</span>
                  <span className="flex-1 text-center">Qty</span>
                  <span className="flex-1 text-center">Unit Cost</span>
                  <span className="flex-1 text-center">Total</span>
                  <span className="w-8" />
                </div>
                {poForm.items.map((item, idx) => {
                  const matchedProduct = products.find(p => p.id === item.product_id);
                  return (
                    <div key={idx} className="flex items-center gap-2 px-4 py-2 border-t border-border">
                      <select value={item.product_id} onChange={(e) => {
                        const p = products.find(pr => pr.id === e.target.value);
                        updatePOItem(idx, 'product_id', e.target.value);
                        updatePOItem(idx, 'product_name', p ? p.name : '');
                        updatePOItem(idx, 'unit_cost', p ? p.purchase_price : 0);
                      }} className="input flex-[2] text-sm">
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" value={item.quantity} onChange={(e) => updatePOItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                        min="1" className="input flex-1 text-sm text-center" />
                      <input type="number" value={item.unit_cost} onChange={(e) => updatePOItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                        min="0" step="0.01" className="input flex-1 text-sm text-center" />
                      <span className="flex-1 text-sm text-center font-medium">{formatCurrency((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity) || 0))}</span>
                      <button onClick={() => removePOItem(idx)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors" disabled={poForm.items.length === 1}>
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={addPOItem}>
                  <FiPlus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
                <div className="text-right">
                  <span className="text-sm text-foreground-muted">Total: </span>
                  <span className="text-lg font-bold">{formatCurrency(poTotal)}</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowPOCreateModal(false); setPoForm({ supplier_id: '', supplier_name: '', notes: '', items: [{ product_id: '', product_name: '', quantity: 1, unit_cost: 0 }] }); }}>Cancel</Button>
                <Button onClick={handleCreatePO} disabled={!poForm.items.some(i => i.product_id)}>Create Order</Button>
              </div>
            </div>
          </Modal>
        )}

        {showDeletePOModal && deletingPO && (
          <Modal open={showDeletePOModal} onClose={() => { setShowDeletePOModal(false); setDeletingPO(null); }} title="Delete Purchase Order" size="sm">
            <div className="space-y-4">
              <p className="text-sm">Are you sure you want to delete <strong>{deletingPO.order_number}</strong>?</p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowDeletePOModal(false); setDeletingPO(null); }}>Cancel</Button>
                <Button variant="danger" onClick={handleDeletePO}>Delete</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
