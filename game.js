/* ═══════════════════════════════════════════════════════════════
   ELEMENTAL SPELL CASTER — game.js
   Modular architecture:
     1. CONFIG          — ค่าคงที่ทั้งหมด
     2. AudioManager    — Web Audio API procedural sound
     3. AIDetector      — Teachable Machine (Pose / Image / Audio)
     4. ElementSystem   — Weakness / Resistance table
     5. Monster         — 18 แบบ (6 elements × 3 tiers)
     6. SpellEffect     — Particle effects 6 ธาตุ
     7. GameState       — Central state
     8. WaveManager     — Wave / Endless / Story mode
     9. Renderer        — Canvas 2D rendering
    10. GameLoop        — rAF loop
    11. App             — Entry point + UI wiring
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════
   1. CONFIG
══════════════════════════════════════════ */
const CONFIG = Object.freeze({
  CANVAS_W: 1280,
  CANVAS_H: 720,
  CONFIDENCE_THRESHOLD: 0.80,
  SPELL_COOLDOWN_MS: 500,
  SPELL_MANA_COST: 5,
  PLAYER_MAX_HP: 100,
  PLAYER_MAX_MANA: 100,
  PLAYER_MANA_REGEN: 2,      // per second
  MAX_WAVES: 20,
  STORY_STAGES: 7,
  MONSTER_REACH_THRESHOLD: 1.6, // scale factor = monster reached player

  ELEMENTS: ['Fire','Water','Earth','Wind','Lightning','Ice'],
  ELEMENT_ICONS: {
    Fire:'🔥', Water:'💧', Earth:'🌿', Wind:'💨', Lightning:'⚡', Ice:'❄️'
  },
  ELEMENT_COLORS: {
    Fire:'#ff6b35', Water:'#00b4d8', Earth:'#52b788',
    Wind:'#c8e6c9', Lightning:'#ffd700', Ice:'#90e0ef'
  },
  ELEMENT_GLOW: {
    Fire:'rgba(255,107,53,0.7)', Water:'rgba(0,180,216,0.7)',
    Earth:'rgba(82,183,136,0.7)', Wind:'rgba(200,230,201,0.5)',
    Lightning:'rgba(255,215,0,0.8)', Ice:'rgba(144,224,239,0.7)'
  },

  STORY_STAGES_DATA: [
    { name:'🌋 Volcanic Cavern',   element:'Fire',      bg:['#1a0800','#3d1a00'] },
    { name:'🌊 Abyssal Depths',    element:'Water',     bg:['#001a2e','#003354'] },
    { name:'🌲 Ancient Forest',    element:'Earth',     bg:['#0a1a0a','#0d2b1a'] },
    { name:'☁️ Sky Citadel',       element:'Wind',      bg:['#0d1a2e','#1a2840'] },
    { name:'⚡ Storm Spire',       element:'Lightning', bg:['#1a1400','#2e2400'] },
    { name:'🧊 Frozen Wastes',     element:'Ice',       bg:['#001828','#002a3d'] },
    { name:'🌀 Chaos Realm (Boss)',element:'mixed',     bg:['#1a001a','#2e002e'] }
  ]
});

/* ══════════════════════════════════════════
   1.5. AssetManager (Image Loader & Cache)
══════════════════════════════════════════ */
class AssetManager {
  constructor() {
    this.images = {};
    this.loadAll();
  }

  loadAll() {
    const assets = {
      bg_cathedral:      'assets/images/bg_cathedral.jpg',
      monster_earth:     'assets/images/monster_earth.jpg',
      monster_fire:      'assets/images/monster_fire.jpg',
      monster_lightning: 'assets/images/monster_lightning.jpg',
      spell_ice:         'assets/images/spell_ice.jpg',
      spell_fire:        'assets/images/spell_fire.jpg',
      spell_lightning:   'assets/images/spell_lightning.jpg',
      spell_earth:       'assets/images/spell_earth.jpg',
      spell_water:       'assets/images/spell_water.jpg',
      spell_wind:        'assets/images/spell_wind.jpg'
    };

    Object.entries(assets).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => { this.images[key] = img; };
      img.onerror = () => { /* gracefully fallback to procedural rendering */ };
    });
  }

  getImage(key) {
    const img = this.images[key];
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }
}

const ASSETS = new AssetManager();

/* ══════════════════════════════════════════
   2. AudioManager
══════════════════════════════════════════ */
class AudioManager {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._bgmNodes = [];
    this._enabled = true;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0.4;
      this._masterGain.connect(this._ctx.destination);
    }
    return this._ctx;
  }

  _playTone({ type='sine', freq=440, duration=0.3, vol=0.3,
               freqEnd=null, attack=0.01, decay=0.05, filter=null }) {
    if (!this._enabled) return;
    try {
      const ctx = this._getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freqEnd !== null)
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd,1), ctx.currentTime + duration);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration - decay);

      if (filter) {
        const bq = ctx.createBiquadFilter();
        bq.type = filter.type || 'lowpass';
        bq.frequency.value = filter.freq || 800;
        bq.Q.value = filter.Q || 1;
        osc.connect(bq);
        bq.connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(this._masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);

      osc.onended = () => { try { gain.disconnect(); } catch(_){} };
    } catch(e) { /* audio fail silently */ }
  }

  playSpell(element) {
    const map = {
      Fire:      () => {
        this._playTone({ type:'sawtooth', freq:220, freqEnd:440, duration:0.4, vol:0.35,
                          filter:{ type:'bandpass', freq:600, Q:2 } });
        this._playTone({ type:'sine', freq:80, freqEnd:40, duration:0.3, vol:0.2 });
      },
      Water:     () => {
        this._playTone({ type:'sine', freq:660, freqEnd:440, duration:0.5, vol:0.25,
                          filter:{ type:'lowpass', freq:1200, Q:3 } });
        this._playTone({ type:'sine', freq:880, freqEnd:660, duration:0.4, vol:0.15 });
      },
      Earth:     () => {
        this._playTone({ type:'square', freq:110, freqEnd:55, duration:0.5, vol:0.4,
                          filter:{ type:'lowpass', freq:400, Q:1 } });
      },
      Wind:      () => {
        this._playTone({ type:'sine', freq:1200, freqEnd:800, duration:0.6, vol:0.2,
                          filter:{ type:'highpass', freq:900, Q:2 } });
        this._playTone({ type:'sine', freq:1400, freqEnd:900, duration:0.5, vol:0.15 });
      },
      Lightning: () => {
        this._playTone({ type:'square', freq:1800, freqEnd:200, duration:0.25, vol:0.45,
                          filter:{ type:'bandpass', freq:1500, Q:5 } });
        this._playTone({ type:'sawtooth', freq:900, freqEnd:100, duration:0.3, vol:0.3 });
      },
      Ice:       () => {
        this._playTone({ type:'sine', freq:1400, freqEnd:1800, duration:0.4, vol:0.2 });
        this._playTone({ type:'triangle', freq:2000, freqEnd:1600, duration:0.5, vol:0.15,
                          filter:{ type:'highpass', freq:1200, Q:4 } });
      }
    };
    (map[element] || (() => {}))();
  }

  playMonsterHit(element) {
    const col = CONFIG.ELEMENT_COLORS[element] || '#888';
    this._playTone({ type:'square', freq:200, freqEnd:80, duration:0.2, vol:0.25,
                      filter:{ type:'lowpass', freq:500 } });
  }

  playMonsterDeath() {
    this._playTone({ type:'sawtooth', freq:400, freqEnd:50, duration:0.5, vol:0.35,
                      filter:{ type:'lowpass', freq:600 } });
  }

  playPlayerHit() {
    this._playTone({ type:'square', freq:100, freqEnd:40, duration:0.4, vol:0.4,
                      filter:{ type:'lowpass', freq:300 } });
    this._playTone({ type:'sine', freq:300, freqEnd:150, duration:0.35, vol:0.2 });
  }

  playLevelUp() {
    [440,550,660,880].forEach((f, i) => {
      setTimeout(() => this._playTone({ type:'sine', freq:f, duration:0.25, vol:0.3 }), i * 100);
    });
  }

  playGameOver() {
    [400,350,300,200].forEach((f, i) => {
      setTimeout(() => this._playTone({ type:'sawtooth', freq:f, duration:0.4, vol:0.3 }), i * 200);
    });
  }

  startBGM() {
    if (!this._enabled) return;
    try {
      const ctx = this._getCtx();
      // Drone bass
      const notes = [55, 73.4, 82.4];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const fltr = ctx.createBiquadFilter();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.06;
        fltr.type = 'lowpass'; fltr.frequency.value = 200;
        osc.connect(fltr); fltr.connect(gain); gain.connect(this._masterGain);
        osc.start();
        this._bgmNodes.push(osc, gain, fltr);
      });
      // High shimmer
      const shimOsc = ctx.createOscillator();
      const shimGain = ctx.createGain();
      shimOsc.type = 'sine';
      shimOsc.frequency.value = 880;
      shimGain.gain.value = 0.02;
      shimOsc.connect(shimGain); shimGain.connect(this._masterGain);
      shimOsc.start();
      this._bgmNodes.push(shimOsc, shimGain);
    } catch(e) {}
  }

  stopBGM() {
    this._bgmNodes.forEach(n => {
      try { if (n.stop) n.stop(); n.disconnect(); } catch(_) {}
    });
    this._bgmNodes = [];
  }

  cleanup() {
    this.stopBGM();
    if (this._ctx) {
      try { this._ctx.close(); } catch(_) {}
      this._ctx = null;
      this._masterGain = null;
    }
  }
}

/* ══════════════════════════════════════════
   3. AIDetector
══════════════════════════════════════════ */
class AIDetector {
  constructor(modelURL, modelType) {
    let cleanUrl = (modelURL || '').trim();
    if (cleanUrl.endsWith('model.json')) {
      cleanUrl = cleanUrl.replace(/model\.json$/, '');
    }
    if (!cleanUrl.endsWith('/')) {
      cleanUrl += '/';
    }
    this.modelURL    = cleanUrl;
    this.modelType   = modelType; // 'pose' | 'image' | 'audio'
    this._model      = null;
    this._recognizer = null;
    this._stream     = null;
    this._videoEl    = document.getElementById('webcamVideo');
    this._poseCanvas = document.getElementById('poseCanvas');
    this._lastResult = { label: 'Idle', confidence: 0, predictions: [] };
    this._audioResult = { label: 'Idle', confidence: 0, predictions: [] };
    this.availableElements = [...CONFIG.ELEMENTS];
    this.lockedElements    = [];
    this.modelClasses      = [];
    this._disposed         = false;
  }

  _normalizeLabel(raw) {
    if (!raw || typeof raw !== 'string') return 'Idle';
    const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    // 1. Comprehensive Idle checks (including typos: idel, ibel, idie, idl, etc.)
    if (
      clean.includes('idle') || clean.includes('idel') || clean.includes('ibel') ||
      clean.includes('idie') || clean.includes('idl')  || clean.includes('noise') ||
      clean.includes('none') || clean.includes('neutral') || clean.includes('stand') ||
      clean.includes('wait') || clean.includes('rest') || clean.includes('normal') ||
      clean.includes('default') || clean.includes('background') || clean.includes('nothing') ||
      clean.includes('pause') || clean.includes('stop') || clean.includes('relax') ||
      clean === 'class0' || clean === 'class_0' || clean === 'pose0' || clean === 'pose_0'
    ) {
      return 'Idle';
    }

    // 2. Elemental keywords
    if (clean.includes('fire') || clean.includes('flame') || clean.includes('pyro') || clean.includes('blaze') || clean.includes('heat') || clean.includes('ember') || clean.includes('burn')) return 'Fire';
    if (clean.includes('water') || clean.includes('aqua') || clean.includes('hydro') || clean.includes('tidal') || clean.includes('ocean') || clean.includes('wave') || clean.includes('rain')) return 'Water';
    if (clean.includes('earth') || clean.includes('stone') || clean.includes('rock') || clean.includes('terra') || clean.includes('ground') || clean.includes('soil') || clean.includes('boulder')) return 'Earth';
    if (clean.includes('wind') || clean.includes('air') || clean.includes('gale') || clean.includes('storm_wind') || clean.includes('breeze') || clean.includes('tornado') || clean.includes('gust')) return 'Wind';
    if (clean.includes('lightn') || clean.includes('thund') || clean.includes('volt') || clean.includes('elec') || clean.includes('spark') || clean.includes('shock') || clean.includes('bolt')) return 'Lightning';
    if (clean.includes('ice') || clean.includes('frost') || clean.includes('glacier') || clean.includes('blizzard') || clean.includes('cold') || clean.includes('freeze') || clean.includes('snow')) return 'Ice';

    for (const el of CONFIG.ELEMENTS) {
      if (el.toLowerCase() === raw.trim().toLowerCase()) return el;
    }
    return 'Idle';
  }

  async init() {
    const modelURL    = this.modelURL + 'model.json';
    const metadataURL = this.modelURL + 'metadata.json';

    if (this.modelType === 'pose') {
      if (!window.tmPose) throw new Error('Teachable Machine Pose library not loaded.');
      this._model = await window.tmPose.load(modelURL, metadataURL);
      await this._openCamera();
    } else if (this.modelType === 'image') {
      if (!window.tmImage) throw new Error('Teachable Machine Image library not loaded.');
      this._model = await window.tmImage.load(modelURL, metadataURL);
      await this._openCamera();
    } else if (this.modelType === 'audio') {
      if (!window.speechCommands) throw new Error('SpeechCommands library not loaded.');
      this._recognizer = window.speechCommands.create(
        'BROWSER_FFT', undefined, modelURL, metadataURL
      );
      await this._recognizer.ensureModelLoaded();
      this._startAudioListening();
    } else {
      throw new Error('Unknown model type: ' + this.modelType);
    }

    // Extract & Validate Model Classes (Must have >= 3 Elements + 1 Mandatory Idle class)
    const rawLabels = await this._fetchModelLabels(metadataURL);
    this._validateAndExtractElements(rawLabels);
  }

  async _fetchModelLabels(metadataURL) {
    let rawLabels = [];
    if (this._model && typeof this._model.getClassLabels === 'function') {
      try { rawLabels = this._model.getClassLabels(); } catch(e) {}
    } else if (this._recognizer && typeof this._recognizer.wordLabels === 'function') {
      try { rawLabels = this._recognizer.wordLabels(); } catch(e) {}
    }

    if (!rawLabels || rawLabels.length === 0) {
      try {
        const resp = await fetch(metadataURL);
        if (resp.ok) {
          const meta = await resp.json();
          rawLabels = meta.labels || meta.wordLabels || [];
        }
      } catch (e) {
        console.warn("Could not fetch metadata.json directly:", e);
      }
    }
    return rawLabels || [];
  }

  _validateAndExtractElements(rawLabels) {
    if (!rawLabels || rawLabels.length === 0) {
      // If metadata couldn't be loaded, default to all elements
      this.availableElements = [...CONFIG.ELEMENTS];
      this.lockedElements = [];
      this.modelClasses = [...CONFIG.ELEMENTS, 'Idle'];
      return;
    }

    const elementsFound = new Set();
    let hasIdle = false;

    rawLabels.forEach(raw => {
      const norm = this._normalizeLabel(raw);
      if (norm === 'Idle') {
        hasIdle = true;
      } else if (CONFIG.ELEMENTS.includes(norm)) {
        elementsFound.add(norm);
      }
    });

    // 1. Mandatory Idle Class Check
    if (!hasIdle) {
      throw new Error(
        `โมเดลไม่มีคลาส "Idle" (พบเฉพาะ: ${rawLabels.join(', ') || 'ไม่มีคลาส'}) — จำเป็นต้องมีคลาสสำหรับสถานะพัก (เช่น 'Idle', 'Rest', 'Stand', 'None') อย่างน้อย 1 คลาส เพื่อให้ระบบตรวจจับจังหวะการหยุดร่ายเวทได้`
      );
    }

    // 2. Minimum 3 Elemental Classes Check
    const detectedList = Array.from(elementsFound);
    if (detectedList.length < 3) {
      throw new Error(
        `โมเดลมีคลาสธาตุเพียง ${detectedList.length} ธาตุ (${detectedList.join(', ') || 'ไม่พบธาตุที่รองรับ'} จากทั้งหมด: ${rawLabels.join(', ')}) — โมเดลต้องมีคลาสธาตุอย่างน้อย 3 ธาตุขึ้นไป + คลาส Idle 1 คลาส (รวมขั้นต่ำ 4 Classes)`
      );
    }

    this.availableElements = detectedList;
    this.lockedElements    = CONFIG.ELEMENTS.filter(el => !elementsFound.has(el));
    this.modelClasses      = rawLabels;
    console.log(`[AIDetector] Model Validated! Available Elements: [${this.availableElements.join(', ')}], Locked: [${this.lockedElements.join(', ')}]`);
  }

  async _openCamera() {
    if (!this._videoEl) this._videoEl = document.getElementById('webcamVideo');
    if (!this._poseCanvas) this._poseCanvas = document.getElementById('poseCanvas');

    if (!this._stream) {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
    }
    this._videoEl.srcObject = this._stream;

    await new Promise((resolve) => {
      if (this._videoEl.readyState >= 2) {
        resolve();
      } else {
        this._videoEl.onloadedmetadata = () => {
          this._videoEl.play().then(resolve).catch(resolve);
        };
      }
    });

    try { await this._videoEl.play(); } catch(e) {}

    if (this.modelType === 'pose' && this._poseCanvas) {
      this._poseCanvas.width  = this._videoEl.videoWidth || 640;
      this._poseCanvas.height = this._videoEl.videoHeight || 480;
    }
  }

  _startAudioListening() {
    const labels = this._recognizer.wordLabels();
    this._recognizer.listen(result => {
      if (this._disposed) return;
      let bestIdx = 0, bestConf = 0;
      const preds = [];
      result.scores.forEach((s, i) => {
        const norm = this._normalizeLabel(labels[i]);
        preds.push({ label: norm, rawLabel: labels[i], confidence: s });
        if (s > bestConf) {
          bestConf = s;
          bestIdx = i;
        }
      });
      const bestLabel = this._normalizeLabel(labels[bestIdx]);
      this._audioResult = {
        label: bestLabel,
        confidence: bestConf,
        rawLabel: labels[bestIdx],
        predictions: preds
      };
    }, {
      includeSpectrogram: false,
      probabilityThreshold: 0.25,
      invokeCallbackOnNoiseAndUnknown: true,
      overlapFactor: 0.5
    });
  }

  async predict() {
    if (this._disposed) return { label: 'Idle', confidence: 0, predictions: [] };

    if (this.modelType === 'audio') {
      return this._audioResult;
    }

    if (!this._videoEl || this._videoEl.readyState < 2) {
      return { label: 'Idle', confidence: 0, predictions: [] };
    }

    try {
      if (this.modelType === 'pose') {
        const { pose, posenetOutput } = await this._model.estimatePose(this._videoEl, false);
        const prediction = await this._model.predict(posenetOutput);

        // draw skeleton and keypoints on pose canvas
        if (this._poseCanvas) {
          const ctx = this._poseCanvas.getContext('2d');
          ctx.clearRect(0, 0, this._poseCanvas.width, this._poseCanvas.height);
          if (pose && window.tmPose) {
            const minPartConfidence = 0.5;
            if (typeof window.tmPose.drawKeypoints === 'function') {
              window.tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            }
            if (typeof window.tmPose.drawSkeleton === 'function') {
              window.tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
            }
          }
        }
        return this._formatPredictions(prediction);

      } else if (this.modelType === 'image') {
        const prediction = await this._model.predict(this._videoEl);
        return this._formatPredictions(prediction);
      }
    } catch(e) {
      console.warn("Prediction frame error:", e);
      return { label: 'Idle', confidence: 0, predictions: [] };
    }
    return { label: 'Idle', confidence: 0, predictions: [] };
  }

  _formatPredictions(preds) {
    if (!Array.isArray(preds) || preds.length === 0) {
      return { label: 'Idle', confidence: 0, predictions: [] };
    }

    let best = { className: 'Idle', rawLabel: 'Idle', probability: 0 };
    const formatted = [];

    preds.forEach(p => {
      const norm = this._normalizeLabel(p.className);
      const conf = p.probability || 0;
      formatted.push({ label: norm, rawLabel: p.className, confidence: conf });
      if (conf > best.probability) {
        best = { className: norm, rawLabel: p.className, probability: conf };
      }
    });

    return {
      label: best.className,
      confidence: best.probability,
      rawLabel: best.rawLabel,
      predictions: formatted
    };
  }

  cleanup() {
    this._disposed = true;
    if (this._recognizer) {
      try { this._recognizer.stopListening(); } catch(_) {}
      this._recognizer = null;
    }
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    if (this._model && this._model.dispose) {
      try { this._model.dispose(); } catch(_) {}
    }
    this._model = null;
    if (this._videoEl) this._videoEl.srcObject = null;
  }
}

/* ══════════════════════════════════════════
   4. ElementSystem
══════════════════════════════════════════ */
const ElementSystem = (() => {
  // weakness[attacker] = elements that take x2 damage
  // resistance[attacker] = elements that take x0.5 damage
  const WEAKNESS = {
    Fire:      ['Ice','Wind'],
    Water:     ['Fire','Earth'],
    Earth:     ['Lightning','Water'],
    Wind:      ['Earth','Ice'],
    Lightning: ['Water','Wind'],
    Ice:       ['Wind','Fire']
  };
  const RESISTANCE = {
    Fire:      ['Water','Earth'],
    Water:     ['Lightning','Ice'],
    Earth:     ['Fire','Wind'],
    Wind:      ['Lightning','Fire'],
    Lightning: ['Earth','Ice'],
    Ice:       ['Water','Lightning']
  };

  function getDamageMultiplier(attackerElement, defenderElement) {
    if (WEAKNESS[attackerElement]?.includes(defenderElement))   return 2.0;
    if (RESISTANCE[attackerElement]?.includes(defenderElement)) return 0.5;
    return 1.0;
  }

  function getEffectivenessText(mult) {
    if (mult >= 2)   return '⚡ Super Effective!';
    if (mult <= 0.5) return '🛡️ Not Very Effective';
    return '';
  }

  return { getDamageMultiplier, getEffectivenessText, WEAKNESS, RESISTANCE };
})();

/* ══════════════════════════════════════════
   5. Monster
══════════════════════════════════════════ */
class Monster {
  constructor({ element, tier, waveNum }) {
    this.element = element;
    this.tier    = tier;  // 'normal' | 'elite' | 'boss'
    this.id      = Math.random().toString(36).slice(2);

    const cfg = Monster.TIER_CONFIG[tier];
    const waveScale = 1 + (waveNum - 1) * 0.08;

    this.maxHp  = Math.round(cfg.hp   * waveScale * (0.9 + Math.random() * 0.2));
    this.hp     = this.maxHp;
    this.damage = Math.round(cfg.damage * waveScale);
    this.speed  = cfg.speed * (0.85 + Math.random() * 0.3);

    // Position: random x across canvas, start small (far) and grow
    this.x      = 0.2 + Math.random() * 0.6; // 0..1 normalized screen X
    this.scale  = 0.12 + Math.random() * 0.06; // start small = far away
    this.targetX = this.x + (Math.random() - 0.5) * 0.15;

    // Visual
    this.color  = CONFIG.ELEMENT_COLORS[element];
    this.glow   = CONFIG.ELEMENT_GLOW[element];
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
    normal: { hp:40,  damage:8,  speed:0.018, baseSize:80,  attackCooldown:2500 },
    elite:  { hp:100, damage:15, speed:0.010, baseSize:110, attackCooldown:2200 },
    boss:   { hp:300, damage:25, speed:0.005, baseSize:160, attackCooldown:1800 }
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

    // Move closer (scale up)
    this.scale += this.speed * dt;
    // Sway
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
    const tier = { normal:50, elite:150, boss:500 };
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

    // Death explosion + fade
    if (this.isDying) {
      ctx.globalAlpha = Math.pow(1 - this.deadTimer, 1.5);
      const ds = 1 + this.deadTimer * 0.6;
      ctx.translate(cx, cy);
      ctx.scale(ds, ds);
      ctx.translate(-cx, -cy);
    }

    const flashAlpha = this.hitFlash > 0 ? this.hitFlash * 0.85 : 0;

    // Glow aura under monster
    const glowR = size * 0.9;
    const aura = ctx.createRadialGradient(cx, cy + size * 0.3, size * 0.05, cx, cy + size * 0.1, glowR);
    aura.addColorStop(0, this.glow);
    aura.addColorStop(1, 'transparent');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.35, glowR * 0.9, glowR * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw creature
    this._drawCreature(ctx, cx, cy, size, flashAlpha, t);

    // HP Bar
    if (!this.isDying && this.scale > 0.18) {
      this._drawHPBar(ctx, cx, cy, size);
    }

    // Tier crown / star
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

    // A. Ambient Ground Contact Shadow (Ambient Occlusion)
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

    // B. Orbiting Volumetric Granite Shards with Stone Texture & Golden Runes
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

      // Volumetric Sphere-Stone Gradient
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

      // Specular Glare on Shard
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-rsz * 0.25, -rsz * 0.35, rsz * 0.3, rsz * 0.15, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Magma Fissure inside Shard
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

    // C. Volumetric Massive Stone Legs (Rounded Pillars)
    ctx.save();
    const legStomp = Math.sin(t * 1.2) * s * 0.02;

    // Left Leg (3D Cylindrical Gradient)
    const legLGrad = ctx.createRadialGradient(-s * 0.25, s * 0.55, s * 0.05, -s * 0.28, s * 0.65, s * 0.35);
    legLGrad.addColorStop(0, '#8c7c6a'); legLGrad.addColorStop(0.4, '#524434'); legLGrad.addColorStop(0.85, '#221a12'); legLGrad.addColorStop(1, '#0e0a06');
    ctx.fillStyle = legLGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 0.14, s * 0.30);
    ctx.bezierCurveTo(-s * 0.38, s * 0.45, -s * 0.44, s * 0.70 + legStomp, -s * 0.40, s * 0.82 + legStomp);
    ctx.bezierCurveTo(-s * 0.25, s * 0.86 + legStomp, -s * 0.10, s * 0.84 + legStomp, -s * 0.05, s * 0.40);
    ctx.closePath();
    ctx.fill();

    // Right Leg
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

    // D. Volumetric Sculpted Torso & Pectorals
    ctx.save();
    ctx.scale(scX, scY);

    // Deep Core Drop Shadow between Legs and Torso
    ctx.shadowColor = '#060402'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;

    // Torso Base Volume
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

    // Volumetric Pectoral Muscle Bulges (Left & Right Spherical Form)
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

    // Procedural Granite Mineral Flecks (Stippling Micro-Texture)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let k = 0; k < 18; k++) {
      const tx = ((k * 37) % 50 - 25) * 0.01 * s;
      const ty = ((k * 53) % 40 - 15) * 0.01 * s;
      ctx.beginPath(); ctx.arc(tx, ty, s * 0.012, 0, Math.PI * 2); ctx.fill();
    }

    // Glowing Molten Core Fissures radiating through carved grooves
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

    // Hot-white hairline core
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

    // E. Massive Spherical Boulder Shoulders (Deltoids)
    ctx.save();
    // Left Boulder Deltoid
    const shldL = ctx.createRadialGradient(-s * 0.50, -s * 0.25, s * 0.05, -s * 0.48, -s * 0.18, s * 0.32);
    shldL.addColorStop(0, '#c4b29c'); shldL.addColorStop(0.4, '#7a6854'); shldL.addColorStop(0.85, '#32261a'); shldL.addColorStop(1, '#120c08');
    ctx.fillStyle = shldL;
    ctx.beginPath();
    ctx.ellipse(-s * 0.48, -s * 0.18, s * 0.24, s * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Specular Highlight on Shoulder Dome
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.52, -s * 0.24, s * 0.12, s * 0.06, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Right Boulder Deltoid
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

    // F. Volumetric Forearms & Giant Knuckle Fists
    ctx.save();
    const armSwing = Math.sin(t * 1.3) * s * 0.035;

    // Left Arm & Fist
    const armL = ctx.createRadialGradient(-s * 0.52, s * 0.35, s * 0.05, -s * 0.48, s * 0.48, s * 0.3);
    armL.addColorStop(0, '#9c8c78'); armL.addColorStop(0.45, '#5c4e3c'); armL.addColorStop(0.85, '#281e14'); armL.addColorStop(1, '#100a06');
    ctx.fillStyle = armL;
    ctx.beginPath();
    ctx.ellipse(-s * 0.50, s * 0.22 + armSwing, s * 0.18, s * 0.26, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Left Giant Fist Orb
    const fistL = ctx.createRadialGradient(-s * 0.52, s * 0.52 + armSwing, s * 0.04, -s * 0.48, s * 0.58 + armSwing, s * 0.22);
    fistL.addColorStop(0, '#b8a690'); fistL.addColorStop(0.4, '#6e5c48'); fistL.addColorStop(0.85, '#281e14'); fistL.addColorStop(1, '#0e0804');
    ctx.fillStyle = fistL;
    ctx.beginPath();
    ctx.arc(-s * 0.48, s * 0.58 + armSwing, s * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Fist Knuckles with Specular Glares & Glowing Rune Rings
    for (let k = 0; k < 3; k++) {
      const kx = -s * 0.58 + k * s * 0.09;
      const ky = s * 0.60 + armSwing;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath(); ctx.arc(kx, ky, s * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255, 215, 60, ${0.8 + ep * 0.2})`;
      ctx.lineWidth = 2; ctx.stroke();
    }

    // Right Arm & Fist
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

    // G. Volumetric Chiseled Titan Cranium & Glowing Amber Crystal Eyes
    ctx.save();
    const headBob = Math.sin(t * 1.1) * 0.025;
    ctx.translate(0, -s * 0.40 + headBob);
    ctx.scale(scX, scY);

    // Cranium Sphere Volume
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

    // Brow Ridge Drop Shadow (Ambient Occlusion over eyes)
    ctx.fillStyle = 'rgba(10, 6, 2, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.02, s * 0.22, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Amber Crystal Eyes (Realistic Core + Specular Pinpoint)
    const eyeAlpha = 0.9 + ep * 0.1;
    ctx.save();
    // Left Eye Orb
    const eyeLGrad = ctx.createRadialGradient(-s * 0.12, -s * 0.03, 1, -s * 0.12, -s * 0.03, s * 0.07);
    eyeLGrad.addColorStop(0, '#ffffff'); eyeLGrad.addColorStop(0.3, '#ffcc00'); eyeLGrad.addColorStop(0.7, '#ff6600'); eyeLGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeLGrad;
    ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = s * 0.25;
    ctx.beginPath();
    ctx.ellipse(-s * 0.12, -s * 0.03, s * 0.065, s * 0.04, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Right Eye Orb
    const eyeRGrad = ctx.createRadialGradient(s * 0.12, -s * 0.03, 1, s * 0.12, -s * 0.03, s * 0.07);
    eyeRGrad.addColorStop(0, '#ffffff'); eyeRGrad.addColorStop(0.3, '#ffcc00'); eyeRGrad.addColorStop(0.7, '#ff6600'); eyeRGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeRGrad;
    ctx.beginPath();
    ctx.ellipse(s * 0.12, -s * 0.03, s * 0.065, s * 0.04, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Polished Specular Gleam across forehead
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.06, -s * 0.16, s * 0.14, s * 0.05, -0.15, 0, Math.PI * 2);
    ctx.fill();
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

    // A. Whipping Volumetric Demon Tail with Fiery Core
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

    // Spiked Tail Blade
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

    // B. Volumetric Demon Bat Wings with Translucent Fiery Membrane
    ctx.save();
    // Left Wing
    ctx.save();
    ctx.translate(-s * 0.14, -s * 0.20);
    ctx.rotate(-wingFlap);
    const wingLMem = ctx.createRadialGradient(-s * 0.5, -s * 0.4, s * 0.05, -s * 0.45, -s * 0.3, s * 0.65);
    wingLMem.addColorStop(0, '#ff9900');
    wingLMem.addColorStop(0.35, '#d02800');
    wingLMem.addColorStop(0.75, '#5c0600');
    wingLMem.addColorStop(1, '#180000');

    ctx.fillStyle = wingLMem;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s * 0.35, -s * 0.55, -s * 0.65, -s * 0.72, -s * 0.85, -s * 0.50);
    ctx.bezierCurveTo(-s * 0.75, -s * 0.20, -s * 0.60, s * 0.10, -s * 0.45, s * 0.22);
    ctx.bezierCurveTo(-s * 0.28, s * 0.10, -s * 0.15, s * 0.05, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Bone Struts with 3D Specular Highlight
    ctx.strokeStyle = '#220000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.60, -s * 0.68); ctx.lineTo(-s * 0.85, -s * 0.50); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.60, -s * 0.68); ctx.stroke();
    ctx.restore();

    // Right Wing
    ctx.save();
    ctx.translate(s * 0.14, -s * 0.20);
    ctx.rotate(wingFlap);
    const wingRMem = ctx.createRadialGradient(s * 0.5, -s * 0.4, s * 0.05, s * 0.45, -s * 0.3, s * 0.65);
    wingRMem.addColorStop(0, '#ff9900');
    wingRMem.addColorStop(0.35, '#d02800');
    wingRMem.addColorStop(0.75, '#5c0600');
    wingRMem.addColorStop(1, '#180000');

    ctx.fillStyle = wingRMem;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.35, -s * 0.55, s * 0.65, -s * 0.72, s * 0.85, -s * 0.50);
    ctx.bezierCurveTo(s * 0.75, -s * 0.20, s * 0.60, s * 0.10, s * 0.45, s * 0.22);
    ctx.bezierCurveTo(s * 0.28, s * 0.10, s * 0.15, s * 0.05, 0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#220000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.60, -s * 0.68); ctx.lineTo(s * 0.85, -s * 0.50); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.60, -s * 0.68); ctx.stroke();
    ctx.restore();
    ctx.restore();

    // C. Sculpted Muscular Demon Torso with Subsurface Lava Glow
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

    // Volumetric Pectorals & Abdominal Six-Pack Cuts
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    // Pec Crevice
    ctx.beginPath(); ctx.moveTo(0, -s * 0.28); ctx.lineTo(0, s * 0.05); ctx.stroke();
    // Abs Crevices
    [[-s * 0.08, s * 0.10], [s * 0.08, s * 0.10], [-s * 0.07, s * 0.22], [s * 0.07, s * 0.22]].forEach(([ax, ay]) => {
      ctx.fillStyle = 'rgba(255, 120, 30, 0.4)';
      ctx.beginPath(); ctx.ellipse(ax, ay, s * 0.065, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
    });

    // Pulsating Subterranean Lava Veins
    ctx.save();
    ctx.strokeStyle = `rgba(255, 230, 80, ${0.75 + ep * 0.25})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff5500'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.25); ctx.lineTo(0, -s * 0.02); ctx.lineTo(-s * 0.08, s * 0.16);
    ctx.moveTo(-s * 0.18, -s * 0.12); ctx.lineTo(-s * 0.02, -s * 0.06); ctx.lineTo(-s * 0.14, s * 0.06);
    ctx.moveTo(s * 0.18, -s * 0.12); ctx.lineTo(s * 0.02, -s * 0.06); ctx.lineTo(s * 0.14, s * 0.06);
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // D. Volumetric Clawed Arms
    ctx.save();
    const armWiggle = Math.sin(t * 2.8) * 0.12;
    const armGradL = ctx.createRadialGradient(-s * 0.40, s * 0.15, s * 0.05, -s * 0.35, s * 0.25, s * 0.30);
    armGradL.addColorStop(0, '#d42400'); armGradL.addColorStop(0.5, '#680800'); armGradL.addColorStop(1, '#180000');

    ctx.fillStyle = armGradL;
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, -s * 0.15);
    ctx.bezierCurveTo(-s * (0.50 + armWiggle), s * 0.08, -s * 0.44, s * 0.35, -s * 0.36, s * 0.42);
    ctx.bezierCurveTo(-s * 0.24, s * 0.35, -s * 0.20, s * 0.15, -s * 0.28, -s * 0.15);
    ctx.fill();

    // Sharp Curved Obsidian Claws with Wet Specular Highlights
    ctx.fillStyle = '#0e0202';
    for (let c = -1; c <= 1; c++) {
      const cx2 = -s * 0.36 + c * s * 0.06;
      const cy2 = s * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx2 - s * 0.02, cy2); ctx.lineTo(cx2 + s * 0.02, cy2); ctx.lineTo(cx2, cy2 + s * 0.12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(cx2 - 1, cy2 + 2, 2, s * 0.08);
      ctx.fillStyle = '#0e0202';
    }

    // Right Arm
    const armGradR = ctx.createRadialGradient(s * 0.40, s * 0.15, s * 0.05, s * 0.35, s * 0.25, s * 0.30);
    armGradR.addColorStop(0, '#d42400'); armGradR.addColorStop(0.5, '#680800'); armGradR.addColorStop(1, '#180000');
    ctx.fillStyle = armGradR;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, -s * 0.15);
    ctx.bezierCurveTo(s * (0.50 - armWiggle), s * 0.08, s * 0.44, s * 0.35, s * 0.36, s * 0.42);
    ctx.bezierCurveTo(s * 0.24, s * 0.35, s * 0.20, s * 0.15, s * 0.28, -s * 0.15);
    ctx.fill();

    for (let c = -1; c <= 1; c++) {
      const cx2 = s * 0.36 + c * s * 0.06;
      const cy2 = s * 0.42;
      ctx.fillStyle = '#0e0202';
      ctx.beginPath();
      ctx.moveTo(cx2 - s * 0.02, cy2); ctx.lineTo(cx2 + s * 0.02, cy2); ctx.lineTo(cx2, cy2 + s * 0.12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(cx2 - 1, cy2 + 2, 2, s * 0.08);
    }
    ctx.restore();

    // E. Volumetric Demon Cranium, Ribbed Obsidian Horns & Burning Eyes
    ctx.save();
    const headBob = Math.sin(t * 1.5) * 0.03;
    ctx.translate(0, -s * 0.46 + headBob);
    ctx.scale(scX, scY);

    // Curved 3D Obsidian Horns with Volumetric Shading
    // Left Horn
    const hornL = ctx.createLinearGradient(-s * 0.15, 0, -s * 0.35, -s * 0.85);
    hornL.addColorStop(0, '#1c0202'); hornL.addColorStop(0.5, '#440804'); hornL.addColorStop(0.85, '#ff4400'); hornL.addColorStop(1, '#ffbb00');
    ctx.fillStyle = hornL;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, -s * 0.10);
    ctx.bezierCurveTo(-s * 0.40, -s * 0.35, -s * 0.48, -s * 0.72, -s * 0.24, -s * 0.84);
    ctx.bezierCurveTo(-s * 0.30, -s * 0.55, -s * 0.18, -s * 0.32, -s * 0.02, -s * 0.18);
    ctx.closePath();
    ctx.fill();

    // Specular Highlight along horn ridge
    ctx.strokeStyle = 'rgba(255, 220, 180, 0.6)'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.10, -s * 0.15);
    ctx.bezierCurveTo(-s * 0.36, -s * 0.38, -s * 0.44, -s * 0.70, -s * 0.24, -s * 0.82);
    ctx.stroke();

    // Right Horn
    const hornR = ctx.createLinearGradient(s * 0.15, 0, s * 0.35, -s * 0.85);
    hornR.addColorStop(0, '#1c0202'); hornR.addColorStop(0.5, '#440804'); hornR.addColorStop(0.85, '#ff4400'); hornR.addColorStop(1, '#ffbb00');
    ctx.fillStyle = hornR;
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.10);
    ctx.bezierCurveTo(s * 0.40, -s * 0.35, s * 0.48, -s * 0.72, s * 0.24, -s * 0.84);
    ctx.bezierCurveTo(s * 0.30, -s * 0.55, s * 0.18, -s * 0.32, s * 0.02, -s * 0.18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 220, 180, 0.6)';
    ctx.beginPath();
    ctx.moveTo(s * 0.10, -s * 0.15);
    ctx.bezierCurveTo(s * 0.36, -s * 0.38, s * 0.44, -s * 0.70, s * 0.24, -s * 0.82);
    ctx.stroke();

    // Volumetric Demon Skull Dome
    const demonHead = ctx.createRadialGradient(-s * 0.05, -s * 0.08, s * 0.03, 0, 0, s * 0.26);
    demonHead.addColorStop(0, '#ff6600');
    demonHead.addColorStop(0.4, '#b41600');
    demonHead.addColorStop(0.8, '#440400');
    demonHead.addColorStop(1, '#160000');

    ctx.fillStyle = demonHead;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.22, s * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark Sunken Eye Sockets (Ambient Occlusion)
    ctx.fillStyle = '#100000';
    ctx.beginPath(); ctx.ellipse(-s * 0.10, -s * 0.03, s * 0.075, s * 0.045, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.10, -s * 0.03, s * 0.075, s * 0.045, 0.2, 0, Math.PI * 2); ctx.fill();

    // Glowing Burning Molten Slit Eyes with Specular Pinpoints
    ctx.save();
    ctx.fillStyle = `rgba(255, 240, 60, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#ff7700'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(-s * 0.10, -s * 0.03, s * 0.05, s * 0.028, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.10, -s * 0.03, s * 0.05, s * 0.028, 0.2, 0, Math.PI * 2); ctx.fill();

    // Black Cat-like Slit Pupils
    ctx.fillStyle = '#180000'; ctx.shadowBlur = 0;
    ctx.fillRect(-s * 0.105, -s * 0.045, s * 0.015, s * 0.04);
    ctx.fillRect(s * 0.09, -s * 0.045, s * 0.015, s * 0.04);

    // Wet Specular Pinpoint on Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-s * 0.115, -s * 0.04, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.08, -s * 0.04, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Fanged Grimace with Molten Lava Breath Glow
    ctx.fillStyle = '#ff3300'; ctx.shadowColor = '#ff1100'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-s * 0.10, s * 0.07); ctx.lineTo(s * 0.10, s * 0.07); ctx.lineTo(0, s * 0.14);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // Sharp White Fangs
    ctx.fillStyle = '#fffff0';
    [[-s * 0.07, s * 0.07], [-s * 0.02, s * 0.07], [s * 0.02, s * 0.07], [s * 0.07, s * 0.07]].forEach(([fx, fy]) => {
      ctx.beginPath(); ctx.moveTo(fx - s * 0.015, fy); ctx.lineTo(fx, fy + s * 0.045); ctx.lineTo(fx + s * 0.015, fy); ctx.fill();
    });
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  /* ══════════════════════════════════════════════════════════════
     3. ⚡ THUNDER GARGOYLE — Realistic 2.5D Volumetric Lightning Beast
  ══════════════════════════════════════════════════════════════ */
  _drawThunderGargoyle25D(ctx, s, t, breathe, ep, flash) {
    const sc = 1 + breathe * 0.6;
    const flap = Math.sin(t * 4.0) * 0.26;

    // A. Dynamic Real-time Branching Lightning Fractal Arcs
    ctx.save();
    ctx.strokeStyle = `rgba(230, 180, 255, ${0.8 + ep * 0.2})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#d060ff'; ctx.shadowBlur = 14;

    for (let i = 0; i < 4; i++) {
      const arcA = t * 3.0 + (i * Math.PI * 2) / 4;
      const ax = Math.cos(arcA) * s * 0.55;
      const ay = Math.sin(arcA) * s * 0.40 - s * 0.12;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + (Math.sin(t * 16 + i) * s * 0.2), ay + (Math.cos(t * 14 + i) * s * 0.15));
      ctx.lineTo(ax + (Math.cos(t * 20 + i) * s * 0.32), ay + (Math.sin(t * 18 + i) * s * 0.32));
      ctx.stroke();
    }
    ctx.restore();

    // B. Volumetric Layered Feathers on Wings (3D Cylindrical Feather Shafts)
    ctx.save();
    // Left Wing
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

    // Micro-Strokes for Feather Barbs (Realistic Texture)
    ctx.strokeStyle = `rgba(220, 160, 255, ${0.5 + ep * 0.3})`; ctx.lineWidth = 1.8;
    for (let f = 1; f <= 5; f++) {
      ctx.beginPath();
      ctx.moveTo(-f * s * 0.12, -f * s * 0.12);
      ctx.lineTo(-s * 0.55 - (5 - f) * s * 0.07, -s * 0.12 + f * s * 0.07);
      ctx.stroke();
    }
    ctx.restore();

    // Right Wing
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

    for (let f = 1; f <= 5; f++) {
      ctx.strokeStyle = `rgba(220, 160, 255, ${0.5 + ep * 0.3})`; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(f * s * 0.12, -f * s * 0.12);
      ctx.lineTo(s * 0.55 + (5 - f) * s * 0.07, -s * 0.12 + f * s * 0.07);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    // C. Volumetric Gargoyle Torso & Lightning Crest
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

    // Glowing Lightning Rune Carved into Chest (Intense Bloom)
    ctx.save();
    ctx.fillStyle = `rgba(255, 235, 255, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#d060ff'; ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.24); ctx.lineTo(s * 0.10, -s * 0.08); ctx.lineTo(0, 0.02); ctx.lineTo(s * 0.08, s * 0.20);
    ctx.lineTo(-s * 0.05, s * 0.06); ctx.lineTo(0, -s * 0.04); ctx.lineTo(-s * 0.10, -s * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();

    // D. Powerful Raptor Talons with Specular Highlights
    ctx.save();
    ctx.fillStyle = '#1c042c';
    [[-s * 0.15, s * 0.38], [s * 0.15, s * 0.38]].forEach(([tx, ty]) => {
      ctx.beginPath();
      ctx.moveTo(tx - s * 0.07, ty); ctx.lineTo(tx - s * 0.09, ty + s * 0.30); ctx.lineTo(tx + s * 0.09, ty + s * 0.30); ctx.lineTo(tx + s * 0.07, ty);
      ctx.closePath(); ctx.fill();
      for (let c = -1; c <= 1; c++) {
        ctx.strokeStyle = '#e0a0ff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx + c * s * 0.06, ty + s * 0.30); ctx.lineTo(tx + c * s * 0.08, ty + s * 0.40); ctx.stroke();
      }
    });
    ctx.restore();

    // E. Predatory Raptor Head, Swept Crest & Glowing Violet Eyes
    ctx.save();
    const headBob = Math.sin(t * 1.6) * 0.03;
    ctx.translate(0, -s * 0.45 + headBob);
    ctx.scale(sc, sc);

    // Swept Crest
    ctx.fillStyle = '#220436';
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, -s * 0.10); ctx.lineTo(-s * 0.40, -s * 0.50); ctx.lineTo(-s * 0.18, -s * 0.36); ctx.lineTo(-s * 0.35, -s * 0.70);
    ctx.lineTo(0, -s * 0.28);
    ctx.lineTo(s * 0.35, -s * 0.70); ctx.lineTo(s * 0.18, -s * 0.36); ctx.lineTo(s * 0.40, -s * 0.50); ctx.lineTo(s * 0.15, -s * 0.10);
    ctx.closePath(); ctx.fill();

    // Volumetric Raptor Head Skull
    const headGarg = ctx.createRadialGradient(-s * 0.06, -s * 0.06, s * 0.03, 0, 0, s * 0.24);
    headGarg.addColorStop(0, '#ca6cff'); headGarg.addColorStop(0.5, '#6814b0'); headGarg.addColorStop(1, '#180228');
    ctx.fillStyle = headGarg;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.22, s * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved Sharp Raptor Beak with Specular Reflection
    const beakGrad = ctx.createLinearGradient(-s * 0.09, 0, s * 0.09, s * 0.20);
    beakGrad.addColorStop(0, '#2e0a44'); beakGrad.addColorStop(0.5, '#0e0216'); beakGrad.addColorStop(1, '#d870ff');
    ctx.fillStyle = beakGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 0.09, 0); ctx.quadraticCurveTo(0, s * 0.24, 0, s * 0.22); ctx.lineTo(s * 0.09, 0);
    ctx.closePath(); ctx.fill();

    // Intense Violet Glowing Eye Orbs with Wet Highlight
    ctx.save();
    ctx.fillStyle = `rgba(255, 240, 255, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#d060ff'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(-s * 0.10, -s * 0.04, s * 0.06, s * 0.038, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.10, -s * 0.04, s * 0.06, s * 0.038, 0.2, 0, Math.PI * 2); ctx.fill();
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

    // A. Multi-layered Flowing Translucent Spirit Veil with Caustics
    ctx.save();
    for (let layer = 0; layer < 3; layer++) {
      const lOffset = Math.sin(t * 2.5 + layer * 1.3) * s * 0.09;
      const veilG = ctx.createLinearGradient(0, -s * 0.25, 0, s * 0.88);
      veilG.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
      veilG.addColorStop(0.5, 'rgba(0, 130, 210, 0.28)');
      veilG.addColorStop(1, 'rgba(0, 30, 80, 0)');

      ctx.fillStyle = veilG; ctx.strokeStyle = `rgba(120, 245, 255, ${0.45 - layer * 0.1})`; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.1);
      ctx.bezierCurveTo(-s * 0.48, s * 0.22, -s * 0.38 + lOffset, s * 0.58, -s * 0.22 + lOffset, s * 0.88);
      ctx.bezierCurveTo(0, s * 0.70, s * 0.22 - lOffset, s * 0.88, s * 0.38 - lOffset, s * 0.58);
      ctx.bezierCurveTo(s * 0.48, s * 0.22, s * 0.28, -s * 0.1, 0, -s * 0.28);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    // B. Volumetric Soul Core & Liquid Ghost Body
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
    ctx.restore();

    // C. Reaching Ethereal Arms Conjuring Revolving Liquid Spheres
    ctx.save();
    const armWave = Math.sin(t * 2.2) * s * 0.06;
    ctx.strokeStyle = 'rgba(120, 240, 255, 0.7)'; ctx.lineWidth = s * 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.20, -s * 0.15); ctx.quadraticCurveTo(-s * 0.48, s * 0.06 + armWave, -s * 0.38, s * 0.30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.20, -s * 0.15); ctx.quadraticCurveTo(s * 0.48, s * 0.06 - armWave, s * 0.38, s * 0.30); ctx.stroke();

    // Rotating Liquid Orbs with Specular Glints & Orbiting Droplets
    [[-s * 0.38, s * 0.30], [s * 0.38, s * 0.30]].forEach(([ox, oy], i) => {
      const orbG = ctx.createRadialGradient(ox - s * 0.03, oy - s * 0.03, s * 0.01, ox, oy, s * 0.12);
      orbG.addColorStop(0, '#ffffff'); orbG.addColorStop(0.3, '#70f0ff'); orbG.addColorStop(0.7, '#0090d8'); orbG.addColorStop(1, '#002040');
      ctx.fillStyle = orbG;
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ox, oy, s * 0.09, 0, Math.PI * 2); ctx.fill();

      // Specular Glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ox - s * 0.03, oy - s * 0.03, s * 0.025, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // D. Shadowed Cowl Hood with Spherical Void Face & Luminous Eyes
    ctx.save();
    const headSway = Math.sin(t * 1.8) * 0.04;
    ctx.translate(0, -s * 0.45); ctx.rotate(headSway); ctx.scale(sc, sc);

    // Deep Spherical Void
    ctx.fillStyle = '#020b14'; ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.20, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Floating Luminous White-Cyan Ghost Eyes with Smoke Aura
    ctx.save();
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

    // A. Volumetric Cyclone Tornado Vortex Base (3D Depth Rings)
    ctx.save();
    ctx.globalAlpha = 0.7;
    for (let c = 0; c < 5; c++) {
      const cAngle = t * 4.5 + (c * Math.PI) / 2.5;
      const cy2 = s * 0.32 + c * s * 0.11;
      const cr = s * (0.38 - c * 0.06);
      ctx.strokeStyle = `rgba(120, 255, 190, ${0.8 - c * 0.12})`;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.ellipse(0, cy2, cr, cr * 0.32, cAngle, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.restore();

    // B. Volumetric Scythe Blade Wings with Metallic Directional Sheen
    ctx.save();
    // Left Wing
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

    // Specular Highlight along Scythe Blade Edge
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.bezierCurveTo(-s * 0.40, -s * 0.60, -s * 0.70, -s * 0.75, -s * 0.95, -s * 0.38); ctx.stroke();
    ctx.restore();

    // Right Wing
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

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.bezierCurveTo(s * 0.40, -s * 0.60, s * 0.70, -s * 0.75, s * 0.95, -s * 0.38); ctx.stroke();
    ctx.restore();
    ctx.restore();

    // C. Volumetric Jade Armored Cuirass
    ctx.save();
    ctx.scale(sc, sc);
    const bodyG = ctx.createRadialGradient(-s * 0.06, -s * 0.10, s * 0.04, 0, s * 0.05, s * 0.45);
    bodyG.addColorStop(0, '#e0ffe8'); bodyG.addColorStop(0.4, '#40c874'); bodyG.addColorStop(0.85, '#105428'); bodyG.addColorStop(1, '#062410');

    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.40); ctx.lineTo(s * 0.24, -s * 0.26); ctx.lineTo(s * 0.16, s * 0.42);
    ctx.lineTo(-s * 0.16, s * 0.42); ctx.lineTo(-s * 0.24, -s * 0.26);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // D. Masked Avian Visage with Narrow Glowing Jade Visor
    ctx.save();
    const headBob = Math.sin(t * 1.6) * 0.03;
    ctx.translate(0, -s * 0.45 + headBob);
    ctx.scale(sc, sc);

    const maskG = ctx.createRadialGradient(-s * 0.05, -s * 0.06, s * 0.03, 0, 0, s * 0.22);
    maskG.addColorStop(0, '#f0fff4'); maskG.addColorStop(0.6, '#58d884'); maskG.addColorStop(1, '#0e3e1c');
    ctx.fillStyle = maskG;
    ctx.beginPath();
    ctx.moveTo(-s * 0.20, -s * 0.16); ctx.lineTo(s * 0.20, -s * 0.16); ctx.lineTo(s * 0.22, 0.04); ctx.lineTo(0, s * 0.24); ctx.lineTo(-s * 0.22, 0.04);
    ctx.closePath(); ctx.fill();

    // Narrow Glowing Jade Visor Slit
    ctx.save();
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

    // A. Ambient Flurry of Orbiting Ice Crystals
    ctx.save();
    for (let p = 0; p < 6; p++) {
      const pAngle = t * 0.65 + (p * Math.PI * 2) / 6;
      const px = Math.cos(pAngle) * s * 0.60;
      const py = Math.sin(pAngle) * s * 0.38 - s * 0.10;
      ctx.fillStyle = `rgba(220, 248, 255, ${0.6 + ep * 0.4})`;
      ctx.shadowColor = '#80e0ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(px, py, s * 0.035, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // B. Volumetric Ice Spire Pauldrons with 3D Crystalline Refraction
    ctx.save();
    const iceL = ctx.createLinearGradient(-s * 0.6, -s * 0.7, -s * 0.2, s * 0.1);
    iceL.addColorStop(0, '#ffffff'); iceL.addColorStop(0.4, '#a0ebff'); iceL.addColorStop(0.85, '#206090'); iceL.addColorStop(1, '#0c2844');
    ctx.fillStyle = iceL;
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, -s * 0.28); ctx.lineTo(-s * 0.58, -s * 0.70); ctx.lineTo(-s * 0.68, -s * 0.22); ctx.lineTo(-s * 0.48, s * 0.12);
    ctx.closePath(); ctx.fill();

    // Specular Edge Gleam
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.28, -s * 0.28); ctx.lineTo(-s * 0.58, -s * 0.70); ctx.stroke();

    const iceR = ctx.createLinearGradient(s * 0.6, -s * 0.7, s * 0.2, s * 0.1);
    iceR.addColorStop(0, '#ffffff'); iceR.addColorStop(0.4, '#a0ebff'); iceR.addColorStop(0.85, '#206090'); iceR.addColorStop(1, '#0c2844');
    ctx.fillStyle = iceR;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, -s * 0.28); ctx.lineTo(s * 0.58, -s * 0.70); ctx.lineTo(s * 0.68, -s * 0.22); ctx.lineTo(s * 0.48, s * 0.12);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s * 0.28, -s * 0.28); ctx.lineTo(s * 0.58, -s * 0.70); ctx.stroke();
    ctx.restore();

    // C. Volumetric Permafrost Torso & Glowing Frost Core
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

    // Frost Sigil Rune (Glowing Blue Diamond)
    ctx.strokeStyle = `rgba(180, 240, 255, ${0.85 + ep * 0.15})`;
    ctx.lineWidth = 2.5; ctx.shadowColor = '#60d0ff'; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.18); ctx.lineTo(-s * 0.09, 0); ctx.lineTo(0, s * 0.18); ctx.lineTo(s * 0.09, 0);
    ctx.closePath(); ctx.stroke();
    ctx.restore();

    // D. Heavy Glacial Club Fists
    ctx.save();
    const armSwing = Math.sin(t * 1.1) * s * 0.035;
    const fistG = ctx.createRadialGradient(-s * 0.46, s * 0.48 + armSwing, s * 0.04, -s * 0.46, s * 0.52 + armSwing, s * 0.2);
    fistG.addColorStop(0, '#f0faff'); fistG.addColorStop(0.5, '#68b8e0'); fistG.addColorStop(1, '#184870');
    ctx.fillStyle = fistG;
    ctx.beginPath(); ctx.ellipse(-s * 0.46, s * 0.52 + armSwing, s * 0.16, s * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();

    const fistR = ctx.createRadialGradient(s * 0.46, s * 0.48 - armSwing, s * 0.04, s * 0.46, s * 0.52 - armSwing, s * 0.2);
    fistR.addColorStop(0, '#f0faff'); fistR.addColorStop(0.5, '#68b8e0'); fistR.addColorStop(1, '#184870');
    ctx.fillStyle = fistR;
    ctx.beginPath(); ctx.ellipse(s * 0.46, s * 0.52 - armSwing, s * 0.16, s * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // E. Massive Multifaceted Glacial Horns, Icicle Beard & Blizzard Eyes
    ctx.save();
    const headBob = Math.sin(t * 1.0) * 0.025;
    ctx.translate(0, -s * 0.42 + headBob);
    ctx.scale(sc, sc);

    // Left Horn
    const hornGL = ctx.createLinearGradient(-s * 0.20, 0, -s * 0.45, -s * 0.75);
    hornGL.addColorStop(0, '#ffffff'); hornGL.addColorStop(0.4, '#a0ebff'); hornGL.addColorStop(1, '#206090');
    // Left Horn
    ctx.beginPath();
    ctx.moveTo(-s * 0.20, -s * 0.12); ctx.lineTo(-s * 0.45, -s * 0.72); ctx.lineTo(-s * 0.10, -s * 0.32);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Right Horn
    ctx.beginPath();
    ctx.moveTo(s * 0.20, -s * 0.12); ctx.lineTo(s * 0.45, -s * 0.72); ctx.lineTo(s * 0.10, -s * 0.32);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Chiseled Glacial Face
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

    // Icicle Beard Spikes
    ctx.fillStyle = '#e8f8ff';
    for (let b = -2; b <= 2; b++) {
      ctx.beginPath();
      ctx.moveTo(b * s * 0.06 - s * 0.02, s * 0.24);
      ctx.lineTo(b * s * 0.06, s * 0.36 + Math.abs(b) * -s * 0.03);
      ctx.lineTo(b * s * 0.06 + s * 0.02, s * 0.24);
      ctx.fill();
    }

    // Glowing Arctic Blizzard Eyes
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 + ep * 0.05})`;
    ctx.shadowColor = '#80d8ff'; ctx.shadowBlur = s * 0.28;
    ctx.beginPath(); ctx.ellipse(-s * 0.11, -s * 0.03, s * 0.065, s * 0.042, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.11, -s * 0.03, s * 0.065, s * 0.042, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();

    this._applyHitFlash(ctx, s, flash);
  }

  /* ── Hit Flash helper ───────────────── */
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

    // Outer Dark Plaque
    ctx.save();
    ctx.fillStyle = 'rgba(5, 12, 22, 0.85)';
    ctx.strokeStyle = 'rgba(200, 146, 42, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx - 3, by - 3, bw + 6, bh + 6, 4); ctx.fill(); ctx.stroke();

    // Inner Track
    ctx.fillStyle = '#101a28';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 2); ctx.fill();

    // Animated Glowing Health Fill
    const barColor = pct > 0.5 ? '#22e060' : pct > 0.25 ? '#ffaa20' : '#ff3030';
    const hpGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
    hpGrad.addColorStop(0, barColor);
    hpGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.roundRect(bx, by, bw * pct, bh, 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Monster Title & Element Badge
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


/* ══════════════════════════════════════════
   6. SpellEffect
══════════════════════════════════════════ */
class SpellEffect {
  constructor({ element, targetX, targetY }) {
    this.element  = element;
    this.tx = targetX;
    this.ty = targetY;
    this.age      = 0;
    this.lifetime = 0.7;
    this.done     = false;
    this.particles = this._buildParticles();
  }

  _buildParticles() {
    const count = ({ Fire:24, Water:20, Earth:18, Wind:22, Lightning:16, Ice:20 })[this.element] || 18;
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 180;
      return {
        x: this.tx, y: this.ty,
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
    if (this.age >= this.lifetime) { this.done = true; return; }
    const t = this.age / this.lifetime;
    this.particles.forEach(p => {
      p.x   += p.vx * dt;
      p.y   += p.vy * dt;
      p.vy  += 200 * dt; // gravity
      p.vx  *= (1 - dt * 2);
      p.alpha = 1 - t;
      p.rot  += p.rotSpeed * dt;
    });
  }

  draw(ctx) {
    if (this.done) return;
    const el = this.element;
    const color = CONFIG.ELEMENT_COLORS[el];

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
        // Spark line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-p.size / 2, 0); ctx.lineTo(p.size / 2, 0);
        ctx.stroke();
      } else if (el === 'Ice') {
        // Snowflake crosshair
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        for (let a = 0; a < 3; a++) {
          ctx.save(); ctx.rotate(a * Math.PI / 3);
          ctx.beginPath(); ctx.moveTo(0, -p.size/2); ctx.lineTo(0, p.size/2);
          ctx.stroke(); ctx.restore();
        }
      } else {
        // Generic circle/square
        ctx.fillStyle = color;
        ctx.shadowColor = color; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
  }
}

/* ══════════════════════════════════════════
   7. GameState
══════════════════════════════════════════ */
class GameState {
  constructor() {
    this.availableElements = [...CONFIG.ELEMENTS];
    this.lockedElements    = [];
    this.reset();
  }

  reset() {
    this.screen       = 'setup';   // setup | playing | paused | gameOver | victory | stageClear
    this.mode         = 'wave';    // wave | endless | story
    this.wave         = 1;
    this.stage        = 0;        // story mode stage index (0-6)
    this.score        = 0;
    this.totalKills   = 0;
    this.player = {
      hp:     CONFIG.PLAYER_MAX_HP,
      maxHp:  CONFIG.PLAYER_MAX_HP,
      mana:   CONFIG.PLAYER_MAX_MANA,
      maxMana:CONFIG.PLAYER_MAX_MANA
    };
    this.monsters     = [];
    this.effects      = [];
    this.bgParticles  = this._buildBgParticles();
    this.lastSpellTime= 0;
    this.lastTime     = 0;
    this.currentLabel = 'Idle';
    this.currentConf  = 0;
    this.flashMsg     = null;     // { text, color, expires }
    this.monstersDefeatedInWave = 0;
    this.monstersRequiredInWave = 0;
    this.waveComplete = false;
    this.paused       = false;
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

  addScore(pts) { this.score += pts; }

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
    this.flashMsg = { text, color, expires: performance.now() + duration * 1000 };
  }
}

/* ══════════════════════════════════════════
   8. WaveManager
══════════════════════════════════════════ */
class WaveManager {
  constructor(state) {
    this.state = state;
  }

  // Compute how many and which monsters to spawn this wave
  getWaveConfig(waveNum, mode, stageIdx) {
    const base = mode === 'story' ? this._storyConfig(stageIdx) : this._genericConfig(waveNum, mode);
    return base;
  }

  _storyConfig(stageIdx) {
    const sd = CONFIG.STORY_STAGES_DATA[stageIdx];
    const waveBonus = this.state.wave;

    if (stageIdx === 6) {
      // Final boss stage — mixed elements + one huge boss
      return {
        spawns: [
          ...CONFIG.ELEMENTS.map(el => ({ element: el, tier: 'normal', count: 2 })),
          { element: CONFIG.ELEMENTS[Math.floor(Math.random() * 6)], tier: 'boss', count: 1 }
        ],
        total: CONFIG.ELEMENTS.length * 2 + 1
      };
    }

    const el = sd.element;
    return {
      spawns: [
        { element: el, tier: 'normal', count: 3 + waveBonus },
        { element: el, tier: 'elite',  count: Math.floor(waveBonus / 2) },
        ...(waveBonus >= 3 ? [{ element: el, tier: 'boss', count: 1 }] : [])
      ],
      total: 4 + waveBonus + (waveBonus >= 3 ? 1 : 0)
    };
  }

  _genericConfig(waveNum, mode) {
    const difficulty = mode === 'endless'
      ? waveNum
      : Math.min(waveNum, CONFIG.MAX_WAVES);

    const normalCount = 3 + Math.floor(difficulty * 1.2);
    const eliteCount  = Math.floor(difficulty / 3);
    const bossCount   = difficulty >= 5 ? Math.floor(difficulty / 8) : 0;

    // Pick elements: 75% chance to pick from player's available elements
    const pickEl = () => {
      const avail = (this.state.availableElements && this.state.availableElements.length >= 3)
        ? this.state.availableElements
        : CONFIG.ELEMENTS;
      if (Math.random() < 0.75) {
        return avail[Math.floor(Math.random() * avail.length)];
      }
      return CONFIG.ELEMENTS[Math.floor(Math.random() * CONFIG.ELEMENTS.length)];
    };

    const spawns = [
      ...Array.from({ length: normalCount }, () => ({ element: pickEl(), tier: 'normal', count: 1 })),
      ...Array.from({ length: eliteCount },  () => ({ element: pickEl(), tier: 'elite',  count: 1 })),
      ...Array.from({ length: bossCount },   () => ({ element: pickEl(), tier: 'boss',   count: 1 }))
    ];

    return { spawns, total: normalCount + eliteCount + bossCount };
  }

  buildMonsterQueue(waveConfig) {
    const queue = [];
    waveConfig.spawns.forEach(s => {
      const cnt = s.count || 1;
      for (let i = 0; i < cnt; i++) {
        queue.push({ element: s.element, tier: s.tier });
      }
    });
    // Shuffle
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    return queue;
  }
}

/* ══════════════════════════════════════════
   9. Renderer
══════════════════════════════════════════ */
class Renderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = state;
    this._starField = this._buildStarField();
  }

  _buildStarField() {
    return Array.from({ length: 120 }, () => ({
      x: Math.random() * CONFIG.CANVAS_W,
      y: Math.random() * CONFIG.CANVAS_H * 0.7,
      r: 0.3 + Math.random() * 1.2,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2
    }));
  }

  render(nowMs, stageIdx) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

    this._drawBackground(nowMs, stageIdx);
    this._drawGround();
    this._drawMonsters(nowMs);
    this._drawEffects();
    this._drawCrosshair();
    this._drawFlashMsg(nowMs);
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
      { // 0: Fire - Volcanic Molten Sanctum
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
      { // 1: Water - Abyssal Cathedral
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
      { // 2: Earth - Ancient Titan Ruin
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
      { // 3: Wind - Sky Citadel
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
      { // 4: Lightning - Storm Spire Cathedral
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
      { // 5: Ice - Glacial Sanctum
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
      { // 6: Chaos / Astral Void Rift (Final Boss)
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
      // 1. Draw High-Res Cinematic Background Image
      ctx.drawImage(bgImg, 0, 0, cw, ch);

      // 2. Element Stage Ambient Tint Overlay
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = theme.wallBg[0];
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();

      // 3. Floating Ambient Mana Motes / Embers
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

    // 1. Back Wall Gradient (Fallback)
    const wallG = ctx.createLinearGradient(0, 0, 0, ch * 0.65);
    wallG.addColorStop(0, theme.wallBg[0]);
    wallG.addColorStop(1, theme.wallBg[1]);
    ctx.fillStyle = wallG;
    ctx.fillRect(0, 0, cw, ch);

    // Subtle stone masonry brick grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let y = 0; y < ch * 0.6; y += 36) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }
    for (let x = 0; x < cw; x += 72) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch * 0.6); ctx.stroke();
    }
    ctx.restore();

    // 2. Grand Gothic Pointed Arched Stained Glass Windows
    // Left, Center Massive Portal, Right
    const windows = [
      { cx: cw * 0.20, w: 160, h: 320, y: ch * 0.10 },
      { cx: cw * 0.50, w: 260, h: 380, y: ch * 0.05 },
      { cx: cw * 0.80, w: 160, h: 320, y: ch * 0.10 }
    ];

    windows.forEach((win, idx) => {
      ctx.save();
      const topY = win.y;
      const botY = win.y + win.h;
      const halfW = win.w / 2;

      // Stained Glass Fill Path (Gothic Pointed Arch)
      ctx.beginPath();
      ctx.moveTo(win.cx - halfW, botY);
      ctx.lineTo(win.cx - halfW, topY + halfW);
      ctx.bezierCurveTo(win.cx - halfW, topY, win.cx, topY - 20, win.cx, topY - 30);
      ctx.bezierCurveTo(win.cx, topY - 20, win.cx + halfW, topY, win.cx + halfW, topY + halfW);
      ctx.lineTo(win.cx + halfW, botY);
      ctx.closePath();

      // Window Glass Inner Glow Gradient
      const glassG = ctx.createRadialGradient(win.cx, topY + win.h * 0.3, 10, win.cx, topY + win.h * 0.5, halfW * 1.4);
      glassG.addColorStop(0, theme.windowGlass[0]);
      glassG.addColorStop(0.45, theme.windowGlass[1]);
      glassG.addColorStop(1, theme.windowGlass[2]);

      ctx.fillStyle = glassG;
      ctx.shadowColor = theme.windowGlow;
      ctx.shadowBlur = 30;
      ctx.fill();

      // Stone Tracery & Mullions (Gothic Window Bars)
      ctx.strokeStyle = '#0a1018';
      ctx.lineWidth = idx === 1 ? 4 : 3;
      ctx.stroke();

      // Vertical mullions
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(win.cx - halfW * 0.5, botY); ctx.lineTo(win.cx - halfW * 0.5, topY + halfW * 0.7);
      ctx.moveTo(win.cx, botY); ctx.lineTo(win.cx, topY - 25);
      ctx.moveTo(win.cx + halfW * 0.5, botY); ctx.lineTo(win.cx + halfW * 0.5, topY + halfW * 0.7);
      ctx.stroke();

      // Horizontal transoms & rosettes
      for (let ty = topY + halfW * 0.8; ty < botY; ty += 45) {
        ctx.beginPath();
        ctx.moveTo(win.cx - halfW, ty); ctx.lineTo(win.cx + halfW, ty);
        ctx.stroke();
      }

      // Rosette / Trefoil circle in upper arch
      ctx.beginPath();
      ctx.arc(win.cx, topY + halfW * 0.5, halfW * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Volumetric God Rays streaming down from each window
      ctx.save();
      const rayG = ctx.createLinearGradient(win.cx, topY, win.cx + (idx === 0 ? -80 : idx === 2 ? 80 : 0), ch * 0.85);
      rayG.addColorStop(0, theme.rayColor);
      rayG.addColorStop(0.8, theme.rayColor.replace(/[\d\.]+\)$/, '0.03)'));
      rayG.addColorStop(1, 'transparent');

      ctx.fillStyle = rayG;
      ctx.beginPath();
      ctx.moveTo(win.cx - halfW * 0.6, topY + halfW);
      ctx.lineTo(win.cx + halfW * 0.6, topY + halfW);
      ctx.lineTo(win.cx + halfW * 2.2 + (idx === 0 ? -120 : idx === 2 ? 120 : 0), ch * 0.85);
      ctx.lineTo(win.cx - halfW * 2.2 + (idx === 0 ? -120 : idx === 2 ? 120 : 0), ch * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // 4. Floating Mana Crystals beside pillars
    const crystalPositions = [
      { x: cw * 0.08, y: ch * 0.28, sz: 24, phase: 0 },
      { x: cw * 0.28, y: ch * 0.22, sz: 18, phase: 1.5 },
      { x: cw * 0.72, y: ch * 0.22, sz: 18, phase: 3.0 },
      { x: cw * 0.92, y: ch * 0.28, sz: 24, phase: 4.5 }
    ];

    crystalPositions.forEach(c => {
      const cy2 = c.y + Math.sin(t * 1.8 + c.phase) * 12;
      const rot = Math.sin(t * 0.9 + c.phase) * 0.15;
      const sz = c.sz;

      ctx.save();
      ctx.translate(c.x, cy2);
      ctx.rotate(rot);

      // Crystal Glow Bloom
      ctx.shadowColor = theme.crystalColor;
      ctx.shadowBlur = 18;

      // Faceted Polygon Crystal
      const cGradL = ctx.createLinearGradient(-sz * 0.5, -sz, 0, sz);
      cGradL.addColorStop(0, theme.crystalHighlight);
      cGradL.addColorStop(0.5, theme.crystalColor);
      cGradL.addColorStop(1, '#051020');

      ctx.fillStyle = cGradL;
      ctx.beginPath();
      ctx.moveTo(0, -sz * 1.1);
      ctx.lineTo(-sz * 0.5, 0);
      ctx.lineTo(0, sz * 1.1);
      ctx.lineTo(0, 0);
      ctx.closePath(); ctx.fill();

      const cGradR = ctx.createLinearGradient(0, -sz, sz * 0.5, sz);
      cGradR.addColorStop(0, theme.crystalHighlight);
      cGradR.addColorStop(0.35, theme.crystalColor);
      cGradR.addColorStop(1, '#020810');

      ctx.fillStyle = cGradR;
      ctx.beginPath();
      ctx.moveTo(0, -sz * 1.1);
      ctx.lineTo(sz * 0.5, 0);
      ctx.lineTo(0, sz * 1.1);
      ctx.lineTo(0, 0);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle = theme.crystalHighlight;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    });

    // 5. Grand Stone Columns (Pillars) on left and right sides
    const pillars = [
      { x: cw * 0.04, w: 68 },
      { x: cw * 0.33, w: 48 },
      { x: cw * 0.67, w: 48 },
      { x: cw * 0.96, w: 68 }
    ];

    pillars.forEach(p => {
      ctx.save();
      const pGrad = ctx.createLinearGradient(p.x - p.w / 2, 0, p.x + p.w / 2, 0);
      pGrad.addColorStop(0, theme.pillarColor[1]);
      pGrad.addColorStop(0.35, theme.pillarColor[0]);
      pGrad.addColorStop(0.7, theme.pillarColor[1]);
      pGrad.addColorStop(1, '#050a10');

      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#050a10';
      ctx.lineWidth = 2;

      ctx.fillRect(p.x - p.w / 2, 0, p.w, ch * 0.65);
      ctx.strokeRect(p.x - p.w / 2, 0, p.w, ch * 0.65);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.5;
      for (let fx = -p.w * 0.35; fx <= p.w * 0.35; fx += p.w * 0.22) {
        ctx.beginPath(); ctx.moveTo(p.x + fx, 0); ctx.lineTo(p.x + fx, ch * 0.65); ctx.stroke();
      }

      ctx.fillStyle = theme.pillarColor[0];
      ctx.beginPath();
      ctx.moveTo(p.x - p.w * 0.75, 0);
      ctx.lineTo(p.x + p.w * 0.75, 0);
      ctx.lineTo(p.x + p.w * 0.5, 45);
      ctx.lineTo(p.x - p.w * 0.5, 45);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    // 6. Floating Ambient Mana Motes / Embers
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
      // Floor Base (Deep dark stone flagstones)
      const floorG = ctx.createLinearGradient(0, groundY, 0, ch);
      floorG.addColorStop(0, '#101a28');
      floorG.addColorStop(0.35, '#0a101c');
      floorG.addColorStop(1, '#03060c');

      ctx.fillStyle = floorG;
      ctx.fillRect(0, groundY, cw, ch - groundY);

      // Stone Floor Radial Flagstones in Perspective
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const vp = { x: cw / 2, y: groundY };

      for (let i = 0; i <= 16; i++) {
        const bx = (cw / 16) * i;
        ctx.beginPath();
        ctx.moveTo(vp.x, vp.y);
        ctx.lineTo(bx, ch);
        ctx.stroke();
      }

      for (let row = 1; row <= 8; row++) {
        const rPct = row / 8;
        const ry = groundY + (ch - groundY) * (rPct * rPct);
        const rx = (cw / 2);
        const rw = cw * (0.15 + 0.85 * rPct);
        ctx.beginPath();
        ctx.ellipse(rx, ry, rw / 2, (ch - groundY) * 0.45 * rPct, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ═════════════════════════════════════════════
    // EPIC GLOWING ARCANE MAGIC SUMMONING CIRCLE
    // ═════════════════════════════════════════════
    const circleCenterX = cw / 2;
    const circleCenterY = ch * 0.76;
    const rotSpeed = t * 0.35;

    ctx.save();
    ctx.translate(circleCenterX, circleCenterY);

    // Floor Light Bloom under circle
    const floorGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 480);
    floorGlow.addColorStop(0, theme.runeGlow.replace(/[\d\.]+\)$/, '0.28)'));
    floorGlow.addColorStop(0.6, theme.runeGlow.replace(/[\d\.]+\)$/, '0.08)'));
    floorGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = floorGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 480, 190, 0, 0, Math.PI * 2);
    ctx.fill();

    // Squashed Perspective transformation for concentric summoning circle
    const radX = 390;
    const radY = 145;

    // 1. Outer Concentric Runic Rings
    ctx.strokeStyle = theme.runeColor;
    ctx.shadowColor = theme.runeColor;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;

    ctx.beginPath(); ctx.ellipse(0, 0, radX, radY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, radX * 0.94, radY * 0.94, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, radX * 0.85, radY * 0.85, 0, 0, Math.PI * 2); ctx.stroke();

    // 2. Rotating Arcane Glyph Nodes along outer ring
    const nodeCount = 12;
    for (let n = 0; n < nodeCount; n++) {
      const nAngle = (n * Math.PI * 2) / nodeCount + rotSpeed;
      const nx = Math.cos(nAngle) * radX * 0.895;
      const ny = Math.sin(nAngle) * radY * 0.895;

      ctx.fillStyle = theme.circleSecondary;
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Concentric small rune star at primary 4 nodes
      if (n % 3 === 0) {
        ctx.strokeStyle = theme.circleSecondary;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(nx, ny, 12, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 3. Sacred Interlocking Geometric Star Lines (Hexagram / Octagram)
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.45 + Math.sin(t * 2.5) * 0.15})`;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 8;

    const starPoints = 6;
    const starPts = [];
    for (let p = 0; p < starPoints; p++) {
      const pAngle = (p * Math.PI * 2) / starPoints - rotSpeed * 0.7;
      starPts.push({
        x: Math.cos(pAngle) * radX * 0.85,
        y: Math.sin(pAngle) * radY * 0.85
      });
    }

    // Triangle 1
    ctx.beginPath();
    ctx.moveTo(starPts[0].x, starPts[0].y);
    ctx.lineTo(starPts[2].x, starPts[2].y);
    ctx.lineTo(starPts[4].x, starPts[4].y);
    ctx.closePath();
    ctx.stroke();

    // Triangle 2
    ctx.beginPath();
    ctx.moveTo(starPts[1].x, starPts[1].y);
    ctx.lineTo(starPts[3].x, starPts[3].y);
    ctx.lineTo(starPts[5].x, starPts[5].y);
    ctx.closePath();
    ctx.stroke();

    // 4. Inner Concentric Runic Core
    ctx.strokeStyle = theme.runeColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(0, 0, radX * 0.42, radY * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, radX * 0.28, radY * 0.28, 0, 0, Math.PI * 2); ctx.stroke();

    // Pulsating Core Sigil
    const pulseR = 0.14 + Math.sin(t * 3.5) * 0.02;
    const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, radX * 0.2);
    coreGlow.addColorStop(0, '#ffffff');
    coreGlow.addColorStop(0.4, theme.runeColor);
    coreGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, radX * pulseR, radY * pulseR, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 7. Ground Fog / Mist Layer across floor bottom
    ctx.save();
    const fogG = ctx.createLinearGradient(0, ch * 0.85, 0, ch);
    fogG.addColorStop(0, 'transparent');
    fogG.addColorStop(0.6, 'rgba(8, 20, 36, 0.45)');
    fogG.addColorStop(1, 'rgba(4, 12, 24, 0.8)');
    ctx.fillStyle = fogG;
    ctx.fillRect(0, ch * 0.85, cw, ch * 0.15);
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

    // Circle
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.stroke();

    // Cross
    const gap = 6;
    [[-1, 0],[1, 0],[0,-1],[0,1]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * (size + gap), cy + dy * (size + gap));
      ctx.lineTo(cx + dx * (size + gap + 12), cy + dy * (size + gap + 12));
      ctx.stroke();
    });

    // Active element name above crosshair
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

/* ══════════════════════════════════════════
   10. GameLoop
══════════════════════════════════════════ */
class GameLoop {
  constructor({ state, waveManager, renderer, audio, ai, hudUpdater }) {
    this.state       = state;
    this.waveManager = waveManager;
    this.renderer    = renderer;
    this.audio       = audio;
    this.ai          = ai;
    this.hudUpdater  = hudUpdater;
    this._rafId      = null;
    this._spawnQueue = [];
    this._spawnTimer = 0;
    this._spawnInterval = 1200; // ms between spawns
    this._waveEndTimer  = null;
    this._lastPredictTime = 0;
    this._predictInterval = 120; // ms between AI calls
    this._predicting = false;
    this._fpsFrames = 0;
    this._fpsLastTime = 0;
    this._fpsCurrent = 60;
  }

  start() {
    this._initWave();
    this._rafId = requestAnimationFrame(ts => this._loop(ts));
  }

  stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  _loop(ts) {
    const s = this.state;
    if (s.screen === 'gameOver' || s.screen === 'victory') return;

    // Real-time FPS Calculation
    this._fpsFrames++;
    if (!this._fpsLastTime) this._fpsLastTime = ts;
    if (ts - this._fpsLastTime >= 300) {
      this._fpsCurrent = (this._fpsFrames * 1000) / (ts - this._fpsLastTime);
      this._fpsFrames = 0;
      this._fpsLastTime = ts;
      if (this.hudUpdater && typeof this.hudUpdater.updateFPS === 'function') {
        this.hudUpdater.updateFPS(this._fpsCurrent);
      }
    }

    const dt = Math.min((ts - (s.lastTime || ts)) / 1000, 0.1);
    s.lastTime = ts;

    if (!s.paused && s.screen === 'playing') {
      this._update(dt, ts);
    }

    this.renderer.render(ts, s.mode === 'story' ? s.stage : 0);
    this.hudUpdater.update(s);

    this._rafId = requestAnimationFrame(t => this._loop(t));
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
        s.currentLabel    = result.label || 'Idle';
        s.currentConf     = result.confidence || 0;
        s.lastPredictions = result.predictions || [];
        this._predicting  = false;
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
    const s = th    // Update wave label
    document.getElementById('waveLabel').textContent =
      s.mode === 'story'
        ? `${CONFIG.STORY_STAGES_DATA[s.stage].name}`
        : `Wave ${s.wave}${s.mode === 'endless' ? ' ∞' : '/' + CONFIG.MAX_WAVES}`;
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
      // Endless
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
    document.getElementById('finalScore').textContent = this.state.score;
    document.getElementById('finalWave').textContent  =
      this.state.mode === 'story' ? `Stage ${this.state.stage + 1}` : `Wave ${this.state.wave}`;
    document.getElementById('finalKills').textContent = this.state.totalKills;
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }

  _triggerVictory() {
    this.state.screen = 'victory';
    this.stop();
    document.getElementById('victoryScore').textContent = this.state.score;
    document.getElementById('victoryWave').textContent  =
      this.state.mode === 'story' ? '7 Stages' : `Wave ${CONFIG.MAX_WAVES}`;
    document.getElementById('victoryKills').textContent = this.state.totalKills;
    document.getElementById('victoryScreen').classList.remove('hidden');
  }

  _triggerStageClear() {
    this.state.paused = true;
    const nextStage = CONFIG.STORY_STAGES_DATA[this.state.stage];
    document.getElementById('stageInfo').innerHTML =
      `<strong>ด่านถัดไป:</strong><br>${nextStage.name}<br>` +
      `<span style="color:${CONFIG.ELEMENT_COLORS[nextStage.element] || '#fff'}">` +
      `${CONFIG.ELEMENT_ICONS[nextStage.element] || '🌀'} ${nextStage.element} Domain</span>`;
    document.getElementById('stageClearScreen').classList.remove('hidden');
  }

  resumeFromStageClear() {
    document.getElementById('stageClearScreen').classList.add('hidden');
    this.state.paused = false;
    this._initWave();
  }
}

/* ══════════════════════════════════════════
   10. HUDUpdater (helper)
══════════════════════════════════════════ */
class HUDUpdater {
  constructor() {
    this._hpBar       = document.getElementById('hpBar');
    this._hpText      = document.getElementById('hpText');
    this._hpPercent   = document.getElementById('hpPercent');
    this._manaBar     = document.getElementById('manaBar');
    this._manaText    = document.getElementById('manaText');
    this._manaPercent = document.getElementById('manaPercent');
    this._fpsVal      = document.getElementById('fpsVal');
    this._scoreLabel  = document.getElementById('scoreLabel');
    this._killLabel   = document.getElementById('killLabel');
    this._elemName    = document.getElementById('elementName');
    this._confPct     = document.getElementById('confPercent');
    // Per-element bars & pct labels
    this._elBars = {};
    this._elPcts = {};
    this._elRows = {};
    CONFIG.ELEMENTS.forEach(el => {
      this._elBars[el] = document.getElementById('bar-' + el);
      this._elPcts[el] = document.getElementById('pct-' + el);
      const row = document.querySelector(`.el-bar-row[data-el="${el}"]`);
      if (row) this._elRows[el] = row;
    });
    // Spell cards
    this._spellCards = {
      Fire:      document.querySelector('.fire-card'),
      Water:     document.querySelector('.water-card'),
      Earth:     document.querySelector('.earth-card'),
      Wind:      document.querySelector('.wind-card'),
      Lightning: document.querySelector('.lightning-card'),
      Ice:       document.querySelector('.ice-card'),
    };
    this._prevHp = CONFIG.PLAYER_MAX_HP;
  }

  updateFPS(fps) {
    if (this._fpsVal) {
      this._fpsVal.textContent = Math.round(fps);
    }
  }

  applyElementLockStatus(availableElements, lockedElements) {
    CONFIG.ELEMENTS.forEach(el => {
      const isLocked = lockedElements && lockedElements.includes(el);
      const card = this._spellCards[el];
      if (card) {
        card.classList.toggle('locked', isLocked);
        const oldBadge = card.querySelector('.spell-lock-badge');
        if (oldBadge) oldBadge.remove();
        if (isLocked) {
          const badge = document.createElement('div');
          badge.className = 'spell-lock-badge';
          badge.innerHTML = '🔒 LOCKED';
          card.appendChild(badge);
        }
      }
      const row = this._elRows[el];
      if (row) {
        row.classList.toggle('locked', isLocked);
        const pct = this._elPcts[el];
        if (isLocked && pct) {
          pct.textContent = '🔒';
        }
      }
    });
  }

  update(state) {
    const { hp, maxHp, mana, maxMana } = state.player;
    
    // 1. HP Health Bar Update
    const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
    const hpPct   = Math.round(hpRatio * 100);
    if (this._hpBar) {
      this._hpBar.style.width = (hpRatio * 100) + '%';
      this._hpBar.classList.toggle('low-hp', hpRatio <= 0.3);
    }
    if (this._hpText) {
      this._hpText.textContent = `${Math.ceil(hp)}/${maxHp}`;
    }
    if (this._hpPercent) {
      this._hpPercent.textContent = `${hpPct}%`;
    }

    // 2. Mana Bar Update
    const manaRatio = Math.max(0, Math.min(1, mana / maxMana));
    const manaPct   = Math.round(manaRatio * 100);
    if (this._manaBar) {
      this._manaBar.style.width = (manaRatio * 100) + '%';
    }
    if (this._manaText) {
      this._manaText.textContent = `${Math.floor(mana)}/${maxMana}`;
    }
    if (this._manaPercent) {
      this._manaPercent.textContent = `${manaPct}%`;
    }

    this._scoreLabel.textContent = state.score.toLocaleString();
    this._killLabel.textContent  = state.totalKills + ' KOs';

    // Element name + confidence
    const el   = state.currentLabel;
    const conf = state.currentConf;
    const isSpell = CONFIG.ELEMENTS.includes(el);
    const isLocked = state.lockedElements && state.lockedElements.includes(el);
    const isActive = isSpell && !isLocked && conf >= CONFIG.CONFIDENCE_THRESHOLD;
    const color = CONFIG.ELEMENT_COLORS[el] || '#8899bb';

    // Show recognized element name in real-time
    if (el && el !== 'Idle' && isSpell) {
      if (isLocked) {
        this._elemName.textContent = `${el.toUpperCase()} (LOCKED)`;
        this._elemName.style.color = '#778899';
        this._elemName.style.textShadow = 'none';
      } else {
        this._elemName.textContent = el.toUpperCase();
        this._elemName.style.color = color;
        this._elemName.style.textShadow = isActive ? `0 0 20px ${color}` : `0 0 8px ${color}`;
      }
    } else {
      this._elemName.textContent = 'IDLE';
      this._elemName.style.color = '#8899bb';
      this._elemName.style.textShadow = 'none';
    }

    this._confPct.textContent  = Math.round(conf * 100) + '%';
    this._confPct.style.color  = conf >= 0.8 ? '#44ff88' : conf >= 0.4 ? '#ffaa22' : '#8899bb';

    // Per-element confidence bars
    if (state.lastPredictions && state.lastPredictions.length > 0) {
      CONFIG.ELEMENTS.forEach(e => {
        const locked = state.lockedElements && state.lockedElements.includes(e);
        if (!locked) {
          if (this._elBars[e]) this._elBars[e].style.width = '0%';
          if (this._elPcts[e]) this._elPcts[e].textContent = '0%';
          if (this._elRows[e]) this._elRows[e].classList.remove('active');
        }
      });

      state.lastPredictions.forEach(p => {
        const locked = state.lockedElements && state.lockedElements.includes(p.label);
        if (!locked && this._elBars[p.label]) {
          const pct = Math.min(100, Math.round(p.confidence * 100));
          this._elBars[p.label].style.width = pct + '%';
          if (this._elPcts[p.label]) this._elPcts[p.label].textContent = pct + '%';
          if (this._elRows[p.label]) {
            this._elRows[p.label].classList.toggle('active', p.label === el && p.confidence >= 0.25);
          }
        }
      });
    } else {
      CONFIG.ELEMENTS.forEach(e => {
        const locked = state.lockedElements && state.lockedElements.includes(e);
        if (!locked) {
          const pct = (e === el ? Math.round(conf * 100) : 0);
          if (this._elBars[e]) this._elBars[e].style.width = pct + '%';
          if (this._elPcts[e]) this._elPcts[e].textContent = pct + '%';
          if (this._elRows[e]) this._elRows[e].classList.toggle('active', e === el && conf >= 0.25);
        }
      });
    }

    // Spell card active highlight
    Object.entries(this._spellCards).forEach(([name, card]) => {
      if (!card) return;
      card.classList.toggle('active-spell', name === el && isActive);
    });
  }
}

/* ══════════════════════════════════════════
   11. MenuParticleSystem (Subtle Ambient Magic Embers)
══════════════════════════════════════════ */
class MenuParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.numParticles = 55;
    this.running = false;
    this._rafId = null;
    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);
    this.resize();
    this._initParticles();
  }

  resize() {
    if (!this.canvas) return;
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  _initParticles() {
    const colors = [
      { r: 255, g: 215, b: 0, glow: 'rgba(255, 215, 0, ' },      // Gold
      { r: 245, g: 184, b: 66, glow: 'rgba(245, 184, 66, ' },    // Amber
      { r: 0, g: 229, b: 255, glow: 'rgba(0, 229, 255, ' },      // Cyan
      { r: 64, g: 200, b: 255, glow: 'rgba(64, 200, 255, ' },    // Ice Blue
      { r: 200, g: 128, b: 255, glow: 'rgba(200, 128, 255, ' }   // Soft Violet
    ];

    this.particles = Array.from({ length: this.numParticles }, () => {
      const col = colors[Math.floor(Math.random() * colors.length)];
      return {
        x: Math.random() * (this.width || window.innerWidth),
        y: Math.random() * (this.height || window.innerHeight),
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

  update() {
    const w = this.width || window.innerWidth;
    const h = this.height || window.innerHeight;

    this.particles.forEach(p => {
      p.y += p.speedY;
      p.swayAngle += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.swayAngle) * p.swayRadius;

      // Twinkle alpha
      p.alpha += (p.targetAlpha - p.alpha) * p.alphaSpeed;
      if (Math.abs(p.targetAlpha - p.alpha) < 0.04) {
        p.targetAlpha = 0.15 + Math.random() * 0.65;
      }

      // Recycle at top or sides
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

      // Radial outer soft glow
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

      // Bright core
      this.ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.95})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
      this.ctx.fill();

      // Subtle 4-point sparkle star for flared embers
      if (p.flare && a > 0.4) {
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.6})`;
        this.ctx.lineWidth = 0.75;
        this.ctx.beginPath();
        const len = p.radius * 2.8;
        this.ctx.moveTo(p.x - len, p.y);
        this.ctx.lineTo(p.x + len, p.y);
        this.ctx.moveTo(p.x, p.y - len);
        this.ctx.lineTo(p.x, p.y + len);
        this.ctx.stroke();
      }
    });
  }
}

/* ══════════════════════════════════════════
   12. App — Entry Point + UI Wiring
══════════════════════════════════════════ */
class App {
  constructor() {
    this._audio    = new AudioManager();
    this._state    = new GameState();
    this._ai       = null;
    this._loop     = null;
    this._waveManager = null;
    this._renderer = null;
    this._hud      = new HUDUpdater();
    this._mode     = 'wave';
    this._modelType = 'pose';
    this._menuParticles = new MenuParticleSystem('menuParticlesCanvas');
    if (this._menuParticles) this._menuParticles.start();
    this._bindSetupUI();
  }

  // ── Setup Screen ──
  _bindSetupUI() {
    // Radio sync: update active style on click
    document.querySelectorAll('input[type="radio"]').forEach(r => {
      r.addEventListener('change', () => {
        document.querySelectorAll(`input[name="${r.name}"]`).forEach(o => {
          const card = o.closest('.mode-card') || o.closest('.toggle-btn') || o.closest('.radio-card');
          if (card) card.classList.toggle('active', o.checked);
        });
      });
    });

    document.getElementById('startBtn').addEventListener('click', () => this._startGame());
  }

  async _startGame() {
    const urlInput = document.getElementById('modelUrl').value.trim();
    const errEl    = document.getElementById('setupError');
    const loadEl   = document.getElementById('loadingIndicator');
    const loadText = document.getElementById('loadingText');
    const startBtn = document.getElementById('startBtn');

    errEl.classList.add('hidden');
    errEl.textContent = '';

    if (!urlInput) {
      errEl.textContent = '⚠️ กรุณากรอก Model URL ก่อนเริ่มเกม';
      errEl.classList.remove('hidden');
      return;
    }

    this._modelType = document.querySelector('input[name="modelType"]:checked')?.value || 'pose';
    this._mode      = document.querySelector('input[name="gameMode"]:checked')?.value  || 'wave';

    // Show loading
    startBtn.disabled = true;
    loadEl.classList.remove('hidden');

    try {
      loadText.textContent = 'กำลังโหลด AI Model...';
      this._ai = new AIDetector(urlInput, this._modelType);
      await this._ai.init();

      loadText.textContent = 'เริ่มเกม...';
      await new Promise(r => setTimeout(r, 300));

      this._launchGame();
    } catch(e) {
      console.error('Init error:', e);
      errEl.textContent = `❌ ไม่สามารถโหลด Model ได้: ${e.message || e}`;
      errEl.classList.remove('hidden');
      loadEl.classList.add('hidden');
      startBtn.disabled = false;
      if (this._ai) { this._ai.cleanup(); this._ai = null; }
    }
  }

  _launchGame() {
    // Stop menu background particles during active gameplay
    if (this._menuParticles) {
      this._menuParticles.stop();
    }

    // Show/hide webcam vs mic — new HTML uses #webcamContainer and #micContainer inside #cameraBox
    const isAudio = this._modelType === 'audio';
    const webcamInner = document.getElementById('webcamContainer');
    const micInner    = document.getElementById('micContainer');
    if (webcamInner) webcamInner.classList.toggle('hidden', isAudio);
    if (micInner)    micInner.classList.toggle('hidden', !isAudio);

    // Switch screens
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('setupScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.remove('hidden');

    // Init game objects
    this._state.reset();
    this._state.availableElements = this._ai ? this._ai.availableElements : [...CONFIG.ELEMENTS];
    this._state.lockedElements    = this._ai ? this._ai.lockedElements : [];
    this._state.mode   = this._mode;
    this._state.screen = 'playing';

    // Apply lock styles to HUD and spell cards
    this._hud.applyElementLockStatus(this._state.availableElements, this._state.lockedElements);

    const canvas = document.getElementById('gameCanvas');
    this._renderer    = new Renderer(canvas, this._state);
    this._waveManager = new WaveManager(this._state);
    this._loop = new GameLoop({
      state:       this._state,
      waveManager: this._waveManager,
      renderer:    this._renderer,
      audio:       this._audio,
      ai:          this._ai,
      hudUpdater:  this._hud
    });

    this._audio.startBGM();
    this._loop.start();

    // Bind in-game UI
    this._bindGameUI();
  }

  _bindGameUI() {
    // Pause
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const pauseQuit = document.getElementById('pauseQuitBtn');

    pauseBtn.onclick = () => this._pauseGame();
    resumeBtn.onclick = () => this._resumeGame();
    pauseQuit.onclick = () => this._quitToMenu();

    // Game Over
    document.getElementById('retryBtn').onclick        = () => this._retry();
    document.getElementById('gameOverQuitBtn').onclick = () => this._quitToMenu();

    // Victory
    document.getElementById('victoryRetryBtn').onclick = () => this._retry();
    document.getElementById('victoryQuitBtn').onclick  = () => this._quitToMenu();

    // Stage Clear
    document.getElementById('nextStageBtn').onclick = () => {
      if (this._loop) this._loop.resumeFromStageClear();
    };

    // Spell Card Clicks for Manual Casting
    CONFIG.ELEMENTS.forEach(el => {
      const card = this._hud._spellCards[el];
      if (card) {
        card.onclick = () => {
          if (this._loop && this._state.screen === 'playing' && !this._state.paused) {
            this._loop.castManualSpell(el);
          }
        };
      }
    });

    // Keyboard numbers 1-6 for quick manual casting + Escape for pause
    const numKeyMap = {
      '1': 'Ice',
      '2': 'Fire',
      '3': 'Lightning',
      '4': 'Earth',
      '5': 'Water',
      '6': 'Wind'
    };

    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        if (this._state.paused) this._resumeGame();
        else this._pauseGame();
      } else if (numKeyMap[e.key]) {
        if (this._loop && this._state.screen === 'playing' && !this._state.paused) {
          this._loop.castManualSpell(numKeyMap[e.key]);
        }
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _pauseGame() {
    if (this._state.screen !== 'playing') return;
    this._state.paused = true;
    document.getElementById('pauseScreen').classList.remove('hidden');
  }

  _resumeGame() {
    this._state.paused = false;
    document.getElementById('pauseScreen').classList.add('hidden');
  }

  _retry() {
    this._cleanup(false); // keep AI if possible
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('victoryScreen').classList.add('hidden');

    // Re-launch with same config
    this._state.reset();
    this._state.availableElements = this._ai ? this._ai.availableElements : [...CONFIG.ELEMENTS];
    this._state.lockedElements    = this._ai ? this._ai.lockedElements : [];
    this._state.mode   = this._mode;
    this._state.screen = 'playing';

    this._hud.applyElementLockStatus(this._state.availableElements, this._state.lockedElements);

    const canvas = document.getElementById('gameCanvas');
    this._renderer    = new Renderer(canvas, this._state);
    this._waveManager = new WaveManager(this._state);
    this._loop = new GameLoop({
      state:       this._state,
      waveManager: this._waveManager,
      renderer:    this._renderer,
      audio:       this._audio,
      ai:          this._ai,
      hudUpdater:  this._hud
    });
    this._audio.startBGM();
    this._loop.start();
  }

  _quitToMenu() {
    this._cleanup(true);

    // Hide overlays
    ['gameOverScreen','victoryScreen','pauseScreen','stageClearScreen'].forEach(id => {
      document.getElementById(id).classList.add('hidden');
    });

    // Show setup
    document.getElementById('gameScreen').classList.add('hidden');
    const setup = document.getElementById('setupScreen');
    setup.classList.remove('hidden');
    setup.classList.add('active');

    // Resume ambient menu embers
    if (this._menuParticles) {
      this._menuParticles.start();
    }

    // Re-enable start button
    document.getElementById('startBtn').disabled = false;
    document.getElementById('loadingIndicator').classList.add('hidden');
    document.getElementById('setupError').classList.add('hidden');
  }

  _cleanup(fullCleanup = true) {
    if (this._loop)  { this._loop.stop(); this._loop = null; }
    this._audio.stopBGM();
    if (fullCleanup && this._ai) {
      this._ai.cleanup();
      this._ai = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._renderer = null;
    this._waveManager = null;
  }
}

/* ══════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  window._app = new App();
});
