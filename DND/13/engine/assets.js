(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    img.ready = false;
    img.onload = () => (img.ready = true);
    img.onerror = () => (img.ready = false);
    return img;
  }

  function loadSound(src) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0.3;
    return audio;
  }

  function playSound(sound, volumeScale = 1) {
    if (!sound) return;

    if (
      Number.isFinite(volumeScale) &&
      volumeScale !== 1 &&
      typeof sound.cloneNode === "function"
    ) {
      const scaledSound = sound.cloneNode(true);
      scaledSound.volume = Math.max(0, Math.min(1, sound.volume * volumeScale));
      scaledSound.currentTime = 0;
      scaledSound.play().catch(() => {
        // Browser may block sound until the player has interacted with the page.
      });
      return;
    }

    sound.currentTime = 0;
    sound.play().catch(() => {
      // Browser may block sound until the player has interacted with the page.
    });
  }

  let musicContext = null;

  function getMusicContext() {
    if (!musicContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      musicContext = new AudioContextClass();
    }

    return musicContext;
  }

  function createMusicTrack(config, fallbackSrc) {
    const data = config && typeof config === "object"
      ? config
      : { src: typeof config === "string" ? config : fallbackSrc };

    return {
      src: typeof data.src === "string" ? data.src : fallbackSrc,
      loopStart: Number.isFinite(data.loopStart) ? Math.max(0, data.loopStart) : null,
      loopEnd: Number.isFinite(data.loopEnd) ? Math.max(0, data.loopEnd) : null,
      bpm: Number.isFinite(data.bpm) ? Math.max(1, data.bpm) : null,
      buffer: null,
      loading: null,
      source: null,
      gain: null,
      playRequested: false,
      playToken: 0,
      startedAt: null
    };
  }

  function loadMusicBuffer(music, context) {
    if (music.buffer) return Promise.resolve(music.buffer);
    if (music.loading) return music.loading;

    music.loading = fetch(music.src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load music: ${response.status} ${music.src}`);
        }

        return response.arrayBuffer();
      })
      .then((audioData) => context.decodeAudioData(audioData))
      .then((buffer) => {
        music.buffer = buffer;
        return buffer;
      })
      .catch((err) => {
        music.loading = null;
        console.warn("Music failed to load:", err);
        return null;
      });

    return music.loading;
  }

  function startMusicSource(music, context, token) {
    if (!music.playRequested || music.playToken !== token || music.source || !music.buffer) return;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const hasLoopPoints = Number.isFinite(music.loopStart) &&
      Number.isFinite(music.loopEnd) &&
      music.loopEnd > music.loopStart &&
      music.loopStart < music.buffer.duration;

    source.buffer = music.buffer;
    source.loop = true;

    if (hasLoopPoints) {
      source.loopStart = music.loopStart;
      source.loopEnd = Math.min(music.loopEnd, music.buffer.duration);
    }

    gain.gain.value = 0.45;
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => {
      if (music.source === source) {
        music.source = null;
        music.gain = null;
      }
    };

    music.source = source;
    music.gain = gain;
    music.startedAt = context.currentTime;
    source.start(0);
  }

  function getMusicPosition(music) {
    if (!music || !music.source || !Number.isFinite(music.startedAt) || !musicContext) return null;

    const elapsed = Math.max(0, musicContext.currentTime - music.startedAt);
    const hasLoopPoints = Number.isFinite(music.loopStart) &&
      Number.isFinite(music.loopEnd) &&
      music.loopEnd > music.loopStart;

    if (!hasLoopPoints || elapsed < music.loopEnd) return elapsed;

    const loopLength = music.loopEnd - music.loopStart;
    return music.loopStart + ((elapsed - music.loopStart) % loopLength);
  }

  function getMusicElapsed(music) {
    if (!music || !music.source || !Number.isFinite(music.startedAt) || !musicContext) return null;
    return Math.max(0, musicContext.currentTime - music.startedAt);
  }

  function playMusic(music) {
    if (!music) return;

    const context = getMusicContext();
    if (!context) return;

    music.playRequested = true;
    const token = ++music.playToken;

    context.resume().catch((err) => {
      console.warn("Music context failed to resume:", err);
    });

    loadMusicBuffer(music, context).then((buffer) => {
      if (buffer) startMusicSource(music, context, token);
    });
  }

  function stopMusic(music) {
    if (!music) return;

    music.playRequested = false;
    music.playToken++;

    if (music.source) {
      music.source.onended = null;
      music.source.stop();
      music.source.disconnect();
      music.source = null;
      music.startedAt = null;
    }

    if (music.gain) {
      music.gain.disconnect();
      music.gain = null;
    }
  }

  function addSpriteMap(target, sprites) {
    if (!sprites || typeof sprites !== "object") return;

    for (const [key, src] of Object.entries(sprites)) {
      if (typeof key === "string" && typeof src === "string") {
        target[key] = loadImage(src);
      }
    }
  }

  function addAttackSprites(target, turns) {
    if (!Array.isArray(turns)) return;

    for (const turn of turns) {
      const attack = turn && typeof turn === "object" && turn.attack
        ? turn.attack
        : turn;

      if (attack && typeof attack === "object" && typeof attack.sprite === "string") {
        const isPath = attack.sprite.includes("/") || attack.sprite.includes("\\") || attack.sprite.includes(".");

        if (isPath) {
          target[`attackSprite:${attack.sprite}`] = loadImage(attack.sprite);
        }
      }
    }
  }

  function addEnemyAnimations(target, animations) {
    if (!animations || typeof animations !== "object") return;

    for (const [role, animation] of Object.entries(animations)) {
      if (!Array.isArray(animation?.frames)) continue;
      animation.frames.forEach((src, index) => {
        if (typeof src === "string") {
          target[`enemyAnimation:${role}:${index}`] = loadImage(src);
        }
      });
    }
  }

  function createAssets(enemyData) {
    const fallbackMusic = "sounds/linedance_battle.wav";
    const battleTheme = createMusicTrack(enemyData.music, fallbackMusic);
    const phase2Theme = enemyData.phase2?.music
      ? createMusicTrack(enemyData.phase2.music, fallbackMusic)
      : battleTheme;
    const sceneSprites = {};
    const enemySprites = {};
    const partySprites = {};

    if (enemyData.sceneSprites && typeof enemyData.sceneSprites === "object") {
      for (const [key, src] of Object.entries(enemyData.sceneSprites)) {
        if (typeof key === "string" && typeof src === "string") {
          sceneSprites[key] = loadImage(src);
        }
      }
    }

    addSpriteMap(enemySprites, enemyData.sprites);
    addEnemyAnimations(enemySprites, enemyData.spriteAnimations);
    addAttackSprites(enemySprites, enemyData.turns);
    addAttackSprites(enemySprites, enemyData.attackPatterns);

    if (Array.isArray(enemyData.defaultAnimation?.frames)) {
      enemyData.defaultAnimation.frames.forEach((src, index) => {
        if (typeof src === "string") {
          enemySprites[`enemyDefaultAnimation:${index}`] = loadImage(src);
        }
      });
    }

    if (enemyData.phase2 && typeof enemyData.phase2 === "object") {
      addSpriteMap(enemySprites, enemyData.phase2.sprites);
      addEnemyAnimations(enemySprites, enemyData.phase2.spriteAnimations);
      addAttackSprites(enemySprites, enemyData.phase2.turns);
      addAttackSprites(enemySprites, enemyData.phase2.attackPatterns);
    }

    if (Array.isArray(window.PLAYER_DATA)) {
      for (const player of window.PLAYER_DATA) {
        if (!player || typeof player.name !== "string") continue;

        if (player.sprites && typeof player.sprites === "object") {
          for (const [role, src] of Object.entries(player.sprites)) {
            if (typeof src === "string") {
              partySprites[`${player.name}:${role}`] = loadImage(src);

              const explicitAnimation = player.spriteAnimations?.[role];
              const legacyDefaultAnimation = role === "default" ? player.defaultAnimation : null;
              const configuredFrames = Array.isArray(explicitAnimation?.frames)
                ? explicitAnimation.frames
                : Array.isArray(legacyDefaultAnimation?.frames)
                  ? legacyDefaultAnimation.frames
                  : null;
              const slashIndex = src.lastIndexOf("/");
              const characterPath = slashIndex >= 0 ? src.slice(0, slashIndex) : "";
              const animationFrames = configuredFrames || Array.from({ length: 5 }, (_, index) => {
                const frame = String(index + 1).padStart(4, "0");
                return `${characterPath}/${role}/${role}_${frame}.png`;
              });

              animationFrames.forEach((frameSrc, index) => {
                if (typeof frameSrc === "string") {
                  partySprites[`${player.name}:${role}Animation:${index}`] = loadImage(frameSrc);
                }
              });
            }
          }
        } else if (typeof player.sprite === "string") {
          partySprites[`${player.name}:default`] = loadImage(player.sprite);
          partySprites[`${player.name}:down`] = loadImage(player.sprite);
          partySprites[`${player.name}:icon`] = loadImage(player.sprite);
        }
      }
    }

    return {
      sprites: {
        enemy: loadImage(enemyData.sprite),
        phase2Enemy: loadImage(enemyData.phase2?.sprite || enemyData.sprite),
        ultimateEnemy: loadImage(enemyData.ultimateSprite || enemyData.sprite),
        heart: loadImage("sprites/heart.png"),
        projectile: loadImage("sprites/projectile.png"),
        ...enemySprites,
        ...sceneSprites,
        ...partySprites,
      },
      sounds: {
        playerHurt: loadSound("sounds/snd_hurt1.wav"),
        attackLand: loadSound("sounds/snd_laz.wav"),
        vaporized: loadSound("sounds/snd_vaporized.wav"),
        bombsplosion: loadSound("sounds/snd_bombsplosion.wav"),
        break1: loadSound("sounds/snd_break1.wav"),
        break2: loadSound("sounds/snd_break2.wav"),
        shieldBlock: loadSound("sounds/snd_tempbell.wav"),
        glitch1: loadSound("sounds/snd_glitch_1.mp3"),
        graze: loadSound("sounds/snd_graze.wav"),
        itemUse: loadSound("sounds/snd_heal_c.wav"),
        statChange: loadSound("sounds/snd_shineselect.wav"),
        spearAppear: loadSound("sounds/snd_spearappear.wav"),
        arrow: loadSound("sounds/snd_arrow.wav"),
        curtainCall: loadSound("sounds/snd_curtain_call.wav"),
        spellCast: loadSound("sounds/snd_spellcast.wav"),
        chainsaw: loadSound("sounds/snd_chainsaw.mp3"),
        wing: loadSound("sounds/snd_wing.wav"),
        menuMove: loadSound("sounds/snd_select.wav"),
        menuSelect: loadSound("sounds/snd_select.wav"),
        determination: createMusicTrack("sounds/determination.mp3", "sounds/determination.mp3"),
        battleTheme,
        phase2Theme,
      }
    };
  }

  window.SoulBattle.assets = {
    createAssets,
    playSound,
    playMusic,
    stopMusic,
    getMusicPosition,
    getMusicElapsed
  };
})();
