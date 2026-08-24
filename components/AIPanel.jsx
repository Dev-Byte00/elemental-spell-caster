'use client';

import React from 'react';
import { CONFIG } from '../game/config.jsx';

export function AIPanel({ state, modelType, videoRef, poseCanvasRef }) {
  const el = state.currentLabel;
  const isCasting = CONFIG.ELEMENTS.includes(el) && state.currentConf >= CONFIG.CONFIDENCE_THRESHOLD;
  const isLocked = state.lockedElements && state.lockedElements.includes(el);

  return (
    <aside className="w-[310px] h-full bg-gradient-to-b from-[#060e1d]/95 via-[#08152c]/95 to-[#040915]/95 border-l border-[#1a365d] flex flex-col p-4 gap-4 overflow-y-auto z-10 backdrop-blur-xl shadow-2xl">
      {/* 1. Camera Viewport / Holographic Sensor Frame */}
      <div className="relative w-full aspect-[4/3] bg-[#02050c] rounded-xl border border-[#1a365d] overflow-hidden shadow-inner flex items-center justify-center group">
        {/* Holographic Corner Reticles */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-[#00d4f0] z-20" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-[#00d4f0] z-20" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-[#00d4f0] z-20" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-[#00d4f0] z-20" />

        {/* Animated Scanline Laser */}
        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#00d4f0] to-transparent animate-scanline z-20 pointer-events-none opacity-60 shadow-[0_0_8px_#00d4f0]" />

        {modelType === 'audio' ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="text-4xl filter drop-shadow-[0_0_15px_rgba(0,212,240,0.8)] animate-pulse">
              🎤
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((b) => (
                <div
                  key={b}
                  className="w-1.5 h-6 bg-gradient-to-t from-[#00d4f0] to-[#70f3ff] rounded-full animate-bounce shadow-[0_0_6px_#00d4f0]"
                  style={{ animationDelay: `${b * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-[10px] font-orbitron font-bold text-[#00d4f0] tracking-[0.2em]">
              VOICE CONDUIT ACTIVE
            </span>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas
              ref={poseCanvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-x-[-1]"
            />
          </div>
        )}

        {/* Status Badge Tag */}
        <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-[#1a365d] text-[9px] font-mono font-bold text-[#70f3ff] tracking-widest z-20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d4f0] animate-pulse" />
          <span>{modelType.toUpperCase()} CONDUIT</span>
        </div>
      </div>

      {/* 2. Detected Class Display */}
      <div className="p-3.5 bg-gradient-to-br from-[#0b1830] to-[#060e1d] border border-[#1a365d] rounded-xl flex flex-col gap-1.5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-orbitron font-bold text-[#8899bb] tracking-wider">
            INVOKED AFFINITY
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#030712] border border-[#1a365d]">
            <span className="text-xs font-mono font-bold text-[#70f3ff]">
              {Math.round(state.currentConf * 100)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mt-0.5">
          <div className="w-9 h-9 rounded-lg bg-[#040915] border border-[#1a365d] flex items-center justify-center text-xl shadow-inner">
            {CONFIG.ELEMENT_ICONS[el] || '✨'}
          </div>
          <span
            className={`font-orbitron text-lg font-black tracking-wider ${
              isCasting
                ? isLocked
                  ? 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]'
                  : 'text-[#fff4cc] drop-shadow-[0_0_12px_rgba(232,168,48,0.9)]'
                : 'text-[#8899bb]'
            }`}
          >
            {el.toUpperCase()}
          </span>

          {isLocked && (
            <span className="px-2 py-0.5 rounded bg-red-950/90 border border-red-500/90 text-[9px] text-red-300 font-bold ml-auto font-orbitron shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              LOCKED
            </span>
          )}
        </div>
      </div>

      {/* 3. Elemental Affinity Matrix */}
      <div className="flex flex-col gap-2.5 mt-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-orbitron font-bold text-[#8899bb] tracking-wider uppercase">
            ELEMENTAL SPECTRUM
          </span>
          <span className="text-[10px] text-[#00d4f0] font-mono font-bold">
            CONFIDENCE
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {CONFIG.ELEMENTS.map((elem) => {
            const pred = state.lastPredictions?.find((p) => p.label === elem);
            const confPct = Math.round((pred?.confidence || 0) * 100);
            const isElLocked = state.lockedElements && state.lockedElements.includes(elem);
            const color = CONFIG.ELEMENT_COLORS[elem];

            return (
              <div
                key={elem}
                className="p-2 rounded-lg bg-[#040a16]/80 border border-[#102238] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold font-rajdhani">
                  <span className="flex items-center gap-1.5 text-[#e8f0ff]">
                    <span>{CONFIG.ELEMENT_ICONS[elem]}</span>
                    <span className="tracking-wide font-semibold">{elem}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {isElLocked && (
                      <span className="text-[9px] text-red-400 font-mono font-bold">
                        🔒 UNTRAINED
                      </span>
                    )}
                    <span className="font-mono font-bold text-xs" style={{ color: confPct > 50 ? color : '#8899bb' }}>
                      {confPct}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-[#02050c] rounded-full border border-[#102238] overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full transition-all duration-200 relative overflow-hidden"
                    style={{
                      width: `${confPct}%`,
                      backgroundColor: color,
                      boxShadow: confPct > 60 ? `0 0 10px ${color}` : 'none'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
