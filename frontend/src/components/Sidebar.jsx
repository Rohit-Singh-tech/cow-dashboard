import React, { useState, useEffect } from 'react';
import { getOverviewSummary, getDevices } from '../api';

const Sidebar = ({ viewMode, setViewMode, activeDeviceCount = 0, packetCount = 0, activeDevice = null, setActiveDevice }) => {
  const [alerts, setAlerts] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getOverviewSummary();
        if (data) {
          const totalAlerts = (data.abnormal_behaviour || 0) + (data.lameness_risk || 0) + (data.heat_stress_risk || 0);
          setAlerts(totalAlerts || 0);
        }
      } catch (err) {
        console.error("Sidebar summary fetch error:", err);
      }
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  const [connectedDevices, setConnectedDevices] = useState([]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devs = await getDevices();
        if (devs && Array.isArray(devs)) {
          setConnectedDevices(devs);
          if (!activeDevice && devs.length > 0 && setActiveDevice) {
            setActiveDevice(devs[0].id);
          }
        }
      } catch (err) {
        console.error("Sidebar devices fetch error:", err);
      }
    };
    fetchDevices();
    const devInterval = setInterval(fetchDevices, 15000);
    return () => clearInterval(devInterval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '⏱️' },
    { id: 'stage6-stats', label: 'Stage 6 Stats', icon: '📊' },
    { id: 'ema-trends', label: 'EMA Trends', icon: '📉' },
    { id: 'ml-pipeline', label: 'ML Pipeline', icon: '🧠' },
    { id: 'animals', label: 'Animals', icon: '🐄' },
    { id: 'anomaly-log', label: 'Anomaly Log', icon: '⚠️' },
    { id: 'ble-raw', label: 'BLE Raw Data', icon: '📡' },
    { id: 'compare', label: 'Compare', icon: '🔀' },
    { id: 'train-model', label: 'Train Model', icon: '🏋️' },
    { id: 'db-sync', label: 'DB Sync', icon: '🔄' },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <span className="brand-logo">🐄</span>
          <div>
            <h2 className="brand-title">SS-HCHMNet</h2>
            <div className="brand-subtitle">v3.0 - Unsupervised</div>
          </div>
        </div>

        <nav className="nav-group">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-link ${viewMode === item.id ? 'active' : ''}`}
              onClick={() => setViewMode(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="status-indicator" style={{ marginBottom: 12 }}>
          <div className="status-dot"></div>
          <span>BLE Stream Active</span>
        </div>

        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, marginBottom: 8, letterSpacing: '0.5px' }}>
          CONNECTED DEVICES ({connectedDevices.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {connectedDevices.map((dev) => (
            <div
              key={dev.id}
              onClick={() => {
                if (setActiveDevice) setActiveDevice(dev.id);
                setViewMode('dashboard');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 6,
                background: activeDevice === dev.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                border: activeDevice === dev.id ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: dev.status === 'online' ? '#10b981' : (dev.status === 'warning' ? '#f59e0b' : '#ef4444'),
                  boxShadow: dev.status === 'online' ? '0 0 6px #10b981' : '0 0 6px #f59e0b'
                }}></span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: activeDevice === dev.id ? '#38bdf8' : '#f8fafc' }}>
                    {dev.name}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>
                    {dev.mac}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{dev.rssi}</span>
            </div>
          ))}
        </div>

        <div className="dev-counters">
          <div>
            <span className="counter-num">{packetCount}</span>
            <span>Packets</span>
          </div>
          <div>
            <span className="counter-num">{packetCount}</span>
            <span>Windows</span>
          </div>
          <div
            onClick={() => setViewMode('anomaly-log')}
            title="Click to view Anomaly Log"
            style={{ cursor: 'pointer' }}
          >
            <span className="counter-num" style={{ color: '#ef4444' }}>{alerts}</span>
            <span>{alerts === 1 ? 'Alert' : 'Alerts'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

