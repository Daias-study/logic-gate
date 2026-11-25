import {useCallback, useEffect, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import {BookBoardStage} from './components/BookBoardStage';
import {FreeBuildLab} from './components/FreeBuildLab';
import {ReferenceGuide} from './components/ReferenceGuide';
import {TruthTablePanel} from './components/TruthTablePanel';
import {BOOK_CHAPTERS} from './data/bookChapters';
import {PRESET_CIRCUITS} from './data/presetCircuits';
import type {CircuitNode, CircuitWire, LogicValue} from './types/circuit';
import {decodeCircuitFromBase64Url} from './utils/circuitCodec';
import {settleCircuit, stepCircuit} from './utils/simulator';
import {playStepTick, playTactileClick} from './utils/sound';

type AppView = 'book' | 'lab' | 'guide';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('book');
  const [chapterIndex, setChapterIndex] = useState<number>(1); // Start on Chapter 1 (WIRE) or Cover? Let's start on Cover (0) or Chapter 1; Cover is iconic, let's start at 0 (Cover) with instant chapter strip!
  const [buttonMode, setButtonMode] = useState<'toggle' | 'momentary'>('toggle');
  const [stepMode, setStepMode] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const currentChapter = BOOK_CHAPTERS[chapterIndex];

  // Book Mode circuit state (initialized from currentChapter)
  const [bookNodes, setBookNodes] = useState<CircuitNode[]>(() =>
    settleCircuit(
      BOOK_CHAPTERS[0].nodes.map((n) => ({...n})),
      BOOK_CHAPTERS[0].wires
    ).nodes
  );
  const [bookWires, setBookWires] = useState<CircuitWire[]>(() =>
    BOOK_CHAPTERS[0].wires.map((w) => ({...w}))
  );

  // Free-Build Lab state (defaults to Half Adder preset)
  const [labTitle, setLabTitle] = useState<string>(PRESET_CIRCUITS[0].name);
  const [labNodes, setLabNodes] = useState<CircuitNode[]>(() =>
    PRESET_CIRCUITS[0].nodes.map((n) => ({...n}))
  );
  const [labWires, setLabWires] = useState<CircuitWire[]>(() =>
    PRESET_CIRCUITS[0].wires.map((w) => ({...w}))
  );
  const [urlImportNotice, setUrlImportNotice] = useState<{
    kind: 'info' | 'error';
    text: string;
  } | null>(null);

  const loadChapter = useCallback((index: number) => {
    const safeIdx = Math.max(0, Math.min(BOOK_CHAPTERS.length - 1, index));
    const ch = BOOK_CHAPTERS[safeIdx];
    const clonedNodes = ch.nodes.map((n) => ({...n}));
    const clonedWires = ch.wires.map((w) => ({...w}));
    const settled = settleCircuit(clonedNodes, clonedWires);
    setChapterIndex(safeIdx);
    setBookNodes(settled.nodes);
    setBookWires(clonedWires);
  }, []);

  // Initialize on Cover (index 0) and restore shared ?circuit=BASE64URL if present
  useEffect(() => {
    loadChapter(0);

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawParam =
      params.get('circuit') ??
      (window.location.hash.startsWith('#circuit=')
        ? window.location.hash.slice('#circuit='.length)
        : null);

    if (rawParam) {
      try {
        const decoded = decodeCircuitFromBase64Url(rawParam);
        const settled = settleCircuit(decoded.nodes, decoded.wires);
        setLabTitle(decoded.title);
        setLabNodes(settled.nodes);
        setLabWires(decoded.wires);
        setActiveView('lab');
        setUrlImportNotice({
          kind: 'info',
          text: `共有URLから回路「${decoded.title}」（部品 ${decoded.nodes.length}点・配線 ${decoded.wires.length}本）を読み込みました。`,
        });
      } catch (err) {
        setActiveView('lab');
        setUrlImportNotice({
          kind: 'error',
          text:
            err instanceof Error
              ? `共有URLの読み込みに失敗しました: ${err.message}`
              : '共有URLの回路データを読み込めませんでした。',
        });
      }
    }
  }, [loadChapter]);

  const applyInputUpdate = useCallback(
    (updater: (nodes: CircuitNode[]) => CircuitNode[]) => {
      setBookNodes((prev) => {
        const updated = updater(prev);
        if (stepMode) {
          return updated;
        }
        return settleCircuit(updated, bookWires).nodes;
      });
    },
    [bookWires, stepMode]
  );

  const handleButtonPressStart = useCallback(
    (nodeId: string) => {
      playTactileClick(true, soundEnabled);
      applyInputUpdate((prev) =>
        prev.map((n) => (n.id === nodeId ? {...n, value: 1} : n))
      );
    },
    [applyInputUpdate, soundEnabled]
  );

  const handleButtonPressEnd = useCallback(
    (nodeId: string) => {
      playTactileClick(false, soundEnabled);
      applyInputUpdate((prev) =>
        prev.map((n) => (n.id === nodeId ? {...n, value: 0} : n))
      );
    },
    [applyInputUpdate, soundEnabled]
  );

  const handleButtonToggle = useCallback(
    (nodeId: string) => {
      setBookNodes((prev) => {
        const target = prev.find((n) => n.id === nodeId);
        const nextVal: LogicValue = target?.value === 1 ? 0 : 1;
        playTactileClick(nextVal === 1, soundEnabled);
        const updated = prev.map((n) =>
          n.id === nodeId ? {...n, value: nextVal} : n
        );
        return stepMode ? updated : settleCircuit(updated, bookWires).nodes;
      });
    },
    [bookWires, soundEnabled, stepMode]
  );

  const handleBookStepForward = () => {
    playStepTick(soundEnabled);
    setBookNodes((prev) => stepCircuit(prev, bookWires).nextNodes);
  };

  const handleTruthTableSelect = (values: LogicValue[]) => {
    playTactileClick(true, soundEnabled);
    applyInputUpdate((prev) => {
      let inputIdx = 0;
      return prev.map((n) => {
        if (n.type === 'BUTTON') {
          const val = values[inputIdx] ?? 0;
          inputIdx += 1;
          return {...n, value: val};
        }
        return n;
      });
    });
  };

  // Keyboard shortcuts for Book Mode tactile buttons (1/2 keys) and chapters
  useEffect(() => {
    if (activeView !== 'book') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const btnIds = currentChapter.inputDefs.map((d) => d.id);
      let targetId: string | undefined;

      if (e.key === '1' || e.key.toLowerCase() === 'r') {
        targetId = btnIds[0];
      } else if (e.key === '2' || e.key.toLowerCase() === 'y') {
        targetId = btnIds[1];
      } else if (e.key === 'ArrowRight') {
        loadChapter(Math.min(BOOK_CHAPTERS.length - 1, chapterIndex + 1));
        return;
      } else if (e.key === 'ArrowLeft') {
        loadChapter(Math.max(0, chapterIndex - 1));
        return;
      }

      if (!targetId || e.repeat) return;

      if (buttonMode === 'momentary') {
        handleButtonPressStart(targetId);
      } else {
        handleButtonToggle(targetId);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (buttonMode !== 'momentary') return;
      const btnIds = currentChapter.inputDefs.map((d) => d.id);
      let targetId: string | undefined;
      if (e.key === '1' || e.key.toLowerCase() === 'r') {
        targetId = btnIds[0];
      } else if (e.key === '2' || e.key.toLowerCase() === 'y') {
        targetId = btnIds[1];
      }
      if (targetId) {
        handleButtonPressEnd(targetId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    activeView,
    buttonMode,
    chapterIndex,
    currentChapter,
    handleButtonPressEnd,
    handleButtonPressStart,
    handleButtonToggle,
    loadChapter,
  ]);

  const handleExportBookToLab = () => {
    setLabTitle(`${currentChapter.shortTitle} (${currentChapter.title})`);
    setLabNodes(bookNodes.map((n) => ({...n})));
    setLabWires(bookWires.map((w) => ({...w})));
    setActiveView('lab');
  };

  const handleChangeLabCircuit = useCallback(
    (nextNodes: CircuitNode[], nextWires: CircuitWire[]) => {
      setLabNodes(nextNodes);
      setLabWires(nextWires);
    },
    []
  );

  const currentInputs = bookNodes
    .filter((n) => n.type === 'BUTTON')
    .map((n) => n.value);
  const currentLedNode = bookNodes.find((n) => n.type === 'LED');
  const currentOutput: LogicValue = currentLedNode ? currentLedNode.value : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5F0] text-[#181A1F]">
      {/* Strictly 3-Zone Top Bar Contract */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('book')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Logic Gate Lab
          </button>

          {/* Zone 2: 4 Single-line Navigation Links */}
          <nav
            aria-label="メインナビゲーション"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => setActiveView('book')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeView === 'book' && chapterIndex !== BOOK_CHAPTERS.length - 1
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              絵本モード
            </button>
            <button
              type="button"
              onClick={() => setActiveView('lab')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeView === 'lab'
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              自由回路ラボ
            </button>
            <button
              type="button"
              onClick={() => setActiveView('guide')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeView === 'guide'
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              ゲート図鑑・クイズ
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('book');
                loadChapter(BOOK_CHAPTERS.length - 1);
              }}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                activeView === 'book' && chapterIndex === BOOK_CHAPTERS.length - 1
                  ? 'border-slate-900 text-slate-950 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              ドアベル応用
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (activeView === 'lab') {
                  setActiveView('book');
                } else {
                  handleExportBookToLab();
                }
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeView === 'lab' ? '絵本モードへ戻る' : '自由ラボで改造'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Switcher (visible below md) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveView('book')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeView === 'book'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 bg-slate-100'
          }`}
        >
          絵本モード
        </button>
        <button
          type="button"
          onClick={() => setActiveView('lab')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeView === 'lab'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 bg-slate-100'
          }`}
        >
          自由回路ラボ
        </button>
        <button
          type="button"
          onClick={() => setActiveView('guide')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
            activeView === 'guide'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 bg-slate-100'
          }`}
        >
          ゲート図鑑・クイズ
        </button>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeView === 'book' && (
          <div className="space-y-5">
            {/* Chapter Stepper Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="絵本の章を選択"
                className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto max-w-full"
              >
                {BOOK_CHAPTERS.map((ch, idx) => {
                  const isActive = idx === chapterIndex;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => loadChapter(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-xs border border-black/15 shrink-0"
                        style={{backgroundColor: ch.boardBg}}
                      />
                      <span>{ch.shortTitle}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => setSoundEnabled((s) => !s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>クリック音: {soundEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Two-Zone Sandbox Layout (Left Stage 7 cols / Right Concept Deck 5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Interactive Stage */}
              <div className="lg:col-span-7 space-y-3">
                <BookBoardStage
                  chapter={currentChapter}
                  nodes={bookNodes}
                  wires={bookWires}
                  buttonMode={buttonMode}
                  onButtonPressStart={handleButtonPressStart}
                  onButtonPressEnd={handleButtonPressEnd}
                  onButtonToggle={handleButtonToggle}
                />

                {/* Stage Playback & Physical Button Mode Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      ボタン操作:
                    </span>
                    <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setButtonMode('toggle')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          buttonMode === 'toggle'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        クリック固定
                      </button>
                      <button
                        type="button"
                        onClick={() => setButtonMode('momentary')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          buttonMode === 'momentary'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        押している間ON
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStepMode((prev) => {
                          const next = !prev;
                          if (!next) {
                            setBookNodes((bn) => settleCircuit(bn, bookWires).nodes);
                          }
                          return next;
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        stepMode
                          ? 'bg-sky-50 border-sky-300 text-sky-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {stepMode ? 'ステップ確認中' : 'ステップ確認モード'}
                    </button>

                    {stepMode && (
                      <button
                        type="button"
                        onClick={handleBookStepForward}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        1ゲート進める
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => loadChapter(chapterIndex)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      初期化
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 px-1">
                  ヒント: キーボードの <kbd className="font-mono-tabular px-1 py-0.5 rounded bg-white border border-slate-300 text-slate-700">1</kbd>{' '}
                  {currentChapter.inputDefs.length > 1 && (
                    <>
                      と <kbd className="font-mono-tabular px-1 py-0.5 rounded bg-white border border-slate-300 text-slate-700">2</kbd>
                    </>
                  )}{' '}
                  でボタンを押せます。{currentChapter.isSequential ? '「ステップ確認モード」にすると、信号がOR→AND→ORのループを巡る様子を1段階ずつ追跡できます。' : ''}
                </p>
              </div>

              {/* Right Control & Concept Deck */}
              <div className="lg:col-span-5 space-y-4">
                {/* Chapter Heading & Unboxed Metadata */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>{currentChapter.orderLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {currentChapter.inputDefs.length}入力 / 1出力
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular text-slate-700">
                      {currentChapter.booleanExpr}
                    </span>
                  </div>

                  <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight text-balance">
                    {currentChapter.title}
                    <span className="block text-base font-semibold text-slate-600 mt-0.5">
                      {currentChapter.subtitle}
                    </span>
                  </h1>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentChapter.description}
                  </p>
                </div>

                {/* Live Interactive Truth Table */}
                <TruthTablePanel
                  chapter={currentChapter}
                  currentInputs={currentInputs}
                  currentOutput={currentOutput}
                  onSelectRow={handleTruthTableSelect}
                />

                {/* Electrical Mechanism & Real-world Context */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">
                      電気・論理回路の仕組み
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {currentChapter.electricalNote}
                    </p>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-900">
                      コンピュータや身近な機器での応用
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {currentChapter.realWorldExample}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleExportBookToLab}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 hover:underline cursor-pointer whitespace-nowrap"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      この回路を自由ラボで改造する
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={chapterIndex === 0}
                        onClick={() => loadChapter(chapterIndex - 1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        前へ
                      </button>
                      <button
                        type="button"
                        disabled={chapterIndex === BOOK_CHAPTERS.length - 1}
                        onClick={() => loadChapter(chapterIndex + 1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                      >
                        次へ
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'lab' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  自由回路ラボ (Free-Build Circuit Workbench)
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">
                  論理ゲートやスイッチを自由に配置・配線し、BASE64URLでの引き継ぎ共有や正式な回路図PDFの出力が行えます。
                </p>
              </div>
            </div>

            {urlImportNotice && (
              <div
                className={`rounded-xl px-4 py-2.5 text-xs flex items-center justify-between border ${
                  urlImportNotice.kind === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span>{urlImportNotice.text}</span>
                <button
                  type="button"
                  onClick={() => setUrlImportNotice(null)}
                  className="text-xs underline ml-4 cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            )}

            <FreeBuildLab
              circuitTitle={labTitle}
              nodes={labNodes}
              wires={labWires}
              soundEnabled={soundEnabled}
              onChangeTitle={setLabTitle}
              onChangeCircuit={handleChangeLabCircuit}
            />
          </div>
        )}

        {activeView === 'guide' && (
          <ReferenceGuide
            onJumpToChapter={(id) => {
              const idx = BOOK_CHAPTERS.findIndex((c) => c.id === id);
              loadChapter(idx >= 0 ? idx : 0);
              setActiveView('book');
            }}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white/70 mt-10">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            Logic Gate Lab — Computer Engineering for Babies の体験から学ぶデジタル論理回路
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveView('book')}
              className="hover:text-slate-800 cursor-pointer"
            >
              絵本モード
            </button>
            <button
              type="button"
              onClick={() => setActiveView('lab')}
              className="hover:text-slate-800 cursor-pointer"
            >
              自由回路ラボ
            </button>
            <button
              type="button"
              onClick={() => setActiveView('guide')}
              className="hover:text-slate-800 cursor-pointer"
            >
              ゲート図鑑
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
