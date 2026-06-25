import React from 'react';

interface LogoDrawProps {
  size?: number;
  className?: string;
}

export const LogoDraw: React.FC<LogoDrawProps> = ({ size = 96, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} animate-logo-pulse-breath`}
    >
      <style>{`
        /* Vertical scan rect slide-down keyframes matching 1.8s loading time */
        @keyframes scan-rect {
          0% { transform: translateY(-120px); }
          100% { transform: translateY(0); }
        }
        .animate-scan-rect {
          animation: scan-rect 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        /* Scan line vertical sweep keyframes */
        @keyframes scan-line {
          0% { transform: translateY(0); opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { transform: translateY(120px); opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      <defs>
        {/* Holographic Laser gradient for the scan line */}
        <linearGradient id="laser-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0" />
          <stop offset="20%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="80%" stopColor="#fb923c" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </linearGradient>

        {/* The sliding clipping window */}
        <clipPath id="logo-scan-clip">
          <rect
            x="0"
            y="0"
            width="120"
            height="120"
            className="animate-scan-rect"
          />
        </clipPath>
      </defs>

      {/* 1. Background Logo: Faded blueprint template */}
      <image
        href="logo.png"
        x="0"
        y="0"
        width="120"
        height="120"
        style={{
          opacity: 0.12,
          filter: 'grayscale(100%)'
        }}
      />

      {/* 2. Foreground Logo: Full color, revealed in sync with clipPath */}
      <g clipPath="url(#logo-scan-clip)">
        <image
          href="logo.png"
          x="0"
          y="0"
          width="120"
          height="120"
        />
      </g>

      {/* 3. Sweeping Laser Scan Line */}
      <g className="animate-scan-line">
        {/* Outer Laser Glow */}
        <line
          x1="0"
          y1="0"
          x2="120"
          y2="0"
          stroke="url(#laser-grad)"
          strokeWidth="3.5"
          style={{ filter: 'blur(1.5px)' }}
        />
        {/* Core Laser Beam */}
        <line
          x1="0"
          y1="0"
          x2="120"
          y2="0"
          stroke="url(#laser-grad)"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};

export default LogoDraw;
