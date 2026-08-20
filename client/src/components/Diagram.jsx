import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ObjectNode from './ObjectNode';
import { buildGraph } from '../utils/buildGraph';

const nodeTypes = { objectNode: ObjectNode };

const EDGE_STYLES = {
  masterDetail:  { stroke: '#ef4444', strokeWidth: 3 },
  lookup:        { stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '5 3' },
  hierarchical:  { stroke: '#9ca3af', strokeWidth: 1,   strokeDasharray: '2 2' },
};

const REL_DESCRIPTIONS = [
  {
    type: 'masterDetail',
    color: '#ef4444',
    dash: null,
    label: 'Master-Detail',
    desc: 'The child record is tightly owned by the parent. Deleting the parent automatically deletes all children (cascade delete). The lookup field on the child is required — the child cannot exist without a parent. Ownership and sharing are controlled by the parent.',
    example: 'OpportunityLineItem → Opportunity',
  },
  {
    type: 'lookup',
    color: '#3b82f6',
    dash: '5 3',
    label: 'Lookup',
    desc: 'A loosely coupled relationship. The child can exist independently of the parent. Deleting the parent does not delete the child by default (the lookup field is cleared or restricted). The field is typically optional.',
    example: 'Contact → Account',
  },
  {
    type: 'hierarchical',
    color: '#9ca3af',
    dash: '2 2',
    label: 'Hierarchical',
    desc: 'A special self-referencing lookup where a record of an object relates to another record of the same object, creating a parent-child hierarchy within a single object. In Salesforce this is only available as a standard field type on the User object (the Manager field).',
    example: 'User → User (Manager)',
  },
];

function RelationshipLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
      {!open ? (
        <div
          onClick={() => setOpen(true)}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: 11, cursor: 'pointer', lineHeight: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          {REL_DESCRIPTIONS.map(r => (
            <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="24" height="10">
                <line x1="0" y1="5" x2="24" y2="5"
                  stroke={r.color}
                  strokeWidth={r.type === 'masterDetail' ? 3 : r.type === 'lookup' ? 1.5 : 1}
                  strokeDasharray={r.dash || ''}
                />
              </svg>
              <span style={{ color: '#334155' }}>{r.label}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 4, paddingTop: 4, color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>
            Click for descriptions
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px', fontSize: 12, width: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>Relationship Types</strong>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          </div>
          <div style={{ marginBottom: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, color: '#334155', marginBottom: 3 }}>What is a Relationship Edge?</div>
            <div style={{ color: '#64748b', lineHeight: 1.5 }}>
              The lines connecting two object nodes in the diagram. Each edge represents a field on the child object that references (points to) the parent object. Edges show the direction, type, and strength of the relationship between two Salesforce objects.
            </div>
          </div>
          {REL_DESCRIPTIONS.map(r => (
            <div key={r.type} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <svg width="28" height="10" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="5" x2="28" y2="5"
                    stroke={r.color}
                    strokeWidth={r.type === 'masterDetail' ? 3 : r.type === 'lookup' ? 1.5 : 1}
                    strokeDasharray={r.dash || ''}
                  />
                </svg>
                <strong style={{ color: '#0f172a' }}>{r.label}</strong>
              </div>
              <div style={{ color: '#475569', lineHeight: 1.5, marginBottom: 4 }}>{r.desc}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Example: <em>{r.example}</em></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiagramInner({ schema, filter, searchTerm, showEdgeLabels, focusedNode, onNodeClick, onFocusNode }) {
  const { getNodes } = useReactFlow();
  const [edgeTooltip, setEdgeTooltip] = useState(null);

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildGraph(schema, filter, focusedNode, searchTerm),
    [schema, filter, focusedNode, searchTerm]
  );

  const styledNodes = useMemo(() =>
    rawNodes.map(n => ({
      ...n,
      data: { ...n.data, onFocus: onFocusNode },
      style: searchTerm && (n.data.name.toLowerCase().includes(searchTerm.toLowerCase()) || n.data.label.toLowerCase().includes(searchTerm.toLowerCase()))
        ? { outline: '3px solid #f59e0b', borderRadius: 8 }
        : {},
    })),
    [rawNodes, searchTerm, onFocusNode]
  );

  const styledEdges = useMemo(() =>
    rawEdges.map(e => {
      const rt = e.data?.relationshipType || 'lookup';
      return {
        ...e,
        style: EDGE_STYLES[rt] || EDGE_STYLES.lookup,
        label: showEdgeLabels ? (e.data?.relationshipName || e.data?.fieldName || '') : '',
        labelStyle: { fontSize: 10, fill: '#64748b' },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
      };
    }),
    [rawEdges, showEdgeLabels]
  );

  const [nodes, , onNodesChange] = useNodesState(styledNodes);
  const [edges, , onEdgesChange] = useEdgesState(styledEdges);

  const handleEdgeClick = useCallback((e, edge) => {
    setEdgeTooltip(edgeTooltip?.id === edge.id ? null : { id: edge.id, data: edge.data, x: e.clientX, y: e.clientY });
  }, [edgeTooltip]);

  const exportPng = useCallback(async () => {
    const { toPng } = await import('@xyflow/react');
    const dataUrl = await toPng(document.querySelector('.react-flow__viewport'), { backgroundColor: '#fff' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'org-model.png';
    a.click();
  }, []);

  const exportPdf = useCallback(async () => {
    const { toPng } = await import('@xyflow/react');
    const dataUrl = await toPng(document.querySelector('.react-flow__viewport'), { backgroundColor: '#fff' });
    const { jsPDF } = await import('jspdf');
    const img = new Image();
    img.onload = () => {
      const pxToMm = px => px * 0.264583;
      const w = pxToMm(img.width);
      const h = pxToMm(img.height);
      const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
      pdf.save('org-model.pdf');
    };
    img.src = dataUrl;
  }, []);

  if (rawNodes.length === 0) {
    const messages = {
      platform: 'No Platform objects found. Try switching to Standard or All.',
      custom: 'No custom objects found in this org. Create custom objects in Salesforce Setup, then reconnect.',
      standard: 'No standard objects found.',
      all: searchTerm ? `No objects match "${searchTerm}". Try a different search term.` : 'No objects to display.',
    };
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No objects to display</div>
        <div style={{ fontSize: 13, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
          {searchTerm ? `No objects match "${searchTerm}". Try a different search term.` : messages[filter] || messages.all}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick(node)}
        onEdgeClick={handleEdgeClick}
        onPaneClick={() => setEdgeTooltip(null)}
        fitView
        minZoom={0.05}
      >
        <Controls />
        <MiniMap nodeColor={n => n.data?.custom ? '#fed7aa' : '#dbeafe'} />
        <Background color="#e2e8f0" gap={20} />
      </ReactFlow>

      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <button
          onClick={exportPdf}
          style={{ padding: '8px 16px', background: '#0070D2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
        >
          Save as PDF
        </button>
        <button
          onClick={exportPng}
          style={{ padding: '8px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
        >
          Export PNG
        </button>
      </div>

      {edgeTooltip && (
        <div style={{
          position: 'fixed', top: edgeTooltip.y + 10, left: edgeTooltip.x + 10,
          background: '#1e293b', color: '#f8fafc', padding: '10px 14px',
          borderRadius: 8, fontSize: 12, zIndex: 100, lineHeight: 1.8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)', maxWidth: 280,
        }}>
          <div><strong>Type:</strong> {edgeTooltip.data?.relationshipType}</div>
          <div><strong>Field:</strong> {edgeTooltip.data?.fieldName}</div>
          <div><strong>Rel name:</strong> {edgeTooltip.data?.relationshipName || '—'}</div>
          <div><strong>Required:</strong> {edgeTooltip.data?.required ? 'Yes' : 'No'}</div>
          <div><strong>Cascade delete:</strong> {edgeTooltip.data?.cascadeDelete ? 'Yes' : 'No'}</div>
        </div>
      )}

      <RelationshipLegend />
    </div>
  );
}

export default function Diagram(props) {
  return (
    <ReactFlowProvider>
      <DiagramInner {...props} />
    </ReactFlowProvider>
  );
}
