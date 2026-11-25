import React from 'react';
import type {BookChapter, CircuitNode, CircuitWire, LogicValue} from '../types/circuit';
import {GateSymbolSvg} from './GateSymbolSvg';
import {LedIndicator} from './LedIndicator';
import {TactileButton} from './TactileButton';

interface BookBoardStageProps {
  chapter: BookChapter;
  nodes: CircuitNode[];
  wires: CircuitWire[];
  buttonMode: 'toggle' | 'momentary';
  onButtonPressStart: (nodeId: string) => void;
  onButtonPressEnd: (nodeId: string) => void;
  onButtonToggle: (nodeId: string) => void;
}

const LOGICAL_W = 760;
const LOGICAL_H = 380;

function getPinCoords(node: CircuitNode, kind: 'out' | 'in0' | 'in1'): {x: number; y: number} {
  if (node.type === 'BUTTON' || node.type === 'SWITCH' || node.type === 'CLOCK') {
    return {x: node.x + 42, y: node.y};
  }
  if (node.type === 'LED') {
    return {x: node.x - 24, y: node.y};
  }
  if (kind === 'out') {
    return {x: node.x + 46, y: node.y};
  }
  if (node.type === 'WIRE' || node.type === 'NOT') {
    return {x: node.x - 46, y: node.y};
  }
  return kind === 'in0' ? {x: node.x - 46, y: node.y - 11} : {x: node.x - 46, y: node.y + 11};
}

function buildOrthogonalPath(
  from: {x: number; y: number},
  to: {x: number; y: number},
  wireId: string
): string {
  // Special feedback loop path for SR Latch (w6: and-out -> or-hold top pin)
  if (wireId === 'w6') {
    const startX = from.x + 12;
    const loopBottomY = 318;
    const returnX = to.x - 24;
    return `M ${from.x} ${from.y} L ${startX} ${from.y} L ${startX} ${loopBottomY} L ${returnX} ${loopBottomY} L ${returnX} ${to.y} L ${to.x} ${to.y}`;
  }

  if (Math.abs(from.y - to.y) < 3) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const midX = Math.round((from.x + to.x) * 0.5);
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
}

function getWireLabelPosition(
  from: {x: number; y: number},
  to: {x: number; y: number},
  wireId: string
): {x: number; y: number} {
  if (wireId === 'w6') {
    return {x: (from.x + to.x) / 2, y: 318};
  }
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
}

export const BookBoardStage: React.FC<BookBoardStageProps> = ({
  chapter,
  nodes,
  wires,
  buttonMode,
  onButtonPressStart,
  onButtonPressEnd,
  onButtonToggle,
}) => {
  const nodesById = new Map<string, CircuitNode>();
  nodes.forEach((n) => nodesById.set(n.id, n));

  const isDarkBoard =
    chapter.id === 'latch' ||
    chapter.id === 'wire' ||
    chapter.id === 'or' ||
    chapter.id === 'back';

  const activeWireStroke = chapter.id === 'latch' ? '#FACC15' : '#FEF08A';
  const inactiveWireStroke = chapter.boardTraceColor;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-[0_14px_34px_-12px_rgba(24,26,31,0.28)] border border-black/10 transition-colors duration-300 select-none"
      style={{
        backgroundColor: chapter.boardBg,
        aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}`,
      }}
    >
      {/* Subtle PCB trace background motif matching the physical board book */}
      {chapter.pcbPattern !== 'none' && (
        <svg
          viewBox="0 0 760 380"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <g
            stroke={chapter.pcbPattern === 'dark' ? 'rgba(253,224,71,0.14)' : 'rgba(255,255,255,0.18)'}
            strokeWidth="1.5"
            fill="none"
          >
            <path d="M 30 40 L 180 40 L 210 70 L 390 70" />
            <path d="M 420 35 L 540 35 L 570 65 L 720 65" />
            <path d="M 24 335 L 160 335 L 195 300 L 310 300" />
            <path d="M 480 340 L 630 340 L 660 310 L 735 310" />
            <path d="M 60 150 L 95 150 L 125 180" />
            <path d="M 670 110 L 710 110 L 730 130 L 730 250" />
            <circle cx="180" cy="40" r="3" />
            <circle cx="390" cy="70" r="3" />
            <circle cx="540" cy="35" r="3" />
            <circle cx="160" cy="335" r="3" />
            <circle cx="630" cy="340" r="3" />
          </g>
        </svg>
      )}

      {/* Cover Typography (left top) */}
      {chapter.id === 'cover' && (
        <div className="absolute top-6 left-7 sm:top-8 sm:left-9 pointer-events-none z-10">
          <div className="font-display font-extrabold text-lg sm:text-2xl leading-[1.08] tracking-tight">
            <div className="text-[#2098BA]">COMPUTER</div>
            <div className="text-[#2098BA]">ENGINEERING</div>
            <div className="text-[#D43B2C]">FOR BABIES</div>
          </div>
        </div>
      )}

      {/* Cover author tribute at bottom right */}
      {chapter.id === 'cover' && (
        <div className="absolute bottom-5 right-7 text-xs sm:text-sm font-medium text-[#2098BA] pointer-events-none">
          Inspired by Chase Roberts
        </div>
      )}

      {/* Back cover contextual prompt */}
      {chapter.id === 'back' && (
        <div className="absolute top-5 left-7 right-7 pointer-events-none z-10 flex items-baseline justify-between">
          <span className="text-xs sm:text-sm font-semibold text-white/95 tracking-tight">
            応用チャレンジ: 玄関と裏口のどちらを押しても鳴るドアベル
          </span>
          <span className="font-mono-tabular text-xs text-white/80">
            BELL = FRONT + BACK
          </span>
        </div>
      )}

      {/* SVG Wire Routing Layer */}
      <svg
        viewBox={`0 0 ${LOGICAL_W} ${LOGICAL_H}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {wires.map((wire) => {
          const fromNode = nodesById.get(wire.fromNodeId);
          const toNode = nodesById.get(wire.toNodeId);
          if (!fromNode || !toNode) return null;

          const fromPt = getPinCoords(fromNode, 'out');
          const toPt = getPinCoords(toNode, wire.toPin === 1 ? 'in1' : 'in0');
          const d = buildOrthogonalPath(fromPt, toPt, wire.id);
          const isHigh = fromNode.value === 1;
          const labelPos = getWireLabelPosition(fromPt, toPt, wire.id);

          return (
            <g key={wire.id}>
              {/* Base PCB Trace */}
              <path
                d={d}
                fill="none"
                stroke={inactiveWireStroke}
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isHigh ? 0.35 : 0.85}
              />
              {/* Energized HIGH Signal Trace */}
              {isHigh && (
                <path
                  d={d}
                  fill="none"
                  stroke={activeWireStroke}
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="wire-flow-active"
                />
              )}
              {/* Junction dot for feedback branch */}
              {wire.id === 'w6' && (
                <circle
                  cx={fromPt.x + 12}
                  cy={fromPt.y}
                  r="4.5"
                  fill={isHigh ? activeWireStroke : inactiveWireStroke}
                />
              )}
              {/* Explicit numeric signal tag on trace */}
              <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
                <rect
                  x="-11"
                  y="-9"
                  width="22"
                  height="18"
                  rx="4"
                  fill={isHigh ? '#FEF08A' : isDarkBoard ? '#18181B' : '#FFFFFF'}
                  stroke={inactiveWireStroke}
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="IBM Plex Mono, monospace"
                  fill={isHigh ? '#18181B' : isDarkBoard ? '#E4E4E7' : '#18181B'}
                >
                  {isHigh ? '1' : '0'}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Interactive Nodes Layer (Buttons, Gates, LEDs) positioned by logical percentage */}
      <div className="absolute inset-0">
        {nodes.map((node) => {
          const leftPct = `${(node.x / LOGICAL_W) * 100}%`;
          const topPct = `${(node.y / LOGICAL_H) * 100}%`;

          if (node.type === 'BUTTON') {
            const def = chapter.inputDefs.find((d) => d.id === node.id);
            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                style={{left: leftPct, top: topPct}}
              >
                <TactileButton
                  label={def?.label ?? node.label}
                  subLabel={def?.subLabel}
                  color={node.buttonColor ?? 'yellow'}
                  value={node.value as LogicValue}
                  mode={buttonMode}
                  shortcut={node.shortcut}
                  textColor={chapter.boardTextColor}
                  size="lg"
                  onPressStart={() => onButtonPressStart(node.id)}
                  onPressEnd={() => onButtonPressEnd(node.id)}
                  onToggle={() => onButtonToggle(node.id)}
                />
              </div>
            );
          }

          if (node.type === 'LED') {
            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-[38%] z-20"
                style={{left: leftPct, top: topPct}}
              >
                <LedIndicator
                  value={node.value as LogicValue}
                  color={chapter.ledColor}
                  label={node.label}
                  traceColor={chapter.boardTraceColor}
                  textColor={chapter.boardTextColor}
                  showGround
                  size="lg"
                />
              </div>
            );
          }

          // Logic Gate Symbol
          const gateFill =
            chapter.id === 'latch'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.18)';

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none"
              style={{left: leftPct, top: topPct}}
            >
              <GateSymbolSvg
                kind={node.type as Exclude<CircuitNode['type'], 'BUTTON' | 'SWITCH' | 'CLOCK' | 'LED'>}
                strokeColor={chapter.boardTraceColor}
                fillColor={gateFill}
                outputValue={node.value as LogicValue}
                className="w-[92px] h-[60px] sm:w-[104px] sm:h-[68px]"
              />
              <span
                className="font-mono-tabular text-[11px] font-semibold tracking-tight -mt-1 px-1.5 py-0.2 rounded"
                style={{
                  color: chapter.boardTextColor,
                  backgroundColor: isDarkBoard ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.45)',
                }}
              >
                {node.type} = {node.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Book Chapter Title at Bottom Center (Chapters 1–6) */}
      {chapter.id !== 'cover' && chapter.id !== 'back' && (
        <div
          className="absolute bottom-3.5 sm:bottom-5 left-1/2 -translate-x-1/2 pointer-events-none font-display font-bold text-2xl sm:text-4xl tracking-[0.18em]"
          style={{color: chapter.boardTextColor}}
        >
          {chapter.title}
        </div>
      )}
    </div>
  );
};
