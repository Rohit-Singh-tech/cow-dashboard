import React, { useEffect, useState } from 'react';
import { fetchDecisionEngine } from '../api';

const AnimalsView = ({ setActiveDevice }) => {
  const [animals, setAnimals] = useState([]);

  useEffect(() => {
    fetchDecisionEngine().then((data) => {
      const list = data?.decision_matrix || (Array.isArray(data) ? data : []);
      if (list.length > 0) {
        setAnimals(list.map(item => ({
          dev: String(item.device_id),
          name: `Cow Tag #${item.device_id}`,
          breed: 'Holstein-Friesian',
          loc: 'Barn Section A',
          status: item.status || item.health_status || 'Healthy'
        })));
      }
    }).catch(err => console.error("Error loading animal health directory:", err));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-card">
        <h3 className="panel-title">Monitored Animals & BLE Tag Directory</h3>
        <p className="panel-subtitle">Active livestock tag registry and real-time health profiles</p>

        <table className="custom-table" style={{ marginTop: 16 }}>
          <thead>
            <tr>
              <th>Device Tag ID</th>
              <th>Animal Identifier</th>
              <th>Breed</th>
              <th>Location</th>
              <th>Current Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {animals.map((a) => (
              <tr key={a.dev}>
                <td style={{ fontWeight: 700, color: '#38bdf8' }}>Tag #{a.dev}</td>
                <td style={{ fontWeight: 600, color: '#f8fafc' }}>{a.name}</td>
                <td>{a.breed}</td>
                <td>{a.loc}</td>
                <td>
                  <span className={`status-badge ${(a.status === 'Healthy' || a.status === 'Normal') ? 'healthy' : 'risk'}`}>
                    {a.status}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => setActiveDevice && setActiveDevice(a.dev)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View Health Dashboard ➔
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnimalsView;
