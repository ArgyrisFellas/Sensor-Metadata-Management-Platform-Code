import { demoMode } from './lib/demo';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, Box, Cable, ChevronRight, CircleHelp, GitBranch, KeyRound, LayoutDashboard, LogOut, Map, Menu, Radio, Radar, ShieldCheck, Tags, Upload, Users, Waves, X } from 'lucide-react';
import { api, ApiError, getCsrf, login, mutate } from './lib/api';
import type { User } from './lib/types';
import { resources } from './lib/resources';
import { ErrorMessage, Loading, NoticeProvider, titleCase, UserContext } from './components/Shared';
import Overview from './pages/Overview';
import ResourcePage from './pages/ResourcePage';
import Hierarchy from './pages/Hierarchy';
import MapPage from './pages/MapPage';
import ImportPage from './pages/ImportPage';
import KeysPage from './pages/KeysPage';

const navigation = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Devices', path: '/devices', icon: Radio },
  { label: 'Measurements', path: '/measurements', icon: Waves },
  { label: 'Assets', path: '/assets', icon: Box },
  { label: 'Data sources', path: '/sources', icon: Cable },
  { label: 'External references', path: '/external-identifiers', icon: Tags },
  { label: 'Equipment hierarchy', path: '/hierarchy', icon: GitBranch },
  { label: 'Map explorer', path: '/map', icon: Map },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    api<User>('auth/me/').then(value => { if (active) setUser(value); }).catch(e => {
      if (active && !(e instanceof ApiError && [401, 403].includes(e.status))) setError(e);
    }).finally(() => { if (active) setLoading(false); });
    const expired = () => setUser(null);
    window.addEventListener('atlas:unauthorized', expired);
    return () => { active = false; window.removeEventListener('atlas:unauthorized', expired); };
  }, [attempt]);
  if (loading) return <div className="app-loading"><Brand/><Loading/></div>;
  if (error) return <div className="app-loading"><Brand/><ErrorMessage error={error}/><button className="button" onClick={() => setAttempt(v => v + 1)}>Reconnect</button></div>;
  if (!user) return <Login onLogin={setUser}/>;
  return <UserContext.Provider value={user}><NoticeProvider><Workspace user={user} onLogout={() => setUser(null)}/></NoticeProvider></UserContext.Provider>;
}

function Brand() { return <div className="brand"><span className="brand-mark"><Radar size={25}/></span><span>sensor<span className="brand-light">atlas</span><small>METADATA WORKSPACE</small></span></div>; }

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await getCsrf(); onLogin(await login(username.trim(), password)); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }
  return <div className="login-page"><section className="login-story"><Brand/><div className="login-story-body"><span className="eyebrow">EVERY CONNECTION HAS A CONTEXT</span><h1>The whole network.<br/><em>One clear picture.</em></h1><p>Bring devices, measurements, and infrastructure together in a workspace built for your team.</p><div className="network-art" aria-hidden="true"><div className="network-orbit orbit-one"/><div className="network-orbit orbit-two"/><div className="network-node node-center"><Radar size={46}/></div><div className="network-node node-top"><Radio size={25}/></div><div className="network-node node-right"><Waves size={25}/></div><div className="network-node node-bottom"><Box size={25}/></div><span className="network-caption">CONNECTED BY CONTEXT</span></div></div><div className="login-story-footer"><span className="status-dot"/>Organized. Connected. In context.</div></section><section className="login-form-side"><div className="login-form-wrap"><div className="login-mobile-brand"><Brand/></div><span className="eyebrow">WELCOME TO SENSOR ATLAS</span><h2>Your workspace awaits.</h2><p className="login-intro">{demoMode ? "Frontend demo: enter any username and password to explore sample data. Do not use real credentials." : "Sign in to manage your department’s metadata."}</p><form onSubmit={submit}><ErrorMessage error={error}/><div className="form-field"><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" autoFocus required value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username"/></div><div className="form-field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/></div><button className="button login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={18}/></button></form><div className="login-help"><ShieldCheck size={19}/><span>Your department’s data stays within your workspace. Contact your administrator if you need access.</span></div></div><footer className="login-footer">Sensor Atlas <span>Metadata management, made clear.</span></footer></section></div>;
}

function Workspace({ user, onLogout }: { user: User; onLogout: () => void }) {
  const location = useLocation(); const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<unknown>(null); const [signingOut, setSigningOut] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  const admin = user.role === 'department_admin';
  const pageName = navigation.find(item => item.path === location.pathname)?.label || resources[location.pathname.slice(1)]?.title || (location.pathname === '/import' ? 'Import records' : location.pathname === '/api-keys' ? 'API access' : 'Workspace');
  async function logout() { setSigningOut(true); setError(null); try { await mutate('auth/logout/', 'POST'); onLogout(); } catch (e) { setError(e); } finally { setSigningOut(false); } }
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>{menuOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/>}<aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}><Link className="brand-link" to="/" aria-label="Sensor Atlas overview"><Brand/></Link><button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={21}/></button><div className="workspace-switch"><span className="workspace-avatar">{user.department_name.slice(0, 1)}</span><span><small>YOUR DEPARTMENT</small><strong>{user.department_name}</strong></span><ShieldCheck size={16}/></div><nav aria-label="Main navigation"><div className="nav-caption">WORKSPACE</div>{navigation.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'}><Icon size={18}/><span>{label}</span></NavLink>)}{user.role !== 'viewer' && <NavLink to="/import"><Upload size={18}/><span>Import records</span></NavLink>}<div className="nav-caption settings-caption">{admin ? 'ADMINISTRATION' : 'REFERENCE'}</div><NavLink to="/vocabularies"><BookOpen size={18}/><span>Catalogs</span></NavLink>{admin && <><NavLink to="/users"><Users size={18}/><span>Team members</span></NavLink><NavLink to="/api-keys"><KeyRound size={18}/><span>API access</span></NavLink></>}</nav><div className="sidebar-bottom">{!demoMode && <a href="/api/docs/" target="_blank" rel="noreferrer"><CircleHelp size={17}/>API documentation<ArrowRight size={15}/></a>}<div className="user-profile"><span className="user-avatar">{(user.name || user.username).slice(0, 2).toUpperCase()}</span><span><strong>{user.name || user.username}</strong><small>{titleCase(user.role)}</small></span><button className="icon-button" title="Sign out" aria-label="Sign out" disabled={signingOut} onClick={logout}><LogOut size={17}/></button></div></div></aside><div className="main-shell"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{pageName}</strong></div><div className="topbar-department"><span className="status-dot"/>{user.department_name}<span className="badge">{user.role === 'department_admin' ? 'Admin' : titleCase(user.role)}</span></div></header><main id="main-content" className="main-content">{demoMode && <div className="demo-banner" role="status"><strong>Frontend demo · sample data</strong><span>Changes last until you refresh. Imports and API documentation require a backend.</span></div>}<ErrorMessage error={error}/><Routes><Route path="/" element={<Overview/>}/>{Object.values(resources).map(resource => <Route key={resource.path} path={`/${resource.path}`} element={resource.path === 'users' && !admin ? <Navigate to="/" replace/> : <ResourcePage key={resource.path} resource={resource}/>}/>)}<Route path="/hierarchy" element={<Hierarchy/>}/><Route path="/map" element={<MapPage/>}/><Route path="/import" element={user.role !== 'viewer' ? <ImportPage/> : <Navigate to="/" replace/>}/><Route path="/api-keys" element={admin ? <KeysPage/> : <Navigate to="/" replace/>}/><Route path="*" element={<div className="empty-state"><h1>Page not found</h1><p>This page is not part of your workspace.</p><Link className="button" to="/">Return to overview</Link></div>}/></Routes></main><footer className="app-footer"><span>Sensor Atlas</span><span>A place for every connection.</span></footer></div></div>;
}
