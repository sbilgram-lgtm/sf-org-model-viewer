import React, { useState } from 'react';

const BADGE_COLORS = {
  required: { bg: '#fee2e2', text: '#b91c1c', label: 'Required' },
  unique: { bg: '#dbeafe', text: '#1d4ed8', label: 'Unique' },
  externalId: { bg: '#fef9c3', text: '#a16207', label: 'External ID' },
  calculated: { bg: '#ede9fe', text: '#6d28d9', label: 'Formula' },
  encrypted: { bg: '#e2e8f0', text: '#475569', label: 'Encrypted' },
};

function FieldBadge({ type }) {
  const c = BADGE_COLORS[type];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '1px 6px',
      borderRadius: 999, background: c.bg, color: c.text, marginRight: 4,
    }}>
      {c.label}
    </span>
  );
}

function FieldRow({ field }) {
  const [expanded, setExpanded] = useState(false);
  const hasRef = field.referenceTo && field.referenceTo.length > 0;

  return (
    <>
      <tr
        onClick={() => hasRef && setExpanded(x => !x)}
        style={{ cursor: hasRef ? 'pointer' : 'default', background: expanded ? '#f1f5f9' : 'transparent' }}
      >
        <td style={tdStyle}>{field.name}</td>
        <td style={tdStyle}>{field.label}</td>
        <td style={{ ...tdStyle, color: '#64748b' }}>{field.type}{field.length ? `(${field.length})` : ''}</td>
        <td style={tdStyle}>
          {field.required && <FieldBadge type="required" />}
          {field.unique && <FieldBadge type="unique" />}
          {field.externalId && <FieldBadge type="externalId" />}
          {field.calculated && <FieldBadge type="calculated" />}
          {field.encrypted && <FieldBadge type="encrypted" />}
        </td>
      </tr>
      {expanded && hasRef && (
        <tr style={{ background: '#f8fafc' }}>
          <td colSpan={4} style={{ padding: '6px 12px', fontSize: 11, color: '#475569' }}>
            <strong>References:</strong> {field.referenceTo.join(', ')} &nbsp;·&nbsp;
            <strong>Rel name:</strong> {field.relationshipName || '—'} &nbsp;·&nbsp;
            <strong>Cascade delete:</strong> {field.cascadeDelete ? 'Yes' : 'No'}
          </td>
        </tr>
      )}
    </>
  );
}

const tdStyle = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };
const thStyle = { padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' };

export default function SidePanel({ node, onClose }) {
  const [fieldSearch, setFieldSearch] = useState('');

  const filtered = node.fields.filter(f =>
    !fieldSearch || f.name.toLowerCase().includes(fieldSearch.toLowerCase()) || f.label.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  return (
    <div style={{
      width: 520, borderLeft: '1px solid #e2e8f0', background: '#fff',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{node.label}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{node.name}</div>
          <span style={{ marginTop: 6, display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#e0e7ff', color: '#4338ca' }}>
            {node.cloudBadge}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <input
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          placeholder="Filter fields..."
          value={fieldSearch}
          onChange={e => setFieldSearch(e.target.value)}
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>API Name</th>
              <th style={thStyle}>Label</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Attributes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => <FieldRow key={f.name} field={f} />)}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No fields match</div>
        )}
      </div>
    </div>
  );
}
