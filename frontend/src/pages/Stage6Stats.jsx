import React from 'react';

const Stage6Stats = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-card">
        <h3 className="panel-title">Stage 6 Feature Extraction & Spectral Energy Statistics</h3>
        <p className="panel-subtitle">Multi-axis Fast Fourier Transform (FFT) & Time-domain Feature Distributions</p>
        
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AccX Spectral Energy</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>0 Hz</div>
            <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Dominant peak freq</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AccY Peak-to-Peak</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>0 m/s²</div>
            <div style={{ fontSize: '0.72rem', color: '#10b981' }}>Maximum range</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AccZ Zero-Crossing Rate</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7' }}>0 ZC/win</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Cadence rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage6Stats;
