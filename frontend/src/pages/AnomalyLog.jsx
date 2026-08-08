import React from 'react';

const AnomalyLog = () => {
  const anomalies = [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-card">
        <h3 className="panel-title">Isolation Forest Anomaly Log</h3>
        <p className="panel-subtitle">Outlier packets flagged by unsupervised Isolation Forest model</p>

        <table className="custom-table" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Header ID</th>
              <th>Device ID</th>
              <th>Timestamp</th>
              <th>Anomaly Score</th>
              <th>Description / Pattern</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((an) => (
              <tr key={an.id}>
                <td style={{ fontWeight: 700 }}>#{an.id}</td>
                <td style={{ fontWeight: 600, color: '#38bdf8' }}>Tag #{an.dev}</td>
                <td>{an.time}</td>
                <td style={{ color: '#ef4444', fontWeight: 700 }}>{an.score}</td>
                <td>{an.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnomalyLog;
