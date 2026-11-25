import { describe, expect, it } from 'vitest';
import { isValidIndianMobile, normalizePhone } from './validation';
import { availableActions } from '@/components/admin/userActions';
import { getDashboardRoute } from '@/utils/routeUtils';

describe('phone validation', () => {
  it('normalises common formats', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
    expect(normalizePhone('919876543210')).toBe('9876543210');
  });
  it('accepts only 10-digit numbers starting with 6-9', () => {
    expect(isValidIndianMobile('9876543210')).toBe(true);
    expect(isValidIndianMobile('5876543210')).toBe(false);
    expect(isValidIndianMobile('98765')).toBe(false);
  });
});

describe('admin actions', () => {
  it('mirror the API transitions', () => {
    expect(availableActions({ role: 'vendor', status: 'pending' })).toEqual(['approve', 'reject']);
    expect(availableActions({ role: 'vendor', status: 'approved' })).toEqual(['suspend']);
    expect(availableActions({ role: 'expert', status: 'suspended' })).toEqual(['approve']);
    expect(availableActions({ role: 'admin', status: 'approved' })).toEqual([]);
  });
});

describe('dashboard routes', () => {
  it('maps every role', () => {
    expect(getDashboardRoute('vendor')).toBe('/vendor-dashboard');
    expect(getDashboardRoute('hardware_vendor')).toBe('/hardware-vendor-dashboard');
    expect(getDashboardRoute(null)).toBe('/');
  });
});
