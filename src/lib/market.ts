// Pure marketplace helpers: the cart (client-side only; the server recomputes every price and
// total) and the order status timeline.
import type { Order, OrderAction, OrderStatus, Product, ProductCategory } from './types';

export interface CartLine {
  productId: number;
  vendorId: number;
  vendorName: string;
  name: string;
  unit: string;
  /** Listing price when added; only used for an estimate. */
  unitPrice: number;
  stock: number;
  quantity: number;
}

export type Cart = CartLine[];

/** Server limit per product per order. */
export const MAX_QUANTITY = 1000;

function clamp(quantity: number, stock: number): number {
  const max = Math.min(stock, MAX_QUANTITY);
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.min(Math.floor(quantity), max));
}

/** Add `quantity` of a product (merging with an existing line), never beyond the stock. */
export function addToCart(cart: Cart, product: Product, quantity = 1): Cart {
  const existing = cart.find((l) => l.productId === product.id);
  const wanted = (existing?.quantity ?? 0) + quantity;
  const next = clamp(wanted, product.stock);
  if (next <= 0) return cart.filter((l) => l.productId !== product.id);
  const line: CartLine = {
    productId: product.id,
    vendorId: product.vendor_id,
    vendorName: product.vendor_name,
    name: product.name,
    unit: product.unit,
    unitPrice: product.price_inr,
    stock: product.stock,
    quantity: next,
  };
  return existing ? cart.map((l) => (l.productId === product.id ? line : l)) : [...cart, line];
}

/** Set a line's quantity (clamped to stock); 0 or less removes it. */
export function updateQuantity(cart: Cart, productId: number, quantity: number): Cart {
  return cart.flatMap((l) => {
    if (l.productId !== productId) return [l];
    const q = clamp(quantity, l.stock);
    return q > 0 ? [{ ...l, quantity: q }] : [];
  });
}

export function removeFromCart(cart: Cart, productId: number): Cart {
  return cart.filter((l) => l.productId !== productId);
}

export function cartCount(cart: Cart): number {
  return cart.reduce((n, l) => n + l.quantity, 0);
}

/** Rounded to paise, like the server. */
export function lineEstimate(line: CartLine): number {
  return Math.round(line.unitPrice * line.quantity * 100) / 100;
}

/** Estimate only: the server takes prices from its own product rows when the order is placed. */
export function estimatedTotal(cart: Cart): number {
  return Math.round(cart.reduce((sum, l) => sum + lineEstimate(l) * 100, 0)) / 100;
}

export interface VendorGroup {
  vendorId: number;
  vendorName: string;
  lines: CartLine[];
  estimate: number;
}

/** One order is created per vendor, so the cart is shown grouped the same way. */
export function groupByVendor(cart: Cart): VendorGroup[] {
  const groups = new Map<number, VendorGroup>();
  for (const line of cart) {
    const group = groups.get(line.vendorId) ?? {
      vendorId: line.vendorId,
      vendorName: line.vendorName,
      lines: [],
      estimate: 0,
    };
    group.lines.push(line);
    group.estimate = Math.round((group.estimate + lineEstimate(line)) * 100) / 100;
    groups.set(line.vendorId, group);
  }
  return [...groups.values()];
}

export function toOrderItems(cart: Cart): { product_id: number; quantity: number }[] {
  return cart.filter((l) => l.quantity > 0).map((l) => ({ product_id: l.productId, quantity: l.quantity }));
}

// ---- Order timeline ---------------------------------------------------------------------------

export type TimelineStep = 'placed' | 'accepted' | 'shipped' | 'delivered' | 'cancelled' | 'rejected';

export interface TimelineEntry {
  step: TimelineStep;
  /** ISO timestamp, or null for a step that has not happened yet. */
  at: string | null;
  done: boolean;
}

const HAPPY_PATH: TimelineStep[] = ['placed', 'accepted', 'shipped', 'delivered'];

type TimelineOrder = Pick<
  Order,
  'status' | 'created_at' | 'accepted_at' | 'shipped_at' | 'delivered_at' | 'cancelled_at' | 'rejected_at'
>;

/** Steps that really happened (with their server timestamps), then the pending ones. A
 * cancelled or rejected order ends with that step and has no pending steps. */
export function orderTimeline(order: TimelineOrder): TimelineEntry[] {
  const at: Record<TimelineStep, string | null> = {
    placed: order.created_at,
    accepted: order.accepted_at,
    shipped: order.shipped_at,
    delivered: order.delivered_at,
    cancelled: order.cancelled_at,
    rejected: order.rejected_at,
  };
  const ended = order.status === 'cancelled' || order.status === 'rejected';
  const entries: TimelineEntry[] = [];
  for (const step of HAPPY_PATH) {
    if (at[step]) entries.push({ step, at: at[step], done: true });
    else if (!ended) entries.push({ step, at: null, done: false });
  }
  if (ended) entries.push({ step: order.status as TimelineStep, at: at[order.status as TimelineStep], done: true });
  return entries;
}

/** Vendor actions allowed by the server's state machine for each status. */
export function vendorActions(status: OrderStatus): Exclude<OrderAction, 'cancel'>[] {
  switch (status) {
    case 'placed':
      return ['accept', 'reject'];
    case 'accepted':
      return ['ship'];
    case 'shipped':
      return ['deliver'];
    default:
      return [];
  }
}

export const canBuyerCancel = (status: OrderStatus): boolean => status === 'placed';

/** Delivery address suggestion from the profile (the farmer edits it before ordering). */
export function defaultAddress(user: { village: string | null; district: string | null; state: string | null } | null): string {
  if (!user) return '';
  return [user.village, user.district, user.state].filter(Boolean).join(', ');
}

// ---- Vendor product form ----------------------------------------------------------------------

export interface ProductForm {
  name: string;
  category: ProductCategory;
  brand: string;
  unit: string;
  price: string;
  stock: string;
  description: string;
  image_path: string | null;
}

export type ProductFormError = 'nameRequired' | 'unitRequired' | 'priceInvalid' | 'stockInvalid';

/** Mirrors the API rules: name 2+ chars, unit required, price > 0 with at most 2 decimals and
 * at most Rs 1 crore, stock a whole number from 0 to 10 lakh. */
export function validateProductForm(form: ProductForm): Partial<Record<keyof ProductForm, ProductFormError>> {
  const errors: Partial<Record<keyof ProductForm, ProductFormError>> = {};
  if (form.name.trim().length < 2) errors.name = 'nameRequired';
  if (!form.unit.trim()) errors.unit = 'unitRequired';
  const price = Number(form.price);
  if (!/^\d+(\.\d{1,2})?$/.test(form.price.trim()) || !(price > 0) || price > 10_000_000) errors.price = 'priceInvalid';
  if (!/^\d+$/.test(form.stock.trim()) || Number(form.stock) > 1_000_000) errors.stock = 'stockInvalid';
  return errors;
}
