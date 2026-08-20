import React, { useCallback, useMemo, useState, useRef } from 'react';
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
  masterDetail: { stroke: '#ef4444', strokeWidth: 3 },
  lookup: { stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '5 3' },
  hierarchical: { stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '2 2' },
};

function DiagramInner({ schema, filter, searchTerm, showEdgeLabels, focusedNode, onNodeClick, onFocusNode }) {
  const { fitView, getViewport } = useReactFlow();
  const [edgeTooltip, setEdgeTooltip] = useState(null);

  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildGraph(schema, filter, focusedNode),
    [schema, filter, focusedNode]
  );

  const styledNodes = useMemo(() =>
    rawNodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onFocus: onFocusNode,
      },
      style: searchTerm && n.data.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    const dataUrl = await toPng(document.querySelector('.react-flow__viewport'));
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'org-model.png';
    a.click();
  }, []);

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

      <button
        onClick={exportPng}
        style={{
          position: 'absolute', bottom: 16, right: 16,
          padding: '8px 16px', background: '#1e293b', color: '#fff',
          border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', zIndex: 10,
        }}
      >
        Export PNG
      </button>

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

      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
        padding: '8px 12px', fontSize: 11, zIndex: 10, lineHeight: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 24, height: 3, background: '#ef4444', borderRadius: 2 }} />
          Master-Detail
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 24, height: 2, background: '#3b82f6', borderRadius: 2, borderTop: '2px dashed #3b82f6' }} />
          Lookup
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 24, height: 1, background: '#9ca3af', borderTop: '1px dotted #9ca3af' }} />
          Hierarchical
        </div>
      </div>
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
