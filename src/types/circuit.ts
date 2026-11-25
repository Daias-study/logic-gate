export type LogicValue = 0 | 1;

export type GateKind =
  | 'WIRE'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'NAND'
  | 'NOR'
  | 'XOR'
  | 'XNOR';

export type NodeType =
  | 'BUTTON'
  | 'SWITCH'
  | 'CLOCK'
  | 'LED'
  | GateKind;

export type ButtonColor = 'yellow' | 'red' | 'blue';
export type LedColor = 'white' | 'blue' | 'amber' | 'emerald' | 'red';

export interface CircuitNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  /** Current state for input nodes (BUTTON/SWITCH/CLOCK) or computed output for gates/LED */
  value: LogicValue;
  buttonColor?: ButtonColor;
  ledColor?: LedColor;
  /** Optional keybinding hint for tactile buttons */
  shortcut?: string;
}

export interface CircuitWire {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  /** 0-indexed input pin on target node (0 = top/single, 1 = bottom) */
  toPin: 0 | 1;
}

export interface TruthTableRow {
  inputs: Record<string, LogicValue>;
  outputs: Record<string, LogicValue>;
  note?: string;
}

export interface BookChapter {
  id: string;
  orderLabel: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  booleanExpr: string;
  boardBg: string;
  boardTextColor: string;
  boardTraceColor: string;
  pcbPattern: 'none' | 'light' | 'dark';
  ledColor: LedColor;
  isSequential?: boolean;
  description: string;
  electricalNote: string;
  realWorldExample: string;
  inputDefs: {
    id: string;
    label: string;
    subLabel?: string;
    color: ButtonColor;
    shortcut: string;
    initialValue: LogicValue;
  }[];
  /** Prebuilt node & wire graph used both for step simulation and exporting to Free-Build Lab */
  nodes: CircuitNode[];
  wires: CircuitWire[];
  truthTableHeaders: string[];
  truthTableRows: {
    values: LogicValue[];
    note?: string;
  }[];
}
