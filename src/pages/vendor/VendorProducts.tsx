import React, { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Pencil, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import ImagePicker from '@/components/common/ImagePicker';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { fileUrl, marketApi } from '@/lib/api';
import { PAGE_SIZE } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import { validateProductForm, type ProductForm } from '@/lib/market';
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '@/lib/types';

const EMPTY_FORM: ProductForm = {
  name: '',
  category: 'fertilizer',
  brand: '',
  unit: '',
  price: '',
  stock: '0',
  description: '',
  image_path: null,
};

function toForm(p: Product): ProductForm {
  return {
    name: p.name,
    category: p.category,
    brand: p.brand ?? '',
    unit: p.unit,
    price: String(p.price_inr),
    stock: String(p.stock),
    description: p.description ?? '',
    image_path: p.image_path,
  };
}

const ProductDialog: React.FC<{ product: Product | null; open: boolean; onClose: () => void }> = ({ product, open, onClose }) => {
  const { t } = useTranslation(['market', 'common']);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductForm>(() => (product ? toForm(product) : EMPTY_FORM));
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const set = <K extends keyof ProductForm>(key: K) => (value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim() || null,
        unit: form.unit.trim(),
        price_inr: Number(form.price),
        stock: Number(form.stock),
        description: form.description.trim() || null,
        image_path: form.image_path,
      };
      return product ? marketApi.updateProduct(product.id, payload) : marketApi.createProduct(payload);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t(product ? 'vendorProducts.saved' : 'vendorProducts.created', { name: saved.name }));
      onClose();
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problems = validateProductForm(form);
    setErrors(Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, t(`form.errors.${v}`)])));
    if (Object.keys(problems).length === 0) mutation.mutate();
  };

  const field = (key: keyof ProductForm) =>
    errors[key] ? <p className="text-sm text-red-600" role="alert">{errors[key]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? t('form.titleEdit') : t('form.titleNew')}</DialogTitle>
          <DialogDescription>{t('form.subtitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="p-name">{t('form.name')}</Label>
            <Input id="p-name" value={form.name} maxLength={160} onChange={(e) => set('name')(e.target.value)} />
            {field('name')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-category">{t('form.category')}</Label>
              <Select value={form.category} onValueChange={(v) => set('category')(v as ProductCategory)}>
                <SelectTrigger id="p-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-brand">{t('form.brand')}</Label>
              <Input id="p-brand" value={form.brand} maxLength={120} onChange={(e) => set('brand')(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="p-unit">{t('form.unit')}</Label>
              <Input id="p-unit" value={form.unit} maxLength={40} placeholder={t('form.unitPlaceholder')} onChange={(e) => set('unit')(e.target.value)} />
              {field('unit')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-price">{t('form.price')}</Label>
              <Input id="p-price" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.price} onChange={(e) => set('price')(e.target.value)} />
              {field('price')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">{t('form.stock')}</Label>
              <Input id="p-stock" type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={(e) => set('stock')(e.target.value)} />
              {field('stock')}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-description">{t('form.description')}</Label>
            <Textarea id="p-description" value={form.description} maxLength={2000} onChange={(e) => set('description')(e.target.value)} />
          </div>
          <ImagePicker label={t('form.image')} value={form.image_path} onChange={set('image_path')} disabled={mutation.isPending} />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {mutation.isPending ? t('common:actions.saving') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StockEditor: React.FC<{ product: Product }> = ({ product }) => {
  const { t } = useTranslation(['market', 'common']);
  const queryClient = useQueryClient();
  const [value, setValue] = useState(String(product.stock));
  const valid = /^\d+$/.test(value) && Number(value) <= 1_000_000;
  const mutation = useMutation({
    mutationFn: () => marketApi.updateProduct(product.id, { stock: Number(value) }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('vendorProducts.stockSaved', { name: saved.name, count: saved.stock }));
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) mutation.mutate();
      }}
    >
      <Label htmlFor={`stock-${product.id}`} className="text-sm text-gray-600 dark:text-gray-400">
        {t('vendorProducts.stockLabel')}
      </Label>
      <Input
        id={`stock-${product.id}`}
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-24"
        aria-invalid={!valid}
      />
      <Button type="submit" size="sm" variant="outline" disabled={!valid || mutation.isPending || Number(value) === product.stock}>
        {t('vendorProducts.updateStock')}
      </Button>
    </form>
  );
};

/** The vendor's own listings, including deactivated ones. */
const VendorProducts: React.FC = () => {
  const { t, i18n } = useTranslation(['market', 'common']);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const filters = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vendor-products', filters],
    queryFn: () => marketApi.myProducts(filters),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (p: Product) => marketApi.updateProduct(p.id, { active: !p.active }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t(saved.active ? 'vendorProducts.reactivated' : 'vendorProducts.deactivated', { name: saved.name }));
    },
    onError: (err) => toast.error(errorMessage(t, err)),
  });

  const addButton = (
    <Button onClick={() => setEditing('new')} className="bg-green-600 hover:bg-green-700 text-white">
      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
      {t('vendorProducts.add')}
    </Button>
  );

  return (
    <AppShell>
      <PageHeader title={t('vendorProducts.title')} subtitle={t('vendorProducts.subtitle')} actions={addButton} />
      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <ErrorAlert error={error} />
      ) : data && data.items.length === 0 ? (
        <EmptyState icon={Package} title={t('vendorProducts.empty')} body={t('vendorProducts.emptyBody')} action={addButton} />
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('vendorProducts.count', { count: data?.total ?? 0 })}</p>
          <ul className="grid gap-4 lg:grid-cols-2">
            {data?.items.map((p) => {
              const src = fileUrl(p.image_path);
              return (
                <li key={p.id}>
                  <Card className={p.active ? undefined : 'opacity-75'}>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
                      {src ? (
                        <img src={src} alt={p.name} className="h-24 w-full rounded-md object-cover sm:w-24" loading="lazy" />
                      ) : (
                        <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 sm:flex" aria-hidden="true">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold break-words">{p.name}</h3>
                          <Badge variant="outline">{t(`categories.${p.category}`)}</Badge>
                          <Badge variant={p.active ? 'secondary' : 'outline'}>
                            {p.active ? t('vendorProducts.active') : t('vendorProducts.inactive')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatMoney(p.price_inr, i18n.resolvedLanguage)} {t('catalog.perUnit', { unit: p.unit })}
                          {p.brand ? ` · ${p.brand}` : ''}
                        </p>
                        {p.stock === 0 && p.active && <p className="text-sm text-red-600">{t('catalog.outOfStock')}</p>}
                        <StockEditor key={`${p.id}-${p.stock}`} product={p} />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                            <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            {t('common:actions.edit')}
                          </Button>
                          <Button size="sm" variant={p.active ? 'ghost' : 'outline'} onClick={() => toggle.mutate(p)} disabled={toggle.isPending}>
                            {p.active ? t('vendorProducts.deactivate') : t('vendorProducts.reactivate')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
          <Pager page={page} total={data?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}
      {editing !== null && (
        <ProductDialog
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </AppShell>
  );
};

export default VendorProducts;
