import React from 'react';
import type {GateKind, LogicValue} from '../types/circuit';

interface GateSymbolSvgProps {
  kind: GateKind;
  strokeColor?: string;
  fillColor?: string;
  outputValue?: LogicValue;
  className?: string;
}

/**
 * Renders crisp ANSI/IEEE standard logic gate schematic symbols
 * matching the bold technical linework of Computer Engineering for Babies.
 */
export const GateSymbolSvg: React.FC<GateSymbolSvgProps> = ({
  kind,
  strokeColor = '#181A1F',
  fillColor = 'rgba(255,255,255,0.12)',
  outputValue = 0,
  className = 'w-24 h-16',
}) => {
  const strokeWidth = 2.6;
  const bubbleFill = outputValue === 1 ? '#FDE047' : fillColor;

  if (kind === 'WIRE') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <path
          d="M 8 32 L 35 32 L 45 22 L 62 22 L 72 32 L 92 32"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === 'NOT') {
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <line
          x1="8"
          y1="32"
          x2="26"
          y2="32"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <polygon
          points="26,12 26,52 68,32"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <circle
          cx="74"
          cy="32"
          r="5.5"
          fill={bubbleFill}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        <line
          x1="79.5"
          y1="32"
          x2="92"
          y2="32"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === 'AND' || kind === 'NAND') {
    const hasBubble = kind === 'NAND';
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <line x1="8" y1="22" x2="26" y2="22" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1="8" y1="42" x2="26" y2="42" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <path
          d="M 26 12 L 50 12 A 20 20 0 0 1 50 52 L 26 52 Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {hasBubble ? (
          <>
            <circle
              cx="76"
              cy="32"
              r="5.5"
              fill={bubbleFill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line x1="81.5" y1="32" x2="92" y2="32" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        ) : (
          <line x1="70" y1="32" x2="92" y2="32" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
      </svg>
    );
  }

  if (kind === 'OR' || kind === 'NOR') {
    const hasBubble = kind === 'NOR';
    return (
      <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
        <line x1="8" y1="22" x2="31" y2="22" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1="8" y1="42" x2="31" y2="42" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        <path
          d="M 25 12 Q 36 32 25 52 Q 52 52 72 32 Q 52 12 25 12 Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {hasBubble ? (
          <>
            <circle
              cx="77.5"
              cy="32"
              r="5.2"
              fill={bubbleFill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <line x1="82.7" y1="32" x2="92" y2="32" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        ) : (
          <line x1="72" y1="32" x2="92" y2="32" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        )}
      </svg>
    );
  }

  // XOR or XNOR
  const hasBubble = kind === 'XNOR';
  return (
    <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
      <line x1="8" y1="22" x2="25" y2="22" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="8" y1="42" x2="25" y2="42" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path
        d="M 20 12 Q 31 32 20 52"
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M 28 12 Q 39 32 28 52 Q 54 52 73 32 Q 54 12 28 12 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {hasBubble ? (
        <>
          <circle
            cx="78.5"
            cy="32"
            r="5.2"
            fill={bubbleFill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <line x1="83.7" y1="32" x2="92" y2="32" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      ) : (
        <line x1="73" y1="32" x2="92" y2="32" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      )}
    </svg>
  );
};
