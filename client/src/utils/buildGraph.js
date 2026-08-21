const COLS = 5;
const H_GAP = 280;
const V_GAP = 160;

export function buildGraph(schema, selectedObjectNames) {
  if (!selectedObjectNames || selectedObjectNames.size === 0) {
    return { nodes: [], edges: [] };
  }

  const objects = schema.filter(o => selectedObjectNames.has(o.name));
  const objectNames = new Set(objects.map(o => o.name));

  const nodes = objects.map((obj, i) => ({
    id: obj.name,
    type: 'objectNode',
    position: {
      x: (i % COLS) * H_GAP,
      y: Math.floor(i / COLS) * V_GAP,
    },
    data: { ...obj },
  }));

  const edgeSet = new Set();
  const edges = [];

  for (const obj of objects) {
    for (const f of obj.fields) {
      if (!f.referenceTo || f.referenceTo.length === 0) continue;
      const target = f.referenceTo[0];
      if (!objectNames.has(target)) continue;

      // Detect master-detail via parent's childRelationships (field-level cascadeDelete is always undefined)
      const parentObj = schema.find(o => o.name === target);
      const childRel = parentObj?.childRelationships.find(r => r.childSObject === obj.name && r.field === f.name);

      let relationshipType = 'lookup';
      if (childRel?.cascadeDelete) {
        relationshipType = 'masterDetail';
      } else if (f.type === 'hierarchical' || (f.name === 'ParentId' && target === obj.name)) {
        relationshipType = 'hierarchical';
      }

      const edgeId = `${obj.name}-${f.name}-${target}`;
      if (edgeSet.has(edgeId)) continue;
      edgeSet.add(edgeId);

      edges.push({
        id: edgeId,
        type: 'relationship',
        source: obj.name,
        target,
        data: {
          relationshipType,
          fieldName: f.name,
          cascadeDelete: childRel?.cascadeDelete || false,
          required: f.required,
          relationshipName: f.relationshipName,
        },
      });
    }
  }

  return { nodes, edges };
}
