import { describe, expect, it } from 'vitest';
import {
  addToCart,
  canBuyerCancel,
  cartCount,
  defaultAddress,
  estimatedTotal,
  groupByVendor,
  orderTimeline,
  removeFromCart,
  toOrderItems,
  updateQuantity,
  validateProductForm,
  vendorActions,
} from './market';
import type { Product } from './types';

const product = (over: Partial<Product>): Product => ({
  id: 1,
  vendor_id: 10,
  vendor_name: 'Shivneri',
  vendor_district: 'Pune',
  name: 'Urea',
  category: 'fertilizer',
  brand: null,
  unit: '45 kg bag',
  price_inr: 266.5,
  stock: 5,
  description: null,
  image_path: null,
  active: true,
  created_at: '',
  updated_at: '',
  ...over,
});

describe('cart', () => {
  const urea = product({});
  const seed = product({ id: 2, name: 'Onion seed', price_inr: 1100, stock: 3 });
  const neem = product({ id: 3, vendor_id: 20, vendor_name: 'Godavari', name: 'Neem oil', price_inr: 450, stock: 10 });

  it('adds, merges and clamps to stock', () => {
    let cart = addToCart([], urea, 2);
    cart = addToCart(cart, urea, 2);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(4);
    cart = addToCart(cart, urea, 10);
    expect(cart[0].quantity).toBe(5);
    expect(addToCart([], product({ stock: 0 }))).toEqual([]);
  });

  it('updates and removes lines', () => {
    let cart = addToCart(addToCart([], urea), seed);
    cart = updateQuantity(cart, 2, 99);
    expect(cart.find((l) => l.productId === 2)?.quantity).toBe(3);
    cart = updateQuantity(cart, 2, 0);
    expect(cart.map((l) => l.productId)).toEqual([1]);
    cart = updateQuantity(cart, 1, 2.7);
    expect(cart[0].quantity).toBe(2);
    expect(removeFromCart(cart, 1)).toEqual([]);
  });

  it('groups by vendor with estimates in paise', () => {
    let cart = addToCart([], urea, 3);
    cart = addToCart(cart, seed, 1);
    cart = addToCart(cart, neem, 2);
    const groups = groupByVendor(cart);
    expect(groups.map((g) => [g.vendorName, g.estimate])).toEqual([
      ['Shivneri', 1899.5],
      ['Godavari', 900],
    ]);
    expect(estimatedTotal(cart)).toBe(2799.5);
    expect(cartCount(cart)).toBe(6);
    expect(toOrderItems(cart)).toEqual([
      { product_id: 1, quantity: 3 },
      { product_id: 2, quantity: 1 },
      { product_id: 3, quantity: 2 },
    ]);
  });
});

describe('order timeline', () => {
  const base = {
    created_at: '2026-11-01T10:00:00Z',
    accepted_at: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    rejected_at: null,
  };

  it('shows done and pending steps', () => {
    const steps = orderTimeline({ ...base, status: 'accepted', accepted_at: '2026-11-01T12:00:00Z' });
    expect(steps.map((s) => [s.step, s.done])).toEqual([
      ['placed', true],
      ['accepted', true],
      ['shipped', false],
      ['delivered', false],
    ]);
  });

  it('ends with cancellation or rejection and nothing pending', () => {
    const cancelled = orderTimeline({ ...base, status: 'cancelled', cancelled_at: '2026-11-01T11:00:00Z' });
    expect(cancelled.map((s) => s.step)).toEqual(['placed', 'cancelled']);
    expect(cancelled.every((s) => s.done)).toBe(true);
    const rejected = orderTimeline({ ...base, status: 'rejected', rejected_at: '2026-11-02T09:00:00Z' });
    expect(rejected.at(-1)).toEqual({ step: 'rejected', at: '2026-11-02T09:00:00Z', done: true });
  });

  it('mirrors the server state machine', () => {
    expect(vendorActions('placed')).toEqual(['accept', 'reject']);
    expect(vendorActions('accepted')).toEqual(['ship']);
    expect(vendorActions('shipped')).toEqual(['deliver']);
    expect(vendorActions('delivered')).toEqual([]);
    expect(canBuyerCancel('placed')).toBe(true);
    expect(canBuyerCancel('accepted')).toBe(false);
  });

  it('suggests an address from the profile', () => {
    expect(defaultAddress({ village: 'Narayangaon', district: 'Pune', state: 'Maharashtra' })).toBe(
      'Narayangaon, Pune, Maharashtra'
    );
    expect(defaultAddress(null)).toBe('');
  });
});

describe('product form validation', () => {
  const ok = {
    name: 'DAP 18-46-0',
    category: 'fertilizer' as const,
    brand: '',
    unit: '50 kg bag',
    price: '1350.50',
    stock: '10',
    description: '',
    image_path: null,
  };
  it('accepts a valid form', () => expect(validateProductForm(ok)).toEqual({}));
  it('rejects what the server rejects', () => {
    expect(validateProductForm({ ...ok, name: ' x ', unit: ' ', price: '0', stock: '-1' })).toEqual({
      name: 'nameRequired',
      unit: 'unitRequired',
      price: 'priceInvalid',
      stock: 'stockInvalid',
    });
    expect(validateProductForm({ ...ok, price: '10.555' }).price).toBe('priceInvalid');
    expect(validateProductForm({ ...ok, stock: '2.5' }).stock).toBe('stockInvalid');
  });
});
