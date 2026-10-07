import type { Field, RecordData } from './types';

export function initialValues(fields: Field[], record?: RecordData): Record<string, unknown> {
  return Object.fromEntries(fields.map(field => {
    const value = record?.[field.key];
    if (field.type === 'password') return [field.key, ''];
    if (field.type === 'json') return [field.key, JSON.stringify(value ?? {}, null, 2)];
    if (field.type === 'boolean') return [field.key, value ?? true];
    if (field.type === 'select') return [field.key, value ?? field.options?.[0]?.value ?? ''];
    return [field.key, value ?? ''];
  }));
}

export function makePayload(fields: Field[], values: Record<string, unknown>, editing = false): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (field.type === 'password' && !value && editing) continue;
    if (field.type === 'json') {
      let parsed: unknown;
      try { parsed = JSON.parse(String(value || '{}')); } catch { throw new Error(`${field.label} must contain valid JSON.`); }
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error(`${field.label} must be a JSON object, such as {}.`);
      result[field.key] = parsed;
    } else if (field.type === 'relation' || field.type === 'number') {
      result[field.key] = value === '' || value === undefined || value === null ? null : Number(value);
    } else if (field.type === 'point' || field.type === 'geometry') {
      result[field.key] = value || null;
    } else result[field.key] = typeof value === 'string' && field.type !== 'password' ? value.trim() : value;
  }
  return result;
}

export function validGeometry(input: unknown, pointOnly = false): string | null {
  if (input === null || input === '') return null;
  if (!input || typeof input !== 'object') return 'Enter a GeoJSON geometry object.';
  const geometry = input as { type: string; coordinates: unknown };
  const allowed = pointOnly ? ['Point'] : ['Point', 'LineString', 'Polygon'];
  if (!allowed.includes(geometry.type)) return `Choose a ${allowed.join(', ')} geometry.`;
  const position = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number' && Number.isFinite(n)) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90;
  if (geometry.type === 'Point') return position(geometry.coordinates) ? null : 'Use valid longitude (−180 to 180) and latitude (−90 to 90).';
  if (geometry.type === 'LineString') return Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2 && geometry.coordinates.every(position) ? null : 'A line needs at least two valid [longitude, latitude] positions.';
  const rings = geometry.coordinates;
  if (!Array.isArray(rings) || !rings.length) return 'A polygon needs at least one closed ring.';
  for (const ring of rings) {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(position)) return 'Each polygon ring needs at least four valid positions.';
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) return 'The first and last polygon position must match to close the ring.';
  }
  return null;
}
