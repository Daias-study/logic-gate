import {jsPDF} from 'jspdf';
import type {CircuitNode, CircuitWire, GateKind} from '../types/circuit';
import {computeAutoTruthTable, isInputNode, isSingleInputNode} from './simulator';

const SHEET_W = 1754; // A4 Landscape proportional vector space (~150dpi base)
const SHEET_H = 1240;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function assignReferenceDesignators(
  nodes: CircuitNode[]
): Map<string, string> {
  const map = new Map<string, string>();
  let swCount = 0;
  let clkCount = 0;
  let uCount = 0;
  let dCount = 0;

  for (const n of nodes) {
    if (n.type === 'BUTTON' || n.type === 'SWITCH') {
      swCount += 1;
      map.set(n.id, `SW${swCount}`);
    } else if (n.type === 'CLOCK') {
      clkCount += 1;
      map.set(n.id, `X${clkCount}`);
    } else if (n.type === 'LED') {
      dCount += 1;
      map.set(n.id, `D${dCount}`);
    } else {
      uCount += 1;
      map.set(n.id, `U${uCount}`);
    }
  }
  return map;
}

function renderGateSymbolXml(
  kind: GateKind,
  cx: number,
  cy: number,
  designator: string,
  label: string
): string {
  // Symbol occupies roughly 96x60 centered at (cx, cy)
  const ox = cx - 48;
  const oy = cy - 30;
  const stroke = '#0F172A';
  const sw = 2.4;

  let body = '';
  if (kind === 'WIRE') {
    body = `
      <line x1="0" y1="30" x2="26" y2="30" stroke="${stroke}" stroke-width="${sw}" />
      <polygon points="26,12 26,48 66,30" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />
      <line x1="66" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />
    `;
  } else if (kind === 'NOT') {
    body = `
      <line x1="0" y1="30" x2="24" y2="30" stroke="${stroke}" stroke-width="${sw}" />
      <polygon points="24,10 24,50 64,30" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />
      <circle cx="70" cy="30" r="5.5" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" />
      <line x1="75.5" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />
    `;
  } else if (kind === 'AND' || kind === 'NAND') {
    const bubble = kind === 'NAND';
    body = `
      <line x1="0" y1="18" x2="24" y2="18" stroke="${stroke}" stroke-width="${sw}" />
      <line x1="0" y1="42" x2="24" y2="42" stroke="${stroke}" stroke-width="${sw}" />
      <path d="M 24 8 L 48 8 A 22 22 0 0 1 48 52 L 24 52 Z" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />
      ${
        bubble
          ? `<circle cx="76" cy="30" r="5.5" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" />
             <line x1="81.5" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />`
          : `<line x1="70" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />`
      }
    `;
  } else if (kind === 'OR' || kind === 'NOR') {
    const bubble = kind === 'NOR';
    body = `
      <line x1="0" y1="18" x2="29" y2="18" stroke="${stroke}" stroke-width="${sw}" />
      <line x1="0" y1="42" x2="29" y2="42" stroke="${stroke}" stroke-width="${sw}" />
      <path d="M 22 8 Q 34 30 22 52 Q 52 52 72 30 Q 52 8 22 8 Z" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />
      ${
        bubble
          ? `<circle cx="78" cy="30" r="5.5" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" />
             <line x1="83.5" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />`
          : `<line x1="72" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />`
      }
    `;
  } else {
    // XOR / XNOR
    const bubble = kind === 'XNOR';
    body = `
      <line x1="0" y1="18" x2="23" y2="18" stroke="${stroke}" stroke-width="${sw}" />
      <line x1="0" y1="42" x2="23" y2="42" stroke="${stroke}" stroke-width="${sw}" />
      <path d="M 18 8 Q 30 30 18 52" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" />
      <path d="M 26 8 Q 38 30 26 52 Q 54 52 74 30 Q 54 8 26 8 Z" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />
      ${
        bubble
          ? `<circle cx="80" cy="30" r="5.5" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" />
             <line x1="85.5" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />`
          : `<line x1="74" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />`
      }
    `;
  }

  const pinText = isSingleInputNode(kind)
    ? `<text x="6" y="25" font-size="9" font-family="IBM Plex Mono, monospace" fill="#475569">1</text>`
    : `<text x="6" y="13" font-size="9" font-family="IBM Plex Mono, monospace" fill="#475569">1</text>
       <text x="6" y="37" font-size="9" font-family="IBM Plex Mono, monospace" fill="#475569">2</text>`;

  return `
    <g transform="translate(${ox}, ${oy})">
      ${body}
      ${pinText}
      <text x="86" y="25" font-size="9" font-family="IBM Plex Mono, monospace" fill="#475569">Y</text>
      <text x="48" y="-5" text-anchor="middle" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace" fill="#0F172A">${escapeXml(designator)}</text>
      <text x="48" y="68" text-anchor="middle" font-size="11" font-family="Noto Sans JP, sans-serif" fill="#334155">${escapeXml(label)}</text>
    </g>
  `;
}

function renderInputSymbolXml(
  node: CircuitNode,
  cx: number,
  cy: number,
  designator: string
): string {
  const ox = cx - 48;
  const oy = cy - 30;
  const stroke = '#0F172A';
  const sw = 2.4;

  let glyph = '';
  if (node.type === 'BUTTON') {
    // Momentary pushbutton schematic symbol (JIS/IEEE)
    glyph = `
      <text x="4" y="34" font-size="10" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#334155">VCC</text>
      <line x1="28" y1="30" x2="36" y2="30" stroke="${stroke}" stroke-width="${sw}" />
      <circle cx="38" cy="30" r="3" fill="#FFFFFF" stroke="${stroke}" stroke-width="2" />
      <circle cx="68" cy="30" r="3" fill="#FFFFFF" stroke="${stroke}" stroke-width="2" />
      <line x1="38" y1="21" x2="68" y2="21" stroke="${stroke}" stroke-width="2.6" />
      <line x1="53" y1="10" x2="53" y2="21" stroke="${stroke}" stroke-width="2" />
      <line x1="45" y1="10" x2="61" y2="10" stroke="${stroke}" stroke-width="2" />
      <line x1="71" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />
    `;
  } else if (node.type === 'SWITCH') {
    // SPST toggle switch symbol
    glyph = `
      <text x="4" y="34" font-size="10" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#334155">VCC</text>
      <line x1="28" y1="30" x2="36" y2="30" stroke="${stroke}" stroke-width="${sw}" />
      <circle cx="38" cy="30" r="3" fill="#FFFFFF" stroke="${stroke}" stroke-width="2" />
      <line x1="40" y1="28" x2="66" y2="16" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="68" cy="30" r="3" fill="#FFFFFF" stroke="${stroke}" stroke-width="2" />
      <line x1="71" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />
    `;
  } else {
    // CLOCK square wave generator block
    glyph = `
      <rect x="20" y="10" width="52" height="40" rx="3" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" />
      <path d="M 30 36 L 36 36 L 36 24 L 46 24 L 46 36 L 56 36 L 56 24 L 62 24" fill="none" stroke="${stroke}" stroke-width="2" />
      <line x1="72" y1="30" x2="96" y2="30" stroke="${stroke}" stroke-width="${sw}" />
    `;
  }

  return `
    <g transform="translate(${ox}, ${oy})">
      ${glyph}
      <text x="48" y="-4" text-anchor="middle" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace" fill="#0F172A">${escapeXml(designator)}</text>
      <text x="48" y="66" text-anchor="middle" font-size="11" font-family="Noto Sans JP, sans-serif" fill="#334155">${escapeXml(node.label)}</text>
    </g>
  `;
}

function renderLedSymbolXml(
  node: CircuitNode,
  cx: number,
  cy: number,
  designator: string
): string {
  const ox = cx - 48;
  const oy = cy - 30;
  const stroke = '#0F172A';
  const sw = 2.4;

  // Standard LED diode schematic symbol + optical arrows + GND
  return `
    <g transform="translate(${ox}, ${oy})">
      <line x1="0" y1="30" x2="28" y2="30" stroke="${stroke}" stroke-width="${sw}" />
      <polygon points="28,16 28,44 54,30" fill="#FFFFFF" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" />
      <line x1="54" y1="15" x2="54" y2="45" stroke="${stroke}" stroke-width="2.6" />
      <!-- Light emission arrows -->
      <line x1="42" y1="12" x2="51" y2="3" stroke="${stroke}" stroke-width="1.8" />
      <polygon points="51,3 45,4 50,9" fill="${stroke}" />
      <line x1="51" y1="14" x2="60" y2="5" stroke="${stroke}" stroke-width="1.8" />
      <polygon points="60,5 54,6 59,11" fill="${stroke}" />
      <!-- Ground connection -->
      <line x1="54" y1="30" x2="72" y2="30" stroke="${stroke}" stroke-width="${sw}" />
      <line x1="72" y1="30" x2="72" y2="46" stroke="${stroke}" stroke-width="${sw}" />
      <line x1="60" y1="46" x2="84" y2="46" stroke="${stroke}" stroke-width="2.4" />
      <line x1="64" y1="51" x2="80" y2="51" stroke="${stroke}" stroke-width="2.2" />
      <line x1="68" y1="56" x2="76" y2="56" stroke="${stroke}" stroke-width="2" />
      <text x="48" y="-4" text-anchor="middle" font-size="11" font-weight="700" font-family="IBM Plex Mono, monospace" fill="#0F172A">${escapeXml(designator)}</text>
      <text x="44" y="72" text-anchor="middle" font-size="11" font-family="Noto Sans JP, sans-serif" fill="#334155">${escapeXml(node.label)}</text>
    </g>
  `;
}

function buildSchematicSvgString(
  title: string,
  nodes: CircuitNode[],
  wires: CircuitWire[],
  base64UrlToken: string
): string {
  const designators = assignReferenceDesignators(nodes);
  const nodesById = new Map<string, CircuitNode>();
  nodes.forEach((n) => nodesById.set(n.id, n));

  // Drawing border margins
  const borderLeft = 36;
  const borderTop = 36;
  const borderRight = SHEET_W - 36;
  const borderBottom = SHEET_H - 36;

  // Main schematic viewport (left 1160px, full inner height)
  const schX = borderLeft + 24;
  const schY = borderTop + 28;
  const schW = 1130;
  const schH = borderBottom - borderTop - 56;

  // Right engineering sidebar (BOM + Truth Table + Title Block)
  const sideX = schX + schW + 18;
  const sideW = borderRight - sideX - 14;

  // Map circuit node coordinates into the schematic viewport with generous padding
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 820;
    minY = 0;
    maxY = 440;
  }

  const rawW = Math.max(260, maxX - minX + 180);
  const rawH = Math.max(180, maxY - minY + 140);
  const scale = Math.min(1.55, Math.min((schW - 100) / rawW, (schH - 100) / rawH));
  const rawCenterX = (minX + maxX) / 2;
  const rawCenterY = (minY + maxY) / 2;
  const viewCenterX = schX + schW / 2;
  const viewCenterY = schY + schH / 2;

  const mapPt = (x: number, y: number): {x: number; y: number} => ({
    x: viewCenterX + (x - rawCenterX) * scale,
    y: viewCenterY + (y - rawCenterY) * scale,
  });

  // Render orthogonal schematic wires + junction dots + net numbers
  const outWireCounts = new Map<string, number>();
  for (const w of wires) {
    outWireCounts.set(w.fromNodeId, (outWireCounts.get(w.fromNodeId) ?? 0) + 1);
  }

  let wiresXml = '';
  const drawnBranchDots = new Set<string>();

  wires.forEach((w, idx) => {
    const src = nodesById.get(w.fromNodeId);
    const dst = nodesById.get(w.toNodeId);
    if (!src || !dst) return;

    const sPos = mapPt(src.x, src.y);
    const dPos = mapPt(dst.x, dst.y);

    const startX = sPos.x + 48;
    const startY = sPos.y;
    const endX = dPos.x - 48;
    const endY = isSingleInputNode(dst.type)
      ? dPos.y
      : w.toPin === 1
        ? dPos.y + 12
        : dPos.y - 12;

    let d = '';
    const branchOffset = ((idx % 5) - 2) * 8;
    if (endX >= startX + 20) {
      const midX = Math.round((startX + endX) / 2) + branchOffset;
      d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    } else {
      // Feedback loop orthogonal route around bottom
      const stubOut = startX + 22;
      const stubIn = endX - 24;
      const loopY = Math.max(startY, endY) + 74 + (idx % 3) * 14;
      d = `M ${startX} ${startY} L ${stubOut} ${startY} L ${stubOut} ${loopY} L ${stubIn} ${loopY} L ${stubIn} ${endY} L ${endX} ${endY}`;
    }

    wiresXml += `<path d="${d}" fill="none" stroke="#0F172A" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round" />`;

    // Branch junction dot if source drives >1 wire
    if ((outWireCounts.get(w.fromNodeId) ?? 0) > 1 && !drawnBranchDots.has(w.fromNodeId)) {
      drawnBranchDots.add(w.fromNodeId);
      wiresXml += `<circle cx="${startX + 12}" cy="${startY}" r="3.8" fill="#0F172A" />`;
    }
  });

  // Render component symbols
  let symbolsXml = '';
  for (const n of nodes) {
    const pos = mapPt(n.x, n.y);
    const des = designators.get(n.id) ?? 'X';
    if (isInputNode(n.type)) {
      symbolsXml += renderInputSymbolXml(n, pos.x, pos.y, des);
    } else if (n.type === 'LED') {
      symbolsXml += renderLedSymbolXml(n, pos.x, pos.y, des);
    } else {
      symbolsXml += renderGateSymbolXml(n.type as GateKind, pos.x, pos.y, des, n.label);
    }
  }

  // Truth Table XML in right sidebar
  const tt = computeAutoTruthTable(nodes, wires);
  const ttTop = borderTop + 20;
  let truthTableXml = `
    <g transform="translate(${sideX}, ${ttTop})">
      <rect x="0" y="0" width="${sideW}" height="380" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.6" />
      <rect x="0" y="0" width="${sideW}" height="32" fill="#F1F5F9" stroke="#0F172A" stroke-width="1.6" />
      <text x="12" y="21" font-size="13" font-weight="700" font-family="Noto Sans JP, sans-serif" fill="#0F172A">真理値表 (TRUTH TABLE)</text>
  `;

  if (tt.rows.length > 0 && !tt.tooManyInputs) {
    const cols = [...tt.inputNodes.map((n) => n.label), ...tt.outputNodes.map((n) => n.label)];
    const colW = Math.min(82, (sideW - 24) / Math.max(1, cols.length));
    let rowY = 58;
    cols.forEach((c, ci) => {
      truthTableXml += `<text x="${16 + ci * colW}" y="${rowY}" font-size="11" font-weight="700" font-family="IBM Plex Mono, Noto Sans JP, sans-serif" fill="#0F172A">${escapeXml(c.slice(0, 7))}</text>`;
    });
    truthTableXml += `<line x1="12" y1="65" x2="${sideW - 12}" y2="65" stroke="#0F172A" stroke-width="1.2" />`;

    tt.rows.slice(0, 14).forEach((row, ri) => {
      const y = 84 + ri * 20;
      const vals = [...row.inputs, ...row.outputs];
      vals.forEach((v, vi) => {
        const isOut = vi >= row.inputs.length;
        truthTableXml += `<text x="${22 + vi * colW}" y="${y}" font-size="12" font-weight="${isOut && v === 1 ? '700' : '500'}" font-family="IBM Plex Mono, monospace" fill="${isOut && v === 1 ? '#0369A1' : '#334155'}">${v}</text>`;
      });
    });
  } else {
    const msg = tt.tooManyInputs
      ? '入力が5点以上のため省略 (最大4入力まで表示)'
      : '入力スイッチとLEDを含む組合せ回路で自動生成されます';
    truthTableXml += `<text x="14" y="64" font-size="11" font-family="Noto Sans JP, sans-serif" fill="#64748B">${escapeXml(msg)}</text>`;
  }
  truthTableXml += `</g>`;

  // Parts List / BOM XML
  const bomTop = ttTop + 396;
  const bomH = 370;
  let bomXml = `
    <g transform="translate(${sideX}, ${bomTop})">
      <rect x="0" y="0" width="${sideW}" height="${bomH}" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.6" />
      <rect x="0" y="0" width="${sideW}" height="32" fill="#F1F5F9" stroke="#0F172A" stroke-width="1.6" />
      <text x="12" y="21" font-size="13" font-weight="700" font-family="Noto Sans JP, sans-serif" fill="#0F172A">使用部品表 (PARTS LIST)</text>
      <text x="14" y="54" font-size="11" font-weight="700" font-family="IBM Plex Mono, sans-serif" fill="#475569">REF</text>
      <text x="86" y="54" font-size="11" font-weight="700" font-family="IBM Plex Mono, sans-serif" fill="#475569">TYPE</text>
      <text x="180" y="54" font-size="11" font-weight="700" font-family="Noto Sans JP, sans-serif" fill="#475569">名称</text>
      <line x1="12" y1="62" x2="${sideW - 12}" y2="62" stroke="#0F172A" stroke-width="1.2" />
  `;

  nodes.slice(0, 14).forEach((n, idx) => {
    const y = 82 + idx * 20;
    const des = designators.get(n.id) ?? '-';
    bomXml += `
      <text x="14" y="${y}" font-size="11" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#0F172A">${escapeXml(des)}</text>
      <text x="86" y="${y}" font-size="11" font-family="IBM Plex Mono, monospace" fill="#334155">${escapeXml(n.type)}</text>
      <text x="180" y="${y}" font-size="11" font-family="Noto Sans JP, sans-serif" fill="#334155">${escapeXml(n.label.slice(0, 16))}</text>
    `;
  });
  if (nodes.length > 14) {
    bomXml += `<text x="14" y="362" font-size="11" font-family="Noto Sans JP, sans-serif" fill="#64748B">ほか ${nodes.length - 14} 点</text>`;
  }
  bomXml += `</g>`;

  // Formal Engineering Title Block (表題欄) at bottom right
  const tbTop = bomTop + bomH + 16;
  const tbH = borderBottom - tbTop - 14;
  const nowStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const shortToken =
    base64UrlToken.length > 42
      ? `${base64UrlToken.slice(0, 22)}...${base64UrlToken.slice(-14)}`
      : base64UrlToken;

  const titleBlockXml = `
    <g transform="translate(${sideX}, ${tbTop})">
      <rect x="0" y="0" width="${sideW}" height="${tbH}" fill="#FFFFFF" stroke="#0F172A" stroke-width="2" />
      <line x1="0" y1="36" x2="${sideW}" y2="36" stroke="#0F172A" stroke-width="1.4" />
      <line x1="0" y1="118" x2="${sideW}" y2="118" stroke="#0F172A" stroke-width="1.4" />
      <line x1="0" y1="184" x2="${sideW}" y2="184" stroke="#0F172A" stroke-width="1.4" />
      <line x1="${sideW / 2}" y1="118" x2="${sideW / 2}" y2="184" stroke="#0F172A" stroke-width="1.4" />

      <text x="12" y="23" font-size="12" font-weight="700" font-family="Noto Sans JP, sans-serif" fill="#0F172A">JIS / IEEE 準拠 論理回路図面 (SCHEMATIC)</text>

      <text x="12" y="58" font-size="10" font-family="Noto Sans JP, sans-serif" fill="#64748B">図面名称 (TITLE)</text>
      <text x="12" y="88" font-size="20" font-weight="700" font-family="Noto Sans JP, sans-serif" fill="#0F172A">${escapeXml(title || '無題の論理回路')}</text>
      <text x="12" y="108" font-size="11" font-family="IBM Plex Mono, monospace" fill="#475569">STANDARD: IEEE Std 91 / ANSI Logic Symbols</text>

      <text x="12" y="138" font-size="10" font-family="Noto Sans JP, sans-serif" fill="#64748B">作成日 (DATE)</text>
      <text x="12" y="164" font-size="14" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#0F172A">${escapeXml(nowStr)}</text>

      <text x="${sideW / 2 + 12}" y="138" font-size="10" font-family="Noto Sans JP, sans-serif" fill="#64748B">部品 / 配線数</text>
      <text x="${sideW / 2 + 12}" y="164" font-size="14" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#0F172A">${nodes.length} pcs / ${wires.length} nets</text>

      <text x="12" y="206" font-size="10" font-family="Noto Sans JP, sans-serif" fill="#64748B">BASE64URL 復元データ (Logic Gate Lab 互換)</text>
      <text x="12" y="226" font-size="10" font-family="IBM Plex Mono, monospace" fill="#0F172A">${escapeXml(shortToken)}</text>
      <text x="12" y="${tbH - 16}" font-size="11" font-weight="600" font-family="Outfit, Noto Sans JP, sans-serif" fill="#334155">ISSUED BY Logic Gate Lab</text>
    </g>
  `;

  // Zone coordinate markers along outer drawing frame
  const cols = ['1', '2', '3', '4', '5', '6'];
  const rows = ['A', 'B', 'C', 'D'];
  let frameMarkersXml = '';
  cols.forEach((label, idx) => {
    const x = borderLeft + ((borderRight - borderLeft) / cols.length) * (idx + 0.5);
    frameMarkersXml += `<text x="${x}" y="25" text-anchor="middle" font-size="12" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#475569">${label}</text>`;
    frameMarkersXml += `<text x="${x}" y="${SHEET_H - 14}" text-anchor="middle" font-size="12" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#475569">${label}</text>`;
  });
  rows.forEach((label, idx) => {
    const y = borderTop + ((borderBottom - borderTop) / rows.length) * (idx + 0.5);
    frameMarkersXml += `<text x="20" y="${y}" text-anchor="middle" font-size="12" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#475569">${label}</text>`;
    frameMarkersXml += `<text x="${SHEET_W - 20}" y="${y}" text-anchor="middle" font-size="12" font-weight="600" font-family="IBM Plex Mono, monospace" fill="#475569">${label}</text>`;
  });

  // Subtle blueprint dot grid inside schematic viewport
  const gridPattern = `
    <defs>
      <pattern id="sch-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="12" r="0.9" fill="#CBD5E1" />
      </pattern>
    </defs>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${SHEET_H}" viewBox="0 0 ${SHEET_W} ${SHEET_H}">
  ${gridPattern}
  <rect x="0" y="0" width="${SHEET_W}" height="${SHEET_H}" fill="#FFFFFF" />
  <!-- Outer technical drawing frame -->
  <rect x="${borderLeft}" y="${borderTop}" width="${borderRight - borderLeft}" height="${borderBottom - borderTop}" fill="none" stroke="#0F172A" stroke-width="2.5" />
  <rect x="${borderLeft + 6}" y="${borderTop + 6}" width="${borderRight - borderLeft - 12}" height="${borderBottom - borderTop - 12}" fill="none" stroke="#0F172A" stroke-width="1" />
  ${frameMarkersXml}

  <!-- Schematic Viewport -->
  <rect x="${schX}" y="${schY}" width="${schW}" height="${schH}" fill="url(#sch-grid)" stroke="#94A3B8" stroke-width="1" />
  <text x="${schX + 14}" y="${schY + 22}" font-size="12" font-weight="700" font-family="Noto Sans JP, sans-serif" fill="#475569">回路図面 (CIRCUIT SCHEMATIC)</text>

  ${wiresXml}
  ${symbolsXml}
  ${truthTableXml}
  ${bomXml}
  ${titleBlockXml}
</svg>`;
}

/**
 * Generates and downloads an official A4 landscape engineering schematic PDF
 * containing the IEEE/JIS circuit diagram, orthogonal routing, truth table, BOM, and title block.
 */
export async function downloadCircuitSchematicPdf(
  title: string,
  nodes: CircuitNode[],
  wires: CircuitWire[],
  base64UrlToken: string
): Promise<void> {
  const svgString = buildSchematicSvgString(title, nodes, wires, base64UrlToken);
  const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('回路図SVGの描画に失敗しました。'));
      image.src = url;
    });

    // Render at crisp 2x resolution (~300 DPI for A4)
    const canvas = document.createElement('canvas');
    canvas.width = 2480;
    canvas.height = 1754;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('PDF描画用のCanvasコンテキストを取得できませんでした。');
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngDataUrl = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    pdf.addImage(pngDataUrl, 'PNG', 0, 0, 297, 210);

    // Embed Base64URL recovery data into PDF metadata properties as well
    pdf.setProperties({
      title: `${title || '論理回路図'} - Logic Gate Lab`,
      subject: `Logic Circuit Schematic (Base64URL: ${base64UrlToken.slice(0, 80)})`,
      creator: 'Logic Gate Lab',
    });

    const safeFileBase = (title || 'logic-circuit')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 40);
    pdf.save(`${safeFileBase || 'logic-circuit'}-schematic.pdf`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
