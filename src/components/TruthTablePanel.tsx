import React from 'react';
import type {BookChapter, LogicValue} from '../types/circuit';

interface TruthTablePanelProps {
  chapter: BookChapter;
  currentInputs: LogicValue[];
  currentOutput: LogicValue;
  onSelectRow: (inputValues: LogicValue[]) => void;
}

export const TruthTablePanel: React.FC<TruthTablePanelProps> = ({
  chapter,
  currentInputs,
  currentOutput,
  onSelectRow,
}) => {
  const inputCount = chapter.inputDefs.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          真理値表 (クリックで入力をテスト)
        </h3>
        <span className="font-mono-tabular text-xs text-slate-500">
          {chapter.booleanExpr}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono-tabular text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              {chapter.truthTableHeaders.map((header, idx) => (
                <th
                  key={header}
                  className={`py-2 px-2.5 font-medium ${
                    idx === chapter.truthTableHeaders.length - 1 ? 'text-slate-900' : ''
                  }`}
                >
                  {header}
                </th>
              ))}
              <th className="py-2 px-2.5 font-medium font-sans text-slate-500">
                動作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {chapter.truthTableRows.map((row, rIdx) => {
              const rowInputs = row.values.slice(0, inputCount);
              const rowOut = row.values[row.values.length - 1];
              const inputsMatch = rowInputs.every(
                (v, idx) => v === currentInputs[idx]
              );
              const isActive = chapter.isSequential
                ? inputsMatch && (rowInputs[0] === 0 && rowInputs[1] === 0 ? true : rowOut === currentOutput)
                : inputsMatch;

              return (
                <tr
                  key={rIdx}
                  onClick={() => onSelectRow(rowInputs)}
                  className={`cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-slate-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {row.values.map((val, cIdx) => {
                    const isOutCol = cIdx === row.values.length - 1;
                    return (
                      <td key={cIdx} className="py-2 px-2.5">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${
                            val === 1
                              ? isOutCol
                                ? 'bg-amber-400/25 text-amber-900 font-bold'
                                : 'bg-sky-600 text-white font-semibold'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {val}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-2 px-2.5 font-sans text-xs text-slate-600">
                    {chapter.isSequential && rIdx === 0 && inputsMatch
                      ? `保持中 (現在 Q = ${currentOutput})`
                      : row.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
