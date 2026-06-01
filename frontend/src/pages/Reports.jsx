import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiDownload, FiCalendar, FiTrendingUp, FiDollarSign, FiShoppingBag,
  FiPercent, FiUsers, FiPieChart, FiClock, FiPackage, FiBarChart2,
  FiPrinter, FiFileText, FiRefreshCw
} from 'react-icons/fi';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { reportService } from '@/services/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

const COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#06B6D4'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Reports() {
  const [dashboard, setDashboard] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [plData, setPlData] = useState(null);
  const [staffData, setStaffData] = useState({ staff: [], daily: [] });
  const [cashFlow, setCashFlow] = useState({ inflows: [], outflows: [] });
  const [inventoryReport, setInventoryReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getDateParams = useCallback(() => {
    const now = new Date();
    let start, end = now.toISOString().split('T')[0];
    if (dateRange === 'day') start = end;
    else if (dateRange === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); start = d.toISOString().split('T')[0]; }
    else if (dateRange === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); start = d.toISOString().split('T')[0]; }
    else if (dateRange === 'year') { const d = new Date(); d.setFullYear(d.getFullYear() - 1); start = d.toISOString().split('T')[0]; }
    else { start = customStart || end; end = customEnd || end; }
    return { startDate: start, endDate: end };
  }, [dateRange, customStart, customEnd]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = getDateParams();
      const [dashRes, salesRes, plRes, staffRes, cashRes, invRes] = await Promise.all([
        reportService.getDashboard(),
        reportService.getSales({ ...params, groupBy: dateRange === 'year' ? 'month' : 'day' }),
        reportService.getProfitLoss(params),
        reportService.getStaffPerformance(params),
        reportService.getCashFlow({ ...params, groupBy: dateRange === 'year' ? 'month' : 'day' }),
        reportService.getInventoryReport(),
      ]);
      setDashboard(dashRes);
      setSalesData(salesRes.sales || []);
      setPlData(plRes);
      setStaffData(staffRes);
      setCashFlow(cashRes);
      setInventoryReport(invRes);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  }, [getDateParams, dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const exportReport = (type) => {
    const params = { ...getDateParams(), type, format: 'csv' };
    const token = localStorage.getItem('token');
    const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/reports/export?${query}`;
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    if (token) a.setAttribute('token', token);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${type}-report.csv`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(console.error);
  };

  const printReport = () => {
    window.print();
  };

  const totalRevenue = dashboard?.month?.sales || 0;
  const totalExpenses = dashboard?.month?.expenses || 0;
  const profit = dashboard?.month?.profit || 0;
  const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;
  const avgOrder = dashboard?.today?.orders > 0 ? dashboard.today.sales / dashboard.today.orders : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiTrendingUp },
    { id: 'sales', label: 'Sales', icon: FiBarChart2 },
    { id: 'profit-loss', label: 'Profit/Loss', icon: FiPercent },
    { id: 'inventory', label: 'Inventory', icon: FiPackage },
    { id: 'cash-flow', label: 'Cash Flow', icon: FiDollarSign },
    { id: 'staff', label: 'Staff', icon: FiUsers },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between print-hidden">
        <div>
          <h1 className="text-2xl font-heading font-bold">Reports & Analytics</h1>
          <p className="text-foreground-muted">Comprehensive business insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-background-tertiary rounded-lg p-1">
            {['day', 'week', 'month', 'year', 'custom'].map((range) => (
              <button key={range} onClick={() => { setDateRange(range); if (range !== 'custom') setShowDatePicker(false); }}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all',
                  dateRange === range ? 'bg-accent text-white' : 'text-foreground-secondary hover:text-foreground')}>
                {range === 'custom' ? <FiCalendar className="w-3.5 h-3.5 inline mr-1" /> : null}
                {range}
              </button>
            ))}
          </div>
          {showDatePicker && (
            <div className="flex items-center gap-1">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1.5 bg-background-tertiary border border-border rounded-md text-xs" />
              <span className="text-xs text-foreground-muted">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1.5 bg-background-tertiary border border-border rounded-md text-xs" />
            </div>
          )}
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={loadData}><FiRefreshCw className="w-4 h-4" /></Button>
            <div className="relative group">
              <Button variant="secondary" size="sm"><FiDownload className="w-4 h-4 mr-1" /> Export</Button>
              <div className="absolute right-0 top-full mt-1 bg-background-secondary border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[140px]">
                {['sales', 'products', 'expenses'].map(type => (
                  <button key={type} onClick={() => exportReport(type)}
                    className="w-full px-4 py-2 text-xs text-left hover:bg-background-tertiary transition-colors first:rounded-t-lg last:rounded-b-lg capitalize">
                    {type === 'products' ? 'Inventory' : type} CSV
                  </button>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={printReport}><FiPrinter className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex border-b border-border overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-foreground-muted hover:text-foreground')}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div ref={printRef} className="p-4">
            {loading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-background-tertiary rounded-xl animate-pulse" />)}
                </div>
                <div className="h-80 bg-background-tertiary rounded-xl animate-pulse" />
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card hover>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="p-2.5 bg-accent/10 rounded-xl"><FiDollarSign className="w-5 h-5 text-accent" /></div>
                          </div>
                          <p className="text-2xl font-bold mt-4 font-heading">{formatCurrency(dashboard?.today?.sales || 0)}</p>
                          <p className="text-sm text-foreground-muted mt-1">Today's Sales</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="p-2.5 bg-success/10 rounded-xl"><FiShoppingBag className="w-5 h-5 text-success" /></div>
                          </div>
                          <p className="text-2xl font-bold mt-4 font-heading">{dashboard?.today?.orders || 0}</p>
                          <p className="text-sm text-foreground-muted mt-1">Today's Orders</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="p-2.5 bg-warning/10 rounded-xl"><FiTrendingUp className="w-5 h-5 text-warning" /></div>
                          </div>
                          <p className="text-2xl font-bold mt-4 font-heading">{formatCurrency(dashboard?.month?.sales || 0)}</p>
                          <p className="text-sm text-foreground-muted mt-1">Monthly Revenue</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="p-2.5 bg-purple-400/10 rounded-xl"><FiPercent className="w-5 h-5 text-purple-400" /></div>
                          </div>
                          <p className="text-2xl font-bold mt-4 font-heading">{formatCurrency(dashboard?.month?.profit || 0)}</p>
                          <p className="text-sm text-foreground-muted mt-1">Monthly Profit</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader><h3 className="text-lg font-semibold font-heading">Daily Sales (7 Days)</h3></CardHeader>
                        <CardContent>
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={dashboard?.dailySales || []}>
                                <defs>
                                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5) || ''} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} formatter={(value) => formatCurrency(value)} />
                                <Area type="monotone" dataKey="total" name="Sales" stroke="#3B82F6" strokeWidth={3} fill="url(#salesGrad)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><h3 className="text-lg font-semibold font-heading">Payment Methods</h3></CardHeader>
                        <CardContent>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={dashboard?.paymentMethods || []} dataKey="total" nameKey="payment_method" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4}
                                  label={({ payment_method, total }) => `${payment_method} ${((total / (dashboard?.month?.sales || 1)) * 100).toFixed(0)}%`}>
                                  {(dashboard?.paymentMethods || []).map((entry, i) => (
                                    <Cell key={entry.payment_method} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader><h3 className="text-lg font-semibold font-heading">Best Selling Products</h3></CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border">
                            {(dashboard?.bestSellers || []).slice(0, 5).map((p, i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-foreground-muted w-5">{i + 1}.</span>
                                  <span className="text-sm font-medium">{p.product_name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-foreground-muted">{p.total_qty} sold</span>
                                  <span className="font-medium">{formatCurrency(p.total_revenue)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><h3 className="text-lg font-semibold font-heading">Inventory Status</h3></CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-background-tertiary rounded-lg">
                            <span className="text-sm">Low Stock Items</span>
                            <Badge variant="warning">{dashboard?.inventory?.lowStock || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-background-tertiary rounded-lg">
                            <span className="text-sm">Out of Stock</span>
                            <Badge variant="danger">{dashboard?.inventory?.outOfStock || 0}</Badge>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-background-tertiary rounded-lg">
                            <span className="text-sm">Products</span>
                            <span className="font-medium">{inventoryReport?.totalProducts || 0}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-background-tertiary rounded-lg">
                            <span className="text-sm">Total Stock Value</span>
                            <span className="font-medium">{formatCurrency(inventoryReport?.retailValue || 0)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {activeTab === 'sales' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Revenue</p>
                          <p className="text-2xl font-bold mt-1 text-accent">{formatCurrency(salesData.reduce((s, r) => s + r.revenue, 0))}</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Orders</p>
                          <p className="text-2xl font-bold mt-1">{salesData.reduce((s, r) => s + r.orders, 0)}</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Avg Order Value</p>
                          <p className="text-2xl font-bold mt-1 text-success">
                            {formatCurrency(salesData.reduce((s, r) => s + r.avg_order, 0) / (salesData.length || 1))}
                          </p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Periods</p>
                          <p className="text-2xl font-bold mt-1">{salesData.length}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <Card>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="period" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} formatter={(value) => formatCurrency(value)} />
                              <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                              <Bar dataKey="orders" name="Orders" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><h3 className="text-lg font-semibold font-heading">Sales Details</h3></CardHeader>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-background-tertiary/50">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Period</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Revenue</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Orders</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Avg Order</th>
                            </tr>
                          </thead>
                          <tbody>
                            {salesData.map((row, i) => (
                              <tr key={i} className="border-b border-border hover:bg-background-tertiary/30">
                                <td className="px-4 py-3 text-sm">{row.period}</td>
                                <td className="px-4 py-3 text-right font-medium text-accent">{formatCurrency(row.revenue)}</td>
                                <td className="px-4 py-3 text-right">{row.orders}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(row.avg_order)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'profit-loss' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Revenue</p>
                          <p className="text-3xl font-bold mt-1 text-accent">{formatCurrency(plData?.revenue || 0)}</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Expenses</p>
                          <p className="text-3xl font-bold mt-1 text-danger">{formatCurrency(plData?.expenses || 0)}</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Profit</p>
                          <p className={cn('text-3xl font-bold mt-1', (plData?.profit || 0) >= 0 ? 'text-success' : 'text-danger')}>
                            {formatCurrency(plData?.profit || 0)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Margin</p>
                          <p className={cn('text-3xl font-bold mt-1', (plData?.margin || 0) >= 10 ? 'text-success' : 'text-warning')}>{plData?.margin || 0}%</p>
                        </CardContent>
                      </Card>
                    </div>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="flex-1 p-6 bg-accent/5 border border-accent/20 rounded-xl text-center">
                            <FiDollarSign className="w-8 h-8 text-accent mx-auto mb-2" />
                            <p className="text-sm text-foreground-muted">Revenue</p>
                            <p className="text-2xl font-bold text-accent">{formatCurrency(plData?.revenue || 0)}</p>
                          </div>
                          <div className="text-2xl text-foreground-muted">
                            {(plData?.profit || 0) >= 0 ? '−' : '+'}
                          </div>
                          <div className="flex-1 p-6 bg-danger/5 border border-danger/20 rounded-xl text-center">
                            <FiTrendingUp className="w-8 h-8 text-danger mx-auto mb-2" />
                            <p className="text-sm text-foreground-muted">Expenses</p>
                            <p className="text-2xl font-bold text-danger">{formatCurrency(plData?.expenses || 0)}</p>
                          </div>
                          <div className="text-2xl text-foreground-muted">=</div>
                          <div className="flex-1 p-6 bg-success/5 border border-success/20 rounded-xl text-center">
                            <FiPercent className="w-8 h-8 text-success mx-auto mb-2" />
                            <p className="text-sm text-foreground-muted">Profit</p>
                            <p className="text-2xl font-bold text-success">{formatCurrency(plData?.profit || 0)}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-background-tertiary rounded-lg text-center">
                          <span className="text-sm text-foreground-muted">Profit Margin: </span>
                          <span className="text-lg font-bold">{plData?.margin || 0}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card hover>
                        <CardContent className="p-6">
                          <FiPackage className="w-6 h-6 text-accent mb-2" />
                          <p className="text-2xl font-bold">{inventoryReport?.totalProducts || 0}</p>
                          <p className="text-sm text-foreground-muted">Total Products</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <FiDollarSign className="w-6 h-6 text-success mb-2" />
                          <p className="text-2xl font-bold">{formatCurrency(inventoryReport?.retailValue || 0)}</p>
                          <p className="text-sm text-foreground-muted">Retail Value</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <FiDollarSign className="w-6 h-6 text-warning mb-2" />
                          <p className="text-2xl font-bold">{formatCurrency(inventoryReport?.costValue || 0)}</p>
                          <p className="text-sm text-foreground-muted">Cost Value</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <FiTrendingUp className="w-6 h-6 text-purple-400 mb-2" />
                          <p className="text-2xl font-bold">{formatCurrency((inventoryReport?.retailValue || 0) - (inventoryReport?.costValue || 0))}</p>
                          <p className="text-sm text-foreground-muted">Potential Profit</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader><h3 className="text-lg font-semibold font-heading">Stock by Category</h3></CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={inventoryReport?.byCategory || []} dataKey="total_value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                                  label={({ name, total_value }) => `${name} ${formatCurrency(total_value)}`}>
                                  {(inventoryReport?.byCategory || []).map((entry, i) => (
                                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><h3 className="text-lg font-semibold font-heading">Top Products by Value</h3></CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border">
                            {(inventoryReport?.topProducts || []).map((p, i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-foreground-muted w-5">{i + 1}.</span>
                                  <div>
                                    <p className="text-sm font-medium">{p.name}</p>
                                    <p className="text-xs text-foreground-muted">{p.sku} | Stock: {p.stock_quantity}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{formatCurrency(p.selling_price * p.stock_quantity)}</p>
                                  <p className="text-xs text-foreground-muted">{formatCurrency(p.selling_price)}/unit</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    <Card>
                      <CardHeader><h3 className="text-lg font-semibold font-heading">Category Breakdown</h3></CardHeader>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-background-tertiary/50">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Category</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Products</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Total Stock</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(inventoryReport?.byCategory || []).map((cat, i) => (
                              <tr key={i} className="border-b border-border hover:bg-background-tertiary/30">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-sm">{cat.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">{cat.product_count}</td>
                                <td className="px-4 py-3 text-right">{cat.total_stock}</td>
                                <td className="px-4 py-3 text-right font-medium">{formatCurrency(cat.total_value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'cash-flow' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Total Inflow</p>
                          <p className="text-2xl font-bold mt-1 text-success">
                            {formatCurrency(cashFlow.inflows.reduce((s, r) => s + r.amount, 0))}
                          </p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Total Outflow</p>
                          <p className="text-2xl font-bold mt-1 text-danger">
                            {formatCurrency(cashFlow.outflows.reduce((s, r) => s + r.amount, 0))}
                          </p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Net Cash Flow</p>
                          <p className={cn('text-2xl font-bold mt-1',
                            cashFlow.inflows.reduce((s, r) => s + r.amount, 0) - cashFlow.outflows.reduce((s, r) => s + r.amount, 0) >= 0 ? 'text-success' : 'text-danger')}>
                            {formatCurrency(cashFlow.inflows.reduce((s, r) => s + r.amount, 0) - cashFlow.outflows.reduce((s, r) => s + r.amount, 0))}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <Card>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={
                              [...new Set([...cashFlow.inflows.map(r => r.period), ...cashFlow.outflows.map(r => r.period)])].map(period => ({
                                period,
                                inflow: cashFlow.inflows.find(r => r.period === period)?.amount || 0,
                                outflow: cashFlow.outflows.find(r => r.period === period)?.amount || 0,
                              }))
                            }>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="period" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} formatter={(value) => formatCurrency(value)} />
                              <Bar dataKey="inflow" name="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                              <Bar dataKey="outflow" name="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'staff' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Active Staff</p>
                          <p className="text-2xl font-bold mt-1">{staffData.staff.length}</p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Total Sales</p>
                          <p className="text-2xl font-bold mt-1 text-accent">
                            {formatCurrency(staffData.staff.reduce((s, r) => s + r.total_sales, 0))}
                          </p>
                        </CardContent>
                      </Card>
                      <Card hover>
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground-muted">Total Orders</p>
                          <p className="text-2xl font-bold mt-1">{staffData.staff.reduce((s, r) => s + r.order_count, 0)}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <Card>
                      <CardContent>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={staffData.staff} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                              <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                              <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} width={100} />
                              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} formatter={(value) => formatCurrency(value)} />
                              <Bar dataKey="total_sales" name="Total Sales" fill="#3B82F6" radius={[0, 4, 4, 0]} maxBarSize={30} />
                              <Bar dataKey="avg_order_value" name="Avg Order" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={30} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><h3 className="text-lg font-semibold font-heading">Staff Performance Details</h3></CardHeader>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-background-tertiary/50">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Staff</th>
                              <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Role</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Orders</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Total Sales</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Avg Order</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffData.staff.map((s, i) => (
                              <tr key={i} className="border-b border-border hover:bg-background-tertiary/30">
                                <td className="px-4 py-3 font-medium">{s.name}</td>
                                <td className="px-4 py-3"><Badge variant="info">{s.role}</Badge></td>
                                <td className="px-4 py-3 text-right">{s.order_count}</td>
                                <td className="px-4 py-3 text-right font-medium text-accent">{formatCurrency(s.total_sales)}</td>
                                <td className="px-4 py-3 text-right">{formatCurrency(s.avg_order_value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
