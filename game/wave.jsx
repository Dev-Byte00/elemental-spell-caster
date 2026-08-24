/* ═══════════════════════════════════════════════════════════════
   WAVE MANAGER — Wave / Endless / Story Progression Engine
═══════════════════════════════════════════════════════════════ */

import { CONFIG } from './config.jsx';

export class WaveManager {
  constructor(state) {
    this.state = state;
  }

  getWaveConfig(waveNum, mode, stageIdx) {
    const base = mode === 'story' ? this._storyConfig(stageIdx) : this._genericConfig(waveNum, mode);
    return base;
  }

  _storyConfig(stageIdx) {
    const sd = CONFIG.STORY_STAGES_DATA[stageIdx] || CONFIG.STORY_STAGES_DATA[0];
    const waveBonus = this.state.wave;

    if (stageIdx === 6) {
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
