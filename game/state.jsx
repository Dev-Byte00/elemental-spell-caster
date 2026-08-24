/* ═══════════════════════════════════════════════════════════════
   GAME STATE — Central Game State Model
═══════════════════════════════════════════════════════════════ */

import { CONFIG } from './config.jsx';

export class GameState {
  constructor() {
    this.availableElements = [...CONFIG.ELEMENTS];
    this.lockedElements    = [];
    this.reset();
  }

  reset() {
    this.screen       = 'setup';   // setup | playing | paused | gameOver | victory | stageClear
    this.mode         = 'wave';    // wave | endless | story
    this.wave         = 1;
    this.stage        = 0;         // story mode stage index (0-6)
    this.score        = 0;
    this.totalKills   = 0;
    this.player = {
      hp:      CONFIG.PLAYER_MAX_HP,
      maxHp:   CONFIG.PLAYER_MAX_HP,
      mana:    CONFIG.PLAYER_MAX_MANA,
      maxMana: CONFIG.PLAYER_MAX_MANA
    };
    this.monsters     = [];
    this.effects      = [];
    this.bgParticles  = this._buildBgParticles();
    this.lastSpellTime= 0;
    this.lastTime     = 0;
    this.currentLabel = 'Idle';
    this.currentConf  = 0;
    this.lastPredictions = [];
    this.flashMsg     = null;     // { text, color, expires }
    this.monstersDefeatedInWave = 0;
    this.monstersRequiredInWave = 0;
    this.waveComplete = false;
    this.paused       = false;
    this.cheatMode    = false;
  }

  _buildBgParticles() {
    return Array.from({ length: 60 }, () => ({
      x: Math.random() * CONFIG.CANVAS_W,
      y: Math.random() * CONFIG.CANVAS_H,
      size: 0.5 + Math.random() * 2,
      speed: 0.3 + Math.random() * 1.2,
      alpha: 0.1 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.5
    }));
  }

  addScore(pts) {
    this.score += pts;
  }

  takeDamage(amt) {
    this.player.hp = Math.max(0, this.player.hp - amt);
    return this.player.hp <= 0;
  }

  useMana(cost) {
    if (this.player.mana < cost) return false;
    this.player.mana -= cost;
    return true;
  }

  regenMana(dt) {
    this.player.mana = Math.min(
      this.player.maxMana,
      this.player.mana + CONFIG.PLAYER_MANA_REGEN * dt
    );
  }

  showFlash(text, color = '#ffffff', duration = 1.5) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.flashMsg = { text, color, expires: now + duration * 1000 };
  }
}
