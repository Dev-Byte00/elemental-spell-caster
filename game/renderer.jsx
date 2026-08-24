/* ═══════════════════════════════════════════════════════════════
   RENDERER — Canvas 2D Game Rendering Pipeline
═══════════════════════════════════════════════════════════════ */

import { CONFIG } from './config.jsx';
import { ASSETS } from './assets.jsx';

export class Renderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = state;
  }

  _getStageTheme(stageIdx) {
    const defaultTheme = {
      wallBg: ['#0d1424', '#040810'],
      windowGlow: 'rgba(0, 200, 255, 0.45)',
      windowGlass: ['#a8f4ff', '#0090d8', '#001c38'],
      rayColor: 'rgba(0, 210, 255, 0.12)',
      pillarColor: ['#24384c', '#0e1824'],
      crystalColor: '#00d4ff',
      crystalHighlight: '#e0ffff',
      runeColor: '#00d4ff',
      runeGlow: 'rgba(0, 212, 255, 0.85)',
      circleSecondary: '#ffd700',
      ambientParticle: '#00e5ff'
    };

    const themes = [
      { // 0: Fire
        wallBg: ['#200902', '#080200'],
        windowGlow: 'rgba(255, 90, 20, 0.50)',
        windowGlass: ['#ffee88', '#ff5500', '#660000'],
        rayColor: 'rgba(255, 120, 30, 0.14)',
        pillarColor: ['#441c10', '#1c0a04'],
        crystalColor: '#ff4400',
        crystalHighlight: '#ffeeaa',
        runeColor: '#ff8800',
        runeGlow: 'rgba(255, 120, 0, 0.9)',
        circleSecondary: '#ffd700',
        ambientParticle: '#ff6600'
      },
      { // 1: Water
        wallBg: ['#001428', '#000612'],
        windowGlow: 'rgba(0, 200, 255, 0.50)',
        windowGlass: ['#a0f4ff', '#0088cc', '#001a40'],
        rayColor: 'rgba(0, 210, 255, 0.13)',
        pillarColor: ['#143048', '#081824'],
        crystalColor: '#00d4ff',
        crystalHighlight: '#e0ffff',
        runeColor: '#00ccff',
        runeGlow: 'rgba(0, 200, 255, 0.85)',
        circleSecondary: '#70e0ff',
        ambientParticle: '#00e5ff'
      },
      { // 2: Earth
        wallBg: ['#0a180c', '#020a04'],
        windowGlow: 'rgba(100, 220, 120, 0.45)',
        windowGlass: ['#d0ffb0', '#44aa55', '#0f3818'],
        rayColor: 'rgba(120, 230, 100, 0.11)',
        pillarColor: ['#2c4024', '#121e10'],
        crystalColor: '#50e080',
        crystalHighlight: '#f0ffe0',
        runeColor: '#e0a020',
        runeGlow: 'rgba(224, 160, 32, 0.85)',
        circleSecondary: '#70e080',
        ambientParticle: '#80ff90'
      },
      { // 3: Wind
        wallBg: ['#0d1a2d', '#050a14'],
        windowGlow: 'rgba(160, 235, 200, 0.48)',
        windowGlass: ['#e8ffff', '#66ccbb', '#103838'],
        rayColor: 'rgba(180, 255, 230, 0.13)',
        pillarColor: ['#243848', '#0e1a24'],
        crystalColor: '#60f0d0',
        crystalHighlight: '#f0ffff',
        runeColor: '#60f0d0',
        runeGlow: 'rgba(96, 240, 208, 0.85)',
        circleSecondary: '#d0f8ff',
        ambientParticle: '#a0ffe0'
      },
      { // 4: Lightning
        wallBg: ['#180828', '#080212'],
        windowGlow: 'rgba(180, 100, 255, 0.55)',
        windowGlass: ['#f0d0ff', '#8830ee', '#200544'],
        rayColor: 'rgba(190, 120, 255, 0.15)',
        pillarColor: ['#341a48', '#160822'],
        crystalColor: '#b850ff',
        crystalHighlight: '#ffd8ff',
        runeColor: '#c860ff',
        runeGlow: 'rgba(200, 96, 255, 0.9)',
        circleSecondary: '#ffd700',
        ambientParticle: '#d880ff'
      },
      { // 5: Ice
        wallBg: ['#041426', '#010812'],
        windowGlow: 'rgba(120, 210, 255, 0.55)',
        windowGlass: ['#f0faff', '#60b8e8', '#103050'],
        rayColor: 'rgba(140, 220, 255, 0.14)',
        pillarColor: ['#18364c', '#081a28'],
        crystalColor: '#70d0ff',
        crystalHighlight: '#ffffff',
        runeColor: '#60c8ff',
        runeGlow: 'rgba(96, 200, 255, 0.9)',
        circleSecondary: '#ffffff',
        ambientParticle: '#c0f0ff'
      },
      { // 6: Chaos / Astral Void
        wallBg: ['#1c0024', '#08000c'],
        windowGlow: 'rgba(230, 100, 255, 0.55)',
        windowGlass: ['#ffe0ff', '#9920cc', '#200030'],
        rayColor: 'rgba(230, 150, 255, 0.16)',
        pillarColor: ['#381240', '#14041c'],
        crystalColor: '#e050ff',
        crystalHighlight: '#ffffff',
        runeColor: '#ffd700',
        runeGlow: 'rgba(255, 215, 0, 0.95)',
        circleSecondary: '#00f0ff',
        ambientParticle: '#ff88ff'
      }
    ];

    if (typeof stageIdx === 'number' && themes[stageIdx]) {
      return themes[stageIdx];
    }
    return defaultTheme;
  }

  render(nowMs, stageIdx) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    const theme = this._getStageTheme(stageIdx);

    this._drawCathedralBackground(nowMs, theme);
    this._drawCathedralFloor(nowMs, theme);
    this._drawMonsters(nowMs);
    this._drawEffects();
    this._drawCrosshair();
    this._drawFlashMsg(nowMs);
  }

  _drawCathedralBackground(nowMs, theme) {
    const ctx = this.ctx;
    const cw = CONFIG.CANVAS_W;
    const ch = CONFIG.CANVAS_H;
    const t = nowMs / 1000;

    const bgImg = ASSETS.getImage('bg_cathedral');
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, cw, ch);

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = theme.wallBg[0];
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();

      this.state.bgParticles.forEach(p => {
        p.x += p.drift;
        p.y -= p.speed * 0.35;
        if (p.y < -5) { p.y = ch + 5; p.x = Math.random() * cw; }
        ctx.save();
        ctx.globalAlpha = p.alpha * 0.75;
        ctx.fillStyle = theme.ambientParticle;
        ctx.shadowColor = theme.ambientParticle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      return;
    }

    const wallG = ctx.createLinearGradient(0, 0, 0, ch * 0.65);
    wallG.addColorStop(0, theme.wallBg[0]);
    wallG.addColorStop(1, theme.wallBg[1]);
    ctx.fillStyle = wallG;
    ctx.fillRect(0, 0, cw, ch);

    this.state.bgParticles.forEach(p => {
      p.x += p.drift;
      p.y -= p.speed * 0.35;
      if (p.y < -5) { p.y = ch + 5; p.x = Math.random() * cw; }
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.7;
      ctx.fillStyle = theme.ambientParticle;
      ctx.shadowColor = theme.ambientParticle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  _drawCathedralFloor(nowMs, theme) {
    const ctx = this.ctx;
    const cw = CONFIG.CANVAS_W;
    const ch = CONFIG.CANVAS_H;
    const groundY = ch * 0.52;
    const t = nowMs / 1000;
    const hasBg = !!ASSETS.getImage('bg_cathedral');

    if (!hasBg) {
      const floorG = ctx.createLinearGradient(0, groundY, 0, ch);
      floorG.addColorStop(0, '#101a28');
      floorG.addColorStop(0.35, '#0a101c');
      floorG.addColorStop(1, '#03060c');
      ctx.fillStyle = floorG;
      ctx.fillRect(0, groundY, cw, ch - groundY);
    }

    const circleCenterX = cw / 2;
    const circleCenterY = ch * 0.76;
    const rotSpeed = t * 0.35;

    ctx.save();
    ctx.translate(circleCenterX, circleCenterY);

    const floorGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 480);
    floorGlow.addColorStop(0, theme.runeGlow.replace(/[\d\.]+\)$/, '0.28)'));
    floorGlow.addColorStop(0.6, theme.runeGlow.replace(/[\d\.]+\)$/, '0.08)'));
    floorGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = floorGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 480, 190, 0, 0, Math.PI * 2);
    ctx.fill();

    const radX = 390;
    const radY = 145;

    ctx.strokeStyle = theme.runeColor;
    ctx.shadowColor = theme.runeColor;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;

    ctx.beginPath(); ctx.ellipse(0, 0, radX, radY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, radX * 0.94, radY * 0.94, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, radX * 0.85, radY * 0.85, 0, 0, Math.PI * 2); ctx.stroke();

    const nodeCount = 12;
    for (let n = 0; n < nodeCount; n++) {
      const nAngle = (n * Math.PI * 2) / nodeCount + rotSpeed;
      const nx = Math.cos(nAngle) * radX * 0.895;
      const ny = Math.sin(nAngle) * radY * 0.895;

      ctx.fillStyle = theme.circleSecondary;
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const starPoints = 6;
    const starPts = [];
    for (let p = 0; p < starPoints; p++) {
      const pAngle = (p * Math.PI * 2) / starPoints - rotSpeed * 0.7;
      starPts.push({
        x: Math.cos(pAngle) * radX * 0.85,
        y: Math.sin(pAngle) * radY * 0.85
      });
    }

    ctx.strokeStyle = `rgba(255, 215, 0, ${0.45 + Math.sin(t * 2.5) * 0.15})`;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(starPts[0].x, starPts[0].y);
    ctx.lineTo(starPts[2].x, starPts[2].y);
    ctx.lineTo(starPts[4].x, starPts[4].y);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(starPts[1].x, starPts[1].y);
    ctx.lineTo(starPts[3].x, starPts[3].y);
    ctx.lineTo(starPts[5].x, starPts[5].y);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  _drawMonsters(nowMs) {
    const sorted = [...this.state.monsters].sort((a, b) => a.scale - b.scale);
    sorted.forEach(m => m.draw(this.ctx, nowMs));
  }

  _drawEffects() {
    this.state.effects.forEach(e => e.draw(this.ctx));
  }

  _drawCrosshair() {
    const ctx = this.ctx;
    const cx = CONFIG.CANVAS_W / 2;
    const cy = CONFIG.CANVAS_H * 0.45;
    const el = this.state.currentLabel;
    const isActive = CONFIG.ELEMENTS.includes(el) && this.state.currentConf >= CONFIG.CONFIDENCE_THRESHOLD;
    const color = isActive ? (CONFIG.ELEMENT_COLORS[el] || '#ffffff') : 'rgba(255,255,255,0.4)';
    const size = isActive ? 22 : 18;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    if (isActive) { ctx.shadowColor = color; ctx.shadowBlur = 12; }

    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.stroke();

    const gap = 6;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * (size + gap), cy + dy * (size + gap));
      ctx.lineTo(cx + dx * (size + gap + 12), cy + dy * (size + gap + 12));
      ctx.stroke();
    });

    if (isActive) {
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText(
        `${CONFIG.ELEMENT_ICONS[el]} ${el.toUpperCase()}`,
        cx, cy - size - 14
      );
    }
    ctx.restore();
  }

  _drawFlashMsg(nowMs) {
    const f = this.state.flashMsg;
    if (!f || nowMs > f.expires) return;
    const t = (f.expires - nowMs) / 1500;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(t * 2, 1);
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 16;
    ctx.fillText(f.text, CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H * 0.3);
    ctx.restore();
  }
}
