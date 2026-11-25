import React from 'react';
import type {LedColor, LogicValue} from '../types/circuit';

interface LedIndicatorProps {
  value: LogicValue;
  color?: LedColor;
  label?: string;
  traceColor?: string;
  textColor?: string;
  showGround?: boolean;
  size?: 'lg' | 'md';
}

const LED_PALETTE: Record<
  LedColor,
  {onFill: string; onGlow: string; core: string; offFill: string}
> = {
  amber: {
    onFill: '#FACC15',
    onGlow: 'rgba(250, 204, 21, 0.78)',
    core: '#FEF9C3',
    offFill: '#27272A',
  },
  blue: {
    onFill: '#2563EB',
    onGlow: 'rgba(59, 130, 246, 0.85)',
    core: '#DBEAFE',
    offFill: '#1E293B',
  },
  white: {
    onFill: '#FFFFFF',
    onGlow: 'rgba(255, 255, 255, 0.92)',
    core: '#FFFFFF',
    offFill: '#3F3F46',
  },
  emerald: {
    onFill: '#10B981',
    onGlow: 'rgba(16, 185, 129, 0.8)',
    core: '#D1FAE5',
    offFill: '#1F2937',
  },
  red: {
    onFill: '#EF4444',
    onGlow: 'rgba(239, 68, 68, 0.8)',
    core: '#FEE2E2',
    offFill: '#27272A',
  },
};

export const LedIndicator: React.FC<LedIndicatorProps> = ({
  value,
  color = 'amber',
  label = 'LED',
  traceColor = '#18181B',
  textColor = '#18181B',
  showGround = true,
  size = 'lg',
}) => {
  const isOn = value === 1;
  const pal = LED_PALETTE[color];
  const domeSize = size === 'lg' ? 'w-11 h-11 sm:w-12 sm:h-12' : 'w-8 h-8';

  return (
    <div className="flex flex-col items-center select-none">
      {/* LED socket + dome */}
      <div className="relative flex items-center justify-center">
        {isOn && (
          <div
            className="absolute -inset-3 rounded-full pointer-events-none transition-opacity duration-150"
            style={{
              background: `radial-gradient(circle, ${pal.onGlow} 0%, transparent 72%)`,
            }}
          />
        )}
        <div
          className={`relative ${domeSize} rounded-full border-2 border-black/40 transition-all duration-150 flex items-center justify-center`}
          style={{
            background: isOn
              ? `radial-gradient(circle at 35% 32%, ${pal.core} 0%, ${pal.onFill} 65%)`
              : `radial-gradient(circle at 35% 32%, #52525B 0%, ${pal.offFill} 75%)`,
            boxShadow: isOn
              ? `0 0 18px ${pal.onGlow}, inset 0 -3px 6px rgba(0,0,0,0.2)`
              : 'inset 0 3px 6px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.25)',
          }}
        >
          {/* Specular lens highlight */}
          <span className="absolute top-1.5 left-2 w-2.5 h-1.5 rounded-full bg-white/60 rotate-[-25deg] pointer-events-none" />
        </div>
      </div>

      {/* Ground Symbol (⏚) matching Computer Engineering for Babies */}
      {showGround && (
        <svg
          viewBox="0 0 32 34"
          className="w-7 h-7 mt-0.5"
          aria-hidden="true"
        >
          <line x1="16" y1="0" x2="16" y2="18" stroke={traceColor} strokeWidth="2.4" />
          <line x1="6" y1="18" x2="26" y2="18" stroke={traceColor} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="10" y1="24" x2="22" y2="24" stroke={traceColor} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="13.5" y1="30" x2="18.5" y2="30" stroke={traceColor} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )}

      {/* Explicit non-hue state label */}
      <div
        className="mt-1 font-mono-tabular text-xs font-semibold tracking-tight px-2 py-0.5 rounded bg-black/15 backdrop-blur-[1px]"
        style={{color: textColor}}
      >
        {label}: {isOn ? 'ON (1)' : 'OFF (0)'}
      </div>
    </div>
  );
};
