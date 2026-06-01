import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiGrid, FiList,
  FiUpload, FiX, FiChevronLeft, FiChevronRight, FiHash,
  FiPackage, FiAlertTriangle, FiCalendar, FiDollarSign,
  FiTrendingUp, FiDownload, FiCamera, FiLayers,
  FiRefreshCw, FiFileText, FiCheck, FiAlertCircle, FiLoader
} from 'react-icons/fi';
import { productService, categoryService, uploadService } from '@/services/api';
import { formatCurrency, cn, calculateTax, calculateDiscount } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { RoleGuard } from '@/components/RoleGuard';

const itemsPerPage = 10;
const categoryIcons = ['🍪', '🥤', '✏️', '🍔', '🍦', '🍫', '🍞', '🛒', '📦', '🎁', '🧴', '💊'];
const categoryColors = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#06B6D4', '#84CC16', '#F43F5E'];

const expiryStatusConfig = {
  expired: { label: 'Expired', variant: 'danger', icon: FiAlertCircle },
  critical: { label: 'Expiring Soon', variant: 'danger', icon: FiAlertTriangle },
  warning: { label: 'Warning', variant: 'warning', icon: FiCalendar },
  good: { label: 'Good', variant: 'success', icon: FiCheck },
};

export default function Products() {
  const { user } = useSelector((state) => state.auth);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const [productForm, setProductForm] = useState({
    name: '', category_id: '', barcode: '', sku: '', description: '',
    image: '', purchase_price: '', selling_price: '', stock_quantity: '',
    min_stock: '5', tax_rate: '0', expiry_date: '', variants: []
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '📦', color: '#3B82F6' });
  const [variantForm, setVariantForm] = useState({ name: '', sku: '', barcode: '', price: '', stock_quantity: '' });
  const [bulkImportData, setBulkImportData] = useState('');
  const [importResults, setImportResults] = useState(null);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadService.upload(file);
      setProductForm(prev => ({ ...prev, image: res.url }));
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, statsRes] = await Promise.all([
        productService.getAll(),
        categoryService.getAll(),
        productService.getStats(),
      ]);
      setProducts(productsRes.products || []);
      setCategories(categoriesRes.categories || []);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery) || p.sku?.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'low' && p.stock_quantity <= p.min_stock && p.stock_quantity > 0) ||
      (filterStatus === 'out' && p.stock_quantity === 0) ||
      (filterStatus === 'expired' && p.is_expired) ||
      (filterStatus === 'expiring' && p.expiry_status === 'warning' || p.expiry_status === 'critical');
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetProductForm = () => setProductForm({
    name: '', category_id: '', barcode: '', sku: '', description: '',
    image: '', purchase_price: '', selling_price: '', stock_quantity: '',
    min_stock: '5', tax_rate: '0', expiry_date: '', variants: []
  });

  const handleAddProduct = async () => {
    try {
      await productService.create(productForm);
      setShowAddModal(false);
      resetProductForm();
      loadData();
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  };

  const handleEditProduct = async () => {
    try {
      await productService.update(editingProduct.id, productForm);
      setShowEditModal(false);
      setEditingProduct(null);
      resetProductForm();
      loadData();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      await productService.delete(deletingProduct.id);
      setShowDeleteModal(false);
      setDeletingProduct(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleBulkImport = async () => {
    try {
      const lines = bulkImportData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const products = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] || ''; });
        return {
          name: obj.name || obj.product,
          category_id: obj.category_id,
          barcode: obj.barcode,
          sku: obj.sku,
          description: obj.description,
          purchase_price: parseFloat(obj.purchase_price || obj.cost) || 0,
          selling_price: parseFloat(obj.selling_price || obj.price) || 0,
          stock_quantity: parseInt(obj.stock_quantity || obj.stock) || 0,
          min_stock: parseInt(obj.min_stock) || 5,
          tax_rate: parseFloat(obj.tax_rate) || 0,
          expiry_date: obj.expiry_date || null,
        };
      }).filter(p => p.name);
      const result = await productService.bulkImport({ products });
      setImportResults(result.results);
      loadData();
    } catch (error) {
      console.error('Bulk import failed:', error);
    }
  };

  const handleScanBarcode = async () => {
    if (!scannedBarcode) return;
    try {
      const res = await productService.getByBarcode(scannedBarcode);
      setScannedProduct(res.product);
    } catch {
      setScannedProduct(null);
    }
  };

  const handleGenerateBarcode = async () => {
    try {
      const res = await productService.generateBarcode();
      setProductForm(prev => ({ ...prev, barcode: res.barcode }));
    } catch (error) {
      console.error('Failed to generate barcode:', error);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name, category_id: product.category_id || '', barcode: product.barcode || '',
      sku: product.sku || '', description: product.description || '', image: product.image || '',
      purchase_price: product.purchase_price, selling_price: product.selling_price,
      stock_quantity: product.stock_quantity, min_stock: product.min_stock,
      tax_rate: product.tax_rate, expiry_date: product.expiry_date || '', variants: []
    });
    setShowEditModal(true);
  };

  const openAddVariantModal = (product) => {
    setSelectedProductForVariants(product);
    setShowVariantsModal(true);
  };

  const handleAddVariant = async () => {
    try {
      await productService.createVariant(selectedProductForVariants.id, variantForm);
      setVariantForm({ name: '', sku: '', barcode: '', price: '', stock_quantity: '' });
      loadData();
    } catch (error) {
      console.error('Failed to add variant:', error);
    }
  };

  const handleAddCategory = async () => {
    try {
      await categoryService.create(categoryForm);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '', icon: '📦', color: '#3B82F6' });
      loadData();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleEditCategory = async () => {
    try {
      await categoryService.update(editingCategory.id, categoryForm);
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon: '📦', color: '#3B82F6' });
      loadData();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (category) => {
    try {
      await categoryService.delete(category.id);
      loadData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const profitMargin = productForm.purchase_price && productForm.selling_price
    ? (((productForm.selling_price - productForm.purchase_price) / productForm.purchase_price) * 100).toFixed(1)
    : 0;

  const getExpiryBadge = (product) => {
    if (!product.expiry_date) return null;
    const status = expiryStatusConfig[product.expiry_status];
    if (!status) return null;
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  const statCards = [
    { title: 'Total Products', value: stats?.total || 0, icon: FiPackage, color: 'text-accent', bg: 'bg-accent/10' },
    { title: 'Low Stock', value: stats?.lowStock || 0, icon: FiAlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Out of Stock', value: stats?.outOfStock || 0, icon: FiX, color: 'text-danger', bg: 'bg-danger/10' },
    { title: 'Total Value', value: stats?.totalValue || 0, icon: FiDollarSign, color: 'text-success', bg: 'bg-success/10', format: 'currency' },
    { title: 'Expiring Soon', value: stats?.expiringSoon || 0, icon: FiCalendar, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { title: 'Expired', value: stats?.expired || 0, icon: FiAlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-background-tertiary rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-background-tertiary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Products</h1>
          <p className="text-foreground-muted mt-1">Manage your product inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <RoleGuard roles={['admin', 'manager']}>
            <Button variant="secondary" onClick={() => setShowBulkImport(true)}>
              <FiUpload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
          </RoleGuard>
          <Button onClick={() => setShowCategoryModal(true)}>
            <FiLayers className="w-4 h-4 mr-2" />
            Categories
          </Button>
          <RoleGuard roles={['admin', 'manager']}>
            <Button onClick={() => { resetProductForm(); setShowAddModal(true); }}>
              <FiPlus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </RoleGuard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} whileHover={{ y: -2 }} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}><Icon className={`w-5 h-5 ${stat.color}`} /></div>
                <div>
                  <p className="text-xl font-bold">{stat.format === 'currency' ? formatCurrency(stat.value) : stat.value}</p>
                  <p className="text-xs text-foreground-muted">{stat.title}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input type="text" placeholder="Search products, barcode, SKU..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
              <option value="all">All Status</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
            <Button variant="ghost" size="sm" onClick={loadData}><FiRefreshCw className="w-4 h-4" /></Button>
            <div className="flex items-center gap-1 bg-background-tertiary rounded-lg p-1 ml-auto">
              <button onClick={() => setViewMode('table')} className={cn('p-2 rounded-md transition-colors', viewMode === 'table' && 'bg-background-secondary')}>
                <FiList className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('grid')} className={cn('p-2 rounded-md transition-colors', viewMode === 'grid' && 'bg-background-secondary')}>
                <FiGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-tertiary/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Margin</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Expiry</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Barcode</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((product) => (
                  <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-border hover:bg-background-tertiary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-background-tertiary rounded-lg flex items-center justify-center text-xl">
                          {product.image || '📦'}
                        </div>
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <p className="text-xs text-foreground-muted">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{product.category_name || 'Uncategorized'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted">{formatCurrency(product.purchase_price)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(product.selling_price)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm font-medium', product.profit_margin > 30 ? 'text-success' : product.profit_margin > 15 ? 'text-warning' : 'text-danger')}>
                        {product.profit_margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={product.stock_quantity > product.min_stock ? 'success' : product.stock_quantity > 0 ? 'warning' : 'danger'}>
                        {product.stock_quantity} units
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {product.expiry_date && <span className="text-xs">{product.expiry_date}</span>}
                        {getExpiryBadge(product)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground-muted">{product.barcode}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditModal(product)} className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => openAddVariantModal(product)} className="p-2 rounded-lg hover:bg-background-tertiary transition-colors" title="Variants">
                          <FiLayers className="w-4 h-4" />
                        </button>
                        <RoleGuard roles={['admin']}>
                          <button onClick={() => { setDeletingProduct(product); setShowDeleteModal(true); }} className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </RoleGuard>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-foreground-muted">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed">
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={cn('w-8 h-8 rounded-lg text-sm font-medium transition-colors', currentPage === page ? 'bg-accent text-white' : 'hover:bg-background-tertiary')}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed">
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginatedProducts.map((product, index) => (
            <motion.div key={product.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
              <Card hover>
                <CardContent className="p-4">
                  <div className="aspect-square bg-background-tertiary rounded-lg mb-3 flex items-center justify-center text-4xl relative">
                    {product.image || '📦'}
                    {product.expiry_status === 'expired' && (
                      <div className="absolute top-2 right-2"><Badge variant="danger">Expired</Badge></div>
                    )}
                    {product.stock_quantity === 0 && (
                      <div className="absolute top-2 left-2"><Badge variant="danger">Out</Badge></div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-xs text-foreground-muted mb-2">{product.category_name}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-accent">{formatCurrency(product.selling_price)}</span>
                    <Badge variant={product.stock_quantity > product.min_stock ? 'success' : product.stock_quantity > 0 ? 'warning' : 'danger'} className="text-xs">
                      {product.stock_quantity} left
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-foreground-muted mb-3">
                    <span>Cost: {formatCurrency(product.purchase_price)}</span>
                    <span className={cn(product.profit_margin > 30 ? 'text-success' : 'text-warning')}>Margin: {product.profit_margin}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(product)} className="flex-1 py-2 rounded-lg bg-background-tertiary hover:bg-border transition-colors text-sm">
                      <FiEdit2 className="w-4 h-4 mx-auto" />
                    </button>
                    <button onClick={() => openAddVariantModal(product)} className="flex-1 py-2 rounded-lg bg-background-tertiary hover:bg-border transition-colors text-sm">
                      <FiLayers className="w-4 h-4 mx-auto" />
                    </button>
                    <RoleGuard roles={['admin']}>
                      <button onClick={() => { setDeletingProduct(product); setShowDeleteModal(true); }} className="flex-1 py-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors text-sm">
                        <FiTrash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </RoleGuard>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <Modal open={showAddModal} onClose={() => { setShowAddModal(false); resetProductForm(); }} title="Add New Product" size="xl">
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
              <div className="flex items-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 bg-background-tertiary rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent transition-colors cursor-pointer relative overflow-hidden"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <FiLoader className="w-6 h-6 text-accent animate-spin" />
                  ) : productForm.image ? (
                    <img src={productForm.image} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <>
                      <FiCamera className="w-8 h-8 text-foreground-muted mb-2" />
                      <span className="text-xs text-foreground-muted">Upload</span>
                    </>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Product Name *</label>
                    <input type="text" value={productForm.name} onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter product name" className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Category</label>
                      <select value={productForm.category_id} onChange={(e) => setProductForm(prev => ({ ...prev, category_id: e.target.value }))} className="input">
                        <option value="">Select category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">SKU</label>
                      <input type="text" value={productForm.sku} onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                        placeholder="Auto-generated" className="input" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Selling Price *</label>
                  <input type="number" value={productForm.selling_price} onChange={(e) => setProductForm(prev => ({ ...prev, selling_price: e.target.value }))}
                    placeholder="0.00" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Purchase Price</label>
                  <input type="number" value={productForm.purchase_price} onChange={(e) => setProductForm(prev => ({ ...prev, purchase_price: e.target.value }))}
                    placeholder="0.00" className="input" />
                </div>
              </div>

              {profitMargin > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className={cn('p-3 rounded-lg border', profitMargin > 30 ? 'bg-success/5 border-success/20' : profitMargin > 15 ? 'bg-warning/5 border-warning/20' : 'bg-danger/5 border-danger/20')}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <span className={cn('text-lg font-bold', profitMargin > 30 ? 'text-success' : profitMargin > 15 ? 'text-warning' : 'text-danger')}>
                      {profitMargin}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-foreground-muted">
                    <span>Profit per unit</span>
                    <span>{formatCurrency(productForm.selling_price - productForm.purchase_price)}</span>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stock Quantity</label>
                  <input type="number" value={productForm.stock_quantity} onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                    placeholder="0" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Min Stock Alert</label>
                  <input type="number" value={productForm.min_stock} onChange={(e) => setProductForm(prev => ({ ...prev, min_stock: e.target.value }))}
                    placeholder="5" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tax Rate (%)</label>
                  <input type="number" value={productForm.tax_rate} onChange={(e) => setProductForm(prev => ({ ...prev, tax_rate: e.target.value }))}
                    placeholder="0" className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Expiry Date</label>
                  <input type="date" value={productForm.expiry_date} onChange={(e) => setProductForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    <FiHash className="w-4 h-4 inline mr-1" />
                    Barcode
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={productForm.barcode} onChange={(e) => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="Auto-generated" className="input flex-1" />
                    <Button variant="secondary" onClick={handleGenerateBarcode}><FiHash className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={productForm.description} onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Product description..." rows={2} className="input resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowAddModal(false); resetProductForm(); }}>Cancel</Button>
                <Button onClick={handleAddProduct} disabled={!productForm.name || !productForm.selling_price}>Add Product</Button>
              </div>
            </div>
          </Modal>
        )}

        {showEditModal && editingProduct && (
          <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingProduct(null); resetProductForm(); }} title="Edit Product" size="xl">
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
              <div className="flex items-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 bg-background-tertiary rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent transition-colors cursor-pointer relative overflow-hidden"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <FiLoader className="w-6 h-6 text-accent animate-spin" />
                  ) : productForm.image ? (
                    <img src={productForm.image} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Product Name *</label>
                    <input type="text" value={productForm.name} onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))} className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Category</label>
                      <select value={productForm.category_id} onChange={(e) => setProductForm(prev => ({ ...prev, category_id: e.target.value }))} className="input">
                        <option value="">Select category</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">SKU</label>
                      <input type="text" value={productForm.sku} onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))} className="input" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Selling Price *</label>
                  <input type="number" value={productForm.selling_price} onChange={(e) => setProductForm(prev => ({ ...prev, selling_price: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Purchase Price</label>
                  <input type="number" value={productForm.purchase_price} onChange={(e) => setProductForm(prev => ({ ...prev, purchase_price: e.target.value }))} className="input" />
                </div>
              </div>

              {profitMargin > 0 && (
                <div className={cn('p-3 rounded-lg border', profitMargin > 30 ? 'bg-success/5 border-success/20' : profitMargin > 15 ? 'bg-warning/5 border-warning/20' : 'bg-danger/5 border-danger/20')}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <span className={cn('text-lg font-bold', profitMargin > 30 ? 'text-success' : profitMargin > 15 ? 'text-warning' : 'text-danger')}>{profitMargin}%</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Stock Quantity</label>
                  <input type="number" value={productForm.stock_quantity} onChange={(e) => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Min Stock Alert</label>
                  <input type="number" value={productForm.min_stock} onChange={(e) => setProductForm(prev => ({ ...prev, min_stock: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tax Rate (%)</label>
                  <input type="number" value={productForm.tax_rate} onChange={(e) => setProductForm(prev => ({ ...prev, tax_rate: e.target.value }))} className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Expiry Date</label>
                  <input type="date" value={productForm.expiry_date} onChange={(e) => setProductForm(prev => ({ ...prev, expiry_date: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5"><FiHash className="w-4 h-4 inline mr-1" />Barcode</label>
                  <div className="flex gap-2">
                    <input type="text" value={productForm.barcode} onChange={(e) => setProductForm(prev => ({ ...prev, barcode: e.target.value }))} className="input flex-1" />
                    <Button variant="secondary" onClick={handleGenerateBarcode}><FiHash className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={productForm.description} onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))} rows={2} className="input resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditingProduct(null); resetProductForm(); }}>Cancel</Button>
                <Button onClick={handleEditProduct} disabled={!productForm.name || !productForm.selling_price}>Save Changes</Button>
              </div>
            </div>
          </Modal>
        )}

        {showDeleteModal && deletingProduct && (
          <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletingProduct(null); }} title="Delete Product" size="sm">
            <div className="space-y-4">
              <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
                <FiAlertTriangle className="w-8 h-8 text-danger mb-2" />
                <p className="text-sm">Are you sure you want to delete <strong>{deletingProduct.name}</strong>? This action cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeletingProduct(null); }}>Cancel</Button>
                <Button variant="danger" onClick={handleDeleteProduct}>Delete</Button>
              </div>
            </div>
          </Modal>
        )}

        {showVariantsModal && selectedProductForVariants && (
          <Modal open={showVariantsModal} onClose={() => { setShowVariantsModal(false); setSelectedProductForVariants(null); }} title={`Variants: ${selectedProductForVariants.name}`} size="lg">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" placeholder="Variant name (e.g., Large, Red)" value={variantForm.name}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, name: e.target.value }))} className="input flex-1" />
                <input type="text" placeholder="SKU" value={variantForm.sku} onChange={(e) => setVariantForm(prev => ({ ...prev, sku: e.target.value }))} className="input w-24" />
                <input type="number" placeholder="Price" value={variantForm.price} onChange={(e) => setVariantForm(prev => ({ ...prev, price: e.target.value }))} className="input w-24" />
                <input type="number" placeholder="Stock" value={variantForm.stock_quantity} onChange={(e) => setVariantForm(prev => ({ ...prev, stock_quantity: e.target.value }))} className="input w-20" />
                <Button onClick={handleAddVariant} disabled={!variantForm.name}><FiPlus className="w-4 h-4" /></Button>
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-3 py-2 bg-background-tertiary/50 rounded-t-lg">
                  <span className="text-xs font-medium text-foreground-muted">Name</span>
                  <div className="flex gap-8">
                    <span className="text-xs font-medium text-foreground-muted">SKU</span>
                    <span className="text-xs font-medium text-foreground-muted">Price</span>
                    <span className="text-xs font-medium text-foreground-muted">Stock</span>
                  </div>
                </div>
                {products.find(p => p.id === selectedProductForVariants.id)?.variants?.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm">{v.name}</span>
                    <div className="flex gap-8 items-center">
                      <span className="text-sm text-foreground-muted">{v.sku || '-'}</span>
                      <span className="text-sm font-medium">{formatCurrency(v.price)}</span>
                      <Badge variant={v.stock_quantity > 0 ? 'success' : 'danger'}>{v.stock_quantity}</Badge>
                    </div>
                  </div>
                ))}
                {(!products.find(p => p.id === selectedProductForVariants.id)?.variants?.length) && (
                  <p className="p-4 text-center text-foreground-muted text-sm">No variants added yet</p>
                )}
              </div>
            </div>
          </Modal>
        )}

        {showCategoryModal && (
          <Modal open={showCategoryModal} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', description: '', icon: '📦', color: '#3B82F6' }); }} title="Manage Categories" size="lg">
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" placeholder="Category name" value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))} className="input flex-1" />
                <select value={categoryForm.icon} onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))} className="input w-16 text-center text-lg">
                  {categoryIcons.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                </select>
                <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <RoleGuard roles={['admin', 'manager']}>
                  <Button onClick={editingCategory ? handleEditCategory : handleAddCategory} disabled={!categoryForm.name}>
                    {editingCategory ? <FiCheck className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
                  </Button>
                </RoleGuard>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-background-tertiary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${cat.color}20` }}>
                        {cat.icon || '📦'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-foreground-muted">{cat.product_count || 0} products</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, description: cat.description || '', icon: cat.icon, color: cat.color }); }}
                        className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <RoleGuard roles={['admin']}>
                        <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </RoleGuard>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        )}

        {showBulkImport && (
          <Modal open={showBulkImport} onClose={() => { setShowBulkImport(false); setBulkImportData(''); setImportResults(null); }} title="Bulk Import Products" size="xl">
            <div className="space-y-4">
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl">
                <p className="text-sm font-medium mb-2">CSV Format:</p>
                <code className="text-xs text-foreground-muted block">name,category_id,barcode,sku,purchase_price,selling_price,stock_quantity,min_stock,expiry_date</code>
                <p className="text-xs text-foreground-muted mt-2">First row must be headers. Each subsequent row is a product.</p>
              </div>
              <textarea value={bulkImportData} onChange={(e) => setBulkImportData(e.target.value)}
                placeholder={`name,category_id,purchase_price,selling_price,stock_quantity\nCoca Cola 500ml,,80,100,120\nPepsi 500ml,,80,100,100`}
                rows={8} className="input font-mono text-sm resize-none" />
              {importResults && (
                <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                  <p className="text-sm font-medium text-success">Import Complete!</p>
                  <p className="text-sm">Created: {importResults.created} | Updated: {importResults.updated}</p>
                  {importResults.errors?.length > 0 && (
                    <p className="text-sm text-danger mt-1">Errors: {importResults.errors.length}</p>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowBulkImport(false); setBulkImportData(''); setImportResults(null); }}>Cancel</Button>
                <Button onClick={handleBulkImport} disabled={!bulkImportData}>
                  <FiUpload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {showBarcodeScanner && (
          <Modal open={showBarcodeScanner} onClose={() => { setShowBarcodeScanner(false); setScannedBarcode(''); setScannedProduct(null); }} title="Barcode Scanner" size="sm">
            <div className="space-y-4">
              <div className="p-8 bg-background-tertiary rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border">
                <FiHash className="w-16 h-16 text-foreground-muted mb-4" />
                <p className="text-sm text-foreground-muted mb-4">Camera scanner coming soon</p>
                <div className="flex gap-2 w-full">
                  <input type="text" placeholder="Enter barcode manually" value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleScanBarcode()}
                    className="input flex-1" />
                  <Button onClick={handleScanBarcode}>Scan</Button>
                </div>
              </div>
              {scannedProduct && (
                <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                  <p className="text-sm font-medium text-success">Product Found!</p>
                  <p className="text-lg font-bold">{scannedProduct.name}</p>
                  <p className="text-sm text-foreground-muted">{formatCurrency(scannedProduct.selling_price)} | Stock: {scannedProduct.stock_quantity}</p>
                </div>
              )}
              {scannedBarcode && !scannedProduct && (
                <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl">
                  <p className="text-sm text-danger">Product not found for barcode: {scannedBarcode}</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
