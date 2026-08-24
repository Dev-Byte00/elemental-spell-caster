/* ═══════════════════════════════════════════════════════════════
   ELEMENT SYSTEM — Weakness & Resistance Matrix
═══════════════════════════════════════════════════════════════ */

export const ElementSystem = (() => {
  const WEAKNESS = {
    Fire:      ['Ice', 'Wind'],
    Water:     ['Fire', 'Earth'],
    Earth:     ['Lightning', 'Water'],
    Wind:      ['Earth', 'Ice'],
    Lightning: ['Water', 'Wind'],
    Ice:       ['Wind', 'Fire']
  };

  const RESISTANCE = {
    Fire:      ['Water', 'Earth'],
    Water:     ['Lightning', 'Ice'],
    Earth:     ['Fire', 'Wind'],
    Wind:      ['Lightning', 'Fire'],
    Lightning: ['Earth', 'Ice'],
    Ice:       ['Water', 'Lightning']
  };

  function getDamageMultiplier(attackerElement, defenderElement) {
    if (WEAKNESS[attackerElement]?.includes(defenderElement)) return 2.0;
    if (RESISTANCE[attackerElement]?.includes(defenderElement)) return 0.5;
    return 1.0;
  }

  function getEffectivenessText(mult) {
    if (mult >= 2.0) return '🔥 SUPER EFFECTIVE! x2';
    if (mult <= 0.5) return '🛡️ RESISTED! x0.5';
    return '';
  }

  return { getDamageMultiplier, getEffectivenessText, WEAKNESS, RESISTANCE };
})();
