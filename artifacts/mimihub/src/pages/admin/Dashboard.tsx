import { AdminLayout } from './AdminLayout';
import { useGetOrderStats, useListOrders } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatNaira } from '@/lib/utils/format';
import { Package, RefreshCw, ShoppingCart, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';

export function Dashboard() {
  const { data: stats, isLoading: loadingStats } = useGetOrderStats();
  const { data: recentOrders, isLoading: loadingOrders } = useListOrders();

  if (loadingStats || loadingOrders) {
    return <AdminLayout title="Dashboard"><LoadingSpinner size="lg" /></AdminLayout>;
  }

  const statCards = [
    { title: 'Total Revenue', value: formatNaira(stats?.totalRevenue), icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Pending Orders', value: stats?.pendingOrders || 0, icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'Preparing', value: stats?.preparingOrders || 0, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-muted-foreground font-medium">{card.title}</h3>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-serif text-xl font-medium text-foreground">Recent Orders</h2>
          <Link href="/admin/orders">
            <span className="text-sm text-primary hover:underline cursor-pointer">View All</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 text-muted-foreground text-sm text-left">
              <tr>
                <th className="px-6 py-4 font-medium">Order Ref</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders?.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-primary">
                    <Link href={`/admin/orders?ref=${order.orderRef}`}>{order.orderRef}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{order.fullName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{formatNaira(order.subtotal)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${order.orderStatus === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                        order.orderStatus === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
