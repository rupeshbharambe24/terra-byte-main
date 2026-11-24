import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import type { Order, Product } from '@/lib/types';
import { renderWithProviders } from '@/test/render';
import Marketplace from './features/Marketplace';
import OrderDetail from './farmer/OrderDetail';
import VendorOrders from './vendor/VendorOrders';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const farmer = {
  id: 2,
  name: 'Ramesh',
  role: 'farmer',
  status: 'approved',
  preferred_language: 'en',
  village: 'Narayangaon',
  district: 'Pune',
  state: 'Maharashtra',
};
const vendor = { ...farmer, id: 3, name: 'Shivneri', role: 'vendor' };

const product: Product = {
  id: 11,
  vendor_id: 3,
  vendor_name: 'Shivneri Krishi Kendra',
  vendor_district: 'Pune',
  name: 'DAP 18-46-0',
  category: 'fertilizer',
  brand: null,
  unit: '50 kg bag',
  price_inr: 1350,
  stock: 4,
  description: null,
  image_path: null,
  active: true,
  created_at: '2026-11-20T10:00:00Z',
  updated_at: '2026-11-20T10:00:00Z',
};

const order: Order = {
  id: 5,
  buyer_id: 2,
  buyer_name: 'Ramesh',
  buyer_phone: null,
  vendor_id: 3,
  vendor_name: 'Shivneri Krishi Kendra',
  status: 'placed',
  total_inr: 1350,
  delivery_address: 'Narayangaon, Pune, Maharashtra',
  payment_method: 'cod',
  note: null,
  status_reason: null,
  created_at: '2026-11-24T05:00:00Z',
  updated_at: '2026-11-24T05:00:00Z',
  accepted_at: null,
  shipped_at: null,
  delivered_at: null,
  cancelled_at: null,
  rejected_at: null,
  items: [
    { id: 1, product_id: 11, product_name: 'DAP 18-46-0', unit: '50 kg bag', quantity: 1, unit_price_inr: 1350, line_total_inr: 1350 },
  ],
};

describe('marketplace pages', () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    tokenStore.set('token');
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists products and places an order whose total comes from the server', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith('/api/me')) return Promise.resolve(json(200, farmer));
      if (url.startsWith('/api/products')) return Promise.resolve(json(200, { items: [product], total: 1, limit: 20, offset: 0 }));
      if (url === '/api/orders' && init?.method === 'POST') return Promise.resolve(json(201, [order]));
      return Promise.resolve(json(404, { detail: 'nf', code: 'not_found' }));
    });
    renderWithProviders(<Marketplace />, { route: '/marketplace' });
    await waitFor(() => expect(screen.getByText('DAP 18-46-0')).toBeInTheDocument());
    expect(screen.getByText('4 × 50 kg bag in stock')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Buy now' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Delivery address')).toHaveValue('Narayangaon, Pune, Maharashtra');
    expect(within(dialog).getByText(/no online payment/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Place order' }));

    await waitFor(() => expect(screen.getByText('Order placed')).toBeInTheDocument());
    const post = fetchMock.mock.calls.find(([u, init]) => u === '/api/orders' && init?.method === 'POST');
    expect(JSON.parse(post![1].body)).toEqual({
      items: [{ product_id: 11, quantity: 1 }],
      delivery_address: 'Narayangaon, Pune, Maharashtra',
      payment_method: 'cod',
      note: null,
    });
    expect(screen.getByRole('link', { name: 'Order #5' })).toHaveAttribute('href', '/orders/5');
  });

  it('vendors can browse but not order', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/me') ? json(200, vendor) : json(200, { items: [product], total: 1, limit: 20, offset: 0 })
      )
    );
    renderWithProviders(<Marketplace />, { route: '/marketplace' });
    await waitFor(() => expect(screen.getByText('DAP 18-46-0')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Buy now' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cart/ })).toBeNull();
  });

  it('order detail shows the real timeline and lets the farmer cancel while placed', async () => {
    const cancelled = { ...order, status: 'cancelled', cancelled_at: '2026-11-24T06:00:00Z', status_reason: 'Mistake' };
    let current: Order = order;
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/me')) return Promise.resolve(json(200, farmer));
      if (url === '/api/orders/5/cancel') {
        current = cancelled as Order;
        return Promise.resolve(json(200, current));
      }
      if (url === '/api/orders/5') return Promise.resolve(json(200, current));
      return Promise.resolve(json(200, { items: [], total: 0, limit: 20, offset: 0 }));
    });
    renderWithProviders(
      <Routes>
        <Route path="/orders/:orderId" element={<OrderDetail />} />
      </Routes>,
      { route: '/orders/5' }
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Order #5' })).toBeInTheDocument());
    const timeline = screen.getByRole('list', { name: 'Status' });
    expect(within(timeline).getByText('Order placed')).toBeInTheDocument();
    expect(within(timeline).getAllByText('Not yet')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Mistake' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));
    await waitFor(() => expect(screen.getByText('Cancelled by you')).toBeInTheDocument());
    expect(screen.getByText('Reason: Mistake')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([u]) => u === '/api/orders/5/cancel');
    expect(JSON.parse(call![1].body)).toEqual({ reason: 'Mistake' });
  });

  it('vendor orders offer only the transitions the server allows', async () => {
    const shipped = { ...order, id: 6, status: 'shipped', buyer_phone: '9000000011', shipped_at: '2026-11-24T07:00:00Z' };
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/api/me')
          ? json(200, vendor)
          : json(200, { items: [{ ...order, buyer_phone: '9000000011' }, shipped], total: 2, limit: 20, offset: 0 })
      )
    );
    renderWithProviders(<VendorOrders />, { route: '/vendor-orders' });
    await waitFor(() => expect(screen.getByText('Order #5')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark delivered' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark shipped' })).toBeNull();
    expect(screen.getAllByRole('link', { name: '9000000011' })[0]).toHaveAttribute('href', 'tel:+919000000011');
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('status=placed&status=accepted&status=shipped'))).toBe(true);
  });
});
