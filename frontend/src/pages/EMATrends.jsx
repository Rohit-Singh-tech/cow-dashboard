import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const EMATrends = () => {
  const emaData = [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel-card">
        <h3 className="panel-title">Exponential Moving Average (EMA) Activity Trends</h3>
        <p className="panel-subtitle">Multi-scale temporal smoothing (Short: 15-min EMA vs Long: 2-hour EMA)</p>

        <div style={{ width: '100%', height: 260, marginTop: 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={emaData}>
              <XAxis dataKey="time" stroke="#475569" />
              <YAxis stroke="#475569" />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Line type="monotone" dataKey="ema_short" stroke="#38bdf8" strokeWidth={2} name="EMA (15-min)" />
              <Line type="monotone" dataKey="ema_long" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" name="EMA (2-hour)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EMATrends;
