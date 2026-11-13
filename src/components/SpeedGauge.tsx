import React from 'react';

interface SpeedGaugeProps {
  speedMbps: number;
  maxScaleMbps?: number;
  stage: 'idle' | 'ping' | 'download' | 'upload' | 'complete' | 'error';
  pingMs: number;
  jitterMs: number;
  peakMbps: number;
  isTesting: boolean;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  speedMbps,
  maxScaleMbps = 500,
  stage,
  pingMs,
  jitterMs,
  peakMbps,
  isTesting,
}) => {
  // SVG gauge geometry
  const radius = 110;
  const strokeWidth = 14;
  const center = 135;
  // Sweep angle: 240 degrees (from 150 deg to 390 deg)
  const startAngle = 150;
  const endAngle = 390;
  const angleRange = endAngle - startAngle;

  // Logarithmic / non-linear scale for realistic speedometer responsiveness
  // speed 0 -> 0%
  // speed 10 -> 20%
  // speed 50 -> 40%
  // speed 100 -> 60%
  // speed 250 -> 80%
  // speed 500+ -> 100%
  const calculateNormalizedPercentage = (val: number): number => {
    if (val <= 0) return 0;
    if (val <= 10) return (val / 10) * 0.2;
    if (val <= 50) return 0.2 + ((val - 10) / 40) * 0.2;
    if (val <= 100) return 0.4 + ((val - 50) / 50) * 0.2;
    if (val <= 250) return 0.6 + ((val - 100) / 150) * 0.2;
    return Math.min(1.0, 0.8 + ((val - 250) / 250) * 0.2);
  };

  const percentage = calculateNormalizedPercentage(speedMbps);
  const currentAngle = startAngle + percentage * angleRange;

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const bgPath = describeArc(center, center, radius, startAngle, endAngle);
  const activePath = describeArc(
    center,
    center,
    radius,
    startAngle,
    Math.max(startAngle + 0.1, Math.min(endAngle, currentAngle))
  );

  // Tick marks
  const tickValues = [0, 10, 50, 100, 250, 500];

  const getStageTitle = () => {
    switch (stage) {
      case 'ping':
        return 'MEASURING LATENCY';
      case 'download':
        return 'DOWNLOADING STREAM';
      case 'upload':
        return 'UPLOADING DATA';
      case 'complete':
        return 'TEST COMPLETED';
      case 'error':
        return 'NETWORK INTERRUPTED';
      default:
        return 'READY TO BENCHMARK';
    }
  };

  const getStageColor = () => {
    switch (stage) {
      case 'download':
        return 'text-teal-400';
      case 'upload':
        return 'text-indigo-400';
      case 'ping':
        return 'text-emerald-400';
      case 'complete':
        return 'text-teal-300';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* SVG Speedometer */}
      <div className="relative w-full max-w-72 aspect-[9/8] flex items-center justify-center">
        <svg viewBox="0 0 270 240" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track */}
          <path
            d={bgPath}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress Arc */}
          <path
            d={activePath}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={isTesting ? 'url(#glow)' : undefined}
            className="transition-all duration-150 ease-out"
          />

          {/* Tick values around arc */}
          {tickValues.map((val) => {
            const p = calculateNormalizedPercentage(val);
            const deg = startAngle + p * angleRange;
            const innerPt = polarToCartesian(center, center, radius - 16, deg);
            const textPt = polarToCartesian(center, center, radius - 28, deg);

            return (
              <g key={val}>
                <circle cx={innerPt.x} cy={innerPt.y} r="1.5" fill="#64748b" />
                <text
                  x={textPt.x}
                  y={textPt.y + 3}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-500 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Center Digital Speed Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
          <div className="text-slate-400 text-[11px] font-mono tracking-wider mb-0.5">
            {stage === 'upload' ? 'UPLOAD RATE' : 'DOWNLOAD RATE'}
          </div>
          <div className="flex items-baseline gap-1 font-mono tabular-nums">
            <span className="text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {speedMbps.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-teal-400">Mbps</span>
          </div>

          {/* Stage kicker */}
          <div className={`mt-2 text-[10px] font-bold tracking-widest ${getStageColor()} transition-colors`}>
            {getStageTitle()}
          </div>
        </div>
      </div>

      {/* Latency & Peak Strip */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs -mt-2 px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <div className="text-center">
          <div className="text-[10px] text-slate-400">Ping</div>
          <div className="text-xs font-mono font-bold text-slate-200 tabular-nums">
            {pingMs > 0 ? `${pingMs} ms` : '—'}
          </div>
        </div>
        <div className="text-center border-x border-slate-800">
          <div className="text-[10px] text-slate-400">Jitter</div>
          <div className="text-xs font-mono font-bold text-slate-200 tabular-nums">
            {jitterMs > 0 ? `${jitterMs} ms` : '—'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-slate-400">Peak</div>
          <div className="text-xs font-mono font-bold text-teal-400 tabular-nums">
            {peakMbps > 0 ? `${peakMbps.toFixed(1)} M` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
};
