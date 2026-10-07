import { useMemo, useState } from 'react';
import { MapPin, RotateCcw, Trash2 } from 'lucide-react';
import MapCanvas, { geometryCollection } from './MapCanvas';
import { validGeometry } from '../lib/forms';

type Geo = { type: string; coordinates: number[] | number[][] | number[][][] };
export default function GeometryEditor({ value, onChange, pointOnly = false }: { value: unknown; onChange: (value: unknown) => void; pointOnly?: boolean }) {
  // Only complete, supported geometries may drive the map or vertex editor.
  // Raw JSON remains in the form value so submission can report its error.
  const geo = value && typeof value === 'object' && !validGeometry(value, pointOnly) ? value as Geo : null;
  const [type, setType] = useState(geo?.type || 'Point');
  const [mode, setMode] = useState<'map' | 'json'>('map');
  const [draftPoints, setDraftPoints] = useState<number[][]>([]);
  const [lat, setLat] = useState(geo?.type === 'Point' ? String(geo.coordinates[1]) : '');
  const [lon, setLon] = useState(geo?.type === 'Point' ? String(geo.coordinates[0]) : '');
  const [text, setText] = useState(value ? JSON.stringify(value, null, 2) : '');
  const [error, setError] = useState('');
  const publish = (next: unknown) => { setError(validGeometry(next, pointOnly) || ''); setText(next ? JSON.stringify(next, null, 2) : ''); onChange(next); };
  const mapData = useMemo(() => geometryCollection(draftPoints.length ? { type: draftPoints.length === 1 ? 'Point' : 'LineString', coordinates: draftPoints.length === 1 ? draftPoints[0] : draftPoints } : geo), [value, draftPoints]);
  function pointChange(longitude: string, latitude: string) {
    setLon(longitude); setLat(latitude);
    if (longitude === '' && latitude === '') { publish(null); return; }
    if (longitude === '' || latitude === '') { setError('Enter both longitude and latitude.'); onChange('incomplete coordinates'); return; }
    publish({ type: 'Point', coordinates: [Number(longitude), Number(latitude)] });
  }
  function vertices(): number[][] {
    if (draftPoints.length) return draftPoints;
    if (geo?.type === 'LineString') return geo.coordinates as number[][];
    if (geo?.type === 'Polygon') return (geo.coordinates as number[][][])[0].slice(0, -1);
    return [];
  }
  function updateVertices(points: number[][]) {
    if (!points.length) { setDraftPoints([]); publish(null); return; }
    if (type === 'Polygon' && points.length >= 3) { setDraftPoints([]); publish({ type, coordinates: [[...points, points[0]], ...(geo?.type === 'Polygon' ? (geo.coordinates as number[][][]).slice(1) : [])] }); }
    else if (type === 'LineString' && points.length >= 2) { setDraftPoints([]); publish({ type, coordinates: points }); }
    else { setDraftPoints(points); setError(type === 'Polygon' ? 'Add at least three vertices to complete the polygon.' : 'Add a second point to complete the line.'); onChange('incomplete geometry'); }
  }
  return <div className="geometry-editor">
    <div className="geometry-toolbar"><div className="segmented"><button type="button" className={mode === 'map' ? 'selected' : ''} onClick={() => setMode('map')}>Map & coordinates</button><button type="button" className={mode === 'json' ? 'selected' : ''} onClick={() => setMode('json')}>GeoJSON</button></div><button type="button" className="text-button" onClick={() => { publish(null); setDraftPoints([]); setLon(''); setLat(''); }}><Trash2 size={14}/>Clear</button></div>
    {mode === 'map' ? <>
      {!pointOnly && <label className="inline-field">Geometry type<select value={type} onChange={e => { setType(e.target.value); setDraftPoints([]); setLat(''); setLon(''); publish(null); }}><option>Point</option><option>LineString</option><option>Polygon</option></select></label>}
      <MapCanvas small data={mapData} onClick={(longitude, latitude) => { if (type === 'Point') pointChange(String(longitude), String(latitude)); else updateVertices([...vertices(), [longitude, latitude]]); }}/>
      <p className="field-hint"><MapPin size={13}/>{type === 'Point' ? 'Click the map to place a point, or enter coordinates below.' : `Click to add ${type === 'Polygon' ? 'at least three polygon vertices' : 'line vertices'}. Use GeoJSON for exact coordinates.`}</p>
      {type === 'Point' ? <div className="coordinate-grid"><label>Latitude<input type="number" step="any" min="-90" max="90" value={lat} placeholder="−90 to 90" onChange={e => pointChange(lon, e.target.value)}/></label><label>Longitude<input type="number" step="any" min="-180" max="180" value={lon} placeholder="−180 to 180" onChange={e => pointChange(e.target.value, lat)}/></label></div> : <button className="text-button" type="button" disabled={!vertices().length} onClick={() => updateVertices(vertices().slice(0, -1))}><RotateCcw size={14}/>Undo last vertex</button>}
    </> : <><textarea className="code-input" rows={9} value={text} placeholder={'{"type":"Point","coordinates":[33.38,35.18]}'} onChange={e => {
      setText(e.target.value); setDraftPoints([]); setLon(''); setLat('');
      if (!e.target.value.trim()) { onChange(null); setError(''); return; }
      try {
        const next = JSON.parse(e.target.value);
        const message = validGeometry(next, pointOnly);
        setError(message || ''); onChange(next);
        if (!message && next) {
          setType(next.type);
          if (next.type === 'Point') { setLon(String(next.coordinates[0])); setLat(String(next.coordinates[1])); }
        }
      } catch { setError('Enter valid JSON.'); onChange(e.target.value); }
    }}/><p className="field-hint">GeoJSON uses [longitude, latitude] in WGS84. Polygon rings must be closed.</p>{geo && <MapCanvas small data={mapData}/>}</>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
