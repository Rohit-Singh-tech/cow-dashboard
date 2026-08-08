import axios from 'axios';

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cow-dashboard.onrender.com';

export const getStoredBaseUrl = () => {
  return localStorage.getItem('cow_ml_backend_url') || DEFAULT_BASE_URL;
};

export const setStoredBaseUrl = (url) => {
  if (url) {
    const formatted = url.trim().replace(/\/+$/, '');
    localStorage.setItem('cow_ml_backend_url', formatted);
    api.defaults.baseURL = formatted;
  }
};

const api = axios.create({
  baseURL: getStoredBaseUrl(),
});

api.interceptors.request.use(
  (config) => {
    config.baseURL = getStoredBaseUrl();
    return config;
  },
  (error) => Promise.reject(error)
);

export const getMLModelInfo = async () => {
  const res = await api.get('/api/ml/model-info');
  return res.data;
};

export const getDevices = async () => {
  const res = await api.get('/api/ml/devices');
  return res.data;
};

export const predictDeviceHealth = async (deviceId, limit = 50) => {
  const res = await api.get(`/api/ml/predict/device/${deviceId}`, { params: { limit } });
  return res.data;
};

export const predictPacketHeader = async (headerId) => {
  const res = await api.post(`/api/ml/predict/packet/${headerId}`);
  return res.data;
};

export const retrainMLModel = async (formData) => {
  const res = await api.post('/api/ml/retrain', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

// SS-HCHMNet Analytics APIs
export const getOverviewSummary = async () => {
  const res = await api.get('/api/ml/analytics/overview-summary');
  return res.data;
};

export const getBehaviorClusterMap = async () => {
  const res = await api.get('/api/ml/analytics/cluster-map');
  return res.data;
};

export const getDailyProfile = async (deviceId = '11') => {
  const res = await api.get(`/api/ml/analytics/daily-profile/${deviceId}`);
  return res.data;
};

export const getAnomalyTrend = async () => {
  const res = await api.get('/api/ml/analytics/anomaly-trend');
  return res.data;
};

export const getAutoencoderReconstruction = async (headerId = 1) => {
  const res = await api.get(`/api/ml/analytics/autoencoder-reconstruction/${headerId}`);
  return res.data;
};

export const getDailyFeatureRadar = async (deviceId = '11') => {
  const res = await api.get(`/api/ml/analytics/feature-radar/${deviceId}`);
  return res.data;
};

export const getDecisionMatrix = async () => {
  const res = await api.get('/api/ml/analytics/decision-engine');
  return res.data;
};

export const fetchDecisionEngine = getDecisionMatrix;

export const reloadDatabaseTelemetry = async () => {
  const res = await api.post('/api/ml/analytics/reload-db');
  return res.data;
};


export const downloadLabeledCsvExport = async (params = {}) => {
  try {
    const response = await api.get('/api/ml/export/labeled-csv', {
      params,
      responseType: 'blob'
    });

    let filename = `cow_health_ml_predictions_${Date.now()}.csv`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to download labeled CSV:', error);
    throw error;
  }
};

export const downloadSampleTemplate = async () => {
  try {
    const response = await api.get('/api/ml/sample-csv-template', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cow_health_training_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download template:', error);
    throw error;
  }
};

export default api;
