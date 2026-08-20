const COLS = 6;
const H_GAP = 280;
const V_GAP = 160;

export function buildGraph(schema, filter, focusedNode, searchTerm) {
  let objects = schema;

  if (filter === 'platform') objects = schema.filter(o => !o.custom && o.cloudBadge === 'Platform');
  else if (filter === 'standard') objects = schema.filter(o => !o.custom);
  else if (filter === 'custom') objects = schema.filter(o => o.custom);

  // When searching, keep only matching objects + their direct neighbors
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    const matchingNames = new Set(
      objects.filter(o =>
        o.name.toLowerCase().includes(term) || o.label.toLowerCase().includes(term)
      ).map(o => o.name)
    );

    if (matchingNames.size > 0) {
      const neighbors = new Set(matchingNames);
      for (const obj of objects) {
        if (!matchingNames.has(obj.name)) continue;
        for (const f of obj.fields) {
          if (f.referenceTo && f.referenceTo.length > 0) neighbors.add(f.referenceTo[0]);
        }
        for (const r of obj.childRelationships) {
          neighbors.add(r.childSObject);
        }
      }
      for (const obj of schema) {
        if (matchingNames.has(obj.name)) continue;
        for (const f of obj.fields) {
          if (f.referenceTo && f.referenceTo.includes(obj.name)) neighbors.add(obj.name);
        }
      }
      objects = objects.filter(o => neighbors.has(o.name));
    }
  }

  if (focusedNode) {
    const directNeighbors = new Set([focusedNode]);
    for (const obj of objects) {
      if (obj.name === focusedNode) {
        for (const f of obj.fields) {
          if (f.referenceTo && f.referenceTo.length > 0) directNeighbors.add(f.referenceTo[0]);
        }
        for (const r of obj.childRelationships) {
          directNeighbors.add(r.childSObject);
        }
      }
    }
    for (const obj of schema) {
      if (obj.name === focusedNode) continue;
      for (const f of obj.fields) {
        if (f.referenceTo && f.referenceTo.includes(focusedNode)) directNeighbors.add(obj.name);
      }
    }
    objects = objects.filter(o => directNeighbors.has(o.name));
  }

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

      let relationshipType = 'lookup';
      if (f.cascadeDelete) {
        relationshipType = 'masterDetail';
      } else if (f.name === 'ParentId' && target === obj.name) {
        relationshipType = 'hierarchical';
      }

      const edgeId = `${obj.name}-${f.name}-${target}`;
      if (edgeSet.has(edgeId)) continue;
      edgeSet.add(edgeId);

      edges.push({
        id: edgeId,
        source: obj.name,
        target,
        data: {
          relationshipType,
          fieldName: f.name,
          cascadeDelete: f.cascadeDelete,
          required: f.required,
          relationshipName: f.relationshipName,
        },
      });
    }
  }

  return { nodes, edges };
}
