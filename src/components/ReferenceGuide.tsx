import React, {useState} from 'react';
import type {GateKind} from '../types/circuit';
import {GateSymbolSvg} from './GateSymbolSvg';

interface GateReferenceItem {
  kind: GateKind;
  name: string;
  formula: string;
  rule: string;
  analogy: string;
}

const GATE_REFERENCE: GateReferenceItem[] = [
  {
    kind: 'WIRE',
    name: 'WIRE (導線 / バッファ)',
    formula: 'Y = A',
    rule: '入力が1なら1、0なら0をそのまま出力します。',
    analogy: '1本のスイッチをLEDに直結した基本回路。',
  },
  {
    kind: 'NOT',
    name: 'NOT (否定 / インバータ)',
    formula: 'Y = Ā',
    rule: '入力を反転します (0→1、1→0)。先端の○が反転記号です。',
    analogy: '押すと切れるブレーク接点（常閉スイッチ）と同じ動作。',
  },
  {
    kind: 'OR',
    name: 'OR (論理和)',
    formula: 'Y = A + B',
    rule: '入力のどちらか1つ以上が1のとき出力が1になります。',
    analogy: '2つのスイッチを並列につないだ回路（玄関と裏口のベル）。',
  },
  {
    kind: 'AND',
    name: 'AND (論理積)',
    formula: 'Y = A · B',
    rule: '入力が両方とも1のときだけ出力が1になります。',
    analogy: '2つのスイッチを直列につないだ回路（安全ロック）。',
  },
  {
    kind: 'XOR',
    name: 'XOR (排他的論理和)',
    formula: 'Y = A ⊕ B',
    rule: '2つの入力が互いに異なるとき(0と1)だけ1になります。',
    analogy: '2進数の足し算の1の位・階段の3路スイッチ。',
  },
  {
    kind: 'NAND',
    name: 'NAND (否定論理積)',
    formula: 'Y = NOT(A · B)',
    rule: 'ANDの逆。両方1のときだけ0、それ以外は1になります。',
    analogy: 'このゲートだけであらゆる論理回路を作れる「万能ゲート」。',
  },
  {
    kind: 'NOR',
    name: 'NOR (否定論理和)',
    formula: 'Y = NOT(A + B)',
    rule: 'ORの逆。両方0のときだけ1になります。',
    analogy: 'NANDと並ぶもう1つの万能ゲート。メモリ回路にも使われます。',
  },
  {
    kind: 'XNOR',
    name: 'XNOR (一致ゲート)',
    formula: 'Y = NOT(A ⊕ B)',
    rule: '2つの入力が同じ値(0と0、1と1)のときだけ1になります。',
    analogy: 'パスワードやビット値が一致しているかを判定する比較回路。',
  },
];

interface QuizItem {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_ITEMS: QuizItem[] = [
  {
    id: 'q1',
    question: 'ボタンを押していないのに青いLEDが点灯し、押すと消えるゲートはどれでしょう？',
    choices: ['WIRE', 'NOT', 'AND', 'OR'],
    correctIndex: 1,
    explanation: 'NOTゲート（インバータ）は0を1に、1を0に反転させるため、入力0のときにLEDが点灯します。',
  },
  {
    id: 'q2',
    question: '「玄関のボタン」と「裏口のボタン」のどちらを押してもチャイムを鳴らすにはどのゲートを使いますか？',
    choices: ['AND', 'XOR', 'OR', 'NOT'],
    correctIndex: 2,
    explanation: 'Computer Engineering for Babiesの裏表紙の例です。どちらか一方でもONなら1を出力するORゲートを使います。',
  },
  {
    id: 'q3',
    question: '2進数の足し算 (半加算器) で「1の位 (Sum)」を計算するのに使われるゲートはどれですか？',
    choices: ['XOR', 'AND', 'NAND', 'NOR'],
    correctIndex: 0,
    explanation: '0+0=0, 0+1=1, 1+0=1, 1+1=0(桁上がり)となるため、入力が異なるときだけ1になるXORがSumに一致します。',
  },
  {
    id: 'q4',
    question: '第6章のLATCH(記憶回路)が、SETボタンを離しても1を保ち続けられる理由は何ですか？',
    choices: [
      'LEDの電池が余っているから',
      '出力の信号がORゲートへフィードバック(帰還)しているから',
      'ANDゲートが2つ直列につながっているから',
      'RESETボタンが壊れているから',
    ],
    correctIndex: 1,
    explanation: '出力がORゲートの片方の入力に戻っているため、RESETが押されるまで自分自身の1を維持し続けます。',
  },
];

interface ReferenceGuideProps {
  onJumpToChapter: (chapterId: string) => void;
}

export const ReferenceGuide: React.FC<ReferenceGuideProps> = ({
  onJumpToChapter,
}) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  return (
    <div className="space-y-8">
      {/* Gate Reference Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              論理ゲート記号・電気的性質リファレンス
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              各ゲートのMIL/ANSI標準記号、論理式、スイッチ回路としてのイメージを一覧できます。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onJumpToChapter('cover')}
            className="text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline cursor-pointer"
          >
            絵本モードに戻って試す
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {GATE_REFERENCE.map((item) => (
            <div
              key={item.kind}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono-tabular text-xs font-semibold text-slate-500">
                    {item.formula}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg py-3 flex items-center justify-center mb-3">
                  <GateSymbolSvg
                    kind={item.kind}
                    strokeColor="#0F172A"
                    fillColor="#FFFFFF"
                    className="w-24 h-14"
                  />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.rule}
                </p>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100 leading-relaxed">
                電気のたとえ: {item.analogy}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Quiz Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            理解度チェッククイズ
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            絵本モードで動かした回路の仕組みを振り返ってみましょう。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUIZ_ITEMS.map((q, idx) => {
            const chosen = answers[q.id];
            const isAnswered = chosen !== undefined;
            const isCorrect = chosen === q.correctIndex;

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <div className="text-xs font-mono-tabular text-slate-500">
                  問題 0{idx + 1}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                  {q.question}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.choices.map((choice, cIdx) => {
                    const selected = chosen === cIdx;
                    let style =
                      'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
                    if (isAnswered) {
                      if (cIdx === q.correctIndex) {
                        style =
                          'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                      } else if (selected) {
                        style =
                          'border-rose-400 bg-rose-50 text-rose-900';
                      }
                    }

                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({...prev, [q.id]: cIdx}))
                        }
                        className={`px-3 py-2 rounded-lg border text-xs text-left transition-colors cursor-pointer ${style}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  <p
                    className={`text-xs leading-relaxed pt-2 border-t border-slate-100 ${
                      isCorrect ? 'text-emerald-800' : 'text-slate-700'
                    }`}
                  >
                    <strong>{isCorrect ? '正解: ' : '解説: '}</strong>
                    {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
