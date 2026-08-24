/* ═══════════════════════════════════════════════════════════════
   MONSTER — 18 Full-Body Volumetric 2.5D Animated Monsters
   (6 Elements × 3 Tiers: Normal, Elite, Boss)
═══════════════════════════════════════════════════════════════ */

import { CONFIG } from './config.jsx';

export class Monster {
  constructor({ element, tier, waveNum }) {
    this.element = element;
    this.tier    = tier;  // 'normal' | 'elite' | 'boss'
    this.id      = Math.random().toString(36).slice(2);

    const cfg = Monster.TIER_CONFIG[tier] || Monster.TIER_CONFIG.normal;
    const waveScale = 1 + (waveNum - 1) * 0.08;

    this.maxHp  = Math.round(cfg.hp   * waveScale * (0.9 + Math.random() * 0.2));
    this.hp     = this.maxHp;
    this.damage = Math.round(cfg.damage * waveScale);
    this.speed  = cfg.speed * (0.85 + Math.random() * 0.3);

    // Position: random x across canvas, start small (far) and grow
    this.x      = 0.2 + Math.random() * 0.6; // 0..1 normalized screen X
    this.scale  = 0.14 + Math.random() * 0.06; // start small = far away
    this.targetX = this.x + (Math.random() - 0.5) * 0.15;

    // Visual
    this.color  = CONFIG.ELEMENT_COLORS[element] || '#8899bb';
    this.glow   = CONFIG.ELEMENT_GLOW[element] || 'rgba(136,153,187,0.5)';
    this.baseSize = cfg.baseSize;

    // State
    this.hitFlash   = 0;
    this.deadTimer  = -1;  // -1 = alive; 0..1 = dying
    this.attackTimer = 0;
    this.attackCooldown = cfg.attackCooldown;
    this._swayPhase = Math.random() * Math.PI * 2;
    this._swaySpeed = 0.8 + Math.random() * 0.4;
  }

  static TIER_CONFIG = {
    normal: { hp: 40,  damage: 8,  speed: 0.018, baseSize: 130, attackCooldown: 2500 },
    elite:  { hp: 100, damage: 15, speed: 0.011, baseSize: 180, attackCooldown: 2200 },
    boss:   { hp: 300, damage: 25, speed: 0.006, baseSize: 260, attackCooldown: 1800 }
  };

  get isDead()    { return this.hp <= 0; }
  get isDying()   { return this.deadTimer >= 0; }
  get isReached() { return this.scale >= CONFIG.MONSTER_REACH_THRESHOLD; }

  update(dt, nowMs) {
    if (this.isDying) {
      this.deadTimer += dt * 2.5;
      return;
    }
    if (this.isDead) {
      this.deadTimer = 0;
      return;
    }

    this.scale += this.speed * dt;
    this._swayPhase += this._swaySpeed * dt;
    const sway = Math.sin(this._swayPhase) * 0.02 * this.scale;
    this.x += (this.targetX - this.x) * 0.02 + sway * 0.1;
    this.x = Math.max(0.1, Math.min(0.9, this.x));

    if (this.hitFlash > 0) this.hitFlash -= dt * 5;
    this.attackTimer += dt * 1000;
  }

  takeDamage(amount) {
    if (this.isDead || this.isDying) return 0;
    const dmg = Math.round(amount);
    this.hp -= dmg;
    this.hitFlash = 1;
    if (this.hp <= 0) { this.hp = 0; this.deadTimer = 0; }
    return dmg;
  }

  canAttack() {
    if (this.attackTimer >= this.attackCooldown) {
      this.attackTimer = 0;
      return true;
    }
    return false;
  }

  getScoreValue() {
    const tier = { normal: 50, elite: 150, boss: 500 };
    return tier[this.tier] || 50;
  }

  draw(ctx, nowMs = 0) {
    if (this.deadTimer >= 1) return;

    const cw = CONFIG.CANVAS_W;
    const ch = CONFIG.CANVAS_H;
    const cx = this.x * cw;
    const cy = ch * 0.58;
    const size = this.baseSize * this.scale;
    const t = nowMs / 1000;

    ctx.save();

    if (this.isDying) {
      ctx.globalAlpha = Math.pow(1 - this.deadTimer, 1.5);
      const ds = 1 + this.deadTimer * 0.6;
      ctx.translate(cx, cy);
      ctx.scale(ds, ds);
      ctx.translate(-cx, -cy);
    }

    const flashAlpha = this.hitFlash > 0 ? this.hitFlash * 0.85 : 0;

    // Ambient ground contact shadow
    const glowR = size * 0.9;
    const aura = ctx.createRadialGradient(cx, cy + size * 0.3, size * 0.05, cx, cy + size * 0.1, glowR);
    aura.addColorStop(0, this.glow);
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.35, glowR * 0.9, glowR * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    this._drawCreature(ctx, cx, cy, size, flashAlpha, t);

    if (!this.isDying && this.scale > 0.18) {
      this._drawHPBar(ctx, cx, cy, size);
    }

    if (!this.isDying && this.scale > 0.25) {
      if (this.tier === 'boss') {
        ctx.font = `${Math.round(size * 0.28)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('👑', cx, cy - size * 0.82);
      } else if (this.tier === 'elite') {
        ctx.font = `bold ${Math.round(size * 0.22)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
        ctx.fillText('★', cx, cy - size * 0.82);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  _drawCreature(ctx, cx, cy, size, flashAlpha, t) {
    const el = this.element;
    const breathe = Math.sin(t * 2.0 + this._swayPhase) * 0.04;
    const bob     = Math.sin(t * 1.5 + this._swayPhase * 0.6) * size * 0.022;
    const ep      = (Math.sin(t * 4.5) + 1) / 2;

    ctx.save();
    ctx.translate(cx, cy + bob);

    switch(el) {
      case 'Earth':     this._drawGraniteTitan25D(ctx, size, t, breathe, ep, flashAlpha); break;
      case 'Fire':      this._drawInfernoArchDemon25D(ctx, size, t, breathe, ep, flashAlpha); break;
      case 'Lightning': this._drawThunderGargoyle25D(ctx, size, t, breathe, ep, flashAlpha); break;
      case 'Water':     this._drawAbyssalWraith25D(ctx, size, t, breathe, ep, flashAlpha); break;
      case 'Wind':      this._drawZephyrHarpy25D(ctx, size, t, breathe, ep, flashAlpha); break;
      case 'Ice':       this._drawGlacialBehemoth25D(ctx, size, t, breathe, ep, flashAlpha); break;
      default:          this._drawGraniteTitan25D(ctx, size, t, breathe, ep, flashAlpha); break;
    }

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════════
     1. ⛰️ GRANITE TITAN — Realistic 2.5D Volumetric Earth Colossus
  ══════════════════════════════════════════════════════════════ */
  _drawGraniteTitan25D(ctx, s, t, breathe, ep, flash) {
    const scX = 1 + breathe * 0.35;
    const scY = 1 - breathe * 0.20;

    // Ground Shadow
    ctx.save();
    const groundShadow = ctx.createRadialGradient(0, s * 0.82, s * 0.1, 0, s * 0.82, s * 0.65);
    groundShadow.addColorStop(0, 'rgba(4, 3, 2, 0.85)');
    groundShadow.addColorStop(0.6, 'rgba(4, 3, 2, 0.4)');
    groundShadow.addColorStop(1, 'transparent');
    ctx.fillStyle = groundShadow;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.82, s * 0.65, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Orbiting Granite Shards
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const angle = t * 0.8 + (i * Math.PI * 2) / 5;
      const dist = s * (0.68 + (i % 2) * 0.1);
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist * 0.35 - s * 0.05;
      const rsz = s * (0.055 + (i % 3) * 0.015);

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle * 1.5);

      const sGrad = ctx.createRadialGradient(-rsz * 0.35, -rsz * 0.35, rsz * 0.1, 0, 0, rsz * 1.2);
      sGrad.addColorStop(0, '#9c8c7a');
      sGrad.addColorStop(0.45, '#5c4e3e');
      sGrad.addColorStop(0.85, '#2c2218');
      sGrad.addColorStop(1, '#100c08');

      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.moveTo(-rsz, -rsz * 0.5);
      ctx.quadraticCurveTo(0, -rsz * 1.1, rsz * 0.8, -rsz * 0.3);
      ctx.quadraticCurveTo(rsz * 1.1, rsz * 0.7, 0, rsz * 0.9);
      ctx.quadraticCurveTo(-rsz * 1.1, rsz * 0.6, -rsz, -rsz * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-rsz * 0.25, -rsz * 0.35, rsz * 0.3, rsz * 0.15, -0.4, 0, Math.PI * 2);
      ctx.fill();

      if (i % 2 === 0) {
        ctx.strokeStyle = `rgba(255, 210, 50, ${0.75 + ep * 0.25})`;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-rsz * 0.5, 0); ctx.lineTo(rsz * 0.5, 0);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // Legs
    ctx.save();
    const legStomp = Math.sin(t * 1.2) * s * 0.02;

    const legLGrad = ctx.createRadialGradient(-s * 0.25, s * 0.55, s * 0.05, -s * 0.28, s * 0.65, s * 0.35);
    legLGrad.addColorStop(0, '#8c7c6a'); legLGrad.addColorStop(0.4, '#524434'); legLGrad.addColorStop(0.85, '#221a12'); legLGrad.addColorStop(1, '#0e0a06');
    ctx.fillStyle = legLGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, s * 0.30);
    ctx.bezierCurveTo(-s * 0.38, s * 0.45, -s * 0.44, s * 0.70 + legStomp, -s * 0.40, s * 0.82 + legStomp);
    ctx.bezierCurveTo(-s * 0.25, s * 0.86 + legStomp, -s * 0.10, s * 0.84 + legStomp, -s * 0.05, s * 0.40);
    ctx.closePath();
    ctx.fill();

    const legRGrad = ctx.createRadialGradient(s * 0.25, s * 0.55, s * 0.05, s * 0.28, s * 0.65, s * 0.35);
    legRGrad.addColorStop(0, '#8c7c6a'); legRGrad.addColorStop(0.4, '#524434'); legRGrad.addColorStop(0.85, '#221a12'); legRGrad.addColorStop(1, '#0e0a06');
    ctx.fillStyle = legRGrad;
    ctx.beginPath();
    ctx.moveTo(s * 0.14, s * 0.30);
    ctx.bezierCurveTo(s * 0.38, s * 0.45, s * 0.44, s * 0.70 - legStomp, s * 0.40, s * 0.82 - legStomp);
    ctx.bezierCurveTo(s * 0.25, s * 0.86 - legStomp, s * 0.10, s * 0.84 - legStomp, s * 0.05, s * 0.40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Torso
    ctx.save();
    ctx.scale(scX, scY);
    ctx.shadowColor = '#060402'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;

    const torsoGrad = ctx.createRadialGradient(-s * 0.08, -s * 0.12, s * 0.08, 0, s * 0.05, s * 0.55);
    torsoGrad.addColorStop(0, '#a89884');
    torsoGrad.addColorStop(0.35, '#6c5c4a');
    torsoGrad.addColorStop(0.75, '#382c20');
    torsoGrad.addColorStop(1, '#120d08');

    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, -s * 0.30);
    ctx.bezierCurveTo(-s * 0.52, -s * 0.05, -s * 0.46, s * 0.30, -s * 0.28, s * 0.44);
    ctx.bezierCurveTo(0, s * 0.48, s * 0.28, s * 0.44, s * 0.46, s * 0.30);
    ctx.bezierCurveTo(s * 0.52, -s * 0.05, s * 0.42, -s * 0.30, 0, -s * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Pectorals
    const pecLGrad = ctx.createRadialGradient(-s * 0.18, -s * 0.16, s * 0.02, -s * 0.18, -s * 0.10, s * 0.22);
    pecLGrad.addColorStop(0, '#baa892'); pecLGrad.addColorStop(0.5, '#6c5c4a'); pecLGrad.addColorStop(1, '#241b12');
    ctx.fillStyle = pecLGrad;
    ctx.beginPath();
    ctx.ellipse(-s * 0.18, -s * 0.10, s * 0.18, s * 0.14, -0.15, 0, Math.PI * 2);
    ctx.fill();

    const pecRGrad = ctx.createRadialGradient(s * 0.18, -s * 0.16, s * 0.02, s * 0.18, -s * 0.10, s * 0.22);
    pecRGrad.addColorStop(0, '#baa892'); pecRGrad.addColorStop(0.5, '#6c5c4a'); pecRGrad.addColorStop(1, '#241b12');
    ctx.fillStyle = pecRGrad;
    ctx.beginPath();
    ctx.ellipse(s * 0.18, -s * 0.10, s * 0.18, s * 0.14, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Minerals
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let k = 0; k < 18; k++) {
      const tx = ((k * 37) % 50 - 25) * 0.01 * s;
      const ty = ((k * 53) % 40 - 15) * 0.01 * s;
      ctx.beginPath(); ctx.arc(tx, ty, s * 0.012, 0, Math.PI * 2); ctx.fill();
    }

    // Fissures
    const fissureAlpha = 0.8 + ep * 0.2;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 200, 40, ${fissureAlpha})`;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#ff9900'; ctx.shadowBlur = s * 0.2 * (0.8 + ep * 0.4);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(0, -s * 0.28);
    ctx.bezierCurveTo(-s * 0.10, -s * 0.15, s * 0.08, -s * 0.02, -s * 0.06, s * 0.15);
    ctx.lineTo(s * 0.05, s * 0.32);
    ctx.stroke();

    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.12); ctx.lineTo(-s * 0.28, -s * 0.05); ctx.lineTo(-s * 0.36, s * 0.12);
    ctx.moveTo(0, -s * 0.05); ctx.lineTo(s * 0.26, 0); ctx.lineTo(s * 0.34, s * 0.18);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 240, ${fissureAlpha * 0.95})`;
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.28);
    ctx.bezierCurveTo(-s * 0.10, -s * 0.15, s * 0.08, -s * 0.02, -s * 0.06, s * 0.15);
    ctx.lineTo(s * 0.05, s * 0.32);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Shoulders
    ctx.save();
    const shldL = ctx.createRadialGradient(-s * 0.50, -s * 0.25, s * 0.05, -s * 0.48, -s * 0.18, s * 0.32);
    shldL.addColorStop(0, '#c4b29c'); shldL.addColorStop(0.4, '#7a6854'); shldL.addColorStop(0.85, '#32261a'); shldL.addColorStop(1, '#120c08');
    ctx.fillStyle = shldL;
    ctx.beginPath();
    ctx.ellipse(-s * 0.48, -s * 0.18, s * 0.24, s * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.52, -s * 0.24, s * 0.12, s * 0.06, -0.4, 0, Math.PI * 2);
    ctx.fill();

    const shldR = ctx.createRadialGradient(s * 0.50, -s * 0.25, s * 0.05, s * 0.48, -s * 0.18, s * 0.32);
    shldR.addColorStop(0, '#c4b29c'); shldR.addColorStop(0.4, '#7a6854'); shldR.addColorStop(0.85, '#32261a'); shldR.addColorStop(1, '#120c08');
    ctx.fillStyle = shldR;
    ctx.beginPath();
    ctx.ellipse(s * 0.48, -s * 0.18, s * 0.24, s * 0.22, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(s * 0.52, -s * 0.24, s * 0.12, s * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Arms & Fists
    ctx.save();
    const armSwing = Math.sin(t * 1.3) * s * 0.035;

    const armL = ctx.createRadialGradient(-s * 0.52, s * 0.35, s * 0.05, -s * 0.48, s * 0.48, s * 0.3);
    armL.addColorStop(0, '#9c8c78'); armL.addColorStop(0.45, '#5c4e3c'); armL.addColorStop(0.85, '#281e14'); armL.addColorStop(1, '#100a06');
    ctx.fillStyle = armL;
    ctx.beginPath();
    ctx.ellipse(-s * 0.50, s * 0.22 + armSwing, s * 0.18, s * 0.26, -0.25, 0, Math.PI * 2);
    ctx.fill();

    const fistL = ctx.createRadialGradient(-s * 0.52, s * 0.52 + armSwing, s * 0.04, -s * 0.48, s * 0.58 + armSwing, s * 0.22);
    fistL.addColorStop(0, '#b8a690'); fistL.addColorStop(0.4, '#6e5c48'); fistL.addColorStop(0.85, '#281e14'); fistL.addColorStop(1, '#0e0804');
    ctx.fillStyle = fistL;
    ctx.beginPath();
    ctx.arc(-s * 0.48, s * 0.58 + armSwing, s * 0.16, 0, Math.PI * 2);
    ctx.fill();

    for (let k = 0; k < 3; k++) {
      const kx = -s * 0.58 + k * s * 0.09;
      const ky = s * 0.60 + armSwing;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath(); ctx.arc(kx, ky, s * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255, 215, 60, ${0.8 + ep * 0.2})`;
      ctx.lineWidth = 2; ctx.stroke();
    }

    const armR = ctx.createRadialGradient(s * 0.52, s * 0.35, s * 0.05, s * 0.48, s * 0.48, s * 0.3);
    armR.addColorStop(0, '#9c8c78'); armR.addColorStop(0.45, '#5c4e3c'); armR.addColorStop(0.85, '#281e14'); armR.addColorStop(1, '#100a06');
    ctx.fillStyle = armR;
    ctx.beginPath();
    ctx.ellipse(s * 0.50, s * 0.22 - armSwing, s * 0.18, s * 0.26, 0.25, 0, Math.PI * 2);
    ctx.fill();

    const fistR = ctx.createRadialGradient(s * 0.52, s * 0.52 - armSwing, s * 0.04, s * 0.48, s * 0.58 - armSwing, s * 0.22);
    fistR.addColorStop(0, '#b8a690'); fistR.addColorStop(0.4, '#6e5c48'); fistR.addColorStop(0.85, '#281e14'); fistR.addColorStop(1, '#0e0804');
    ctx.fillStyle = fistR;
    ctx.beginPath();
    ctx.arc(s * 0.48, s * 0.58 - armSwing, s * 0.16, 0, Math.PI * 2);
    ctx.fill();

    for (let k = 0; k < 3; k++) {
      const kx = s * 0.40 + k * s * 0.09;
      const ky = s * 0.60 - armSwing;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath(); ctx.arc(kx, ky, s * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255, 215, 60, ${0.8 + ep * 0.2})`;
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();

    // Head
    ctx.save();
    const headBob = Math.sin(t * 1.1) * 0.025;
    ctx.translate(0, -s * 0.40 + headBob);
    ctx.scale(scX, scY);

    const headGrad = ctx.createRadialGradient(-s * 0.08, -s * 0.15, s * 0.05, 0, 0, s * 0.32);
    headGrad.addColorStop(0, '#c8b8a4');
    headGrad.addColorStop(0.4, '#7c6a56');
    headGrad.addColorStop(0.8, '#34261a');
    headGrad.addColorStop(1, '#120c06');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 0.26, -s * 0.22);
    ctx.bezierCurveTo(-s * 0.34, -s * 0.02, -s * 0.28, s * 0.18, -s * 0.16, s * 0.25);
    ctx.bezierCurveTo(0, s * 0.28, s * 0.16, s * 0.25, s * 0.28, s * 0.18);
    ctx.bezierCurveTo(s * 0.34, -s * 0.02, s * 0.26, -s * 0.22, 0, -s * 0.26);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.save();
    const eyeLGrad = ctx.createRadialGradient(-s * 0.12, -s * 0.03, 1, -s * 0.12, -s * 0.03, s * 0.07);
    eyeLGrad.addColorStop(0, '#ffffff'); eyeLGrad.addColorStop(0.3, '#ffcc00'); eyeLGrad.addColorStop(0.7, '#ff6600'); eyeLGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeLGrad;
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = s * 0.25;
    ctx.beginPath();
    ctx.ellipse(-s * 0.12, -s * 0.03, s * 0.065, s * 0.04, -0.15, 0, Math.PI * 2);
    ctx.fill();

    const eyeRGrad = ctx.createRadialGradient(s * 0.12, -s * 0.03, 1, s * 0.12, -s * 0.03, s * 0.07);
    eyeRGrad.addColorStop(0, '#ffffff'); eyeRGrad.addColorStop(0.3, '#ffcc00'); eyeRGrad.addColorStop(0.7, '#ff6600'); eyeRGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeRGrad;
    ctx.beginPath();
    ctx.ellipse(s * 0.12, -s * 0.03, s * 0.065, s * 0.04, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  /* ══════════════════════════════════════════════════════════════
     2. 🔥 INFERNO ARCH-DEMON — Realistic 2.5D Volumetric Fire Demon
  ══════════════════════════════════════════════════════════════ */
  _drawInfernoArchDemon25D(ctx, s, t, breathe, ep, flash) {
    const scX = 1 + breathe * 0.35;
    const scY = 1 - breathe * 0.18;
    const wingFlap = Math.sin(t * 4.2) * 0.22;

    // Tail
    ctx.save();
    const tailWave = Math.sin(t * 3.0) * s * 0.15;
    const tailGrad = ctx.createLinearGradient(0, s * 0.35, s * 0.5 + tailWave, s * 0.9);
    tailGrad.addColorStop(0, '#5a0a00'); tailGrad.addColorStop(0.6, '#b82000'); tailGrad.addColorStop(1, '#ff6600');
    ctx.strokeStyle = tailGrad;
    ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.10, s * 0.32);
    ctx.bezierCurveTo(s * 0.42 + tailWave, s * 0.52, s * 0.20 - tailWave, s * 0.76, s * 0.50 + tailWave, s * 0.90);
    ctx.stroke();

    // Tail blade
    const tipX = s * 0.50 + tailWave;
    const tipY = s * 0.90;
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.fillStyle = '#ff4400'; ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.12, -s * 0.10, s * 0.22, -s * 0.04); ctx.lineTo(0, -s * 0.24);
    ctx.quadraticCurveTo(-s * 0.12, -s * 0.10, 0, 0);
    ctx.fill();
    ctx.restore();
    ctx.restore();

    // Wings
    ctx.save();
    ctx.translate(-s * 0.14, -s * 0.20);
    ctx.rotate(-wingFlap);
    const wingLMem = ctx.createRadialGradient(-s * 0.5, -s * 0.4, s * 0.05, -s * 0.45, -s * 0.3, s * 0.65);
    wingLMem.addColorStop(0, '#ff9900'); wingLMem.addColorStop(0.35, '#d02800'); wingLMem.addColorStop(0.75, '#5c0600'); wingLMem.addColorStop(1, '#180000');
    ctx.fillStyle = wingLMem;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.35, -s * 0.55, -s * 0.65, -s * 0.72, -s * 0.85, -s * 0.50);
    ctx.bezierCurveTo(-s * 0.75, -s * 0.20, -s * 0.60, s * 0.10, -s * 0.45, s * 0.22);
    ctx.bezierCurveTo(-s * 0.28, s * 0.10, -s * 0.15, s * 0.05, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(s * 0.14, -s * 0.20);
    ctx.rotate(wingFlap);
    const wingRMem = ctx.createRadialGradient(s * 0.5, -s * 0.4, s * 0.05, s * 0.45, -s * 0.3, s * 0.65);
    wingRMem.addColorStop(0, '#ff9900'); wingRMem.addColorStop(0.35, '#d02800'); wingRMem.addColorStop(0.75, '#5c0600'); wingRMem.addColorStop(1, '#180000');
    ctx.fillStyle = wingRMem;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.35, -s * 0.55, s * 0.65, -s * 0.72, s * 0.85, -s * 0.50);
    ctx.bezierCurveTo(s * 0.75, -s * 0.20, s * 0.60, s * 0.10, s * 0.45, s * 0.22);
    ctx.bezierCurveTo(s * 0.28, s * 0.10, s * 0.15, s * 0.05, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Torso
    ctx.save();
    ctx.scale(scX, scY);
    const demonTorso = ctx.createRadialGradient(-s * 0.06, -s * 0.10, s * 0.06, 0, s * 0.05, s * 0.50);
    demonTorso.addColorStop(0, '#ff6600');
    demonTorso.addColorStop(0.35, '#a81600');
    demonTorso.addColorStop(0.75, '#4a0400');
    demonTorso.addColorStop(1, '#180000');

    ctx.fillStyle = demonTorso;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.38);
    ctx.bezierCurveTo(s * 0.32, -s * 0.30, s * 0.28, s * 0.15, s * 0.18, s * 0.42);
    ctx.bezierCurveTo(0, s * 0.46, -s * 0.18, s * 0.42, -s * 0.28, s * 0.15);
    ctx.bezierCurveTo(-s * 0.32, -s * 0.30, 0, -s * 0.38, 0, -s * 0.38);
    ctx.closePath();
    ctx.fill();

    // Abs & Pectoral details
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    [[-s * 0.08, s * 0.10], [s * 0.08, s * 0.10], [-s * 0.07, s * 0.22], [s * 0.07, s * 0.22]].forEach(([ax, ay]) => {
      ctx.fillStyle = 'rgba(255, 120, 30, 0.4)';
      ctx.beginPath(); ctx.ellipse(ax, ay, s * 0.065, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // Head & Horns
    ctx.save();
    const headBob = Math.sin(t * 1.5) * 0.03;
    ctx.translate(0, -s * 0.46 + headBob);
    ctx.scale(scX, scY);

    // Horns
    const hornL = ctx.createLinearGradient(-s * 0.15, 0, -s * 0.35, -s * 0.85);
    hornL.addColorStop(0, '#1c0202'); hornL.addColorStop(0.5, '#440804'); hornL.addColorStop(0.85, '#ff4400'); hornL.addColorStop(1, '#ffbb00');
    ctx.fillStyle = hornL;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.10);
    ctx.bezierCurveTo(-s * 0.40, -s * 0.35, -s * 0.48, -s * 0.72, -s * 0.24, -s * 0.84);
    ctx.bezierCurveTo(-s * 0.30, -s * 0.55, -s * 0.18, -s * 0.32, -s * 0.02, -s * 0.18);
    ctx.closePath();
    ctx.fill();

    const hornR = ctx.createLinearGradient(s * 0.15, 0, s * 0.35, -s * 0.85);
    hornR.addColorStop(0, '#1c0202'); hornR.addColorStop(0.5, '#440804'); hornR.addColorStop(0.85, '#ff4400'); hornR.addColorStop(1, '#ffbb00');
    ctx.fillStyle = hornR;
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.10);
    ctx.bezierCurveTo(s * 0.40, -s * 0.35, s * 0.48, -s * 0.72, s * 0.24, -s * 0.84);
    ctx.bezierCurveTo(s * 0.30, -s * 0.55, s * 0.18, -s * 0.32, s * 0.02, -s * 0.18);
    ctx.closePath();
    ctx.fill();

    // Head
    const demonHead = ctx.createRadialGradient(-s * 0.05, -s * 0.08, s * 0.03, 0, 0, s * 0.26);
    demonHead.addColorStop(0, '#ff6600');
    demonHead.addColorStop(0.4, '#b41600');
    demonHead.addColorStop(0.8, '#440400');
    demonHead.addColorStop(1, '#160000');

    ctx.fillStyle = demonHead;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.22, s * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.save();
    ctx.fillStyle = `rgba(255, 240, 60, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#ff7700'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(-s * 0.10, -s * 0.03, s * 0.05, s * 0.028, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.10, -s * 0.03, s * 0.05, s * 0.028, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  /* ══════════════════════════════════════════════════════════════
     3. ⚡ THUNDER GARGOYLE — Realistic 2.5D Volumetric Lightning Beast
  ══════════════════════════════════════════════════════════════ */
  _drawThunderGargoyle25D(ctx, s, t, breathe, ep, flash) {
    const sc = 1 + breathe * 0.6;
    const flap = Math.sin(t * 4.0) * 0.26;

    // Lightning Arcs
    ctx.save();
    ctx.strokeStyle = `rgba(230, 180, 255, ${0.8 + ep * 0.2})`;
    ctx.lineWidth = 2.5; ctx.shadowColor = '#d060ff'; ctx.shadowBlur = 14;
    for (let i = 0; i < 4; i++) {
      const arcA = t * 3.0 + (i * Math.PI * 2) / 4;
      const ax = Math.cos(arcA) * s * 0.55;
      const ay = Math.sin(arcA) * s * 0.40 - s * 0.12;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (Math.sin(t * 16 + i) * s * 0.2), ay + (Math.cos(t * 14 + i) * s * 0.15));
      ctx.stroke();
    }
    ctx.restore();

    // Wings
    ctx.save();
    ctx.translate(-s * 0.16, -s * 0.18);
    ctx.rotate(-flap);
    const wingLGrad = ctx.createRadialGradient(-s * 0.5, -s * 0.4, s * 0.05, -s * 0.45, -s * 0.25, s * 0.7);
    wingLGrad.addColorStop(0, '#f2d0ff'); wingLGrad.addColorStop(0.35, '#a438ff'); wingLGrad.addColorStop(0.75, '#480680'); wingLGrad.addColorStop(1, '#120220');
    ctx.fillStyle = wingLGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.35, -s * 0.55, -s * 0.65, -s * 0.75, -s * 0.95, -s * 0.48);
    ctx.bezierCurveTo(-s * 0.85, -s * 0.15, -s * 0.65, s * 0.15, -s * 0.55, s * 0.22);
    ctx.bezierCurveTo(-s * 0.32, s * 0.10, -s * 0.15, s * 0.05, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(s * 0.16, -s * 0.18);
    ctx.rotate(flap);
    const wingRGrad = ctx.createRadialGradient(s * 0.5, -s * 0.4, s * 0.05, s * 0.45, -s * 0.25, s * 0.7);
    wingRGrad.addColorStop(0, '#f2d0ff'); wingRGrad.addColorStop(0.35, '#a438ff'); wingRGrad.addColorStop(0.75, '#480680'); wingRGrad.addColorStop(1, '#120220');
    ctx.fillStyle = wingRGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.35, -s * 0.55, s * 0.65, -s * 0.75, s * 0.95, -s * 0.48);
    ctx.bezierCurveTo(s * 0.85, -s * 0.15, s * 0.65, s * 0.15, s * 0.55, s * 0.22);
    ctx.bezierCurveTo(s * 0.32, s * 0.10, s * 0.15, s * 0.05, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    ctx.save();
    ctx.scale(sc, sc);
    const gargoyleBody = ctx.createRadialGradient(-s * 0.08, -s * 0.10, s * 0.06, 0, s * 0.08, s * 0.48);
    gargoyleBody.addColorStop(0, '#be5cf8');
    gargoyleBody.addColorStop(0.4, '#6814b0');
    gargoyleBody.addColorStop(0.8, '#240438');
    gargoyleBody.addColorStop(1, '#0e0116');

    ctx.fillStyle = gargoyleBody;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.38);
    ctx.bezierCurveTo(s * 0.32, -s * 0.25, s * 0.26, s * 0.25, 0, s * 0.44);
    ctx.bezierCurveTo(-s * 0.26, s * 0.25, -s * 0.32, -s * 0.25, 0, -s * 0.38);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.save();
    const headBob = Math.sin(t * 1.6) * 0.03;
    ctx.translate(0, -s * 0.45 + headBob);
    ctx.scale(sc, sc);

    const headGarg = ctx.createRadialGradient(-s * 0.06, -s * 0.06, s * 0.03, 0, 0, s * 0.24);
    headGarg.addColorStop(0, '#ca6cff'); headGarg.addColorStop(0.5, '#6814b0'); headGarg.addColorStop(1, '#180228');
    ctx.fillStyle = headGarg;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.22, s * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.save();
    ctx.fillStyle = `rgba(255, 240, 255, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#d060ff'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(-s * 0.10, -s * 0.04, s * 0.06, s * 0.038, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.10, -s * 0.04, s * 0.06, s * 0.038, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  /* ══════════════════════════════════════════════════════════════
     4. 💧 ABYSSAL SPECTRAL WRAITH — Realistic 2.5D Liquid Ghost
  ══════════════════════════════════════════════════════════════ */
  _drawAbyssalWraith25D(ctx, s, t, breathe, ep, flash) {
    const sc = 1 + breathe * 0.8;
    const wave = Math.sin(t * 2.0) * s * 0.06;

    // Body
    ctx.save();
    ctx.scale(sc, sc);
    const bodyG = ctx.createRadialGradient(0, -s * 0.1, 0, 0, 0, s * 0.44);
    bodyG.addColorStop(0, '#e0ffff');
    bodyG.addColorStop(0.35, 'rgba(0, 190, 240, 0.88)');
    bodyG.addColorStop(0.8, 'rgba(0, 80, 160, 0.6)');
    bodyG.addColorStop(1, 'rgba(0, 16, 48, 0)');

    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.38);
    ctx.bezierCurveTo(s * 0.25, -s * 0.26, s * 0.22, s * 0.28, 0, s * 0.60 + wave);
    ctx.bezierCurveTo(-s * 0.22, s * 0.28, -s * 0.25, -s * 0.26, 0, -s * 0.38);
    ctx.closePath(); ctx.fill();

    // Void Face & Glowing Eyes
    ctx.save();
    ctx.translate(0, -s * 0.45);
    ctx.fillStyle = '#020b14'; ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.20, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = s * 0.28 * (0.8 + ep * 0.4);
    ctx.beginPath(); ctx.ellipse(-s * 0.09, -s * 0.03, s * 0.055, s * 0.038, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.09, -s * 0.03, s * 0.055, s * 0.038, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  /* ══════════════════════════════════════════════════════════════
     5. 💨 TEMPEST ZEPHYR HARPY — Realistic 2.5D Celestial Assassin
  ══════════════════════════════════════════════════════════════ */
  _drawZephyrHarpy25D(ctx, s, t, breathe, ep, flash) {
    const sc = 1 + breathe;
    const flap = Math.sin(t * 5.2) * 0.34;

    // Wings
    ctx.save();
    ctx.translate(-s * 0.14, -s * 0.22);
    ctx.rotate(-flap);
    const wingL = ctx.createLinearGradient(-s * 0.90, -s * 0.70, 0, s * 0.2);
    wingL.addColorStop(0, '#f0fff4'); wingL.addColorStop(0.35, '#52e088'); wingL.addColorStop(0.8, '#186838'); wingL.addColorStop(1, '#062812');
    ctx.fillStyle = wingL;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.40, -s * 0.60, -s * 0.70, -s * 0.75, -s * 0.95, -s * 0.38);
    ctx.bezierCurveTo(-s * 0.75, 0, -s * 0.55, s * 0.18, -s * 0.22, s * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(s * 0.14, -s * 0.22);
    ctx.rotate(flap);
    const wingR = ctx.createLinearGradient(s * 0.90, -s * 0.70, 0, s * 0.2);
    wingR.addColorStop(0, '#f0fff4'); wingR.addColorStop(0.35, '#52e088'); wingR.addColorStop(0.8, '#186838'); wingR.addColorStop(1, '#062812');
    ctx.fillStyle = wingR;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.40, -s * 0.60, s * 0.70, -s * 0.75, s * 0.95, -s * 0.38);
    ctx.bezierCurveTo(s * 0.75, 0, s * 0.55, s * 0.18, s * 0.22, s * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    ctx.save();
    ctx.scale(sc, sc);
    const bodyG = ctx.createRadialGradient(-s * 0.06, -s * 0.10, s * 0.04, 0, s * 0.05, s * 0.45);
    bodyG.addColorStop(0, '#e0ffe8'); bodyG.addColorStop(0.4, '#40c874'); bodyG.addColorStop(0.85, '#105428'); bodyG.addColorStop(1, '#062410');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.40); ctx.lineTo(s * 0.24, -s * 0.26); ctx.lineTo(s * 0.16, s * 0.42);
    ctx.lineTo(-s * 0.16, s * 0.42); ctx.lineTo(-s * 0.24, -s * 0.26);
    ctx.closePath(); ctx.fill();

    // Glowing Jade Visor
    ctx.save();
    ctx.translate(0, -s * 0.45);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#50ff90'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, -s * 0.02); ctx.lineTo(s * 0.14, -s * 0.02); ctx.lineTo(s * 0.10, s * 0.03); ctx.lineTo(-s * 0.10, s * 0.03);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  /* ══════════════════════════════════════════════════════════════
     6. ❄️ GLACIAL FROST BEHEMOTH — Realistic 2.5D Crystal Ice Titan
  ══════════════════════════════════════════════════════════════ */
  _drawGlacialBehemoth25D(ctx, s, t, breathe, ep, flash) {
    const sc = 1 + breathe * 0.55;

    // Body
    ctx.save();
    ctx.scale(sc, sc);
    const bodyG = ctx.createRadialGradient(-s * 0.08, -s * 0.10, s * 0.06, 0, s * 0.05, s * 0.50);
    bodyG.addColorStop(0, '#f0faff'); bodyG.addColorStop(0.35, '#82cef2'); bodyG.addColorStop(0.75, '#387ea8'); bodyG.addColorStop(1, '#103254');

    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, -s * 0.28);
    ctx.lineTo(s * 0.42, -s * 0.28);
    ctx.lineTo(s * 0.35, s * 0.48);
    ctx.lineTo(-s * 0.35, s * 0.48);
    ctx.closePath(); ctx.fill();

    // Frost Core Sigil
    ctx.strokeStyle = `rgba(180, 240, 255, ${0.85 + ep * 0.15})`;
    ctx.lineWidth = 2.5; ctx.shadowColor = '#60d0ff'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.18); ctx.lineTo(-s * 0.09, 0); ctx.lineTo(0, s * 0.18); ctx.lineTo(s * 0.09, 0);
    ctx.closePath(); ctx.stroke();

    // Head
    ctx.save();
    ctx.translate(0, -s * 0.42);
    const headG = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.28);
    headG.addColorStop(0, '#f4fcff'); headG.addColorStop(0.5, '#88ceef'); headG.addColorStop(1, '#184c78');
    ctx.fillStyle = headG; ctx.strokeStyle = '#a0e4ff'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.26, -s * 0.20);
    ctx.lineTo(s * 0.26, -s * 0.20);
    ctx.lineTo(s * 0.28, 0.04);
    ctx.lineTo(s * 0.16, s * 0.26);
    ctx.lineTo(-s * 0.16, s * 0.26);
    ctx.lineTo(-s * 0.28, 0.04);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Eyes
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = s * 0.28;
    ctx.beginPath(); ctx.ellipse(-s * 0.11, -s * 0.03, s * 0.065, s * 0.042, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.11, -s * 0.03, s * 0.065, s * 0.042, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  _applyHitFlash(ctx, s, flashAlpha) {
    if (flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = s * 0.4;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawHPBar(ctx, cx, cy, size) {
    const bw = size * 1.15;
    const bh = size > 60 ? 11 : 8;
    const bx = cx - bw / 2;
    const by = cy + size * 0.90;
    const pct = Math.max(0, Math.min(1, this.hp / this.maxHp));

    ctx.save();
    ctx.fillStyle = 'rgba(5, 12, 22, 0.85)';
    ctx.strokeStyle = 'rgba(200, 146, 42, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx - 3, by - 3, bw + 6, bh + 6, 4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#101a28';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 2); ctx.fill();

    const barColor = pct > 0.5 ? '#22e060' : pct > 0.25 ? '#ffaa20' : '#ff3030';
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.roundRect(bx, by, bw * pct, bh, 2); ctx.fill();
    ctx.shadowBlur = 0;

    if (this.scale > 0.35) {
      const names = {
        Fire:      '🔥 INFERNO IMP',
        Water:     '💧 SPECTRAL WRAITH',
        Earth:     '⛰️ GRANITE GOLEM',
        Wind:      '💨 TEMPEST HARPY',
        Lightning: '⚡ STORMBIRD GARGOYLE',
        Ice:       '❄️ FROST BEHEMOTH'
      };
      const label = names[this.element] || this.element;
      const fs = Math.max(10, Math.round(size * 0.13));
      ctx.font = `bold ${fs}px 'Orbitron','Rajdhani',sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = this.color; ctx.shadowBlur = 8;
      ctx.fillText(label, cx, by - 6);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
