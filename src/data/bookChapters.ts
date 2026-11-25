import type {BookChapter} from '../types/circuit';

export const BOOK_CHAPTERS: BookChapter[] = [
  {
    id: 'cover',
    orderLabel: '表紙',
    shortTitle: '表紙',
    title: 'COMPUTER ENGINEERING FOR BABIES',
    subtitle: '二重否定 (NOT → NOT)',
    booleanExpr: 'OUT = NOT(NOT(A)) = A',
    boardBg: '#F8F8F6',
    boardTextColor: '#181A1F',
    boardTraceColor: '#1F2937',
    pcbPattern: 'none',
    ledColor: 'amber',
    description:
      '本の表紙に描かれた回路です。1つの黄色いボタンが2つのNOTゲート（インバータ）を直列に通ってLEDにつながっています。',
    electricalNote:
      'ボタンがOFF(0)のとき、1つ目のNOTでON(1)に反転し、2つ目のNOTで再びOFF(0)に戻ります。ボタンを押すと0→1→0が反転して1→0→1となり、LEDが点灯します。',
    realWorldExample:
      'デジタル回路では信号の遅延調整や波形整形を行う「バッファ回路」と同じ働きをします。',
    inputDefs: [
      {
        id: 'btn-a',
        label: 'A',
        color: 'yellow',
        shortcut: '1',
        initialValue: 0,
      },
    ],
    nodes: [
      {id: 'btn-a', type: 'BUTTON', label: 'A', x: 110, y: 180, value: 0, buttonColor: 'yellow', shortcut: '1'},
      {id: 'not-1', type: 'NOT', label: 'NOT 1', x: 290, y: 180, value: 1},
      {id: 'not-2', type: 'NOT', label: 'NOT 2', x: 450, y: 180, value: 0},
      {id: 'led-out', type: 'LED', label: 'LED', x: 630, y: 180, value: 0, ledColor: 'amber'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-a', toNodeId: 'not-1', toPin: 0},
      {id: 'w2', fromNodeId: 'not-1', toNodeId: 'not-2', toPin: 0},
      {id: 'w3', fromNodeId: 'not-2', toNodeId: 'led-out', toPin: 0},
    ],
    truthTableHeaders: ['ボタン A', 'NOT 1', 'LED (OUT)'],
    truthTableRows: [
      {values: [0, 1, 0], note: '二重反転で元の0に戻る'},
      {values: [1, 0, 1], note: '二重反転で元の1になる'},
    ],
  },
  {
    id: 'wire',
    orderLabel: '第1章',
    shortTitle: '1. WIRE',
    title: 'WIRE',
    subtitle: '導線 — 入力をそのまま伝える',
    booleanExpr: 'OUT = A',
    boardBg: '#C83416',
    boardTextColor: '#FFFFFF',
    boardTraceColor: '#18181B',
    pcbPattern: 'none',
    ledColor: 'amber',
    description:
      'もっとも基本となる「導線（WIRE）」です。ボタンを押している間だけ電気が流れ、そのままLEDが点灯します。',
    electricalNote:
      'スイッチが閉じると電源(5V / 論理値1)が銅線パターンを通ってLEDに流れ、GND(⏚)へ抜けることで光ります。',
    realWorldExample:
      '懐中電灯のスイッチや部屋の照明スイッチなど、すべての電気回路の出発点です。',
    inputDefs: [
      {
        id: 'btn-a',
        label: 'A',
        color: 'yellow',
        shortcut: '1',
        initialValue: 0,
      },
    ],
    nodes: [
      {id: 'btn-a', type: 'BUTTON', label: 'A', x: 130, y: 180, value: 0, buttonColor: 'yellow', shortcut: '1'},
      {id: 'wire-1', type: 'WIRE', label: 'WIRE', x: 370, y: 180, value: 0},
      {id: 'led-out', type: 'LED', label: 'LED', x: 600, y: 180, value: 0, ledColor: 'amber'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-a', toNodeId: 'wire-1', toPin: 0},
      {id: 'w2', fromNodeId: 'wire-1', toNodeId: 'led-out', toPin: 0},
    ],
    truthTableHeaders: ['ボタン A', 'LED (OUT)'],
    truthTableRows: [
      {values: [0, 0], note: 'OFFのときは光らない'},
      {values: [1, 1], note: '押すとそのまま光る'},
    ],
  },
  {
    id: 'not',
    orderLabel: '第2章',
    shortTitle: '2. NOT',
    title: 'NOT',
    subtitle: '否定ゲート (インバータ) — 信号を反転する',
    booleanExpr: 'OUT = Ā (NOT A)',
    boardBg: '#46ACD8',
    boardTextColor: '#111827',
    boardTraceColor: '#111827',
    pcbPattern: 'light',
    ledColor: 'blue',
    description:
      '信号を「逆さま」にするゲートです。ボタンを押していないときに青いLEDが光り、押すと消えます。',
    electricalNote:
      '三角形の先端にある小さな丸（バブル ○）が「反転」を表します。入力0を1(HIGH)に、入力1を0(LOW)に変換します。',
    realWorldExample:
      '冷蔵庫のドアスイッチ（ドアが開くとボタンが離れて庫内灯が点く）などに使われる考え方です。',
    inputDefs: [
      {
        id: 'btn-a',
        label: 'A',
        color: 'yellow',
        shortcut: '1',
        initialValue: 0,
      },
    ],
    nodes: [
      {id: 'btn-a', type: 'BUTTON', label: 'A', x: 140, y: 180, value: 0, buttonColor: 'yellow', shortcut: '1'},
      {id: 'not-1', type: 'NOT', label: 'NOT', x: 370, y: 180, value: 1},
      {id: 'led-out', type: 'LED', label: 'LED', x: 600, y: 180, value: 1, ledColor: 'blue'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-a', toNodeId: 'not-1', toPin: 0},
      {id: 'w2', fromNodeId: 'not-1', toNodeId: 'led-out', toPin: 0},
    ],
    truthTableHeaders: ['ボタン A', 'LED (OUT)'],
    truthTableRows: [
      {values: [0, 1], note: '押していないと点灯 (1)'},
      {values: [1, 0], note: '押すと反転して消灯 (0)'},
    ],
  },
  {
    id: 'or',
    orderLabel: '第3章',
    shortTitle: '3. OR',
    title: 'OR',
    subtitle: '論理和ゲート — どちらか1つでもONなら点く',
    booleanExpr: 'OUT = A + B (A OR B)',
    boardBg: '#C8194E',
    boardTextColor: '#FFFFFF',
    boardTraceColor: '#18181B',
    pcbPattern: 'light',
    ledColor: 'amber',
    description:
      '赤と黄色の2つのボタンのうち、「どちらか一方」または「両方」を押したときにLEDが点灯します。',
    electricalNote:
      '電気的には2つのスイッチを「並列」につないだ回路と同じ振る舞いをし、どちらのルートからでも出力へ電流が流れます。',
    realWorldExample:
      '玄関と裏口の両方にある呼び鈴ボタン。どちらを押しても同じチャイムが鳴ります。',
    inputDefs: [
      {id: 'btn-a', label: 'A (赤)', color: 'red', shortcut: '1', initialValue: 0},
      {id: 'btn-b', label: 'B (黄)', color: 'yellow', shortcut: '2', initialValue: 0},
    ],
    nodes: [
      {id: 'btn-a', type: 'BUTTON', label: 'A', x: 130, y: 115, value: 0, buttonColor: 'red', shortcut: '1'},
      {id: 'btn-b', type: 'BUTTON', label: 'B', x: 130, y: 245, value: 0, buttonColor: 'yellow', shortcut: '2'},
      {id: 'or-1', type: 'OR', label: 'OR', x: 380, y: 180, value: 0},
      {id: 'led-out', type: 'LED', label: 'LED', x: 610, y: 180, value: 0, ledColor: 'amber'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-a', toNodeId: 'or-1', toPin: 0},
      {id: 'w2', fromNodeId: 'btn-b', toNodeId: 'or-1', toPin: 1},
      {id: 'w3', fromNodeId: 'or-1', toNodeId: 'led-out', toPin: 0},
    ],
    truthTableHeaders: ['A (赤)', 'B (黄)', 'LED (OUT)'],
    truthTableRows: [
      {values: [0, 0, 0], note: 'どちらもOFF → 消灯'},
      {values: [0, 1, 1], note: 'BのみON → 点灯'},
      {values: [1, 0, 1], note: 'AのみON → 点灯'},
      {values: [1, 1, 1], note: '両方ON → 点灯'},
    ],
  },
  {
    id: 'and',
    orderLabel: '第4章',
    shortTitle: '4. AND',
    title: 'AND',
    subtitle: '論理積ゲート — 両方ONのときだけ点く',
    booleanExpr: 'OUT = A · B (A AND B)',
    boardBg: '#E6B619',
    boardTextColor: '#18181B',
    boardTraceColor: '#18181B',
    pcbPattern: 'light',
    ledColor: 'amber',
    description:
      '赤と黄色の2つのボタンを「両方同時に」押したときだけLEDが点灯します。片方だけでは光りません。',
    electricalNote:
      '電気的には2つのスイッチを「直列」につないだ回路と同じで、2つの条件がともに揃って初めて出力がHIGH(1)になります。',
    realWorldExample:
      '電子レンジの「扉が閉まっている」AND「スタートボタンが押された」ときだけ加熱が始まる安全装置。',
    inputDefs: [
      {id: 'btn-a', label: 'A (赤)', color: 'red', shortcut: '1', initialValue: 0},
      {id: 'btn-b', label: 'B (黄)', color: 'yellow', shortcut: '2', initialValue: 0},
    ],
    nodes: [
      {id: 'btn-a', type: 'BUTTON', label: 'A', x: 130, y: 115, value: 0, buttonColor: 'red', shortcut: '1'},
      {id: 'btn-b', type: 'BUTTON', label: 'B', x: 130, y: 245, value: 0, buttonColor: 'yellow', shortcut: '2'},
      {id: 'and-1', type: 'AND', label: 'AND', x: 380, y: 180, value: 0},
      {id: 'led-out', type: 'LED', label: 'LED', x: 610, y: 180, value: 0, ledColor: 'amber'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-a', toNodeId: 'and-1', toPin: 0},
      {id: 'w2', fromNodeId: 'btn-b', toNodeId: 'and-1', toPin: 1},
      {id: 'w3', fromNodeId: 'and-1', toNodeId: 'led-out', toPin: 0},
    ],
    truthTableHeaders: ['A (赤)', 'B (黄)', 'LED (OUT)'],
    truthTableRows: [
      {values: [0, 0, 0], note: 'どちらもOFF → 消灯'},
      {values: [0, 1, 0], note: '片方のみ → 消灯'},
      {values: [1, 0, 0], note: '片方のみ → 消灯'},
      {values: [1, 1, 1], note: '両方ON → 点灯'},
    ],
  },
  {
    id: 'xor',
    orderLabel: '第5章',
    shortTitle: '5. XOR',
    title: 'XOR',
    subtitle: '排他的論理和 — 2つの入力が違うときだけ点く',
    booleanExpr: 'OUT = A ⊕ B (A XOR B)',
    boardBg: '#50AD47',
    boardTextColor: '#111827',
    boardTraceColor: '#111827',
    pcbPattern: 'light',
    ledColor: 'white',
    description:
      '赤と黄色のうち「どちらか片方だけ」を押したときにLEDが光り、両方同時または両方OFFだと消灯します。',
    electricalNote:
      '2つの入力が「異なる(0と1)」か「同じ(0と0、1と1)」かを判定する比較器であり、コンピュータの足し算(半加算器)の1の位(Sum)そのものです。',
    realWorldExample:
      '階段の上と下の両方にスイッチがあり、どちらを操作しても照明のON/OFFが切り替わる3路スイッチ。',
    inputDefs: [
      {id: 'btn-a', label: 'A (赤)', color: 'red', shortcut: '1', initialValue: 0},
      {id: 'btn-b', label: 'B (黄)', color: 'yellow', shortcut: '2', initialValue: 0},
    ],
    nodes: [
      {id: 'btn-a', type: 'BUTTON', label: 'A', x: 130, y: 115, value: 0, buttonColor: 'red', shortcut: '1'},
      {id: 'btn-b', type: 'BUTTON', label: 'B', x: 130, y: 245, value: 0, buttonColor: 'yellow', shortcut: '2'},
      {id: 'xor-1', type: 'XOR', label: 'XOR', x: 380, y: 180, value: 0},
      {id: 'led-out', type: 'LED', label: 'LED', x: 610, y: 180, value: 0, ledColor: 'white'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-a', toNodeId: 'xor-1', toPin: 0},
      {id: 'w2', fromNodeId: 'btn-b', toNodeId: 'xor-1', toPin: 1},
      {id: 'w3', fromNodeId: 'xor-1', toNodeId: 'led-out', toPin: 0},
    ],
    truthTableHeaders: ['A (赤)', 'B (黄)', 'LED (OUT)'],
    truthTableRows: [
      {values: [0, 0, 0], note: '同じ (0=0) → 消灯'},
      {values: [0, 1, 1], note: '異なる (0≠1) → 点灯'},
      {values: [1, 0, 1], note: '異なる (1≠0) → 点灯'},
      {values: [1, 1, 0], note: '同じ (1=1) → 消灯'},
    ],
  },
  {
    id: 'latch',
    orderLabel: '第6章',
    shortTitle: '6. LATCH',
    title: 'LATCH',
    subtitle: '記憶回路 (SRラッチ) — 状態を1ビット記憶する',
    booleanExpr: 'Q = (SET + Q) · RESET̄',
    boardBg: '#36301F',
    boardTextColor: '#FDE047',
    boardTraceColor: '#F5F5F4',
    pcbPattern: 'dark',
    ledColor: 'white',
    isSequential: true,
    description:
      'コンピュータが「記憶(メモリ)」を持つための基本回路です。黄色のSETを押すとLEDが点灯し、指を離しても光り続けます。赤のRESETを押すと記憶が消えて消灯します。',
    electricalNote:
      '出力LEDへつながる線がORゲートの入力へ「フィードバック（帰還）」しているため、SETを離しても自分自身の1をORゲート経由で保ち続けます。',
    realWorldExample:
      'CPU内部のレジスタやSRAM、電源ボタンのワンタッチ保持など、1ビットの記憶装置の基本構造です。',
    inputDefs: [
      {id: 'btn-reset', label: 'RESET', subLabel: '消去 (赤)', color: 'red', shortcut: '1', initialValue: 0},
      {id: 'btn-set', label: 'SET', subLabel: '記憶 (黄)', color: 'yellow', shortcut: '2', initialValue: 0},
    ],
    nodes: [
      {id: 'btn-reset', type: 'BUTTON', label: 'RESET', x: 100, y: 110, value: 0, buttonColor: 'red', shortcut: '1'},
      {id: 'btn-set', type: 'BUTTON', label: 'SET', x: 100, y: 260, value: 0, buttonColor: 'yellow', shortcut: '2'},
      {id: 'not-reset', type: 'NOT', label: 'NOT', x: 250, y: 110, value: 1},
      {id: 'or-hold', type: 'OR', label: 'OR', x: 340, y: 245, value: 0},
      {id: 'and-out', type: 'AND', label: 'AND', x: 500, y: 180, value: 0},
      {id: 'led-out', type: 'LED', label: 'Q (LED)', x: 645, y: 180, value: 0, ledColor: 'white'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-reset', toNodeId: 'not-reset', toPin: 0},
      {id: 'w2', fromNodeId: 'not-reset', toNodeId: 'and-out', toPin: 0},
      {id: 'w3', fromNodeId: 'btn-set', toNodeId: 'or-hold', toPin: 1},
      {id: 'w4', fromNodeId: 'or-hold', toNodeId: 'and-out', toPin: 1},
      {id: 'w5', fromNodeId: 'and-out', toNodeId: 'led-out', toPin: 0},
      {id: 'w6', fromNodeId: 'and-out', toNodeId: 'or-hold', toPin: 0},
    ],
    truthTableHeaders: ['RESET', 'SET', '記憶出力 Q'],
    truthTableRows: [
      {values: [0, 0, 0], note: '保持 (直前の状態を維持)'},
      {values: [0, 1, 1], note: 'SET → 1を記憶して点灯'},
      {values: [1, 0, 0], note: 'RESET → 記憶を消去して消灯'},
      {values: [1, 1, 0], note: 'RESET優先 → 0にリセット'},
    ],
  },
  {
    id: 'back',
    orderLabel: '裏表紙',
    shortTitle: '裏表紙',
    title: 'DOORBELL LOGIC',
    subtitle: '応用例 — 玄関と裏口のドアベル',
    booleanExpr: 'BELL = FRONT_DOOR + BACK_DOOR',
    boardBg: '#C4281C',
    boardTextColor: '#FFFFFF',
    boardTraceColor: '#18181B',
    pcbPattern: 'none',
    ledColor: 'amber',
    description:
      '本の裏表紙に書かれた身近な応用例です。「玄関のスイッチ」と「裏口のスイッチ」をORゲートでつなぎ、どちらが押されてもチャイム(LED)が鳴るように設計します。',
    electricalNote:
      'コンピュータの複雑な処理も、このように小さな「1と0のスイッチ」と「論理ゲート」を何十億個も組み合わせることで動いています。',
    realWorldExample:
      '住宅の呼び鈴システムや、複数のセンサーから1つのアラームを鳴らす監視回路。',
    inputDefs: [
      {id: 'btn-a', label: '玄関', subLabel: 'Front Door', color: 'red', shortcut: '1', initialValue: 0},
      {id: 'btn-b', label: '裏口', subLabel: 'Back Door', color: 'yellow', shortcut: '2', initialValue: 0},
    ],
    nodes: [
      {id: 'btn-a', type: 'BUTTON', label: '玄関', x: 130, y: 115, value: 0, buttonColor: 'red', shortcut: '1'},
      {id: 'btn-b', type: 'BUTTON', label: '裏口', x: 130, y: 245, value: 0, buttonColor: 'yellow', shortcut: '2'},
      {id: 'or-1', type: 'OR', label: 'OR', x: 380, y: 180, value: 0},
      {id: 'led-out', type: 'LED', label: 'チャイム', x: 610, y: 180, value: 0, ledColor: 'amber'},
    ],
    wires: [
      {id: 'w1', fromNodeId: 'btn-a', toNodeId: 'or-1', toPin: 0},
      {id: 'w2', fromNodeId: 'btn-b', toNodeId: 'or-1', toPin: 1},
      {id: 'w3', fromNodeId: 'or-1', toNodeId: 'led-out', toPin: 0},
    ],
    truthTableHeaders: ['玄関', '裏口', 'チャイム'],
    truthTableRows: [
      {values: [0, 0, 0], note: '誰も押していない'},
      {values: [0, 1, 1], note: '裏口で来客通知'},
      {values: [1, 0, 1], note: '玄関で来客通知'},
      {values: [1, 1, 1], note: '両方で来客通知'},
    ],
  },
];
