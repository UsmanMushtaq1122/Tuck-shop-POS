import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiSearch, FiX, FiGrid, FiAlertTriangle, FiDollarSign } from 'react-icons/fi';
import { categoryService, productService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { RoleGuard } from '@/components/RoleGuard';
import { formatCurrency, cn } from '@/lib/utils';

const categoryIcons = ['🍪', '🥤', '✏️', '🍔', '🍦', '🍫', '🍞', '🛒', '📦', '🎁', '🧴', '💊', '🧊', '🌶️', '🥜', '🍿', '🧃', '💧', '🍬', '🍩'];
const categoryColors = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#06B6D4', '#84CC16', '#F43F5E', '#0EA5E9', '#A855F7', '#EAB308', '#22C55E', '#F97316', '#3B82F6', '#EC4899', '#8B5CF6'];

const statCards = [
  { label: 'Total Categories', get: (cats) => cats.length, icon: FiGrid, color: 'text-accent', bg: 'bg-accent/10' },
  { label: 'Total Products', get: (cats, prods) => prods.length, icon: FiPackage, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Low Stock Items', get: (cats, prods) => prods.filter(p => p.stock_quantity <= p.min_stock && p.stock_quantity > 0).length, icon: FiAlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  { label: 'Inventory Value', get: (cats, prods) => prods.reduce((s, p) => s + p.selling_price * p.stock_quantity, 0), icon: FiDollarSign, color: 'text-success', bg: 'bg-success/10', format: 'currency' },
];

export default function Categories() {
  const { user } = useSelector((state) => state.auth);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '📦', color: '#3B82F6' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([categoryService.getAll(), productService.getAll()]);
      setCategories(catRes.categories || []);
      setProducts(prodRes.products || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const resetForm = () => setForm({ name: '', description: '', icon: '📦', color: '#3B82F6' });

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, form);
      } else {
        await categoryService.create(form);
      }
      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await categoryService.delete(deletingCategory.id);
      setShowDeleteModal(false);
      setDeletingCategory(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '📦', color: cat.color || '#3B82F6' });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingCategory(null);
    resetForm();
    setShowModal(true);
  };

  const getCategoryProducts = (categoryId) => products.filter(p => p.category_id === categoryId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-background-tertiary rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-background-tertiary rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Categories</h1>
          <p className="text-foreground-muted mt-1">Manage product categories ({categories.length} total)</p>
        </div>
        <RoleGuard roles={['admin', 'manager']}>
          <Button onClick={openAdd}>
            <FiPlus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </RoleGuard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const val = stat.get(categories, products);
          return (
            <motion.div key={i} whileHover={{ y: -2 }} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.format === 'currency' ? formatCurrency(val) : val}</p>
                  <p className="text-xs text-foreground-muted">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input type="text" placeholder="Search categories..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCategories.map((category, index) => {
          const catProducts = getCategoryProducts(category.id);
          const totalValue = catProducts.reduce((sum, p) => sum + (p.selling_price * p.stock_quantity), 0);
          const lowStock = catProducts.filter(p => p.stock_quantity <= p.min_stock).length;
          const outOfStock = catProducts.filter(p => p.stock_quantity === 0).length;

          return (
            <motion.div key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <div className="glass-card group overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: category.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg"
                      style={{ backgroundColor: `${category.color}18` }}>
                      {category.icon || '📁'}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(category); }}
                        className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
                        <FiEdit2 className="w-4 h-4 text-foreground-secondary" />
                      </button>
                      <RoleGuard roles={['admin']}>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingCategory(category); setShowDeleteModal(true); }}
                          className="p-2 rounded-lg hover:bg-danger/10 transition-colors">
                          <FiTrash2 className="w-4 h-4 text-danger" />
                        </button>
                      </RoleGuard>
                    </div>
                  </div>
                  <h3 className="font-semibold font-heading text-lg mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-xs text-foreground-muted mb-3 line-clamp-1">{category.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm text-foreground-muted mb-3">
                    <div className="flex items-center gap-1.5">
                      <FiPackage className="w-4 h-4" />
                      <span>{catProducts.length} products</span>
                    </div>
                    {lowStock > 0 && (
                      <Badge variant="warning" className="text-xs">{lowStock} low</Badge>
                    )}
                    {outOfStock > 0 && (
                      <Badge variant="danger" className="text-xs">{outOfStock} out</Badge>
                    )}
                  </div>
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-foreground-muted">Total Value</span>
                    <span className="text-sm font-bold text-accent">{formatCurrency(totalValue)}</span>
                  </div>
                  <button onClick={() => { setViewingCategory(category); setShowProductsModal(true); }}
                    className="w-full mt-3 py-2.5 rounded-lg bg-background-tertiary hover:bg-accent/10 hover:text-accent transition-all duration-200 text-xs font-medium">
                    View Products
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-background-tertiary flex items-center justify-center">
            <FiGrid className="w-8 h-8 text-foreground-muted" />
          </div>
          <h3 className="text-lg font-medium mb-1">No categories found</h3>
          <p className="text-sm text-foreground-muted mb-6">
            {searchQuery ? 'Try a different search term' : 'Create your first category to get started'}
          </p>
          {!searchQuery && (
            <RoleGuard roles={['admin', 'manager']}>
              <Button onClick={openAdd}>
                <FiPlus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </RoleGuard>
          )}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <Modal open={showModal} onClose={() => { setShowModal(false); setEditingCategory(null); resetForm(); }}
            title={editingCategory ? 'Edit Category' : 'Add New Category'} size="sm">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Category Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Snacks, Beverages" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Icon & Color</label>
                <div className="grid grid-cols-5 gap-2 p-3 bg-background-tertiary rounded-xl max-h-40 overflow-y-auto">
                  {categoryIcons.map((icon, i) => (
                    <button key={icon} onClick={() => setForm(prev => ({ ...prev, icon, color: categoryColors[i] }))}
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200',
                        form.icon === icon
                          ? 'ring-2 ring-accent ring-offset-2 ring-offset-background-tertiary scale-110'
                          : 'hover:bg-background-secondary'
                      )}
                      style={form.icon === icon ? { backgroundColor: `${categoryColors[i]}20`, color: categoryColors[i] } : {}}>
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-foreground-muted">Selected:</span>
                  <span className="text-lg">{form.icon}</span>
                  <span className="w-5 h-5 rounded" style={{ backgroundColor: form.color }} />
                  <span className="text-xs font-mono text-foreground-muted">{form.color}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: `${form.color}08`, borderColor: `${form.color}20` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${form.color}18` }}>
                    {form.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{form.name || 'Category Name'}</p>
                    <p className="text-xs text-foreground-muted truncate">{form.description || 'No description'}</p>
                  </div>
                  <Badge variant="info">{catProducts.length || 0} products</Badge>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowModal(false); setEditingCategory(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.name}>{editingCategory ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </Modal>
        )}

        {showDeleteModal && deletingCategory && (
          <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletingCategory(null); }} title="Delete Category" size="sm">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-danger/5 border border-danger/20 rounded-xl">
                <div className="p-2 rounded-lg bg-danger/10 shrink-0">
                  <FiTrash2 className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <p className="text-sm font-medium">Delete "{deletingCategory.name}"?</p>
                  <p className="text-xs text-foreground-muted mt-1">This action cannot be undone.</p>
                  {getCategoryProducts(deletingCategory.id).length > 0 && (
                    <p className="text-xs text-danger mt-2">
                      {getCategoryProducts(deletingCategory.id)} product(s) in this category will become uncategorized.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeletingCategory(null); }}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete Category</Button>
              </div>
            </div>
          </Modal>
        )}

        {showProductsModal && viewingCategory && (
          <Modal open={showProductsModal} onClose={() => { setShowProductsModal(false); setViewingCategory(null); }}
            title={`Products — ${viewingCategory.name}`} size="xl">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {getCategoryProducts(viewingCategory.id).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary/50 hover:bg-background-tertiary transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-background-secondary flex items-center justify-center text-xl shrink-0">
                      {product.image || '📦'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-foreground-muted truncate">{product.sku || product.barcode || 'No SKU'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <Badge variant={product.stock_quantity > product.min_stock ? 'success' : product.stock_quantity > 0 ? 'warning' : 'danger'} className="text-xs">
                      {product.stock_quantity} in stock
                    </Badge>
                    <span className="text-sm font-semibold text-accent">{formatCurrency(product.selling_price)}</span>
                  </div>
                </div>
              ))}
              {getCategoryProducts(viewingCategory.id).length === 0 && (
                <div className="py-12 text-center text-foreground-muted">
                  <FiPackage className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No products in this category</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
