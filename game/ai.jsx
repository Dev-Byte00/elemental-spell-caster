/* ═══════════════════════════════════════════════════════════════
   AIDetector — Teachable Machine Pose / Image / Audio
   With multi-language support, cache-busting, and skeleton rendering
═══════════════════════════════════════════════════════════════ */

import { CONFIG } from './config.jsx';

export class AIDetector {
  constructor(modelURL, modelType, isMock = false) {
    this.isMock = isMock;
    let cleanUrl = (modelURL || '').trim();
    if (cleanUrl.endsWith('model.json')) {
      cleanUrl = cleanUrl.replace(/model\.json$/, '');
    }
    if (!cleanUrl.endsWith('/') && cleanUrl) {
      cleanUrl += '/';
    }
    this.modelURL    = cleanUrl;
    this.modelType   = modelType; // 'pose' | 'image' | 'audio'
    this._model      = null;
    this._recognizer = null;
    this._stream     = null;
    this._videoEl    = null;
    this._poseCanvas = null;
    this._lastResult = { label: 'Idle', confidence: 0, predictions: [] };
    this._audioResult = { label: 'Idle', confidence: 0, predictions: [] };
    this.availableElements = [...CONFIG.ELEMENTS];
    this.lockedElements    = [];
    this.modelClasses      = [...CONFIG.ELEMENTS, 'Idle'];
    this._customLabelMap   = new Map();
    this._disposed         = false;
  }

  setElements(videoEl, poseCanvas) {
    this._videoEl = videoEl;
    this._poseCanvas = poseCanvas;
  }

  _normalizeLabel(raw) {
    if (!raw || typeof raw !== 'string') return 'Idle';
    if (this._customLabelMap && this._customLabelMap.has(raw)) {
      return this._customLabelMap.get(raw);
    }
    const rawTrim = raw.trim().toLowerCase();
    const cleanAscii = rawTrim.replace(/[^a-z0-9_]/g, '');

    // 1. Thai & English Idle Keywords
    if (
      rawTrim.includes('พัก') || rawTrim.includes('นิ่ง') || rawTrim.includes('ว่าง') ||
      rawTrim.includes('ยืน') || rawTrim.includes('ปกติ') || rawTrim.includes('เฉย') ||
      cleanAscii.includes('idle') || cleanAscii.includes('idel') || cleanAscii.includes('ibel') ||
      cleanAscii.includes('idie') || cleanAscii.includes('idl')  || cleanAscii.includes('noise') ||
      cleanAscii.includes('none') || cleanAscii.includes('neutral') || cleanAscii.includes('stand') ||
      cleanAscii.includes('wait') || cleanAscii.includes('rest') || cleanAscii.includes('normal') ||
      cleanAscii.includes('default') || cleanAscii.includes('background') || cleanAscii.includes('nothing') ||
      cleanAscii.includes('pause') || cleanAscii.includes('stop') || cleanAscii.includes('relax') ||
      cleanAscii === 'class0' || cleanAscii === 'class_0' || cleanAscii === 'pose0' || cleanAscii === 'pose_0' ||
      cleanAscii === 'class7' || cleanAscii === 'pose7'
    ) {
      return 'Idle';
    }

    // 2. Fire (ไฟ / เพลิง / อัคคี / Fire / Flame / Pyro / Red / etc.)
    if (
      rawTrim.includes('ไฟ') || rawTrim.includes('เพลิง') || rawTrim.includes('อัคคี') ||
      cleanAscii.includes('fire') || cleanAscii.includes('flame') || cleanAscii.includes('pyro') ||
      cleanAscii.includes('blaze') || cleanAscii.includes('heat') || cleanAscii.includes('ember') ||
      cleanAscii.includes('burn') || cleanAscii.includes('magma') || cleanAscii.includes('lava') ||
      cleanAscii === 'class2' || cleanAscii === 'class_2' || cleanAscii === 'pose2' || cleanAscii === 'pose_2'
    ) return 'Fire';

    // 3. Water (น้ำ / วารี / ชล / Water / Aqua / Hydro / Wave / Blue / etc.)
    if (
      (rawTrim.includes('น้ำ') && !rawTrim.includes('น้ำแข็ง')) ||
      rawTrim.includes('วารี') || rawTrim.includes('ชล') ||
      cleanAscii.includes('water') || cleanAscii.includes('aqua') || cleanAscii.includes('hydro') ||
      cleanAscii.includes('tidal') || cleanAscii.includes('ocean') || cleanAscii.includes('wave') ||
      cleanAscii.includes('rain') || cleanAscii.includes('river') || cleanAscii.includes('sea') ||
      cleanAscii === 'class5' || cleanAscii === 'class_5' || cleanAscii === 'pose5' || cleanAscii === 'pose_5'
    ) return 'Water';

    // 4. Earth (ดิน / หิน / ศิลา / Earth / Stone / Rock / Terra / Ground / Green / etc.)
    if (
      rawTrim.includes('ดิน') || rawTrim.includes('หิน') || rawTrim.includes('ศิลา') ||
      rawTrim.includes('พสุธา') || rawTrim.includes('ปฐพี') ||
      cleanAscii.includes('earth') || cleanAscii.includes('stone') || cleanAscii.includes('rock') ||
      cleanAscii.includes('terra') || cleanAscii.includes('ground') || cleanAscii.includes('soil') ||
      cleanAscii.includes('boulder') || cleanAscii.includes('sand') || cleanAscii.includes('nature') ||
      cleanAscii === 'class4' || cleanAscii === 'class_4'
    ) return 'Earth';

    // 5. Wind (ลม / วายุ / พายุ / Wind / Air / Gale / Breeze / Storm / etc.)
    if (
      rawTrim.includes('ลม') || rawTrim.includes('วายุ') || rawTrim.includes('พายุ') ||
      cleanAscii.includes('wind') || cleanAscii.includes('air') || cleanAscii.includes('gale') ||
      cleanAscii.includes('storm') || cleanAscii.includes('breeze') || cleanAscii.includes('tornado') ||
      cleanAscii.includes('gust') || cleanAscii.includes('cyclone') || cleanAscii.includes('whirlwind') ||
      cleanAscii === 'class6' || cleanAscii === 'class_6' || cleanAscii === 'pose6' || cleanAscii === 'pose_6'
    ) return 'Wind';

    // 6. Lightning (สายฟ้า / ฟ้าผ่า / ไฟฟ้า / Lightning / Thunder / Volt / Elec / Spark / etc.)
    if (
      rawTrim.includes('สายฟ้า') || rawTrim.includes('ฟ้าผ่า') || rawTrim.includes('ไฟฟ้า') || rawTrim.includes('อัสนี') ||
      cleanAscii.includes('lightn') || cleanAscii.includes('thund') || cleanAscii.includes('volt') ||
      cleanAscii.includes('elec') || cleanAscii.includes('spark') || cleanAscii.includes('shock') ||
      cleanAscii.includes('bolt') ||
      cleanAscii === 'class3' || cleanAscii === 'class_3' || cleanAscii === 'pose3' || cleanAscii === 'pose_3'
    ) return 'Lightning';

    // 7. Ice (น้ำแข็ง / หิมะ / เย็น / Ice / Frost / Glacier / Blizzard / Cold / Freeze / Snow / etc.)
    if (
      rawTrim.includes('น้ำแข็ง') || rawTrim.includes('หิมะ') || rawTrim.includes('เยือกเย็น') ||
      cleanAscii.includes('ice') || cleanAscii.includes('frost') || cleanAscii.includes('glacier') ||
      cleanAscii.includes('blizzard') || cleanAscii.includes('cold') || cleanAscii.includes('freeze') ||
      cleanAscii.includes('snow') ||
      cleanAscii === 'class1' || cleanAscii === 'class_1' || cleanAscii === 'pose1' || cleanAscii === 'pose_1'
    ) return 'Ice';

    for (const el of CONFIG.ELEMENTS) {
      if (el.toLowerCase() === rawTrim || cleanAscii === el.toLowerCase()) return el;
    }
    return 'Idle';
  }

  async init(videoEl, poseCanvas) {
    if (videoEl) this._videoEl = videoEl;
    if (poseCanvas) this._poseCanvas = poseCanvas;

    if (this.isMock) {
      this.availableElements = [...CONFIG.ELEMENTS];
      this.lockedElements = [];
      this.modelClasses = [...CONFIG.ELEMENTS, 'Idle'];
      try { await this._openCamera(); } catch(_) {}
      return;
    }

    const nocache = '_t=' + Date.now();
    const modelURL    = this.modelURL + 'model.json?' + nocache;
    const metadataURL = this.modelURL + 'metadata.json?' + nocache;

    const rawLabels = await this._fetchModelLabels(metadataURL);
    this._validateAndExtractElements(rawLabels);

    if (typeof window === 'undefined') return;

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
  }

  async _fetchModelLabels(metadataURL) {
    let rawLabels = [];
    try {
      const resp = await fetch(metadataURL, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (resp.ok) {
        const meta = await resp.json();
        rawLabels = meta.labels || meta.wordLabels || [];
      }
    } catch (e) {
      console.warn("Direct metadata fetch failed, falling back:", e);
    }

    if (!rawLabels || rawLabels.length === 0) {
      if (typeof window !== 'undefined') {
        if (this._model && typeof this._model.getClassLabels === 'function') {
          try { rawLabels = this._model.getClassLabels(); } catch(e) {}
        } else if (this._recognizer && typeof this._recognizer.wordLabels === 'function') {
          try { rawLabels = this._recognizer.wordLabels(); } catch(e) {}
        }
      }
    }
    return rawLabels || [];
  }

  _validateAndExtractElements(rawLabels) {
    this._customLabelMap = new Map();
    if (!rawLabels || rawLabels.length === 0) {
      this.availableElements = [...CONFIG.ELEMENTS];
      this.lockedElements = [];
      this.modelClasses = [...CONFIG.ELEMENTS, 'Idle'];
      return;
    }

    if (rawLabels.length < 4) {
      throw new Error(
        `โมเดลที่โหลดมามีเพียง ${rawLabels.length} คลาส (${rawLabels.join(', ') || 'ไม่พบคลาส'}) — จำเป็นต้องมีอย่างน้อย 4 คลาสขึ้นไป (ธาตุอย่างน้อย 3 คลาส + คลาส Idle 1 คลาส) หากเพิ่งกดอัปเดตโมเดลใน Teachable Machine ให้รออัปโหลดเสร็จแล้วกดเริ่มใหม่อีกครั้ง`
      );
    }

    const elementsFound = new Set();
    const unmappedLabels = [];
    let hasIdle = false;

    rawLabels.forEach(raw => {
      const norm = this._normalizeLabel(raw);
      if (norm === 'Idle') {
        hasIdle = true;
        this._customLabelMap.set(raw, 'Idle');
      } else if (CONFIG.ELEMENTS.includes(norm)) {
        elementsFound.add(norm);
        this._customLabelMap.set(raw, norm);
      } else {
        unmappedLabels.push(raw);
      }
    });

    if (!hasIdle) {
      if (unmappedLabels.length > 0) {
        const idleCandidate = unmappedLabels.pop();
        this._customLabelMap.set(idleCandidate, 'Idle');
        hasIdle = true;
      } else if (rawLabels.length > 0) {
        this._customLabelMap.set(rawLabels[rawLabels.length - 1], 'Idle');
        hasIdle = true;
      }
    }

    const missingElements = CONFIG.ELEMENTS.filter(el => !elementsFound.has(el));
    unmappedLabels.forEach((raw, idx) => {
      if (idx < missingElements.length) {
        const assignedEl = missingElements[idx];
        elementsFound.add(assignedEl);
        this._customLabelMap.set(raw, assignedEl);
      }
    });

    if (elementsFound.size < 3 && rawLabels.length >= 4) {
      CONFIG.ELEMENTS.slice(0, 3).forEach(el => elementsFound.add(el));
    }

    const detectedList = Array.from(elementsFound);
    this.availableElements = detectedList.length > 0 ? detectedList : [...CONFIG.ELEMENTS];
    this.lockedElements    = CONFIG.ELEMENTS.filter(el => !elementsFound.has(el));
    this.modelClasses      = rawLabels;
  }

  async _openCamera() {
    if (typeof window === 'undefined') return;
    if (!this._videoEl) this._videoEl = document.getElementById('webcamVideo');
    if (!this._poseCanvas) this._poseCanvas = document.getElementById('poseCanvas');

    try {
      if (!this._stream) {
        this._stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });
      }
      if (this._videoEl) {
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
    } catch (err) {
      if (this.isMock) {
        console.log("[AIDetector] Camera not accessible in Mock/Cheat mode, continuing without camera.");
      } else {
        throw err;
      }
    }
  }

  onGameScreenVisible(videoEl, poseCanvas) {
    if (videoEl) this._videoEl = videoEl;
    if (poseCanvas) this._poseCanvas = poseCanvas;
    if (typeof document !== 'undefined') {
      if (!this._videoEl) this._videoEl = document.getElementById('webcamVideo');
      if (!this._poseCanvas) this._poseCanvas = document.getElementById('poseCanvas');
    }

    if (this._videoEl && this._stream) {
      this._videoEl.play().catch(e => console.warn("Video resume play:", e));
      if (this.modelType === 'pose' && this._poseCanvas) {
        this._poseCanvas.width = this._videoEl.videoWidth || 640;
        this._poseCanvas.height = this._videoEl.videoHeight || 480;
      }
    }
  }

  _startAudioListening() {
    if (!this._recognizer) return;
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

    if (this.isMock) {
      return { label: 'Idle', confidence: 0, predictions: [] };
    }

    if (typeof document !== 'undefined') {
      if (!this._videoEl) this._videoEl = document.getElementById('webcamVideo');
      if (!this._poseCanvas) this._poseCanvas = document.getElementById('poseCanvas');
    }

    if (!this._videoEl) {
      return { label: 'Idle', confidence: 0, predictions: [] };
    }

    if (this._videoEl.paused && this._stream) {
      try { await this._videoEl.play(); } catch(_) {}
    }

    if (this._videoEl.readyState < 2) {
      return { label: 'Idle', confidence: 0, predictions: [] };
    }

    try {
      if (this.modelType === 'pose') {
        const { pose, posenetOutput } = await this._model.estimatePose(this._videoEl, false);
        const prediction = await this._model.predict(posenetOutput);

        if (this._poseCanvas) {
          if (this._poseCanvas.width === 0 || this._poseCanvas.height === 0) {
            this._poseCanvas.width = this._videoEl.videoWidth || 640;
            this._poseCanvas.height = this._videoEl.videoHeight || 480;
          }
          const ctx = this._poseCanvas.getContext('2d');
          ctx.clearRect(0, 0, this._poseCanvas.width, this._poseCanvas.height);
          if (pose && typeof window !== 'undefined' && window.tmPose) {
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
    this._model = null;
  }
}
