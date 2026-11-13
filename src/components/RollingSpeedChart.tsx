import React from 'react';
import { RollingTelemetryPoint } from '../types/network';

interface RollingSpeedChartProps {
  data: RollingTelemetryPoint[];
  height?: number;
}

export const RollingSpeedChart: React.FC<RollingSpeedChartProps> = ({
  data,
  height = 120,
}) => {
  if (data.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 text-xs text-slate-500 font-mono"
        style={{ height }}
      >
        Waiting for bandwidth telemetry stream...
      </div>
    );
  }

  const maxSpeed = Math.max(
    ...data.map((d) => Math.max(d.downloadMbps, d.uploadMbps)),
    20
  );

  const padding = 16;
  const width = 360; // normalized coordinate width

  const getY = (val: number) => {
    const ratio = Math.min(1, Math.max(0, val / maxSpeed));
    return height - padding - ratio * (height - padding * 2);
  };

  const getX = (index: number) => {
    return padding + (index / (data.length - 1)) * (width - padding * 2);
  };

  // Generate smooth SVG paths
  const dlPoints = data.map((d, i) => `${getX(i)},${getY(d.downloadMbps)}`).join(' ');
  const ulPoints = data.map((d, i) => `${getX(i)},${getY(d.uploadMbps)}`).join(' ');

  const dlArea = `${getX(0)},${height - padding} ${dlPoints} ${getX(data.length - 1)},${height - padding}`;

  const latest = data[data.length - 1];

  return (
    <div className="w-full bg-slate-900/70 rounded-2xl border border-slate-800/80 p-3 select-none">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-semibold text-xs">Live Bandwidth Monitor</span>
          <span className="text-[10px] text-slate-400 font-mono">30s Window</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
          <span className="flex items-center gap-1 text-teal-400">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            DL: {latest?.downloadMbps.toFixed(1) || '0.0'} Mbps
          </span>
          <span className="flex items-center gap-1 text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            UL: {latest?.uploadMbps.toFixed(1) || '0.0'} Mbps
          </span>
        </div>
      </div>

      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="dlFillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="#334155"
            strokeDasharray="2 4"
            strokeWidth="0.8"
          />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#334155"
            strokeDasharray="2 4"
            strokeWidth="0.8"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Download fill area */}
          <polygon points={dlArea} fill="url(#dlFillGradient)" />

          {/* Download Line */}
          <polyline
            points={dlPoints}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Upload Line */}
          <polyline
            points={ulPoints}
            fill="none"
            stroke="#818cf8"
            strokeWidth="1.8"
            strokeDasharray="3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Latest Point Indicator */}
          <circle
            cx={getX(data.length - 1)}
            cy={getY(latest.downloadMbps)}
            r="3.5"
            fill="#14b8a6"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        </svg>

        {/* Max label */}
        <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-400">
          {Math.round(maxSpeed)} Mbps
        </div>
      </div>
    </div>
  );
};
