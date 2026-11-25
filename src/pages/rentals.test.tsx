import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import i18n from '@/i18n';
import { tokenStore } from '@/lib/api';
import type { Booking, Equipment } from '@/lib/types';
import { renderWithProviders } from '@/test/render';
import EquipmentRentals from './features/EquipmentRentals';
import HardwareRentals from './hardware/HardwareRentals';
import HardwareCalendar from './hardware/HardwareCalendar';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const page = <T,>(items: T[]) => ({ items, total: items.length, limit: 20, offset: 0 });

const sprayer: Equipment = {
  id: 5,
  owner_id: 9,
  owner_name: 'Junnar Tractor Hire',
  name: 'Power sprayer',
  type: 'sprayer',
  rate_per_hour_inr: null,
  rate_per_day_inr: 500,
  district: 'Pune',
  description: null,
  image_path: null,
  active: true,
  created_at: '2026-11-01T00:00:00Z',
};

const future = new Date(Date.now() + 3 * 86400_000).toISOString();
const futureEnd = new Date(Date.now() + 3 * 86400_000 + 3 * 3600_000).toISOString();

const booking = (overrides: Partial<Booking>): Booking => ({
  id: 11,
  equipment_id: 5,
  equipment_name: 'Power sprayer',
  equipment_type: 'sprayer',
  owner_id: 9,
  owner_name: 'Junnar Tractor Hire',
  farmer_id: 3,
  farmer_name: 'Ramesh',
  farmer_phone: '9000000011',
  start_at: future,
  end_at: futureEnd,
  unit: 'hour',
  units: 3,
  rate_inr: 900,
  amount_inr: 2700,
  status: 'requested',
  note: null,
  status_reason: null,
  created_at: '2026-11-20T00:00:00Z',
  accepted_at: null,
  rejected_at: null,
  cancelled_at: null,
  completed_at: null,
  ...overrides,
});

describe('rental pages', () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    tokenStore.set('token');
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('farmer books equipment by the day with an IST period', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.startsWith('/api/me')) return Promise.resolve(json(200, { id: 3, role: 'farmer', preferred_language: 'en' }));
      if (url.startsWith('/api/equipment/5/busy')) return Promise.resolve(json(200, []));
      if (url.startsWith('/api/equipment')) return Promise.resolve(json(200, page([sprayer])));
      if (url === '/api/bookings' && init?.method === 'POST') return Promise.resolve(json(201, booking({ unit: 'day' })));
      return Promise.resolve(json(200, page([])));
    });
    renderWithProviders(<EquipmentRentals />, { route: '/equipment-rentals' });
    await waitFor(() => expect(screen.getByText('Power sprayer')).toBeInTheDocument());
    expect(screen.getByText('₹500 / day')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Number of days'), { target: { value: '2' } });
    expect(within(dialog).getByText('₹1,000')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByText('No bookings in the next 28 days.')).toBeInTheDocument());
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send booking request' }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u, i]) => u === '/api/bookings' && i?.method === 'POST')).toBe(true)
    );
    const [, init] = fetchMock.mock.calls.find(([u, i]) => u === '/api/bookings' && i?.method === 'POST')!;
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ equipment_id: 5, unit: 'day' });
    expect(body.start_at).toMatch(/T00:00:00\+05:30$/);
    expect(Date.parse(body.end_at) - Date.parse(body.start_at)).toBe(2 * 86400_000);
  });

  it('opens the bookings tab from the URL and offers cancel before the start', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/me')) return Promise.resolve(json(200, { id: 3, role: 'farmer', preferred_language: 'en' }));
      if (url.startsWith('/api/bookings')) return Promise.resolve(json(200, page([booking({ status: 'accepted' })])));
      return Promise.resolve(json(200, page([])));
    });
    renderWithProviders(<EquipmentRentals />, { route: '/equipment-rentals?tab=bookings' });
    await waitFor(() => expect(screen.getByText('Booking #11')).toBeInTheDocument());
    expect(screen.getByText('3 hours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });

  it('owner sees actions that match each booking state', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/me')) return Promise.resolve(json(200, { id: 9, role: 'hardware_vendor', preferred_language: 'en' }));
      if (url.startsWith('/api/bookings'))
        return Promise.resolve(json(200, page([booking({}), booking({ id: 12, status: 'accepted' })])));
      return Promise.resolve(json(200, page([])));
    });
    renderWithProviders(<HardwareRentals />, { route: '/hardware-rentals' });
    await waitFor(() => expect(screen.getByText('Booking #11')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    // Accepted but not started yet: completing is disabled with an explanation.
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeDisabled();
    expect(screen.getByText('Can be marked completed once the booking has started.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '9000000011' })[0]).toHaveAttribute('href', 'tel:9000000011');
  });

  it('calendar asks for one month of bookings of the selected machine', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/me')) return Promise.resolve(json(200, { id: 9, role: 'hardware_vendor', preferred_language: 'en' }));
      if (url.startsWith('/api/hardware/equipment')) return Promise.resolve(json(200, page([sprayer])));
      if (url.startsWith('/api/bookings')) return Promise.resolve(json(200, page([])));
      return Promise.resolve(json(200, page([])));
    });
    renderWithProviders(<HardwareCalendar />, { route: '/hardware-calendar' });
    await waitFor(() => expect(screen.getByText('No bookings this month.')).toBeInTheDocument());
    const call = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.startsWith('/api/bookings'))!;
    const params = new URL(call, 'http://x').searchParams;
    expect(params.get('equipment_id')).toBe('5');
    expect(params.get('from')).toMatch(/-01T00:00:00\+05:30$/);
    expect(params.get('to')).toMatch(/-01T00:00:00\+05:30$/);
  });
});
