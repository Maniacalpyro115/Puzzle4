(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  window.SoulBattle.utils = {
    clamp,
    lerp,
    easeInOutCubic
  };
})();
