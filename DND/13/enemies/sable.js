const SABLE_PINK = "#ff2bd6";
const SABLE_BLUE = "#22d8ff";
const SABLE_SQUARE_BOX = { x: 338, y: 148, w: 224, h: 224 };
const SABLE_WIDE_BOX = { x: 282, y: 148, w: 336, h: 224 };
const SABLE_GREEN_BOX = { x: 407, y: 217, w: 86, h: 86 };
const SABLE_FINALE_BLUE_BOX = { x: 282, y: 176, w: 336, h: 168 };
const SABLE_OUTSIDE_OFFSET = 48;
const SABLE_FINALE_GREEN_SPAWN_DISTANCE = 170;
const SABLE_FINALE_CORE_SPAWN_X = 960;
const SABLE_FINALE_CORE_TARGET_X = 814;
const SABLE_FINALE_CORE_TARGET_YS = [134, 330];

function sableClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sableRandomizedVolleyFrame(volley, cadence, duration, jitter = 5) {
  if (volley * cadence >= duration) return Number.POSITIVE_INFINITY;
  const offset = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
  return Math.max(0, volley * cadence + offset);
}

function sableLaneY(box, index, count = 5) {
  return box.y + (index + 0.5) * box.h / count;
}

function spawnSableStatus(spawnBullet, box, text, life = 42, yOffset = 18) {
  return spawnBullet({
    x: box.x + box.w / 2,
    y: box.y + yOffset,
    r: 0,
    type: "glitchLabel",
    text,
    harmless: true,
    noCull: true,
    life
  });
}

function spawnSableMarker(spawnBullet, x, y, life = 24, radius = 13) {
  return spawnBullet({
    x,
    y,
    r: radius,
    type: "glitchMarker",
    harmless: true,
    noCull: true,
    life
  });
}

function spawnSableOrb(spawnBullet, options) {
  return spawnBullet({
    r: 7,
    type: "glitchOrb",
    glitchPink: SABLE_PINK,
    glitchBlue: SABLE_BLUE,
    glitchPinkSeed: Math.random(),
    glitchBlueSeed: Math.random(),
    glitchPixelSeed: Math.random(),
    glitchHazard: true,
    ...options
  });
}

function sableCardinalTrajectory(box, index, speed) {
  const side = index % 4;
  const lane = (index * 2 + 1) % 5;
  const drift = Math.sin(index * 1.91) * 0.42;

  if (side === 0) {
    return {
      x: box.x - SABLE_OUTSIDE_OFFSET,
      y: sableLaneY(box, lane),
      vx: speed,
      vy: drift,
      angle: Math.atan2(drift, speed)
    };
  }
  if (side === 1) {
    return {
      x: box.x + box.w + SABLE_OUTSIDE_OFFSET,
      y: sableLaneY(box, lane),
      vx: -speed,
      vy: drift,
      angle: Math.atan2(drift, -speed)
    };
  }
  if (side === 2) {
    return {
      x: box.x + 24 + (index * 47) % (box.w - 48),
      y: box.y - SABLE_OUTSIDE_OFFSET,
      vx: drift,
      vy: speed,
      angle: Math.atan2(speed, drift)
    };
  }

  return {
    x: box.x + 24 + (index * 61) % (box.w - 48),
    y: box.y + box.h + SABLE_OUTSIDE_OFFSET,
    vx: drift,
    vy: -speed,
    angle: Math.atan2(-speed, drift)
  };
}

function spawnSableBorderOrb({ box, spawnBullet, index, speed = 2.6, update = null }) {
  const side = index % 4;
  const targetX = box.x + box.w / 2 + Math.sin(index * 1.77) * box.w * 0.22;
  const targetY = box.y + box.h / 2 + Math.cos(index * 1.31) * box.h * 0.22;
  let x;
  let y;

  if (side === 0) {
    x = box.x - SABLE_OUTSIDE_OFFSET;
    y = sableLaneY(box, index % 5);
  } else if (side === 1) {
    x = box.x + box.w + SABLE_OUTSIDE_OFFSET;
    y = sableLaneY(box, index % 5);
  } else if (side === 2) {
    x = box.x + 24 + (index * 53) % (box.w - 48);
    y = box.y - SABLE_OUTSIDE_OFFSET;
  } else {
    x = box.x + 24 + (index * 41) % (box.w - 48);
    y = box.y + box.h + SABLE_OUTSIDE_OFFSET;
  }

  const angle = Math.atan2(targetY - y, targetX - x);
  return spawnSableOrb(spawnBullet, {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    life: 190,
    update
  });
}

function spawnArmingSableOrb({ spawnBullet, x, y, vx, vy, delay = 10, life = 150 }) {
  return spawnSableOrb(spawnBullet, {
    x,
    y,
    vx,
    vy,
    angle: Math.atan2(vy, vx),
    life,
    harmless: true,
    alpha: 0.45,
    update: ({ bullet }) => {
      if (bullet.age <= delay) return;
      bullet.harmless = false;
      bullet.alpha = 1;
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    }
  });
}

function spawnMissingTextureShard({ box, spawnBullet, x, y, vx, vy, mode, life = 145 }) {
  return spawnSableOrb(spawnBullet, {
    x,
    y,
    vx,
    vy,
    angle: Math.atan2(vy, vx),
    harmless: true,
    alpha: 0.45,
    desyncDistance: mode === 0 ? 13 : null,
    life,
    update: ({ bullet, box: activeBox, spawnBullet: spawn }) => {
      if (bullet.age <= 8) return;

      if (bullet.age === 9) {
        bullet.harmless = false;
        bullet.alpha = 1;
      }

      if (mode === 0) {
        const phase = (bullet.age - 9) % 38;
        bullet.desyncCharge = phase >= 21 && phase < 27;
        if (phase < 27) {
          bullet.x += bullet.vx * 0.42;
          bullet.y += bullet.vy * 0.42;
        } else if (phase === 27) {
          bullet.x += bullet.vx * 13;
          bullet.y += bullet.vy * 13;
          bullet.snapFlash = 7;
        } else {
          bullet.x += bullet.vx;
          bullet.y += bullet.vy;
        }
      } else if (mode === 1) {
        if (bullet.age === 31) {
          bullet.harmless = true;
          bullet.alpha = 0;
          spawnSableMarker(spawn, bullet.x + bullet.vx * 16, bullet.y + bullet.vy * 16, 17, 10);
        }
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        if (bullet.age === 48) {
          bullet.harmless = false;
          bullet.alpha = 1;
          bullet.snapFlash = 7;
        }
      } else {
        if (bullet.age < 34 || bullet.age > 48) {
          bullet.x += bullet.vx;
          bullet.y += bullet.vy;
        }
        if (bullet.age === 34) {
          bullet.teleportX = activeBox.x + activeBox.w - (bullet.x - activeBox.x);
          bullet.teleportY = activeBox.y + activeBox.h - (bullet.y - activeBox.y);
          bullet.harmless = true;
          bullet.alpha = 0.4;
          spawnSableMarker(spawn, bullet.teleportX, bullet.teleportY, 15, 11);
        }
        if (bullet.age === 49) {
          bullet.x = bullet.teleportX;
          bullet.y = bullet.teleportY;
          bullet.harmless = false;
          bullet.alpha = 1;
          bullet.vx *= -1;
          bullet.vy *= -1;
          bullet.angle += Math.PI;
          bullet.snapFlash = 7;
        }
      }

      if (bullet.snapFlash > 0) bullet.snapFlash--;
    }
  });
}

function sableVelocityToward(x, y, targetX, targetY, speed) {
  const angle = Math.atan2(targetY - y, targetX - x);
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle
  };
}

function spawnSableZone(spawnBullet, {
  x,
  y,
  width = 52,
  height = 52,
  activationDelay = 24,
  life = 76,
  vx = 0,
  vy = 0,
  label = "CORRUPT",
  warningStyle = null,
  update = null
}) {
  return spawnBullet({
    x,
    y: y - height / 2,
    vx,
    vy,
    r: 0,
    width,
    height,
    type: "glitchZone",
    label,
    warningStyle,
    activationDelay,
    active: false,
    harmless: true,
    noCull: true,
    life,
    update: (context) => {
      const { bullet } = context;
      bullet.active = bullet.age >= bullet.activationDelay;
      bullet.harmless = !bullet.active;
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      if (typeof update === "function") update(context);
    }
  });
}

function spawnSableLink(spawnBullet, {
  x,
  y,
  x2,
  y2,
  label = "TRACE",
  life = 24,
  source = null,
  target = null
}) {
  return spawnBullet({
    x,
    y,
    x2,
    y2,
    r: 0,
    type: "glitchLink",
    label,
    source,
    target,
    harmless: true,
    noCull: true,
    life,
    update: ({ bullet }) => {
      if (bullet.source) {
        if (bullet.source.life <= 0) {
          bullet.life = 0;
          return;
        }
        bullet.x = bullet.source.x;
        bullet.y = bullet.source.y;
      }
      if (bullet.target) {
        if (bullet.target.life <= 0) {
          bullet.life = 0;
          return;
        }
        bullet.x2 = bullet.target.x;
        bullet.y2 = bullet.target.y;
      }
    }
  });
}

function spawnSableInwardCreep({ box, spawnBullet, duration }) {
  const maxThickness = Math.min(box.w, box.h) / 3;

  for (const side of ["left", "right", "top", "bottom"]) {
    const horizontalEdge = side === "left" || side === "right";
    spawnBullet({
      x: horizontalEdge
        ? side === "left" ? box.x : box.x + box.w
        : box.x + box.w / 2,
      y: horizontalEdge
        ? box.y
        : side === "top" ? box.y : box.y + box.h,
      r: 0,
      width: horizontalEdge ? 0 : box.w,
      height: horizontalEdge ? box.h : 0,
      type: "glitchCreep",
      side,
      creepProgress: 0,
      maxThickness,
      harmless: true,
      noCull: true,
      life: duration + 2,
      update: ({ bullet, box: activeBox }) => {
        const progress = sableClamp((bullet.age - 1) / Math.max(1, duration - 1), 0, 1);
        const thickness = bullet.maxThickness * progress;
        bullet.creepProgress = progress;
        bullet.harmless = thickness < 1;

        if (bullet.side === "left") {
          bullet.x = activeBox.x + thickness / 2;
          bullet.y = activeBox.y;
          bullet.width = thickness;
          bullet.height = activeBox.h;
        } else if (bullet.side === "right") {
          bullet.x = activeBox.x + activeBox.w - thickness / 2;
          bullet.y = activeBox.y;
          bullet.width = thickness;
          bullet.height = activeBox.h;
        } else if (bullet.side === "top") {
          bullet.x = activeBox.x + activeBox.w / 2;
          bullet.y = activeBox.y;
          bullet.width = activeBox.w;
          bullet.height = thickness;
        } else {
          bullet.x = activeBox.x + activeBox.w / 2;
          bullet.y = activeBox.y + activeBox.h - thickness;
          bullet.width = activeBox.w;
          bullet.height = thickness;
        }
      }
    });
  }
}

function spawnSableOutwardCreep({ box, spawnBullet, duration, warningFrames = 60 }) {
  const maxWidth = box.w * 2 / 3;
  const maxHeight = box.h * 2 / 3;

  return spawnBullet({
    x: box.x + box.w / 2,
    y: box.y + box.h / 2,
    r: 0,
    width: 0,
    height: 0,
    type: "glitchOutwardCreep",
    outward: true,
    creepProgress: 0,
    harmless: true,
    noCull: true,
    life: duration + 2,
    update: ({ bullet, box: activeBox }) => {
      const progress = sableClamp((bullet.age - 1) / Math.max(1, duration - 1), 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      bullet.creepProgress = progress;
      bullet.width = maxWidth * eased;
      bullet.height = maxHeight * eased;
      bullet.x = activeBox.x + activeBox.w / 2;
      bullet.y = activeBox.y + activeBox.h / 2 - bullet.height / 2;
      bullet.harmless = bullet.age <= warningFrames || bullet.width < 1 || bullet.height < 1;
    }
  });
}

function spawnSableAssetMismatchOrb({ spawnBullet, box, angle, speed }) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;

  return spawnSableOrb(spawnBullet, {
    x: centerX + Math.cos(angle) * 8,
    y: centerY + Math.sin(angle) * 8,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    r: 8,
    assetMismatchProjectile: true,
    life: 170,
    update: ({ bullet }) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      const margin = bullet.r + 4;
      if (
        bullet.x < box.x - margin ||
        bullet.x > box.x + box.w + margin ||
        bullet.y < box.y - margin ||
        bullet.y > box.y + box.h + margin
      ) {
        bullet.life = 0;
      }
    }
  });
}

function spawnSableModificationWindow({
  spawnBullet,
  box,
  side,
  speedMultiplier,
  bulletCount,
  index
}) {
  const width = 96;
  const height = 42;
  const fromLeft = side === "left";
  const direction = fromLeft ? 1 : -1;

  return spawnBullet({
    x: fromLeft ? box.x - width / 2 - 10 : box.x + box.w + width / 2 + 10,
    y: fromLeft ? -70 : 720,
    vx: 0,
    vy: fromLeft ? 1.45 : -1.45,
    r: 0,
    width,
    height,
    type: "glitchWindow",
    code: `MOD_NODE_${side === "left" ? "L" : "R"}${index}`,
    harmless: true,
    active: true,
    alpha: 1,
    noCull: true,
    nextReleaseAge: 60,
    windowSeenOnScreen: false,
    life: 620,
    update: ({ bullet, spawnBullet: spawn }) => {
      bullet.y += bullet.vy;
      const onScreen = bullet.y + bullet.height >= 0 && bullet.y <= 650;
      if (onScreen) bullet.windowSeenOnScreen = true;

      while (bullet.nextReleaseAge <= bullet.age) {
        if (onScreen) {
          const baseAngle = fromLeft ? 0 : Math.PI;
          const spread = bullet.bulletCount === 1 ? 0 : 0.72 / (bullet.bulletCount - 1);
          for (let shot = 0; shot < bullet.bulletCount; shot++) {
            const angle = baseAngle - 0.36 + spread * shot;
            spawnSableOrb(spawn, {
              x: bullet.x + direction * (bullet.width / 2 + 8),
              y: bullet.y + bullet.height / 2,
              vx: Math.cos(angle) * 2.8 * bullet.speedMultiplier,
              vy: Math.sin(angle) * 2.8 * bullet.speedMultiplier,
              angle,
              r: 7,
              life: 145
            });
          }
        }
        bullet.nextReleaseAge += 60;
      }

      if (bullet.windowSeenOnScreen && (bullet.y > 650 || bullet.y + bullet.height < 0)) {
        bullet.life = 0;
      }
    },
    speedMultiplier,
    bulletCount
  });
}

function spawnSableModificationTimer({ box, spawnBullet }) {
  return spawnBullet({
    x: box.x + box.w / 2,
    y: box.y + box.h / 2,
    r: 0,
    type: "glitchLabel",
    text: "CHOOSE MODIFICATION // 4.0",
    harmless: true,
    noCull: true,
    life: 242,
    update: ({ bullet }) => {
      const seconds = Math.max(0, 240 - bullet.age) / 60;
      bullet.text = `CHOOSE MODIFICATION // ${seconds.toFixed(1)}`;
    }
  });
}

function spawnSableHomingOrb({ spawnBullet, x, y, targetX, targetY, speed, phase, life = 125 }) {
  const velocity = sableVelocityToward(x, y, targetX, targetY, speed);
  return spawnSableOrb(spawnBullet, {
    x,
    y,
    vx: velocity.vx,
    vy: velocity.vy,
    angle: Math.atan2(velocity.vy, velocity.vx),
    r: 6 + Math.floor(Math.random() * 3),
    homingOrb: true,
    homingSpeed: speed,
    homingPhase: phase,
    homingTurnRate: 0.006,
    noCull: true,
    life,
    update: ({ bullet, state }) => {
      const dx = state.soul.x - bullet.x;
      const dy = state.soul.y - bullet.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const targetAngle = Math.atan2(dy, dx) + Math.sin(bullet.age * 0.12 + bullet.homingPhase) * 0.01;
      const angleDelta = Math.atan2(
        Math.sin(targetAngle - bullet.angle),
        Math.cos(targetAngle - bullet.angle)
      );
      bullet.angle += sableClamp(angleDelta, -bullet.homingTurnRate, bullet.homingTurnRate);
      bullet.vx = Math.cos(bullet.angle) * bullet.homingSpeed;
      bullet.vy = Math.sin(bullet.angle) * bullet.homingSpeed;
      if (bullet.snapFlash > 0) bullet.snapFlash--;

      const stutterPhase = (bullet.age + Math.floor(Math.abs(bullet.homingPhase) * 5)) % 18;
      const stutterFrozen = stutterPhase >= 10 && stutterPhase <= 11;
      const stutterCatchup = stutterPhase >= 12 && stutterPhase <= 14;
      const movementMultiplier = stutterFrozen ? 0 : stutterCatchup ? 5 / 3 : 1;
      bullet.desyncCharge = stutterFrozen;
      if (stutterPhase === 12) {
        bullet.snapFlash = 7;
      }
      bullet.x += bullet.vx * movementMultiplier;
      bullet.y += bullet.vy * movementMultiplier;

      if (bullet.age > 8 && distance <= state.soul.r + bullet.r + 2) {
        bullet.life = Math.min(bullet.life, 2);
      }
    }
  });
}

function triggerSableFinaleDistortion(state, duration = 18) {
  const distortion = state.sableScreenDistortion;
  if (!distortion || !distortion.unlocked) return;

  distortion.burstUntil = Math.max(distortion.burstUntil, distortion.timer + duration);
  distortion.nextBurst = Math.max(distortion.nextBurst, distortion.burstUntil + 22);
  distortion.seed = Math.random() * 10000;
}

function spawnSableFinaleShieldOrb({ box, spawnBullet, side, shotIndex }) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  const laneOffset = (shotIndex - 1) * 9 + (Math.random() - 0.5) * 4;
  const spawnDistance = SABLE_FINALE_GREEN_SPAWN_DISTANCE;
  const origin = side === 0
    ? { x: box.x - spawnDistance, y: centerY + laneOffset }
    : side === 1
      ? { x: box.x + box.w + spawnDistance, y: centerY + laneOffset }
      : side === 2
        ? { x: centerX + laneOffset, y: box.y - spawnDistance }
        : { x: centerX + laneOffset, y: box.y + box.h + spawnDistance };
  const velocity = sableVelocityToward(origin.x, origin.y, centerX, centerY, 4.3);

  return spawnSableOrb(spawnBullet, {
    x: origin.x,
    y: origin.y,
    ...velocity,
    angle: Math.atan2(velocity.vy, velocity.vx),
    r: 7,
    noCull: true,
    finaleHazard: true,
    life: 92
  });
}

function spawnSableFinalePurpleHorizontal({ box, spawnBullet, volley }) {
  const lineYs = [
    box.y + box.h * 0.18,
    box.y + box.h * 0.5,
    box.y + box.h * 0.82
  ];
  const lane = volley % lineYs.length;
  const fromLeft = volley % 2 === 0;
  const teleports = volley % 2 === 1;
  const adjacentLane = lane === 0
    ? 1
    : lane === lineYs.length - 1
      ? lineYs.length - 2
      : volley % 2 === 0 ? lane - 1 : lane + 1;

  return spawnSableOrb(spawnBullet, {
    x: fromLeft ? box.x - SABLE_OUTSIDE_OFFSET : box.x + box.w + SABLE_OUTSIDE_OFFSET,
    y: lineYs[lane],
    vx: fromLeft ? 2 : -2,
    vy: 0,
    angle: fromLeft ? 0 : Math.PI,
    r: 7,
    noCull: true,
    finaleHazard: true,
    finalePurpleHorizontal: true,
    finalePurpleLane: lane,
    finalePurpleTeleportLane: teleports ? adjacentLane : null,
    life: 270,
    update: ({ bullet, spawnBullet: spawn }) => {
      const warningAge = 58;
      const teleportAge = 70;

      if (Number.isInteger(bullet.finalePurpleTeleportLane) && bullet.age === warningAge) {
        bullet.harmless = true;
        bullet.alpha = 0.4;
        bullet.desyncCharge = true;
        spawnSableMarker(spawn, bullet.x, lineYs[bullet.finalePurpleTeleportLane], 18, 13);
      }

      if (Number.isInteger(bullet.finalePurpleTeleportLane) && bullet.age === teleportAge) {
        bullet.y = lineYs[bullet.finalePurpleTeleportLane];
        bullet.harmless = false;
        bullet.alpha = 1;
        bullet.desyncCharge = false;
        bullet.snapFlash = 8;
      }

      if (
        !Number.isInteger(bullet.finalePurpleTeleportLane) ||
        bullet.age < warningAge ||
        bullet.age >= teleportAge
      ) {
        bullet.x += bullet.vx;
      }

      if (bullet.snapFlash > 0) bullet.snapFlash--;
    }
  });
}

function spawnSableFinalePurpleVertical({ box, spawnBullet, volley, fromTop, x }) {
  const speed = 3;

  return spawnSableOrb(spawnBullet, {
    x,
    y: fromTop ? box.y - SABLE_OUTSIDE_OFFSET : box.y + box.h + SABLE_OUTSIDE_OFFSET,
    vx: Math.sin(volley * 1.73) * 0.18,
    vy: fromTop ? speed : -speed,
    angle: fromTop ? Math.PI / 2 : -Math.PI / 2,
    r: 6,
    noCull: true,
    finaleHazard: true,
    finalePurpleVertical: true,
    finalePurpleStutterOffset: volley * 5,
    life: 155,
    update: ({ bullet }) => {
      const phase = (bullet.age + bullet.finalePurpleStutterOffset) % 28;
      const frozen = phase >= 14 && phase <= 17;
      const catchup = phase >= 18 && phase <= 19;
      const movementMultiplier = frozen ? 0 : catchup ? 1.5 : 1;

      bullet.desyncCharge = frozen;
      if (phase === 18) bullet.snapFlash = 6;
      bullet.x += bullet.vx * movementMultiplier;
      bullet.y += bullet.vy * movementMultiplier;
      if (bullet.snapFlash > 0) bullet.snapFlash--;
    }
  });
}

function spawnSableFinaleJumpWall({ box, spawnBullet, volley }) {
  const speed = 4.5;
  const spawnDistance = 96;
  const rowSpacing = 14;
  const bulletRadius = 8;
  const gapCenter = box.y + box.h - 34;
  const gapRadius = 14 * 1.1;
  const desiredOpenPixels = 32;
  const originalOpenPixels = rowSpacing * 3 - bulletRadius * 2;
  const gapEdgeShift = (desiredOpenPixels - originalOpenPixels) / 2;
  const removedTopIndex = 1 + volley % 6;

  for (const fromLeft of [true, false]) {
    const x = fromLeft ? box.x - spawnDistance : box.x + box.w + spawnDistance;
    const vx = fromLeft ? speed : -speed;

    let rowIndex = 0;
    for (let y = box.y + 10; y <= box.y + box.h - 10; y += rowSpacing, rowIndex++) {
      if (Math.abs(y - gapCenter) <= gapRadius) continue;
      if (y < gapCenter && rowIndex === removedTopIndex) continue;

      const adjustedY = y < gapCenter ? y - gapEdgeShift : y + gapEdgeShift;

      spawnSableOrb(spawnBullet, {
        x,
        y: adjustedY,
        vx,
        vy: 0,
        angle: fromLeft ? 0 : Math.PI,
        r: bulletRadius,
        noCull: true,
        finaleHazard: true,
        finaleWall: true,
        finaleWallVolley: volley,
        finaleWallRemovedTopIndex: removedTopIndex,
        life: 130
      });
    }
  }
}

function spawnSableFinaleDecayCore({ spawnBullet, coreIndex }) {
  const targetY = SABLE_FINALE_CORE_TARGET_YS[coreIndex];
  const approachFrames = 210;
  const decayCadence = 42;
  const decayRadii = [34, 32, 30, 28, 26, 24, 22, 20, 18, 15, 12];
  const shardCounts = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
  const shardRadii = [12, 11, 10, 9, 8, 7, 6, 5, 4.5, 4, 3.5];
  const shardSpeedMultiplier = 1.3;
  const shardSpeeds = [1.45, 1.65, 1.85, 2.05, 2.25, 2.45, 2.7, 3, 3.15, 3.3, 3.45]
    .map((speed) => speed * shardSpeedMultiplier);

  return spawnSableOrb(spawnBullet, {
    x: SABLE_FINALE_CORE_SPAWN_X,
    y: targetY,
    vx: 0,
    vy: 0,
    angle: Math.PI,
    r: 36,
    harmless: true,
    noCull: true,
    finaleHazard: true,
    finaleCore: true,
    finaleCoreIndex: coreIndex,
    life: 720,
    update: ({ bullet, spawnBullet: spawn }) => {
      if (bullet.age < approachFrames) {
        const progress = sableClamp(bullet.age / approachFrames, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        bullet.x = SABLE_FINALE_CORE_SPAWN_X + (SABLE_FINALE_CORE_TARGET_X - SABLE_FINALE_CORE_SPAWN_X) * eased;
        bullet.y = targetY;
        bullet.desyncCharge = bullet.age % 34 >= 27;
        if (bullet.age % 34 === 0) bullet.snapFlash = 6;
        if (bullet.snapFlash > 0) bullet.snapFlash--;
        return;
      }

      const decayAge = bullet.age - approachFrames;
      if (decayAge % decayCadence !== 0) {
        if (bullet.snapFlash > 0) bullet.snapFlash--;
        return;
      }

      const decayStage = decayAge / decayCadence;
      if (decayStage >= decayRadii.length) return;

      bullet.x = SABLE_FINALE_CORE_TARGET_X;
      bullet.y = targetY;
      bullet.r = decayRadii[decayStage];
      bullet.snapFlash = 14;
      const count = shardCounts[decayStage];
      const radius = shardRadii[decayStage];
      const speed = shardSpeeds[decayStage];
      const angleOffset = decayStage * 0.29 + coreIndex * Math.PI / count;
      spawnSableMarker(spawn, bullet.x, bullet.y, 20, bullet.r + 8);

      for (let index = 0; index < count; index++) {
        const angle = angleOffset + index * Math.PI * 2 / count;
        spawnSableOrb(spawn, {
          x: bullet.x,
          y: bullet.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          angle,
          r: radius,
          noCull: true,
          finaleHazard: true,
          finaleShard: true,
          finaleSplitStage: decayStage,
          finaleCoreIndex: coreIndex,
          finaleDecayGeneration: 0,
          finaleShardSplitAge: 54 + index % 4 * 4,
          snapFlash: 9,
          life: 320 + decayStage * 8,
          update: ({ bullet: shard, spawnBullet: splitSpawn }) => {
            shard.x += shard.vx;
            shard.y += shard.vy;
            if (shard.snapFlash > 0) shard.snapFlash--;
            if (shard.age !== shard.finaleShardSplitAge) return;

            const baseAngle = Math.atan2(shard.vy, shard.vx);
            const childSpeed = Math.hypot(shard.vx, shard.vy) * 1.18;
            const childRadius = Math.max(2.5, shard.r * 0.56);
            spawnSableMarker(splitSpawn, shard.x, shard.y, 12, shard.r + 3);

            for (const branch of [-1, 1]) {
              const childAngle = baseAngle + branch * 0.27;
              spawnSableOrb(splitSpawn, {
                x: shard.x,
                y: shard.y,
                vx: Math.cos(childAngle) * childSpeed,
                vy: Math.sin(childAngle) * childSpeed,
                angle: childAngle,
                r: childRadius,
                noCull: true,
                finaleHazard: true,
                finaleShard: true,
                finaleShardChild: true,
                finaleSplitStage: decayStage,
                finaleCoreIndex: coreIndex,
                finaleDecayGeneration: 1,
                snapFlash: 8,
                life: 320 + decayStage * 6
              });
            }

            shard.life = 0;
          }
        });
      }
    }
  });
}

window.ENEMY_DATA = {
  name: "SABLE",

  sprite: "sprites/enemies/sable/default/default_0001.png",
  defaultAnimation: {
    frames: [
      "sprites/enemies/sable/default/default_0001.png",
      "sprites/enemies/sable/default/default_0002.png",
      "sprites/enemies/sable/default/default_0003.png",
      "sprites/enemies/sable/default/default_0004.png",
      "sprites/enemies/sable/default/default_0005.png",
      "sprites/enemies/sable/default/default_0006.png",
      "sprites/enemies/sable/default/default_0007.png",
      "sprites/enemies/sable/default/default_0008.png",
      "sprites/enemies/sable/default/default_0009.png",
      "sprites/enemies/sable/default/default_0010.png"
    ],
    fps: 6
  },
  spriteBob: 0,
  spriteSizes: { default: 128 },
  spritePositions: { default: { x: 750, y: 168 } },
  spriteFlips: { default: { x: true } },
  preserveSpriteAspectRatio: true,

  music: {
    src: "sounds/sable.wav",
    loopStart: 8.102,
    loopEnd: 186.117,
  },
  maxHP: 1,
  hitSprite: "default",

  introMessage: "* SABLE fails to load correctly.",
  winMessage: "OBISCWTPDNDWMFT",
  defeatDialog: "I'm Sable",
  check: "SABLE - A young woman caught between frames. Her attacks rewrite themselves.",
  actMessage: "* You inspect SABLE. The debugger returns an impossible result.",

  mercyFailure: "* SABLE rejects the request: ACCESS_DENIED.",
  mercySuccess: "* The party cleanses the system.",
  mercyWinMessage: "OBISCWTPDNDWMFT",
  systemPatchEnemyDialog: ":(",
  systemPatchMercyFadeDuration: 150,
  postFinaleActs: [{
    name: "System Patch",
    description: "Fix any bugs and glitches in system.",
    tpCost: 100,
    target: "none",
    effect: "teamMercy",
    requiresAllPartyAlive: true,
    teamAction: true
  }],

  enemyDialog: [],

  items: [
    { name: "Patch Note", heal: 18, quantity: 2 },
    { name: "Cold Reboot", heal: 28, quantity: 1 },
    { name: "Clean Cache", heal: 22, quantity: 1 }
  ],

  battleDialog: [
    "* A glitch springs to life.",
    "* The world distorts around you.",
    "* SABLE fades in and out of existence.",
    "* The anomaly dances around.",
    "* Reality struggles to keep up.",
    "* SABLE desynchronizes from the canvas.",
    "* SABLE exists in several places at once.",
    "* Reality buffers.",
    "* Static crawls across your vision.",
    "* The battlefield skips ahead.",
    "* The air crackles with bad data."
  ],

  turns: [
    {
      loop: false,
      type: "normal",
      duration: 620,
      damage: 11,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "I'm SABLE!",
      setup: function setupDesyncPacketLoss({ state }) {
        state.sableMixedVolley = 0;
        state.sableMixedNextVolleyFrame = 0;
      },
      pattern: function desyncedPacketLoss({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "DESYNC // PACKET LOSS", 54);
        if (t < state.sableMixedNextVolleyFrame) return;

        const volley = state.sableMixedVolley++;
        // The two original attacks averaged one bullet every 29 frames.
        // Scale that rate from 40% at the opening to 160% at the ending.
        const progress = t / 619;
        const density = 0.4 + (1.6 - 0.4) * progress;
        const cadence = Math.round(29 / density);
        state.sableMixedNextVolleyFrame = t + cadence;

        const isDesyncBullet = volley % 2 === 0;
        const trajectory = sableCardinalTrajectory(box, volley, isDesyncBullet ? 3.05 : 2.95);

        if (isDesyncBullet) {
          spawnSableOrb(spawnBullet, {
            ...trajectory,
            desyncDistance: 23,
            life: 190,
            update: ({ bullet }) => {
              const phase = bullet.age % 48;
              bullet.desyncCharge = phase >= 24 && phase < 32;

              if (phase < 32) {
                bullet.x += bullet.vx * 0.34;
                bullet.y += bullet.vy * 0.34;
              } else if (phase === 32) {
                bullet.x += bullet.vx * 23;
                bullet.y += bullet.vy * 23;
                bullet.snapFlash = 10;
              } else {
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
              }

              if (bullet.snapFlash > 0) bullet.snapFlash--;
            }
          });
          return;
        }

        spawnSableOrb(spawnBullet, {
          ...trajectory,
          life: 205,
          update: ({ bullet, spawnBullet: spawn }) => {
            if (bullet.age === 27) {
              bullet.packetMissing = true;
              bullet.harmless = true;
              bullet.alpha = 0;
              spawnSableMarker(
                spawn,
                bullet.x + bullet.vx * 30,
                bullet.y + bullet.vy * 30,
                32,
                12
              );
            }

            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            if (bullet.age === 56) {
              bullet.packetMissing = false;
              bullet.harmless = false;
              bullet.alpha = 1;
              bullet.snapFlash = 10;
            }

            if (bullet.snapFlash > 0) bullet.snapFlash--;
          }
        });
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 570,
      damage: 11,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "I'm still SABLE.",
      setup: function setupCoordinateCorruption({ state }) {
        state.sableCoordinateVolley = 0;
        state.sableCoordinateNextVolleyFrame = 0;
      },
      pattern: function corruptedCoordinates({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "COORDINATE CORRUPTION", 58);
        if (t < state.sableCoordinateNextVolleyFrame) return;

        const volley = state.sableCoordinateVolley++;
        state.sableCoordinateNextVolleyFrame = sableRandomizedVolleyFrame(
          state.sableCoordinateVolley,
          24,
          570
        );
        const trajectory = sableCardinalTrajectory(box, volley, 2.65);

        spawnSableOrb(spawnBullet, {
          ...trajectory,
          life: 205,
          update: ({ bullet, box: activeBox, spawnBullet: spawn }) => {
            if (bullet.age < 44 || bullet.age > 64) {
              bullet.x += bullet.vx;
              bullet.y += bullet.vy;
            }

            if (bullet.age === 44) {
              bullet.teleportX = activeBox.x + activeBox.w - (bullet.x - activeBox.x);
              bullet.teleportY = activeBox.y + activeBox.h - (bullet.y - activeBox.y);
              bullet.harmless = true;
              bullet.alpha = 0.42;
              spawnSableMarker(spawn, bullet.teleportX, bullet.teleportY, 23, 15);
            }

            if (bullet.age === 65) {
              bullet.x = bullet.teleportX;
              bullet.y = bullet.teleportY;
              bullet.harmless = false;
              bullet.alpha = 1;
              bullet.vy *= -1;
              bullet.angle += Math.PI;
              bullet.snapFlash = 8;
            }

            if (bullet.snapFlash > 0) bullet.snapFlash--;
          }
        });
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 590,
      damage: 12,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "SABLE!",
      setup: function setupRollback({ state }) {
        state.sableRollbackActive = false;
        state.sableRollbackVolley = 0;
      },
      pattern: function rollback({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "RECORDING STATE...", 52);
        if (t === 178) spawnSableStatus(spawnBullet, box, "ROLLBACK IN 3...2...1", 34);
        if (t === 204) {
          state.sableRollbackActive = true;
        }
        if (t === 266) {
          state.sableRollbackActive = false;
          spawnSableStatus(spawnBullet, box, "STATE RESTORED", 34);
        }

        if ((t < 184 || t > 276) && t % 16 === 0) {
          const volley = state.sableRollbackVolley++;
          spawnSableBorderOrb({
            box,
            spawnBullet,
            index: volley,
            speed: 2.8,
            update: ({ bullet, state: activeState }) => {
              bullet.history = bullet.history || [];

              if (activeState.sableRollbackActive && bullet.history.length > 0) {
                const previous = bullet.history.pop();
                bullet.x = previous.x;
                bullet.y = previous.y;
                bullet.rollback = true;
                return;
              }

              bullet.rollback = false;
              bullet.history.push({ x: bullet.x, y: bullet.y });
              if (bullet.history.length > 84) bullet.history.shift();
              bullet.x += bullet.vx;
              bullet.y += bullet.vy;
            }
          });
        }
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 570,
      damage: 12,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "SABLE SABLE SABLE.",
      setup: function setupScreenTear({ state }) {
        state.sableTearVolley = 0;
      },
      pattern: function screenTear({ t, box, state, spawnBullet }) {
        const tearEvents = [
          { warn: 52, apply: 82, lane: 0, dx: 48 },
          { warn: 170, apply: 200, lane: 2, dx: -52 },
          { warn: 288, apply: 318, lane: 1, dx: 46 },
          { warn: 406, apply: 436, lane: 0, dx: -44 }
        ];

        for (const event of tearEvents) {
          const bandHeight = box.h / 3;
          const top = box.y + event.lane * bandHeight;

          if (t === event.warn) {
            spawnBullet({
              x: box.x + box.w / 2,
              y: top,
              r: 0,
              width: box.w,
              height: bandHeight,
              shift: event.dx,
              type: "glitchTear",
              harmless: true,
              noCull: true,
              activationDelay: 31,
              life: 68,
              update: ({ bullet }) => {
                bullet.active = bullet.age >= bullet.activationDelay;
                bullet.harmless = !bullet.active;
              }
            });
          }

          if (t === event.apply) {
            for (const bullet of state.bullets) {
              if (!bullet.glitchHazard || bullet.y < top || bullet.y > top + bandHeight) continue;
              bullet.x = sableClamp(bullet.x + event.dx, box.x + bullet.r, box.x + box.w - bullet.r);
            }

            if (state.soul.y >= top && state.soul.y <= top + bandHeight) {
              state.soul.x = sableClamp(
                state.soul.x + event.dx,
                box.x + state.soul.r,
                box.x + box.w - state.soul.r
              );
            }
          }
        }

        if (t % 18 === 0) {
          const volley = state.sableTearVolley++;
          const trajectory = sableCardinalTrajectory(box, volley, 2.9);
          spawnSableOrb(spawnBullet, {
            ...trajectory,
            life: 175
          });
        }
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 580,
      damage: 12,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "SABLE?",
      setup: function setupMissingTexture({ state }) {
        state.sableTextureVolley = 0;
      },
      pattern: function missingTexture({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "MISSING_TEXTURE.PNG", 58);
        if (t % 64 !== 0) return;

        const volley = state.sableTextureVolley++;

        for (let blockIndex = 0; blockIndex < 2; blockIndex++) {
          const fromLeft = (volley + blockIndex) % 2 === 0;
          const x = fromLeft ? box.x + 54 : box.x + box.w - 54;
          const y = sableLaneY(box, (volley * 2 + blockIndex * 3) % 5) - 22;
          const mode = (volley + blockIndex) % 3;

          spawnBullet({
            x,
            y,
            r: 0,
            width: 44,
            height: 44,
            type: "glitchBlock",
            harmless: true,
            noCull: true,
            life: 34,
            update: ({ bullet, box: activeBox, spawnBullet: spawn }) => {
              if (bullet.age !== 31) return;

              const shardCount = 6;
              const speed = 3.05 + blockIndex * 0.2;
              const offset = volley * 0.47 + blockIndex * Math.PI / shardCount;

              for (let shardIndex = 0; shardIndex < shardCount; shardIndex++) {
                const angle = offset + shardIndex * Math.PI * 2 / shardCount;
                spawnMissingTextureShard({
                  box: activeBox,
                  spawnBullet: spawn,
                  x: bullet.x,
                  y: bullet.y + bullet.height / 2,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  mode,
                  life: 150
                });
              }

              bullet.life = 0;
            }
          });
        }
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 590,
      damage: 12,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "SABLESABLE",
      setup: function setupLagSpike({ state }) {
        state.sableLagMode = "normal";
        state.sableLagVolley = 0;
      },
      pattern: function lagSpike({ t, box, state, spawnBullet }) {
        const freezeStarts = [118, 334];
        const freezeEnds = [164, 380];

        if (freezeStarts.includes(t)) {
          state.sableLagMode = "frozen";
          spawnSableStatus(spawnBullet, box, "LAG SPIKE // SOUL INPUT OK", 46);
        }
        if (freezeEnds.includes(t)) {
          state.sableLagMode = "catchup";
          spawnSableStatus(spawnBullet, box, "CATCHING UP...", 24);
        }
        if (freezeEnds.some((end) => t === end + 22)) state.sableLagMode = "normal";

        if (t % 14 === 0 && state.sableLagMode !== "frozen") {
          const volley = state.sableLagVolley++;
          spawnSableBorderOrb({
            box,
            spawnBullet,
            index: volley,
            speed: 2.55,
            update: ({ bullet, state: activeState }) => {
              const multiplier = activeState.sableLagMode === "frozen"
                ? 0
                : activeState.sableLagMode === "catchup"
                  ? 3.25
                  : 1;
              bullet.lagFrozen = multiplier === 0;
              bullet.x += bullet.vx * multiplier;
              bullet.y += bullet.vy * multiplier;
            }
          });
        }
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 590,
      damage: 12,
      box: SABLE_WIDE_BOX,
      enemyDialog: "HI!",
      setup: function setupErrorWindows({ state }) {
        state.sableErrorVolley = 0;
      },
      pattern: function errorWindows({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "FATAL ERROR // 0x003F", 52);
        if (t % 84 !== 0) return;

        const volley = state.sableErrorVolley++;

        for (let windowIndex = 0; windowIndex < 2; windowIndex++) {
          const fromLeft = (volley + windowIndex) % 2 === 0;
          const lane = (volley + windowIndex * 2) % 4;
          const vx = fromLeft ? 2.65 : -2.65;

          spawnBullet({
            x: fromLeft
              ? box.x - SABLE_OUTSIDE_OFFSET
              : box.x + box.w + SABLE_OUTSIDE_OFFSET,
            y: sableLaneY(box, lane, 4) - 21,
            vx,
            vy: 0,
            r: 0,
            width: 96,
            height: 42,
            type: "glitchWindow",
            code: `ERROR_0x${(63 + volley * 17 + windowIndex * 41).toString(16).toUpperCase().padStart(4, "0")}`,
            harmless: true,
            active: false,
            alpha: 0.38,
            noCull: true,
            life: 190,
            update: ({ bullet, spawnBullet: spawn }) => {
              const warning = bullet.age <= 24;
              bullet.active = !warning;
              bullet.harmless = warning;
              bullet.alpha = warning ? 0.38 + bullet.age / 24 * 0.34 : 1;
              bullet.x += bullet.vx * (warning ? 0.45 : 1);

              if (bullet.age === 62) {
                const baseAngle = bullet.vx > 0 ? 0 : Math.PI;
                for (const spread of [-0.42, 0, 0.42]) {
                  const angle = baseAngle + spread;
                  spawnArmingSableOrb({
                    spawnBullet: spawn,
                    x: bullet.x,
                    y: bullet.y + bullet.height / 2,
                    vx: Math.cos(angle) * 3.05,
                    vy: Math.sin(angle) * 3.05,
                    delay: 7,
                    life: 135
                  });
                }
              }
            }
          });
        }
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 600,
      damage: 12,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "sable",
      setup: function setupCloneSoul({ box, state, spawnBullet }) {
        state.sableSoulHistory = [];
        state.sableCloneVolley = 0;

        for (const clone of [
          { delay: 11, color: SABLE_BLUE },
          { delay: 22, color: SABLE_PINK }
        ]) {
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y + box.h / 2,
            r: 7,
            type: "glitchSoul",
            color: clone.color,
            delay: clone.delay,
            harmless: true,
            noCull: true,
            hitCooldown: 0,
            hitFlash: 0,
            life: 610,
            update: ({ bullet, state: activeState }) => {
              if (bullet.hitCooldown > 0) bullet.hitCooldown--;
              if (bullet.hitFlash > 0) bullet.hitFlash--;
              const history = activeState.sableSoulHistory || [];
              const target = history[Math.max(0, history.length - 1 - bullet.delay)];
              if (!target) return;
              bullet.x = target.x;
              bullet.y = target.y;
            }
          });
        }
      },
      pattern: function cloneSoul({ t, box, state, spawnBullet }) {
        state.sableSoulHistory.push({ x: state.soul.x, y: state.soul.y });
        if (state.sableSoulHistory.length > 80) state.sableSoulHistory.shift();
        if (t === 0) spawnSableStatus(spawnBullet, box, "SOUL INSTANCE x3", 52);

        const clones = state.bullets.filter((bullet) => bullet.type === "glitchSoul");
        const hazards = state.bullets.filter((bullet) => (
          bullet.type === "glitchOrb" &&
          !bullet.harmless &&
          !bullet.cloneHitPulse &&
          bullet.life > 0
        ));

        for (const clone of clones) {
          if (clone.hitCooldown > 0) continue;
          const hit = hazards.find((bullet) => (
            Math.hypot(bullet.x - clone.x, bullet.y - clone.y) < bullet.r + clone.r
          ));
          if (!hit) continue;

          hit.life = 0;
          clone.hitCooldown = 50;
          clone.hitFlash = 14;
          spawnSableOrb(spawnBullet, {
            x: state.soul.x,
            y: state.soul.y,
            vx: 0,
            vy: 0,
            r: 9,
            cloneHitPulse: true,
            snapFlash: 10,
            life: 2
          });
        }

        if (t % 50 !== 0 || t < 30) return;

        const targets = [
          { x: state.soul.x, y: state.soul.y },
          ...state.bullets
            .filter((bullet) => bullet.type === "glitchSoul")
            .map((bullet) => ({ x: bullet.x, y: bullet.y }))
        ];
        const volley = state.sableCloneVolley++;

        targets.forEach((target, targetIndex) => {
          const fromLeft = (volley + targetIndex) % 2 === 0;
          const x = fromLeft
            ? box.x - SABLE_OUTSIDE_OFFSET
            : box.x + box.w + SABLE_OUTSIDE_OFFSET;
          const y = box.y + 20 + ((volley * 43 + targetIndex * 61) % (box.h - 40));
          const angle = Math.atan2(target.y - y, target.x - x);
          spawnSableOrb(spawnBullet, {
            x,
            y,
            vx: Math.cos(angle) * 2.45,
            vy: Math.sin(angle) * 2.45,
            angle,
            life: 175
          });
        });
      }
    },

    {
      loop: false,
      type: "normal",
      duration: 640,
      damage: 13,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "SABLE...",
      setup: function setupMemoryLeak({ state }) {
        state.sableMemoryVolley = 0;
      },
      pattern: function memoryLeak({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "MEMORY TRAILS // MOVE = DAMAGE", 68);

        if (t % 30 === 0) {
          const volley = state.sableMemoryVolley++;
          spawnSableBorderOrb({
            box,
            spawnBullet,
            index: volley,
            speed: 2.45,
            update: ({ bullet, spawnBullet: spawn }) => {
              bullet.x += bullet.vx;
              bullet.y += bullet.vy;

              if (bullet.age % 6 === 0) {
                spawnBullet({
                  x: bullet.x,
                  y: bullet.y,
                  r: 4,
                  type: "glitchGarbage",
                  color: bullet.age % 14 === 0 ? SABLE_BLUE : SABLE_PINK,
                  harmless: false,
                  damageOnlyWhileMoving: true,
                  noCull: true,
                  life: 205,
                  update: ({ bullet: garbage }) => {
                    if (!garbage.armed) return;
                    if (garbage.age < garbage.activateAtAge) return;

                    if (!garbage.activated) {
                      garbage.activated = true;
                      garbage.harmless = false;
                      garbage.damageOnlyWhileMoving = false;
                      garbage.type = "glitchOrb";
                      garbage.r = 6;
                    }

                    garbage.x += garbage.vx;
                    garbage.y += garbage.vy;
                  }
                });
              }
            }
          });
        }

        const cycle = t % 210;
        if (cycle === 142) {
          const candidates = state.bullets.filter((bullet) => (
            bullet.type === "glitchGarbage" &&
            !bullet.armed &&
            Math.hypot(bullet.x - state.soul.x, bullet.y - state.soul.y) > 46
          ));

          candidates.filter((_, index) => index % Math.max(1, Math.ceil(candidates.length / 5)) === 0)
            .slice(0, 5)
            .forEach((bullet) => {
              const angle = Math.atan2(
                box.y + box.h / 2 - bullet.y,
                box.x + box.w / 2 - bullet.x
              );
              bullet.armed = true;
              bullet.activateAtAge = bullet.age + 28;
              bullet.vx = Math.cos(angle) * 2.45;
              bullet.vy = Math.sin(angle) * 2.45;
              bullet.life = Math.max(bullet.life, 120);
            });

          spawnSableStatus(spawnBullet, box, "GARBAGE COLLECTION", 46);
        }

        if (cycle === 170) {
          for (const bullet of state.bullets) {
            if (bullet.type === "glitchGarbage" && !bullet.armed) bullet.life = 0;
          }
        }
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 560,
      damage: 11,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "me llamo SABLE",
      setup: function setupInvertedPacketLoss({ box, state, spawnBullet }) {
        state.sableInvertControls = true;
        state.sableGlitchedSoul = true;
        state.sableInvertedPacketVolley = 0;
        spawnSableInwardCreep({ box, spawnBullet, duration: 560 });
      },
      pattern: function invertedPacketLoss({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "INPUT MAP: L<>R  U<>D", 68);
        if (t % 28 !== 0) return;

        const volley = state.sableInvertedPacketVolley++;
        const trajectory = sableCardinalTrajectory(box, volley, 2.95);

        spawnSableOrb(spawnBullet, {
          ...trajectory,
          life: 205,
          update: ({ bullet, spawnBullet: spawn }) => {
            if (bullet.age === 27) {
              bullet.packetMissing = true;
              bullet.harmless = true;
              bullet.alpha = 0;
              spawnSableMarker(
                spawn,
                bullet.x + bullet.vx * 30,
                bullet.y + bullet.vy * 30,
                32,
                12
              );
            }

            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            if (bullet.age === 56) {
              bullet.packetMissing = false;
              bullet.harmless = false;
              bullet.alpha = 1;
              bullet.snapFlash = 10;
            }

            if (bullet.snapFlash > 0) bullet.snapFlash--;
          }
        });
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 650,
      damage: 13,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "S A B L E",
      setup: function setupPredictionError({ state }) {
        state.sablePredictionVolley = 0;
        state.sablePredictionPrevSoul = { x: state.soul.x, y: state.soul.y };
      },
      pattern: function predictionError({ t, box, state, spawnBullet }) {
        const previous = state.sablePredictionPrevSoul;
        const soulDx = state.soul.x - previous.x;
        const soulDy = state.soul.y - previous.y;
        state.sablePredictionPrevSoul = { x: state.soul.x, y: state.soul.y };

        if (t === 0) spawnSableStatus(spawnBullet, box, "PREDICTION MODEL: UNSTABLE", 62);

        if (t % 28 === 0) {
          const volley = state.sablePredictionVolley++;
          for (let shot = 0; shot < 2; shot++) {
            const trajectory = sableCardinalTrajectory(box, volley * 2 + shot, 0);
            const predictedX = sableClamp(state.soul.x + soulDx * 11, box.x + 14, box.x + box.w - 14);
            const predictedY = sableClamp(state.soul.y + soulDy * 11, box.y + 14, box.y + box.h - 14);
            const corrupt = (volley + shot) % 3 === 1;
            const corruptSign = (volley + shot) % 2 === 0 ? 1 : -1;
            const actualX = sableClamp(predictedX + (corrupt ? corruptSign * 28 : 0), box.x + 12, box.x + box.w - 12);
            const actualY = sableClamp(predictedY + (corrupt ? -corruptSign * 22 : 0), box.y + 12, box.y + box.h - 12);

            spawnSableMarker(spawnBullet, predictedX, predictedY, 24, 10);
            spawnSableLink(spawnBullet, {
              x: trajectory.x,
              y: trajectory.y,
              x2: predictedX,
              y2: predictedY,
              label: corrupt ? "PREDICT?" : "PREDICT",
              life: 20
            });
            spawnSableOrb(spawnBullet, {
              x: trajectory.x,
              y: trajectory.y,
              vx: 0,
              vy: 0,
              angle: Math.atan2(predictedY - trajectory.y, predictedX - trajectory.x),
              predictedX,
              predictedY,
              actualX,
              actualY,
              predictionError: corrupt,
              harmless: true,
              alpha: 0.42,
              life: 180,
              update: ({ bullet }) => {
                if (bullet.age === 19) {
                  const velocity = sableVelocityToward(
                    bullet.x,
                    bullet.y,
                    bullet.actualX,
                    bullet.actualY,
                    3.45
                  );
                  Object.assign(bullet, velocity, { harmless: false, alpha: 1, snapFlash: 9 });
                }
                if (bullet.age < 19) return;
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
                if (bullet.snapFlash > 0) bullet.snapFlash--;
              }
            });
          }
        }

        if (t % 84 === 42) {
          spawnSableZone(spawnBullet, {
            x: state.soul.x,
            y: state.soul.y,
            width: 54,
            height: 54,
            activationDelay: 27,
            life: 70,
            label: "BAD PREDICTION"
          });
        }
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 660,
      damage: 13,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "I feel tingly",
      setup: function setupDefragmentation({ state }) {
        state.sableDefragCycle = 0;
        state.sableDefragVolley = 0;
        state.sableDefragNextVolleyFrame = 11;
      },
      pattern: function defragmentation({ t, box, state, spawnBullet }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "DEFRAGMENTING ARENA", 60);

        if (t % 165 === 0) {
          const safeRoute = [5, 2, 7, 10, 13, 8, 6, 9];
          const safeCell = safeRoute[state.sableDefragCycle++ % safeRoute.length];
          const cellWidth = box.w / 4;
          const cellHeight = box.h / 4;

          for (let cell = 0; cell < 16; cell++) {
            if (cell === safeCell) continue;
            const column = cell % 4;
            const row = Math.floor(cell / 4);
            spawnSableZone(spawnBullet, {
              x: box.x + (column + 0.5) * cellWidth,
              y: box.y + (row + 0.5) * cellHeight,
              width: cellWidth,
              height: cellHeight,
              activationDelay: 121,
              life: 161,
              label: `SECTOR ${cell.toString(16).toUpperCase()}`,
              warningStyle: "defrag"
            });
          }
          spawnBullet({
            x: box.x + (safeCell % 4 + 0.5) * cellWidth,
            y: box.y + (Math.floor(safeCell / 4) + 0.5) * cellHeight,
            r: 20,
            type: "glitchMarker",
            safeTarget: true,
            harmless: true,
            noCull: true,
            life: 125
          });
        }

        if (t >= state.sableDefragNextVolleyFrame) {
          state.sableDefragNextVolleyFrame += 24.2;
          spawnSableBorderOrb({
            box,
            spawnBullet,
            index: state.sableDefragVolley++,
            speed: 3.15
          });
        }
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 680,
      damage: 14,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "Have you seen my DANDELION?",
      setup: function setupAssetMismatch({ box, state, spawnBullet }) {
        state.sableAssetMismatchActive = false;
        state.sableAssetMismatchSwitchFrames = 0;
        state.sableSoulModeTransition = false;
        state.sableAssetMismatchVolley = 0;
        state.sableAssetMismatchAngle = 0;
        state.sableAssetMismatchNextSpawnFrame = 60;
        spawnSableOutwardCreep({ box, spawnBullet, duration: 680, warningFrames: 60 });
      },
      pattern: function assetMismatch({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "CORRUPTION ORIGIN: CENTER", 58);

        if (t === 60) {
          playSound(sounds.glitch1);
          state.sableAssetMismatchActive = true;
          state.sableAssetMismatchSwitchFrames = 24;
          state.sableSoulModeTransition = true;
          spawnSableStatus(spawnBullet, box, "ASSET REFERENCES SWAPPED", 64);
        }
        if (t !== 60 && state.sableAssetMismatchSwitchFrames > 0) {
          state.sableAssetMismatchSwitchFrames--;
        }
        if (t === 92) state.sableSoulModeTransition = false;

        if (t >= state.sableAssetMismatchNextSpawnFrame) {
          const volley = state.sableAssetMismatchVolley++;
          const angle = state.sableAssetMismatchAngle;
          const spinStep = 0.05 + 0.33 * ((t - 60) / 618);
          const speed = (2.05 + 0.32 * Math.min(1, volley / 147)) * 0.8;
          state.sableAssetMismatchAngle += spinStep;
          state.sableAssetMismatchNextSpawnFrame += 5.4;

          spawnSableAssetMismatchOrb({ spawnBullet, box, angle, speed });
          spawnSableAssetMismatchOrb({ spawnBullet, box, angle: Math.PI + angle, speed });
        }
      }
    },

    {
      loop: true,
      type: "green",
      duration: 720,
      damage: 14,
      box: SABLE_GREEN_BOX,
      setup: function setupHomingShieldCorruption({ state }) {
        state.sableHomingVolley = 0;
        state.sableGlitchedSoul = false;
        state.sableSoulModeTransition = false;
        state.sableShieldGlitchOut = null;
      },
      pattern: function homingShieldCorruption({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "TRACKING FIREWALL ONLINE", 58, -18);

        if (t === 360) {
          playSound(sounds.glitch1);
          state.sableGlitchedSoul = true;
          state.sableSoulModeTransition = true;
          state.sableShieldGlitchOut = {
            x: state.soul.x,
            y: state.soul.y,
            direction: state.shieldDirection,
            startFrame: state.frame
          };
          state.attackType = "normal";
          state.soul.vy = 0;
          spawnSableStatus(spawnBullet, box, "SHIELD DRIVER DELETED // SOUL: RED", 56, -18);
        }

        if (t === 392) state.sableSoulModeTransition = false;

        if (t % 20 === 0) {
          const volley = state.sableHomingVolley++;
          const side = Math.floor(Math.random() * 4);
          const spawnDistance = 256;
          const origin = side === 0
            ? { x: state.soul.x - spawnDistance, y: state.soul.y }
            : side === 1
              ? { x: state.soul.x + spawnDistance, y: state.soul.y }
              : side === 2
                ? { x: state.soul.x, y: state.soul.y - spawnDistance }
                : { x: state.soul.x, y: state.soul.y + spawnDistance };
          spawnSableHomingOrb({
            spawnBullet,
            x: origin.x,
            y: origin.y,
            targetX: state.soul.x,
            targetY: state.soul.y,
            speed: t < 360 ? 3.96 : 3.672,
            phase: volley * 0.91
          });
        }
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 720,
      damage: 14,
      box: SABLE_SQUARE_BOX,
      setup: function setupGlitchWallModeShift({ state }) {
        state.sableWallVolley = 0;
        state.sableGlitchedSoul = false;
        state.sableSoulModeTransition = false;
      },
      pattern: function glitchWallModeShift({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t === 0) spawnSableStatus(spawnBullet, box, "INCOMING DATA WALL", 58);

        if (t === 210) {
          playSound(sounds.glitch1);
          state.sableGlitchedSoul = true;
          state.sableSoulModeTransition = true;
          spawnSableStatus(spawnBullet, box, "SOUL DRIVER CORRUPTING...", 42);
        }

        if (t === 240) {
          state.attackType = "blue";
          state.sableSoulModeTransition = false;
          state.soul.vy = 0;
          state.soul.pitBounce = false;
          spawnSableStatus(spawnBullet, box, "SOUL MODE: BLUE // CORRUPTED", 54);
        }

        if (t % 41 !== 0) return;

        const volley = state.sableWallVolley++;
        const wallTravelFrames = Math.ceil((box.w / 2 + SABLE_OUTSIDE_OFFSET) / 3.2);
        const blueWall = t + wallTravelFrames >= 240;
        const floorY = box.y + box.h - state.soul.r;
        const redGapCenters = [
          box.y + 42,
          box.y + box.h - 44,
          box.y + box.h / 2,
          box.y + 76
        ];
        const blueGapCenters = [
          floorY - 24,
          floorY - 72,
          floorY - 46,
          floorY - 88
        ];
        const gapCenters = blueWall ? blueGapCenters : redGapCenters;
        const gapY = gapCenters[volley % gapCenters.length];
        const gapRadius = blueWall ? 31 : 29;
        const speed = blueWall ? 3.2 : 3.0;
        const wallX = box.x + box.w + SABLE_OUTSIDE_OFFSET;

        for (let y = box.y + 12; y <= box.y + box.h - 12; y += 16) {
          if (Math.abs(y - gapY) <= gapRadius) continue;
          spawnSableOrb(spawnBullet, {
            x: wallX,
            y,
            vx: -speed,
            vy: 0,
            angle: Math.PI,
            wallBullet: true,
            wallVolley: volley,
            blueWall,
            life: 150,
            update: ({ bullet }) => {
              bullet.x += bullet.vx;
              const glitchStep = 31 + bullet.wallVolley % 4 * 5;
              if (bullet.age > 0 && bullet.age % glitchStep === 0) {
                bullet.x += bullet.vx * 2.5;
                bullet.snapFlash = 7;
              }
              if (bullet.snapFlash > 0) bullet.snapFlash--;
            }
          });
        }
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 840,
      damage: 14,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "Can I edit this file?",
      setup: function setupChooseModification({ box, state, spawnBullet }) {
        state.sableModificationApplied = false;
        state.sableModificationSpeedMultiplier = 1;
        state.sableModificationBulletCount = 3;
        state.sableModificationWindowIndex = 0;
        spawnSableModificationTimer({ box, spawnBullet });

        const choiceX = box.x + box.w / 2;
        const topChoiceY = box.y + 20;
        const bottomChoiceY = box.y + box.h - 68;
        state.sableModificationChoices = [
          spawnBullet({
            x: choiceX,
            y: topChoiceY,
            r: 0,
            width: 190,
            height: 48,
            type: "glitchWindow",
            code: "OPTION // COUNT",
            choiceLabel: "num_bullets *= 2",
            harmless: true,
            active: true,
            alpha: 1,
            noCull: true,
            life: 242
          }),
          spawnBullet({
            x: choiceX,
            y: bottomChoiceY,
            r: 0,
            width: 190,
            height: 48,
            type: "glitchWindow",
            code: "OPTION // SPEED",
            choiceLabel: "bullet.speed *= 2",
            harmless: true,
            active: true,
            alpha: 1,
            noCull: true,
            life: 242
          })
        ];
      },
      pattern: function chooseModification({ t, box, state, spawnBullet }) {
        if (t === 240 && !state.sableModificationApplied) {
          const [countChoice, speedChoice] = state.sableModificationChoices;
          const soulIn = (choice) => (
            choice &&
            state.soul.x >= choice.x - choice.width / 2 &&
            state.soul.x <= choice.x + choice.width / 2 &&
            state.soul.y >= choice.y &&
            state.soul.y <= choice.y + choice.height
          );
          const choseCount = soulIn(countChoice);
          const choseSpeed = soulIn(speedChoice);

          state.sableModificationApplied = true;
          state.sableModificationBulletCount = choseCount || (!choseCount && !choseSpeed) ? 6 : 3;
          state.sableModificationSpeedMultiplier = choseSpeed || (!choseCount && !choseSpeed) ? 2 : 1;
          for (const choice of state.sableModificationChoices) choice.life = 0;
          spawnSableStatus(
            spawnBullet,
            box,
            `MODIFIER // ${state.sableModificationBulletCount} BULLETS // SPEED x${state.sableModificationSpeedMultiplier}`,
            72
          );
        }

        if (t >= 240 && (t - 240) % 120 === 0) {
          const index = state.sableModificationWindowIndex++;
          for (const side of ["left", "right"]) {
            spawnSableModificationWindow({
              spawnBullet,
              box,
              side,
              speedMultiplier: state.sableModificationSpeedMultiplier,
              bulletCount: state.sableModificationBulletCount,
              index
            });
          }
        }
      }
    },

    {
      loop: true,
      type: "blue",
      duration: 690,
      damage: 14,
      box: SABLE_SQUARE_BOX,
      enemyDialog: "Sable",
      setup: function setupInputDelay({ box, state, spawnBullet }) {
        const floorY = box.y + box.h;
        const lowerY = floorY - 66;
        const upperY = floorY - 132;
        const lowerXs = [box.x + 54, box.x + box.w - 54];

        state.sableInputDelayFrames = 18;
        state.sableInputDelayBuffer = [];
        state.sableInputDelayVolley = 0;
        spawnSableStatus(spawnBullet, box, "INPUT DELAY // 0.3 s", 690, 18);
        spawnBullet({
          x: box.x + box.w / 2,
          y: floorY - 14,
          r: 0,
          width: box.w,
          height: 14,
          type: "spikeFloor",
          glitchy: true,
          noCull: true,
          life: 720
        });
        for (const x of lowerXs) {
          spawnBullet({
            x,
            y: lowerY,
            r: 0,
            width: 70,
            height: 11,
            type: "platform",
            glitchy: true,
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 720
          });
        }
        spawnBullet({
          x: box.x + box.w / 2,
          y: upperY,
          r: 0,
          width: 70,
          height: 11,
          type: "platform",
          glitchy: true,
          harmless: true,
          solidPlatform: true,
          noCull: true,
          life: 720
        });
        state.soul.x = lowerXs[0];
        state.soul.y = lowerY - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function inputDelay({ t, box, state, spawnBullet }) {
        if (t % 90 === 0) {
          const volley = state.sableInputDelayVolley++;
          const fromLeft = volley % 2 === 0;
          const x = fromLeft ? box.x - 72 : box.x + box.w + 72;
          const y = box.y + 78 + (volley % 3) * 34;
          spawnBullet({
            x,
            y,
            r: 0,
            width: 40,
            height: 28,
            type: "glitchLoader",
            fromLeft,
            harmless: true,
            noCull: true,
            life: 34,
            update: ({ bullet, spawnBullet: spawn }) => {
              if (bullet.age !== 30) return;
              const centerAngle = bullet.fromLeft ? 0 : Math.PI;
              for (const offset of [-1.5, -0.5, 0.5, 1.5]) {
                const angle = centerAngle + offset * 0.18;
                spawnSableOrb(spawn, {
                  x: bullet.x,
                  y: bullet.y,
                  vx: Math.cos(angle) * 2.44,
                  vy: Math.sin(angle) * 2.44,
                  life: 125
                });
              }
            }
          });
        }
      }
    },

    {
      loop: true,
      type: "green",
      duration: 680,
      damage: 14,
      box: SABLE_GREEN_BOX,

      setup: function setupShieldInputPhase({ state }) {
        state.sableGlitchedSoul = true;
        state.sableShieldInputPhase = "left";
        state.sableShieldPhaseVolley = 0;
        state.sableShieldPhaseNextShot = 0;
      },

      pattern: function shieldInputPhase({ t, box, state, spawnBullet }) {
        if (t === 0) {
          spawnSableStatus(
            spawnBullet,
            box,
            "SHIELD INPUT // 90° LEFT",
            68,
            -18
          );
        }

        if (t < state.sableShieldPhaseNextShot) return;

        const shotIndex = state.sableShieldPhaseVolley++;
        const progress = Math.min(1, t / 679);
        const speed = 3.25;

        const centerX = box.x + box.w / 2;
        const centerY = box.y + box.h / 2;
        const spawnDistance = 256;

        const cardinalShots = [
          {
            x: centerX - spawnDistance,
            y: centerY,
            vx: speed,
            vy: 0,
            angle: 0
          },
          {
            x: centerX + spawnDistance,
            y: centerY,
            vx: -speed,
            vy: 0,
            angle: Math.PI
          },
          {
            x: centerX,
            y: centerY - spawnDistance,
            vx: 0,
            vy: speed,
            angle: Math.PI / 2
          },
          {
            x: centerX,
            y: centerY + spawnDistance,
            vx: 0,
            vy: -speed,
            angle: -Math.PI / 2
          }
        ];

        spawnSableOrb(spawnBullet, {
          ...cardinalShots[shotIndex % cardinalShots.length],
          shieldPhaseVolley: shotIndex,
          noCull: true,
          life: 150
        });

        state.sableShieldPhaseNextShot += 100 - 48 * progress;
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 700,
      damage: 15,
      box: SABLE_SQUARE_BOX,
      setup: function setupRaceCondition({ state }) {
        state.sableRaceCycle = 0;
        state.sableRacePinkVolley = 0;
      },
      pattern: function raceCondition({ t, box, state, spawnBullet }) {
        const phase = t % 150;

        if (t === 0) spawnSableStatus(spawnBullet, box, "RACE CONDITION DETECTED", 62);

        if (phase === 0) {
          const cycle = state.sableRaceCycle++;
          state.sableRaceWinner = cycle % 2 === 0 ? "PINK" : "BLUE";
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y + box.h / 2,
            r: 15,
            type: "glitchCPU",
            winner: state.sableRaceWinner,
            harmless: true,
            noCull: true,
            life: 148
          });
        }

        if (phase === 60) {
          spawnSableStatus(spawnBullet, box, `${state.sableRaceWinner} PROCESS WON`, 34);
        }

        const pinkCadence = phase < 60 ? 18 : state.sableRaceWinner === "PINK" ? 11 : 24;
        if (phase % pinkCadence === 0) {
          const volley = state.sableRacePinkVolley++;
          const origin = sableCardinalTrajectory(box, volley, 0);
          const centerAngle = volley * 0.43;
          const targetX = state.soul.x + Math.cos(centerAngle) * 20;
          const targetY = state.soul.y + Math.sin(centerAngle) * 20;
          const velocity = sableVelocityToward(origin.x, origin.y, targetX, targetY, 3.2);
          spawnSableOrb(spawnBullet, {
            x: origin.x,
            y: origin.y,
            ...velocity,
            processColor: SABLE_PINK,
            processId: "PROC_PINK",
            life: 175
          });
        }

        const blueCadence = phase < 60 ? 42 : state.sableRaceWinner === "BLUE" ? 25 : 48;
        if (phase % blueCadence === 20 % blueCadence) {
          const offset = state.sableRaceCycle % 2 === 0 ? 16 : -16;
          spawnSableZone(spawnBullet, {
            x: sableClamp(state.soul.x + offset, box.x + 24, box.x + box.w - 24),
            y: sableClamp(state.soul.y - offset, box.y + 24, box.y + box.h - 24),
            width: 48,
            height: 48,
            activationDelay: 20,
            life: 58,
            label: "PROC_BLUE"
          });
        }
      }
    },

    {
      loop: true,
      postFinaleTrigger: true,
      type: "green",
      duration: 1920,
      damage: 15,
      box: SABLE_GREEN_BOX,
      enemyDialog: "SUPER SABLE!",
      setup: function setupFinaleCascade({ state }) {
        state.sableFinaleGreenSides = [];
        state.sableFinalePurpleLines = false;
        state.sableGlitchedSoul = false;
        state.sableSoulModeTransition = false;

        let previousSide = -1;
        for (let barrage = 0; barrage < 5; barrage++) {
          const sides = [0, 1, 2, 3];
          for (let index = sides.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [sides[index], sides[swapIndex]] = [sides[swapIndex], sides[index]];
          }

          if (sides[0] === previousSide) {
            [sides[0], sides[1]] = [sides[1], sides[0]];
          }

          const burstSides = sides.slice(0, 3);
          state.sableFinaleGreenSides.push(burstSides);
          previousSide = burstSides[burstSides.length - 1];
        }
      },
      pattern: function finaleCascade({ t, state, spawnBullet, playSound, sounds }) {
        const purpleStart = 280;
        const blueStart = 580;
        const purpleCarryEnd = 700;
        const wallStart = 720;
        const coreApproachStart = 930;
        const wallEnd = 990;
        const redStart = 1020;

        if (t === 0) {
          spawnSableStatus(spawnBullet, SABLE_GREEN_BOX, "SHIELD BUFFER // BURST MODE", 58, -18);
        }

        if (t <= 220) {
          const barrage = Math.floor(t / 50);
          const barrageFrame = t % 50;
          const shotIndex = [0, 10, 20].indexOf(barrageFrame);

          if (barrage < 5 && shotIndex !== -1) {
            spawnSableFinaleShieldOrb({
              box: SABLE_GREEN_BOX,
              spawnBullet,
              side: state.sableFinaleGreenSides[barrage][shotIndex],
              shotIndex
            });
          }
        }

        if (t === 246) {
          spawnSableStatus(spawnBullet, SABLE_GREEN_BOX, "MOVEMENT DRIVER REASSIGNING...", 34, -18);
        }

        if (t === purpleStart) {
          playSound(sounds.glitch1);
          state.sableShieldGlitchOut = {
            x: state.soul.x,
            y: state.soul.y,
            direction: state.shieldDirection,
            startFrame: state.frame
          };
          state.bullets = [];
          state.attackType = "purple";
          state.box = { ...SABLE_WIDE_BOX };
          state.soul.lane = 1;
          state.soul.vy = 0;
          state.soul.pitBounce = false;
          state.sableGlitchedSoul = true;
          state.sableSoulModeTransition = true;
          state.sableFinalePurpleLines = true;
          triggerSableFinaleDistortion(state, 20);
          spawnSableStatus(spawnBullet, SABLE_WIDE_BOX, "SOUL MODE: PURPLE // THREE THREADS", 62);
        }

        if (t === purpleStart + 32) state.sableSoulModeTransition = false;

        if (t >= purpleStart + 16 && t < purpleCarryEnd) {
          const purpleFrame = t - purpleStart;
          if ((purpleFrame - 16) % 60 === 0) {
            const volley = Math.floor((purpleFrame - 16) / 60);
            spawnSableFinalePurpleHorizontal({
              box: SABLE_WIDE_BOX,
              spawnBullet,
              volley
            });
          }

          if (purpleFrame % 14 === 7) {
            const volley = Math.floor(purpleFrame / 14);
            const fromTop = volley % 2 === 0;
            const x = SABLE_WIDE_BOX.x + 16 + Math.random() * (SABLE_WIDE_BOX.w - 32);

            spawnSableFinalePurpleVertical({
              box: SABLE_WIDE_BOX,
              spawnBullet,
              volley,
              fromTop,
              x
            });
          }
        }

        if (t === blueStart - 20) {
          spawnSableStatus(spawnBullet, SABLE_WIDE_BOX, "LOW GAP DETECTED // GRAVITY LOADING", 38);
        }

        if (t === blueStart) {
          playSound(sounds.glitch1);
          state.attackType = "blue";
          state.box = { ...SABLE_FINALE_BLUE_BOX };
          state.soul.vy = 0;
          state.soul.pitBounce = false;
          state.sableGlitchedSoul = true;
          state.sableSoulModeTransition = true;
          state.sableFinalePurpleLines = false;
          triggerSableFinaleDistortion(state, 18);
          spawnSableStatus(spawnBullet, SABLE_FINALE_BLUE_BOX, "SOUL MODE: BLUE // PURPLE BUFFER", 54);
        }

        if (t === blueStart + 32) state.sableSoulModeTransition = false;

        if (t === purpleCarryEnd) {
          spawnSableStatus(spawnBullet, SABLE_FINALE_BLUE_BOX, "PURPLE STREAM CLOSING // WALLS NEXT", 42);
        }

        if (t === wallStart) {
          state.bullets = [];
          triggerSableFinaleDistortion(state, 18);
          spawnSableStatus(spawnBullet, SABLE_FINALE_BLUE_BOX, "WALLS CONVERGING // JUMP", 46);
        }

        if (t >= wallStart && t < wallEnd && (t - wallStart) % 30 === 0) {
          spawnSableFinaleJumpWall({
            box: SABLE_FINALE_BLUE_BOX,
            spawnBullet,
            volley: (t - wallStart) / 30
          });
        }

        if (t === coreApproachStart) {
          triggerSableFinaleDistortion(state, 24);
          spawnSableFinaleDecayCore({ spawnBullet, coreIndex: 0 });
          spawnSableFinaleDecayCore({ spawnBullet, coreIndex: 1 });
          spawnSableStatus(spawnBullet, SABLE_FINALE_BLUE_BOX, "REMOTE CORES APPROACHING SABLE...", 64);
        }

        if (t === redStart) {
          playSound(sounds.glitch1);
          state.attackType = "normal";
          state.box = { ...SABLE_WIDE_BOX };
          state.soul.vy = 0;
          state.soul.pitBounce = false;
          state.sableGlitchedSoul = true;
          state.sableSoulModeTransition = true;
          triggerSableFinaleDistortion(state, 26);
          spawnSableStatus(spawnBullet, SABLE_WIDE_BOX, "SOUL MODE: RED // CASCADING DECAY", 64);
        }

        if (t === redStart + 32) state.sableSoulModeTransition = false;
      }
    },

    {
      loop: true,
      type: "normal",
      duration: 840,
      damage: 14,
      box: SABLE_SQUARE_BOX,
      setup: function setupPostFinalModification({ box, state, spawnBullet }) {
        state.sablePostFinalModificationApplied = false;
        state.sableMovementSpeedMultiplier = 1;
        state.sablePostFinalWindowIndex = 0;
        spawnSableModificationTimer({ box, spawnBullet });

        const choiceX = box.x + box.w / 2;
        const topChoiceY = box.y + 20;
        const bottomChoiceY = box.y + box.h - 68;
        state.sablePostFinalChoices = [
          spawnBullet({
            x: choiceX,
            y: topChoiceY,
            r: 0,
            width: 190,
            height: 48,
            type: "glitchWindow",
            code: "OPTION // STATE",
            choiceLabel: "player.state = 'BLUE'",
            harmless: true,
            active: true,
            alpha: 1,
            noCull: true,
            life: 242
          }),
          spawnBullet({
            x: choiceX,
            y: bottomChoiceY,
            r: 0,
            width: 190,
            height: 48,
            type: "glitchWindow",
            code: "OPTION // SPEED",
            choiceLabel: "player.speed /= 2",
            harmless: true,
            active: true,
            alpha: 1,
            noCull: true,
            life: 242
          })
        ];
      },
      pattern: function postFinalModification({ t, box, state, spawnBullet }) {
        if (t === 240 && !state.sablePostFinalModificationApplied) {
          const [blueChoice, speedChoice] = state.sablePostFinalChoices;
          const soulIn = (choice) => (
            choice &&
            state.soul.x >= choice.x - choice.width / 2 &&
            state.soul.x <= choice.x + choice.width / 2 &&
            state.soul.y >= choice.y &&
            state.soul.y <= choice.y + choice.height
          );
          const choseBlue = soulIn(blueChoice);
          const choseSlow = soulIn(speedChoice);
          const choseNeither = !choseBlue && !choseSlow;

          state.sablePostFinalModificationApplied = true;
          state.sableMovementSpeedMultiplier = choseSlow || choseNeither ? 0.5 : 1;
          if (choseBlue || choseNeither) {
            state.attackType = "blue";
            state.soul.vy = 0;
            state.soul.pitBounce = false;
            state.soul.y = box.y + box.h - state.soul.r;
          }
          for (const choice of state.sablePostFinalChoices) choice.life = 0;
          spawnSableStatus(
            spawnBullet,
            box,
            `PATCH // ${choseBlue || choseNeither ? "BLUE" : "RED"} // SPEED x${state.sableMovementSpeedMultiplier}`,
            72
          );
        }

        if (t >= 240 && (t - 240) % 120 === 0) {
          const index = state.sablePostFinalWindowIndex++;
          for (const side of ["left", "right"]) {
            spawnSableModificationWindow({
              spawnBullet,
              box,
              side,
              speedMultiplier: 1,
              bulletCount: 3,
              index
            });
          }
        }
      }
    }
  ]
};
