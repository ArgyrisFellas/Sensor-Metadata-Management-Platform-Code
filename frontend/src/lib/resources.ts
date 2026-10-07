import type { Field, Resource } from './types';

export const kinds = [
  { value: 'device_type', label: 'Device type' },
  { value: 'measurement_type', label: 'Measurement type' },
  { value: 'asset_type', label: 'Asset type' },
  { value: 'unit', label: 'Measurement unit' },
];
export const roles = [
  { value: 'viewer', label: 'Viewer — read access' },
  { value: 'editor', label: 'Editor — manage records' },
  { value: 'department_admin', label: 'Department administrator' },
];
const identity: Field[] = [{ key: 'code', label: 'Code', required: true, hint: 'Unique within your department.' }, { key: 'name', label: 'Name', required: true }];
const description: Field = { key: 'description', label: 'Description', type: 'textarea' };
const catalog = (key: string, label: string, kind: string): Field => ({ key, label, required: true, type: 'relation', source: `vocabularies/?kind=${kind}` });
const source: Field = { key: 'source', label: 'Data source', type: 'relation', source: 'sources/' };
const columns = [{ key: 'name', label: 'Name / code' }, { key: 'updated_at', label: 'Last updated' }];

export const resources: Record<string, Resource> = {
  devices: {
    path: 'devices', title: 'Devices', singular: 'device', description: 'Your sensors, gateways, and connected equipment.',
    fields: [...identity, catalog('device_type', 'Device type', 'device_type'), { key: 'parent', label: 'Parent device', type: 'relation', source: 'devices/', hint: 'Connect a sensor to its RTU, gateway, or station.' }, source, { key: 'ip_address', label: 'IP address', placeholder: '192.168.1.10' }, { key: 'sim_identifier', label: 'SIM identifier' }, { key: 'location', label: 'Location', type: 'point' }, description],
    columns: [{ key: 'name', label: 'Device / code' }, { key: 'device_type', label: 'Type' }, { key: 'parent', label: 'Parent' }, { key: 'updated_at', label: 'Last updated' }],
    filters: [catalog('device_type', 'All device types', 'device_type')],
  },
  assets: {
    path: 'assets', title: 'Assets', singular: 'asset', description: 'The places and physical infrastructure you monitor.',
    fields: [...identity, catalog('asset_type', 'Asset type', 'asset_type'), { key: 'elevation', label: 'Elevation (m)', type: 'number' }, { key: 'geometry', label: 'Geometry', type: 'geometry' }, description],
    columns: [{ key: 'name', label: 'Asset / code' }, { key: 'asset_type', label: 'Type' }, { key: 'elevation', label: 'Elevation (m)' }, { key: 'updated_at', label: 'Last updated' }],
    filters: [catalog('asset_type', 'All asset types', 'asset_type')],
  },
  measurements: {
    path: 'measurements', title: 'Measurements', singular: 'measurement', description: 'Define what is measured, where it comes from, and what it describes.',
    fields: [...identity, catalog('measurement_type', 'Measurement type', 'measurement_type'), catalog('unit', 'Unit', 'unit'), { key: 'device', label: 'Physical device', type: 'relation', source: 'devices/' }, { key: 'asset', label: 'Associated asset', type: 'relation', source: 'assets/' }, source, { key: 'source_identifier', label: 'Source identifier', hint: 'For example, an MQTT topic, OPC UA Node ID, or database tag.' }, { key: 'source_parameters', label: 'Source parameters', type: 'json', hint: 'A JSON object containing measurement-specific source settings.' }, { key: 'customer_reference', label: 'Customer reference', hint: 'Optional external customer identifier for smart meters.' }, description],
    columns: [{ key: 'name', label: 'Measurement / code' }, { key: 'measurement_type', label: 'Type' }, { key: 'unit', label: 'Unit' }, { key: 'device', label: 'Device' }, { key: 'asset', label: 'Asset' }],
    filters: [catalog('measurement_type', 'All measurement types', 'measurement_type'), { key: 'device', label: 'All devices', type: 'relation', source: 'devices/' }],
  },
  sources: {
    path: 'sources', title: 'Data sources', singular: 'data source', description: 'Connection metadata for the systems that collect your readings.',
    fields: [...identity, { key: 'protocol', label: 'Protocol', required: true, placeholder: 'mqtt, opcua, database, http…' }, { key: 'endpoint', label: 'Endpoint', placeholder: 'mqtt://broker.example.org:1883' }, { key: 'parameters', label: 'Connection parameters', type: 'json', hint: 'A JSON object for non-secret settings. Store credentials in your external collector, not here.' }],
    columns: [{ key: 'name', label: 'Source / code' }, { key: 'protocol', label: 'Protocol' }, { key: 'endpoint', label: 'Endpoint' }, { key: 'updated_at', label: 'Last updated' }],
  },
  vocabularies: {
    path: 'vocabularies', title: 'Catalogs', singular: 'catalog entry', description: 'A shared vocabulary for consistent records in your department.', admin: true,
    fields: [...identity, { key: 'kind', label: 'Category', type: 'select', options: kinds, required: true }, { key: 'symbol', label: 'Symbol', hint: 'For units, such as m, °C, or bar.' }, { key: 'semantic_uri', label: 'Semantic URI', hint: 'Optional QUDT, UCUM, or other standard reference.' }, description],
    columns: [{ key: 'name', label: 'Name / code' }, { key: 'kind', label: 'Category' }, { key: 'symbol', label: 'Symbol' }, { key: 'semantic_uri', label: 'Semantic URI' }],
    filters: [{ key: 'kind', label: 'All categories', type: 'select', options: kinds }],
  },
  'external-identifiers': {
    path: 'external-identifiers', title: 'External references', singular: 'external reference', description: 'Connect your assets with identifiers in other models and systems.',
    fields: [{ key: 'asset', label: 'Asset', type: 'relation', source: 'assets/', required: true }, { key: 'system', label: 'System or model', required: true }, { key: 'external_id', label: 'External identifier', required: true }],
    columns: [{ key: 'asset', label: 'Asset' }, { key: 'system', label: 'System / model' }, { key: 'external_id', label: 'External identifier' }, { key: 'updated_at', label: 'Last updated' }],
  },
  users: {
    path: 'users', title: 'Team members', singular: 'team member', description: 'Manage access to your department’s workspace.', admin: true,
    fields: [{ key: 'username', label: 'Username', required: true }, { key: 'name', label: 'Full name', required: true }, { key: 'password', label: 'Password', type: 'password', hint: 'Required for a new member. Leave blank when editing to keep the existing password.' }, { key: 'role', label: 'Role', type: 'select', options: roles, required: true }, { key: 'is_active', label: 'Account enabled', type: 'boolean' }],
    columns: [{ key: 'name', label: 'Name / username' }, { key: 'role', label: 'Role' }, { key: 'is_active', label: 'Status' }],
  },
};
export const fallbackColumns = columns;
