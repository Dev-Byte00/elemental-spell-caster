/* ═══════════════════════════════════════════════════════════════
   GAMELOOP — rAF Game Loop, Monster AI, Spellcasting & Callbacks
═══════════════════════════════════════════════════════════════ */

import { CONFIG } from './config.jsx';
import { ElementSystem } from './elements.jsx';
import { Monster } from './monster.jsx';
import { SpellEffect } from './particles.jsx';

export class GameLoop {
  constructor({ state, waveManager, renderer, audio, ai, onStateUpdate, onGameOver, onVictory, onStageClear, onFPSUpdate }) {
    this.state          = state;
    this.waveManager    = waveManager;
    this.renderer       = renderer;
    this.audio          = audio;
    this.ai             = ai;
    this.onStateUpdate  = onStateUpdate || (() => {});
    this.onGameOver     = onGameOver || (() => {});
    this.onVictory      = onVictory || (() => {});
    this.onStageClear   = onStageClear || (() => {});
    this.onFPSUpdate    = onFPSUpdate || (() => {});

    this._rafId         = null;
    this._spawnQueue    = [];
    this._spawnTimer    = 0;
    this._spawnInterval = 1200;
    this._lastPredictTime = 0;
    this._predictInterval = 120;
    this._predicting    = false;
    this._fpsFrames     = 0;
    this._fpsLastTime   = 0;
    this._fpsCurrent    = 60;
  }

  start() {
    this._initWave();
    if (typeof window !== 'undefined') {
      this._rafId = requestAnimationFrame(ts => this._loop(ts));
    }
  }

  stop() {
    if (this._rafId && typeof window !== 'undefined') {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _loop(ts) {
    const s = this.state;
    if (s.screen === 'gameOver' || s.screen === 'victory') return;

    this._fpsFrames++;
    if (!this._fpsLastTime) this._fpsLastTime = ts;
    if (ts - this._fpsLastTime >= 300) {
      this._fpsCurrent = (this._fpsFrames * 1000) / (ts - this._fpsLastTime);
      this._fpsFrames = 0;
      this._fpsLastTime = ts;
      this.onFPSUpdate(this._fpsCurrent);
    }

    const dt = Math.min((ts - (s.lastTime || ts)) / 1000, 0.1);
    s.lastTime = ts;

    if (!s.paused && s.screen === 'playing') {
      this._update(dt, ts);
    }

    this.renderer.render(ts, s.mode === 'story' ? s.stage : 0);
    this.onStateUpdate(s);

    if (typeof window !== 'undefined') {
      this._rafId = requestAnimationFrame(t => this._loop(t));
    }
  }

  async _update(dt, nowMs) {
    const s = this.state;

    // Mana regen
    s.regenMana(dt);

    // AI Predict (throttled)
    if (nowMs - this._lastPredictTime > this._predictInterval && !this._predicting) {
      this._lastPredictTime = nowMs;
      this._predicting = true;
      this.ai.predict().then(result => {
        if (!this.ai.isMock) {
          s.currentLabel    = result.label || 'Idle';
          s.currentConf     = result.confidence || 0;
          s.lastPredictions = result.predictions || [];
        } else {
          if (nowMs - s.lastSpellTime > 1200) {
            s.currentLabel    = 'Idle';
            s.currentConf     = 0;
            s.lastPredictions = [];
          }
        }
        this._predicting = false;
      }).catch((err) => {
        console.warn("Predict error:", err);
        this._predicting = false;
      });
    }

    // Spell cast
    this._trySpellCast(nowMs);

    // Spawn monsters
    this._spawnTimer += dt * 1000;
    if (this._spawnTimer >= this._spawnInterval && this._spawnQueue.length > 0) {
      this._spawnTimer = 0;
      const def = this._spawnQueue.shift();
      s.monsters.push(new Monster({ ...def, waveNum: s.wave }));
    }

    // Update monsters
    const toRemove = [];
    s.monsters.forEach(m => {
      m.update(dt, nowMs);

      if (m.isDying && m.deadTimer >= 1) {
        toRemove.push(m);
        return;
      }

      // Monster reached player
      if (!m.isDead && !m.isDying && m.isReached) {
        if (m.canAttack()) {
          const dead = s.takeDamage(m.damage);
          this.audio.playPlayerHit();
          s.showFlash(`💔 -${m.damage} HP`, '#ff4444', 1.2);
          if (dead) {
            this._triggerGameOver();
            return;
          }
        }
      }
    });
    toRemove.forEach(m => {
      const idx = s.monsters.indexOf(m);
      if (idx >= 0) s.monsters.splice(idx, 1);
    });

    // Update effects
    s.effects = s.effects.filter(e => !e.done);
    s.effects.forEach(e => e.update(dt));

    // Check wave completion
    this._checkWaveComplete(nowMs);
  }

  _trySpellCast(nowMs) {
    const s = this.state;
    const label = s.currentLabel;
    const conf  = s.currentConf;

    if (!CONFIG.ELEMENTS.includes(label)) return;
    if (s.lockedElements && s.lockedElements.includes(label)) return;
    if (conf < CONFIG.CONFIDENCE_THRESHOLD) return;
    if (nowMs - s.lastSpellTime < CONFIG.SPELL_COOLDOWN_MS) return;
    if (!s.useMana(CONFIG.SPELL_MANA_COST)) return;

    s.lastSpellTime = nowMs;
    this.audio.playSpell(label);

    const hitMonster = this._findTarget();

    if (hitMonster) {
      const mult = ElementSystem.getDamageMultiplier(label, hitMonster.element);
      const baseDmg = 20 + s.wave * 2;
      const dmg = hitMonster.takeDamage(baseDmg * mult);

      const mx = hitMonster.x * CONFIG.CANVAS_W;
      const my = CONFIG.CANVAS_H * 0.55;
      s.effects.push(new SpellEffect({ element: label, targetX: mx, targetY: my }));

      if (hitMonster.isDead) {
        this.audio.playMonsterDeath();
        const pts = Math.round(hitMonster.getScoreValue() * mult);
        s.addScore(pts);
        s.totalKills++;
        s.monstersDefeatedInWave++;

        const effText = ElementSystem.getEffectivenessText(mult);
        if (effText) s.showFlash(`${effText} +${pts}`, CONFIG.ELEMENT_COLORS[label], 1.5);
        else s.showFlash(`+${pts}`, CONFIG.ELEMENT_COLORS[label], 0.9);
      } else {
        this.audio.playMonsterHit(hitMonster.element);
        if (mult >= 2) s.showFlash('⚡ x2!', CONFIG.ELEMENT_COLORS[label], 0.7);
        else if (mult <= 0.5) s.showFlash('🛡️ x0.5', '#888888', 0.7);
      }
    } else {
      const cx = CONFIG.CANVAS_W / 2;
      const cy = CONFIG.CANVAS_H * 0.45;
      s.effects.push(new SpellEffect({ element: label, targetX: cx, targetY: cy }));
    }
  }

  castManualSpell(element) {
    const s = this.state;
    if (!s.cheatMode) return;
    if (!CONFIG.ELEMENTS.includes(element)) return;
    if (s.lockedElements && s.lockedElements.includes(element)) {
      this.audio.playPlayerHit();
      s.showFlash(`🔒 ธาตุ ${element.toUpperCase()} ถูกล็อค (ไม่มีใน AI Model)`, '#ff6666', 1.4);
      return;
    }
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - s.lastSpellTime < 220) return;
    if (!s.useMana(CONFIG.SPELL_MANA_COST)) {
      s.showFlash('💧 มานาไม่เพียงพอ!', '#44aaff', 1.0);
      return;
    }

    s.currentLabel = element;
    s.currentConf  = 1.0;
    s.lastPredictions = CONFIG.ELEMENTS.map(e => ({
      label: e,
      rawLabel: e,
      confidence: e === element ? 1.0 : 0
    }));

    s.lastSpellTime = nowMs;
    this.audio.playSpell(element);

    const hitMonster = this._findTarget();
    if (hitMonster) {
      const mult = ElementSystem.getDamageMultiplier(element, hitMonster.element);
      const baseDmg = 20 + s.wave * 2;
      const dmg = hitMonster.takeDamage(baseDmg * mult);

      const mx = hitMonster.x * CONFIG.CANVAS_W;
      const my = CONFIG.CANVAS_H * 0.55;
      s.effects.push(new SpellEffect({ element: element, targetX: mx, targetY: my }));

      if (hitMonster.isDead) {
        this.audio.playMonsterDeath();
        const pts = Math.round(hitMonster.getScoreValue() * mult);
        s.addScore(pts);
        s.totalKills++;
        s.monstersDefeatedInWave++;

        const effText = ElementSystem.getEffectivenessText(mult);
        if (effText) s.showFlash(`${effText} +${pts}`, CONFIG.ELEMENT_COLORS[element], 1.5);
        else s.showFlash(`+${pts}`, CONFIG.ELEMENT_COLORS[element], 0.9);
      } else {
        this.audio.playMonsterHit(hitMonster.element);
        if (mult >= 2) s.showFlash('⚡ x2!', CONFIG.ELEMENT_COLORS[element], 0.7);
        else if (mult <= 0.5) s.showFlash('🛡️ x0.5', '#888888', 0.7);
      }
    } else {
      const cx = CONFIG.CANVAS_W / 2;
      const cy = CONFIG.CANVAS_H * 0.45;
      s.effects.push(new SpellEffect({ element: element, targetX: cx, targetY: cy }));
    }
  }

  _findTarget() {
    const alive = this.state.monsters.filter(m => !m.isDying && !m.isDead);
    if (!alive.length) return null;
    return alive.reduce((best, m) => m.scale > best.scale ? m : best, alive[0]);
  }

  _initWave() {
    const s = this.state;
    const cfg = this.waveManager.getWaveConfig(s.wave, s.mode, s.stage);
    this._spawnQueue = this.waveManager.buildMonsterQueue(cfg);
    s.monstersRequiredInWave = cfg.total;
    s.monstersDefeatedInWave = 0;
    s.waveComplete = false;
    this._spawnTimer = 0;
    this._spawnInterval = Math.max(600, 1400 - s.wave * 30);
  }

  _checkWaveComplete(nowMs) {
    const s = this.state;
    if (s.waveComplete) return;
    const allSpawned = this._spawnQueue.length === 0;
    const allDead    = s.monsters.every(m => m.isDying || m.isDead);
    if (!allSpawned || !allDead) return;

    s.waveComplete = true;
    this.audio.playLevelUp();

    if (s.mode === 'story') {
      s.stage++;
      if (s.stage >= CONFIG.STORY_STAGES) {
        setTimeout(() => this._triggerVictory(), 1200);
      } else {
        setTimeout(() => this._triggerStageClear(), 1000);
      }
    } else if (s.mode === 'wave') {
      if (s.wave >= CONFIG.MAX_WAVES) {
        setTimeout(() => this._triggerVictory(), 1200);
      } else {
        s.wave++;
        setTimeout(() => { this._initWave(); }, 2000);
        s.showFlash(`🌊 Wave ${s.wave - 1} Clear! +Wave Bonus`, '#00e5ff', 2);
        s.addScore(s.wave * 100);
      }
    } else {
      s.wave++;
      s.addScore(s.wave * 150);
      s.showFlash(`🌊 Wave ${s.wave - 1} Clear!`, '#00e5ff', 2);
      setTimeout(() => { this._initWave(); }, 2000);
    }
  }

  _triggerGameOver() {
    this.state.screen = 'gameOver';
    this.stop();
    this.audio.playGameOver();
    this.onGameOver({
      score: this.state.score,
      wave: this.state.mode === 'story' ? `Stage ${this.state.stage + 1}` : `Wave ${this.state.wave}`,
      kills: this.state.totalKills
    });
  }

  _triggerVictory() {
    this.state.screen = 'victory';
    this.stop();
    this.onVictory({
      score: this.state.score,
      wave: this.state.mode === 'story' ? '7 Stages' : `Wave ${CONFIG.MAX_WAVES}`,
      kills: this.state.totalKills
    });
  }

  _triggerStageClear() {
    this.state.paused = true;
    const nextStage = CONFIG.STORY_STAGES_DATA[this.state.stage] || CONFIG.STORY_STAGES_DATA[0];
    this.onStageClear(nextStage);
  }

  resumeFromStageClear() {
    this.state.paused = false;
    this._initWave();
  }
}
