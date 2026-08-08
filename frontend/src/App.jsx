import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';

import CowHealthDashboard from './pages/CowHealthDashboard';
import Stage6Stats from './pages/Stage6Stats';
import EMATrends from './pages/EMATrends';
import MLPipelineView from './pages/MLPipelineView';
import AnimalsView from './pages/AnimalsView';
import AnomalyLog from './pages/AnomalyLog';
import BLERawData from './pages/BLERawData';
import CompareView from './pages/CompareView';
import MLModelCenter from './pages/MLModelCenter';
import Settings from './pages/Settings';
import { getDevices, getOverviewSummary } from './api';

import './App.css';

export default function App() {
  const [viewMode, setViewMode] = useState('dashboard');
  const [activeDevice, setActiveDevice] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [totalPackets, setTotalPackets] = useState(0);

  useEffect(() => {
    const fetchAppGlobals = async () => {
      try {
        const devs = await getDevices();
        if (devs && Array.isArray(devs)) {
          setConnectedDevices(devs);
          if (!activeDevice && devs.length > 0) {
            setActiveDevice(devs[0].id);
          }
        }
        const sumData = await getOverviewSummary();
        if (sumData) {
          setTotalPackets(sumData.packets_today || 0);
        }
      } catch (err) {}
    };
    fetchAppGlobals();
    const interval = setInterval(fetchAppGlobals, 15000);
    return () => clearInterval(interval);
  }, [activeDevice]);

  const getPageTitle = () => {
    switch (viewMode) {
      case 'dashboard': return 'Dashboard Overview';
      case 'stage6-stats': return 'Stage 6 Feature Stats';
      case 'ema-trends': return 'EMA Activity Trends';
      case 'ml-pipeline': return 'ML Pipeline Engine';
      case 'animals': return 'Monitored Animals Directory';
      case 'anomaly-log': return 'Isolation Forest Anomaly Log';
      case 'ble-raw': return 'BLE Telemetry Stream';
      case 'compare': return 'Multi-Animal Compare';
      case 'train-model': return 'Train Model Center';
      case 'db-sync': return 'Database Sync & Settings';
      default: return 'Dashboard Overview';
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar viewMode={viewMode} setViewMode={setViewMode} activeDevice={activeDevice} setActiveDevice={setActiveDevice} packetCount={totalPackets} connectedDevices={connectedDevices} />
      
      <div className="main-layout">
        <HeaderBar
          title={getPageTitle()}
          activeDevice={activeDevice}
          setActiveDevice={viewMode === 'dashboard' ? setActiveDevice : null}
          devices={connectedDevices.map(d => d.id)}
        />
        
        <div className="content-body">
          {viewMode === 'dashboard' && <CowHealthDashboard activeDevice={activeDevice} />}
          {viewMode === 'stage6-stats' && <Stage6Stats />}
          {viewMode === 'ema-trends' && <EMATrends />}
          {viewMode === 'ml-pipeline' && <MLPipelineView />}
          {viewMode === 'animals' && <AnimalsView setActiveDevice={(dev) => { setActiveDevice(dev); setViewMode('dashboard'); }} />}
          {viewMode === 'anomaly-log' && <AnomalyLog />}
          {viewMode === 'ble-raw' && <BLERawData />}
          {viewMode === 'compare' && <CompareView />}
          {viewMode === 'train-model' && <MLModelCenter />}
          {viewMode === 'db-sync' && <Settings />}
        </div>
      </div>
    </div>
  );
}
