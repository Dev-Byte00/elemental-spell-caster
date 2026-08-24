'use client';

import React from 'react';

export function PauseOverlay({ onResume, onQuit }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel-gold rounded-2xl p-7 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center border border-[#c8922a]/80">
        <div className="text-4xl text-[#00d4f0] filter drop-shadow-[0_0_15px_rgba(0,212,240,0.8)] animate-pulse">
          ⏸️
        </div>
        <div>
          <h2 className="font-orbitron text-xl font-black text-[#fff4cc] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(232,168,48,0.6)]">
            TRIAL SUSPENDED
          </h2>
          <p className="text-xs text-[#8899bb] mt-1 font-semibold">
            Press Esc to resume invocation
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl btn-shimmer text-[#030710] font-orbitron font-black text-xs tracking-widest uppercase hover:shadow-[0_0_20px_rgba(0,212,240,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            CONTINUE TRIAL
          </button>
          <button
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl bg-[#060e1d] border border-[#1a365d] text-[#8899bb] font-orbitron font-bold text-xs tracking-wider uppercase hover:border-[#00d4f0] hover:text-[#e8f0ff] hover:bg-[#0a1830] transition-all"
          >
            RETURN TO SANCTUM
          </button>
        </div>
      </div>
    </div>
  );
}

export function GameOverOverlay({ data, onRestart, onQuit }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-[#160508] via-[#0d0305] to-[#080203] border border-red-500/80 rounded-2xl p-8 flex flex-col items-center gap-6 shadow-[0_0_60px_rgba(239,68,68,0.35)] text-center relative overflow-hidden">
        {/* Glow Aura */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

        <div className="text-5xl filter drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse">
          💀
        </div>

        <div>
          <h2 className="font-orbitron text-2xl font-black text-red-400 tracking-[0.15em] drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]">
            MANA DRAINED &bull; DEFEAT
          </h2>
          <p className="text-xs text-[#8899bb] mt-1.5 font-semibold">
            The sanctuary forces were overwhelmed by the elemental rift.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="w-full bg-[#1e070a]/90 border border-red-900/60 rounded-xl p-5 flex flex-col gap-3 text-xs shadow-inner">
          <div className="flex justify-between items-center text-[#8899bb]">
            <span className="font-orbitron font-semibold tracking-wider">FINAL SCORE</span>
            <span className="font-orbitron font-black text-lg text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
              {data.score.toLocaleString()}
            </span>
          </div>
          <div className="h-[1px] bg-red-950/60 w-full" />
          <div className="flex justify-between items-center text-[#8899bb]">
            <span className="font-orbitron font-semibold tracking-wider">PROGRESSION</span>
            <span className="font-orbitron font-bold text-sm text-[#e8f0ff]">
              {data.wave}
            </span>
          </div>
          <div className="h-[1px] bg-red-950/60 w-full" />
          <div className="flex justify-between items-center text-[#8899bb]">
            <span className="font-orbitron font-semibold tracking-wider">MONSTERS PURGED</span>
            <span className="font-orbitron font-bold text-sm text-[#e8f0ff]">
              {data.kills}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onRestart}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 via-rose-600 to-red-500 text-white font-orbitron font-black text-xs tracking-widest uppercase hover:shadow-[0_0_25px_rgba(239,68,68,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all border border-red-300/40"
          >
            REAWAKEN CONDUIT
          </button>
          <button
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl bg-[#140608] border border-red-900/60 text-[#8899bb] font-orbitron font-bold text-xs tracking-wider uppercase hover:border-red-500 hover:text-white hover:bg-[#1e090c] transition-all"
          >
            RETURN TO SANCTUM
          </button>
        </div>
      </div>
    </div>
  );
}

export function VictoryOverlay({ data, onPlayAgain, onQuit }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel-gold rounded-2xl p-8 flex flex-col items-center gap-6 shadow-[0_0_70px_rgba(232,168,48,0.5)] text-center relative overflow-hidden border border-[#c8922a]">
        {/* Top Radiant Shimmer */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ffeaa7] to-transparent" />

        <div className="text-5xl filter drop-shadow-[0_0_25px_rgba(255,215,0,0.9)] animate-bounce">
          👑
        </div>

        <div>
          <h2 className="font-orbitron text-2xl font-black text-[#fff4cc] tracking-[0.15em] drop-shadow-[0_0_15px_rgba(232,168,48,0.8)]">
            TRIUMPH &bull; ARCHMAGE
          </h2>
          <p className="text-xs text-[#8899bb] mt-1.5 font-semibold">
            All elemental realms purified through supreme mastery!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="w-full bg-[#071328]/90 border border-[#1a365d] rounded-xl p-5 flex flex-col gap-3 text-xs shadow-inner">
          <div className="flex justify-between items-center text-[#8899bb]">
            <span className="font-orbitron font-semibold tracking-wider">TOTAL SCORE</span>
            <span className="font-orbitron font-black text-lg text-[#70f3ff] drop-shadow-[0_0_10px_rgba(0,212,240,0.6)]">
              {data.score.toLocaleString()}
            </span>
          </div>
          <div className="h-[1px] bg-[#1a365d]/60 w-full" />
          <div className="flex justify-between items-center text-[#8899bb]">
            <span className="font-orbitron font-semibold tracking-wider">TRIALS CLEARED</span>
            <span className="font-orbitron font-bold text-sm text-[#ffeaa7]">
              {data.wave}
            </span>
          </div>
          <div className="h-[1px] bg-[#1a365d]/60 w-full" />
          <div className="flex justify-between items-center text-[#8899bb]">
            <span className="font-orbitron font-semibold tracking-wider">TOTAL MONSTERS PURGED</span>
            <span className="font-orbitron font-bold text-sm text-[#e8f0ff]">
              {data.kills}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl btn-shimmer text-[#030710] font-orbitron font-black text-xs tracking-widest uppercase hover:shadow-[0_0_30px_rgba(0,212,240,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all border border-[#ffeaa7]/50"
          >
            BEGIN NEW TRIAL
          </button>
          <button
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl bg-[#060e1d] border border-[#1a365d] text-[#8899bb] font-orbitron font-bold text-xs tracking-wider uppercase hover:border-[#00d4f0] hover:text-[#e8f0ff] hover:bg-[#0a1830] transition-all"
          >
            RETURN TO SANCTUM
          </button>
        </div>
      </div>
    </div>
  );
}

export function StageClearOverlay({ nextStage, onContinue }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel-gold rounded-2xl p-7 flex flex-col items-center gap-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center border border-[#c8922a]">
        <div className="text-4xl text-[#ffeaa7] filter drop-shadow-[0_0_15px_rgba(232,168,48,0.8)] animate-pulse">
          ✨
        </div>
        <div>
          <h2 className="font-orbitron text-xl font-black text-[#fff4cc] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(232,168,48,0.7)]">
            DOMAIN PURGED!
          </h2>
          <p className="text-xs text-[#8899bb] mt-2 font-semibold">
            Next Realm: <strong className="text-[#00d4f0]">{nextStage.name}</strong>
          </p>
          <p className="text-[11px] text-[#4a5a78] mt-1 italic">
            {nextStage.desc}
          </p>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3.5 rounded-xl btn-shimmer text-[#030710] font-orbitron font-black text-xs tracking-widest uppercase hover:shadow-[0_0_25px_rgba(0,212,240,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all border border-[#ffeaa7]/50"
        >
          ADVANCE TO NEXT REALM
        </button>
      </div>
    </div>
  );
}
