import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
import RelationshipEdge from './RelationshipEdge';
import { buildGraph } from '../utils/buildGraph';

const nodeTypes = { objectNode: ObjectNode };
const edgeTypes = { relationship: RelationshipEdge };

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
    cardinality: '1 (parent) to many (children)',
    desc: 'The child is tightly owned by the parent. Cascade delete: deleting the parent removes all children. The child\'s lookup field is required — a child cannot exist without a parent. Ownership and sharing are inherited from the parent.',
    example: 'OpportunityLineItem → Opportunity',
  },
  {
    type: 'lookup',
    color: '#3b82f6',
    dash: '5 3',
    label: 'Lookup',
    cardinality: '0..1 (parent) to 0..many (children)',
    desc: 'A loosely coupled, optional relationship. The child can exist without a parent. Deleting the parent does not delete the child — the lookup field is cleared or restricted. The circle (○) on each end indicates the relationship is optional.',
    example: 'Contact → Account',
  },
  {
    type: 'hierarchical',
    color: '#9ca3af',
    dash: '2 2',
    label: 'Hierarchical',
    cardinality: '0..1 (parent) to 0..many (children)',
    desc: 'A self-referencing relationship — a record of an object points to another record of the same object. Used for tree-style hierarchies within a single object type.',
    example: 'User → User (Manager), Account → Account (Parent)',
  },
];

// Draws one endpoint symbol + a short line stub — used in both collapsed and expanded legend
function EndpointSvg({ type, color, dash }) {
  const da = dash || '';
  if (type === 'many') return (
    <svg width="38" height="20" style={{ flexShrink: 0 }}>
      <line x1="2"  y1="10" x2="14" y2="10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1="2"  y1="10" x2="14" y2="4"  stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1="2"  y1="10" x2="14" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1="14" y1="10" x2="38" y2="10" stroke={color} strokeWidth={1.5} strokeDasharray={da} />
    </svg>
  );
  if (type === 'many-optional') return (
    <svg width="46" height="20" style={{ flexShrink: 0 }}>
      <line x1="2"  y1="10" x2="14" y2="10" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1="2"  y1="10" x2="14" y2="4"  stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1="2"  y1="10" x2="14" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="19" cy="10" r="4" fill="white" stroke={color} strokeWidth={1.5} />
      <line x1="24" y1="10" x2="46" y2="10" stroke={color} strokeWidth={1.5} strokeDasharray={da} />
    </svg>
  );
  if (type === 'one') return (
    <svg width="38" height="20" style={{ flexShrink: 0 }}>
      <line x1="2" y1="4" x2="2" y2="16" stroke={color} strokeWidth={1.5} />
      <line x1="7" y1="4" x2="7" y2="16" stroke={color} strokeWidth={1.5} />
      <line x1="7" y1="10" x2="38" y2="10" stroke={color} strokeWidth={1.5} strokeDasharray={da} />
    </svg>
  );
  if (type === 'one-optional') return (
    <svg width="46" height="20" style={{ flexShrink: 0 }}>
      <line x1="2"  y1="4" x2="2"  y2="16" stroke={color} strokeWidth={1.5} />
      <circle cx="11" cy="10" r="4" fill="white" stroke={color} strokeWidth={1.5} />
      <line x1="16" y1="10" x2="46" y2="10" stroke={color} strokeWidth={1.5} strokeDasharray={da} />
    </svg>
  );
  return null;
}

const ENDPOINT_LEGEND = [
  { type: 'many',          color: '#ef4444', dash: '',    label: 'Many (required)' },
  { type: 'one',           color: '#ef4444', dash: '',    label: 'Exactly One' },
  { type: 'many-optional', color: '#3b82f6', dash: '5 3', label: 'Zero or Many' },
  { type: 'one-optional',  color: '#3b82f6', dash: '5 3', label: 'Zero or One' },
];

function RelationshipLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
      {!open ? (
        <div
          onClick={() => setOpen(true)}
          style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: 11, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minWidth: 160 }}
        >
          {/* Relationship line styles */}
          {REL_DESCRIPTIONS.map(r => (
            <div key={r.type} style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 2 }}>
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
          {/* Endpoint symbol mini-grid */}
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 5, paddingTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
            {ENDPOINT_LEGEND.map(e => (
              <div key={e.type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <EndpointSvg type={e.type} color={e.color} dash={e.dash} />
                <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>{e.label}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 5, paddingTop: 4, color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>
            Click for descriptions
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px', fontSize: 12, width: 340, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>Relationship Types</strong>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          </div>

          {/* Visual endpoint symbol key */}
          <div style={{ marginBottom: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, color: '#334155', marginBottom: 8, fontSize: 12 }}>Endpoint (Crow's Foot) Notation</div>
            {ENDPOINT_LEGEND.map(e => (
              <div key={e.type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <EndpointSvg type={e.type} color={e.color} dash={e.dash} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{e.label}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {e.type === 'many'          && 'Required — one parent must exist, parent can have many children'}
                    {e.type === 'one'           && 'Required — the child must have exactly one parent'}
                    {e.type === 'many-optional' && 'Optional — parent may have zero or many children'}
                    {e.type === 'one-optional'  && 'Optional — the child may reference zero or one parent'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {REL_DESCRIPTIONS.map(r => (
            <div key={r.type} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <svg width="28" height="10" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="5" x2="28" y2="5"
                    stroke={r.color}
                    strokeWidth={r.type === 'masterDetail' ? 3 : r.type === 'lookup' ? 1.5 : 1}
                    strokeDasharray={r.dash || ''}
                  />
                </svg>
                <strong style={{ color: '#0f172a' }}>{r.label}</strong>
              </div>
              <div style={{ fontSize: 10, color: r.color, fontWeight: 600, marginBottom: 4 }}>{r.cardinality}</div>
              <div style={{ color: '#475569', lineHeight: 1.5, marginBottom: 4 }}>{r.desc}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Example: <em>{r.example}</em></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiagramInner({ schema, selectedObjects, showEdgeLabels, focusedNode, onNodeClick, onFocusNode }) {
  const [edgeTooltip, setEdgeTooltip] = useState(null);

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildGraph(schema, selectedObjects, focusedNode),
    [schema, selectedObjects, focusedNode]
  );

  const styledNodes = useMemo(() =>
    rawNodes.map(n => ({
      ...n,
      data: { ...n.data, onFocus: onFocusNode },
    })),
    [rawNodes, onFocusNode]
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

  const [nodes, setNodes, onNodesChange] = useNodesState(styledNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(styledEdges);

  const { fitView } = useReactFlow();

  useEffect(() => { setNodes(styledNodes); }, [styledNodes, setNodes]);
  useEffect(() => { setEdges(styledEdges); }, [styledEdges, setEdges]);
  useEffect(() => { setTimeout(() => fitView({ padding: 0.2 }), 50); }, [styledNodes, fitView]);

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
    const noSelection = !selectedObjects || selectedObjects.size === 0;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 12 }}>
        <div style={{ fontSize: 40 }}>{noSelection ? '🗂️' : '🔍'}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>
          {noSelection ? 'No objects selected' : 'No objects to display'}
        </div>
        <div style={{ fontSize: 13, maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
          {noSelection
            ? 'Select one or more objects from the panel on the left to build your diagram. Use Quick Find to search, or Select All to load everything.'
            : 'The selected objects have no visible relationships in the current view.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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

export default function Diagram({ schema, selectedObjects, showEdgeLabels, focusedNode, onNodeClick, onFocusNode }) {
  return (
    <ReactFlowProvider>
      <DiagramInner
        schema={schema}
        selectedObjects={selectedObjects}
        showEdgeLabels={showEdgeLabels}
        focusedNode={focusedNode}
        onNodeClick={onNodeClick}
        onFocusNode={onFocusNode}
      />
    </ReactFlowProvider>
  );
}

