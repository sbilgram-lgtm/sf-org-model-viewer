const COLS = 5;
const H_GAP = 280;
const V_GAP = 160;
const PAGE_SIZE = 10;

export function buildGraph(schema, filter, focusedNode, searchTerm, page = 0) {
  let objects = schema;

  if (filter === 'platform') objects = schema.filter(o => !o.custom && o.cloudBadge === 'Platform');
  else if (filter === 'standard') objects = schema.filter(o => !o.custom);
  else if (filter === 'custom') objects = schema.filter(o => o.custom);

  // When searching, find the single best match then show it + its direct relationships
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();

    const topMatch =
      objects.find(o => o.name.toLowerCase() === term || o.label.toLowerCase() === term) ||
      objects.find(o => o.name.toLowerCase().startsWith(term) || o.label.toLowerCase().startsWith(term)) ||
      objects.find(o => o.name.toLowerCase().includes(term) || o.label.toLowerCase().includes(term));

    if (topMatch) {
      const neighbors = new Set([topMatch.name]);
      for (const f of topMatch.fields) {
        if (f.referenceTo && f.referenceTo.length > 0) neighbors.add(f.referenceTo[0]);
      }
      for (const r of topMatch.childRelationships) {
        neighbors.add(r.childSObject);
      }
      objects = objects.filter(o => neighbors.has(o.name));
    } else {
      objects = [];
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

  const totalObjects = objects.length;
  const totalPages = Math.ceil(totalObjects / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  objects = objects.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

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

  return { nodes, edges, totalObjects, totalPages, currentPage: safePage };
}
