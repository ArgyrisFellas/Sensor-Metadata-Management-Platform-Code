import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FeatureCollection } from 'geojson';
import { ArrowUpRight, Box, MapPin, Radio } from 'lucide-react';
import { api } from '../lib/api';
import MapCanvas from '../components/MapCanvas';
import { EmptyState, ErrorMessage, Loading, PageHeading } from '../components/Shared';

export default function MapPage() {
  const navigate = useNavigate();
  const [entity, setEntity] = useState(''); const [data, setData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<unknown>(null);
  useEffect(() => { let active = true; setLoading(true); setError(null); api<FeatureCollection>(`map/${entity ? `?entity=${entity}` : ''}`).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [entity]);
  return <><PageHeading eyebrow="SPATIAL EXPLORER" title="Your network, in context." description="Explore the geographic footprint of your department’s metadata." actions={<select aria-label="Map record type" value={entity} onChange={e => setEntity(e.target.value)}><option value="">All records</option><option value="devices">Devices</option><option value="assets">Assets</option><option value="measurements">Measurements</option></select>}/><ErrorMessage error={error}/>{loading ? <Loading label="Loading map records…"/> : <div className="map-workspace panel"><aside className="map-records"><div className="map-records-heading"><h2>On the map</h2><span className="badge">{data?.features.length || 0}</span></div><p className="map-note">Only records with a known location appear here.</p>{data?.features.length ? <div className="map-record-list">{data.features.map((feature, index) => <button key={`${feature.properties?.entity}-${feature.properties?.id}-${index}`} onClick={() => navigate(`/${feature.properties?.entity}?record=${feature.properties?.id}`)}><span className={`record-glyph ${feature.properties?.entity === 'assets' ? 'amber' : ''}`}>{feature.properties?.entity === 'assets' ? <Box size={18}/> : <Radio size={18}/>}</span><span><strong>{feature.properties?.name}</strong><small>{feature.properties?.code} · {feature.properties?.entity}</small></span><ArrowUpRight size={15}/></button>)}</div> : <EmptyState icon={<MapPin size={25}/>} title="No locations yet">Add coordinates to a device or geometry to an asset to see it here.</EmptyState>}<div className="map-legend"><span><i className="legend-dot"/>Devices & measurements</span><span><i className="legend-dot amber"/>Assets</span></div></aside><MapCanvas data={data} onSelect={(kind, id) => navigate(`/${kind}?record=${id}`)}/></div>}</>;
}
