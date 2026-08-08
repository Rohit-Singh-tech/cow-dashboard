import React, { useState, useEffect } from 'react';
import { getMLModelInfo, retrainMLModel, downloadSampleTemplate } from '../api';

export default function MLModelCenter() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [retrainResult, setRetrainResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModelDetails();
  }, []);

  const fetchModelDetails = async () => {
    setLoading(true);
    try {
      const data = await getMLModelInfo();
      setModelInfo(data);
    } catch (err) {
      console.error('Failed to fetch ML model details:', err);
      setError('Could not connect to ML backend service. Verify backend URL in settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setRetrainResult(null);
      setError(null);
    }
  };

  const handleRetrainSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a valid CSV dataset file first.');
      return;
    }

    setRetraining(true);
    setError(null);
    setRetrainResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const result = await retrainMLModel(formData);
      setRetrainResult(result);
      fetchModelDetails();
    } catch (err) {
      console.error('Retraining error:', err);
      setError(err.response?.data?.detail || 'Failed to retrain ML model.');
    } finally {
      setRetraining(false);
    }
  };

  const info = modelInfo?.training_info || {};

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 18, 30, 0.95), rgba(15, 23, 42, 0.98))',
        padding: '28px 32px',
        borderRadius: '16px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>🧠</span>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px' }}>
              Deep Learning Model Management & Retrainer
            </h1>
          </div>
          <p style={{ margin: '8px 0 0 0', color: '#94A3B8', fontSize: '0.92rem' }}>
            Evaluate PyTorch <strong>1D CNN + BiLSTM + Self-Attention Neural Network</strong> accuracy metrics & upload custom CSV datasets to retrain <code>cow_health_ml.pkl</code>.
          </p>
        </div>

        <div style={{
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          padding: '8px 16px',
          borderRadius: '24px',
          color: '#38BDF8',
          fontSize: '0.82rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 8px #38BDF8' }}></span>
          PyTorch 2.13.0 CPU Engine
        </div>
      </div>

      {loading && (
        <div style={{ padding: '60px', textAlign: 'center', color: '#38BDF8', fontSize: '1.1rem', fontWeight: 600 }}>
          ⚡ Loading PyTorch Deep Learning Model metadata...
        </div>
      )}

      {!loading && modelInfo && (
        <>
          {/* 2. TOP 4 METRICS CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            <div style={{ background: 'rgba(13, 18, 30, 0.85)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>MODEL STATUS</span>
              <h2 style={{ margin: '8px 0 0 0', color: '#10B981', fontSize: '1.5rem', fontWeight: 800 }}>
                {modelInfo.status === 'ready' ? '✅ Ready / Active' : '⚠️ Not Trained'}
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#CBD5E1' }}>
                Pickle File: <code>cow_health_ml.pkl</code>
              </p>
            </div>

            <div style={{ background: 'rgba(13, 18, 30, 0.85)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>ARCHITECTURE</span>
              <h2 style={{ margin: '8px 0 0 0', color: '#38BDF8', fontSize: '1.2rem', fontWeight: 800 }}>
                1D CNN + BiLSTM + Attention
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
                Deep Neural Network (240 Inputs)
              </p>
            </div>

            <div style={{ background: 'rgba(13, 18, 30, 0.85)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>MODEL ACCURACY</span>
              <h2 style={{ margin: '8px 0 0 0', color: '#A855F7', fontSize: '1.8rem', fontWeight: 800 }}>
                {info.accuracy ? `${(info.accuracy * 100).toFixed(2)}%` : 'N/A'}
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
                High-precision multi-class classifier
              </p>
            </div>

            <div style={{ background: 'rgba(13, 18, 30, 0.85)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>TRAINING WINDOW COUNT</span>
              <h2 style={{ margin: '8px 0 0 0', color: '#F59E0B', fontSize: '1.8rem', fontWeight: 800 }}>
                {info.sample_count || 0} <span style={{ fontSize: '0.9rem', color: '#94A3B8', fontWeight: 600 }}>windows</span>
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
                1.93M sensor points evaluated
              </p>
            </div>

          </div>

          {/* 3. NEURAL NETWORK PIPELINE ARCHITECTURE SPECIFICATION */}
          <div style={{ background: 'rgba(13, 18, 30, 0.85)', padding: '28px', borderRadius: '16px', border: '1px solid rgba(35, 48, 72, 0.6)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', fontWeight: 800, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚙️</span> PyTorch Neural Network Pipeline Layers
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(10, 14, 25, 0.9)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', marginBottom: '4px' }}>STAGE 1 · FEATURE EXTRACTION</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>1D Convolutional Net (Conv1D)</div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', lineHeight: '1.4' }}>
                  2 Conv1D layers (3 → 32 → 64 filters) with BatchNorm1D, ReLU & Dropout extracting local spatial micro-movement patterns from AccX, AccY, AccZ.
                </p>
              </div>

              <div style={{ background: 'rgba(10, 14, 25, 0.9)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A855F7', textTransform: 'uppercase', marginBottom: '4px' }}>STAGE 2 · TEMPORAL HORIZON</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>Bidirectional LSTM (BiLSTM)</div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', lineHeight: '1.4' }}>
                  2-layer BiLSTM (Hidden Dim = 64, Output Dim = 128) modeling sequence dependencies and movement progression across the 8-second time horizon.
                </p>
              </div>

              <div style={{ background: 'rgba(10, 14, 25, 0.9)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EC4899', textTransform: 'uppercase', marginBottom: '4px' }}>STAGE 3 · FOCUS ATTENTION</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#EC4899', marginBottom: '6px' }}>Self-Attention Mechanism</div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', lineHeight: '1.4' }}>
                  Computes 80-sample temporal attention weights α_t = softmax(W · tanh(W_h h_t)) to focus on peak activity intervals within each packet window.
                </p>
              </div>

              <div style={{ background: 'rgba(10, 14, 25, 0.9)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', marginBottom: '4px' }}>STAGE 4 · MULTI-CLASS PROBABILITY</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>Dense Softmax Classifier</div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', lineHeight: '1.4' }}>
                  Linear(128 → 64) → Dropout → Softmax generating prediction probability distribution across 9 livestock behavior target classes.
                </p>
              </div>
            </div>
          </div>

          {/* 4. SUPPORTED PRIMARY PREDICTION TARGET LABELS */}
          <div style={{ background: 'rgba(13, 18, 30, 0.85)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(35, 48, 72, 0.6)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span> Supported Primary Behavior Target Labels
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {[
                { label: 'Grazing', icon: '🌱' },
                { label: 'Walking', icon: '🚶' },
                { label: 'Running', icon: '🏃' },
                { label: 'Resting', icon: '💤' },
                { label: 'Lying', icon: '🐄' },
                { label: 'Drinking', icon: '🚰' },
                { label: 'Ruminating', icon: '🌾' },
                { label: 'Heat Stress Risk', icon: '🌡️' },
                { label: 'Unknown', icon: '❓' }
              ].map(({ label, icon }) => (
                <span key={label} style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: 'rgba(10, 14, 25, 0.9)',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{icon}</span> {label}
                </span>
              ))}
            </div>
          </div>

          {/* 5. DATASET RETRAINING STUDIO */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(10, 14, 25, 0.95), rgba(13, 18, 30, 0.95))',
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📤</span> Upload CSV Dataset to Retrain Model
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '0.88rem' }}>
                  Upload custom CSV telemetry containing sequence windows and behavior labels.
                </p>
              </div>

              <button
                onClick={downloadSampleTemplate}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                📥 Download CSV Template
              </button>
            </div>

            <form onSubmit={handleRetrainSubmit}>
              <div style={{
                border: '2px dashed rgba(56, 189, 248, 0.4)',
                padding: '36px 24px',
                borderRadius: '14px',
                textAlign: 'center',
                background: 'rgba(8, 12, 20, 0.7)',
                marginBottom: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} id="csv-upload-input" />
                <label htmlFor="csv-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>📂</div>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38BDF8' }}>
                    {selectedFile ? `Selected File: ${selectedFile.name}` : 'Click or Drag & Drop CSV dataset file here'}
                  </span>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    Supports 80-sample sequence telemetry files (e.g., heat data.csv, activity.xlsx format)
                  </p>
                </label>
              </div>

              {error && (
                <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#FCA5A5', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
                  ❌ {error}
                </div>
              )}

              {retrainResult && (
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#6EE7B7', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>🎉 {retrainResult.message}</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    New Model Accuracy: <strong>{(retrainResult.report?.accuracy * 100).toFixed(2)}%</strong> | Total Trained Windows: <strong>{retrainResult.report?.sample_count}</strong>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedFile || retraining}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '10px',
                  background: retraining ? '#334155' : 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  cursor: (selectedFile && !retraining) ? 'pointer' : 'not-allowed',
                  boxShadow: retraining ? 'none' : '0 4px 20px rgba(16, 185, 129, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                {retraining ? '⚡ Retraining PyTorch Neural Net & Updating Pickle File...' : '🚀 Retrain Model & Save Pickle (cow_health_ml.pkl)'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}





