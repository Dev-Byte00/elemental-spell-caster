'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MenuParticleSystem } from '../game/particles.jsx';

export function SetupScreen({ onStartGame, isLoading, errorMessage }) {
  const [modelUrl, setModelUrl] = useState('');
  const [modelType, setModelType] = useState('pose');
  const [gameMode, setGameMode] = useState('wave');
  const [cheatCode, setCheatCode] = useState(false);
  const particleCanvasRef = useRef(null);
  const particleSystemRef = useRef(null);

  useEffect(() => {
    if (particleCanvasRef.current) {
      particleSystemRef.current = new MenuParticleSystem(particleCanvasRef.current);
      particleSystemRef.current.start();
    }
    return () => {
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
      }
    };
  }, []);

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setModelUrl(val);
    const lower = val.trim().toLowerCase();
    if (lower === 'cheat' || lower === 'mock' || lower === 'keyboard' || lower === 'admin') {
      setCheatCode(true);
    } else {
      setCheatCode(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onStartGame({
      modelUrl,
      modelType,
      gameMode,
      cheatMode: cheatCode
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-[#02050c] via-[#060e1d] to-[#010307] overflow-hidden z-10">
      {/* Background Particle Canvas */}
      <canvas
        ref={particleCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-70"
      />

      {/* Multi-Layered Rotating Arcane Magic Circle Array */}
      <div className="absolute w-[780px] h-[780px] pointer-events-none z-0 opacity-25 magic-circle-glow">
        <svg viewBox="0 0 500 500" className="w-full h-full animate-spin-slow">
          {/* Outer Runic Ring */}
          <circle cx="250" cy="250" r="242" fill="none" stroke="#00d4f0" strokeWidth="1.8" strokeDasharray="14 8" />
          <circle cx="250" cy="250" r="230" fill="none" stroke="#c8922a" strokeWidth="1.2" />
          <circle cx="250" cy="250" r="195" fill="none" stroke="#00d4f0" strokeWidth="2" />
          <circle cx="250" cy="250" r="150" fill="none" stroke="#c8922a" strokeWidth="1.5" strokeDasharray="10 5" />
          {/* Dual Sacred Triangles */}
          <polygon points="250,55 419,348 81,348" fill="none" stroke="#e8a830" strokeWidth="1.8" />
          <polygon points="250,445 419,152 81,152" fill="none" stroke="#00d4f0" strokeWidth="1.8" />
          {/* Core Glyph */}
          <circle cx="250" cy="250" r="90" fill="none" stroke="#00d4f0" strokeWidth="1.2" strokeDasharray="6 6" />
          <circle cx="250" cy="250" r="30" fill="none" stroke="#e8a830" strokeWidth="2.5" />
        </svg>
      </div>

      <div className="absolute w-[580px] h-[580px] pointer-events-none z-0 opacity-20 magic-circle-glow">
        <svg viewBox="0 0 500 500" className="w-full h-full animate-spin-reverse-slow">
          <circle cx="250" cy="250" r="180" fill="none" stroke="#ffeaa7" strokeWidth="1.2" strokeDasharray="8 6" />
          <circle cx="250" cy="250" r="120" fill="none" stroke="#00d4f0" strokeWidth="1.5" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Central Sanctum Obsidian Glass Card */}
      <div className="relative z-10 w-full max-w-[580px] mx-4 glass-panel-gold rounded-2xl p-8 md:p-9 flex flex-col items-center shadow-2xl border border-[#c8922a]/70">
        {/* Floating Header Crest */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative mb-2">
            <div className="text-4xl filter drop-shadow-[0_0_16px_rgba(232,168,48,0.8)] animate-float">
              🔮
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-[#ffeaa7]/20 to-[#00d4f0]/20 rounded-full blur-md -z-10" />
          </div>

          <h1 className="font-orbitron text-2xl md:text-3xl font-black tracking-widest bg-gradient-to-r from-[#fff6d6] via-[#f5c842] to-[#00d4f0] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(232,168,48,0.4)]">
            ELEMENTAL SPELL CASTER
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#c8922a]"></span>
            <p className="font-rajdhani text-xs font-bold tracking-[0.25em] text-[#8899bb] uppercase">
              ARCHMAGE AI INVOCATION TRIAL
            </p>
            <span className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#c8922a]"></span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full mb-5 p-4 bg-red-950/85 border border-red-500/90 rounded-xl text-red-200 text-xs font-medium leading-relaxed shadow-[0_0_20px_rgba(239,68,68,0.25)] flex items-start gap-2.5">
            <span className="text-base leading-none">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          {/* AI Model URL Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider text-[#e8f0ff]">
              <span className="flex items-center gap-1.5">
                <span className="text-[#00d4f0]">✦</span>
                <span>TEACHABLE MACHINE MODEL URL</span>
              </span>
              {cheatCode && (
                <span className="text-[11px] text-amber-400 font-mono font-bold bg-amber-950/70 border border-amber-500/80 px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,200,66,0.4)]">
                  ⚡ CHEAT MODE (KEYS 1-6)
                </span>
              )}
            </div>
            <div className="relative group">
              <input
                type="text"
                value={modelUrl}
                onChange={handleUrlChange}
                placeholder="https://teachablemachine.withgoogle.com/models/XXXXX/"
                className="w-full bg-[#040a15]/90 border border-[#1a365d] focus:border-[#00d4f0] focus:shadow-[0_0_18px_rgba(0,212,240,0.3)] rounded-xl px-4 py-3 text-xs text-[#e8f0ff] placeholder-[#4a5a78] outline-none transition-all duration-300 font-medium"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#4a5a78] group-focus-within:text-[#00d4f0] transition-colors">
                🔗
              </div>
            </div>
            <p className="text-[11px] text-[#8899bb] leading-relaxed">
              ป้อน URL จาก Teachable Machine หรือพิมพ์ <code className="text-amber-300 font-bold bg-[#0a1525] px-1 py-0.5 rounded border border-[#1a3050]">cheat</code> เพื่อเปิดโหมดทดสอบด้วยคีย์บอร์ด
            </p>
          </div>

          {/* Model Type Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-wider text-[#e8f0ff] flex items-center gap-1.5">
              <span className="text-[#00d4f0]">✦</span>
              <span>SENSORY DETECTION MODE</span>
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'pose', label: 'POSE (ท่าทาง)', icon: '🧍', desc: 'Skeleton AI' },
                { id: 'image', label: 'IMAGE (รูปภาพ)', icon: '📷', desc: 'Camera Vision' },
                { id: 'audio', label: 'AUDIO (เสียง)', icon: '🎤', desc: 'Voice Speech' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setModelType(opt.id)}
                  className={`p-3 rounded-xl text-left transition-all duration-200 border flex flex-col items-center justify-center gap-1 text-center relative overflow-hidden group ${
                    modelType === opt.id
                      ? 'bg-gradient-to-b from-[#00d4f0]/25 to-[#007090]/40 border-[#00d4f0] text-[#70f3ff] shadow-[0_0_18px_rgba(0,212,240,0.4)] scale-[1.02]'
                      : 'bg-[#050e1c]/80 border-[#1a365d] text-[#8899bb] hover:border-[#2a5585] hover:text-[#e8f0ff] hover:bg-[#08152a]'
                  }`}
                >
                  <span className="text-xl filter drop-shadow group-hover:scale-110 transition-transform">
                    {opt.icon}
                  </span>
                  <span className="text-xs font-bold font-orbitron tracking-wider">
                    {opt.label.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-[#8899bb] font-medium opacity-80">
                    {opt.label.split(' ')[1] || opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Game Mode Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold tracking-wider text-[#e8f0ff] flex items-center gap-1.5">
              <span className="text-[#c8922a]">✦</span>
              <span>SANCTUM TRIAL MODE</span>
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'wave', label: 'WAVE TRIAL', icon: '🌊', desc: '20 Waves Trial' },
                { id: 'endless', label: 'ENDLESS', icon: '♾️', desc: 'Infinite Survival' },
                { id: 'story', label: 'CAMPAIGN', icon: '📖', desc: '7 Elemental Realms' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setGameMode(m.id)}
                  className={`p-3 rounded-xl transition-all duration-200 border flex flex-col items-center justify-center gap-1 text-center relative overflow-hidden group ${
                    gameMode === m.id
                      ? 'bg-gradient-to-b from-[#e8a830]/25 to-[#7c5010]/40 border-[#e8a830] text-[#ffeaa7] shadow-[0_0_18px_rgba(232,168,48,0.4)] scale-[1.02]'
                      : 'bg-[#050e1c]/80 border-[#1a365d] text-[#8899bb] hover:border-[#2a5585] hover:text-[#e8f0ff] hover:bg-[#08152a]'
                  }`}
                >
                  <span className="text-lg filter drop-shadow group-hover:scale-110 transition-transform">
                    {m.icon}
                  </span>
                  <span className="text-xs font-bold font-orbitron tracking-wider">
                    {m.label}
                  </span>
                  <span className="text-[10px] text-[#8899bb] font-medium opacity-80">
                    {m.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Luxury Glowing Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-2 py-3.5 rounded-xl font-orbitron font-black text-xs md:text-sm tracking-[0.2em] uppercase transition-all duration-300 relative overflow-hidden shadow-lg ${
              isLoading
                ? 'bg-[#102238] text-[#4a5a78] border border-[#1a365d] cursor-not-allowed'
                : 'btn-shimmer text-[#030710] hover:shadow-[0_0_30px_rgba(0,212,240,0.7)] hover:scale-[1.02] active:scale-[0.98] border border-[#ffeaa7]/50 font-black'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <span className="animate-spin text-base">🔮</span>
                  <span>AWAKENING ARCANE CONDUIT...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>BEGIN SANCTUM TRIAL</span>
                  <span>⚡</span>
                </>
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
