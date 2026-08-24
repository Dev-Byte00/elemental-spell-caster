/* ═══════════════════════════════════════════════════════════════
   AUDIO MANAGER — Procedural Web Audio Synthesizer
═══════════════════════════════════════════════════════════════ */

export class AudioManager {
  constructor() {
    this._ctx = null;
    this.muted = false;
  }

  _getCtx() {
    if (typeof window === 'undefined') return null;
    if (!this._ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this._ctx = new AudioCtx();
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  init() {
    this._getCtx();
  }

  playSpell(element) {
    if (this.muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      switch (element) {
        case 'Fire':
          this._noise(now, 0.4, 300, 80);
          this._tone(now, 0.35, 160, 40, 'sawtooth');
          break;
        case 'Water':
          this._tone(now, 0.45, 600, 200, 'sine');
          this._noise(now + 0.05, 0.35, 800, 200);
          break;
        case 'Earth':
          this._tone(now, 0.5, 90, 30, 'square');
          this._noise(now, 0.4, 200, 50);
          break;
        case 'Wind':
          this._noise(now, 0.55, 1200, 600);
          this._tone(now, 0.4, 440, 880, 'sine');
          break;
        case 'Lightning':
          this._noise(now, 0.25, 4000, 1000);
          this._tone(now, 0.18, 1200, 80, 'sawtooth');
          this._tone(now + 0.05, 0.15, 800, 60, 'square');
          break;
        case 'Ice':
          this._tone(now, 0.4, 1400, 700, 'sine');
          this._tone(now + 0.05, 0.35, 1800, 900, 'triangle');
          this._noise(now, 0.2, 3000, 1500);
          break;
        default:
          this._tone(now, 0.3, 440, 220, 'sine');
      }
    } catch (_) {}
  }

  playMonsterHit(element) {
    if (this.muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this._tone(now, 0.15, 220, 80, 'sawtooth');
      this._noise(now, 0.12, 600, 100);
    } catch (_) {}
  }

  playMonsterDeath() {
    if (this.muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this._tone(now, 0.6, 280, 40, 'sawtooth');
      this._noise(now, 0.5, 500, 60);
      this._tone(now + 0.1, 0.4, 180, 30, 'sine');
    } catch (_) {}
  }

  playPlayerHit() {
    if (this.muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this._tone(now, 0.3, 150, 40, 'square');
      this._noise(now, 0.25, 300, 50);
    } catch (_) {}
  }

  playLevelUp() {
    if (this.muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [330, 440, 550, 660, 880].forEach((f, i) => {
        this._tone(now + i * 0.09, 0.22, f, f * 1.05, 'sine');
      });
    } catch (_) {}
  }

  playGameOver() {
    if (this.muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [300, 260, 220, 170, 110].forEach((f, i) => {
        this._tone(now + i * 0.18, 0.35, f, f * 0.85, 'sawtooth');
      });
    } catch (_) {}
  }

  _tone(start, dur, f0, f1, type = 'sine') {
    const ctx = this._ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), start + dur);
    g.gain.setValueAtTime(0.35, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  }

  _noise(start, dur, f0, f1) {
    const ctx = this._ctx;
    if (!ctx) return;
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(f0, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), start + dur);
    filter.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(start);
    src.stop(start + dur);
  }
}
