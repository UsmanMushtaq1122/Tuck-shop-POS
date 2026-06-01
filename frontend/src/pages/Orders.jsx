import React from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiEye } from 'react-icons/fi';
import { orders } from '@/data/sampleData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function Orders() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Orders</h1>
          <p className="text-foreground-muted">View and manage customer orders</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search orders..."
              className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-tertiary/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Items</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-foreground-muted uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-background-tertiary/30">
                  <td className="px-4 py-3 font-medium">{order.id}</td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">{formatDate(order.date)}</td>
                  <td className="px-4 py-3">{order.customer}</td>
                  <td className="px-4 py-3">{order.items} items</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
                      <FiEye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}