import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoApi } from './demo';
import type { Page, RecordData } from './types';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('frontend-only preview', () => {
  it('routes API calls locally, including mutations, without fetch', async () => {
    vi.stubEnv('MODE', 'demo');
    const fetch = vi.fn(() => { throw new Error('No network allowed'); });
    vi.stubGlobal('fetch', fetch);
    const { api, mutate, getCsrf } = await import('./api');
    expect(await getCsrf()).toBe('demo-only');
    expect(await api('auth/me/')).toMatchObject({ role: 'department_admin' });
    const created = await mutate<RecordData>('sources/', 'POST', { name: 'Local source', code: 'LOCAL', protocol: 'http' });
    expect(await api(`sources/${created.id}/`)).toMatchObject({ name: 'Local source' });
    await mutate(`sources/${created.id}/`, 'DELETE');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps regular development connected to the real API', async () => {
    vi.stubEnv('MODE', 'development');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ devices: 42 }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const { api } = await import('./api');
    expect(await api('summary/')).toEqual({ devices: 42 });
    expect(fetch).toHaveBeenCalledWith('/api/v1/summary/', expect.any(Object));
  });

  it('supports filters, pagination, details, and in-memory edits', async () => {
    const api = createDemoApi();
    const page = await api('devices/?device_type=2&page_size=1&ordering=name') as Page<RecordData>;
    expect(page.count).toBe(2);
    expect(page.next).toBeTruthy();
    const next = await api(page.next!) as Page<RecordData>;
    expect(next.results[0].id).not.toBe(page.results[0].id);
    await api('devices/2/', { method: 'PATCH', body: JSON.stringify({ name: 'Changed sensor' }) });
    expect(await api('/api/v1/devices/2/')).toMatchObject({ name: 'Changed sensor' });
    expect(await api('devices/?search=Changed')).toMatchObject({ count: 1 });
    expect(await createDemoApi()('devices/2/')).toMatchObject({ name: 'Outdoor temperature sensor' });
  });

  it('provides map records, handles logout, and rejects backend-only requests', async () => {
    const api = createDemoApi();
    expect(await api('map/?entity=measurements')).toMatchObject({ type: 'FeatureCollection', features: [{ properties: { entity: 'measurements' } }, { properties: { entity: 'measurements' } }] });
    await expect(api('imports/validate/', { method: 'POST' })).rejects.toThrow('real backend');
    await api('auth/logout/', { method: 'POST' });
    expect(await api('auth/me/')).toBeNull();
    await expect(api('devices/')).rejects.toThrow('Sign in');
    expect(await api('auth/login/', { method: 'POST' })).toMatchObject({ username: 'demo_admin' });
  });
});
