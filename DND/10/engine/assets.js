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

  function playSound(sound) {
    if (!sound) return;

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
      buffer: null,
      loading: null,
      source: null,
      gain: null,
      playRequested: false,
      playToken: 0
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
    source.start(0);
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
    }

    if (music.gain) {
      music.gain.disconnect();
      music.gain = null;
    }
  }

  function createAssets(enemyData) {
    const fallbackMusic = "sounds/linedance_battle.wav";
    const battleTheme = createMusicTrack(enemyData.music, fallbackMusic);
    const phase2Theme = enemyData.phase2?.music
      ? createMusicTrack(enemyData.phase2.music, fallbackMusic)
      : battleTheme;
    const sceneSprites = {};

    if (enemyData.sceneSprites && typeof enemyData.sceneSprites === "object") {
      for (const [key, src] of Object.entries(enemyData.sceneSprites)) {
        if (typeof key === "string" && typeof src === "string") {
          sceneSprites[key] = loadImage(src);
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
        ...sceneSprites,
      },
      sounds: {
        playerHurt: loadSound("sounds/snd_hurt1.wav"),
        attackLand: loadSound("sounds/snd_laz.wav"),
        vaporized: loadSound("sounds/snd_vaporized.wav"),
        bombsplosion: loadSound("sounds/snd_bombsplosion.wav"),
        break1: loadSound("sounds/snd_break1.wav"),
        break2: loadSound("sounds/snd_break2.wav"),
        shieldBlock: loadSound("sounds/snd_tempbell.wav"),
        itemUse: loadSound("sounds/snd_heal_c.wav"),
        spearAppear: loadSound("sounds/snd_spearappear.wav"),
        arrow: loadSound("sounds/snd_arrow.wav"),
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
    stopMusic
  };
})();
