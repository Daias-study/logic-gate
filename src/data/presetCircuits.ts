import type {CircuitNode, CircuitWire} from '../types/circuit';

export interface PresetCircuit {
  id: string;
  name: string;
  description: string;
  nodes: CircuitNode[];
  wires: CircuitWire[];
}

export const PRESET_CIRCUITS: PresetCircuit[] = [
  {
    id: 'half-adder',
    name: '半加算器 (Half Adder)',
    description: '1ビット同士の足し算 A + B を計算し、和 (SUM) と桁上がり (CARRY) を出力します。',
    nodes: [
      {id: 'in-a', type: 'BUTTON', label: 'A', x: 90, y: 120, value: 0, buttonColor: 'red', shortcut: '1'},
      {id: 'in-b', type: 'BUTTON', label: 'B', x: 90, y: 260, value: 0, buttonColor: 'yellow', shortcut: '2'},
      {id: 'gate-xor', type: 'XOR', label: 'XOR', x: 310, y: 120, value: 0},
      {id: 'gate-and', type: 'AND', label: 'AND', x: 310, y: 260, value: 0},
      {id: 'led-sum', type: 'LED', label: 'SUM (和)', x: 540, y: 120, value: 0, ledColor: 'emerald'},
      {id: 'led-carry', type: 'LED', label: 'CARRY (桁)', x: 540, y: 260, value: 0, ledColor: 'amber'},
    ],
    wires: [
      {id: 'ha-1', fromNodeId: 'in-a', toNodeId: 'gate-xor', toPin: 0},
      {id: 'ha-2', fromNodeId: 'in-b', toNodeId: 'gate-xor', toPin: 1},
      {id: 'ha-3', fromNodeId: 'in-a', toNodeId: 'gate-and', toPin: 0},
      {id: 'ha-4', fromNodeId: 'in-b', toNodeId: 'gate-and', toPin: 1},
      {id: 'ha-5', fromNodeId: 'gate-xor', toNodeId: 'led-sum', toPin: 0},
      {id: 'ha-6', fromNodeId: 'gate-and', toNodeId: 'led-carry', toPin: 0},
    ],
  },
  {
    id: 'sr-latch',
    name: 'SRラッチ (1ビット記憶回路)',
    description: '絵本の第6章と同じ構成。SETで1を記憶し、RESETで0に戻します。',
    nodes: [
      {id: 'btn-reset', type: 'BUTTON', label: 'RESET', x: 80, y: 110, value: 0, buttonColor: 'red', shortcut: '1'},
      {id: 'btn-set', type: 'BUTTON', label: 'SET', x: 80, y: 270, value: 0, buttonColor: 'yellow', shortcut: '2'},
      {id: 'not-r', type: 'NOT', label: 'NOT', x: 230, y: 110, value: 1},
      {id: 'or-q', type: 'OR', label: 'OR', x: 320, y: 255, value: 0},
      {id: 'and-q', type: 'AND', label: 'AND', x: 470, y: 180, value: 0},
      {id: 'led-q', type: 'LED', label: '記憶 Q', x: 630, y: 180, value: 0, ledColor: 'white'},
    ],
    wires: [
      {id: 'sr-1', fromNodeId: 'btn-reset', toNodeId: 'not-r', toPin: 0},
      {id: 'sr-2', fromNodeId: 'not-r', toNodeId: 'and-q', toPin: 0},
      {id: 'sr-3', fromNodeId: 'btn-set', toNodeId: 'or-q', toPin: 1},
      {id: 'sr-4', fromNodeId: 'or-q', toNodeId: 'and-q', toPin: 1},
      {id: 'sr-5', fromNodeId: 'and-q', toNodeId: 'led-q', toPin: 0},
      {id: 'sr-6', fromNodeId: 'and-q', toNodeId: 'or-q', toPin: 0},
    ],
  },
  {
    id: 'nand-universal',
    name: 'NANDだけで作るAND回路',
    description: 'すべての論理ゲートはNANDの組み合わせだけで作れることを確かめられます。',
    nodes: [
      {id: 'in-a', type: 'SWITCH', label: 'A', x: 90, y: 120, value: 0},
      {id: 'in-b', type: 'SWITCH', label: 'B', x: 90, y: 250, value: 0},
      {id: 'nand-1', type: 'NAND', label: 'NAND 1', x: 270, y: 185, value: 1},
      {id: 'nand-2', type: 'NAND', label: 'NAND 2 (反転)', x: 440, y: 185, value: 0},
      {id: 'led-out', type: 'LED', label: 'A AND B', x: 610, y: 185, value: 0, ledColor: 'blue'},
    ],
    wires: [
      {id: 'nu-1', fromNodeId: 'in-a', toNodeId: 'nand-1', toPin: 0},
      {id: 'nu-2', fromNodeId: 'in-b', toNodeId: 'nand-1', toPin: 1},
      {id: 'nu-3', fromNodeId: 'nand-1', toNodeId: 'nand-2', toPin: 0},
      {id: 'nu-4', fromNodeId: 'nand-1', toNodeId: 'nand-2', toPin: 1},
      {id: 'nu-5', fromNodeId: 'nand-2', toNodeId: 'led-out', toPin: 0},
    ],
  },
  {
    id: 'majority-voter',
    name: '3入力 多数決回路',
    description: '3つのスイッチのうち2つ以上がONのときだけLEDが点灯します。',
    nodes: [
      {id: 's1', type: 'SWITCH', label: 'A', x: 80, y: 80, value: 0},
      {id: 's2', type: 'SWITCH', label: 'B', x: 80, y: 190, value: 0},
      {id: 's3', type: 'SWITCH', label: 'C', x: 80, y: 300, value: 0},
      {id: 'and-ab', type: 'AND', label: 'A·B', x: 260, y: 95, value: 0},
      {id: 'and-bc', type: 'AND', label: 'B·C', x: 260, y: 195, value: 0},
      {id: 'and-ac', type: 'AND', label: 'A·C', x: 260, y: 295, value: 0},
      {id: 'or-1', type: 'OR', label: 'OR 1', x: 420, y: 145, value: 0},
      {id: 'or-2', type: 'OR', label: 'OR 2', x: 540, y: 220, value: 0},
      {id: 'led-maj', type: 'LED', label: '多数決', x: 675, y: 220, value: 0, ledColor: 'emerald'},
    ],
    wires: [
      {id: 'mj-1', fromNodeId: 's1', toNodeId: 'and-ab', toPin: 0},
      {id: 'mj-2', fromNodeId: 's2', toNodeId: 'and-ab', toPin: 1},
      {id: 'mj-3', fromNodeId: 's2', toNodeId: 'and-bc', toPin: 0},
      {id: 'mj-4', fromNodeId: 's3', toNodeId: 'and-bc', toPin: 1},
      {id: 'mj-5', fromNodeId: 's1', toNodeId: 'and-ac', toPin: 0},
      {id: 'mj-6', fromNodeId: 's3', toNodeId: 'and-ac', toPin: 1},
      {id: 'mj-7', fromNodeId: 'and-ab', toNodeId: 'or-1', toPin: 0},
      {id: 'mj-8', fromNodeId: 'and-bc', toNodeId: 'or-1', toPin: 1},
      {id: 'mj-9', fromNodeId: 'or-1', toNodeId: 'or-2', toPin: 0},
      {id: 'mj-10', fromNodeId: 'and-ac', toNodeId: 'or-2', toPin: 1},
      {id: 'mj-11', fromNodeId: 'or-2', toNodeId: 'led-maj', toPin: 0},
    ],
  },
  {
    id: 'ring-oscillator',
    name: 'リング発振回路 (3x NOT)',
    description: '奇数個のNOTをループ状につなぐと信号が反転し続け、点滅クロックを作れます。ステップ実行で確認できます。',
    nodes: [
      {id: 'n1', type: 'NOT', label: 'NOT 1', x: 200, y: 150, value: 0},
      {id: 'n2', type: 'NOT', label: 'NOT 2', x: 360, y: 150, value: 1},
      {id: 'n3', type: 'NOT', label: 'NOT 3', x: 520, y: 150, value: 0},
      {id: 'led-osc', type: 'LED', label: '発振出力', x: 650, y: 150, value: 0, ledColor: 'amber'},
    ],
    wires: [
      {id: 'ro-1', fromNodeId: 'n1', toNodeId: 'n2', toPin: 0},
      {id: 'ro-2', fromNodeId: 'n2', toNodeId: 'n3', toPin: 0},
      {id: 'ro-3', fromNodeId: 'n3', toNodeId: 'n1', toPin: 0},
      {id: 'ro-4', fromNodeId: 'n3', toNodeId: 'led-osc', toPin: 0},
    ],
  },
];
