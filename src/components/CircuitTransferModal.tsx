import React, {useMemo, useState} from 'react';
import {Check, Copy, Link2, Upload, X} from 'lucide-react';
import type {CircuitNode, CircuitWire} from '../types/circuit';
import {
  buildCircuitShareUrl,
  decodeCircuitFromBase64Url,
  encodeCircuitToBase64Url,
} from '../utils/circuitCodec';

interface CircuitTransferModalProps {
  isOpen: boolean;
  circuitTitle: string;
  nodes: CircuitNode[];
  wires: CircuitWire[];
  onClose: () => void;
  onImportCircuit: (
    title: string,
    nodes: CircuitNode[],
    wires: CircuitWire[]
  ) => void;
}

export const CircuitTransferModal: React.FC<CircuitTransferModalProps> = ({
  isOpen,
  circuitTitle,
  nodes,
  wires,
  onClose,
  onImportCircuit,
}) => {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'url' | 'token' | null>(null);

  const token = useMemo(
    () => encodeCircuitToBase64Url(circuitTitle, nodes, wires),
    [circuitTitle, nodes, wires]
  );

  const shareUrl = useMemo(() => buildCircuitShareUrl(token), [token]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, field: 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setImportError('クリップボードへのコピーに失敗しました。テキストを手動で選択してコピーしてください。');
    }
  };

  const handleImport = () => {
    setImportError(null);
    try {
      const decoded = decodeCircuitFromBase64Url(importText);
      onImportCircuit(decoded.title, decoded.nodes, decoded.wires);
      setImportText('');
      onClose();
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : '回路データの読み込みに失敗しました。'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2
              id="transfer-modal-title"
              className="font-display text-lg font-bold text-slate-900"
            >
              回路データの引き継ぎ・共有 (BASE64URL)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              現在の回路「{circuitTitle || '無題の論理回路'}」（部品 {nodes.length}点・配線 {wires.length}本）
            </p>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Shareable URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="share-url-output"
                className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5 text-sky-600" />
                共有用URL (?circuit=BASE64URL)
              </label>
              <button
                type="button"
                onClick={() => handleCopy(shareUrl, 'url')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 cursor-pointer whitespace-nowrap"
              >
                {copiedField === 'url' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    URLをコピー
                  </>
                )}
              </button>
            </div>
            <input
              id="share-url-output"
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono-tabular text-xs text-slate-700"
            />
          </div>

          {/* Raw Base64URL Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="base64url-output"
                className="text-xs font-semibold text-slate-800"
              >
                BASE64URL 引き継ぎコード
              </label>
              <button
                type="button"
                onClick={() => handleCopy(token, 'token')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                {copiedField === 'token' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    コードをコピー
                  </>
                )}
              </button>
            </div>
            <textarea
              id="base64url-output"
              readOnly
              rows={3}
              value={token}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono-tabular text-xs text-slate-700 break-all resize-none"
            />
          </div>

          {/* Import / Restore Section */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <label
              htmlFor="base64url-import"
              className="block text-xs font-semibold text-slate-800"
            >
              別の回路データを読み込む (BASE64URLコード または 共有URL を貼り付け)
            </label>
            <textarea
              id="base64url-import"
              rows={3}
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                if (importError) setImportError(null);
              }}
              placeholder="ここにBASE64URL文字列、または ?circuit=... を含むURLを貼り付けてください"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono-tabular text-xs text-slate-900 focus:outline-2 focus:outline-sky-600"
            />

            {importError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {importError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!importText.trim()}
                onClick={handleImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                回路を復元して読み込む
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
