import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Layout } from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatNaira } from '@/lib/utils/format';
import { useCreateOrder, useGetPaymentSettings } from '@workspace/api-client-react';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(10, 'Full address is required'),
  paymentMethod: z.enum(['pay_on_delivery', 'flutterwave']),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { data: paymentSettings, isLoading: loadingSettings } = useGetPaymentSettings();
  const createOrder = useCreateOrder();

  const [isProcessing, setIsProcessing] = useState(false);

  // Load saved progress
  const savedData = (() => {
    try {
      const saved = localStorage.getItem('mimihub_checkout');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  })();

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: savedData.fullName || '',
      phone: savedData.phone || '',
      state: savedData.state || '',
      city: savedData.city || '',
      address: savedData.address || '',
      paymentMethod: savedData.paymentMethod || 'pay_on_delivery',
    },
  });

  const formValues = watch();

  // Save progress automatically
  useEffect(() => {
    localStorage.setItem('mimihub_checkout', JSON.stringify(formValues));
  }, [formValues]);

  // If cart is empty, redirect to cart
  useEffect(() => {
    if (items.length === 0 && !isProcessing) {
      setLocation('/cart');
    }
  }, [items.length, setLocation, isProcessing]);

  if (loadingSettings || items.length === 0) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const flutterwaveEnabled = paymentSettings?.flutterwaveEnabled ?? false;
  const podEnabled = paymentSettings?.payOnDeliveryEnabled ?? true;

  const onSubmit = async (data: CheckoutFormValues) => {
    setIsProcessing(true);
    try {
      if (data.paymentMethod === 'flutterwave') {
        // Dummy integration for flutterwave
        toast.info('Redirecting to Flutterwave payment gateway...');
        setTimeout(() => {
          placeOrder(data, 'FLW-' + Math.random().toString(36).substring(7).toUpperCase());
        }, 2000);
      } else {
        await placeOrder(data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong during checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  const placeOrder = async (data: CheckoutFormValues, flutterwaveRef?: string) => {
    createOrder.mutate({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        state: data.state,
        city: data.city,
        address: data.address,
        paymentMethod: data.paymentMethod,
        flutterwaveRef,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        }))
      }
    }, {
      onSuccess: (order) => {
        clearCart();
        localStorage.removeItem('mimihub_checkout');
        toast.success('Order placed successfully!');
        setLocation(`/orders/${order.orderRef}`);
      },
      onError: () => {
        toast.error('Failed to create order. Please try again.');
        setIsProcessing(false);
      }
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8">Checkout</h1>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="flex-1">
            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
              {/* Delivery Details */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-serif text-xl mb-6">Delivery Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" {...register('fullName')} className="mt-1" />
                    {errors.fullName && <span className="text-sm text-destructive mt-1">{errors.fullName.message}</span>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" {...register('phone')} className="mt-1" />
                    {errors.phone && <span className="text-sm text-destructive mt-1">{errors.phone.message}</span>}
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state" {...register('state')} className="mt-1" />
                    {errors.state && <span className="text-sm text-destructive mt-1">{errors.state.message}</span>}
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register('city')} className="mt-1" />
                    {errors.city && <span className="text-sm text-destructive mt-1">{errors.city.message}</span>}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Label htmlFor="address">Full Address</Label>
                    <Input id="address" {...register('address')} className="mt-1" />
                    {errors.address && <span className="text-sm text-destructive mt-1">{errors.address.message}</span>}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-serif text-xl mb-6">Payment Method</h2>
                <RadioGroup 
                  defaultValue={formValues.paymentMethod}
                  onValueChange={(value) => setValue('paymentMethod', value as any)}
                  className="flex flex-col gap-3"
                >
                  {flutterwaveEnabled && (
                    <div className="flex items-center space-x-3 border border-border p-4 rounded-xl cursor-pointer hover:border-primary transition-colors">
                      <RadioGroupItem value="flutterwave" id="flutterwave" />
                      <Label htmlFor="flutterwave" className="flex-1 cursor-pointer flex justify-between items-center text-base">
                        <span>Pay online with Flutterwave</span>
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </Label>
                    </div>
                  )}
                  {podEnabled && (
                    <div className="flex items-center space-x-3 border border-border p-4 rounded-xl cursor-pointer hover:border-primary transition-colors">
                      <RadioGroupItem value="pay_on_delivery" id="pay_on_delivery" />
                      <Label htmlFor="pay_on_delivery" className="flex-1 cursor-pointer text-base">
                        Pay on Delivery
                      </Label>
                    </div>
                  )}
                </RadioGroup>
                {errors.paymentMethod && <span className="text-sm text-destructive mt-2 block">{errors.paymentMethod.message}</span>}
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
              <h2 className="font-serif text-xl text-foreground mb-6">Order Summary</h2>
              
              <div className="flex flex-col gap-3 mb-6">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 text-sm">
                    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 flex items-center justify-center rounded-full z-10">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 truncate">
                      <p className="truncate font-medium">{item.productName}</p>
                    </div>
                    <div className="font-medium">
                      {formatNaira(item.totalPrice)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="h-px w-full bg-border mb-6" />
              
              <div className="flex flex-col gap-2 mb-6 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span className="text-foreground">TBD</span>
                </div>
              </div>
              
              <div className="flex justify-between items-end mb-8">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-sans font-bold text-2xl text-primary">{formatNaira(subtotal)}</span>
              </div>

              <Button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className="w-full h-12 rounded-full text-base"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  formValues.paymentMethod === 'flutterwave' ? 'Pay with Flutterwave' : 'Confirm Order'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
