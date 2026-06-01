import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  FiDollarSign, FiShoppingCart, FiTrendingUp, FiAlertTriangle,
  FiUsers, FiArrowUpRight, FiArrowDownRight, FiExternalLink, FiRefreshCw,
  FiActivity, FiPackage, FiClock, FiAlertCircle, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  RadialBarChart, RadialBar, ComposedChart, Legend
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { reportService } from '@/services/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  salesData, categoryData, dailySalesData, bestSellingProducts,
  expenseSummary, recentTransactions, orders, products, notifications
} from '@/data/sampleData';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const cardHover = {
  hover: { y: -4, transition: { duration: 0.2 } }
};

function AnimatedCounter({ value, duration = 1.5, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = typeof value === 'number' ? value : 0;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function StatCard({ stat, index }) {
  const Icon = stat.icon;
  const TrendIcon = stat.trend === 'up' ? FiArrowUpRight : FiArrowDownRight;

  return (
    <motion.div
      variants={item}
      whileHover={cardHover.hover}
      className="relative"
    >
      <Card className="relative overflow-hidden border border-border/50">
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${stat.gradient}`} />
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between mb-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={`p-3 rounded-xl ${stat.bg} shadow-lg`}
            >
              <Icon className={`w-5 h-5 ${stat.color}`} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.5 }}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                stat.trend === 'up' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}
            >
              <TrendIcon className="w-3 h-3" />
              {stat.change}
            </motion.div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold font-heading tracking-tight">
              {stat.format === 'currency' ? (
                <AnimatedCounter value={stat.value} prefix="PKR " />
              ) : (
                <AnimatedCounter value={stat.value} />
              )}
            </p>
            <p className="text-sm text-foreground-muted mt-1 font-medium">{stat.title}</p>
          </div>
          {stat.sparkline && (
            <div className="mt-3 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stat.sparkline}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={stat.trend === 'up' ? '#22C55E' : '#EF4444'}
                    strokeWidth={1.5}
                    fill={stat.trend === 'up' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const { isOnline } = useSelector((state) => state.sync);
  const [liveTime, setLiveTime] = useState(new Date());
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
      setPulseCount((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await reportService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.warn('Failed to load dashboard from API. Using local mock data:', error);
      const mockDashboard = {
        today: { sales: 24850, orders: 47, profit: 8200, customers: 32 },
        week: { sales: 147800, orders: 240, profit: 45000 },
        month: { sales: 542000, orders: 890, profit: 165000 },
        inventory: { lowStock: 5, outOfStock: 2 },
        bestSellers: bestSellingProducts,
        recentOrders: orders.slice(0, 8),
        expenseSummary,
        recentTransactions,
      };
      setDashboardData(mockDashboard);
    } finally {
      setLoading(false);
    }
  };

  const hourlyRevenue = [
    { hour: '8AM', revenue: 2400, orders: 8 },
    { hour: '9AM', revenue: 4800, orders: 15 },
    { hour: '10AM', revenue: 7200, orders: 22 },
    { hour: '11AM', revenue: 9600, orders: 31 },
    { hour: '12PM', revenue: 14200, orders: 45 },
    { hour: '1PM', revenue: 12800, orders: 38 },
    { hour: '2PM', revenue: 8400, orders: 26 },
    { hour: '3PM', revenue: 11200, orders: 35 },
    { hour: '4PM', revenue: 15600, orders: 48 },
    { hour: '5PM', revenue: 18900, orders: 56 },
    { hour: '6PM', revenue: 14200, orders: 42 },
    { hour: '7PM', revenue: 9800, orders: 28 },
  ];

  const profitMarginData = [
    { name: 'Beverages', profit: 35, cost: 65, revenue: 45000 },
    { name: 'Snacks', profit: 28, cost: 72, revenue: 32000 },
    { name: 'Chips', profit: 22, cost: 78, revenue: 28000 },
    { name: 'Candies', profit: 30, cost: 70, revenue: 18000 },
    { name: 'Biscuits', profit: 25, cost: 75, revenue: 15000 },
  ];

  const weeklyComparison = [
    { day: 'Mon', thisWeek: 18500, lastWeek: 15000 },
    { day: 'Tue', thisWeek: 22000, lastWeek: 18500 },
    { day: 'Wed', thisWeek: 16000, lastWeek: 14000 },
    { day: 'Thu', thisWeek: 28000, lastWeek: 22000 },
    { day: 'Fri', thisWeek: 35000, lastWeek: 28000 },
    { day: 'Sat', thisWeek: 32000, lastWeek: 26000 },
    { day: 'Sun', thisWeek: 24000, lastWeek: 19500 },
  ];

  const paymentMethodData = [
    { name: 'Cash', value: 45, color: '#22C55E' },
    { name: 'Card', value: 25, color: '#3B82F6' },
    { name: 'JazzCash', value: 15, color: '#F59E0B' },
    { name: 'EasyPaisa', value: 10, color: '#8B5CF6' },
    { name: 'Other', value: 5, color: '#64748B' },
  ];

  const lowStockProducts = products
    .filter((p) => p.stock <= p.min_stock || p.stock === 0)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  const outOfStock = lowStockProducts.filter((p) => p.stock === 0);
  const lowStock = lowStockProducts.filter((p) => p.stock > 0);

  const stats = [
    {
      title: "Today's Sales",
      value: dashboardData?.today?.sales || 0,
      change: '+12.5%',
      icon: FiDollarSign,
      color: 'text-success',
      bg: 'bg-success/10',
      gradient: 'bg-gradient-to-br from-success/5 to-transparent',
      trend: 'up',
      format: 'currency',
      sparkline: [1200, 2800, 4500, 6200, 8900, 7500, 9200, 11000],
    },
    {
      title: 'Weekly Revenue',
      value: dashboardData?.week?.sales || 0,
      change: '+8.2%',
      icon: FiTrendingUp,
      color: 'text-accent',
      bg: 'bg-accent/10',
      gradient: 'bg-gradient-to-br from-accent/5 to-transparent',
      trend: 'up',
      format: 'currency',
      sparkline: [15000, 18500, 12000, 22000, 28000, 25000, 19500],
    },
    {
      title: 'Monthly Revenue',
      value: dashboardData?.month?.sales || 0,
      change: '+15.3%',
      icon: FiActivity,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      gradient: 'bg-gradient-to-br from-purple-400/5 to-transparent',
      trend: 'up',
      format: 'currency',
      sparkline: [120000, 135000, 142000, 147800, 156000, 168000, 175000],
    },
    {
      title: 'Orders Today',
      value: dashboardData?.today?.orders || 0,
      change: '+5',
      icon: FiShoppingCart,
      color: 'text-warning',
      bg: 'bg-warning/10',
      gradient: 'bg-gradient-to-br from-warning/5 to-transparent',
      trend: 'up',
      format: 'number',
      sparkline: [8, 15, 22, 31, 45, 38, 47],
    },
    {
      title: "Today's Profit",
      value: dashboardData?.today?.profit || 0,
      change: '+18.7%',
      icon: FiTrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      gradient: 'bg-gradient-to-br from-green-400/5 to-transparent',
      trend: 'up',
      format: 'currency',
      sparkline: [1200, 2400, 3800, 5200, 6800, 7200, 8200],
    },
    {
      title: 'Customers Today',
      value: dashboardData?.today?.customers || 0,
      change: '+8',
      icon: FiUsers,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      gradient: 'bg-gradient-to-br from-cyan-400/5 to-transparent',
      trend: 'up',
      format: 'number',
      sparkline: [5, 12, 18, 22, 28, 30, 32],
    },
  ];

  const inventoryAlerts = [
    { title: 'Low Stock', count: lowStock.length, icon: FiAlertCircle, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Out of Stock', count: outOfStock.length, icon: FiXCircle, color: 'text-danger', bg: 'bg-danger/10' },
    { title: 'Total Products', count: products.length, icon: FiPackage, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  if (loading) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 variants={item} className="text-2xl font-heading font-bold">Dashboard</motion.h1>
          <motion.p variants={item} className="text-foreground-muted mt-1">
            Welcome back! Here's what's happening today.
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-background-secondary rounded-lg border border-border">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-xs text-foreground-muted font-mono">
              {liveTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <Badge variant={isOnline ? 'success' : 'danger'}>{isOnline ? 'Online' : 'Offline'}</Badge>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="sm" onClick={loadDashboard}>
              <FiRefreshCw className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} index={index} />
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-semibold font-heading">Revenue Overview</h3>
                <p className="text-sm text-foreground-muted">Last 7 days performance</p>
              </div>
              <div className="flex gap-1 p-1 bg-background-tertiary rounded-lg">
                {['revenue', 'orders'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === tab ? 'bg-accent text-white' : 'text-foreground-secondary hover:text-foreground'
                    }`}
                  >
                    {tab === 'revenue' ? 'Revenue' : 'Orders'}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `PKR ${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
                      formatter={(value) => [formatCurrency(value), activeTab === 'revenue' ? 'Revenue' : 'Sales']}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeTab === 'revenue' ? 'revenue' : 'sales'}
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fill="url(#revenueGradient)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border border-border/50">
            <CardHeader>
              <h3 className="text-lg font-semibold font-heading">Sales by Category</h3>
              <p className="text-sm text-foreground-muted">Distribution breakdown</p>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      animationBegin={200}
                      animationDuration={1000}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      formatter={(value) => [`${value}%`, 'Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categoryData.map((cat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-foreground-muted truncate">{cat.name}</span>
                    <span className="text-xs font-medium ml-auto">{cat.value}%</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold font-heading">Hourly Revenue</h3>
                <p className="text-sm text-foreground-muted">Today's performance by hour</p>
              </div>
              <Badge variant="info">Live</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={hourlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `PKR ${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }}
                      formatter={(value, name) => [formatCurrency(value), name === 'revenue' ? 'Revenue' : 'Orders']}
                    />
                    <Bar dataKey="orders" fill="#F59E0B" opacity={0.3} radius={[4, 4, 0, 0]} barSize={20} />
                    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border border-border/50">
            <CardHeader>
              <h3 className="text-lg font-semibold font-heading">Payment Methods</h3>
              <p className="text-sm text-foreground-muted">Today's payment breakdown</p>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={300}
                      animationDuration={800}
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      formatter={(value) => [`${value}%`, 'Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {paymentMethodData.map((method, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.08 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                      <span className="text-sm text-foreground-muted">{method.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{method.value}%</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold font-heading">Best Sellers</h3>
                <p className="text-sm text-foreground-muted">Top performing products</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/reports"><FiExternalLink className="w-4 h-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(dashboardData?.bestSellers || bestSellingProducts).slice(0, 6).map((product, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-center gap-3 p-3 hover:bg-background-tertiary/50 transition-colors"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-warning/20 text-warning' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-600/20 text-orange-600' :
                        'bg-background-tertiary text-accent'
                      }`}
                    >
                      #{index + 1}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name || product.product_name}</p>
                      <p className="text-xs text-foreground-muted">{product.sold || product.total_qty} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(product.revenue || product.total_revenue)}</p>
                      <span className="text-xs text-success">{product.trend}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold font-heading">Recent Orders</h3>
                <p className="text-sm text-foreground-muted">Latest transactions</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/orders">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(dashboardData?.recentOrders || orders).slice(0, 7).map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex items-center justify-between p-3 hover:bg-background-tertiary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: index * 0.5 }}
                        className={`w-2 h-2 rounded-full ${
                          order.status === 'completed' ? 'bg-success' :
                          order.status === 'pending' ? 'bg-warning' : 'bg-danger'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{order.order_number || order.id}</p>
                        <p className="text-xs text-foreground-muted">{order.customer_name || order.customer || 'Walk-in'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                      <Badge variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'} className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="border border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold font-heading">Weekly Comparison</h3>
                <p className="text-sm text-foreground-muted">This week vs last week</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-accent" />
                  <span className="text-foreground-muted">This Week</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-foreground-muted/30" />
                  <span className="text-foreground-muted">Last Week</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `PKR ${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Bar dataKey="lastWeek" fill="var(--text-muted)" opacity={0.3} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="thisWeek" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border border-border/50">
            <CardHeader>
              <h3 className="text-lg font-semibold font-heading">Inventory Alerts</h3>
              <p className="text-sm text-foreground-muted">Stock status overview</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {inventoryAlerts.map((alert, index) => {
                  const Icon = alert.icon;
                  return (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      className={`p-3 rounded-xl ${alert.bg} text-center`}
                    >
                      <Icon className={`w-5 h-5 ${alert.color} mx-auto mb-1`} />
                      <p className="text-xl font-bold">{alert.count}</p>
                      <p className="text-[10px] text-foreground-muted">{alert.title}</p>
                    </motion.div>
                  );
                })}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lowStockProducts.slice(0, 5).map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.08 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-background-tertiary/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{product.image}</span>
                      <div>
                        <p className="text-xs font-medium truncate max-w-[120px]">{product.name}</p>
                        <p className="text-[10px] text-foreground-muted">{product.category}</p>
                      </div>
                    </div>
                    <Badge variant={product.stock === 0 ? 'danger' : 'warning'} className="text-[10px]">
                      {product.stock === 0 ? 'Out' : `${product.stock} left`}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="border border-border/50">
            <CardHeader>
              <h3 className="text-lg font-semibold font-heading">Expense Summary</h3>
              <p className="text-sm text-foreground-muted">Monthly expense breakdown</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(dashboardData?.expenseSummary || expenseSummary).map((exp, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.color }} />
                        <span className="text-sm font-medium">{exp.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(exp.amount)}</span>
                        <span className="text-xs text-foreground-muted w-8 text-right">{exp.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${exp.percentage}%` }}
                        transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: exp.color }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium">Total Expenses</span>
                <span className="text-lg font-bold font-heading">
                  {formatCurrency((dashboardData?.expenseSummary || expenseSummary).reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border border-border/50">
            <CardHeader>
              <h3 className="text-lg font-semibold font-heading">Recent Transactions</h3>
              <p className="text-sm text-foreground-muted">Latest financial activity</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(dashboardData?.recentTransactions || recentTransactions).slice(0, 6).map((txn, index) => (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="flex items-center justify-between p-3 hover:bg-background-tertiary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          txn.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {txn.type === 'income' ? <FiArrowUpRight className="w-4 h-4" /> : <FiArrowDownRight className="w-4 h-4" />}
                      </motion.div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{txn.description}</p>
                        <p className="text-xs text-foreground-muted flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {txn.time}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${txn.amount > 0 ? 'text-success' : 'text-danger'}`}>
                      {txn.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
