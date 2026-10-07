import type { RecordData, User } from './types';

// Opt-in only: normal development and production continue to use the real API.
export const demoMode = import.meta.env.MODE === 'demo';

export function createDemoApi() {
  const timestamp = '2026-10-06T09:00:00Z';
  const user: User = { id: 1, username: 'demo_admin', name: 'Demo Administrator', role: 'department_admin', department: 1, department_name: 'Sample workspace', is_active: true };
  let signedIn = true;
  const point = (longitude: number, latitude: number) => ({ type: 'Point', coordinates: [longitude, latitude] });
  const records: Record<string, RecordData[]> = {
    vocabularies: [
      { id: 1, code: 'GATEWAY', name: 'Gateway', kind: 'device_type' },
      { id: 2, code: 'SENSOR', name: 'Sensor', kind: 'device_type' },
      { id: 3, code: 'STATION', name: 'Station', kind: 'asset_type' },
      { id: 4, code: 'TEMPERATURE', name: 'Temperature', kind: 'measurement_type' },
      { id: 5, code: 'CELSIUS', name: 'Degrees Celsius', kind: 'unit', symbol: '°C' },
    ],
    sources: [{ id: 1, code: 'DEMO-MQTT', name: 'Example collector', protocol: 'mqtt', endpoint: 'mqtt://demo.example.invalid', parameters: {} }],
    devices: [
      { id: 1, code: 'GW-001', name: 'Nicosia gateway', device_type: 1, parent: null, source: 1, location: point(33.3823, 35.1856), description: 'Sample gateway for the frontend preview.' },
      { id: 2, code: 'SEN-001', name: 'Outdoor temperature sensor', device_type: 2, parent: 1, source: 1, location: point(33.3838, 35.1861) },
      { id: 3, code: 'SEN-002', name: 'Indoor temperature sensor', device_type: 2, parent: 1, source: 1, location: point(33.3812, 35.1848) },
    ],
    assets: [{ id: 1, code: 'SITE-001', name: 'Demo monitoring station', asset_type: 3, elevation: 150, geometry: point(33.382, 35.185), description: 'Fictional sample infrastructure.' }],
    measurements: [
      { id: 1, code: 'TEMP-OUT', name: 'Outdoor temperature', measurement_type: 4, unit: 5, device: 2, asset: 1, source: 1, source_identifier: 'demo/outdoor/temperature', source_parameters: {} },
      { id: 2, code: 'TEMP-IN', name: 'Indoor temperature', measurement_type: 4, unit: 5, device: 3, asset: 1, source: 1, source_identifier: 'demo/indoor/temperature', source_parameters: {} },
    ],
    'external-identifiers': [{ id: 1, asset: 1, system: 'Example inventory', external_id: 'DEMO-SITE-001' }],
    users: [{ ...user }, { ...user, id: 2, username: 'demo_viewer', name: 'Sample Viewer', role: 'viewer' }],
    'api-keys': [{ id: 1, name: 'Sample key (not functional)', prefix: 'demo_only', revoked_at: null }],
  };
  for (const rows of Object.values(records)) for (const row of rows) Object.assign(row, { created_at: timestamp, updated_at: timestamp });

  return async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const url = new URL(path.replace(/^\/api\/v1\//, ''), 'https://demo.invalid/');
    const [entity, id, action] = url.pathname.split('/').filter(Boolean);
    const method = (init.method || 'GET').toUpperCase();
    if (entity === 'auth') {
      if (id === 'logout') { signedIn = false; return undefined; }
      if (id === 'login') { signedIn = true; return structuredClone(user); }
      if (id === 'csrf') return { csrfToken: 'demo-only' };
      if (id === 'me') return signedIn ? structuredClone(user) : null;
    }
    if (!signedIn) throw new Error('Sign in to the sample workspace first.');
    if (entity === 'summary') return Object.fromEntries(Object.entries(records).map(([key, rows]) => [key, rows.length]));
    if (entity === 'map') {
      const filter = url.searchParams.get('entity');
      return { type: 'FeatureCollection', features: ['devices', 'assets', 'measurements'].filter(kind => !filter || filter === kind).flatMap(kind => records[kind].flatMap(row => {
        const asset = records.assets.find(item => item.id === row.asset);
        const device = records.devices.find(item => item.id === row.device);
        const geometry = row.geometry || row.location || asset?.geometry || device?.location;
        return geometry ? [{ type: 'Feature', geometry: structuredClone(geometry), properties: { entity: kind, id: row.id, name: row.name, code: row.code } }] : [];
      })) };
    }
    const rows = records[entity];
    if (!rows) throw new Error('This feature requires the real backend and is unavailable in demo mode.');
    const row = rows.find(item => item.id === Number(id));
    if (id && !row) throw new Error('Sample record not found.');
    if (method === 'GET') {
      if (row) return structuredClone(row);
      let result = [...rows];
      for (const [key, value] of url.searchParams) {
        if (key === 'search') result = result.filter(item => Object.values(item).some(field => String(field ?? '').toLowerCase().includes(value.toLowerCase())));
        else if (!['ordering', 'page', 'page_size'].includes(key)) result = result.filter(item => String(item[key]) === value);
      }
      const order = url.searchParams.get('ordering') || 'name';
      const field = order.replace(/^-/, '');
      result.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''), undefined, { numeric: true }) * (order.startsWith('-') ? -1 : 1));
      const size = Math.max(1, Number(url.searchParams.get('page_size')) || 15);
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageLink = (number: number) => { const next = new URL(url); next.searchParams.set('page', String(number)); return `/api/v1${next.pathname}${next.search}`; };
      return { count: result.length, next: page * size < result.length ? pageLink(page + 1) : null, previous: page > 1 ? pageLink(page - 1) : null, results: structuredClone(result.slice((page - 1) * size, page * size)) };
    }
    if (method === 'POST' && action === 'revoke' && row) { row.revoked_at = new Date().toISOString(); return structuredClone(row); }
    if (method === 'DELETE' && row) {
      // Keep the sample hierarchy and relation choices consistent after deletion.
      const relation = entity === 'devices' ? 'device' : entity === 'assets' ? 'asset' : entity === 'sources' ? 'source' : null;
      for (const items of Object.values(records)) for (const item of items) {
        if (relation && item[relation] === row.id || entity === 'devices' && item.parent === row.id) throw new Error('This sample record is referenced elsewhere. Unlink related records first.');
        if (entity === 'vocabularies' && ['device_type', 'asset_type', 'measurement_type', 'unit'].some(key => item[key] === row.id)) throw new Error('This catalog entry is in use.');
      }
      rows.splice(rows.indexOf(row), 1); return undefined;
    }
    const payload = typeof init.body === 'string' ? JSON.parse(init.body) : {};
    delete payload.password;
    if (method === 'PATCH' && row) { Object.assign(row, payload, { updated_at: new Date().toISOString() }); return structuredClone(row); }
    if (method === 'POST' && !id) {
      const created = { ...payload, id: Math.max(0, ...rows.map(item => item.id)) + 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (entity === 'api-keys') Object.assign(created, { prefix: 'demo_only', revoked_at: null });
      rows.push(created);
      return { ...structuredClone(created), ...(entity === 'api-keys' ? { key: 'demo_only_not_a_real_api_key' } : {}) };
    }
    throw new Error('This action is unavailable in demo mode.');
  };
}

export const demoRequest = createDemoApi();
