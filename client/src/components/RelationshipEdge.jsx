import { getBezierPath, BaseEdge } from '@xyflow/react';

// Convert React Flow handle position to the outward angle (direction the handle faces)
function positionToAngle(position) {
  switch (position) {
    case 'right':  return 0;
    case 'left':   return Math.PI;
    case 'bottom': return Math.PI / 2;
    case 'top':    return -Math.PI / 2;
    default:       return 0;
  }
}

// Draws crow's foot or single/double bar markers at an edge endpoint.
// x, y: endpoint coordinates
// outAngle: direction the marker fans INTO (away from the entity, toward the edge center)
// type: 'many' | 'many-optional' | 'one' | 'one-optional'
function CardinalityMarker({ x, y, outAngle, type, color }) {
  const r = 13;      // how far lines extend
  const spread = 7;  // perpendicular spread for crow's foot fan
  const cos = Math.cos(outAngle);
  const sin = Math.sin(outAngle);
  const px = -sin;   // perpendicular x
  const py = cos;    // perpendicular y

  if (type === 'many') {
    // Crow's foot: three lines fanning from endpoint — mandatory many
    const ex = x + cos * r;
    const ey = y + sin * r;
    return (
      <g>
        <line x1={x} y1={y} x2={ex}              y2={ey}              stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={x} y1={y} x2={ex + px * spread} y2={ey + py * spread} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={x} y1={y} x2={ex - px * spread} y2={ey - py * spread} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </g>
    );
  }

  if (type === 'many-optional') {
    // Crow's foot + circle — zero-or-many
    const ex = x + cos * r;
    const ey = y + sin * r;
    const cx = x + cos * (r + 8);
    const cy = y + sin * (r + 8);
    return (
      <g>
        <line x1={x} y1={y} x2={ex}              y2={ey}              stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={x} y1={y} x2={ex + px * spread} y2={ey + py * spread} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={x} y1={y} x2={ex - px * spread} y2={ey - py * spread} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="white" stroke={color} strokeWidth={1.5} />
      </g>
    );
  }

  if (type === 'one') {
    // Double perpendicular bar — exactly one (mandatory)
    const d = 5;
    return (
      <g>
        <line x1={x + px * 6}         y1={y + py * 6}         x2={x - px * 6}         y2={y - py * 6}         stroke={color} strokeWidth={1.5} />
        <line x1={x + cos * d + px * 6} y1={y + sin * d + py * 6} x2={x + cos * d - px * 6} y2={y + sin * d - py * 6} stroke={color} strokeWidth={1.5} />
      </g>
    );
  }

  if (type === 'one-optional') {
    // Single bar + circle — zero or one (optional)
    const d = 10;
    return (
      <g>
        <line x1={x + px * 6} y1={y + py * 6} x2={x - px * 6} y2={y - py * 6} stroke={color} strokeWidth={1.5} />
        <circle cx={x + cos * d} cy={y + sin * d} r={4} fill="white" stroke={color} strokeWidth={1.5} />
      </g>
    );
  }

  return null;
}

const CARDINALITY = {
  masterDetail:  { source: 'many',          target: 'one' },
  lookup:        { source: 'many-optional', target: 'one-optional' },
  hierarchical:  { source: 'many-optional', target: 'one-optional' },
};

export default function RelationshipEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, style,
}) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const rt = data?.relationshipType || 'lookup';
  const color = style?.stroke || '#3b82f6';
  const card = CARDINALITY[rt] || CARDINALITY.lookup;

  // Outward angles: direction FROM the entity handle INTO the edge
  const srcAngle = positionToAngle(sourcePosition);
  const tgtAngle = positionToAngle(targetPosition);

  return (
    <g>
      <BaseEdge id={id} path={edgePath} style={style} />
      <CardinalityMarker x={sourceX} y={sourceY} outAngle={srcAngle} type={card.source} color={color} />
      <CardinalityMarker x={targetX} y={targetY} outAngle={tgtAngle} type={card.target} color={color} />
    </g>
  );
}
