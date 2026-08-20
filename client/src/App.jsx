import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FilterBar from './components/FilterBar';
import Diagram from './components/Diagram';
import SidePanel from './components/SidePanel';
import useSchema from './hooks/useSchema';

const styles = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#1e293b', color: '#fff' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  title: { margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' },
  orgInfo: { fontSize: 13, color: '#94a3b8' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  toolbar: { display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' },
  searchInput: { padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, width: 220, outline: 'none' },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  loginWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', gap: 20 },
  loginTitle: { fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 },
  loginSub: { fontSize: 15, color: '#64748b', margin: 0 },
  loginBtn: { padding: '12px 28px', background: '#0070d2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  logoutBtn: { padding: '6px 14px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  loadingMsg: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', fontSize: 14 },
};

export default function App() {
  const [auth, setAuth] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusedNode, setFocusedNode] = useState(null);
  const { schema, loading, error } = useSchema(auth);

  useEffect(() => {
    axios.get('/auth/status', { withCredentials: true })
      .then(r => setAuth(r.data))
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  const handleLogout = async () => {
    await axios.post('/auth/logout', {}, { withCredentials: true });
    setAuth({ authenticated: false });
  };

  if (!auth) return null;

  if (!auth.authenticated) {
    return (
      <div style={styles.loginWrap}>
        <h1 style={styles.loginTitle}>Salesforce Org Clarity</h1>
        <p style={styles.loginSub}>Object Model Viewer</p>
        <button style={styles.loginBtn} onClick={() => window.location.href = '/auth/login'}>
          Connect to Salesforce
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Salesforce Org Clarity</h1>
          <span style={styles.orgInfo}>{auth.user?.name} · {auth.user?.instanceUrl}</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div style={styles.toolbar}>
        <FilterBar value={filter} onChange={setFilter} />
        <input
          style={styles.searchInput}
          placeholder="Search objects..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <label style={styles.toggleLabel}>
          <input type="checkbox" checked={showEdgeLabels} onChange={e => setShowEdgeLabels(e.target.checked)} />
          Show relationship labels
        </label>
        {focusedNode && (
          <button
            style={{ ...styles.logoutBtn, color: '#ef4444', borderColor: '#ef4444' }}
            onClick={() => setFocusedNode(null)}
          >
            Clear focus
          </button>
        )}
      </div>

      <div style={styles.main}>
        {loading && <div style={styles.loadingMsg}>Loading org schema — this may take a minute for large orgs…</div>}
        {error && <div style={styles.loadingMsg}>Error loading schema: {error}</div>}
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
