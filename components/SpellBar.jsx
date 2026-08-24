'use client';

import React from 'react';
import { CONFIG } from '../game/config.jsx';

const SPELL_CARDS_DATA = [
  { element: 'Ice',       num: '1', name: 'GLACIAL SPIKE',  tag: 'ICE',       cls: 'spell-art-ice',       desc: 'Pierce with freezing shard' },
  { element: 'Fire',      num: '2', name: 'INFERNO BLAST',  tag: 'FIRE',      cls: 'spell-art-fire',      desc: 'Incinerate with magma surge' },
  { element: 'Lightning', num: '3', name: 'VOLT CASCADE',   tag: 'LIGHTNING', cls: 'spell-art-lightning', desc: 'Electrocute with thunderbolt' },
  { element: 'Earth',     num: '4', name: 'TERRA FISSURE',  tag: 'EARTH',     cls: 'spell-art-earth',     desc: 'Shatter with granite quake' },
  { element: 'Water',     num: '5', name: 'TIDAL SURGE',    tag: 'WATER',     cls: 'spell-art-water',     desc: 'Drown with torrent vortex' },
  { element: 'Wind',      num: '6', name: 'TEMPEST GALE',   tag: 'WIND',      cls: 'spell-art-wind',      desc: 'Slice with razor cyclone' }
];

export function SpellBar({ state, onCastSpell }) {
  const currentElem = state.currentLabel;
  const isCasting = CONFIG.ELEMENTS.includes(currentElem) && state.currentConf >= CONFIG.CONFIDENCE_THRESHOLD;

  return (
    <footer className="h-36 w-full bg-gradient-to-t from-[#03060c] via-[#070f1e]/95 to-[#070f1e]/95 border-t border-[#1a365d] px-6 py-2.5 flex items-center justify-center gap-3.5 z-20 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      {SPELL_CARDS_DATA.map((card) => {
        const isLocked = state.lockedElements && state.lockedElements.includes(card.element);
        const isActive = isCasting && currentElem === card.element;
        const color = CONFIG.ELEMENT_COLORS[card.element];

        return (
          <button
            key={card.element}
            onClick={() => {
              if (state.cheatMode && onCastSpell) {
                onCastSpell(card.element);
              }
            }}
            className={`relative flex-1 max-w-[172px] h-[116px] rounded-xl border overflow-hidden p-2.5 flex flex-col justify-between transition-all duration-300 group text-left ${
              isLocked
                ? 'opacity-40 grayscale border-zinc-800 bg-zinc-950/80 cursor-not-allowed'
                : isActive
                ? 'border-[#ffeaa7] scale-105 shadow-[0_0_25px_rgba(232,168,48,0.9),inset_0_0_15px_rgba(255,234,167,0.3)] z-10 -translate-y-1'
                : 'border-[#1a365d] bg-[#071120] hover:border-[#2b5585] hover:shadow-[0_8px_20px_rgba(0,0,0,0.6)] hover:-translate-y-0.5'
            }`}
          >
            {/* Background Image Texture */}
            <div
              className={`absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-55 group-hover:scale-105 transition-all duration-500 ${card.cls}`}
            />
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#040914] via-[#040914]/75 to-transparent" />

            {/* Top Card Row */}
            <div className="relative z-10 flex items-center justify-between">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white font-orbitron tracking-wider flex items-center gap-1 shadow-md border border-white/20"
                style={{ backgroundColor: color + 'dd' }}
              >
                <span>{CONFIG.ELEMENT_ICONS[card.element]}</span>
                <span>{card.tag}</span>
              </span>

              <span className="font-mono text-[10px] font-bold text-[#8899bb] px-1.5 py-0.5 rounded-md bg-[#02050c]/80 border border-[#1a365d] shadow-inner">
                {state.cheatMode ? `[${card.num}]` : '[AI]'}
              </span>
            </div>

            {/* Bottom Card Row */}
            <div className="relative z-10 flex flex-col">
              <span className="font-orbitron text-xs font-black text-[#e8f0ff] tracking-wide truncate group-hover:text-[#ffeaa7] transition-colors">
                {card.name}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-[#00d4f0] font-mono font-bold">
                  {CONFIG.SPELL_MANA_COST} MP
                </span>
                <span className="text-[9px] text-[#8899bb] font-medium hidden md:inline truncate max-w-[80px]">
                  {card.desc.split(' ')[0]}
                </span>
              </div>
            </div>

            {/* Locked Padlock Overlay */}
            {isLocked && (
              <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center gap-1">
                <span className="text-2xl filter drop-shadow">🔒</span>
                <span className="text-[9px] font-bold text-red-300 font-orbitron tracking-wider">
                  NOT IN AI MODEL
                </span>
              </div>
            )}

            {/* Active Aura Pulse Ring */}
            {isActive && (
              <div className="absolute inset-0 border-2 border-[#ffeaa7] rounded-xl animate-pulse pointer-events-none" />
            )}
          </button>
        );
      })}
    </footer>
  );
}
