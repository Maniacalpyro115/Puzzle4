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

  function playMusic(music) {
    if (!music) return;

    music.loop = true;
    music.volume = 0.45;

    if (music.paused) {
      music.currentTime = 0;
      music.play().catch((err) => {
        console.warn("Music failed to play:", err);
      });
    }
  }

  function stopMusic(music) {
    if (!music) return;

    music.pause();
    music.currentTime = 0;
  }

  function createAssets(enemyData) {
    const fallbackMusic = "sounds/linedance_battle.wav";

    return {
      sprites: {
        enemy: loadImage(enemyData.sprite),
        phase2Enemy: loadImage(enemyData.phase2?.sprite || enemyData.sprite),
        heart: loadImage("sprites/heart.png"),
        projectile: loadImage("sprites/projectile.png"),
      },
      sounds: {
        playerHurt: loadSound("sounds/snd_hurt1.wav"),
        attackLand: loadSound("sounds/snd_laz.wav"),
        itemUse: loadSound("sounds/snd_heal_c.wav"),
        menuMove: loadSound("sounds/snd_select.wav"),
        menuSelect: loadSound("sounds/snd_select.wav"),
        battleTheme: loadSound(enemyData.music || fallbackMusic),
        phase2Theme: loadSound(enemyData.phase2?.music || enemyData.music || fallbackMusic),
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
