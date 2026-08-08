import React, { useState } from 'react';
import { getStoredBaseUrl, setStoredBaseUrl } from '../api';

export default function Settings() {
  const [backendUrl, setBackendUrlInput] = useState(getStoredBaseUrl());
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveBackendUrl = (e) => {
    e.preventDefault();
    if (backendUrl) {
      setStoredBaseUrl(backendUrl);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 4000);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glassmorphism" style={{ padding: '32px', borderRadius: '16px', border: '1px solid #38BDF8' }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🌐</span> FastAPI Backend Server Connection Settings
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '0.92rem', marginBottom: '24px' }}>
          Configure target URL for the FastAPI ML Backend service. Switch between Hosted Render Cloud Backend or Local Server.
        </p>

        <form onSubmit={handleSaveBackendUrl}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#CBD5E1' }}>FastAPI ML Backend URL</label>
            <input
              type="text"
              required
              placeholder="http://localhost:8000 or https://your-backend.onrender.com"
              value={backendUrl}
              onChange={(e) => setBackendUrlInput(e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                background: '#0F172A',
                color: '#38BDF8',
                border: '1px solid #334155',
                fontSize: '1rem',
                fontWeight: 600
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                const local = 'http://localhost:8000';
                setBackendUrlInput(local);
                setStoredBaseUrl(local);
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 4000);
              }}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#1E293B', color: '#38BDF8', border: '1px solid #38BDF8', cursor: 'pointer', fontWeight: 600 }}
            >
              Set Localhost (http://localhost:8000)
            </button>

            <button
              type="button"
              onClick={() => {
                const renderUrl = 'https://ble-sense-rqnu.onrender.com';
                setBackendUrlInput(renderUrl);
                setStoredBaseUrl(renderUrl);
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 4000);
              }}
              style={{ padding: '8px 16px', borderRadius: '8px', background: '#1E293B', color: '#10B981', border: '1px solid #10B981', cursor: 'pointer', fontWeight: 600 }}
            >
              Set Hosted Render Cloud
            </button>
          </div>

          {savedNotice && (
            <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7', marginBottom: '20px' }}>
              ✅ Target ML Backend URL saved: <strong>{getStoredBaseUrl()}</strong>
            </div>
          )}

          <button
            type="submit"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0EA5E9, #2563EB)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Save Target Backend URL
          </button>
        </form>
      </div>
    </div>
  );
}
