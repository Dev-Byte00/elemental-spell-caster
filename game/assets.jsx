/* ═══════════════════════════════════════════════════════════════
   ASSET MANAGER — Image & Texture Preloading
═══════════════════════════════════════════════════════════════ */

export class AssetManager {
  constructor() {
    this.images = {};
    this.loaded = false;
  }

  async loadAll() {
    if (typeof window === 'undefined') return;

    const assets = [
      { key: 'bg_cathedral',       src: '/assets/images/bg_cathedral.jpg' },
      { key: 'monster_earth',      src: '/assets/images/monster_earth.jpg' },
      { key: 'monster_fire',       src: '/assets/images/monster_fire.jpg' },
      { key: 'monster_ice',        src: '/assets/images/monster_ice.jpg' },
      { key: 'monster_lightning',  src: '/assets/images/monster_lightning.jpg' },
      { key: 'monster_water',      src: '/assets/images/monster_water.jpg' },
      { key: 'monster_wind',       src: '/assets/images/monster_wind.jpg' },
      { key: 'spell_earth',        src: '/assets/images/spell_earth.jpg' },
      { key: 'spell_fire',         src: '/assets/images/spell_fire.jpg' },
      { key: 'spell_ice',          src: '/assets/images/spell_ice.jpg' },
      { key: 'spell_lightning',     src: '/assets/images/spell_lightning.jpg' },
      { key: 'spell_water',        src: '/assets/images/spell_water.jpg' },
      { key: 'spell_wind',         src: '/assets/images/spell_wind.jpg' }
    ];

    const promises = assets.map(a => this._loadImage(a.key, a.src));
    await Promise.all(promises);
    this.loaded = true;
  }

  _loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[AssetManager] Failed to load image: ${src}`);
        resolve(null);
      };
      img.src = src;
    });
  }

  getImage(key) {
    return this.images[key] || null;
  }
}

export const ASSETS = new AssetManager();
