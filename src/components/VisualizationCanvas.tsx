"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSQLStore, TableRow } from '@/store/sqlStore';
import { CheckCircle2, XCircle, Filter, Layers, ArrowUpDown, Sparkles, Database, Trophy } from 'lucide-react';

/* ─── Compact Data Table ─── */
function DataTable({
  title, rows, columns, color, highlightCols = [], rowStates = {}, showPassFail = false, dimFails = false, light = false
}: {
  title: string; rows: TableRow[]; columns: string[]; color: string; 
  highlightCols?: string[]; rowStates?: Record<string, string>; showPassFail?: boolean; dimFails?: boolean;
  light?: boolean;
}) {
  const colCount = columns.length + (showPassFail ? 1 : 0);

  // Theme-aware colors
  const tableBg = light ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const tableBorder = light ? `${color}25` : `${color}30`;
  const headerBg = light ? `${color}08` : `${color}12`;
  const headerBorder = light ? `${color}15` : `${color}20`;
  const colHeaderBg = light ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
  const colHeaderBorder = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  const colInactive = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
  const rowBorder = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
  const cellColor = light ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.8)';
  const rowCountColor = light ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
  const evenRowBg = light ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.015)';
  const passRowBg = light ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)';
  const failRowBg = light ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.04)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className="rounded-2xl overflow-hidden w-full shadow-lg"
      style={{
        border: `1px solid ${tableBorder}`,
        background: tableBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}` }}>
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase" style={{ color }}>
          <Database size={14} /> {title}
        </div>
        <div className="text-[10px] font-mono" style={{ color: rowCountColor }}>{rows.length} rows</div>
      </div>
      
      {/* Column Headers */}
      <div 
        className="grid text-[10px] font-mono uppercase tracking-wider"
        style={{
          gridTemplateColumns: `repeat(${colCount}, minmax(0,1fr))`,
          background: colHeaderBg, borderBottom: `1px solid ${colHeaderBorder}`,
        }}
      >
        {columns.map(c => (
          <div key={c} className="px-3 py-2 text-center" style={{ color: highlightCols.includes(c) ? color : colInactive, fontWeight: highlightCols.includes(c) ? 700 : 400 }}>
            {c}
          </div>
        ))}
        {showPassFail && <div className="px-3 py-2 text-center" style={{ color: colInactive }}>Status</div>}
      </div>

      {/* Rows */}
      <div className="max-h-[280px] overflow-y-auto no-scrollbar">
        <AnimatePresence mode="popLayout">
          {rows.map((r, i) => {
            const rId = String(r.id ?? r.name ?? i);
            const rState = rowStates[rId];
            const isFail = dimFails && rState === 'fail';
            
            let bg = i % 2 === 0 ? evenRowBg : 'transparent';
            if (rState === 'pass') bg = passRowBg;
            if (rState === 'fail') bg = failRowBg;

            return (
              <motion.div
                key={rId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: isFail ? 0.18 : 1, 
                  x: 0,
                  scale: isFail ? 0.98 : 1,
                  transition: { delay: i * 0.03, type: 'spring', damping: 25 }
                }}
                className="grid"
                style={{ 
                  gridTemplateColumns: `repeat(${colCount}, minmax(0,1fr))`,
                  background: bg,
                  borderBottom: `1px solid ${rowBorder}`,
                }}
              >
                {columns.map(c => (
                  <div key={c} className="px-3 py-2.5 text-center text-xs font-mono" style={{ color: highlightCols.includes(c) ? color : cellColor }}>
                    {r[c] !== undefined ? String(r[c]) : '—'}
                  </div>
                ))}
                {showPassFail && (
                  <div className="flex items-center justify-center">
                    {rState === 'pass' && <CheckCircle2 size={14} className="text-emerald-500" />}
                    {rState === 'fail' && <XCircle size={14} className="text-red-400" />}
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── Group Component ─── */
function GroupTable({ data, color, light = false }: { data: Record<string, TableRow[]>, color: string, light?: boolean }) {
  const cardBg = light ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.4)';
  const cardBorder = light ? `${color}20` : `${color}30`;
  const headerBg = light ? `${color}08` : `${color}15`;
  const countBg = light ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.4)';
  const countColor = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)';
  const itemBg = light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';
  const itemBorder = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
  const itemColor = light ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.7)';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 gap-4 w-full"
    >
      {Object.entries(data).map(([key, rows], idx) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08, type: 'spring', damping: 20 }}
          className="rounded-xl overflow-hidden"
          style={{ border: `1px solid ${cardBorder}`, background: cardBg, backdropFilter: 'blur(16px)' }}
        >
          <div className="px-3 py-2 flex items-center justify-between" style={{ background: headerBg }}>
            <span className="font-bold uppercase tracking-widest text-xs" style={{ color }}>{key}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: countBg, color: countColor }}>COUNT: {rows.length}</span>
          </div>
          <div className="p-2.5 flex flex-col gap-1.5">
            {rows.map((r, i) => (
              <div key={i} className="text-xs font-mono px-2.5 py-1.5 rounded text-center" style={{ background: itemBg, border: `1px solid ${itemBorder}`, color: itemColor }}>
                {String(r.name ?? r.id ?? '?')}
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
    query, status, tables, activeTable, steps, currentStep, isLightMode,
    rowStates, highlightColumns, filterExpr, groupData, result, resultColumns 
  } = useSQLStore();

  const L = isLightMode; // shorthand

  if (status !== 'success' || steps.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative">
        <div className={`absolute inset-0 ${L ? 'grid-bg-light' : 'grid-bg'} opacity-30`} />
        <div className="w-80 h-80 rounded-full blur-[100px] absolute" style={{ background: L ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.1)' }} />
        <div className="relative z-10 text-center px-10">
          <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: L ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }}>
            Visualize <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">SQL</span>
          </h1>
          <p className="font-mono text-sm max-w-sm mx-auto leading-relaxed" style={{ color: L ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.3)' }}>
            Write a query on the left and click &quot;Visualize Execution&quot; to see a step-by-step breakdown here.
          </p>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];
  const srcRows = tables[activeTable] || [];
  const srcCols = srcRows.length > 0 ? Object.keys(srcRows[0]) : [];

  // Highlighted query
  const renderHighlightedQuery = () => {
    const keyword = step.sqlKeyword;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = query.split(regex);
    return (
      <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed" style={{ color: L ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }}>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="font-bold rounded px-1" style={{ color: step.color, background: L ? `${step.color}15` : `${step.color}25` }}>
              {part}
            </span>
          ) : <span key={i}>{part}</span>
        )}
      </div>
    );
  };

  // Theme values
  const ambientGlow = L ? `${step.color}05` : `${step.color}08`;
  const queryCardBg = L ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
  const queryCardBorder = L ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const badgeBg = L ? `${step.color}08` : `${step.color}10`;
  const badgeBorder = L ? `${step.color}20` : `${step.color}30`;
  const filterBadgeBg = L ? 'rgba(249,115,22,0.06)' : 'rgba(249,115,22,0.08)';
  const filterBadgeBorder = L ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.2)';
  const resultBadgeBg = L ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.1)';
  const resultBadgeBorder = L ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.2)';
  const dividerGrad = L ? `${step.color}20` : `${step.color}30`;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto no-scrollbar relative">
      
      {/* Ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 transition-all duration-700"
        style={{ background: `radial-gradient(circle at 50% 30%, ${ambientGlow} 0%, transparent 60%)` }}
      />
      <div className={`absolute inset-0 ${L ? 'grid-bg-light' : 'grid-bg'} opacity-20 pointer-events-none z-0`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-5 p-8 pb-16">

        {/* Step Badge + Query */}
        <motion.div 
          key={step.id + '-header'}
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25 }}
          className="flex flex-col gap-4"
        >
          {/* Badge row */}
          <div className="flex items-center gap-3">
            <div 
              className="px-4 py-2 rounded-xl border flex items-center gap-2 shadow-sm"
              style={{ borderColor: badgeBorder, background: badgeBg, backdropFilter: 'blur(10px)' }}
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
            <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${dividerGrad}, transparent)` }} />
          </div>

          {/* Query card */}
          <div 
            className="p-4 rounded-xl backdrop-blur-sm"
            style={{ background: queryCardBg, border: `1px solid ${queryCardBorder}` }}
          >
            {renderHighlightedQuery()}
          </div>
        </motion.div>

        {/* Phase content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-4"
          >
            {step.phase === 'scanning' && (
              <DataTable title={activeTable} rows={srcRows} columns={srcCols} color={step.color} light={L} />
            )}

            {step.phase === 'filtering' && (
              <>
                <div className="px-4 py-2.5 rounded-xl font-mono text-sm font-bold flex items-center gap-2 self-start" style={{ background: filterBadgeBg, border: `1px solid ${filterBadgeBorder}`, color: '#f97316' }}>
                  <Filter size={16} /> WHERE {filterExpr}
                </div>
                <DataTable title={activeTable} rows={srcRows} columns={srcCols} color={step.color} rowStates={rowStates} showPassFail={true} dimFails={true} light={L} />
              </>
            )}

            {step.phase === 'grouping' && groupData && (
              <GroupTable data={groupData} color={step.color} light={L} />
            )}

            {step.phase === 'ordering' && result && (
              <DataTable title="SORTED RESULT" rows={result} columns={resultColumns} color={step.color} highlightCols={highlightColumns} light={L} />
            )}

            {step.phase === 'projecting' && result && (
              <>
                <div className="flex items-center gap-2 self-start px-4 py-2 rounded-xl" style={{ background: resultBadgeBg, border: `1px solid ${resultBadgeBorder}` }}>
                  <Trophy size={16} className="text-purple-500" />
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-widest">Final Result — {result.length} rows</span>
                </div>
                <DataTable title="RESULT" rows={result} columns={resultColumns} color={step.color} highlightCols={highlightColumns} light={L} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
