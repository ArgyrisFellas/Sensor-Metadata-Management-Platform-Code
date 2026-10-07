import { demoMode } from '../lib/demo';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Box, Cable, ChevronRight, Compass, Database, Layers3, Map, Radio, Upload, Waves } from 'lucide-react';
import { api } from '../lib/api';
import type { Page, RecordData } from '../lib/types';
import { dateLabel, ErrorMessage, Loading, PageHeading, useUser } from '../components/Shared';

const metrics = [
  { key: 'devices', title: 'Devices', icon: Radio, description: 'Sensors & equipment', color: 'teal' },
  { key: 'measurements', title: 'Measurements', icon: Waves, description: 'Defined observations', color: 'blue' },
  { key: 'assets', title: 'Assets', icon: Box, description: 'Monitored infrastructure', color: 'amber' },
  { key: 'sources', title: 'Data sources', icon: Cable, description: 'Connected metadata', color: 'purple' },
];
export default function Overview() {
  const user = useUser();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [recent, setRecent] = useState<RecordData[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setError(null); Promise.all([api<Record<string, number>>('summary/'), api<Page<RecordData>>('devices/?ordering=-updated_at&page_size=5')]).then(([summary, rows]) => { if (active) { setCounts(summary); setRecent(rows.results); } }).catch(e => { if (active) setError(e); }); return () => { active = false; }; }, [retry]);
  return <>
    <PageHeading eyebrow="WORKSPACE OVERVIEW" title="A clearer view of your network." description={`Your devices, measurements, and assets. Together in ${user.department_name}.`} actions={user.role !== 'viewer' ? <Link className="button" to="/import"><Upload size={16}/>Import records</Link> : undefined}/>
    <ErrorMessage error={error}/>{error && <button className="button button-secondary" onClick={() => setRetry(v => v + 1)}>Try again</button>}
    {!counts && !error ? <Loading/> : <>
      <section className="metric-grid" aria-label="Department totals">{metrics.map(({ key, title, icon: Icon, description, color }) => <Link to={`/${key}`} className="metric-card" key={key}><div className="metric-top"><span className={`metric-icon ${color}`}><Icon size={21}/></span><ArrowUpRight size={17}/></div><strong className="metric-number">{counts?.[key]?.toLocaleString() ?? '—'}</strong><div className="metric-title">{title}</div><div className="metric-description">{description}</div></Link>)}</section>
      <div className="overview-grid"><section className="panel recent-panel"><div className="panel-heading"><div><h2>Recently updated devices</h2><p>The latest changes in your equipment registry.</p></div><Link className="text-button" to="/devices">View all <ArrowRight size={15}/></Link></div>{recent.length ? <div className="recent-list">{recent.map(record => <Link key={record.id} className="recent-row" to={`/devices?record=${record.id}`}><span className="record-glyph"><Radio size={19}/></span><span className="recent-name"><strong>{String(record.name)}</strong><small>{String(record.code)}</small></span><span className="recent-date">{dateLabel(record.updated_at)}</span><ChevronRight size={16}/></Link>)}</div> : <div className="compact-empty"><Radio size={32}/><h3>Your registry is ready to grow</h3><p>Add your first device to start connecting the pieces.</p><Link to="/devices" className="text-button">Open devices <ArrowRight size={15}/></Link></div>}</section>
      <Link className="map-promo" to="/map"><div className="map-promo-art" aria-hidden="true"><div className="map-grid-lines"/><span className="location-ring"><Map size={35}/></span><span className="map-art-label">SPATIAL EXPLORER</span></div><div className="map-promo-content"><span className="eyebrow">PUT IT IN PERSPECTIVE</span><h2>Your network, on the map.</h2><p>Explore your devices and infrastructure in their real-world context.</p><span className="text-button">Explore map <ArrowUpRight size={16}/></span></div></Link></div>
      <section className="panel connection-guide"><div className="panel-heading"><div><h2>Make your metadata work together</h2><p>A consistent structure for every part of your network.</p></div><Layers3 size={22}/></div><div className="guide-grid"><Link to="/assets"><span className="guide-step">01</span><Box size={20}/><div><strong>Define the asset</strong><p>Describe the infrastructure you want to monitor.</p></div><ChevronRight size={17}/></Link><Link to="/devices"><span className="guide-step">02</span><Radio size={20}/><div><strong>Register the device</strong><p>Place your equipment and connect its hierarchy.</p></div><ChevronRight size={17}/></Link><Link to="/measurements"><span className="guide-step">03</span><Waves size={20}/><div><strong>Connect a measurement</strong><p>Link what is measured to its device and asset.</p></div><ChevronRight size={17}/></Link></div></section>
      <div className="workspace-note"><Compass size={17}/><span>Sensor Atlas manages metadata. Measurement values are collected by your external systems.</span>{!demoMode && <a href="/api/docs/" target="_blank" rel="noreferrer"><Database size={14}/>API reference <ArrowUpRight size={13}/></a>}</div>
    </>}
  </>;
}
