/* ═══════════════════════════════════════════════════════════════
   PARTICLES — SpellEffect & MenuParticleSystem (Ambient Embers)
═══════════════════════════════════════════════════════════════ */

import { CONFIG } from './config.jsx';

export class SpellEffect {
  constructor({ element, targetX, targetY }) {
    this.element  = element;
    this.tx       = targetX;
    this.ty       = targetY;
    this.age      = 0;
    this.lifetime = 0.7;
    this.done     = false;
    this.particles = this._buildParticles();
  }

  _buildParticles() {
    const count = ({ Fire: 24, Water: 20, Earth: 18, Wind: 22, Lightning: 16, Ice: 20 })[this.element] || 18;
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 180;
      return {
        x: this.tx,
        y: this.ty,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        size: 4 + Math.random() * 10,
        alpha: 1,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8
      };
    });
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.lifetime) {
      this.done = true;
      return;
    }
    const t = this.age / this.lifetime;
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.vx *= (1 - dt * 2);
      p.alpha = 1 - t;
      p.rot += p.rotSpeed * dt;
    });
  }

  draw(ctx) {
    if (this.done) return;
    const el = this.element;
    const color = CONFIG.ELEMENT_COLORS[el] || '#ffffff';

    // Shockwave ring
    const t = this.age / this.lifetime;
    if (t < 0.4) {
      const r = t * 120;
      ctx.save();
      ctx.globalAlpha = (0.4 - t) * 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.tx, this.ty, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    ctx.save();
    this.particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      if (el === 'Lightning') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-p.size / 2, 0);
        ctx.lineTo(p.size / 2, 0);
        ctx.stroke();
      } else if (el === 'Ice') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        for (let a = 0; a < 3; a++) {
          ctx.save();
          ctx.rotate(a * Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(0, p.size / 2);
          ctx.stroke();
          ctx.restore();
        }
      } else {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }
}

export class MenuParticleSystem {
  constructor(canvas) {
    this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.numParticles = 55;
    this.running = false;
    this._rafId = null;
    this._resizeHandler = () => this.resize();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._resizeHandler);
    }
    this.resize();
    this._initParticles();
  }

  resize() {
    if (!this.canvas || typeof window === 'undefined') return;
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  _initParticles() {
    const colors = [
      { r: 255, g: 215, b: 0, glow: 'rgba(255, 215, 0, ' },
      { r: 245, g: 184, b: 66, glow: 'rgba(245, 184, 66, ' },
      { r: 0, g: 229, b: 255, glow: 'rgba(0, 229, 255, ' },
      { r: 64, g: 200, b: 255, glow: 'rgba(64, 200, 255, ' },
      { r: 200, g: 128, b: 255, glow: 'rgba(200, 128, 255, ' }
    ];

    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 720;

    this.particles = Array.from({ length: this.numParticles }, () => {
      const col = colors[Math.floor(Math.random() * colors.length)];
      return {
        x: Math.random() * (this.width || w),
        y: Math.random() * (this.height || h),
        radius: 0.8 + Math.random() * 2.2,
        speedY: -(0.25 + Math.random() * 0.65),
        speedX: (Math.random() - 0.5) * 0.25,
        swaySpeed: 0.012 + Math.random() * 0.025,
        swayRadius: 0.4 + Math.random() * 0.8,
        swayAngle: Math.random() * Math.PI * 2,
        alpha: 0.15 + Math.random() * 0.55,
        targetAlpha: 0.2 + Math.random() * 0.6,
        alphaSpeed: 0.005 + Math.random() * 0.015,
        color: col,
        flare: Math.random() < 0.25
      };
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.draw();
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  destroy() {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this._resizeHandler);
    }
  }

  update() {
    const w = this.width || (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = this.height || (typeof window !== 'undefined' ? window.innerHeight : 720);

    this.particles.forEach(p => {
      p.y += p.speedY;
      p.swayAngle += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.swayAngle) * p.swayRadius;

      p.alpha += (p.targetAlpha - p.alpha) * p.alphaSpeed;
      if (Math.abs(p.targetAlpha - p.alpha) < 0.04) {
        p.targetAlpha = 0.15 + Math.random() * 0.65;
      }

      if (p.y < -20) {
        p.y = h + 10;
        p.x = Math.random() * w;
        p.alpha = 0.05;
      }
      if (p.x < -20) p.x = w + 10;
      else if (p.x > w + 20) p.x = -10;
    });
  }

  draw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach(p => {
      const a = Math.max(0, Math.min(1, p.alpha));
      const col = p.color;

      const grad = this.ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.radius * 3.5
      );
      grad.addColorStop(0, `${col.glow}${a * 0.9})`);
      grad.addColorStop(0.4, `${col.glow}${a * 0.35})`);
      grad.addColorStop(1, `${col.glow}0)`);

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.95})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
}
