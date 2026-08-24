import React from 'react';

export function ScreenFrame() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] screen-vignette">
      {/* Top-Left Corner Crest */}
      <div className="absolute top-2.5 left-2.5 w-14 h-14 animate-corner-glow opacity-90">
        <svg viewBox="0 0 56 56" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(0,212,240,0.6)]">
          <path d="M4,52 L4,16 Q4,4 16,4 L52,4" fill="none" stroke="#00d4f0" strokeWidth="2.5" />
          <path d="M8,48 L8,20 Q8,8 20,8 L48,8" fill="none" stroke="#c8922a" strokeWidth="1.5" />
          <polygon points="4,4 18,4 4,18" fill="url(#goldGradientTL)" />
          <circle cx="16" cy="16" r="4" fill="#00d4f0" className="animate-pulse" />
          <circle cx="16" cy="16" r="1.8" fill="#ffffff" />
          <line x1="4" y1="32" x2="12" y2="32" stroke="#00d4f0" strokeWidth="1.5" />
          <line x1="32" y1="4" x2="32" y2="12" stroke="#00d4f0" strokeWidth="1.5" />
          <defs>
            <linearGradient id="goldGradientTL" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffeaa7" />
              <stop offset="100%" stopColor="#c8922a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top-Right Corner Crest */}
      <div className="absolute top-2.5 right-2.5 w-14 h-14 animate-corner-glow opacity-90">
        <svg viewBox="0 0 56 56" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(0,212,240,0.6)]">
          <path d="M52,52 L52,16 Q52,4 40,4 L4,4" fill="none" stroke="#00d4f0" strokeWidth="2.5" />
          <path d="M48,48 L48,20 Q48,8 36,8 L8,8" fill="none" stroke="#c8922a" strokeWidth="1.5" />
          <polygon points="52,4 38,4 52,18" fill="url(#goldGradientTR)" />
          <circle cx="40" cy="16" r="4" fill="#00d4f0" className="animate-pulse" />
          <circle cx="40" cy="16" r="1.8" fill="#ffffff" />
          <line x1="52" y1="32" x2="44" y2="32" stroke="#00d4f0" strokeWidth="1.5" />
          <line x1="24" y1="4" x2="24" y2="12" stroke="#00d4f0" strokeWidth="1.5" />
          <defs>
            <linearGradient id="goldGradientTR" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffeaa7" />
              <stop offset="100%" stopColor="#c8922a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom-Left Corner Crest */}
      <div className="absolute bottom-2.5 left-2.5 w-14 h-14 animate-corner-glow opacity-90">
        <svg viewBox="0 0 56 56" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(0,212,240,0.6)]">
          <path d="M4,4 L4,40 Q4,52 16,52 L52,52" fill="none" stroke="#00d4f0" strokeWidth="2.5" />
          <path d="M8,8 L8,36 Q8,48 20,48 L48,48" fill="none" stroke="#c8922a" strokeWidth="1.5" />
          <polygon points="4,52 18,52 4,38" fill="url(#goldGradientBL)" />
          <circle cx="16" cy="40" r="4" fill="#00d4f0" className="animate-pulse" />
          <circle cx="16" cy="40" r="1.8" fill="#ffffff" />
          <line x1="4" y1="24" x2="12" y2="24" stroke="#00d4f0" strokeWidth="1.5" />
          <line x1="32" y1="52" x2="32" y2="44" stroke="#00d4f0" strokeWidth="1.5" />
          <defs>
            <linearGradient id="goldGradientBL" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffeaa7" />
              <stop offset="100%" stopColor="#c8922a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom-Right Corner Crest */}
      <div className="absolute bottom-2.5 right-2.5 w-14 h-14 animate-corner-glow opacity-90">
        <svg viewBox="0 0 56 56" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(0,212,240,0.6)]">
          <path d="M52,4 L52,40 Q52,52 40,52 L4,52" fill="none" stroke="#00d4f0" strokeWidth="2.5" />
          <path d="M48,8 L48,36 Q48,48 36,48 L8,48" fill="none" stroke="#c8922a" strokeWidth="1.5" />
          <polygon points="52,52 38,52 52,38" fill="url(#goldGradientBR)" />
          <circle cx="40" cy="40" r="4" fill="#00d4f0" className="animate-pulse" />
          <circle cx="40" cy="40" r="1.8" fill="#ffffff" />
          <line x1="52" y1="24" x2="44" y2="24" stroke="#00d4f0" strokeWidth="1.5" />
          <line x1="24" y1="52" x2="24" y2="44" stroke="#00d4f0" strokeWidth="1.5" />
          <defs>
            <linearGradient id="goldGradientBR" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ffeaa7" />
              <stop offset="100%" stopColor="#c8922a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Center Crest & Energy Stream */}
      <div className="absolute top-2.5 left-20 right-20 flex items-center justify-center gap-4 opacity-80">
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#c8922a] to-transparent shadow-[0_0_8px_rgba(200,146,42,0.6)]"></div>
        <svg width="140" height="16" viewBox="0 0 140 16" className="shrink-0 filter drop-shadow-[0_0_6px_rgba(0,212,240,0.5)]">
          <path d="M0,8 L40,8 L50,1 L60,15 L70,8 L80,1 L90,15 L100,8 L140,8" fill="none" stroke="#00d4f0" strokeWidth="1.5" />
          <polygon points="70,3 75,8 70,13 65,8" fill="#ffeaa7" />
          <circle cx="40" cy="8" r="2.5" fill="#00d4f0" />
          <circle cx="100" cy="8" r="2.5" fill="#00d4f0" />
        </svg>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#c8922a] to-transparent shadow-[0_0_8px_rgba(200,146,42,0.6)]"></div>
      </div>

      {/* Bottom Center Crest & Energy Stream */}
      <div className="absolute bottom-2.5 left-20 right-20 flex items-center justify-center gap-4 opacity-80">
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#c8922a] to-transparent shadow-[0_0_8px_rgba(200,146,42,0.6)]"></div>
        <svg width="140" height="16" viewBox="0 0 140 16" className="shrink-0 filter drop-shadow-[0_0_6px_rgba(0,212,240,0.5)]">
          <path d="M0,8 L40,8 L50,15 L60,1 L70,8 L80,15 L90,1 L100,8 L140,8" fill="none" stroke="#00d4f0" strokeWidth="1.5" />
          <polygon points="70,3 75,8 70,13 65,8" fill="#ffeaa7" />
          <circle cx="40" cy="8" r="2.5" fill="#00d4f0" />
          <circle cx="100" cy="8" r="2.5" fill="#00d4f0" />
        </svg>
        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-[#c8922a] to-transparent shadow-[0_0_8px_rgba(200,146,42,0.6)]"></div>
      </div>
    </div>
  );
}
