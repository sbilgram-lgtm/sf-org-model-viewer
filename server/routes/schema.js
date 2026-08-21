const express = require('express');
const jsforce = require('jsforce');
const { getCloudBadge } = require('../lib/cloudMap');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.sf) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function getConn(req) {
  const { accessToken, instanceUrl } = req.session.sf;
  return new jsforce.Connection({ accessToken, instanceUrl });
}

router.get('/objects', requireAuth, async (req, res) => {
  try {
    const conn = getConn(req);
    const result = await conn.describeGlobal();
    res.json(result.sobjects.map(o => ({
      name: o.name,
      label: o.label,
      custom: o.custom,
      keyPrefix: o.keyPrefix,
      queryable: o.queryable,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/objects/:name/describe', requireAuth, async (req, res) => {
  try {
    const conn = getConn(req);
    const result = await conn.describe(req.params.name);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schema', requireAuth, async (req, res) => {
  try {
    const conn = getConn(req);
    const global = await conn.describeGlobal();
    const allObjects = global.sobjects.filter(o => o.queryable);

    const BATCH = 10;
    const results = [];
    for (let i = 0; i < allObjects.length; i += BATCH) {
      const batch = allObjects.slice(i, i + BATCH);
      const described = await Promise.all(
        batch.map(o => conn.describe(o.name).catch(() => null))
      );
      results.push(...described.filter(Boolean));
    }

    const schema = results.map(obj => ({
      name: obj.name,
      label: obj.label,
      custom: obj.custom,
      keyPrefix: obj.keyPrefix,
      cloudBadge: getCloudBadge(obj.name, obj.custom),
      recordTypeCount: (obj.recordTypeInfos || []).filter(rt => !rt.master).length,
      fields: obj.fields.map(f => ({
        name: f.name,
        label: f.label,
        type: f.type,
        length: f.length,
        required: !f.nillable && !f.defaultedOnCreate,
        unique: f.unique,
        externalId: f.externalId,
        calculated: f.calculated,
        encrypted: f.encrypted,
        referenceTo: f.referenceTo,
        relationshipName: f.relationshipName,
        cascadeDelete: f.cascadeDelete,
        restrictedDelete: f.restrictedDelete,
      })),
      childRelationships: obj.childRelationships
        .filter(r => r.childSObject && r.field)
        .map(r => ({
          childSObject: r.childSObject,
          field: r.field,
          relationshipName: r.relationshipName,
          cascadeDelete: r.cascadeDelete,
          restrictedDelete: r.restrictedDelete,
        })),
    }));

    res.json(schema);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/object-info/:name', requireAuth, async (req, res) => {
  const name = req.params.name;
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return res.status(400).json({ error: 'Invalid object name' });
  }
  const conn = getConn(req);
  const result = { triggers: [], validationRules: [] };

  await Promise.all([
    conn.tooling.query(`SELECT Id, Name, Status FROM ApexTrigger WHERE TableEnumOrId = '${name}'`)
      .then(r => { result.triggers = r.records || []; })
      .catch(() => {}),
    conn.tooling.query(`SELECT Id, FullName, Active FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = '${name}'`)
      .then(r => { result.validationRules = r.records || []; })
      .catch(() => {}),
  ]);

  res.json(result);
});

module.exports = router;
