import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiCalendar, FiDollarSign,
  FiTrendingUp, FiPieChart, FiUsers, FiClock, FiDownload, FiRefreshCw, FiX
} from 'react-icons/fi';
import { expenseService, salaryService } from '@/services/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RoleGuard } from '@/components/RoleGuard';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const EXPENSE_CATEGORIES = [
  'Rent', 'Electricity', 'Water', 'Gas', 'Internet', 'Phone',
  'Supplies', 'Transport', 'Maintenance', 'Salary', 'Marketing',
  'Insurance', 'Tax', 'Food', 'Miscellaneous',
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#06B6D4', '#84CC16', '#F43F5E', '#0EA5E9', '#A855F7', '#EAB308'];

export default function Expenses() {
  const { user } = useSelector((state) => state.auth);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ today: 0, month: 0, byCategory: [] });
  const [salaries, setSalaries] = useState([]);
  const [salarySummary, setSalarySummary] = useState({ total: 0, count: 0, monthly: [] });
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [salaryMonth, setSalaryMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(null);

  const [form, setForm] = useState({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false });
  const [salaryForm, setSalaryForm] = useState({ employee_id: '', employee_name: '', amount: '', month: salaryMonth, year: salaryYear, date: new Date().toISOString().split('T')[0], notes: '' });
  const [salaryEmployees, setSalaryEmployees] = useState([]);

  const loadExpenses = useCallback(async () => {
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (filterDate) params.startDate = filterDate;
      const [expensesRes, summaryRes] = await Promise.all([
        expenseService.getAll(params),
        expenseService.getSummary(),
      ]);
      setExpenses(expensesRes.expenses || []);
      setSummary(summaryRes);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    }
  }, [filterCategory, filterDate]);

  const loadSalaries = useCallback(async () => {
    try {
      const [salariesRes, summaryRes, employeesRes] = await Promise.all([
        salaryService.getAll({ month: salaryMonth, year: salaryYear }),
        salaryService.getSummary({ year: salaryYear }),
        salaryService.getEmployees(),
      ]);
      setSalaries(salariesRes.salaries || []);
      setSalarySummary(summaryRes);
      setSalaryEmployees(employeesRes.users || []);
    } catch (error) {
      console.error('Failed to load salaries:', error);
    }
  }, [salaryMonth, salaryYear]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadExpenses(), loadSalaries()]);
    setLoading(false);
  }, [loadExpenses, loadSalaries]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => setForm({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], is_recurring: false });
  const resetSalaryForm = () => setSalaryForm({ employee_id: '', employee_name: '', amount: '', month: salaryMonth, year: salaryYear, date: new Date().toISOString().split('T')[0], notes: '' });

  const handleSubmit = async () => {
    try {
      if (editingExpense) {
        await expenseService.update(editingExpense.id, form);
      } else {
        await expenseService.create(form);
      }
      setShowModal(false);
      setEditingExpense(null);
      resetForm();
      loadExpenses();
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await expenseService.delete(deletingExpense.id);
      setShowDeleteModal(false);
      setDeletingExpense(null);
      loadExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handlePaySalary = async () => {
    try {
      await salaryService.create(salaryForm);
      setShowSalaryModal(false);
      resetSalaryForm();
      loadData();
    } catch (error) {
      console.error('Failed to record salary:', error);
    }
  };

  const handleDeleteSalary = async (id) => {
    try {
      await salaryService.delete(id);
      loadSalaries();
    } catch (error) {
      console.error('Failed to delete salary:', error);
    }
  };

  const monthTotal = summary?.month || 0;
  const todayTotal = summary?.today || 0;
  const salaryTotalThisYear = salarySummary?.total || 0;
  const filteredExpenses = expenses.filter(e =>
    (!searchQuery || e.description?.toLowerCase().includes(searchQuery.toLowerCase()) || e.category?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Expense Management</h1>
          <p className="text-foreground-muted">Track expenses, salaries, and financial reports</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'salaries' ? (
            <RoleGuard roles={['admin', 'manager']}>
              <Button onClick={() => { resetSalaryForm(); setShowSalaryModal(true); }}>
                <FiPlus className="w-4 h-4 mr-2" />
                Pay Salary
              </Button>
            </RoleGuard>
          ) : (
            <RoleGuard roles={['admin', 'manager']}>
              <Button onClick={() => { resetForm(); setShowModal(true); }}>
                <FiPlus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </RoleGuard>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-foreground-muted">Today</p>
            <p className="text-2xl font-bold text-danger mt-1">{formatCurrency(todayTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-foreground-muted">This Month</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">{formatCurrency(monthTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-foreground-muted">Salaries (Year)</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(salaryTotalThisYear)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-foreground-muted">Categories</p>
            <p className="text-2xl font-bold text-accent mt-1">{summary?.byCategory?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex border-b border-border">
            {[
              { id: 'expenses', label: 'Expenses', icon: FiDollarSign },
              { id: 'salaries', label: 'Salaries', icon: FiUsers },
              { id: 'reports', label: 'Reports', icon: FiTrendingUp },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-foreground-muted hover:text-foreground')}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'expenses' && (
            <div>
              <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                  <input type="text" placeholder="Search expenses..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm">
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="relative">
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                    className="pl-10 pr-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm" />
                </div>
                <Button variant="ghost" size="sm" onClick={loadExpenses}><FiRefreshCw className="w-4 h-4" /></Button>
              </div>
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {filteredExpenses.length > 0 ? filteredExpenses.map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-background-tertiary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-danger/10 rounded-lg flex items-center justify-center">
                        <FiDollarSign className="w-5 h-5 text-danger" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{expense.description || expense.category}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{expense.category}</Badge>
                          <span className="text-xs text-foreground-muted">{formatDate(expense.date)}</span>
                          {expense.user_name && <span className="text-xs text-foreground-muted">by {expense.user_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-danger">{formatCurrency(expense.amount)}</span>
                      <RoleGuard roles={['admin', 'manager']}>
                        <button onClick={() => { setEditingExpense(expense); setForm({ category: expense.category, amount: expense.amount, description: expense.description || '', date: expense.date, is_recurring: expense.is_recurring || false }); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setDeletingExpense(expense); setShowDeleteModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </RoleGuard>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-foreground-muted">
                    <FiDollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No expenses found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'salaries' && (
            <div>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <select value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)}
                  className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm">
                  {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                </select>
                <select value={salaryYear} onChange={(e) => setSalaryYear(parseInt(e.target.value))}
                  className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <Button variant="ghost" size="sm" onClick={loadSalaries}><FiRefreshCw className="w-4 h-4" /></Button>
                <div className="ml-auto text-sm text-foreground-muted">
                  Total: <span className="font-bold text-purple-400">{formatCurrency(salaries.reduce((s, r) => s + r.amount, 0))}</span>
                </div>
              </div>
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {salaries.length > 0 ? salaries.map(salary => (
                  <div key={salary.id} className="flex items-center justify-between p-4 hover:bg-background-tertiary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <FiUsers className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{salary.employee_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="info" className="text-[10px]">{MONTHS[parseInt(salary.month) - 1]} {salary.year}</Badge>
                          <span className="text-xs text-foreground-muted">{formatDate(salary.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={salary.status === 'paid' ? 'success' : 'warning'}>{salary.status}</Badge>
                      <span className="font-medium text-purple-400">{formatCurrency(salary.amount)}</span>
                      {salary.notes && <span className="text-xs text-foreground-muted max-w-[150px] truncate">{salary.notes}</span>}
                      <RoleGuard roles={['admin']}>
                        <button onClick={() => handleDeleteSalary(salary.id)}
                          className="p-1.5 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </RoleGuard>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-foreground-muted">
                    <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No salaries recorded for this period</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FiPieChart className="w-4 h-4" />
                    Expenses by Category
                  </h4>
                  {(summary?.byCategory?.length || 0) > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={summary.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                            {summary.byCategory.map((entry, i) => (
                              <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-foreground-muted text-sm">No data</div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FiTrendingUp className="w-4 h-4" />
                    Monthly Salaries
                  </h4>
                  {(salarySummary?.monthly?.length || 0) > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salarySummary.monthly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.3)" />
                          <YAxis tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.3)" />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-foreground-muted text-sm">No data</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Category Breakdown
                </h4>
                {(summary?.byCategory?.length || 0) > 0 ? (
                  <div className="space-y-2">
                    {summary.byCategory.map((cat, i) => (
                      <div key={cat.category} className="flex items-center justify-between p-3 bg-background-tertiary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm">{cat.category}</span>
                          <Badge variant="info" className="text-[10px]">{cat.count} entries</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(cat.total)}</span>
                          <span className="text-xs text-foreground-muted ml-2">
                            ({monthTotal > 0 ? ((cat.total / monthTotal) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted text-center py-8">No expense data available</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showModal && (
          <Modal open={showModal} onClose={() => { setShowModal(false); setEditingExpense(null); resetForm(); }}
            title={editingExpense ? 'Edit Expense' : 'Add Expense'} size="md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Category *</label>
                <select value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} className="input">
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Amount *</label>
                <input type="number" value={form.amount} onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00" min="0" step="0.01" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this expense for?" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))} className="input" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={(e) => setForm(prev => ({ ...prev, is_recurring: e.target.checked ? 1 : 0 }))}
                  className="w-4 h-4 rounded border-border bg-background-tertiary" />
                <label htmlFor="recurring" className="text-sm">Recurring expense (e.g., rent, utilities)</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowModal(false); setEditingExpense(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.category || !form.amount}>
                  {editingExpense ? 'Update' : 'Add Expense'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {showDeleteModal && deletingExpense && (
          <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletingExpense(null); }} title="Delete Expense" size="sm">
            <div className="space-y-4">
              <p className="text-sm">Are you sure you want to delete <strong>{deletingExpense.description || deletingExpense.category}</strong>?</p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeletingExpense(null); }}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </Modal>
        )}

        {showSalaryModal && (
          <Modal open={showSalaryModal} onClose={() => { setShowSalaryModal(false); resetSalaryForm(); }} title="Pay Salary" size="md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Employee</label>
                <div className="flex gap-2">
                  <select value={salaryForm.employee_id} onChange={(e) => {
                    const emp = salaryEmployees.find(u => u.id === e.target.value);
                    setSalaryForm(prev => ({ ...prev, employee_id: e.target.value, employee_name: emp ? emp.name : '' }));
                  }} className="input flex-1">
                    <option value="">Select employee</option>
                    {salaryEmployees.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                  <input type="text" value={salaryForm.employee_name} onChange={(e) => setSalaryForm(prev => ({ ...prev, employee_name: e.target.value, employee_id: '' }))}
                    placeholder="Or type name" className="input flex-1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Salary Amount *</label>
                <input type="number" value={salaryForm.amount} onChange={(e) => setSalaryForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00" min="0" step="0.01" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Month</label>
                  <select value={salaryForm.month} onChange={(e) => setSalaryForm(prev => ({ ...prev, month: e.target.value }))} className="input">
                    {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Year</label>
                  <select value={salaryForm.year} onChange={(e) => setSalaryForm(prev => ({ ...prev, year: parseInt(e.target.value) }))} className="input">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Payment Date</label>
                <input type="date" value={salaryForm.date} onChange={(e) => setSalaryForm(prev => ({ ...prev, date: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes</label>
                <input type="text" value={salaryForm.notes} onChange={(e) => setSalaryForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes" className="input" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="secondary" onClick={() => { setShowSalaryModal(false); resetSalaryForm(); }}>Cancel</Button>
                <Button onClick={handlePaySalary} disabled={!salaryForm.employee_name || !salaryForm.amount}>
                  Pay Salary <span className="ml-1">({formatCurrency(salaryForm.amount)})</span>
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
