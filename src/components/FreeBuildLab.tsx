import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FileDown,
  Pause,
  Play,
  RotateCcw,
  Share2,
  SkipForward,
  Trash2,
  Unplug,
} from 'lucide-react';
import {PRESET_CIRCUITS} from '../data/presetCircuits';
import type {
  ButtonColor,
  CircuitNode,
  CircuitWire,
  GateKind,
  LedColor,
  LogicValue,
  NodeType,
} from '../types/circuit';
import {encodeCircuitToBase64Url} from '../utils/circuitCodec';
import {downloadCircuitSchematicPdf} from '../utils/schematicPdf';
import {
  computeAutoTruthTable,
  isInputNode,
  isSingleInputNode,
  stepCircuit,
} from '../utils/simulator';
import {playStepTick, playTactileClick} from '../utils/sound';
import {CircuitTransferModal} from './CircuitTransferModal';
import {GateSymbolSvg} from './GateSymbolSvg';

interface FreeBuildLabProps {
  circuitTitle: string;
  nodes: CircuitNode[];
  wires: CircuitWire[];
  soundEnabled: boolean;
  onChangeTitle: (title: string) => void;
  onChangeCircuit: (nodes: CircuitNode[], wires: CircuitWire[]) => void;
}

const CANVAS_W = 820;
const CANVAS_H = 440;
const NODE_W = 112;
const NODE_H = 68;

interface PendingWire {
  fromNodeId: string;
  cursorX: number;
  cursorY: number;
}

function getLabPinPosition(
  node: CircuitNode,
  pin: 'out' | 'in0' | 'in1'
): {x: number; y: number} {
  if (pin === 'out') {
    return {x: node.x + NODE_W / 2, y: node.y};
  }
  if (isSingleInputNode(node.type)) {
    return {x: node.x - NODE_W / 2, y: node.y};
  }
  return pin === 'in0'
    ? {x: node.x - NODE_W / 2, y: node.y - 14}
    : {x: node.x - NODE_W / 2, y: node.y + 14};
}

function makeWirePath(a: {x: number; y: number}, b: {x: number; y: number}): string {
  const dx = Math.abs(b.x - a.x);
  const ctrl = Math.max(40, Math.min(110, dx * 0.5));
  if (b.x < a.x - 20) {
    // Feedback loop curve underneath or above
    const loopY = Math.max(a.y, b.y) + 64;
    return `M ${a.x} ${a.y} C ${a.x + 55} ${a.y}, ${a.x + 55} ${loopY}, ${(a.x + b.x) / 2} ${loopY} C ${b.x - 55} ${loopY}, ${b.x - 55} ${b.y}, ${b.x} ${b.y}`;
  }
  return `M ${a.x} ${a.y} C ${a.x + ctrl} ${a.y}, ${b.x - ctrl} ${b.y}, ${b.x} ${b.y}`;
}

export const FreeBuildLab: React.FC<FreeBuildLabProps> = ({
  circuitTitle,
  nodes,
  wires,
  soundEnabled,
  onChangeTitle,
  onChangeCircuit,
}) => {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [isRunning, setIsRunning] = useState(true);
  const [stepDelayMs, setStepDelayMs] = useState(140);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingWire, setPendingWire] = useState<PendingWire | null>(null);
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    kind: 'info' | 'error';
    text: string;
  } | null>(null);

  const latestNodesRef = useRef(nodes);
  const latestWiresRef = useRef(wires);
  useEffect(() => {
    latestNodesRef.current = nodes;
    latestWiresRef.current = wires;
  }, [nodes, wires]);

  // Continuous propagation when running (only updates React state if a gate output changed)
  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      const curNodes = latestNodesRef.current;
      const curWires = latestWiresRef.current;
      const {nextNodes, changed} = stepCircuit(curNodes, curWires);
      if (changed) {
        onChangeCircuit(nextNodes, curWires);
      }
    }, stepDelayMs);

    return () => window.clearInterval(timer);
  }, [isRunning, stepDelayMs, onChangeCircuit]);

  // Independent clock generator tick for CLOCK nodes
  useEffect(() => {
    if (!isRunning) return;
    const hasClock = nodes.some((n) => n.type === 'CLOCK');
    if (!hasClock) return;

    const clockInterval = window.setInterval(() => {
      const curNodes = latestNodesRef.current;
      const curWires = latestWiresRef.current;
      const nextNodes = curNodes.map((n) =>
        n.type === 'CLOCK' ? {...n, value: (n.value === 1 ? 0 : 1) as LogicValue} : n
      );
      onChangeCircuit(nextNodes, curWires);
    }, Math.max(500, stepDelayMs * 5));

    return () => window.clearInterval(clockInterval);
  }, [isRunning, stepDelayMs, nodes.some((n) => n.type === 'CLOCK'), onChangeCircuit]);

  // Keyboard delete for selected node
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedNodeId &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        e.preventDefault();
        const nextNodes = nodes.filter((n) => n.id !== selectedNodeId);
        const nextWires = wires.filter(
          (w) =>
            w.fromNodeId !== selectedNodeId && w.toNodeId !== selectedNodeId
        );
        onChangeCircuit(nextNodes, nextWires);
        setSelectedNodeId(null);
      }
      if (e.key === 'Escape') {
        setPendingWire(null);
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId, nodes, wires, onChangeCircuit]);

  const toLogicalCoords = useCallback(
    (clientX: number, clientY: number): {x: number; y: number} => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return {x: 100, y: 100};
      const x = ((clientX - rect.left) / rect.width) * CANVAS_W;
      const y = ((clientY - rect.top) / rect.height) * CANVAS_H;
      return {
        x: Math.max(60, Math.min(CANVAS_W - 60, Math.round(x))),
        y: Math.max(42, Math.min(CANVAS_H - 42, Math.round(y))),
      };
    },
    []
  );

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = toLogicalCoords(e.clientX, e.clientY);
    if (draggingNode) {
      const nextX = Math.max(64, Math.min(CANVAS_W - 64, Math.round(pt.x - draggingNode.offsetX)));
      const nextY = Math.max(44, Math.min(CANVAS_H - 44, Math.round(pt.y - draggingNode.offsetY)));
      setDraggingNode((prev) => (prev ? {...prev, moved: true} : null));
      onChangeCircuit(
        nodes.map((n) =>
          n.id === draggingNode.id ? {...n, x: nextX, y: nextY} : n
        ),
        wires
      );
    } else if (pendingWire) {
      setPendingWire((prev) =>
        prev ? {...prev, cursorX: pt.x, cursorY: pt.y} : null
      );
    }
  };

  const handleCanvasPointerUp = () => {
    setDraggingNode(null);
  };

  const handleAddNode = (
    type: NodeType,
    options?: {buttonColor?: ButtonColor; ledColor?: LedColor; label?: string}
  ) => {
    const count = nodes.length;
    const col = count % 4;
    const row = Math.floor(count / 4) % 3;
    const baseX = isInputNode(type)
      ? 100 + col * 24
      : type === 'LED'
        ? 680 - col * 18
        : 260 + col * 95;
    const baseY = 95 + row * 115 + (count % 2) * 18;

    const newNode: CircuitNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      label: options?.label ?? type,
      x: Math.min(CANVAS_W - 70, Math.max(70, baseX)),
      y: Math.min(CANVAS_H - 50, Math.max(50, baseY)),
      value: 0,
      buttonColor: options?.buttonColor,
      ledColor: options?.ledColor,
    };

    onChangeCircuit([...nodes, newNode], wires);
    setSelectedNodeId(newNode.id);
  };

  const handleToggleInput = (nodeId: string) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;
    const nextVal: LogicValue = target.value === 1 ? 0 : 1;
    playTactileClick(nextVal === 1, soundEnabled);
    onChangeCircuit(
      nodes.map((n) => (n.id === nodeId ? {...n, value: nextVal} : n)),
      wires
    );
  };

  const handleConnectToInputPin = (targetNodeId: string, pin: 0 | 1) => {
    if (!pendingWire) return;
    if (pendingWire.fromNodeId === targetNodeId) {
      setPendingWire(null);
      return;
    }

    // Replace existing wire on this specific target pin so 1 pin has 1 clean driver
    const filtered = wires.filter(
      (w) => !(w.toNodeId === targetNodeId && w.toPin === pin)
    );
    const newWire: CircuitWire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromNodeId: pendingWire.fromNodeId,
      toNodeId: targetNodeId,
      toPin: pin,
    };
    onChangeCircuit(nodes, [...filtered, newWire]);
    setPendingWire(null);
    playStepTick(soundEnabled);
  };

  const handleSingleStep = () => {
    const {nextNodes} = stepCircuit(nodes, wires);
    onChangeCircuit(nextNodes, wires);
    playStepTick(soundEnabled);
  };

  const handleDeleteNode = (nodeId: string) => {
    onChangeCircuit(
      nodes.filter((n) => n.id !== nodeId),
      wires.filter((w) => w.fromNodeId !== nodeId && w.toNodeId !== nodeId)
    );
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleDeleteWire = (wireId: string) => {
    onChangeCircuit(
      nodes,
      wires.filter((w) => w.id !== wireId)
    );
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = PRESET_CIRCUITS.find((p) => p.id === presetId);
    if (!preset) return;
    onChangeTitle(preset.name);
    onChangeCircuit(
      preset.nodes.map((n) => ({...n})),
      preset.wires.map((w) => ({...w}))
    );
    setPendingWire(null);
    setSelectedNodeId(null);
  };

  const handleDownloadPdf = async () => {
    if (nodes.length === 0) {
      setExportStatus({
        kind: 'error',
        text: '回路に部品がありません。パーツを配置してからPDFを出力してください。',
      });
      return;
    }
    setExportStatus(null);
    setIsExportingPdf(true);
    try {
      const token = encodeCircuitToBase64Url(circuitTitle, nodes, wires);
      await downloadCircuitSchematicPdf(circuitTitle, nodes, wires, token);
      setExportStatus({
        kind: 'info',
        text: 'A4横サイズの正式な論理回路図PDFをダウンロードしました。',
      });
    } catch (err) {
      setExportStatus({
        kind: 'error',
        text:
          err instanceof Error
            ? err.message
            : '回路図PDFの生成に失敗しました。',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const autoTruthTable = useMemo(
    () => computeAutoTruthTable(nodes, wires),
    [nodes, wires]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const nodesById = useMemo(() => {
    const map = new Map<string, CircuitNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const applyTruthTableRow = (inputValues: LogicValue[]) => {
    const inputIds = autoTruthTable.inputNodes.map((n) => n.id);
    const updated = nodes.map((n) => {
      const idx = inputIds.indexOf(n.id);
      if (idx !== -1) {
        return {...n, value: inputValues[idx]};
      }
      return n;
    });
    const {nextNodes} = stepCircuit(updated, wires);
    onChangeCircuit(nextNodes, wires);
    playTactileClick(true, soundEnabled);
  };

  return (
    <div className="space-y-4">
      {/* Circuit Identity, Share & PDF Export Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="lab-circuit-title"
            className="text-xs font-semibold text-slate-600 whitespace-nowrap"
          >
            回路名:
          </label>
          <input
            id="lab-circuit-title"
            type="text"
            value={circuitTitle}
            maxLength={48}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder="例: 自作の半加算器"
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900 w-56 sm:w-64 focus:bg-white focus:outline-2 focus:outline-sky-600"
          />
          <span className="font-mono-tabular text-xs text-slate-500">
            {nodes.length}部品 · {wires.length}配線
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTransferOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-sky-600" />
            BASE64URLで引き継ぎ・共有
          </button>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            {isExportingPdf ? 'PDF生成中...' : '回路図PDFをダウンロード'}
          </button>
        </div>
      </div>

      {exportStatus && (
        <div
          className={`rounded-xl px-4 py-2.5 text-xs flex items-center justify-between border ${
            exportStatus.kind === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <span>{exportStatus.text}</span>
          <button
            type="button"
            onClick={() => setExportStatus(null)}
            className="text-xs underline ml-4 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Workspace Simulation Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isRunning
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'シミュレーション実行中' : '再開する'}
          </button>

          <button
            type="button"
            onClick={handleSingleStep}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            1ステップ進める
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <label
              htmlFor="lab-speed-slider"
              className="text-xs text-slate-600 whitespace-nowrap"
            >
              伝搬速度:
            </label>
            <input
              id="lab-speed-slider"
              type="range"
              min={50}
              max={450}
              step={10}
              value={stepDelayMs}
              onChange={(e) => setStepDelayMs(Number(e.target.value))}
              className="w-24 accent-sky-600 cursor-pointer"
            />
            <span className="font-mono-tabular text-xs text-slate-700 w-20">
              {stepDelayMs} ms/step
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="preset-select" className="text-xs text-slate-500 whitespace-nowrap">
            サンプル回路:
          </label>
          <select
            id="preset-select"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleLoadPreset(e.target.value);
                e.target.value = '';
              }
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 cursor-pointer"
          >
            <option value="" disabled>
              回路を選択して読み込む...
            </option>
            {PRESET_CIRCUITS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              onChangeTitle('新しい論理回路');
              onChangeCircuit([], []);
              setSelectedNodeId(null);
              setPendingWire(null);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            全消去
          </button>
        </div>
      </div>

      {/* Main Split Grid: Palette + Workbench Canvas + Auto Truth Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Palette (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-3 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              入力パーツ
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleAddNode('BUTTON', {buttonColor: 'red', label: '赤ボタン'})
                }
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <span>ボタン (赤)</span>
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddNode('BUTTON', {buttonColor: 'yellow', label: '黄ボタン'})
                }
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <span>ボタン (黄)</span>
                <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block border border-amber-500" />
              </button>
              <button
                type="button"
                onClick={() => handleAddNode('SWITCH', {label: 'SW'})}
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                トグルスイッチ
              </button>
              <button
                type="button"
                onClick={() => handleAddNode('CLOCK', {label: 'CLK'})}
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                クロック (CLK)
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              論理ゲート
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {(['NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'WIRE'] as GateKind[]).map(
                (gate) => (
                  <button
                    key={gate}
                    type="button"
                    onClick={() => handleAddNode(gate, {label: gate})}
                    className="px-2 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular font-semibold text-slate-800 hover:bg-sky-50 hover:border-sky-300 text-center cursor-pointer"
                  >
                    {gate}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-2">
              出力パーツ
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleAddNode('LED', {ledColor: 'amber', label: 'LED (黄)'})
                }
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <span>LED (黄)</span>
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddNode('LED', {ledColor: 'blue', label: 'LED (青)'})
                }
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <span>LED (青)</span>
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddNode('LED', {ledColor: 'emerald', label: 'LED (緑)'})
                }
                className="px-2.5 py-2 rounded-lg border border-slate-200 text-left text-xs font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
              >
                <span>LED (緑)</span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Workbench Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
            <span>
              操作方法: 出力ピン (右の丸) をクリック → 入力ピン (左の丸) をクリックして配線 / 部品はドラッグで移動
            </span>
            {pendingWire && (
              <button
                type="button"
                onClick={() => setPendingWire(null)}
                className="text-rose-600 font-semibold hover:underline cursor-pointer"
              >
                配線をキャンセル (Esc)
              </button>
            )}
          </div>

          <div
            ref={canvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPendingWire(null);
                setSelectedNodeId(null);
              }
            }}
            className="relative w-full bg-white border border-slate-300 rounded-xl overflow-hidden workbench-grid shadow-sm select-none touch-none"
            style={{aspectRatio: `${CANVAS_W} / ${CANVAS_H}`}}
          >
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                <p className="text-sm font-semibold text-slate-700">
                  キャンバスは空です
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  左のパレットからパーツを追加するか、上部の「サンプル回路」を読み込んでください。
                </p>
              </div>
            )}

            {/* Wires SVG Layer */}
            <svg
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              className="absolute inset-0 w-full h-full"
            >
              {wires.map((wire) => {
                const fromNode = nodesById.get(wire.fromNodeId);
                const toNode = nodesById.get(wire.toNodeId);
                if (!fromNode || !toNode) return null;

                const a = getLabPinPosition(fromNode, 'out');
                const b = getLabPinPosition(
                  toNode,
                  wire.toPin === 1 ? 'in1' : 'in0'
                );
                const d = makeWirePath(a, b);
                const isHigh = fromNode.value === 1;
                const isHovered = hoveredWireId === wire.id;

                return (
                  <g
                    key={wire.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredWireId(wire.id)}
                    onMouseLeave={() => setHoveredWireId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWire(wire.id);
                    }}
                  >
                    {/* Wide invisible hit target */}
                    <path d={d} fill="none" stroke="transparent" strokeWidth="14" />
                    <path
                      d={d}
                      fill="none"
                      stroke={
                        isHovered
                          ? '#DC2626'
                          : isHigh
                            ? '#0284C7'
                            : '#94A3B8'
                      }
                      strokeWidth={isHigh || isHovered ? '3.4' : '2.6'}
                      strokeLinecap="round"
                    />
                    {isHigh && !isHovered && (
                      <path
                        d={d}
                        fill="none"
                        stroke="#BAE6FD"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        className="wire-flow-active"
                      />
                    )}
                  </g>
                );
              })}

              {/* Pending live wire preview */}
              {pendingWire && (() => {
                const fromNode = nodesById.get(pendingWire.fromNodeId);
                if (!fromNode) return null;
                const a = getLabPinPosition(fromNode, 'out');
                const d = makeWirePath(a, {
                  x: pendingWire.cursorX,
                  y: pendingWire.cursorY,
                });
                return (
                  <path
                    d={d}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                  />
                );
              })()}
            </svg>

            {/* Nodes Layer */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isHigh = node.value === 1;
              const leftPct = `${(node.x / CANVAS_W) * 100}%`;
              const topPct = `${(node.y / CANVAS_H) * 100}%`;
              const singleIn = isSingleInputNode(node.type);
              const isInput = isInputNode(node.type);

              return (
                <div
                  key={node.id}
                  style={{
                    left: leftPct,
                    top: topPct,
                    width: `${(NODE_W / CANVAS_W) * 100}%`,
                    height: `${(NODE_H / CANVAS_H) * 100}%`,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const pt = toLogicalCoords(e.clientX, e.clientY);
                    setSelectedNodeId(node.id);
                    setDraggingNode({
                      id: node.id,
                      offsetX: pt.x - node.x,
                      offsetY: pt.y - node.y,
                      moved: false,
                    });
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected
                      ? 'border-sky-600 ring-2 ring-sky-500/25 shadow-md z-20'
                      : 'border-slate-300 shadow-xs hover:border-slate-400 z-10'
                  }`}
                >
                  {/* Input Pins (left edge) */}
                  {!isInput && (
                    <>
                      {singleIn ? (
                        <button
                          type="button"
                          title="入力ピン"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnectToInputPin(node.id, 0);
                          }}
                          className={`absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-crosshair transition-transform hover:scale-125 ${
                            pendingWire
                              ? 'border-sky-600 bg-sky-100'
                              : 'border-slate-500 bg-white'
                          }`}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            title="入力ピン A (上)"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectToInputPin(node.id, 0);
                            }}
                            className={`absolute -left-2 top-[29%] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-crosshair transition-transform hover:scale-125 ${
                              pendingWire
                                ? 'border-sky-600 bg-sky-100'
                                : 'border-slate-500 bg-white'
                            }`}
                          />
                          <button
                            type="button"
                            title="入力ピン B (下)"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConnectToInputPin(node.id, 1);
                            }}
                            className={`absolute -left-2 top-[71%] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-crosshair transition-transform hover:scale-125 ${
                              pendingWire
                                ? 'border-sky-600 bg-sky-100'
                                : 'border-slate-500 bg-white'
                            }`}
                          />
                        </>
                      )}
                    </>
                  )}

                  {/* Output Pin (right edge) */}
                  {node.type !== 'LED' && (
                    <button
                      type="button"
                      title="出力ピン (クリックで配線開始)"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingWire({
                          fromNodeId: node.id,
                          cursorX: node.x + NODE_W / 2 + 20,
                          cursorY: node.y,
                        });
                      }}
                      className={`absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 cursor-crosshair transition-transform hover:scale-125 ${
                        isHigh
                          ? 'border-sky-700 bg-sky-500'
                          : 'border-slate-500 bg-white'
                      }`}
                    />
                  )}

                  {/* Node Body */}
                  {node.type === 'BUTTON' || node.type === 'SWITCH' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!draggingNode?.moved) {
                          handleToggleInput(node.id);
                        }
                      }}
                      className="flex flex-col items-center justify-center w-full h-full px-1 cursor-pointer"
                    >
                      <span
                        className={`w-7 h-7 rounded-full border border-black/20 flex items-center justify-center font-mono-tabular text-xs font-bold shadow-inner transition-transform ${
                          node.buttonColor === 'red'
                            ? isHigh
                              ? 'bg-red-600 text-white scale-95'
                              : 'bg-red-500 text-white'
                            : node.buttonColor === 'yellow'
                              ? isHigh
                                ? 'bg-yellow-400 text-black scale-95'
                                : 'bg-yellow-300 text-black'
                              : isHigh
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {node.value}
                      </span>
                      <span className="text-[11px] font-medium text-slate-800 truncate max-w-[92px] mt-0.5">
                        {node.label}
                      </span>
                    </button>
                  ) : node.type === 'CLOCK' ? (
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`font-mono-tabular text-xs font-bold px-2 py-0.5 rounded ${
                          isHigh
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        CLK {node.value}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        {node.label}
                      </span>
                    </div>
                  ) : node.type === 'LED' ? (
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`w-7 h-7 rounded-full border border-black/30 flex items-center justify-center font-mono-tabular text-[11px] font-bold transition-all ${
                          isHigh
                            ? node.ledColor === 'blue'
                              ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                              : node.ledColor === 'emerald'
                                ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                                : 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.85)]'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {node.value}
                      </span>
                      <span className="text-[11px] font-medium text-slate-800 truncate max-w-[94px] mt-0.5">
                        {node.label}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <GateSymbolSvg
                        kind={node.type as GateKind}
                        strokeColor="#1E293B"
                        fillColor="#F8FAFC"
                        outputValue={node.value}
                        className="w-16 h-10"
                      />
                      <span className="font-mono-tabular text-[10px] font-semibold text-slate-700 -mt-0.5">
                        {node.label} ({node.value})
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Node Inspector Strip */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            {selectedNode ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="font-mono-tabular font-semibold text-slate-900">
                    選択中: {selectedNode.type}
                  </span>
                  <label className="flex items-center gap-1.5 text-slate-600">
                    <span>ラベル:</span>
                    <input
                      type="text"
                      value={selectedNode.label}
                      maxLength={14}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChangeCircuit(
                          nodes.map((n) =>
                            n.id === selectedNode.id ? {...n, label: val} : n
                          ),
                          wires
                        );
                      }}
                      className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-900 w-28"
                    />
                  </label>
                  <span className="font-mono-tabular text-slate-600">
                    現在値: <strong>{selectedNode.value}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeCircuit(
                        nodes,
                        wires.filter(
                          (w) =>
                            w.fromNodeId !== selectedNode.id &&
                            w.toNodeId !== selectedNode.id
                        )
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Unplug className="w-3.5 h-3.5" />
                    配線を外す
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    削除
                  </button>
                </div>
              </>
            ) : (
              <span className="text-slate-500">
                パーツをクリックして選択（名前変更・削除）、または配線をクリックして切断できます。
              </span>
            )}
          </div>
        </div>

        {/* Right Auto-Computed Truth Table (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              自動生成・真理値表
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              現在の回路の入力とLED出力から自動計算します。
            </p>
          </div>

          {autoTruthTable.tooManyInputs ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              入力が5つ以上あるため真理値表を省略しています（最大4入力 / 16行まで自動表示）。
            </p>
          ) : autoTruthTable.rows.length === 0 ? (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              ボタンまたはスイッチ（1〜4個）とLED（1個以上）を配線すると、ここに真理値表が表示されます。
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse font-mono-tabular text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    {autoTruthTable.inputNodes.map((inp) => (
                      <th key={inp.id} className="py-1.5 px-2 font-medium truncate max-w-[60px]">
                        {inp.label}
                      </th>
                    ))}
                    {autoTruthTable.outputNodes.map((out) => (
                      <th key={out.id} className="py-1.5 px-2 font-semibold text-slate-900 truncate max-w-[68px]">
                        {out.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {autoTruthTable.rows.map((row, idx) => {
                    const isActive = autoTruthTable.inputNodes.every(
                      (inp, i) => inp.value === row.inputs[i]
                    );
                    return (
                      <tr
                        key={idx}
                        onClick={() => applyTruthTableRow(row.inputs)}
                        className={`cursor-pointer transition-colors ${
                          isActive ? 'bg-sky-50 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        {row.inputs.map((val, i) => (
                          <td key={i} className="py-1.5 px-2">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] ${
                                val === 1
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {val}
                            </span>
                          </td>
                        ))}
                        {row.outputs.map((val, o) => (
                          <td key={o} className="py-1.5 px-2">
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] ${
                                val === 1
                                  ? 'bg-amber-400/30 text-amber-900 font-bold'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {val}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CircuitTransferModal
        isOpen={isTransferOpen}
        circuitTitle={circuitTitle}
        nodes={nodes}
        wires={wires}
        onClose={() => setIsTransferOpen(false)}
        onImportCircuit={(importedTitle, importedNodes, importedWires) => {
          onChangeTitle(importedTitle);
          onChangeCircuit(importedNodes, importedWires);
          setSelectedNodeId(null);
          setPendingWire(null);
          setExportStatus({
            kind: 'info',
            text: `回路「${importedTitle}」をBASE64URLデータから復元しました。`,
          });
        }}
      />
    </div>
  );
};
