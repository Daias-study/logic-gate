import React from 'react';
import type {ButtonColor, LogicValue} from '../types/circuit';

interface TactileButtonProps {
  label: string;
  subLabel?: string;
  color: ButtonColor;
  value: LogicValue;
  mode: 'toggle' | 'momentary';
  shortcut?: string;
  textColor?: string;
  size?: 'lg' | 'md';
  onPressStart: () => void;
  onPressEnd: () => void;
  onToggle: () => void;
}

const COLOR_STYLES: Record<
  ButtonColor,
  {
    bezel: string;
    capIdle: string;
    capPressed: string;
    rim: string;
  }
> = {
  yellow: {
    bezel: '#292524',
    capIdle: 'linear-gradient(145deg, #FDE047 0%, #EAB308 55%, #CA8A04 100%)',
    capPressed: 'linear-gradient(145deg, #FACC15 0%, #CA8A04 65%, #A16207 100%)',
    rim: '#FEF08A',
  },
  red: {
    bezel: '#292524',
    capIdle: 'linear-gradient(145deg, #F87171 0%, #DC2626 55%, #991B1B 100%)',
    capPressed: 'linear-gradient(145deg, #EF4444 0%, #B91C1C 65%, #7F1D1D 100%)',
    rim: '#FECACA',
  },
  blue: {
    bezel: '#1E293B',
    capIdle: 'linear-gradient(145deg, #60A5FA 0%, #2563EB 55%, #1D4ED8 100%)',
    capPressed: 'linear-gradient(145deg, #3B82F6 0%, #1D4ED8 65%, #1E40AF 100%)',
    rim: '#BFDBFE',
  },
};

export const TactileButton: React.FC<TactileButtonProps> = ({
  label,
  subLabel,
  color,
  value,
  mode,
  shortcut,
  textColor = '#FFFFFF',
  size = 'lg',
  onPressStart,
  onPressEnd,
  onToggle,
}) => {
  const palette = COLOR_STYLES[color];
  const isOn = value === 1;
  const outerSize = size === 'lg' ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-14 h-14';
  const innerSize = size === 'lg' ? 'w-14 h-14 sm:w-[68px] sm:h-[68px]' : 'w-10 h-10';

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        aria-pressed={isOn}
        aria-label={`${label} ボタン (${isOn ? 'ON / 1' : 'OFF / 0'})`}
        onPointerDown={(e) => {
          if (mode === 'momentary') {
            e.currentTarget.setPointerCapture(e.pointerId);
            onPressStart();
          }
        }}
        onPointerUp={() => {
          if (mode === 'momentary') {
            onPressEnd();
          }
        }}
        onPointerCancel={() => {
          if (mode === 'momentary') {
            onPressEnd();
          }
        }}
        onClick={() => {
          if (mode === 'toggle') {
            onToggle();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (mode === 'momentary' && !e.repeat) {
              onPressStart();
            } else if (mode === 'toggle' && !e.repeat) {
              onToggle();
            }
          }
        }}
        onKeyUp={(e) => {
          if (mode === 'momentary' && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            onPressEnd();
          }
        }}
        className={`relative ${outerSize} rounded-full flex items-center justify-center cursor-pointer transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900`}
        style={{
          background: '#1C1917',
          boxShadow:
            'inset 0 4px 8px rgba(0,0,0,0.65), 0 3px 6px rgba(0,0,0,0.35)',
        }}
      >
        {/* Recessed cutout ring */}
        <span
          className={`${innerSize} rounded-full flex items-center justify-center transition-all duration-100`}
          style={{
            background: isOn ? palette.capPressed : palette.capIdle,
            transform: isOn ? 'translateY(2px) scale(0.95)' : 'translateY(-1px) scale(1)',
            boxShadow: isOn
              ? `inset 0 3px 6px rgba(0,0,0,0.45), 0 0 0 2px ${palette.rim}40`
              : `0 5px 0 rgba(0,0,0,0.48), 0 7px 10px rgba(0,0,0,0.35), inset 0 2px 4px ${palette.rim}80`,
          }}
        >
          <span className="font-mono-tabular text-xs font-semibold tracking-tight text-black/75 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
            {isOn ? '1' : '0'}
          </span>
        </span>
      </button>

      <div
        className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-tight"
        style={{color: textColor}}
      >
        <span>{label}</span>
        {shortcut && (
          <kbd className="font-mono-tabular text-[11px] px-1 py-0.2 rounded border border-current/25 opacity-80">
            {shortcut}
          </kbd>
        )}
      </div>
      {subLabel && (
        <span
          className="text-[11px] opacity-80 leading-tight"
          style={{color: textColor}}
        >
          {subLabel}
        </span>
      )}
    </div>
  );
};
