import React from 'react';

const CompareView = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-card">
        <h3 className="panel-title">Multi-Animal Side-by-Side Behavior Comparison</h3>
        <p className="panel-subtitle">Compare activity energy & rest ratios between multiple livestock tags</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, color: '#38bdf8' }}>Tag (Awaiting Data)</h4>
            <div style={{ marginTop: 10, fontSize: '0.85rem' }}>Primary Activity: <strong style={{ color: '#94a3b8' }}>N/A</strong></div>
            <div style={{ fontSize: '0.85rem' }}>Motion Energy: 0.0</div>
            <div style={{ fontSize: '0.85rem' }}>Rest Ratio: 0%</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: 0, color: '#38bdf8' }}>Tag (Awaiting Data)</h4>
            <div style={{ marginTop: 10, fontSize: '0.85rem' }}>Primary Activity: <strong style={{ color: '#94a3b8' }}>N/A</strong></div>
            <div style={{ fontSize: '0.85rem' }}>Motion Energy: 0.0</div>
            <div style={{ fontSize: '0.85rem' }}>Rest Ratio: 0%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareView;
