import React from 'react';
import { Handle, Position } from '@xyflow/react';

const BADGE_COLORS = {
  'Platform': { bg: '#e2e8f0', text: '#475569' },
  'Sales Cloud': { bg: '#dbeafe', text: '#1d4ed8' },
  'Service Cloud': { bg: '#dcfce7', text: '#15803d' },
  'Field Service': { bg: '#ccfbf1', text: '#0f766e' },
  'Health Cloud': { bg: '#fce7f3', text: '#be185d' },
  'Financial Services Cloud': { bg: '#ede9fe', text: '#6d28d9' },
  'Marketing Cloud': { bg: '#ffedd5', text: '#c2410c' },
  'Experience Cloud': { bg: '#fef9c3', text: '#a16207' },
  'Custom (Org)': { bg: '#fed7aa', text: '#c2410c' },
};

function getBadgeColor(cloud) {
  return BADGE_COLORS[cloud] || { bg: '#e0e7ff', text: '#4338ca' };
}

export default function ObjectNode({ data, selected }) {
  const { label, name, cloudBadge, fields = [], isJunction } = data;
  const badgeColor = getBadgeColor(cloudBadge);

  return (
    <div style={{
      background: '#fff',
      border: selected ? '2px solid #0070d2' : '1px solid #cbd5e1',
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 200,
      boxShadow: selected ? '0 0 0 3px rgba(0,112,210,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#94a3b8' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#94a3b8' }} />

      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{label}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{name}</div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px',
          borderRadius: 999, background: badgeColor.bg, color: badgeColor.text,
        }}>
          {cloudBadge}
        </span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{fields.length} fields</span>
      </div>
      {isJunction && (
        <div style={{ marginTop: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            Junction
          </span>
        </div>
      )}
    </div>
  );
}
