(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  const USABLE_KEYS = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "w",
    "a",
    "s",
    "d",
    "Enter",
    " ",
    "Spacebar",
    "z",
    "Z",
    "x",
    "X",
    "Escape"
  ];

  function createInput({ canvas, width, height }) {
    const keys = new Set();
    const justPressed = new Set();
    let mouseClick = null;

    window.addEventListener("keydown", (e) => {
      if (USABLE_KEYS.includes(e.key)) e.preventDefault();
      if (!keys.has(e.key)) justPressed.add(e.key);
      keys.add(e.key);
    });

    window.addEventListener("keyup", (e) => keys.delete(e.key));

    canvas.addEventListener("pointerdown", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseClick = {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
      };
    });

    return {
      get mouseClick() {
        return mouseClick;
      },
      get confirm() {
        return justPressed.has("Enter") ||
          justPressed.has(" ") ||
          justPressed.has("Spacebar") ||
          justPressed.has("z") ||
          justPressed.has("Z") ||
          mouseClick;
      },
      get enter() {
        return justPressed.has("Enter");
      },
      get escape() {
        return justPressed.has("Escape");
      },
      get cancel() {
        return justPressed.has("Escape") ||
          justPressed.has("x") ||
          justPressed.has("X");
      },
      get left() {
        return justPressed.has("ArrowLeft") ||
          justPressed.has("a") ||
          justPressed.has("A");
      },
      get right() {
        return justPressed.has("ArrowRight") ||
          justPressed.has("d") ||
          justPressed.has("D");
      },
      get up() {
        return justPressed.has("ArrowUp") ||
          justPressed.has("w") ||
          justPressed.has("W");
      },
      get down() {
        return justPressed.has("ArrowDown") ||
          justPressed.has("s") ||
          justPressed.has("S");
      },
      isHeld(key) {
        return keys.has(key);
      },
      consume() {
        mouseClick = null;
        justPressed.clear();
      }
    };
  }

  window.SoulBattle.input = {
    createInput
  };
})();
