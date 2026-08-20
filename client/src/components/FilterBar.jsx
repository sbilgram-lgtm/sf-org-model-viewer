import React from 'react';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'standard', label: 'Standard' },
  { value: 'custom', label: 'Custom' },
];

export default function FilterBar({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? '#1e293b' : '#fff',
            color: value === opt.value ? '#fff' : '#475569',
            border: 'none',
            borderRight: opt.value !== 'custom' ? '1px solid #cbd5e1' : 'none',
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
