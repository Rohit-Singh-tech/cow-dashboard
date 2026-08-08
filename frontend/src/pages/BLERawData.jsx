import React from 'react';

const BLERawData = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-card">
        <h3 className="panel-title">BLE Telemetry Raw Data Stream</h3>
        <p className="panel-subtitle">Bluetooth Low Energy packet hex payloads and raw 80-sample point arrays</p>

        <div style={{ marginTop: 16, background: '#050811', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: '0.82rem', border: '1px solid var(--border-color)', color: '#10b981' }}>
          <div>Awaiting live BLE telemetry...</div>
          <div style={{ color: '#94a3b8', marginTop: 4 }}>Sample Points: (0 XYZ tuples)</div>
        </div>
      </div>
    </div>
  );
};

export default BLERawData;
