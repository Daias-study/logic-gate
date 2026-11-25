import type {
  CircuitNode,
  CircuitWire,
  LogicValue,
  NodeType,
} from '../types/circuit';

export function isInputNode(type: NodeType): boolean {
  return type === 'BUTTON' || type === 'SWITCH' || type === 'CLOCK';
}

export function isSingleInputNode(type: NodeType): boolean {
  return type === 'WIRE' || type === 'NOT' || type === 'LED';
}

export function evaluateGate(
  type: NodeType,
  a: LogicValue,
  b: LogicValue = 0
): LogicValue {
  switch (type) {
    case 'WIRE':
    case 'LED':
      return a;
    case 'NOT':
      return a === 1 ? 0 : 1;
    case 'AND':
      return a === 1 && b === 1 ? 1 : 0;
    case 'OR':
      return a === 1 || b === 1 ? 1 : 0;
    case 'NAND':
      return a === 1 && b === 1 ? 0 : 1;
    case 'NOR':
      return a === 1 || b === 1 ? 0 : 1;
    case 'XOR':
      return a !== b ? 1 : 0;
    case 'XNOR':
      return a === b ? 1 : 0;
    default:
      return 0;
  }
}

export function getNodePinInputs(
  nodeId: string,
  nodesById: Map<string, CircuitNode>,
  wires: CircuitWire[]
): [LogicValue, LogicValue] {
  let pin0: LogicValue = 0;
  let pin1: LogicValue = 0;

  for (const w of wires) {
    if (w.toNodeId === nodeId) {
      const src = nodesById.get(w.fromNodeId);
      const val: LogicValue = src ? src.value : 0;
      if (w.toPin === 0) {
        pin0 = pin0 === 1 || val === 1 ? 1 : 0;
      } else {
        pin1 = pin1 === 1 || val === 1 ? 1 : 0;
      }
    }
  }

  return [pin0, pin1];
}

/**
 * Performs a single synchronous propagation tick across all non-input nodes.
 * Preserves sequential behavior for feedback loops (e.g., SR Latch, Ring Oscillator).
 */
export function stepCircuit(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): {nextNodes: CircuitNode[]; changed: boolean} {
  const nodesById = new Map<string, CircuitNode>();
  for (const n of nodes) {
    nodesById.set(n.id, n);
  }

  let changed = false;
  const nextNodes = nodes.map((node) => {
    if (isInputNode(node.type)) {
      return node;
    }
    const [a, b] = getNodePinInputs(node.id, nodesById, wires);
    const nextVal = evaluateGate(node.type, a, b);
    if (nextVal !== node.value) {
      changed = true;
      return {...node, value: nextVal};
    }
    return node;
  });

  return {nextNodes, changed};
}

/**
 * Propagates combinational and latching circuits until they reach equilibrium
 * or up to `maxIterations` steps (preventing infinite loops on oscillators).
 */
export function settleCircuit(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  maxIterations = 12
): {nodes: CircuitNode[]; stepsUsed: number; oscillates: boolean} {
  let current = nodes;
  let stepsUsed = 0;
  let changed = true;

  while (changed && stepsUsed < maxIterations) {
    const res = stepCircuit(current, wires);
    current = res.nextNodes;
    changed = res.changed;
    if (changed) {
      stepsUsed += 1;
    }
  }

  return {
    nodes: current,
    stepsUsed,
    oscillates: changed,
  };
}

/**
 * Generates an automatic truth table for any circuit containing 1..4 user input nodes (BUTTON/SWITCH)
 * and at least 1 output LED node.
 */
export function computeAutoTruthTable(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): {
  inputNodes: CircuitNode[];
  outputNodes: CircuitNode[];
  rows: {inputs: LogicValue[]; outputs: LogicValue[]}[];
  tooManyInputs: boolean;
} {
  const inputNodes = nodes.filter(
    (n) => n.type === 'BUTTON' || n.type === 'SWITCH'
  );
  const outputNodes = nodes.filter((n) => n.type === 'LED');

  if (inputNodes.length === 0 || outputNodes.length === 0) {
    return {inputNodes, outputNodes, rows: [], tooManyInputs: false};
  }

  if (inputNodes.length > 4) {
    return {inputNodes, outputNodes, rows: [], tooManyInputs: true};
  }

  const totalCombinations = 1 << inputNodes.length;
  const rows: {inputs: LogicValue[]; outputs: LogicValue[]}[] = [];

  for (let mask = 0; mask < totalCombinations; mask++) {
    const comboInputs: LogicValue[] = inputNodes.map((_, idx) => {
      const bitPos = inputNodes.length - 1 - idx;
      return ((mask >> bitPos) & 1) as LogicValue;
    });

    const seededNodes: CircuitNode[] = nodes.map((n) => {
      const inputIndex = inputNodes.findIndex((inp) => inp.id === n.id);
      if (inputIndex !== -1) {
        return {...n, value: comboInputs[inputIndex]};
      }
      if (!isInputNode(n.type)) {
        return {...n, value: 0};
      }
      return n;
    });

    const settled = settleCircuit(seededNodes, wires, 10);
    const comboOutputs: LogicValue[] = outputNodes.map((outNode) => {
      const found = settled.nodes.find((sn) => sn.id === outNode.id);
      return found ? found.value : 0;
    });

    rows.push({inputs: comboInputs, outputs: comboOutputs});
  }

  return {inputNodes, outputNodes, rows, tooManyInputs: false};
}
