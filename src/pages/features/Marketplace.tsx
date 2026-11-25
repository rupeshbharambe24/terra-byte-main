import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Package, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fileUrl, marketApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS, PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import {
  addToCart,
  cartCount,
  defaultAddress,
  estimatedTotal,
  groupByVendor,
  lineEstimate,
  removeFromCart,
  toOrderItems,
  updateQuantity,
  type Cart,
} from '@/lib/market';
import { PAYMENT_METHODS, PRODUCT_CATEGORIES, type Order, type PaymentMethod, type Product, type ProductCategory } from '@/lib/types';

const ALL = 'all';

/** Quantity stepper used in the cart and the "buy now" dialog. */
const QuantityStepper: React.FC<{
  value: number;
  max: number;
  onChange: (q: number) => void;
  label: string;
}> = ({ value, max, onChange, label }) => {
  const { t } = useTranslation(['market']);
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => onChange(value - 1)} aria-label={t('cart.decrease')}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        aria-label={t('cart.quantity')}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-16 text-center"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={t('cart.increase')}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};

const ProductCard: React.FC<{
  product: Product;
  canBuy: boolean;
  inCart: number;
  onAdd: () => void;
  onBuyNow: () => void;
}> = ({ product, canBuy, inCart, onAdd, onBuyNow }) => {
  const { t, i18n } = useTranslation(['market', 'common']);
  const src = fileUrl(product.image_path);
  const outOfStock = product.stock <= 0;
  return (
    <Card className="flex flex-col overflow-hidden">
      {src ? (
        <img src={src} alt={product.name} className="h-40 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gray-100 dark:bg-gray-800" aria-hidden="true">
          <Package className="h-10 w-10 text-gray-400" />
        </div>
      )}
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white break-words">{product.name}</h3>
          <Badge variant="outline" className="shrink-0">{t(`categories.${product.category}`)}</Badge>
        </div>
        {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('catalog.by', { vendor: product.vendor_name })}
          {product.vendor_district ? ` · ${product.vendor_district}` : ''}
        </p>
        {product.description && <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{product.description}</p>}
        <div className="mt-auto pt-2">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatMoney(product.price_inr, i18n.resolvedLanguage)}{' '}
            <span className="text-sm font-normal text-gray-500">{t('catalog.perUnit', { unit: product.unit })}</span>
          </p>
          <p className={`text-sm ${outOfStock ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
            {outOfStock ? t('catalog.outOfStock') : t('catalog.stock', { count: product.stock, unit: product.unit })}
          </p>
          {canBuy && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={onAdd} disabled={outOfStock || inCart >= product.stock} className="bg-green-600 hover:bg-green-700 text-white">
                <ShoppingCart className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('catalog.addToCart')}
              </Button>
              <Button size="sm" variant="outline" onClick={onBuyNow} disabled={outOfStock}>
                {t('catalog.buyNow')}
              </Button>
              {inCart > 0 && <span className="self-center text-xs text-gray-500">{t('catalog.inCart', { count: inCart })}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface CheckoutProps {
  lines: Cart;
  onLinesChange: (lines: Cart) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaced: (orders: Order[]) => void;
}

const CheckoutDialog: React.FC<CheckoutProps> = ({ lines, onLinesChange, open, onOpenChange, onPlaced }) => {
  const { t, i18n } = useTranslation(['market', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState(() => defaultAddress(user));
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      marketApi.placeOrder({
        items: toOrderItems(lines),
        delivery_address: address.trim(),
        payment_method: payment,
        note: note.trim() || null,
      }),
    onSuccess: (orders) => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      setNote('');
      onPlaced(orders);
    },
    onError: (err) => setError(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (address.trim().length < 5) {
      setError(t('checkout.addressTooShort'));
      return;
    }
    if (lines.length === 0) return;
    mutation.mutate();
  };

  const groups = groupByVendor(lines);
  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('checkout.title')}</DialogTitle>
          <DialogDescription>{groups.length > 1 ? t('cart.oneOrderPerVendor') : t('checkout.subtitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.vendorId} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{g.vendorName}</p>
                <ul className="mt-2 space-y-2">
                  {g.lines.map((l) => (
                    <li key={l.productId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 break-words">{l.name} <span className="text-gray-500">({l.unit})</span></span>
                      <QuantityStepper
                        value={l.quantity}
                        max={l.stock}
                        label={l.name}
                        onChange={(q) => onLinesChange(updateQuantity(lines, l.productId, q))}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-sm">
              {t('cart.estimate')}: <strong>{formatMoney(estimatedTotal(lines), i18n.resolvedLanguage)}</strong>
            </p>
            <p className="text-xs text-gray-500">{t('cart.estimateNote')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout-address">{t('checkout.address')}</Label>
            <Textarea id="checkout-address" value={address} maxLength={500} onChange={(e) => setAddress(e.target.value)} required />
            <p className="text-xs text-gray-500">{t('checkout.addressHint')}</p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('checkout.payment')}</legend>
            <RadioGroup value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <RadioGroupItem id={`pay-${m}`} value={m} />
                  <Label htmlFor={`pay-${m}`} className="font-normal">{t(`payment.${m}`)}</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-gray-500">{t('payment.hint')}</p>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="checkout-note">{t('checkout.note')}</Label>
            <Input id="checkout-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t('checkout.notePlaceholder')} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending || lines.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
              {mutation.isPending ? t('checkout.placing') : t('checkout.place')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Marketplace: React.FC = () => {
  const { t, i18n } = useTranslation(['market', 'common']);
  const { user } = useAuth();
  const canBuy = user?.role === 'farmer';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | typeof ALL>(ALL);
  const [district, setDistrict] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [cart, setCart] = useState<Cart>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLines, setCheckoutLines] = useState<Cart | null>(null);
  const [fromCart, setFromCart] = useState(false);
  const [placed, setPlaced] = useState<Order[] | null>(null);
  const q = useDebouncedValue(search.trim(), 300);

  const filters = {
    q: q || undefined,
    category: category === ALL ? undefined : category,
    district: district === ALL ? undefined : district,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => marketApi.products(filters),
    placeholderData: keepPreviousData,
  });

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(0);
  };

  const add = (p: Product) => {
    setCart((c) => addToCart(c, p, 1));
    toast.success(t('cart.added', { name: p.name }));
  };
  const buyNow = (p: Product) => {
    setFromCart(false);
    setCheckoutLines(addToCart([], p, 1));
  };
  const checkoutCart = () => {
    setCartOpen(false);
    setFromCart(true);
    setCheckoutLines(cart);
  };
  const onPlaced = (orders: Order[]) => {
    if (fromCart) setCart([]);
    setCheckoutLines(null);
    setPlaced(orders);
  };
  const count = cartCount(cart);

  return (
    <AppShell>
      <PageHeader
        title={t('catalog.title')}
        subtitle={canBuy ? t('catalog.subtitle') : t('catalog.vendorNote')}
        actions={
          canBuy ? (
            <>
              <Button variant="outline" asChild>
                <Link to="/orders">{t('catalog.myOrders')}</Link>
              </Button>
              <Button onClick={() => setCartOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('cart.open', { count })}
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
          <Input
            type="search"
            aria-label={t('catalog.searchPlaceholder')}
            placeholder={t('catalog.searchPlaceholder')}
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:w-[26rem]">
          <Select value={category} onValueChange={(v) => resetPage(setCategory)(v as ProductCategory | typeof ALL)}>
            <SelectTrigger aria-label={t('catalog.category')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('catalog.allCategories')}</SelectItem>
              {PRODUCT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={district} onValueChange={(v) => resetPage(setDistrict)(v)}>
            <SelectTrigger aria-label={t('catalog.district')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('catalog.allDistricts')}</SelectItem>
              {MAHARASHTRA_DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={q || category !== ALL || district !== ALL ? t('catalog.emptyFiltered') : t('catalog.empty')}
          body={t('catalog.emptyBody')}
        />
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3" aria-live="polite">
            {t('catalog.total', { count: data?.total ?? 0 })}
          </p>
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
            {data?.items.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                canBuy={canBuy}
                inCart={cart.find((l) => l.productId === p.id)?.quantity ?? 0}
                onAdd={() => add(p)}
                onBuyNow={() => buyNow(p)}
              />
            ))}
          </div>
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      {canBuy && (
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetContent side="right" className="w-full max-w-[100vw] sm:max-w-md overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>{t('cart.title')}</SheetTitle>
              <SheetDescription>{t('cart.oneOrderPerVendor')}</SheetDescription>
            </SheetHeader>
            {cart.length === 0 ? (
              <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">{t('cart.empty')}</p>
            ) : (
              <div className="mt-4 space-y-4">
                {groupByVendor(cart).map((g) => (
                  <div key={g.vendorId} className="rounded-lg border p-3">
                    <p className="font-medium">{g.vendorName}</p>
                    <ul className="mt-2 space-y-3">
                      {g.lines.map((l) => (
                        <li key={l.productId} className="space-y-1">
                          <div className="flex items-start justify-between gap-2 text-sm">
                            <span className="min-w-0 break-words">{l.name} <span className="text-gray-500">({l.unit})</span></span>
                            <span className="shrink-0">{formatMoney(lineEstimate(l), i18n.resolvedLanguage)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <QuantityStepper
                              value={l.quantity}
                              max={l.stock}
                              label={l.name}
                              onChange={(qty) => setCart((c) => updateQuantity(c, l.productId, qty))}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setCart((c) => removeFromCart(c, l.productId))}
                              aria-label={t('cart.remove', { name: l.name })}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-right text-sm text-gray-600 dark:text-gray-400">
                      {t('cart.vendorSubtotal')}: {formatMoney(g.estimate, i18n.resolvedLanguage)}
                    </p>
                  </div>
                ))}
                <div className="border-t pt-3">
                  <p className="flex justify-between font-semibold">
                    <span>{t('cart.estimate')}</span>
                    <span>{formatMoney(estimatedTotal(cart), i18n.resolvedLanguage)}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{t('cart.estimateNote')}</p>
                  <Button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white" onClick={checkoutCart}>
                    {t('cart.checkout')}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}

      {checkoutLines && (
        <CheckoutDialog
          open
          lines={checkoutLines}
          onLinesChange={(lines) => {
            setCheckoutLines(lines);
            if (fromCart) setCart(lines);
          }}
          onOpenChange={(o) => !o && setCheckoutLines(null)}
          onPlaced={onPlaced}
        />
      )}

      <Dialog open={placed !== null} onOpenChange={(o) => !o && setPlaced(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('checkout.successTitle')}</DialogTitle>
            <DialogDescription>{t('checkout.successBody', { count: placed?.length ?? 0 })}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {placed?.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <span>
                  <Link to={`/orders/${o.id}`} className="font-medium text-green-700 hover:underline dark:text-green-400">
                    {t('orders.orderNo', { id: o.id })}
                  </Link>{' '}
                  · {o.vendor_name}
                </span>
                <strong>{formatMoney(o.total_inr, i18n.resolvedLanguage)}</strong>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500">{t('checkout.serverTotals')}</p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPlaced(null)}>{t('checkout.continue')}</Button>
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link to="/orders">{t('checkout.viewOrders')}</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Marketplace;
