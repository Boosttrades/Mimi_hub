import { AdminLayout } from './AdminLayout';
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNaira } from '@/lib/utils/format';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const STATUSES = ['Awaiting Payment', 'Paid', 'Preparing', 'Ready for Shipping', 'Delivered', 'Cancelled'];

export function AdminOrders() {
  const { data: orders, isLoading } = useListOrders();
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatus.mutate({ id: orderId, data: { orderStatus: newStatus } }, {
      onSuccess: () => {
        toast.success('Status updated');
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      }
    });
  };

  if (isLoading) return <AdminLayout title="Orders"><LoadingSpinner size="lg" /></AdminLayout>;

  return (
    <AdminLayout title="Orders">
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 text-muted-foreground text-sm text-left">
              <tr>
                <th className="px-6 py-4 font-medium">Order Ref</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Payment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders?.map((order) => (
                <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-primary font-medium">{order.orderRef}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">{order.fullName}</p>
                    <p className="text-xs text-muted-foreground">{order.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), 'MMM d, h:mm a')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{formatNaira(order.subtotal)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Select value={order.orderStatus} onValueChange={(val) => handleStatusChange(order.id, val)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">View Details</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order {order.orderRef}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">Customer</p>
                              <p className="font-medium">{order.fullName}</p>
                              <p>{order.phone}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">Delivery Address</p>
                              <p>{order.address}</p>
                              <p>{order.city}, {order.state}</p>
                            </div>
                          </div>
                          
                          <h4 className="font-medium mb-3 border-b pb-2">Items</h4>
                          <div className="space-y-3 mb-6">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-secondary rounded overflow-hidden">
                                    <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <span>{item.quantity}x {item.productName}</span>
                                </div>
                                <span className="font-medium">{formatNaira(item.totalPrice)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center pt-4 border-t text-lg font-bold">
                            <span>Total Paid</span>
                            <span className="text-primary">{formatNaira(order.subtotal)}</span>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
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
