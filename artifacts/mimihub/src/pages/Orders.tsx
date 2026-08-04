import { useRoute, Link } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/ui/error-state';
import { useGetOrderByRef } from '@workspace/api-client-react';
import { formatNaira } from '@/lib/utils/format';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Truck, Package, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OrderTracking() {
  const [, params] = useRoute('/orders/:ref');
  const orderRef = params?.ref || '';

  const { data: order, isLoading, isError } = useGetOrderByRef(orderRef, {
    query: { enabled: !!orderRef }
  });

  if (isLoading) return <LoadingPage />;
  
  if (isError || !order) {
    return (
      <Layout>
        <ErrorState 
          title="Order Not Found" 
          message="We couldn't find an order with that reference number. Please check the number and try again." 
        />
        <div className="text-center pb-12">
          <Link href="/account?tab=orders" className="text-primary hover:underline">
            Back to Orders Lookup
          </Link>
        </div>
      </Layout>
    );
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Awaiting Payment': return <Clock className="w-5 h-5" />;
      case 'Paid': return <CheckCircle2 className="w-5 h-5" />;
      case 'Preparing': return <Package className="w-5 h-5" />;
      case 'Ready for Shipping': return <PackageCheck className="w-5 h-5" />;
      case 'Delivered': return <Truck className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="font-serif text-3xl text-foreground mb-2">Order Tracker</h1>
            <p className="text-muted-foreground font-mono bg-secondary px-3 py-1 rounded-md inline-block">
              {order.orderRef}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground block mb-1">Order Date</span>
            <span className="font-medium">{format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              {getStatusIcon(order.orderStatus)}
            </div>
            <span className="text-sm text-muted-foreground mb-1">Status</span>
            <span className="font-medium text-foreground">{order.orderStatus}</span>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center">
            <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-3">
              <CheckCircle2 className={cn("w-5 h-5", order.paymentStatus === 'Paid' ? "text-green-500" : "text-amber-500")} />
            </div>
            <span className="text-sm text-muted-foreground mb-1">Payment</span>
            <span className="font-medium text-foreground">{order.paymentStatus}</span>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl flex flex-col items-center text-center">
            <div className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-sm text-muted-foreground mb-1">Items</span>
            <span className="font-medium text-foreground">{order.items.length} items</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            {/* Timeline */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-serif text-xl mb-6">Order Timeline</h2>
              <div className="relative border-l-2 border-border ml-3 flex flex-col gap-6">
                {order.timeline.map((step, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1.5 ring-4 ring-background" />
                    <h3 className="font-medium text-foreground">{step.status}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(step.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                    {step.note && (
                      <p className="text-sm text-muted-foreground mt-2 bg-secondary/50 p-2 rounded-md">
                        {step.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-serif text-xl mb-6">Delivery Details</h2>
              <div className="flex flex-col gap-3 text-sm">
                <p><span className="text-muted-foreground w-20 inline-block">Name:</span> <span className="font-medium">{order.fullName}</span></p>
                <p><span className="text-muted-foreground w-20 inline-block">Phone:</span> <span className="font-medium">{order.phone}</span></p>
                <p><span className="text-muted-foreground w-20 items-start inline-block">Address:</span> <span className="font-medium max-w-[200px]">{order.address}, {order.city}, {order.state}</span></p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-card border border-border rounded-2xl p-6 h-fit">
            <h2 className="font-serif text-xl mb-6">Order Summary</h2>
            <div className="flex flex-col gap-4 mb-6">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                    <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.quantity} × {formatNaira(item.unitPrice)}</p>
                  </div>
                  <div className="font-medium text-sm">
                    {formatNaira(item.totalPrice)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="h-px w-full bg-border mb-4" />
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatNaira(order.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center mb-6 text-sm">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="capitalize">{order.paymentMethod.replace('_', ' ')}</span>
            </div>
            
            <div className="flex justify-between items-end">
              <span className="font-medium">Total Paid</span>
              <span className="font-sans font-bold text-2xl text-primary">{formatNaira(order.subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
