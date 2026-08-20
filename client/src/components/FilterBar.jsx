import React from 'react';

const OPTIONS = [
  { value: 'platform', label: 'Platform' },
  { value: 'custom',   label: 'Custom' },
  { value: 'standard', label: 'Standard' },
  { value: 'all',      label: 'All' },
];

export default function FilterBar({ value, onChange, schema }) {
  const counts = schema ? {
    platform: schema.filter(o => !o.custom && o.cloudBadge === 'Platform').length,
    custom:   schema.filter(o => o.custom).length,
    standard: schema.filter(o => !o.custom).length,
    all:      schema.length,
  } : {};

  return (
    <div style={{ display: 'flex', gap: 0, border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
      {OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? '#1e293b' : '#fff',
            color: value === opt.value ? '#fff' : '#475569',
            border: 'none',
            borderRight: i < OPTIONS.length - 1 ? '1px solid #cbd5e1' : 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}{schema ? ` (${counts[opt.value]})` : ''}
        </button>
      ))}
    </div>
  );
}
