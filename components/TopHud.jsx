'use client';

import React from 'react';
import { CONFIG } from '../game/config.jsx';

export function TopHud({ state, fps, onPause }) {
  const { hp, maxHp, mana, maxMana } = state.player || {
    hp: CONFIG.PLAYER_MAX_HP,
    maxHp: CONFIG.PLAYER_MAX_HP,
    mana: CONFIG.PLAYER_MAX_MANA,
    maxMana: CONFIG.PLAYER_MAX_MANA
  };

  const hpPct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
  const manaPct = Math.max(0, Math.min(100, Math.round((mana / maxMana) * 100)));

  const waveTitle = state.mode === 'story'
    ? (CONFIG.STORY_STAGES_DATA[state.stage]?.name || `STAGE ${state.stage + 1}`)
    : state.mode === 'endless'
    ? `ENDLESS WAVE ${state.wave}`
    : `WAVE ${state.wave} / ${CONFIG.MAX_WAVES}`;

  return (
    <header className="h-16 w-full bg-gradient-to-r from-[#050c18]/95 via-[#08152c]/95 to-[#050c18]/95 backdrop-blur-xl border-b border-[#1a365d] px-6 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-20 relative">
      {/* Left: Health & Mana Resource Capsules */}
      <div className="flex items-center gap-7">
        {/* Health Bar */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-900 border border-red-400/80 flex items-center justify-center text-xs shadow-[0_0_12px_rgba(239,68,68,0.6)]">
            ❤️
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold font-orbitron tracking-wider">
              <span className="text-red-400">HEALTH</span>
              <span className="text-[#e8f0ff] font-mono">{hp} / {maxHp}</span>
            </div>
            <div className="w-40 h-3.5 bg-[#040810] rounded-full border border-[#1a365d] overflow-hidden p-[1.5px] relative shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
                  hpPct > 50
                    ? 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
                    : hpPct > 25
                    ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 shadow-[0_0_10px_rgba(234,179,8,0.6)]'
                    : 'bg-gradient-to-r from-rose-700 via-red-600 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse'
                }`}
                style={{ width: `${hpPct}%` }}
              >
                {/* Liquid Sheen */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Mana Bar */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-900 border border-cyan-400/80 flex items-center justify-center text-xs shadow-[0_0_12px_rgba(0,212,240,0.6)]">
            💧
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-bold font-orbitron tracking-wider">
              <span className="text-cyan-400">MANA</span>
              <span className="text-[#e8f0ff] font-mono">{Math.round(mana)} / {maxMana}</span>
            </div>
            <div className="w-40 h-3.5 bg-[#040810] rounded-full border border-[#1a365d] overflow-hidden p-[1.5px] relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-300 rounded-full transition-all duration-300 relative overflow-hidden shadow-[0_0_10px_rgba(0,212,240,0.6)]"
                style={{ width: `${manaPct}%` }}
              >
                {/* Liquid Sheen */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Stage/Wave Banner */}
      <div className="flex flex-col items-center">
        <div className="px-5 py-1 rounded-full bg-[#08162e]/90 border border-[#c8922a]/70 shadow-[0_0_15px_rgba(200,146,42,0.3)] flex items-center gap-2">
          <span className="text-xs text-[#e8a830]">✦</span>
          <h2 className="font-orbitron text-xs md:text-sm font-black tracking-[0.2em] text-[#fff4cc] drop-shadow-[0_0_10px_rgba(232,168,48,0.7)]">
            {waveTitle}
          </h2>
          <span className="text-xs text-[#e8a830]">✦</span>
        </div>
      </div>

      {/* Right: Score, KOs, FPS, Pause */}
      <div className="flex items-center gap-5">
        {/* Score Pill */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-[#8899bb] font-orbitron tracking-wider">
            SCORE
          </span>
          <span className="font-orbitron text-base font-black text-[#70f3ff] drop-shadow-[0_0_10px_rgba(0,212,240,0.6)]">
            {state.score.toLocaleString()}
          </span>
        </div>

        {/* Purged Kills */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-[#8899bb] font-orbitron tracking-wider">
            PURGED
          </span>
          <span className="font-orbitron text-base font-black text-[#e8f0ff] drop-shadow">
            {state.totalKills}
          </span>
        </div>

        {/* FPS Badge */}
        <div className="px-2.5 py-1 rounded-lg bg-[#040914] border border-[#1a365d] flex items-center gap-1.5 shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-[#8899bb]">
            {Math.round(fps)} FPS
          </span>
        </div>

        {/* Pause Button */}
        <button
          onClick={onPause}
          className="p-2 rounded-xl bg-[#08152c] border border-[#1a365d] text-[#00d4f0] hover:border-[#00d4f0] hover:bg-[#00d4f0]/20 hover:shadow-[0_0_15px_rgba(0,212,240,0.5)] transition-all active:scale-95"
          title="Pause (Esc)"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1.5" />
            <rect x="15" y="4" width="4" height="16" rx="1.5" />
          </svg>
        </button>
      </div>
    </header>
  );
}
