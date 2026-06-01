import React from 'react';
import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn('skeleton', className)}
      {...props}
    />
  );
};

const CardSkeleton = () => (
  <div className="glass-card p-6 space-y-4">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-3 w-1/4" />
  </div>
);

const StatCardSkeleton = () => (
  <div className="stat-card p-5">
    <div className="flex items-center justify-between mb-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="w-10 h-10 rounded-xl" />
    </div>
    <Skeleton className="h-8 w-20 mb-2" />
    <Skeleton className="h-3 w-16" />
  </div>
);

const TableRowSkeleton = ({ columns = 5 }) => (
  <tr className="border-b border-border">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

const TableSkeleton = ({ rows = 5, columns = 5 }) => (
  <div className="glass-card overflow-hidden">
    <div className="p-4 border-b border-border">
      <Skeleton className="h-6 w-48" />
    </div>
    <table className="w-full">
      <thead>
        <tr className="border-b border-border">
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

export { Skeleton, CardSkeleton, StatCardSkeleton, TableRowSkeleton, TableSkeleton };
