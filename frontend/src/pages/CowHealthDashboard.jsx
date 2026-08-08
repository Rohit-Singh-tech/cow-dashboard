import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import {
  predictDeviceHealth,
  getOverviewSummary,
  getBehaviorClusterMap,
  getDailyProfile,
  getAnomalyTrend,
  getAutoencoderReconstruction,
  getDailyFeatureRadar,
  getDecisionMatrix,
  reloadDatabaseTelemetry
} from '../api';


const CowHealthDashboard = ({ activeDevice = '11' }) => {
  const getAnimalName = (devId) => {
    switch (String(devId)) {
      case '11': return 'Cow Tag #11';
      case '42': return 'Cow Tag #42';
      case '89': return 'Cow Tag #89';
      case '93': return 'Cow Tag #93';
      case '248': return 'Cow Tag #248';
      default: return `Cow Tag #${devId}`;
    }
  };

  const currentAnimalName = getAnimalName(activeDevice);
  const [summary, setSummary] = useState({
    healthy_animals: 0,
    abnormal_behaviour: 0,
    lameness_risk: 0,
    heat_stress_risk: 0,
    packets_today: 0,
    avg_anomaly_score: 0.0
  });

  const [deviceData, setDeviceData] = useState(null);
  const [clusterData, setClusterData] = useState([]);
  const [dailyProfile, setDailyProfile] = useState([]);
  const [anomalyTrend, setAnomalyTrend] = useState([]);

  // Autoencoder Waveform Initial State Fallback
  const [autoencoderData, setAutoencoderData] = useState({ mse: 0, chartData: [] });

  // Daily Feature Radar Initial State Fallback
  const [radarData, setRadarData] = useState([]);

  // Decision Engine Table Initial State Fallback
  const [decisionMatrix, setDecisionMatrix] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [
        sumRes,
        devRes,
        clusterRes,
        profileRes,
        trendRes,
        reconRes,
        radarRes,
        matrixRes
      ] = await Promise.all([
        getOverviewSummary().catch(() => null),
        predictDeviceHealth(activeDevice, 30).catch(() => null),
        getBehaviorClusterMap().catch(() => null),
        getDailyProfile(activeDevice).catch(() => null),
        getAnomalyTrend().catch(() => null),
        getAutoencoderReconstruction(1).catch(() => null),
        getDailyFeatureRadar(activeDevice).catch(() => null),
        getDecisionMatrix().catch(() => null)
      ]);

      if (sumRes) setSummary(sumRes);
      if (devRes) setDeviceData(devRes);
      if (clusterRes?.cluster_points) setClusterData(clusterRes.cluster_points);
      if (profileRes?.hourly_profile) setDailyProfile(profileRes.hourly_profile);
      if (trendRes?.trend) setAnomalyTrend(trendRes.trend);

      if (reconRes?.original?.x && Array.isArray(reconRes.original.x)) {
        const points = reconRes.original.x.map((val, i) => ({
          idx: i,
          original: val,
          reconstructed: reconRes.reconstructed?.x?.[i] ?? val
        }));
        setAutoencoderData({ mse: reconRes.mse || 0.0284, chartData: points });
      }

      if (radarRes?.animal && Array.isArray(radarRes.animal)) {
        const merged = radarRes.animal.map((item, idx) => ({
          subject: item.subject,
          Animal: item.value,
          Benchmark: radarRes.normal_benchmark?.[idx]?.value || 50
        }));
        setRadarData(merged);
      }

      if (matrixRes?.decision_matrix && Array.isArray(matrixRes.decision_matrix) && matrixRes.decision_matrix.length > 0) {
        setDecisionMatrix(matrixRes.decision_matrix);
      }
    } catch (err) {
      console.error('Error fetching dashboard analytics in parallel:', err);
    } finally {
      setLoading(false);
      setLastRefreshedTime(new Date().toTimeString().split(' ')[0]);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reloadDatabaseTelemetry().catch(() => null);
      await fetchDashboardData();
    } catch (err) {
      console.error('Error reloading data from hosted database:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  };




  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [activeDevice]);

  const getStreamChartData = () => {
    // If deviceData?.live_telemetry exists, we can use it.
    // Otherwise return empty array.
    if (!deviceData || !deviceData.live_telemetry) return [];
    return deviceData.live_telemetry;
  };

  const streamChartData = getStreamChartData();

  const getClusterColor = (behavior) => {
    switch (behavior) {
      case 'Grazing': return '#10b981';
      case 'Walking': return '#3b82f6';
      case 'Resting': return '#a855f7';
      case 'Standing': return '#f59e0b';
      case 'Lying': return '#ec4899';
      default: return '#ef4444';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. TOP 6 KPI METRIC CARDS ROW */}
      <div className="kpi-grid">
        <div className="kpi-card green">
          <div className="kpi-top">
            <span className="kpi-icon">✓</span>
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Active</span>
          </div>
          <div className="kpi-value">{summary.healthy_animals}</div>
          <div className="kpi-label">Healthy Animals</div>
          <div className="kpi-subtext">Normal range</div>
        </div>

        <div className="kpi-card yellow">
          <div className="kpi-top">
            <span className="kpi-icon">⚠️</span>
            <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>Alert</span>
          </div>
          <div className="kpi-value">{summary.abnormal_behaviour}</div>
          <div className="kpi-label">Abnormal Behaviour</div>
          <div className="kpi-subtext">Requires review</div>
        </div>

        <div className="kpi-card pink">
          <div className="kpi-top">
            <span className="kpi-icon">🦵</span>
            <span style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: 700 }}>Risk</span>
          </div>
          <div className="kpi-value">{summary.lameness_risk}</div>
          <div className="kpi-label">Lameness Risk</div>
          <div className="kpi-subtext">Gait monitoring</div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-top">
            <span className="kpi-icon">🌡️</span>
            <span style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 700 }}>Thermal</span>
          </div>
          <div className="kpi-value">{summary.heat_stress_risk}</div>
          <div className="kpi-label">Heat Stress Risk</div>
          <div className="kpi-subtext">Environmental</div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-top">
            <span className="kpi-icon">📦</span>
            <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 700 }}>Telemetry</span>
          </div>
          <div className="kpi-value">{summary.packets_today}</div>
          <div className="kpi-label">Packets Today</div>
          <div className="kpi-subtext">80-sample windows</div>
        </div>

        <div className="kpi-card cyan">
          <div className="kpi-top">
            <span className="kpi-icon">🧠</span>
            <span style={{ fontSize: '0.72rem', color: '#06b6d4', fontWeight: 700 }}>Isolation</span>
          </div>
          <div className="kpi-value">{summary.avg_anomaly_score}</div>
          <div className="kpi-label">Avg Anomaly Score</div>
          <div className="kpi-subtext">Low risk index</div>
        </div>
      </div>

      {/* 2. UPPER MAIN GRID ROW: Live Accelerometer Stream + Behaviour Cluster Map */}
      <div className="dashboard-row">
        {/* Live Accelerometer Stream */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Live Accelerometer Stream ({currentAnimalName})</h3>
              <div className="panel-subtitle">X Y Z axes + Vector Magnitude · 80-sample window · 10 Hz</div>
            </div>
            <div className="legend-group">
              <div className="legend-item"><span className="legend-dot" style={{ background: '#06b6d4' }}></span>AccX</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }}></span>AccY</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }}></span>AccZ</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#ec4899' }}></span>Vector Mag</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streamChartData}>
                <XAxis dataKey="sample" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} domain={[-10, 12]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="AccX" stroke="#06b6d4" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="AccY" stroke="#10b981" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="AccZ" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="Magnitude" stroke="#ec4899" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Behaviour Cluster Map */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Behaviour Cluster Map</h3>
              <div className="panel-subtitle">HDBSCAN · Latent space</div>
            </div>
          </div>
          <div className="legend-group" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }}></span>Grazing</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }}></span>Walking</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#a855f7' }}></span>Resting</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }}></span>Standing</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }}></span>Anomaly</div>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <XAxis type="number" dataKey="x" name="Latent X" stroke="#475569" fontSize={10} domain={[-5, 5]} />
                <YAxis type="number" dataKey="y" name="Latent Y" stroke="#475569" fontSize={10} domain={[-5, 5]} />
                <ZAxis range={[40, 40]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Scatter data={clusterData} fill="#3b82f6">
                  {clusterData.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={getClusterColor(entry.behavior)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE GRID ROW: Daily Behaviour Profile + 7-Day Anomaly Trend + Health Risk Gauge */}
      <div className="dashboard-row-3">
        {/* Daily Behaviour Profile */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Daily Behaviour Profile</h3>
              <div className="panel-subtitle">Hourly activity · {currentAnimalName}</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyProfile.slice(0, 12)}>
                <XAxis dataKey="hour" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="Grazing" stackId="a" fill="#10b981" />
                <Bar dataKey="Resting" stackId="a" fill="#a855f7" />
                <Bar dataKey="Walking" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Standing" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Anomaly Score Trend */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">7-Day Anomaly Score Trend</h3>
              <div className="panel-subtitle">Isolation Forest · All animals</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={anomalyTrend}>
                <XAxis dataKey="day" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} domain={[0, 0.5]} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="anomaly_score" stroke="#38bdf8" fill="rgba(56, 189, 248, 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health Risk Gauge */}
        <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 className="panel-title" style={{ alignSelf: 'flex-start', marginBottom: 4 }}>Health Risk Gauge</h3>
          <div className="panel-subtitle" style={{ alignSelf: 'flex-start', marginBottom: 16 }}>{currentAnimalName}</div>

          <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="140" height="140" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="10" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="#10b981"
                strokeWidth="10"
                fill="none"
                strokeDasharray="264"
                strokeDashoffset="240"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>0%</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Risk Score</div>
            </div>
          </div>

          <div style={{ marginTop: 16, width: '100%' }}>
            <button
              style={{
                width: '100%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚠️ Status: Low Risk
            </button>
          </div>
        </div>
      </div>

      {/* 4. LOWER GRID ROW: Autoencoder Reconstruction + Daily Feature Radar */}
      <div className="dashboard-row">
        {/* Autoencoder Reconstruction */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Autoencoder Reconstruction</h3>
              <div className="panel-subtitle">CNN+BiLSTM · Original vs Reconstructed · MSE loss</div>
            </div>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
              MSE: {autoencoderData.mse}
            </div>
          </div>
          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={autoencoderData.chartData}>
                <XAxis dataKey="idx" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="original" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="Original Signal" />
                <Line type="monotone" dataKey="reconstructed" stroke="#ec4899" dot={false} strokeDasharray="3 3" strokeWidth={1.5} name="Reconstructed Wave" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Feature Radar */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Daily Feature Radar</h3>
              <div className="panel-subtitle">{currentAnimalName} vs Normal Benchmark</div>
            </div>
          </div>
          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} />
                <PolarRadiusAxis stroke="#334155" fontSize={8} />
                <Radar name="Animal" dataKey="Animal" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} />
                <Radar name="Benchmark" dataKey="Benchmark" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM GRID TABLE: Health Risk Decision Engine — All Animals */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Health Risk Decision Engine — All Animals</h3>
            <div className="panel-subtitle">
              Multi-feature behavioral anomaly aggregation
              {lastRefreshedTime && (
                <span style={{ marginLeft: 10, color: '#38bdf8', fontSize: '0.72rem', fontWeight: 600 }}>
                  • Updated at {lastRefreshedTime}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Click to re-fetch latest livestock telemetry & ML predictions"
            style={{
              background: isRefreshing ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isRefreshing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)'
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: isRefreshing ? 'rotate(360deg)' : 'none',
              transition: isRefreshing ? 'transform 0.8s linear' : 'transform 0.2s ease'
            }}>🔄</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>


        <table className="custom-table">
          <thead>
            <tr>
              <th>Animal</th>
              <th>Motion Energy</th>
              <th>Rest Ratio</th>
              <th>Activity Index</th>
              <th>Night Activity</th>
              <th>Anomaly Score</th>
              <th>Cluster</th>
              <th>Status</th>
              <th>Alert</th>
            </tr>
          </thead>
          <tbody>
            {decisionMatrix.map((row, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 700, color: '#f8fafc' }}>{row.animal}</td>
                <td>{row.motion_energy}</td>
                <td>{row.rest_ratio}%</td>
                <td>{row.activity_index}</td>
                <td>{row.night_activity}</td>
                <td style={{ fontWeight: 600, color: row.anomaly_score > 0.3 ? '#ef4444' : '#10b981' }}>{row.anomaly_score}</td>
                <td>{row.cluster}</td>
                <td>
                  <span className={`status-badge ${row.status === 'Healthy' ? 'healthy' : 'risk'}`}>
                    {row.status}
                  </span>
                </td>
                <td style={{ color: row.alert === 'Normal' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{row.alert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CowHealthDashboard;
