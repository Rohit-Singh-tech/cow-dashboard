import React, { useState, useEffect } from 'react';
import api, { downloadLabeledCsvExport } from '../api';

export default function LabeledDataExport() {
  const [deviceFilter, setDeviceFilter] = useState('All');
  const [deviceOptions, setDeviceOptions] = useState(['All']);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDeviceOptions();
  }, []);

  const fetchDeviceOptions = async () => {
    try {
      const res = await api.get('/api/packets/datalogger/processed', { params: { limit: 100 } });
      const items = res.data.records || [];
      const devIds = Array.from(new Set(items.map(r => String(r.device_id))));
      setDeviceOptions(['All', ...devIds]);
    } catch (err) {
      console.warn('Using default device filter list:', err);
      setDeviceOptions(['All', '11', '42', '89', '93', '248']);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, [deviceFilter]);

  const loadPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/packets/datalogger/processed', {
        params: {
          deviceId: deviceFilter === 'All' ? undefined : deviceFilter,
          limit: 50,
          include_points: true
        }
      });

      const headers = res.data.records || [];
      const previewRows = headers.map(h => ({
        id: h.id,
        timestamp: h.timestamp,
        device_id: h.device_id,
        packet_id_num: h.packet_id_num,
        points_count: h.points ? h.points.length : 0
      }));

      setRecords(previewRows);
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError('Could not fetch database telemetry preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      await downloadLabeledCsvExport({
        deviceId: deviceFilter === 'All' ? undefined : deviceFilter,
        limit: 500
      });
    } catch (err) {
      alert('Failed to download labeled CSV. Please verify backend connection.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
        padding: '24px 32px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#F1F5F9' }}>
            📊 Labeled CSV Dataset Exporter
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#94A3B8', fontSize: '0.95rem' }}>
            Export machine-learning labeled telemetry generated from hosted Render DB records.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          disabled={downloading}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: downloading ? 'not-allowed' : 'pointer'
          }}
        >
          {downloading ? '⏳ Generating CSV...' : '📥 Download Labeled CSV'}
        </button>
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '20px 24px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label style={{ fontWeight: 600, color: '#CBD5E1' }}>Filter by Cow Tag:</label>
        <select
          value={deviceFilter}
          onChange={(e) => setDeviceFilter(e.target.value)}
          style={{ padding: '8px 16px', borderRadius: '8px', background: '#0F172A', color: '#38BDF8', border: '1px solid #334155', fontWeight: 600 }}
        >
          {deviceOptions.map(opt => (
            <option key={opt} value={opt}>{opt === 'All' ? 'All Devices' : `Tag #${opt}`}</option>
          ))}
        </select>
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.7)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#F1F5F9' }}>
          Render Database Records Preview ({records.length} items)
        </h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#38BDF8' }}>Fetching DB records...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                  <th style={{ padding: '12px' }}>Packet ID</th>
                  <th style={{ padding: '12px' }}>Device ID</th>
                  <th style={{ padding: '12px' }}>Sequence #</th>
                  <th style={{ padding: '12px' }}>Timestamp UTC</th>
                  <th style={{ padding: '12px' }}>Samples Count</th>
                  <th style={{ padding: '12px' }}>ML Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>#{row.id}</td>
                    <td style={{ padding: '12px', color: '#38BDF8' }}>Tag #{row.device_id}</td>
                    <td style={{ padding: '12px', color: '#CBD5E1' }}>{row.packet_id_num}</td>
                    <td style={{ padding: '12px', color: '#94A3B8' }}>
                      {row.timestamp ? new Date(row.timestamp).toUTCString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px' }}>{row.points_count} points</td>
                    <td style={{ padding: '12px', color: '#10B981', fontWeight: 600 }}>Ready for Export</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
