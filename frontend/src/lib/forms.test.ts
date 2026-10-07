import { describe, expect, it } from 'vitest';
import { initialValues, makePayload, validGeometry } from './forms';
import type { Field } from './types';

describe('metadata form payloads', () => {
  it('preserves password whitespace and omits unchanged passwords on edit', () => {
    const fields: Field[] = [{ key: 'password', label: 'Password', type: 'password' }];
    expect(makePayload(fields, { password: ' spaced secret ' }).password).toBe(' spaced secret ');
    expect(makePayload(fields, { password: '' }, true)).toEqual({});
    expect(initialValues(fields, { id: 1, password: 'never redisplay' })).toEqual({ password: '' });
  });
  it('retains zero elevations and clears optional relations with null', () => {
    const fields: Field[] = [{ key: 'elevation', label: 'Elevation', type: 'number' }, { key: 'device', label: 'Device', type: 'relation' }];
    expect(makePayload(fields, { elevation: '0', device: '' })).toEqual({ elevation: 0, device: null });
  });
  it('requires JSON parameters to be an object', () => {
    const fields: Field[] = [{ key: 'parameters', label: 'Parameters', type: 'json' }];
    for (const input of ['[1]', 'null', '42', 'broken']) expect(() => makePayload(fields, { parameters: input })).toThrow();
    expect(makePayload(fields, { parameters: '{"channel":1}' })).toEqual({ parameters: { channel: 1 } });
  });
});

describe('WGS84 geometry validation', () => {
  it('accepts optional empty geometry', () => { expect(validGeometry(null)).toBeNull(); expect(validGeometry('')).toBeNull(); });
  it('accepts zero coordinates and boundary coordinates', () => {
    expect(validGeometry({ type: 'Point', coordinates: [0, 0] })).toBeNull();
    expect(validGeometry({ type: 'Point', coordinates: [-180, 90] })).toBeNull();
  });
  it('rejects out-of-range, non-finite, and three-dimensional points', () => {
    for (const coordinates of [[181, 0], [0, -91], [NaN, 0], [1, 2, 3], ['1', 2]]) expect(validGeometry({ type: 'Point', coordinates })).not.toBeNull();
  });
  it('requires at least two positions in a line and point-only device geometry', () => {
    expect(validGeometry({ type: 'LineString', coordinates: [[0, 0]] })).not.toBeNull();
    const line = { type: 'LineString', coordinates: [[0, 0], [1, 1]] };
    expect(validGeometry(line)).toBeNull(); expect(validGeometry(line, true)).not.toBeNull();
  });
  it('rejects unclosed polygons and malformed rings', () => {
    expect(validGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] })).not.toBeNull();
    expect(validGeometry({ type: 'Polygon', coordinates: [null] })).not.toBeNull();
    expect(validGeometry({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] })).toBeNull();
  });
});
