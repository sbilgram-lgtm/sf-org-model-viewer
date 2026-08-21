import React, { useState, useMemo } from 'react';
import { computeJunctionInfo } from '../utils/buildGraph';

const STATIC_OPTIONS = [
  { value: 'all',      label: 'All Objects' },
  { value: 'junction', label: 'Junction Objects' },
  { value: 'platform', label: 'Platform Only' },
  { value: 'standard', label: 'Standard Objects' },
  { value: 'custom',   label: 'Custom Objects' },
];

// cloudBadge values that already have a dedicated static option or aren't meaningful as a cloud filter
const SKIP_BADGES = new Set(['Platform', 'Custom (Org)']);

export default function ObjectSelectorPanel({ schema, loading, selectedObjects, onToggle, onSelectAll, onClearAll }) {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const junctionInfo = useMemo(() => computeJunctionInfo(schema || []), [schema]);

  // Distinct cloud badges present in this org, sorted — drives the dynamic optgroup
  const cloudBadges = useMemo(() => {
    if (!schema) return [];
    const seen = new Set();
    for (const o of schema) {
      if (o.cloudBadge && !SKIP_BADGES.has(o.cloudBadge)) seen.add(o.cloudBadge);
    }
    return [...seen].sort();
  }, [schema]);

  const counts = useMemo(() => {
    if (!schema) return {};
    const c = {
      all:      schema.length,
      junction: Object.keys(junctionInfo).length,
      platform: schema.filter(o => !o.custom && o.cloudBadge === 'Platform').length,
      standard: schema.filter(o => !o.custom).length,
      custom:   schema.filter(o => o.custom).length,
    };
    // Count per cloud badge for the dynamic options
    for (const o of schema) {
      if (o.cloudBadge && !SKIP_BADGES.has(o.cloudBadge)) {
        c[o.cloudBadge] = (c[o.cloudBadge] || 0) + 1;
      }
    }
    return c;
  }, [schema, junctionInfo]);

  const filtered = useMemo(() => {
    if (!schema) return [];
    let items;
    if (filterType === 'platform')      items = schema.filter(o => !o.custom && o.cloudBadge === 'Platform');
    else if (filterType === 'standard') items = schema.filter(o => !o.custom);
    else if (filterType === 'custom')   items = schema.filter(o => o.custom);
    else if (filterType === 'junction') items = schema.filter(o => !!junctionInfo[o.name]);
    else if (filterType === 'all')      items = schema;
    else                                items = schema.filter(o => o.cloudBadge === filterType); // cloud badge
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(o => o.name.toLowerCase().includes(q) || o.label.toLowerCase().includes(q));
    }
    return items;
  }, [schema, filterType, search, junctionInfo]);

  return (
    <div style={{ width: 248, flexShrink: 0, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, letterSpacing: '0.02em' }}>Objects</div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Select from</div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 5, fontSize: 12, color: '#334155', background: '#fff', marginBottom: 8 }}
        >
          <optgroup label="Object Type">
            {STATIC_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}{schema ? ` (${counts[o.value]})` : ''}
              </option>
            ))}
          </optgroup>
          {cloudBadges.length > 0 && (
            <optgroup label="Industry / Product Clouds">
              {cloudBadges.map(badge => (
                <option key={badge} value={badge}>
                  {badge}{schema ? ` (${counts[badge] || 0})` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Quick Find..."
          style={{ width: '100%', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: 5, fontSize: 12, color: '#334155', background: '#fff', boxSizing: 'border-box', outline: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6, fontSize: 11 }}>
          <button
            onClick={() => onSelectAll(filtered)}
            style={{ background: 'none', border: 'none', color: '#0070D2', cursor: 'pointer', padding: 0, fontSize: 11, fontWeight: 500 }}
          >
            Select All
          </button>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <button
            onClick={onClearAll}
            style={{ background: 'none', border: 'none', color: '#0070D2', cursor: 'pointer', padding: 0, fontSize: 11, fontWeight: 500 }}
          >
            Clear All
          </button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{ padding: '20px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            Loading schema…
          </div>
        )}
        {!loading && schema && filtered.length === 0 && (
          <div style={{ padding: '20px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            No objects match
          </div>
        )}
        {!loading && filtered.map(obj => {
          const sel = selectedObjects.has(obj.name);
          return (
            <label
              key={obj.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                cursor: 'pointer',
                background: sel ? '#eff6ff' : 'transparent',
                borderLeft: `2px solid ${sel ? '#0070D2' : 'transparent'}`,
              }}
            >
              <input
                type="checkbox"
                checked={sel}
                onChange={() => onToggle(obj.name)}
                style={{ cursor: 'pointer', accentColor: '#0070D2', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, color: '#1e293b', fontWeight: sel ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obj.label}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {obj.name}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#64748b', background: '#f8fafc', flexShrink: 0 }}>
        {selectedObjects.size > 0
          ? `${selectedObjects.size} object${selectedObjects.size !== 1 ? 's' : ''} selected`
          : 'No objects selected — check objects above to build your diagram'}
      </div>
    </div>
  );
}
