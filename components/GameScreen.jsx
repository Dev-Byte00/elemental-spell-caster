'use client';

import React from 'react';
import { CONFIG } from '../game/config.jsx';
import { TopHud } from './TopHud.jsx';
import { AIPanel } from './AIPanel.jsx';
import { SpellBar } from './SpellBar.jsx';

export function GameScreen({
  state,
  fps,
  modelType,
  canvasRef,
  videoRef,
  poseCanvasRef,
  onPause,
  onCastSpell
}) {
  return (
    <div className="fixed inset-0 flex flex-col bg-dark-base overflow-hidden z-10 select-none">
      {/* 1. Top HUD Bar */}
      <TopHud state={state} fps={fps} onPause={onPause} />

      {/* 2. Middle Battle Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-2 bg-[#020509] relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CONFIG.CANVAS_W}
            height={CONFIG.CANVAS_H}
            className="w-full h-full max-w-[1066px] max-h-[600px] object-contain rounded-lg border border-[#1a3050] shadow-panel-dark"
          />
        </div>

        {/* Right: AI & Sensor Panel */}
        <AIPanel
          state={state}
          modelType={modelType}
          videoRef={videoRef}
          poseCanvasRef={poseCanvasRef}
        />
      </div>

      {/* 3. Bottom Spell Cards Bar */}
      <SpellBar state={state} onCastSpell={onCastSpell} />
    </div>
  );
}
