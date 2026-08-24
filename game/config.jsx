/* ═══════════════════════════════════════════════════════════════
   CONFIG — Game Constants, Element Colors, Story Stages
═══════════════════════════════════════════════════════════════ */

export const CONFIG = {
  // Canvas dimensions
  CANVAS_W: 1066,
  CANVAS_H: 600,

  // Player stats
  PLAYER_MAX_HP:     100,
  PLAYER_MAX_MANA:   100,
  PLAYER_MANA_REGEN: 12,    // Mana per second
  SPELL_MANA_COST:   15,
  SPELL_COOLDOWN_MS: 380,

  // Detection threshold
  CONFIDENCE_THRESHOLD: 0.80,

  // Gameplay
  MONSTER_REACH_THRESHOLD: 0.88, // scale at which monster attacks player
  MAX_WAVES: 20,
  STORY_STAGES: 7,

  // Elements definition
  ELEMENTS: ['Fire', 'Water', 'Earth', 'Wind', 'Lightning', 'Ice'],

  ELEMENT_COLORS: {
    Fire:      '#ff6820',
    Water:     '#00aaee',
    Earth:     '#c8a020',
    Wind:      '#80e080',
    Lightning: '#c880ff',
    Ice:       '#40c8ff'
  },

  ELEMENT_GLOW: {
    Fire:      'rgba(255, 104, 32, 0.55)',
    Water:     'rgba(0, 170, 238, 0.55)',
    Earth:     'rgba(200, 160, 32, 0.55)',
    Wind:      'rgba(128, 224, 128, 0.55)',
    Lightning: 'rgba(200, 128, 255, 0.55)',
    Ice:       'rgba(64, 200, 255, 0.55)'
  },

  ELEMENT_ICONS: {
    Fire:      '🔥',
    Water:     '💧',
    Earth:     '⛰️',
    Wind:      '💨',
    Lightning: '⚡',
    Ice:       '❄️'
  },

  STORY_STAGES_DATA: [
    { name: '🔥 DOMAIN OF FLAMES',    desc: 'Purge the Inferno Imps and Arch-Demons born of magma.',      element: 'Fire' },
    { name: '💧 ABYSSAL DEEPS',        desc: 'Overcome the Spectral Wraiths from oceanic rifts.',          element: 'Water' },
    { name: '⛰️ ANCIENT RUINS',       desc: 'Smash through the Granite Titans and stone sentinels.',       element: 'Earth' },
    { name: '💨 TEMPEST RIDGE',        desc: 'Intercept the Zephyr Harpies surging through storm clouds.', element: 'Wind' },
    { name: '⚡ STORM CRAG',           desc: 'Silence the Thunder Gargoyles summoning chaotic lightning.', element: 'Lightning' },
    { name: '❄️ FROZEN WASTELAND',     desc: 'Withstand the Glacial Behemoths freezing the realm.',        element: 'Ice' },
    { name: '👑 ASTRAL ARCH-VOID',     desc: 'The ultimate trial: Defeat the multi-elemental Primordials.',element: 'Chaos' }
  ]
};
