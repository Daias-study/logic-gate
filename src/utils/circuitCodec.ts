import type {
  ButtonColor,
  CircuitNode,
  CircuitWire,
  LedColor,
  LogicValue,
  NodeType,
} from '../types/circuit';

export interface EncodedCircuitPayload {
  v: 1;
  title: string;
  nodes: CircuitNode[];
  wires: CircuitWire[];
}

const VALID_NODE_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  'BUTTON',
  'SWITCH',
  'CLOCK',
  'LED',
  'WIRE',
  'NOT',
  'AND',
  'OR',
  'NAND',
  'NOR',
  'XOR',
  'XNOR',
]);

const VALID_BUTTON_COLORS: ReadonlySet<ButtonColor> = new Set<ButtonColor>([
  'yellow',
  'red',
  'blue',
]);

const VALID_LED_COLORS: ReadonlySet<LedColor> = new Set<LedColor>([
  'white',
  'blue',
  'amber',
  'emerald',
  'red',
]);

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(token: string): Uint8Array {
  const normalized = token.trim().replace(/-/g, '+').replace(/_/g, '/');
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Error('BASE64URLの形式が正しくありません。');
  }
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a circuit (title, nodes, wires) into a compact UTF-8 safe Base64URL token.
 */
export function encodeCircuitToBase64Url(
  title: string,
  nodes: CircuitNode[],
  wires: CircuitWire[]
): string {
  const compactNodes = nodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    x: Math.round(n.x),
    y: Math.round(n.y),
    value: n.value,
    ...(n.buttonColor ? {buttonColor: n.buttonColor} : {}),
    ...(n.ledColor ? {ledColor: n.ledColor} : {}),
    ...(n.shortcut ? {shortcut: n.shortcut} : {}),
  }));

  const compactWires = wires.map((w) => ({
    id: w.id,
    fromNodeId: w.fromNodeId,
    toNodeId: w.toNodeId,
    toPin: w.toPin,
  }));

  const payload = {
    v: 1,
    title: title.trim() || '無題の論理回路',
    nodes: compactNodes,
    wires: compactWires,
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

/**
 * Extracts a Base64URL token from either a raw token string or a full URL containing ?circuit=...
 */
export function extractCircuitToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('引き継ぎコードまたは共有URLを入力してください。');
  }

  if (trimmed.includes('://') || trimmed.includes('?circuit=') || trimmed.includes('#circuit=')) {
    try {
      const url = trimmed.includes('://')
        ? new URL(trimmed)
        : new URL(trimmed, 'https://example.invalid');
      const fromQuery = url.searchParams.get('circuit');
      if (fromQuery) return fromQuery;
      if (url.hash.startsWith('#circuit=')) {
        return url.hash.slice('#circuit='.length);
      }
    } catch {
      // Fall through to raw token parsing
    }
  }

  return trimmed;
}

/**
 * Decodes and validates a Base64URL token (or shared URL) back into circuit state.
 */
export function decodeCircuitFromBase64Url(
  rawInput: string
): EncodedCircuitPayload {
  const token = extractCircuitToken(rawInput);
  const bytes = base64UrlToBytes(token);
  const json = new TextDecoder().decode(bytes);

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('回路データのJSON解析に失敗しました。');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('回路データの構造が不正です。');
  }

  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.wires)) {
    throw new Error('ノードまたは配線のデータが見つかりません。');
  }

  const sanitizedNodes: CircuitNode[] = [];
  const validIds = new Set<string>();

  for (const rawNode of obj.nodes) {
    if (!rawNode || typeof rawNode !== 'object') continue;
    const n = rawNode as Record<string, unknown>;
    if (
      typeof n.id !== 'string' ||
      typeof n.type !== 'string' ||
      !VALID_NODE_TYPES.has(n.type as NodeType)
    ) {
      continue;
    }

    const x = typeof n.x === 'number' && Number.isFinite(n.x)
      ? Math.max(60, Math.min(760, Math.round(n.x)))
      : 200;
    const y = typeof n.y === 'number' && Number.isFinite(n.y)
      ? Math.max(44, Math.min(396, Math.round(n.y)))
      : 200;
    const value: LogicValue = n.value === 1 ? 1 : 0;
    const label =
      typeof n.label === 'string' && n.label.trim()
        ? n.label.trim().slice(0, 20)
        : n.type;

    const node: CircuitNode = {
      id: n.id,
      type: n.type as NodeType,
      label,
      x,
      y,
      value,
    };

    if (
      typeof n.buttonColor === 'string' &&
      VALID_BUTTON_COLORS.has(n.buttonColor as ButtonColor)
    ) {
      node.buttonColor = n.buttonColor as ButtonColor;
    }
    if (
      typeof n.ledColor === 'string' &&
      VALID_LED_COLORS.has(n.ledColor as LedColor)
    ) {
      node.ledColor = n.ledColor as LedColor;
    }
    if (typeof n.shortcut === 'string' && n.shortcut.length <= 4) {
      node.shortcut = n.shortcut;
    }

    sanitizedNodes.push(node);
    validIds.add(node.id);
  }

  const sanitizedWires: CircuitWire[] = [];
  for (let i = 0; i < obj.wires.length; i++) {
    const rawWire = obj.wires[i];
    if (!rawWire || typeof rawWire !== 'object') continue;
    const w = rawWire as Record<string, unknown>;
    if (
      typeof w.fromNodeId !== 'string' ||
      typeof w.toNodeId !== 'string' ||
      !validIds.has(w.fromNodeId) ||
      !validIds.has(w.toNodeId)
    ) {
      continue;
    }
    sanitizedWires.push({
      id: typeof w.id === 'string' && w.id ? w.id : `w-${i}`,
      fromNodeId: w.fromNodeId,
      toNodeId: w.toNodeId,
      toPin: w.toPin === 1 ? 1 : 0,
    });
  }

  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim().slice(0, 48)
      : '引き継ぎ回路';

  return {
    v: 1,
    title,
    nodes: sanitizedNodes,
    wires: sanitizedWires,
  };
}

export function buildCircuitShareUrl(token: string): string {
  if (typeof window === 'undefined') return `?circuit=${token}`;
  const url = new URL(window.location.href);
  url.searchParams.set('circuit', token);
  return url.toString();
}
