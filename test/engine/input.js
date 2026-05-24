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
    const activeTouches = new Map();
    const touchPressed = new Set();
    let mouseClick = null;

    const DIRECTION_KEYS = {
      left: ["ArrowLeft", "a", "A"],
      right: ["ArrowRight", "d", "D"],
      up: ["ArrowUp", "w", "W"],
      down: ["ArrowDown", "s", "S"]
    };

    canvas.style.touchAction = "none";

    window.addEventListener("keydown", (e) => {
      if (USABLE_KEYS.includes(e.key)) e.preventDefault();
      if (!keys.has(e.key)) justPressed.add(e.key);
      keys.add(e.key);
    });

    window.addEventListener("keyup", (e) => keys.delete(e.key));

    canvas.addEventListener("pointerdown", (e) => {
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
      };

      if (e.pointerType === "touch") {
        e.preventDefault();
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
        setTouchZone(e.pointerId, point);
        return;
      }

      mouseClick = point;
    });

    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "touch" || !activeTouches.has(e.pointerId)) return;

      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      setTouchZone(e.pointerId, {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
      });
    });

    canvas.addEventListener("pointerup", clearTouchZone);
    canvas.addEventListener("pointercancel", clearTouchZone);

    function clearTouchZone(e) {
      if (e.pointerType !== "touch") return;

      e.preventDefault();
      activeTouches.delete(e.pointerId);
    }

    function setTouchZone(pointerId, point) {
      const previous = activeTouches.get(pointerId);
      const zone = getTouchZone(point);

      activeTouches.set(pointerId, zone);

      if (!previous || previous.action !== zone.action) {
        touchPressed.add(zone.action);
      }
    }

    function getTouchZone({ x, y }) {
      if (x >= width * 0.62) {
        return {
          type: "button",
          action: y < height * 0.45 ? "cancel" : "confirm"
        };
      }

      const centerX = width * 0.31;
      const centerY = height * 0.68;
      const dx = x - centerX;
      const dy = y - centerY;

      if (Math.abs(dx) > Math.abs(dy)) {
        return {
          type: "direction",
          action: dx < 0 ? "left" : "right"
        };
      }

      return {
        type: "direction",
        action: dy < 0 ? "up" : "down"
      };
    }

    function touchHas(action) {
      for (const zone of activeTouches.values()) {
        if (zone.action === action) return true;
      }

      return false;
    }

    function keyHeld(key) {
      if (keys.has(key)) return true;

      for (const [action, aliases] of Object.entries(DIRECTION_KEYS)) {
        if (aliases.includes(key)) return touchHas(action);
      }

      return false;
    }

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
          touchPressed.has("confirm") ||
          mouseClick;
      },
      get cancel() {
        return justPressed.has("Escape") ||
          justPressed.has("x") ||
          justPressed.has("X") ||
          touchPressed.has("cancel");
      },
      get left() {
        return justPressed.has("ArrowLeft") ||
          justPressed.has("a") ||
          justPressed.has("A") ||
          touchPressed.has("left");
      },
      get right() {
        return justPressed.has("ArrowRight") ||
          justPressed.has("d") ||
          justPressed.has("D") ||
          touchPressed.has("right");
      },
      get up() {
        return justPressed.has("ArrowUp") ||
          justPressed.has("w") ||
          justPressed.has("W") ||
          touchPressed.has("up");
      },
      get down() {
        return justPressed.has("ArrowDown") ||
          justPressed.has("s") ||
          justPressed.has("S") ||
          touchPressed.has("down");
      },
      isHeld(key) {
        return keyHeld(key);
      },
      consume() {
        mouseClick = null;
        touchPressed.clear();
        justPressed.clear();
      }
    };
  }

  window.SoulBattle.input = {
    createInput
  };
})();
