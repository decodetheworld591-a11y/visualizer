"use client";

import React, { useEffect, useState } from 'react';
import { VisualizationCanvas } from './VisualizationCanvas';
import { SQLEditor } from './SQLEditor';
import { useSQLStore } from '@/store/sqlStore';
import { Database, Palette, Moon, Sun } from 'lucide-react';

export function MainApp() {
  const { tables, activeTable, setActiveTable, isLightMode, toggleLightMode } = useSQLStore();
  const [themeHue, setThemeHue] = useState(230);

  useEffect(() => {
    if (Object.keys(tables).length > 0 && !activeTable) {
      setActiveTable(Object.keys(tables)[0]);
    }
  }, [tables, activeTable, setActiveTable]);

  const changeTheme = () => setThemeHue((h) => (h + 80) % 360);

  const bg = isLightMode 
    ? `radial-gradient(ellipse at 20% 20%, hsla(${themeHue}, 30%, 92%, 0.6) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, hsla(${themeHue + 40}, 30%, 92%, 0.6) 0%, transparent 55%), #f8f9fc`
    : `radial-gradient(ellipse at 20% 20%, hsla(${themeHue}, 50%, 12%, 0.5) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, hsla(${themeHue + 40}, 50%, 12%, 0.5) 0%, transparent 60%), #07080f`;

  const headerBg = isLightMode ? 'rgba(255,255,255,0.8)' : 'rgba(7,8,15,0.75)';
  const headerBorder = isLightMode ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.06)';
  const fgPrimary = isLightMode ? '#111' : '#fff';
  const fgMuted = isLightMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const btnBg = isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
  const btnBorder = isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  return (
    <div className="relative w-full h-full flex flex-col transition-all duration-700" style={{ background: bg }}>
      
      {/* Header */}
      <header
        className="h-12 flex-shrink-0 flex items-center justify-between px-5 z-50 relative"
        style={{ background: headerBg, backdropFilter: 'blur(20px)', borderBottom: headerBorder }}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-700"
            style={{ background: `linear-gradient(135deg, hsl(${themeHue}, 80%, 60%), hsl(${themeHue + 20}, 80%, 60%))`, boxShadow: `0 0 12px hsla(${themeHue}, 80%, 60%, 0.4)` }}
          >
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <span className="font-bold text-sm tracking-wide" style={{ color: fgPrimary }}>SQL Motion</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded font-mono"
            style={{ background: `hsla(${themeHue}, 80%, 60%, 0.12)`, border: `1px solid hsla(${themeHue}, 80%, 60%, 0.25)`, color: `hsl(${themeHue}, 80%, ${isLightMode ? '40%' : '72%'})` }}
          >
            Interactive
          </span>
        </div>

        {/* Right: Table tabs + controls */}
        <div className="flex items-center gap-3">
          {/* Table Tabs */}
          <div className="flex items-center gap-1">
            {Object.keys(tables).map(t => (
              <button
                key={t}
                onClick={() => setActiveTable(t)}
                className="text-[11px] px-2.5 py-1 rounded font-mono transition-all flex items-center gap-1"
                style={{
                  background: activeTable === t ? btnBg : 'transparent',
                  color: activeTable === t ? fgPrimary : fgMuted,
                  border: `1px solid ${activeTable === t ? btnBorder : 'transparent'}`
                }}
              >
                <Database size={10} /> {t}
              </button>
            ))}
          </div>

          <div className="w-px h-3.5" style={{ background: btnBorder }} />

          {/* Color + Theme toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={changeTheme}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all border"
              style={{ color: fgMuted, borderColor: btnBorder }}
            >
              <Palette size={12} /> Color
            </button>
            <button
              onClick={toggleLightMode}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all border"
              style={{ color: fgMuted, borderColor: btnBorder }}
            >
              {isLightMode ? <Moon size={12} /> : <Sun size={12} />}
              {isLightMode ? 'Dark' : 'Light'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left: Editor + Steps */}
        <div className="w-[420px] flex-shrink-0 flex flex-col min-h-0 relative z-30">
          <SQLEditor />
        </div>

        {/* Divider */}
        <div className="w-px flex-shrink-0" style={{ background: isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />

        {/* Right: Visualization */}
        <div className="flex-1 min-h-0 min-w-0 relative">
          <VisualizationCanvas />
        </div>

      </div>
    </div>
  );
}
