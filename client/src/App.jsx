import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FilterBar from './components/FilterBar';
import Diagram from './components/Diagram';
import SidePanel from './components/SidePanel';
import useSchema from './hooks/useSchema';

const STORAGE_KEY = 'sf_omv_credentials';

const FEATURES = [
  { icon: '🗂️', name: 'Interactive Diagram', desc: 'Drag, zoom, and pan a live map of every object in your org' },
  { icon: '🔗', name: 'Relationship Mapping', desc: 'Master-Detail, Lookup, and Hierarchical edges — color-coded' },
  { icon: '🏷️', name: 'Cloud / License Detection', desc: 'Badges for Platform, Sales, Service, Field Service, 30+ Industries clouds' },
  { icon: '🔍', name: 'Click-to-Explore', desc: 'Click any object to see every field, type, and badge in a side panel' },
  { icon: '🎯', name: 'Focus Mode', desc: 'Isolate any object and its direct relationships instantly' },
  { icon: '📸', name: 'PNG Export', desc: 'Save the current diagram view as an image' },
];

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #dde1e7',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
  marginTop: '5px',
  outline: 'none',
  color: '#2c3e50',
  backgroundColor: '#fafbfc',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#5a6472',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};

export default function App() {
  const [auth, setAuth] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusedNode, setFocusedNode] = useState(null);

  // Login form state
  const [loginUrl, setLoginUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const { schema, loading, error } = useSchema(auth?.authenticated ? auth : null);

  useEffect(() => {
    axios.get('/auth/status', { withCredentials: true })
      .then(r => setAuth(r.data))
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errParam = params.get('error');
    if (errParam === 'auth_failed') {
      setLoginError('Authentication failed. Check your Client ID, Client Secret, and Callback URL.');
    } else if (errParam === 'missing_credentials') {
      setLoginError('Client ID and Client Secret are required.');
    } else if (errParam) {
      setLoginError(`Salesforce error: ${decodeURIComponent(errParam)}`);
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { loginUrl: u, clientId: id, clientSecret: s } = JSON.parse(saved);
        if (u) setLoginUrl(u);
        if (id) setClientId(id);
        if (s) setClientSecret(s);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setShowSetupGuide(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleLogin = () => {
    if (!loginUrl.trim() || !clientId.trim() || !clientSecret.trim()) {
      setLoginError('All three fields are required.');
      return;
    }
    let url = loginUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    url = url.replace(/\/$/, '');

    if (remember) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ loginUrl: url, clientId: clientId.trim(), clientSecret: clientSecret.trim() }));
      } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    const params = new URLSearchParams({ loginUrl: url, clientId: clientId.trim(), clientSecret: clientSecret.trim() });
    window.location.href = `/auth/login?${params.toString()}`;
  };

  const handleLogout = async () => {
    await axios.post('/auth/logout', {}, { withCredentials: true });
    setAuth({ authenticated: false });
  };

  if (!auth) return null;

  // ── MAIN APP ──────────────────────────────────────────────────────────
  if (auth.authenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f8f9fa' }}>
        <header style={{ backgroundColor: '#2c3e50', color: 'white', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>SF Org Clarity — Object Model Viewer</h1>
            <span style={{ fontSize: '0.75rem', backgroundColor: '#3498db', padding: '2px 8px', borderRadius: '10px' }}>
              Beta
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {auth.user?.instanceUrl && (
              <span style={{ fontSize: '0.8rem', color: '#bdc3c7' }}>{auth.user.instanceUrl}</span>
            )}
            <button
              onClick={handleLogout}
              style={{ backgroundColor: 'transparent', border: '1px solid #bdc3c7', color: '#bdc3c7', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Disconnect
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0, flexWrap: 'wrap' }}>
          <FilterBar value={filter} onChange={setFilter} />
          <input
            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, width: 220, outline: 'none' }}
            placeholder="Search objects..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={showEdgeLabels} onChange={e => setShowEdgeLabels(e.target.checked)} />
            Show relationship labels
          </label>
          {focusedNode && (
            <button
              style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              onClick={() => setFocusedNode(null)}
            >
              Clear focus: {focusedNode}
            </button>
          )}
          {loading && (
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
              Loading org schema — may take up to a minute for large orgs…
            </span>
          )}
        </div>

        {loading && (
          <div style={{ height: 3, background: '#e2e8f0', flexShrink: 0 }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #0070D2, #1589EE)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        )}

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', fontSize: 14 }}>
              Loading org schema…
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#c0392b', fontSize: 14 }}>
              Error loading schema: {error}
            </div>
          )}
          {!loading && !error && schema && (
            <Diagram
              schema={schema}
              filter={filter}
              searchTerm={searchTerm}
              showEdgeLabels={showEdgeLabels}
              focusedNode={focusedNode}
              onNodeClick={node => setSelectedNode(node.data)}
              onFocusNode={name => setFocusedNode(name)}
            />
          )}
          {selectedNode && (
            <SidePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}
        </div>
      </div>
    );
  }

  // ── LOGIN PAGE ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* LEFT PANEL */}
      <div style={{
        flex: '0 0 60%',
        background: 'linear-gradient(145deg, #032D60 0%, #0070D2 60%, #1589EE 100%)',
        color: 'white',
        padding: '20px 40px',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'hidden',
      }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.85, letterSpacing: '0.05em' }}>
              SALESFORCE ORG CLARITY — OBJECT MODEL VIEWER
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 2px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            Visualize your org's data model instantly.
          </h1>
          <p style={{ fontSize: '0.85rem', opacity: 0.75, margin: '0 0 4px', fontWeight: 400 }}>
            by <strong style={{ opacity: 1 }}>Steven Bilgram</strong>, Success Architect
          </p>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.5, opacity: 0.88, maxWidth: '520px', marginTop: '6px' }}>
            Connects securely to your Salesforce org via OAuth and renders a fully interactive,
            clickable architecture diagram of every object, field, and relationship —
            with cloud and license detection across 30+ Salesforce product lines.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '32px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          {[
            { value: 'All Objects', label: 'Standard & Custom' },
            { value: '3 Types', label: 'Relationship Edges' },
            { value: '100%', label: 'Read-Only' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '3px', letterSpacing: '0.03em' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '6px' }}>
          <p style={{ fontSize: '0.72rem', opacity: 0.6, margin: '0 0 8px', letterSpacing: '0.03em' }}>
            What's included
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '7px' }}>
            {FEATURES.map(f => (
              <div
                key={f.name}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderLeft: '3px solid rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '2px', lineHeight: 1.3 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            Read-only OAuth access · No data stored · Credentials saved locally only
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: '0 0 40%', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <div style={{ backgroundColor: '#eaf1fb', border: '1.5px solid #0070d2', borderRadius: '8px', padding: '14px 16px', marginBottom: '28px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.82rem', fontWeight: 700, color: '#032d60', lineHeight: 1.4 }}>
              Important Disclaimer
            </p>
            <p style={{ margin: 0, fontSize: '0.80rem', color: '#032d60', lineHeight: 1.55 }}>
              Org Clarity Object Model Viewer is provided "as is," without warranties. It performs read-only metadata
              access only — no data is written, modified, or stored outside your browser session.
              Results reflect a point-in-time snapshot of your org's schema. Users are responsible for validating
              the output against their specific environment.
            </p>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a2332', margin: '0 0 6px' }}>
            Connect your org
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#7f8c8d', margin: '0 0 28px', lineHeight: 1.5 }}>
            Enter your Connected App credentials to authenticate via Salesforce OAuth.
          </p>

          {loginError && (
            <div style={{ backgroundColor: '#fdf0ed', border: '1px solid #e74c3c', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', fontSize: '0.82rem', color: '#c0392b' }}>
              {loginError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Org / Sandbox URL
              <input
                type="text"
                placeholder="https://company--uat.sandbox.my.salesforce.com"
                value={loginUrl}
                onChange={e => { setLoginUrl(e.target.value); setLoginError(''); }}
                style={inputStyle}
              />
            </label>
            <p style={{ fontSize: '0.72rem', color: '#aaa', margin: '4px 0 0' }}>Use your org's My Domain URL</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Client ID (Consumer Key)
              <input
                type="text"
                placeholder="3MVG9..."
                value={clientId}
                onChange={e => { setClientId(e.target.value); setLoginError(''); }}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>
              Client Secret (Consumer Secret)
              <input
                type="password"
                placeholder="••••••••••••••••"
                value={clientSecret}
                onChange={e => { setClientSecret(e.target.value); setLoginError(''); }}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#0070D2' }}
            />
            <label htmlFor="remember" style={{ fontSize: '0.8rem', color: '#5a6472', cursor: 'pointer' }}>
              Remember credentials on this device
            </label>
          </div>

          <button
            onClick={handleLogin}
            style={{ background: 'linear-gradient(135deg, #0070D2 0%, #1589EE 100%)', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', width: '100%', letterSpacing: '0.01em', boxShadow: '0 2px 8px rgba(0,112,210,0.35)' }}
            onMouseOver={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Connect to Salesforce →
          </button>

          <p style={{ marginTop: '20px', fontSize: '0.72rem', color: '#bdc3c7', lineHeight: 1.6, textAlign: 'center' }}>
            Need Instructions?{' '}
            <button
              onClick={() => setShowSetupGuide(true)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#0070D2', fontWeight: 500, fontSize: '0.72rem', cursor: 'pointer' }}
            >
              See the setup guide →
            </button>
          </p>
        </div>
      </div>

      {/* SETUP GUIDE MODAL */}
      {showSetupGuide && (
        <div
          onClick={() => setShowSetupGuide(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '640px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0, background: 'linear-gradient(135deg, #032D60 0%, #0070D2 100%)', color: 'white' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>Setup Guide</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.75 }}>Register the app once per Salesforce org you want to visualize</p>
              </div>
              <button
                onClick={() => setShowSetupGuide(false)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '1.1rem', cursor: 'pointer', color: 'white', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >×</button>
            </div>

            <div style={{ overflowY: 'auto', padding: '20px 24px 28px', fontSize: '0.875rem', color: '#2c3e50', lineHeight: 1.6 }}>

              <div style={{ backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', border: '1px solid #cce0ff' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#0070D2' }}>How to tell which setup your org uses</p>
                <p style={{ margin: '0 0 4px' }}>
                  <strong>External Client App</strong> — newer orgs (Spring '25+). Search Setup for <strong>"External Client Apps"</strong>. If it appears, use Option A.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Connected App</strong> — older orgs. Go to Setup → <strong>App Manager</strong>. If you see <strong>"New Connected App"</strong>, use Option B.
                </p>
              </div>

              <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#032D60', borderBottom: '2px solid #0070D2', paddingBottom: '6px' }}>
                Option A — External Client App (Spring '25+)
              </h4>
              <ol style={{ margin: '0 0 20px', paddingLeft: '20px' }}>
                {[
                  <><strong>Setup → External Client Apps → New</strong></>,
                  <>Fill in: <strong>Label:</strong> SF Org Model Viewer · <strong>API Name:</strong> SF_Org_Model_Viewer · <strong>Contact Email:</strong> your email</>,
                  <>Under <strong>OAuth Settings</strong>, check <strong>Enable OAuth</strong></>,
                  <>Set <strong>Callback URL</strong> to your Railway URL + <code style={{ padding: '2px 6px', backgroundColor: '#f4f4f4', borderRadius: '4px', fontSize: '0.8rem', color: '#c0392b' }}>/auth/callback</code></>,
                  <>Under <strong>OAuth Scopes</strong>, add: <em>Access and manage your data (api)</em> and <em>Perform requests on your behalf at any time (refresh_token)</em></>,
                  <>Click <strong>Save</strong> — wait ~10 minutes for Salesforce to activate it</>,
                  <>Go back → <strong>View Consumer Details</strong> to retrieve your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong></>,
                ].map((step, i) => <li key={i} style={{ marginBottom: '8px' }}>{step}</li>)}
              </ol>

              <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#032D60', borderBottom: '2px solid #0070D2', paddingBottom: '6px' }}>
                Option B — Connected App (older orgs)
              </h4>
              <ol style={{ margin: '0 0 20px', paddingLeft: '20px' }}>
                {[
                  <><strong>Setup → App Manager → New Connected App</strong></>,
                  <>Fill in: <strong>App Name:</strong> SF Org Model Viewer · <strong>API Name:</strong> SF_Org_Model_Viewer · <strong>Contact Email:</strong> your email</>,
                  <>Check <strong>Enable OAuth Settings</strong></>,
                  <>Set <strong>Callback URL</strong> to your Railway URL + <code style={{ padding: '2px 6px', backgroundColor: '#f4f4f4', borderRadius: '4px', fontSize: '0.8rem', color: '#c0392b' }}>/auth/callback</code></>,
                  <>Under <strong>Selected OAuth Scopes</strong>, add: <em>Access and manage your data (api)</em> and <em>Perform requests on your behalf at any time (refresh_token)</em></>,
                  <>Click <strong>Save</strong> — wait ~10 minutes for Salesforce to activate</>,
                  <>Go back → <strong>Manage Consumer Details</strong> to retrieve your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong></>,
                ].map((step, i) => <li key={i} style={{ marginBottom: '8px' }}>{step}</li>)}
              </ol>

              <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#032D60', borderBottom: '2px solid #0070D2', paddingBottom: '6px' }}>
                Permissions required
              </h4>
              <ul style={{ margin: '0 0 20px', paddingLeft: '20px' }}>
                {['API Enabled (profile setting)', 'View Setup and Configuration', 'Modify Metadata Through Metadata API Functions (for full results)', 'System Administrator profile grants all of the above'].map((p, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{p}</li>
                ))}
              </ul>

              <div style={{ backgroundColor: '#fef9e7', borderRadius: '8px', padding: '14px 16px', border: '1px solid #f9e4a0' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#b8860b' }}>Troubleshooting</p>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>redirect_uri_mismatch</strong> — the Callback URL in your app doesn't exactly match. Update it, save, and wait ~10 min.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Large orgs</strong> — schema loading can take 30–60 seconds for orgs with 500+ objects. A progress bar will show during loading.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
