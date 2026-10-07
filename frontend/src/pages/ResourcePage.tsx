import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, ArrowLeft, ArrowRight, ChevronRight, Download, FilePenLine, Plus, Search, Shapes, Trash2, X } from 'lucide-react';
import { allRecords, api, ApiError, errorText, mutate } from '../lib/api';
import { initialValues, makePayload, validGeometry } from '../lib/forms';
import type { Option, Page, RecordData, Resource } from '../lib/types';
import GeometryEditor from '../components/GeometryEditor';
import { dateLabel, EmptyState, ErrorMessage, Loading, Modal, PageHeading, titleCase, useNotice, useUser } from '../components/Shared';
import MapCanvas, { geometryCollection } from '../components/MapCanvas';

const PAGE_SIZE = 15;
function recordName(record: RecordData) { return String(record.name || record.code || record.external_id || record.username || `Record ${record.id}`); }
export default function ResourcePage({ resource }: { resource: Resource }) {
  const user = useUser(); const notice = useNotice();
  const canEdit = resource.admin ? user.role === 'department_admin' : user.role !== 'viewer';
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(''); const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Page<RecordData> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<unknown>(null);
  const [choices, setChoices] = useState<Record<string, Option[]>>({});
  const [choicesError, setChoicesError] = useState<unknown>(null); const [choicesLoading, setChoicesLoading] = useState(true);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [mode, setMode] = useState<'create' | 'detail' | 'edit' | 'delete' | null>(null);
  const [recordLoading, setRecordLoading] = useState(false); const [actionError, setActionError] = useState<unknown>(null); const [busy, setBusy] = useState(false);
  const alphabeticalField = resource.path === 'external-identifiers' ? 'system' : 'name';
  const alphabeticalLabel = resource.path === 'external-identifiers' ? 'System' : 'Name';
  const [ordering, setOrdering] = useState(resource.path === 'users' ? 'name' : '-updated_at');

  useEffect(() => { const timer = window.setTimeout(() => { setDebounced(search); setPage(1); }, 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), ordering });
    if (debounced) query.set('search', debounced);
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    api<Page<RecordData>>(`${resource.path}/?${query}`).then(result => { if (active) { setData(result); if (result.count > 0 && result.results.length === 0 && page > 1) setPage(page - 1); } }).catch(e => { if (active) setError(e); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resource.path, page, debounced, filters, refresh, ordering]);

  useEffect(() => {
    let active = true; setChoicesLoading(true); setChoicesError(null);
    const sources = [...new Set([...resource.fields, ...(resource.filters || [])].map(field => field.source).filter((source): source is string => !!source))];
    Promise.all(sources.map(async source => [source, (await allRecords<RecordData>(source)).map(row => ({ value: String(row.id), label: `${recordName(row)}${row.code ? ` · ${row.code}` : ''}` }))] as const)).then(entries => { if (active) setChoices(Object.fromEntries(entries)); }).catch(e => { if (active) setChoicesError(e); }).finally(() => { if (active) setChoicesLoading(false); });
    return () => { active = false; };
  }, [resource, refresh]);

  const selectedId = params.get('record');
  useEffect(() => {
    if (!selectedId) return;
    let active = true; setRecordLoading(true); setMode('detail'); setActionError(null); setRecord(null);
    api<RecordData>(`${resource.path}/${selectedId}/`).then(result => { if (active) setRecord(result); }).catch(e => { if (active) setActionError(e); }).finally(() => { if (active) setRecordLoading(false); });
    return () => { active = false; };
  }, [selectedId, resource.path]);
  function close() { if (busy) return; setMode(null); setRecord(null); setActionError(null); if (selectedId) { const next = new URLSearchParams(params); next.delete('record'); setParams(next, { replace: true }); } }
  function open(row: RecordData, view: 'detail' | 'edit' = 'detail') { setRecord(row); setMode(view); setActionError(null); }
  function valueLabel(key: string, value: unknown) {
    const field = resource.fields.find(item => item.key === key);
    if (value === null || value === undefined || value === '') return '—';
    if (field?.source) return choices[field.source]?.find(option => option.value === String(value))?.label || `#${value}`;
    if (field?.options) return field.options.find(option => option.value === value)?.label || String(value);
    if (key.endsWith('_at')) return dateLabel(value);
    if (typeof value === 'boolean') return value ? 'Active' : 'Disabled';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
  async function deleteRecord() {
    if (!record) return; setBusy(true); setActionError(null);
    try { await mutate(`${resource.path}/${record.id}/`, 'DELETE'); setMode(null); setRecord(null); if (data?.results.length === 1 && data.results[0].id === record.id && page > 1) setPage(page - 1); setRefresh(v => v + 1); notice(`${titleCase(resource.singular)} deleted.`); if (selectedId) setParams({}, { replace: true }); }
    catch (e) { setActionError(e); } finally { setBusy(false); }
  }
  const count = data?.count || 0; const hasFilters = !!debounced || Object.values(filters).some(Boolean);
  return <>
    <PageHeading eyebrow={resource.admin ? 'WORKSPACE SETTINGS' : 'METADATA REGISTRY'} title={resource.title} description={resource.description} actions={<>{['devices', 'assets', 'measurements'].includes(resource.path) && user.role !== 'viewer' && <Link className="button button-secondary" to={`/import?entity=${resource.path}`}><Download size={16}/>Import</Link>}{canEdit && <button className="button" onClick={() => { setRecord(null); setMode('create'); setActionError(null); }}><Plus size={17}/>Add {resource.singular}</button>}</>}/>
    <ErrorMessage error={error}/>
    <section className="panel registry-panel">
      <div className="table-toolbar"><div className="search-box"><Search size={17}/><input aria-label={`Search ${resource.title.toLowerCase()}`} value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${resource.title.toLowerCase()}…`}/>{search && <button className="icon-button" onClick={() => setSearch('')} aria-label="Clear search"><X size={14}/></button>}</div><div className="table-filters">{resource.filters?.map(field => <select aria-label={field.label} key={field.key} value={filters[field.key] || ''} onChange={e => { setFilters({ ...filters, [field.key]: e.target.value }); setPage(1); }}><option value="">{field.label}</option>{(field.options || choices[field.source || ''] || []).map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>)}<button className="sort-button" title="Change sort order" aria-label="Change sort order" onClick={() => { setOrdering(ordering === alphabeticalField ? '-updated_at' : alphabeticalField); setPage(1); }}><ArrowDownUp size={16}/><span>{ordering === alphabeticalField ? alphabeticalLabel : 'Recent'}</span></button></div></div>
      {loading ? <Loading label={`Loading ${resource.title.toLowerCase()}…`}/> : data?.results.length ? <><div className="table-scroll"><table className="data-table"><thead><tr>{resource.columns.map(column => <th key={column.key}>{column.label}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.results.map(row => <tr key={row.id}>{resource.columns.map((column, index) => <td key={column.key}>{index === 0 ? <button className="record-link" onClick={() => open(row)}><span className="record-glyph"><Shapes size={17}/></span><span><strong>{valueLabel(column.key, row[column.key])}</strong>{column.key === 'name' && <small>{String(row.code || row.username || '')}</small>}</span></button> : <span className={column.key === 'is_active' ? `badge ${row.is_active ? 'badge-green' : ''}` : column.key === 'kind' || column.key === 'protocol' ? 'badge' : 'table-value'}>{valueLabel(column.key, row[column.key])}</span>}</td>)}<td><div className="row-actions">{canEdit && <button className="icon-button" onClick={() => open(row, 'edit')} aria-label={`Edit ${recordName(row)}`}><FilePenLine size={16}/></button>}<button className="icon-button" onClick={() => open(row)} aria-label={`View ${recordName(row)}`}><ChevronRight size={18}/></button></div></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} of {count} records</span><div className="pagination"><button className="icon-button" disabled={page <= 1} aria-label="Previous page" onClick={() => setPage(v => v - 1)}><ArrowLeft size={17}/></button><span>Page {page} of {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span><button className="icon-button" disabled={!data.next} aria-label="Next page" onClick={() => setPage(v => v + 1)}><ArrowRight size={17}/></button></div></div></> : <EmptyState icon={<Shapes size={28}/>} title={hasFilters ? 'No matching records' : `Your ${resource.title.toLowerCase()} start here`} action={hasFilters ? <button className="button button-secondary" onClick={() => { setSearch(''); setFilters({}); }}>Clear filters</button> : canEdit ? <button className="button" onClick={() => { setRecord(null); setMode('create'); }}><Plus size={16}/>Add {resource.singular}</button> : undefined}>{hasFilters ? 'Try a different search or remove a filter.' : `Add your first ${resource.singular} to build your department’s registry.`}</EmptyState>}
    </section>
    {mode && <Modal wide={mode !== 'delete'} title={mode === 'create' ? `Add ${resource.singular}` : mode === 'edit' ? `Edit ${resource.singular}` : mode === 'delete' ? `Delete ${resource.singular}?` : record ? recordName(record) : 'Record details'} onClose={close}>
      {recordLoading ? <Loading/> : <>
        {mode === 'create' || mode === 'edit' ? <RecordForm key={`${mode}-${record?.id || 'new'}`} resource={resource} record={mode === 'edit' ? record || undefined : undefined} choices={choices} choicesLoading={choicesLoading} choicesError={choicesError} onClose={close} onBusy={setBusy} onSaved={saved => { setRecord(saved); setMode('detail'); setRefresh(v => v + 1); notice(`${titleCase(resource.singular)} ${mode === 'create' ? 'created' : 'updated'}.`); }}/>
        : mode === 'delete' ? <><div className="modal-body"><p>This will permanently remove <strong>{record ? recordName(record) : 'this record'}</strong> from your department. Records referenced elsewhere must be unlinked first.</p><ErrorMessage error={actionError}/></div><footer className="modal-footer"><button className="button button-secondary" onClick={() => { setMode('detail'); setActionError(null); }} disabled={busy}>Cancel</button><button className="button button-danger" onClick={deleteRecord} disabled={busy}><Trash2 size={16}/>{busy ? 'Deleting…' : 'Delete record'}</button></footer></>
        : <><div className="modal-body"><ErrorMessage error={actionError}/>{record && <><div className="detail-context"><span className="badge badge-green">{resource.singular}</span><span>{user.department_name}</span></div><dl className="detail-grid">{resource.fields.filter(field => field.type !== 'password' && !['point', 'geometry'].includes(field.type || '')).map(field => <div key={field.key} className={['json', 'textarea'].includes(field.type || '') ? 'field-full' : ''}><dt>{field.label}</dt><dd className={field.type === 'json' ? 'code-display' : ''}>{valueLabel(field.key, record[field.key])}</dd></div>)}</dl>{!!(record.geometry || record.location) && <MapCanvas small data={geometryCollection(record.geometry || record.location)}/>}<div className="audit-details"><span>Created {dateLabel(record.created_at, true)}{record.created_by ? ` · User #${record.created_by}` : ''}</span><span>Updated {dateLabel(record.updated_at, true)}{record.updated_by ? ` · User #${record.updated_by}` : ''}</span></div>{resource.path === 'assets' && <Link className="text-button" to="/external-identifiers" onClick={close}>Manage external references <ChevronRight size={16}/></Link>}</>}</div><footer className="modal-footer">{canEdit && record && <button className="button button-danger-quiet" onClick={() => { setMode('delete'); setActionError(null); }}><Trash2 size={16}/>Delete</button>}<div className="spacer"/><button className="button button-secondary" onClick={close}>Close</button>{canEdit && record && <button className="button" onClick={() => setMode('edit')}><FilePenLine size={16}/>Edit record</button>}</footer></>}
      </>}
    </Modal>}
  </>;
}

function RecordForm({ resource, record, choices, choicesLoading, choicesError, onClose, onSaved, onBusy }: { resource: Resource; record?: RecordData; choices: Record<string, Option[]>; choicesLoading: boolean; choicesError: unknown; onClose: () => void; onSaved: (record: RecordData) => void; onBusy: (busy: boolean) => void }) {
  const [values, setValues] = useState(() => initialValues(resource.fields, record));
  const [error, setError] = useState<unknown>(null); const [fieldErrors, setFieldErrors] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const relationFields = useMemo(() => resource.fields.some(field => !!field.source), [resource]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setFieldErrors({});
    try {
      for (const field of resource.fields) if (field.type === 'point' || field.type === 'geometry') { const message = validGeometry(values[field.key], field.type === 'point'); if (message) throw new Error(`${field.label}: ${message}`); }
      const payload = makePayload(resource.fields, values, !!record);
      if (resource.path === 'users' && !record && !payload.password) throw new Error('A password is required for a new team member.');
      setBusy(true); onBusy(true);
      const saved = await mutate<RecordData>(`${resource.path}/${record ? `${record.id}/` : ''}`, record ? 'PATCH' : 'POST', payload);
      onSaved(saved);
    } catch (e) { setError(e); if (e instanceof ApiError && e.details && typeof e.details === 'object') setFieldErrors(e.details as Record<string, unknown>); }
    finally { setBusy(false); onBusy(false); }
  }
  const change = (key: string, value: unknown) => setValues(previous => ({ ...previous, [key]: value }));
  return <form onSubmit={submit}><div className="modal-body"><p className="form-intro">{record ? 'Update this record’s metadata.' : `Create a ${resource.singular} in your department.`} Fields marked <span className="required">*</span> are required.</p><ErrorMessage error={error}/>{relationFields && <ErrorMessage error={choicesError}/>}<div className="form-grid">{resource.fields.map(field => {
    const full = ['textarea', 'json', 'point', 'geometry'].includes(field.type || '');
    const options = field.options || choices[field.source || ''] || [];
    const required = field.required || field.type === 'password' && !record;
    return <div className={`form-field ${full ? 'field-full' : ''}`} key={field.key}><label htmlFor={`field-${field.key}`}>{field.label}{required && <span className="required"> *</span>}</label>
      {field.type === 'relation' || field.type === 'select' ? <select id={`field-${field.key}`} required={required} value={String(values[field.key] || '')} disabled={!!field.source && choicesLoading} onChange={e => change(field.key, e.target.value)}><option value="">{choicesLoading && field.source ? 'Loading options…' : required ? `Select ${field.label.toLowerCase()}` : 'None'}</option>{options.filter(option => !(field.key === 'parent' && record && option.value === String(record.id))).map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
      : field.type === 'boolean' ? <label className="checkbox-label"><input id={`field-${field.key}`} type="checkbox" checked={!!values[field.key]} onChange={e => change(field.key, e.target.checked)}/>Allow this user to sign in</label>
      : field.type === 'point' || field.type === 'geometry' ? <GeometryEditor value={values[field.key]} onChange={value => change(field.key, value)} pointOnly={field.type === 'point'}/>
      : field.type === 'textarea' || field.type === 'json' ? <textarea id={`field-${field.key}`} className={field.type === 'json' ? 'code-input' : ''} rows={field.type === 'json' ? 5 : 3} value={String(values[field.key] || '')} onChange={e => change(field.key, e.target.value)} required={required}/>
      : <input id={`field-${field.key}`} type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'} step={field.type === 'number' ? 'any' : undefined} autoComplete={field.type === 'password' ? 'new-password' : 'off'} placeholder={field.placeholder} value={String(values[field.key] ?? '')} onChange={e => change(field.key, e.target.value)} required={required}/>}
      {field.hint && <p className="field-hint">{field.hint}</p>}{fieldErrors[field.key] !== undefined && <p className="field-error">{errorText(fieldErrors[field.key])}</p>}
      {field.source && !choicesLoading && !options.length && <p className="field-hint">No options available yet. Create the related records first.</p>}
    </div>;
  })}</div></div><footer className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="button" disabled={busy || relationFields && (choicesLoading || !!choicesError)}>{busy ? 'Saving…' : record ? 'Save changes' : `Create ${resource.singular}`}</button></footer></form>;
}
