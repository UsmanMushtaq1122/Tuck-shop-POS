import React from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiPhone, FiMail } from 'react-icons/fi';
import { employees } from '@/data/sampleData';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function Employees() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Employees</h1>
          <p className="text-foreground-muted">Manage staff and roles</p>
        </div>
        <Button>
          <FiPlus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-3xl font-bold">{employees.length}</p>
            <p className="text-sm text-foreground-muted">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-3xl font-bold">{employees.filter(e => e.role === 'Cashier').length}</p>
            <p className="text-sm text-foreground-muted">Cashiers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-3xl font-bold">{formatCurrency(employees.reduce((a, e) => a + e.salary, 0))}</p>
            <p className="text-sm text-foreground-muted">Monthly Payroll</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee, index) => (
          <motion.div
            key={employee.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover className="cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <Badge variant={employee.role === 'Manager' ? 'warning' : 'success'}>{employee.role}</Badge>
                </div>
                <h3 className="font-semibold font-heading text-lg mb-3">{employee.name}</h3>
                <div className="space-y-2 text-sm text-foreground-muted">
                  <div className="flex items-center gap-2">
                    <FiPhone className="w-4 h-4" />
                    <span>{employee.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salary</span>
                    <span className="font-medium">{formatCurrency(employee.salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shifts</span>
                    <span className="font-medium">{employee.shifts} this month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}