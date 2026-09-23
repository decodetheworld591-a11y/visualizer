"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSQLStore, TableRow, VisualizationStep } from '@/store/sqlStore';
import { 
  CheckCircle2, XCircle, Filter, Layers, ArrowUpDown, Sparkles, 
  Database, Trophy, Play, Pause, RotateCcw, ChevronRight, ChevronLeft,
  Search, Download, Copy, Check, Info, Activity, ArrowRight, Zap
} from 'lucide-react';

/* ─── Column Role Determination ─── */
function getColumnRole(
  col: string, 
  phase: string, 
  filterColumn: string | null, 
  sortColumn: string | null,
  sortDirection: 'ASC' | 'DESC' | null,
  groupByColumn: string | null,
  selectedColumns: string[]
) {
  if (phase === 'filtering' && filterColumn?.toLowerCase() === col.toLowerCase()) {
    return { role: 'FILTER', label: 'WHERE TARGET 🎯', color: '#f97316', isKey: true };
  }
  if (phase === 'ordering' && sortColumn?.toLowerCase() === col.toLowerCase()) {
    return { role: 'SORT', label: `SORT KEY ${sortDirection === 'DESC' ? '↓' : '↑'}`, color: '#eab308', isKey: true };
  }
  if (phase === 'grouping' && groupByColumn?.toLowerCase() === col.toLowerCase()) {
    return { role: 'GROUP', label: 'GROUP KEY ⚏', color: '#06b6d4', isKey: true };
  }
  if (phase === 'projecting') {
    if (selectedColumns.length === 0 || selectedColumns.some(s => s.toLowerCase() === col.toLowerCase())) {
      return { role: 'PROJECTED', label: 'SELECTED ✓', color: '#a855f7', isKey: true };
    }
    return { role: 'OMITTED', label: 'OMITTED ✂', color: '#64748b', isKey: false, dimmed: true };
  }
  return { role: 'SOURCE', label: 'DATA', color: '#3b82f6', isKey: false };
}

/* ─── SQL Execution Pipeline Graph ─── */
function ExecutionPipeline({
  steps,
  currentStep,
  onSelectStep,
  light = false
}: {
  steps: VisualizationStep[];
  currentStep: number;
  onSelectStep: (idx: number) => void;
  light?: boolean;
}) {
  return (
    <div 
      className="w-full rounded-2xl p-3 border backdrop-blur-xl shadow-lg flex items-center gap-2 overflow-x-auto no-scrollbar"
      style={{
        background: light ? 'rgba(255,255,255,0.7)' : 'rgba(10,14,26,0.5)',
        borderColor: light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
      }}
    >
      <div className="flex items-center gap-1.5 pl-1 pr-2 text-[10px] font-mono uppercase tracking-wider font-bold text-white/40">
        <Zap size={13} className="text-amber-400" />
        <span>Pipeline</span>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-max">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isPassed = idx < currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onSelectStep(idx)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: isActive ? `${step.color}20` : isPassed ? `${step.color}08` : 'transparent',
                  borderColor: isActive ? step.color : isPassed ? `${step.color}30` : light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                  boxShadow: isActive ? `0 0 16px ${step.color}35` : 'none',
                  color: isActive ? (light ? '#000' : '#fff') : light ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'
                }}
              >
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: isActive ? step.color : isPassed ? `${step.color}25` : light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#fff' : isPassed ? step.color : light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {isPassed ? <Check size={11} strokeWidth={3} /> : idx + 1}
                </div>
                <span className="font-semibold">{step.sqlKeyword}</span>
              </button>

              {idx < steps.length - 1 && (
                <div className="flex items-center text-white/20 px-0.5">
                  <ArrowRight size={14} className={isActive ? 'text-amber-400 animate-pulse' : ''} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Responsive Glassmorphic SQL Table with Horizontal Scrolling ─── */
function GlassSQLTable({
  title,
  rows,
  columns,
  color,
  phase,
  highlightCols = [],
  rowStates = {},
  showPassFail = false,
  dimFails = false,
  light = false,
  filterColumn = null,
  sortColumn = null,
  sortDirection = null,
  groupByColumn = null,
  selectedColumns = [],
  activeRowIndex = null,
  sortRanks = null
}: {
  title: string;
  rows: TableRow[];
  columns: string[];
  color: string;
  phase: string;
  highlightCols?: string[];
  rowStates?: Record<string, string>;
  showPassFail?: boolean;
  dimFails?: boolean;
  light?: boolean;
  filterColumn?: string | null;
  sortColumn?: string | null;
  sortDirection?: 'ASC' | 'DESC' | null;
  groupByColumn?: string | null;
  selectedColumns?: string[];
  activeRowIndex?: number | null;
  sortRanks?: Record<number, number> | null;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const displayedRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r => 
      columns.some(col => String(r[col] ?? '').toLowerCase().includes(term))
    );
  }, [rows, columns, searchTerm]);

  const tableBg = light ? 'rgba(255,255,255,0.78)' : 'rgba(10,12,22,0.65)';
  const tableBorder = light ? 'rgba(0,0,0,0.08)' : `${color}25`;
  const headerBg = light ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
  const rowBorder = light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
  const stickyColBg = light ? 'rgba(245,247,250,0.95)' : 'rgba(12,14,26,0.92)';
  const stickyColBorder = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const textMuted = light ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
  const cellColor = light ? '#1f2937' : '#e2e8f0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="rounded-2xl overflow-hidden w-full shadow-2xl flex flex-col backdrop-blur-2xl"
      style={{
        border: `1px solid ${tableBorder}`,
        background: tableBg,
      }}
    >
      {/* Table Toolbar Header */}
      <div 
        className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b"
        style={{ borderColor: rowBorder, background: headerBg }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}
          >
            <Database size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider uppercase font-mono" style={{ color }}>
                {title}
              </span>
              <span 
                className="text-[10px] font-mono px-2 py-0.5 rounded-full" 
                style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}
              >
                {columns.length} columns · {rows.length} rows
              </span>
            </div>
          </div>
        </div>

        {/* Search & Horizontal Scroll Hint */}
        <div className="flex items-center gap-2.5">
          {columns.length > 5 && (
            <div 
              className="text-[10px] font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)', color: textMuted }}
            >
              <span className="animate-pulse">↔</span> Scrollable columns
            </div>
          )}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: textMuted }} />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs pl-7 pr-3 py-1 rounded-lg border bg-transparent font-mono outline-none transition-all w-36 focus:w-48"
              style={{ 
                borderColor: rowBorder, 
                color: cellColor,
                background: light ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.2)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable Table Container */}
      <div 
        ref={tableRef}
        className="w-full overflow-x-auto overflow-y-auto max-h-[420px] scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: light ? 'rgba(0,0,0,0.2) transparent' : 'rgba(255,255,255,0.2) transparent'
        }}
      >
        <table className="w-full border-collapse text-left text-xs font-mono">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 backdrop-blur-md" style={{ background: stickyColBg }}>
            <tr style={{ borderBottom: `1px solid ${rowBorder}` }}>
              {/* Sticky Row # */}
              <th 
                className="sticky left-0 z-30 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider w-12"
                style={{ 
                  background: stickyColBg, 
                  color: textMuted,
                  borderRight: `1px solid ${stickyColBorder}`
                }}
              >
                #
              </th>

              {/* Dynamic Columns with Clear Width & Highlight Badges */}
              {columns.map(col => {
                const roleInfo = getColumnRole(col, phase, filterColumn, sortColumn, sortDirection, groupByColumn, selectedColumns);
                const isSelectedCol = highlightCols.includes(col);

                return (
                  <th
                    key={col}
                    className="px-4 py-2.5 min-w-[145px] max-w-[260px] whitespace-nowrap transition-all"
                    style={{
                      background: roleInfo.isKey ? `${roleInfo.color}10` : 'transparent',
                      borderBottom: roleInfo.isKey ? `2px solid ${roleInfo.color}` : 'none'
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span 
                          className="font-bold tracking-wider text-xs truncate"
                          style={{ 
                            color: roleInfo.isKey ? roleInfo.color : (isSelectedCol ? color : cellColor),
                            opacity: roleInfo.dimmed ? 0.45 : 1
                          }}
                          title={col}
                        >
                          {col}
                        </span>
                      </div>

                      {/* Column Purpose Tag */}
                      <span 
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded inline-block self-start font-medium"
                        style={{
                          background: roleInfo.isKey ? `${roleInfo.color}20` : (light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'),
                          color: roleInfo.isKey ? roleInfo.color : textMuted,
                          border: `1px solid ${roleInfo.isKey ? `${roleInfo.color}40` : 'transparent'}`,
                          opacity: roleInfo.dimmed ? 0.4 : 1
                        }}
                      >
                        {roleInfo.label}
                      </span>
                    </div>
                  </th>
                );
              })}

              {/* Status Header for WHERE evaluation */}
              {showPassFail && (
                <th 
                  className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider min-w-[120px] sticky right-0 z-20"
                  style={{ background: stickyColBg, color: '#f97316', borderLeft: `1px solid ${stickyColBorder}` }}
                >
                  FILTER EVAL
                </th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            <AnimatePresence mode="popLayout">
              {displayedRows.map((r, i) => {
                const rKey = `row_${i}`;
                const rState = rowStates[rKey];
                const isFail = dimFails && rState === 'fail';
                const isScanning = activeRowIndex === i;

                let rowBg = i % 2 === 0 ? (light ? 'rgba(0,0,0,0.012)' : 'rgba(255,255,255,0.012)') : 'transparent';
                if (rState === 'pass') rowBg = light ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)';
                if (rState === 'fail') rowBg = light ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.04)';
                if (isScanning) rowBg = light ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.15)';

                return (
                  <motion.tr
                    key={rKey}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ 
                      opacity: isFail ? 0.22 : 1,
                      scale: isScanning ? 1.005 : 1,
                      transition: { delay: Math.min(i * 0.02, 0.4), type: 'spring', damping: 25 }
                    }}
                    className="transition-colors group"
                    style={{ 
                      background: rowBg,
                      borderBottom: `1px solid ${rowBorder}`,
                      boxShadow: isScanning ? '0 0 20px rgba(249,115,22,0.25)' : 'none'
                    }}
                  >
                    {/* Sticky Row Index */}
                    <td 
                      className="sticky left-0 z-10 px-3 py-2 text-center text-[10px] font-mono select-none"
                      style={{ 
                        background: stickyColBg, 
                        color: isScanning ? '#f97316' : textMuted,
                        borderRight: `1px solid ${stickyColBorder}`,
                        fontWeight: isScanning ? 700 : 400
                      }}
                    >
                      {sortRanks && sortRanks[i] ? (
                        <span className="font-bold text-amber-400">#{sortRanks[i]}</span>
                      ) : (
                        i + 1
                      )}
                    </td>

                    {/* Columns Cells */}
                    {columns.map(col => {
                      const roleInfo = getColumnRole(col, phase, filterColumn, sortColumn, sortDirection, groupByColumn, selectedColumns);
                      const isFilterCell = roleInfo.role === 'FILTER';

                      return (
                        <td
                          key={col}
                          className="px-4 py-2.5 whitespace-nowrap truncate max-w-[260px] text-xs font-mono transition-all"
                          style={{
                            color: roleInfo.isKey ? (light ? '#111' : '#fff') : cellColor,
                            fontWeight: roleInfo.isKey ? 600 : 400,
                            background: isFilterCell && isScanning ? (light ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.2)') : undefined,
                            opacity: roleInfo.dimmed ? 0.35 : 1
                          }}
                          title={r[col] !== undefined ? String(r[col]) : ''}
                        >
                          {isFilterCell ? (
                            <span 
                              className="px-2 py-0.5 rounded font-bold"
                              style={{ 
                                background: light ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.18)',
                                color: '#f97316'
                              }}
                            >
                              {r[col] !== undefined ? String(r[col]) : 'NULL'}
                            </span>
                          ) : (
                            r[col] !== undefined ? String(r[col]) : '—'
                          )}
                        </td>
                      );
                    })}

                    {/* Status Cell */}
                    {showPassFail && (
                      <td 
                        className="px-4 py-2 text-center sticky right-0 z-10"
                        style={{ background: stickyColBg, borderLeft: `1px solid ${stickyColBorder}` }}
                      >
                        {rState === 'pass' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 size={13} /> KEEP
                          </span>
                        )}
                        {rState === 'fail' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                            <XCircle size={13} /> DISCARD
                          </span>
                        )}
                        {isScanning && !rState && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 animate-pulse">
                            <Activity size={12} /> SCANNING...
                          </span>
                        )}
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div 
        className="px-4 py-2 flex items-center justify-between text-[10px] font-mono border-t"
        style={{ borderColor: rowBorder, background: headerBg, color: textMuted }}
      >
        <span>
          Showing {displayedRows.length} of {rows.length} rows
        </span>
        {phase === 'filtering' && (
          <span className="text-orange-400 font-semibold">
            {Object.values(rowStates).filter(s => s === 'pass').length} passed · {Object.values(rowStates).filter(s => s === 'fail').length} filtered out
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Interactive Row-by-Row WHERE Live Scanner ─── */
function WhereLiveScanner({
  filterExpr,
  filterColumn,
  rows,
  rowStates,
  evals,
  light = false,
  onActiveRowChange
}: {
  filterExpr: string;
  filterColumn: string | null;
  rows: TableRow[];
  rowStates: Record<string, string>;
  evals: Array<{ index: number; value: any; passed: boolean; expression: string }>;
  light?: boolean;
  onActiveRowChange: (idx: number | null) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentRow, setCurrentRow] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const timerRef = useRef<any>(null);

  const total = rows.length;
  const currentEval = evals[currentRow];

  useEffect(() => {
    onActiveRowChange(currentRow);
  }, [currentRow, onActiveRowChange]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.round(900 / speed);
    timerRef.current = setInterval(() => {
      setCurrentRow(prev => {
        if (prev >= total - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, total, speed]);

  const handleReplay = () => {
    setCurrentRow(0);
    setIsPlaying(true);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentRow(p => Math.min(p + 1, total - 1));
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentRow(p => Math.max(p - 1, 0));
  };

  const passedCount = evals.slice(0, currentRow + 1).filter(e => e.passed).length;
  const failedCount = evals.slice(0, currentRow + 1).filter(e => !e.passed).length;

  return (
    <div 
      className="w-full rounded-2xl p-4 flex flex-col gap-3 border backdrop-blur-xl shadow-xl transition-all"
      style={{
        background: light ? 'rgba(249,115,22,0.06)' : 'rgba(249,115,22,0.08)',
        borderColor: light ? 'rgba(249,115,22,0.25)' : 'rgba(249,115,22,0.3)',
      }}
    >
      {/* Top Banner: Condition & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center">
            <Filter size={15} />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold">
              Row-by-Row Filter Scanner
            </div>
            <div className="text-xs font-mono font-bold text-white/90">
              WHERE <span className="text-orange-400 px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30">{filterExpr}</span>
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all text-white shadow-md hover:brightness-110"
            style={{ background: isPlaying ? '#ea580c' : '#f97316' }}
            title={isPlaying ? 'Pause scan' : 'Play scan'}
          >
            {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={handleReplay}
            className="p-1.5 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all"
            title="Replay from row 1"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={handlePrev}
            disabled={currentRow === 0}
            className="p-1.5 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 disabled:opacity-30 transition-all"
            title="Previous row"
          >
            <ChevronLeft size={14} />
          </button>

          <button
            onClick={handleNext}
            disabled={currentRow === total - 1}
            className="p-1.5 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 disabled:opacity-30 transition-all"
            title="Next row"
          >
            <ChevronRight size={14} />
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 ml-2 border border-orange-500/30 rounded-lg p-0.5 text-[10px] font-mono">
            {[0.5, 1, 2].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="px-1.5 py-0.5 rounded transition-all"
                style={{
                  background: speed === s ? '#f97316' : 'transparent',
                  color: speed === s ? '#fff' : '#f97316',
                  fontWeight: speed === s ? 700 : 400
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Inspection Evaluation Box */}
      <AnimatePresence mode="wait">
        {currentEval && (
          <motion.div
            key={currentRow}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
            style={{
              background: currentEval.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
              borderColor: currentEval.passed ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-[11px] px-2 py-0.5 rounded bg-black/30 text-white/80">
                Row #{currentRow + 1}
              </span>
              <span>
                Testing: <span className="font-bold text-orange-400">{filterColumn || 'Condition'}</span> = {' '}
                <span className="font-bold underline decoration-orange-400/50">
                  {currentEval.value !== undefined ? String(currentEval.value) : '—'}
                </span>
              </span>
              <span className="text-white/40">➜</span>
              <span className="text-white/80">
                Evaluation: {currentEval.expression}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {currentEval.passed ? (
                <span className="flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 size={14} /> TRUE ➔ ROW KEPT
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-red-400 bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30">
                  <XCircle size={14} /> FALSE ➔ ROW DISCARDED
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar & Counter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-black/20 overflow-hidden border border-orange-500/20 relative">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
            style={{ width: `${((currentRow + 1) / total) * 100}%` }}
          />
        </div>
        <span className="text-[11px] font-mono text-orange-400 font-bold whitespace-nowrap">
          {currentRow + 1} / {total} Rows
        </span>
        <span className="text-[10px] font-mono text-emerald-400 whitespace-nowrap">
          ✓ {passedCount} Kept
        </span>
        <span className="text-[10px] font-mono text-red-400 whitespace-nowrap">
          ✗ {failedCount} Discarded
        </span>
      </div>
    </div>
  );
}

/* ─── Group Component with Glass Clusters ─── */
function GroupTable({ data, color, light = false }: { data: Record<string, TableRow[]>, color: string, light?: boolean }) {
  const cardBg = light ? 'rgba(255,255,255,0.75)' : 'rgba(8,12,24,0.55)';
  const cardBorder = light ? `${color}25` : `${color}35`;
  const headerBg = light ? `${color}10` : `${color}18`;
  const countBg = light ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.45)';
  const countColor = light ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
  const itemBg = light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
  const itemBorder = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const itemColor = light ? '#1f2937' : '#e2e8f0';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full"
    >
      {Object.entries(data).map(([key, rows], idx) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.07, type: 'spring', damping: 20 }}
          className="rounded-2xl overflow-hidden shadow-xl border backdrop-blur-xl"
          style={{ border: `1px solid ${cardBorder}`, background: cardBg }}
        >
          <div className="px-4 py-3 flex items-center justify-between border-b" style={{ background: headerBg, borderColor: cardBorder }}>
            <div className="flex items-center gap-2 truncate">
              <Layers size={14} style={{ color }} />
              <span className="font-bold uppercase tracking-wider text-xs truncate" style={{ color }}>{key}</span>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold" style={{ background: countBg, color: countColor }}>
              COUNT: {rows.length}
            </span>
          </div>
          <div className="p-3 flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
            {rows.map((r, i) => (
              <div 
                key={i} 
                className="text-xs font-mono px-3 py-2 rounded-xl text-left border flex items-center justify-between gap-2"
                style={{ background: itemBg, borderColor: itemBorder, color: itemColor }}
              >
                <span className="truncate font-semibold">{String(r.name ?? r.first_name ?? Object.values(r)[1] ?? `Row #${i + 1}`)}</span>
                <span className="text-[10px] text-white/40 font-mono">#{i + 1}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ─── Main Canvas ─── */
export function VisualizationCanvas() {
  const { 
    query, status, tables, activeTable, steps, currentStep, isLightMode, setCurrentStep,
    rowStates, highlightColumns, filterExpr, filterColumn, sortColumn, sortDirection,
    groupByColumn, selectedColumns, filterRowEvals, groupData, result, resultColumns 
  } = useSQLStore();

  const [activeScanningRow, setActiveScanningRow] = useState<number | null>(null);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [copiedCSV, setCopiedCSV] = useState(false);

  const L = isLightMode;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(query);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const handleDownloadCSV = () => {
    if (!result || result.length === 0) return;
    const headers = resultColumns.join(',');
    const rows = result.map(r => resultColumns.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sql_result_${activeTable}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2000);
  };

  if (status !== 'success' || steps.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative p-8">
        <div className={`absolute inset-0 ${L ? 'grid-bg-light' : 'grid-bg'} opacity-30 pointer-events-none`} />
        <div className="w-96 h-96 rounded-full blur-[120px] absolute pointer-events-none" style={{ background: L ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.14)' }} />
        <div className="relative z-10 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff' }}>
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-bold mb-2.5 tracking-tight" style={{ color: L ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)' }}>
            SQL Query <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">Visualizer</span>
          </h1>
          <p className="font-mono text-xs leading-relaxed" style={{ color: L ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.45)' }}>
            Execute any SQL query or import your CSV file on the left. The database engine will break down each execution step right here with row-by-row animated flows.
          </p>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];
  const srcRows = tables[activeTable] || [];
  const srcCols = srcRows.length > 0 ? Object.keys(srcRows[0]) : [];

  // Highlighted SQL Query View
  const renderHighlightedQuery = () => {
    const keyword = step.sqlKeyword;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = query.split(regex);
    return (
      <div className="font-mono text-xs whitespace-pre-wrap leading-relaxed" style={{ color: L ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span 
              key={i} 
              className="font-bold rounded px-1.5 py-0.5 shadow-sm inline-block" 
              style={{ color: step.color, background: L ? `${step.color}15` : `${step.color}25`, border: `1px solid ${step.color}35` }}
            >
              {part}
            </span>
          ) : <span key={i}>{part}</span>
        )}
      </div>
    );
  };

  const badgeBg = L ? `${step.color}10` : `${step.color}14`;
  const badgeBorder = L ? `${step.color}30` : `${step.color}40`;
  const queryCardBg = L ? 'rgba(255,255,255,0.65)' : 'rgba(10,14,26,0.45)';
  const queryCardBorder = L ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar relative">
      {/* Ambient background glow */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-all duration-700"
        style={{ background: `radial-gradient(circle at 50% 20%, ${step.color}08 0%, transparent 65%)` }}
      />
      <div className={`absolute inset-0 ${L ? 'grid-bg-light' : 'grid-bg'} opacity-20 pointer-events-none z-0`} />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col gap-5 p-6 pb-20 max-w-full">
        
        {/* Interactive SQL Pipeline Bar */}
        <ExecutionPipeline 
          steps={steps}
          currentStep={currentStep}
          onSelectStep={setCurrentStep}
          light={L}
        />

        {/* Step Header & Query Inspector */}
        <motion.div 
          key={step.id + '-header'}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25 }}
          className="flex flex-col gap-3"
        >
          {/* Step Badge & Action Controls */}
          <div className="flex items-center justify-between gap-3">
            <div 
              className="px-4 py-2 rounded-xl border flex items-center gap-2.5 shadow-md backdrop-blur-xl"
              style={{ borderColor: badgeBorder, background: badgeBg }}
            >
              {step.phase === 'scanning' && <Database style={{ color: step.color }} size={16} />}
              {step.phase === 'filtering' && <Filter style={{ color: step.color }} size={16} />}
              {step.phase === 'grouping' && <Layers style={{ color: step.color }} size={16} />}
              {step.phase === 'ordering' && <ArrowUpDown style={{ color: step.color }} size={16} />}
              {step.phase === 'projecting' && <Sparkles style={{ color: step.color }} size={16} />}
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: step.color }}>
                {step.title}
              </span>
            </div>
            
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${step.color}35, transparent)` }} />

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySQL}
                className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-xl border transition-all hover:scale-105"
                style={{ 
                  background: queryCardBg, 
                  borderColor: queryCardBorder,
                  color: copiedSQL ? '#10b981' : L ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' 
                }}
                title="Copy SQL Query"
              >
                {copiedSQL ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedSQL ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
          </div>

          {/* Current Query with Keyword Highlight */}
          <div 
            className="p-3.5 rounded-2xl border backdrop-blur-xl shadow-lg"
            style={{ background: queryCardBg, borderColor: queryCardBorder }}
          >
            {renderHighlightedQuery()}
          </div>
        </motion.div>

        {/* Step Phase Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex flex-col gap-5 w-full"
          >
            {/* 1. Scanning Step */}
            {step.phase === 'scanning' && (
              <GlassSQLTable 
                title={`TABLE: ${activeTable}`}
                rows={srcRows} 
                columns={srcCols} 
                color={step.color} 
                phase={step.phase}
                light={L}
                selectedColumns={selectedColumns}
              />
            )}

            {/* 2. WHERE Filtering Step (with Live Scanner) */}
            {step.phase === 'filtering' && (
              <div className="flex flex-col gap-4 w-full">
                {filterExpr && filterRowEvals && filterRowEvals.length > 0 && (
                  <WhereLiveScanner 
                    filterExpr={filterExpr}
                    filterColumn={filterColumn}
                    rows={srcRows}
                    rowStates={rowStates}
                    evals={filterRowEvals}
                    light={L}
                    onActiveRowChange={setActiveScanningRow}
                  />
                )}
                <GlassSQLTable 
                  title={`FILTERING: ${activeTable}`}
                  rows={srcRows} 
                  columns={srcCols} 
                  color={step.color}
                  phase={step.phase}
                  rowStates={rowStates} 
                  showPassFail={true} 
                  dimFails={true} 
                  light={L}
                  filterColumn={filterColumn}
                  activeRowIndex={activeScanningRow}
                />
              </div>
            )}

            {/* 3. GROUP BY Step */}
            {step.phase === 'grouping' && groupData && (
              <div className="flex flex-col gap-5 w-full">
                <div 
                  className="px-4 py-2.5 rounded-xl border flex items-center gap-2 self-start text-xs font-mono font-bold"
                  style={{ background: `${step.color}10`, borderColor: `${step.color}30`, color: step.color }}
                >
                  <Layers size={14} /> GROUPED BY: {groupByColumn || 'KEY'}
                </div>
                <GroupTable data={groupData} color={step.color} light={L} />
              </div>
            )}

            {/* 4. ORDER BY Step */}
            {step.phase === 'ordering' && result && (
              <div className="flex flex-col gap-4 w-full">
                <div 
                  className="px-4 py-2.5 rounded-xl border flex items-center gap-2 self-start text-xs font-mono font-bold"
                  style={{ background: `${step.color}10`, borderColor: `${step.color}30`, color: step.color }}
                >
                  <ArrowUpDown size={14} /> SORTED BY: {sortColumn || 'KEY'} ({sortDirection || 'ASC'})
                </div>
                <GlassSQLTable 
                  title={`SORTED: ${activeTable}`}
                  rows={result} 
                  columns={resultColumns} 
                  color={step.color} 
                  phase={step.phase}
                  highlightCols={highlightColumns} 
                  light={L}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                />
              </div>
            )}

            {/* 5. SELECT Projection Step */}
            {step.phase === 'projecting' && result && (
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div 
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm"
                    style={{ background: `${step.color}10`, borderColor: `${step.color}30` }}
                  >
                    <Trophy size={15} style={{ color: step.color }} />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: step.color }}>
                      Final Projected Output ({result.length} rows · {resultColumns.length} columns)
                    </span>
                  </div>

                  {/* Export CSV Action */}
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold px-3.5 py-2 rounded-xl text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    <Download size={13} />
                    <span>{copiedCSV ? 'Exported!' : 'Export Result as CSV'}</span>
                  </button>
                </div>

                <GlassSQLTable 
                  title="FINAL QUERY RESULT"
                  rows={result} 
                  columns={resultColumns} 
                  color={step.color} 
                  phase={step.phase}
                  highlightCols={highlightColumns} 
                  light={L}
                  selectedColumns={selectedColumns}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
