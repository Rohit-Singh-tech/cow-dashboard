import React, { useState, useEffect } from 'react';
import { getMLModelInfo } from '../api';

const MLPipelineView = () => {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getMLModelInfo().then(setInfo).catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-card">
        <h3 className="panel-title">SS-HCHMNet ML Pipeline Architecture</h3>
        <p className="panel-subtitle">PyTorch 1D CNN + BiLSTM + Self-Attention Neural Network + Isolation Forest Outlier Detection</p>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: 14, borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>Model Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
              {info?.status === 'ready' ? 'READY & ACTIVE' : 'INITIALIZING'}
            </div>
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: 14, borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Trained Accuracy</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
              {info?.training_info?.accuracy ? `${(info.training_info.accuracy * 100).toFixed(2)}%` : 'N/A'}
            </div>
          </div>
          <div style={{ background: 'rgba(168, 85, 247, 0.08)', padding: 14, borderRadius: 8, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 700 }}>Window Size</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>80 Samples (8s)</div>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: 14, borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>Primary Targets</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>8 Behaviors</div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: '0.9rem', color: '#f8fafc', marginBottom: 10 }}>Supported Primary Behavior Target Labels</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(info?.primary_labels || ['Standing', 'Walking', 'Running', 'Grazing', 'Resting', 'Lying', 'Drinking', 'Ruminating']).map((lbl) => (
              <span key={lbl} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem' }}>
                🏷️ {lbl}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLPipelineView;
