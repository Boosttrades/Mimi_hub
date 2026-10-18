import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { 
  useGetStoreSettings, useUpdateStoreSettings, 
  useGetPaymentSettings, useUpdatePaymentSettings,
  getGetStoreSettingsQueryKey, getGetPaymentSettingsQueryKey 
} from '@workspace/api-client-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Store, CreditCard } from 'lucide-react';

export function AdminSettings() {
  const { data: storeSettings, isLoading: loadingStore } = useGetStoreSettings();
  const { data: paymentSettings, isLoading: loadingPayment } = useGetPaymentSettings();
  
  const updateStore = useUpdateStoreSettings();
  const updatePayment = useUpdatePaymentSettings();
  const queryClient = useQueryClient();

  const [storeForm, setStoreForm] = useState<any>({});
  const [paymentForm, setPaymentForm] = useState<any>({});

  useEffect(() => {
    if (storeSettings) setStoreForm(storeSettings);
    if (paymentSettings) setPaymentForm(paymentSettings);
  }, [storeSettings, paymentSettings]);

  if (loadingStore || loadingPayment) return <AdminLayout title="Settings"><LoadingSpinner size="lg" /></AdminLayout>;

  const handleStoreSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore.mutate({ data: storeForm }, {
      onSuccess: () => {
        toast.success('Store settings saved');
        queryClient.invalidateQueries({ queryKey: getGetStoreSettingsQueryKey() });
      }
    });
  };

  const handlePaymentSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePayment.mutate({ data: paymentForm }, {
      onSuccess: () => {
        toast.success('Payment settings saved');
        queryClient.invalidateQueries({ queryKey: getGetPaymentSettingsQueryKey() });
      }
    });
  };

  return (
    <AdminLayout title="Settings">
      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Store Settings */}
        <form onSubmit={handleStoreSave} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Store className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-medium">Store Profile</h2>
          </div>
          
          <div>
            <Label>Store Name</Label>
            <Input value={storeForm.storeName || ''} onChange={e => setStoreForm({...storeForm, storeName: e.target.value})} className="mt-1" />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input value={storeForm.email || ''} onChange={e => setStoreForm({...storeForm, email: e.target.value})} type="email" className="mt-1" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={storeForm.contactPhone || ''} onChange={e => setStoreForm({...storeForm, contactPhone: e.target.value})} className="mt-1" />
          </div>
          <div>
            <Label>WhatsApp Number</Label>
            <Input value={storeForm.whatsapp || ''} onChange={e => setStoreForm({...storeForm, whatsapp: e.target.value})} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="low-stock-threshold">Low stock threshold</Label>
            <Input
              id="low-stock-threshold"
              type="number"
              min={1}
              max={100000}
              step={1}
              value={storeForm.lowStockThreshold ?? 5}
              onChange={e => setStoreForm({...storeForm, lowStockThreshold: Number(e.target.value)})}
              className="mt-1"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Products with 1–{storeForm.lowStockThreshold ?? 5 - 1} units remaining appear as low stock.
            </p>
          </div>
          
          <Button type="submit" className="mt-auto">Save Store Settings</Button>
        </form>

        {/* Payment Settings */}
        <form onSubmit={handlePaymentSave} className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-medium">Payment Methods</h2>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-xl">
            <div>
              <p className="font-medium text-foreground">Flutterwave Integration</p>
              <p className="text-sm text-muted-foreground">Accept online card payments</p>
            </div>
            <Switch 
              checked={paymentForm.flutterwaveEnabled || false} 
              onCheckedChange={c => setPaymentForm({...paymentForm, flutterwaveEnabled: c})} 
            />
          </div>
          
          <div className="flex items-center justify-between p-4 border border-border rounded-xl">
            <div>
              <p className="font-medium text-foreground">Pay on Delivery</p>
              <p className="text-sm text-muted-foreground">Customers pay when order arrives</p>
            </div>
            <Switch 
              checked={paymentForm.payOnDeliveryEnabled || false} 
              onCheckedChange={c => setPaymentForm({...paymentForm, payOnDeliveryEnabled: c})} 
            />
          </div>

          <Button type="submit" className="mt-auto">Save Payment Settings</Button>
        </form>

      </div>
    </AdminLayout>
  );
}
