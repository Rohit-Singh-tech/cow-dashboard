import React, { useState, useEffect } from 'react';
import { downloadLabeledCsvExport, getOverviewSummary } from '../api';

const HeaderBar = ({ title = 'Dashboard Overview', activeDevice, setActiveDevice, devices = [] }) => {
  const [timeStr, setTimeStr] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertsList, setAlertsList] = useState([]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const [isHeaderRefreshing, setIsHeaderRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      const data = await getOverviewSummary();
      if (data) {
        const totalAlerts = (data.abnormal_behaviour || 0) + (data.lameness_risk || 0) + (data.heat_stress_risk || 0);
        setAlertCount(totalAlerts || 0);
      }
    } catch (err) {
      console.error("Failed to fetch alert summary:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    const pollInterval = setInterval(fetchSummary, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleRefreshHeader = async () => {
    setIsHeaderRefreshing(true);
    await fetchSummary();
    setTimeout(() => {
      setIsHeaderRefreshing(false);
    }, 600);
  };

  const handleExportCSV = () => {
    downloadLabeledCsvExport({ device_id: activeDevice });
  };

  return (
    <>
      <header className="header-bar">
        <div className="header-left">
          <span style={{ fontSize: '1.1rem', color: '#94a3b8', cursor: 'pointer' }}>☰</span>
          <h1 className="page-title">{title}</h1>
          {setActiveDevice && (
            <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Select Animal:</span>
              <select
                value={activeDevice}
                onChange={(e) => setActiveDevice(e.target.value)}
                style={{
                  background: '#0e1526',
                  color: '#f8fafc',
                  border: '1px solid #233048',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {devices.map((dev) => (
                  <option key={dev} value={dev}>
                    Tag ID #{dev}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="header-right">
          <div className="pill-badge">
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            <span>BLE LIVE</span>
          </div>

          <div className="clock-display">{timeStr || '17:47:53'}</div>

          <div
            onClick={() => setShowAlertModal(true)}

            title="Click to view active alert details"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)'
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
            <span>{alertCount} {alertCount === 1 ? 'Alert' : 'Alerts'}</span>
          </div>

          <button className="btn-csv-export" onClick={handleExportCSV}>
            <span>⬇</span>
            <span>Export CSV</span>
          </button>
        </div>
      </header>


      {/* Interactive Alert Details Modal */}
      {showAlertModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 10, 20, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 14,
            width: '100%',
            maxWidth: 560,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.15)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(13, 21, 39, 0.9) 100%)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>🚨</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700 }}>
                    Active Livestock Health Alerts ({alertCount})
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#fca5a5' }}>
                    Real-time anomaly warnings flagged by SS-HCHMNet Isolation Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  borderRadius: 4
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, maxHeight: '65vh', overflowY: 'auto' }}>
              {alertsList.map((alert) => (
                <div key={alert.id} style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>
                          {alert.name}
                        </span>
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.25)',
                          color: '#fca5a5',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}>
                          {alert.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                        MAC: <code style={{ color: '#38bdf8' }}>{alert.mac}</code> | Tag ID: <strong>#{alert.id}</strong>
                      </div>
                    </div>
                    <span style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#f59e0b',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}>
                      {alert.severity} (Score: {alert.score})
                    </span>
                  </div>

                  <div style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                    borderLeft: '3px solid #ef4444',
                    marginBottom: 12,
                    lineHeight: 1.4
                  }}>
                    <strong>Diagnostic Note:</strong> {alert.details}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      ⏰ {alert.timestamp}
                    </span>
                    <button
                      onClick={() => {
                        if (setActiveDevice) setActiveDevice(alert.id);
                        setShowAlertModal(false);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                      }}
                    >
                      Inspect {alert.name} Dashboard ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              background: '#090f1e',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10
            }}>
              <button
                onClick={() => setShowAlertModal(false)}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '6px 16px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderBar;

