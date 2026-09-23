"use client";

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Upload, Zap, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, RefreshCw, BookOpen } from 'lucide-react';
import { useSQLStore, VisualizationStep, TableRow } from '@/store/sqlStore';
import { initDatabase, executeQuery, addTableToDb, isDbReady } from '@/lib/sqlEngine';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const EXAMPLES = [
  { label: '📋 Basic SELECT', query: 'SELECT name, age, city\nFROM students;' },
  { label: '🔍 WHERE Filter', query: 'SELECT name, age, city\nFROM students\nWHERE age > 20\nORDER BY age DESC;' },
  { label: '📊 GROUP BY', query: 'SELECT city, COUNT(*) as count\nFROM students\nGROUP BY city;' },
  { label: '🏢 Employee Query', query: 'SELECT name, dept, salary\nFROM employees\nWHERE salary > 75000\nORDER BY salary DESC;' },
  { label: '🛒 Products', query: 'SELECT name, category, price\nFROM products\nWHERE price > 200\nORDER BY price;' },
];

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseTableName(query: string, availableTables: string[]): string {
  const m = query.match(/FROM\s+[`"']?([a-zA-Z0-9_]+)[`"']?/i);
  if (!m) return availableTables[0] || 'students';
  const raw = m[1].toLowerCase();
  const exact = availableTables.find(t => t.toLowerCase() === raw);
  return exact || raw;
}

function parseWhere(query: string): string | null {
  const m = query.match(/WHERE\s+([\s\S]+?)(?:\s+GROUP\s+BY|\s+HAVING|\s+ORDER\s+BY|\s+LIMIT|;|$)/i);
  return m ? m[1].trim() : null;
}

function parseSelect(query: string): string[] {
  const m = query.match(/SELECT\s+([\s\S]+?)\s+FROM/i);
  if (!m) return [];
  const raw = m[1].trim();
  if (raw === '*') return [];
  return raw.split(',').map(c => c.trim().replace(/.*\s+as\s+/i, '').replace(/[()]/g, '').trim());
}

function parseGroupBy(query: string): string | null {
  const m = query.match(/GROUP\s+BY\s+([a-zA-Z0-9_]+)/i);
  return m ? m[1] : null;
}

function parseOrderBy(query: string): { column: string; direction: 'ASC' | 'DESC' } | null {
  const m = query.match(/ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?/i);
  if (!m) return null;
  return {
    column: m[1],
    direction: (m[2]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC'
  };
}

export function SQLEditor() {
  const { 
    query, setQuery, runQuery, status, tables, setStatus, setResult, setSteps, setCurrentStep,
    currentStep, steps, nextStep, prevStep, setRowStates, setHighlightColumns, setFilterExpr,
    setStepMetadata, setSortedRows, setGroupData, setActiveTable, reset, addTable, isLightMode
  } = useSQLStore();

  const [dbReady, setDbReady] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initDatabase(tables).then(() => setDbReady(true)).catch(e => setStatus('error', e.message));
  }, []);

  const handleRun = () => {
    if (!dbReady) return;
    reset();
    runQuery();

    const q = query.trim();
    const available = Object.keys(tables);
    const tableName = parseTableName(q, available);
    const filterExpr = parseWhere(q);
    const selectedCols = parseSelect(q);
    const groupByCol = parseGroupBy(q);
    const orderByParsed = parseOrderBy(q);
    
    const srcRows = tables[tableName] || tables[available[0]] || [];
    const allCols = srcRows.length > 0 ? Object.keys(srcRows[0]) : [];

    setActiveTable(tableName);

    // Find the column referenced in the WHERE condition
    let filterCol: string | null = null;
    if (filterExpr) {
      const match = allCols.find(c => new RegExp(`\\b${c}\\b`, 'i').test(filterExpr));
      filterCol = match || null;
    }

    const newSteps: VisualizationStep[] = [];
    
    newSteps.push({
      id: 'step-from', phase: 'scanning', title: 'SCAN TABLE', sqlKeyword: 'FROM',
      description: `The database locates the "${tableName}" table and reads all ${srcRows.length} rows into working memory.`,
      concept: 'FROM defines the source dataset for the query.',
      color: '#3b82f6', icon: 'Database'
    });

    if (filterExpr) {
      newSteps.push({
        id: 'step-where', phase: 'filtering', title: 'FILTER ROWS', sqlKeyword: 'WHERE',
        description: `Each row is evaluated against: ${filterExpr}. Rows returning FALSE are discarded.`,
        concept: 'WHERE filters rows before any grouping or selecting.',
        color: '#f97316', icon: 'Filter'
      });
    }

    if (groupByCol) {
      newSteps.push({
        id: 'step-group', phase: 'grouping', title: 'GROUP DATA', sqlKeyword: 'GROUP BY',
        description: `Rows with identical "${groupByCol}" values are grouped into aggregated buckets.`,
        concept: 'GROUP BY collapses rows sharing a key into summaries.',
        color: '#06b6d4', icon: 'Layers'
      });
    }

    if (orderByParsed) {
      newSteps.push({
        id: 'step-order', phase: 'ordering', title: 'SORT ROWS', sqlKeyword: 'ORDER BY',
        description: `Rows are sorted by "${orderByParsed.column}" in ${orderByParsed.direction} order.`,
        concept: 'ORDER BY determines the final row sequence.',
        color: '#eab308', icon: 'ArrowUpDown'
      });
    }

    const finalCols = selectedCols.length > 0 ? selectedCols : allCols;
    newSteps.push({
      id: 'step-select', phase: 'projecting', title: 'SELECT COLUMNS', sqlKeyword: 'SELECT',
      description: selectedCols.length > 0 
        ? `Columns (${finalCols.join(', ')}) are extracted. Unselected columns are dropped.`
        : `All columns (*) are preserved in the final output projection.`,
      concept: 'SELECT (projection) runs logically last — it chooses which attributes to output.',
      color: '#a855f7', icon: 'Sparkles'
    });

    // Compute WHERE states using SQLite rowid
    const rs: Record<string, 'normal'|'pass'|'fail'> = {};
    const evals: Array<{ index: number; value: any; passed: boolean; expression: string }> = [];

    if (filterExpr) {
      try {
        const testQuery = `SELECT rowid FROM "${tableName}" WHERE ${filterExpr};`;
        const testRes = executeQuery(testQuery);
        const passingRowIds = new Set<number>();
        testRes.rows.forEach(r => {
          if (r.rowid !== undefined) passingRowIds.add(Number(r.rowid));
        });

        srcRows.forEach((row, i) => {
          const key = `row_${i}`;
          const passed = passingRowIds.has(i + 1);
          rs[key] = passed ? 'pass' : 'fail';
          const val = filterCol ? row[filterCol] : undefined;
          evals.push({
            index: i,
            value: val,
            passed,
            expression: filterCol ? `${filterCol} = ${val !== undefined ? JSON.stringify(val) : 'NULL'}` : filterExpr
          });
        });
      } catch (err) {
        console.warn('Filter query error:', err);
        srcRows.forEach((row, i) => {
          rs[`row_${i}`] = 'normal';
        });
      }
    }

    setRowStates(rs);
    setFilterExpr(filterExpr);
    setHighlightColumns(finalCols);
    setStepMetadata({
      filterColumn: filterCol,
      sortColumn: orderByParsed ? orderByParsed.column : null,
      sortDirection: orderByParsed ? orderByParsed.direction : null,
      groupByColumn: groupByCol,
      selectedColumns: selectedCols,
      filterRowEvals: evals,
    });

    if (groupByCol) {
      const groups: Record<string, TableRow[]> = {};
      const validRows = filterExpr ? srcRows.filter((_, i) => rs[`row_${i}`] === 'pass') : srcRows;
      validRows.forEach(r => {
        const key = String(r[groupByCol] ?? 'NULL');
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });
      setGroupData(groups);
    }

    setSteps(newSteps);

    try {
      const { columns, rows } = executeQuery(q);
      setResult(rows, columns);
    } catch (e: any) {
      setStatus('error', e.message);
    }
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const rawLines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
        if (rawLines.length < 2) throw new Error('CSV must contain a header and at least one data row');

        const rawColumns = parseCSVLine(rawLines[0]);
        const columns = rawColumns.map((c, i) => {
          const cleaned = c.replace(/^["']|["']$/g, '').replace(/[^a-zA-Z0-9_]/g, '_').trim();
          return cleaned || `col_${i + 1}`;
        });

        const rows = rawLines.slice(1).map(line => {
          const vals = parseCSVLine(line);
          const obj: any = {};
          columns.forEach((col, i) => {
            const rawVal = vals[i] !== undefined ? vals[i].replace(/^["']|["']$/g, '').trim() : '';
            const num = Number(rawVal);
            obj[col] = !isNaN(num) && rawVal !== '' ? num : rawVal;
          });
          return obj;
        });

        let tableName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        if (/^[0-9]/.test(tableName)) tableName = 't_' + tableName;
        if (!tableName) tableName = 'custom_table';
        
        addTableToDb(tableName, columns, rows);
        addTable(tableName, rows);
        setActiveTable(tableName);
        setQuery(`SELECT *\nFROM ${tableName};`);
      } catch (err: any) {
        setStatus('error', `CSV Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Colors based on theme
  const cardBg = isLightMode ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.03)';
  const cardBorder = isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const textMuted = isLightMode ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)';

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-3 gap-3">
      
      {/* Editor Card */}
      <div 
        className="p-4 flex flex-col gap-3 rounded-2xl backdrop-blur-xl transition-colors flex-shrink-0"
        style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: textMuted }}>
            Query Editor
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg transition-all"
                style={{ color: textMuted, border: `1px solid ${cardBorder}` }}
              >
                <Zap size={12} /> Examples <ChevronDown size={12} />
              </button>
              {showExamples && (
                <div 
                  className="absolute top-full mt-1 right-0 w-52 rounded-xl overflow-hidden z-50 py-1 shadow-2xl backdrop-blur-xl"
                  style={{ background: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(15,15,25,0.95)', border: `1px solid ${cardBorder}` }}
                >
                  {EXAMPLES.map(ex => (
                    <button
                      key={ex.label}
                      onClick={() => { setQuery(ex.query); setShowExamples(false); reset(); }}
                      className="w-full text-left px-3.5 py-2 text-xs transition-colors"
                      style={{ color: isLightMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg transition-all"
              style={{ color: textMuted, border: `1px solid ${cardBorder}` }}
            >
              <Upload size={12} /> CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          </div>
        </div>

        {/* Monaco Editor */}
        <div 
          className="rounded-xl overflow-hidden transition-colors" 
          style={{ 
            height: 160, 
            background: isLightMode ? 'rgba(0,0,0,0.025)' : 'rgba(0,0,0,0.3)', 
            border: `1px solid ${isLightMode ? 'rgba(0,0,0,0.06)' : cardBorder}` 
          }}
        >
          <MonacoEditor
            height="100%"
            defaultLanguage="sql"
            value={query}
            onChange={v => setQuery(v || '')}
            theme={isLightMode ? 'sql-light' : 'sql-dark'}
            options={{
              minimap: { enabled: false },
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
              lineNumbers: 'off',
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              renderLineHighlight: 'none',
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              contextmenu: false,
              padding: { top: 12, bottom: 12 },
              wordWrap: 'on',
            }}
            onMount={(editor, monaco) => {
              monaco.editor.defineTheme('sql-dark', {
                base: 'vs-dark', inherit: true,
                rules: [
                  { token: 'keyword', foreground: '60a5fa', fontStyle: 'bold' },
                  { token: 'identifier', foreground: 'e2e8f0' },
                  { token: 'string', foreground: '34d399' },
                  { token: 'number', foreground: 'fbbf24' },
                  { token: 'operator', foreground: 'f97316' },
                ],
                colors: { 'editor.background': '#00000000' }
              });
              monaco.editor.defineTheme('sql-light', {
                base: 'vs', inherit: true,
                rules: [
                  { token: 'keyword', foreground: '2563eb', fontStyle: 'bold' },
                  { token: 'identifier', foreground: '1f2937' },
                  { token: 'string', foreground: '059669' },
                  { token: 'number', foreground: 'd97706' },
                  { token: 'operator', foreground: 'ea580c' },
                ],
                colors: { 'editor.background': '#00000000' }
              });
              monaco.editor.setTheme(isLightMode ? 'sql-light' : 'sql-dark');
            }}
          />
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={!dbReady}
          className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
            opacity: !dbReady ? 0.5 : 1
          }}
        >
          <Play size={14} fill="currentColor" /> Visualize Execution
        </button>

        {status === 'error' && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            {useSQLStore.getState().errorMessage}
          </div>
        )}
      </div>

      {/* Step Navigation Card */}
      {status === 'success' && steps.length > 0 && (
        <div 
          className="flex flex-col gap-3 p-4 rounded-2xl backdrop-blur-xl transition-colors flex-shrink-0"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: textMuted }} />
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: textMuted }}>
                Execution Plan
              </span>
            </div>
            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', color: textMuted }}>
              {currentStep + 1} / {steps.length}
            </div>
          </div>

          {/* Step List */}
          <div className="flex flex-col gap-1.5">
            {steps.map((step, idx) => {
              const isActive = idx === currentStep;
              const isPast = idx < currentStep;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(idx)}
                  className="p-2.5 rounded-xl flex items-center gap-2.5 transition-all text-left"
                  style={{
                    background: isActive ? `${step.color}12` : 'transparent',
                    border: `1px solid ${isActive ? `${step.color}35` : 'transparent'}`,
                    boxShadow: isActive ? `0 2px 12px ${step.color}15` : 'none',
                  }}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 transition-all"
                    style={{ 
                      background: isActive || isPast ? step.color : (isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'),
                      color: isActive || isPast ? '#fff' : textMuted,
                      boxShadow: isActive ? `0 0 10px ${step.color}40` : 'none'
                    }}
                  >
                    {isPast && !isActive ? <CheckCircle2 size={12} /> : idx + 1}
                  </div>
                  <span className="text-xs font-semibold flex-1" style={{ color: isActive ? step.color : (isLightMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)') }}>
                    {step.title}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', color: textMuted }}>
                    {step.sqlKeyword}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Concept Card */}
          <div 
            className="p-3 rounded-xl relative overflow-hidden transition-colors"
            style={{ 
              border: `1px solid ${steps[currentStep].color}15`,
              background: isLightMode ? `${steps[currentStep].color}04` : 'rgba(0,0,0,0.25)',
            }}
          >
            <div className="absolute top-0 left-0 w-1 h-full rounded-full" style={{ background: steps[currentStep].color }} />
            <div className="pl-3">
              <p className="text-xs leading-relaxed mb-2" style={{ color: isLightMode ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.75)' }}>
                {steps[currentStep].description}
              </p>
              <p className="text-[10px] italic" style={{ color: textMuted }}>
                💡 {steps[currentStep].concept}
              </p>
            </div>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all disabled:opacity-25"
              style={{ border: `1px solid ${cardBorder}`, color: isLightMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={nextStep}
              disabled={currentStep === steps.length - 1}
              className="flex-1 py-2 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-white transition-all disabled:opacity-25 hover:brightness-110"
              style={{
                background: currentStep === steps.length - 1 ? (isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)') : steps[currentStep].color,
                color: currentStep === steps.length - 1 ? textMuted : '#fff',
                boxShadow: currentStep < steps.length - 1 ? `0 2px 10px ${steps[currentStep].color}30` : 'none'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Idle state */}
      {status === 'idle' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-30 px-6">
            <RefreshCw size={28} className="mx-auto mb-3" />
            <p className="text-xs">Write a SQL query and click run to visualize each step.</p>
          </div>
        </div>
      )}
    </div>
  );
}
