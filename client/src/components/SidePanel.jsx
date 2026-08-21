import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BADGE_COLORS = {
  required:   { bg: '#fee2e2', text: '#b91c1c', label: 'Required' },
  unique:     { bg: '#dbeafe', text: '#1d4ed8', label: 'Unique' },
  externalId: { bg: '#fef9c3', text: '#a16207', label: 'External ID' },
  calculated: { bg: '#ede9fe', text: '#6d28d9', label: 'Formula' },
  encrypted:  { bg: '#e2e8f0', text: '#475569', label: 'Encrypted' },
};

function FieldBadge({ type }) {
  const c = BADGE_COLORS[type];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: c.bg, color: c.text, marginRight: 4 }}>
      {c.label}
    </span>
  );
}

function FieldRow({ field }) {
  const [expanded, setExpanded] = useState(false);
  const hasRef = field.referenceTo && field.referenceTo.length > 0;
  return (
    <>
      <tr
        onClick={() => hasRef && setExpanded(x => !x)}
        style={{ cursor: hasRef ? 'pointer' : 'default', background: expanded ? '#f1f5f9' : 'transparent' }}
      >
        <td style={tdStyle}>{field.name}</td>
        <td style={tdStyle}>{field.label}</td>
        <td style={{ ...tdStyle, color: '#64748b' }}>{field.type}{field.length ? `(${field.length})` : ''}</td>
        <td style={tdStyle}>
          {field.required    && <FieldBadge type="required" />}
          {field.unique      && <FieldBadge type="unique" />}
          {field.externalId  && <FieldBadge type="externalId" />}
          {field.calculated  && <FieldBadge type="calculated" />}
          {field.encrypted   && <FieldBadge type="encrypted" />}
        </td>
      </tr>
      {expanded && hasRef && (
        <tr style={{ background: '#f8fafc' }}>
          <td colSpan={4} style={{ padding: '6px 12px', fontSize: 11, color: '#475569' }}>
            <strong>References:</strong> {field.referenceTo.join(', ')} &nbsp;·&nbsp;
            <strong>Rel name:</strong> {field.relationshipName || '—'} &nbsp;·&nbsp;
            <strong>Cascade delete:</strong> {field.cascadeDelete ? 'Yes' : 'No'}
          </td>
        </tr>
      )}
    </>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{
      flex: '1 1 22%',
      background: accent ? '#eff6ff' : '#f8fafc',
      border: `1px solid ${accent ? '#bfdbfe' : '#e2e8f0'}`,
      borderRadius: 7,
      padding: '10px 8px',
      textAlign: 'center',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? '#1d4ed8' : '#0f172a', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

const SEVERITY = {
  high:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444' },
  medium: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
  low:    { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
};

function DebtIssue({ issue }) {
  const [expanded, setExpanded] = useState(false);
  const c = SEVERITY[issue.severity];
  return (
    <div style={{ marginBottom: 8, border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(x => !x)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: c.bg, cursor: 'pointer' }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0, marginTop: 3 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{issue.title}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>{issue.detail}</div>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '6px 10px 8px', background: '#fff', borderTop: `1px solid ${c.border}` }}>
          {issue.items.map((item, i) => (
            <div key={i} style={{ fontSize: 11, color: '#334155', padding: '3px 0', borderBottom: i < issue.items.length - 1 ? '1px solid #f8fafc' : 'none', fontFamily: 'monospace' }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TechDebtSection({ node, objectInfo }) {
  const { fieldsOnLayouts, fieldDefinitions = [], triggers = [], validationRules = [] } = objectInfo;
  const customFields = node.fields.filter(f => f.name.endsWith('__c'));
  const issues = [];

  if (fieldsOnLayouts !== null) {
    const onLayout = new Set(fieldsOnLayouts);
    const missing = customFields.filter(f => !onLayout.has(f.name));
    if (missing.length > 0) {
      issues.push({
        id: 'layout',
        severity: 'high',
        title: `${missing.length} custom field${missing.length !== 1 ? 's' : ''} not on any page layout`,
        detail: 'These fields exist in the schema but are invisible to users — no layout surfaces them.',
        items: missing.map(f => `${f.label}  (${f.name})`),
      });
    }
  }

  if (fieldDefinitions.length > 0) {
    const noDesc = fieldDefinitions.filter(fd => !fd.Description);
    if (noDesc.length > 0) {
      issues.push({
        id: 'nodesc',
        severity: 'medium',
        title: `${noDesc.length} custom field${noDesc.length !== 1 ? 's' : ''} missing description`,
        detail: 'No description makes it hard to know the purpose of a field during maintenance or onboarding.',
        items: noDesc.map(fd => fd.QualifiedApiName),
      });
    }
    const noHelp = fieldDefinitions.filter(fd => !fd.InlineHelpText);
    if (noHelp.length > 0) {
      issues.push({
        id: 'nohelp',
        severity: 'low',
        title: `${noHelp.length} custom field${noHelp.length !== 1 ? 's' : ''} missing inline help text`,
        detail: 'Help text guides users on what to enter. Missing help text is a UX gap.',
        items: noHelp.map(fd => fd.QualifiedApiName),
      });
    }
  }

  const inactiveTriggers = triggers.filter(t => t.Status !== 'Active');
  if (inactiveTriggers.length > 0) {
    issues.push({
      id: 'triggers',
      severity: 'medium',
      title: `${inactiveTriggers.length} inactive Apex trigger${inactiveTriggers.length !== 1 ? 's' : ''}`,
      detail: 'Inactive triggers are likely dead code. Review: reactivate, refactor, or delete.',
      items: inactiveTriggers.map(t => t.Name),
    });
  }

  const inactiveRules = validationRules.filter(vr => !vr.Active);
  if (inactiveRules.length > 0) {
    issues.push({
      id: 'rules',
      severity: 'low',
      title: `${inactiveRules.length} inactive validation rule${inactiveRules.length !== 1 ? 's' : ''}`,
      detail: 'Inactive rules may be remnants of past configurations — review and clean up.',
      items: inactiveRules.map(vr => vr.FullName?.split('.').pop() || vr.FullName),
    });
  }

  const totalIssues = issues.length;
  const highCount = issues.filter(i => i.severity === 'high').length;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Potential Technical Debt
        </span>
        {totalIssues > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: highCount > 0 ? '#fee2e2' : '#fffbeb',
            color: highCount > 0 ? '#dc2626' : '#b45309',
          }}>
            {totalIssues} issue{totalIssues !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {totalIssues === 0 ? (
        <div style={{ fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>✓</span> No issues detected
        </div>
      ) : (
        issues.map(issue => <DebtIssue key={issue.id} issue={issue} />)
      )}
    </div>
  );
}

function MetadataList({ title, items, loading, emptyMsg, renderItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 6 }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!loading && items !== null && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{items.length}</span>
          )}
          {loading && <span style={{ fontSize: 11, color: '#94a3b8' }}>loading…</span>}
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{open ? '▾' : '▸'}</span>
        </div>
      </div>
      {open && (
        <div>
          {loading && (
            <div style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0' }}>Fetching from Salesforce…</div>
          )}
          {!loading && items !== null && items.length === 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', padding: '4px 0' }}>{emptyMsg}</div>
          )}
          {!loading && items !== null && items.map((item, i) => renderItem(item, i))}
          {!loading && items === null && (
            <div style={{ fontSize: 12, color: '#f59e0b', padding: '4px 0' }}>Tooling API access required</div>
          )}
        </div>
      )}
    </div>
  );
}

const tdStyle = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };
const thStyle = { padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' };

export default function SidePanel({ node, onClose }) {
  const [tab, setTab] = useState('summary');
  const [fieldSearch, setFieldSearch] = useState('');
  const [objectInfo, setObjectInfo] = useState(undefined); // undefined=not yet fetched, null=failed

  useEffect(() => {
    setObjectInfo(undefined);
    axios.get(`/api/object-info/${node.name}`, { withCredentials: true })
      .then(r => setObjectInfo(r.data))
      .catch(() => setObjectInfo(null));
  }, [node.name]);

  const fields = node.fields || [];
  const stats = {
    total:      fields.length,
    custom:     fields.filter(f => f.name.endsWith('__c')).length,
    standard:   fields.filter(f => !f.name.endsWith('__c')).length,
    lookup:     fields.filter(f => f.type === 'reference').length,
    formula:    fields.filter(f => f.calculated).length,
    required:   fields.filter(f => f.required).length,
    encrypted:  fields.filter(f => f.encrypted).length,
    externalId: fields.filter(f => f.externalId).length,
    childRels:  (node.childRelationships || []).length,
    recTypes:   node.recordTypeCount || 0,
  };

  const filtered = fields.filter(f =>
    !fieldSearch ||
    f.name.toLowerCase().includes(fieldSearch.toLowerCase()) ||
    f.label.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  const infoLoading = objectInfo === undefined;
  const triggers = objectInfo?.triggers ?? null;
  const validationRules = objectInfo?.validationRules ?? null;

  return (
    <div style={{ width: 520, borderLeft: '1px solid #e2e8f0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #032D60 0%, #0070D2 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{node.label}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>API Name: {node.name}</div>
          <span style={{ marginTop: 6, display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.2)' }}>
            {node.cloudBadge}
          </span>
          {node.custom && (
            <span style={{ marginTop: 6, marginLeft: 6, display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,165,0,0.35)' }}>
              Custom Object
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 26, height: 26, fontSize: 16, cursor: 'pointer', color: 'white', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'fields',  label: `Fields (${fields.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? '#0070D2' : '#64748b',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #0070D2' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === 'summary' && (
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px' }}>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Field Breakdown</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            <StatCard label="Total Fields"    value={stats.total}     accent />
            <StatCard label="Custom Fields"   value={stats.custom}    accent={stats.custom > 0} />
            <StatCard label="Lookup / MD"     value={stats.lookup} />
            <StatCard label="Formula"         value={stats.formula} />
            <StatCard label="Required"        value={stats.required} />
            <StatCard label="External ID"     value={stats.externalId} />
            <StatCard label="Encrypted"       value={stats.encrypted} />
            <StatCard label="Child Relations" value={stats.childRels} />
            <StatCard label="Record Types"    value={stats.recTypes}  accent={stats.recTypes > 1} />
          </div>

          <MetadataList
            title="Apex Triggers"
            items={triggers}
            loading={infoLoading}
            emptyMsg="No Apex triggers on this object"
            renderItem={(t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 12, color: '#1e293b' }}>{t.Name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: t.Status === 'Active' ? '#dcfce7' : '#f1f5f9',
                  color: t.Status === 'Active' ? '#15803d' : '#64748b',
                }}>
                  {t.Status}
                </span>
              </div>
            )}
          />

          <MetadataList
            title="Validation Rules"
            items={validationRules}
            loading={infoLoading}
            emptyMsg="No validation rules on this object"
            renderItem={(vr, i) => {
              const name = vr.FullName?.split('.').pop() || vr.FullName;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#1e293b' }}>{name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    background: vr.Active ? '#dcfce7' : '#f1f5f9',
                    color: vr.Active ? '#15803d' : '#64748b',
                  }}>
                    {vr.Active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              );
            }}
          />

          {stats.recTypes > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 6 }}>
                Record Types ({stats.recTypes})
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {stats.recTypes} custom record type{stats.recTypes !== 1 ? 's' : ''} defined. Switch to Fields tab to see individual field assignments.
              </div>
            </div>
          )}

          {infoLoading && (
            <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>Analyzing for technical debt…</div>
          )}
          {!infoLoading && objectInfo && (
            <TechDebtSection node={node} objectInfo={objectInfo} />
          )}

        </div>
      )}

      {/* Fields tab */}
      {tab === 'fields' && (
        <>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <input
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Filter fields..."
              value={fieldSearch}
              onChange={e => setFieldSearch(e.target.value)}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>API Name</th>
                  <th style={thStyle}>Label</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Attributes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => <FieldRow key={f.name} field={f} />)}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No fields match</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
