// Audio 100% génératif via WebAudio : musique adaptative par biome (crossfade),
// SFX synthétisés, filtre global pour le slow-motion. Aucun asset à charger.

const CHORDS = {
  // fréquences des nappes par biome (accords), + gamme pour les mélodies
  bedroom: {
    pad: [130.81, 196.0, 261.63], // C3 G3 C4 — chaleureux
    scale: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5], // pentatonique C — boîte à musique
    pluckType: 'sine',
    padGain: 0.05,
    pluckGain: 0.05,
    pluckEvery: [1.2, 2.8],
    filter: 2400,
  },
  school: {
    pad: [110.0, 164.81, 220.0, 246.94], // A2 E3 A3 B3 — mineur, tension légère
    scale: [440.0, 493.88, 523.25, 659.25, 698.46], // A mineur
    pluckType: 'triangle',
    padGain: 0.045,
    pluckGain: 0.03,
    pluckEvery: [2.0, 4.5],
    filter: 1600,
  },
  office: {
    pad: [87.31, 130.81, 174.61], // F2 C3 F3 — drone terne
    scale: [349.23, 392.0, 415.3], // étroit, répétitif
    pluckType: 'square',
    padGain: 0.035,
    pluckGain: 0.012,
    pluckEvery: [0.9, 1.1], // mécanique, régulier
    filter: 900,
  },
  paradise: {
    pad: [261.63, 329.63, 392.0, 587.33], // C4 E4 G4 D5 — add9 lumineux
    scale: [1046.5, 1174.66, 1318.51, 1567.98], // aigus aériens
    pluckType: 'sine',
    padGain: 0.06,
    pluckGain: 0.035,
    pluckEvery: [3.0, 6.0],
    filter: 5000,
  },
};

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.biome = 'bedroom';
    this.pads = {}; // par biome : { gain, oscs }
    this.pluckTimer = null;
    this.slow = false;
    this.stepAlt = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;

    // Filtre global : ferme le son pendant le slow-motion et la pause
    this.globalFilter = ctx.createBiquadFilter();
    this.globalFilter.type = 'lowpass';
    this.globalFilter.frequency.value = 20000;
    this.master.connect(this.globalFilter);
    this.globalFilter.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 1;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);

    // Bruit blanc réutilisable (vent, pas, impacts)
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Vent continu (gain piloté par la vitesse du joueur)
    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = this.noiseBuf;
    this.windSrc.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxBus);
    this.windSrc.start();

    // Nappes de chaque biome, toutes actives, mixées par crossfade
    for (const [name, def] of Object.entries(CHORDS)) {
      const gain = ctx.createGain();
      gain.gain.value = name === this.biome ? def.padGain : 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = def.filter;
      filter.connect(gain);
      gain.connect(this.musicBus);
      const oscs = def.pad.map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        o.detune.value = (i - 1) * 4; // léger désaccord, nappe vivante
        const og = ctx.createGain();
        og.gain.value = 1 / def.pad.length;
        o.connect(og);
        og.connect(filter);
        o.start();
        return o;
      });
      // respiration lente de la nappe
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = def.padGain * 0.35;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      this.pads[name] = { gain, def };
    }

    this.started = true;
    this.scheduleNextPluck();
  }

  scheduleNextPluck() {
    if (!this.ctx) return;
    const def = CHORDS[this.biome];
    const [min, max] = def.pluckEvery;
    const delay = (min + Math.random() * (max - min)) * 1000;
    this.pluckTimer = setTimeout(() => {
      if (this.ctx && this.ctx.state === 'running' && !this.paused) {
        this.pluck();
      }
      this.scheduleNextPluck();
    }, delay);
  }

  pluck() {
    const ctx = this.ctx;
    const def = CHORDS[this.biome];
    const f = def.scale[Math.floor(Math.random() * def.scale.length)];
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = def.pluckType;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(def.pluckGain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 2);
  }

  setBiome(name) {
    if (name === this.biome) return;
    this.biome = name;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const [n, pad] of Object.entries(this.pads)) {
      const target = n === name ? pad.def.padGain : 0;
      pad.gain.gain.cancelScheduledValues(t);
      pad.gain.gain.setValueAtTime(pad.gain.gain.value, t);
      pad.gain.gain.linearRampToValueAtTime(target, t + 4); // crossfade progressif
    }
  }

  setSlow(active) {
    if (!this.ctx || active === this.slow) return;
    this.slow = active;
    const t = this.ctx.currentTime;
    this.globalFilter.frequency.cancelScheduledValues(t);
    this.globalFilter.frequency.setValueAtTime(this.globalFilter.frequency.value, t);
    this.globalFilter.frequency.exponentialRampToValueAtTime(active ? 500 : 20000, t + 0.25);
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
    this.musicBus.gain.linearRampToValueAtTime(paused ? 0.25 : 1, t + 0.4);
  }

  setWind(v) {
    if (!this.ctx) return;
    const g = Math.min(0.12, v * 0.12);
    this.windGain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.15);
    this.windFilter.frequency.setTargetAtTime(
      400 + v * 900,
      this.ctx.currentTime,
      0.2
    );
  }

  // --- SFX synthétisés ---

  blip(freq, dur, gain, type = 'sine', slideTo = null) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  thud(freq, dur, gain) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'jump':
        this.blip(300, 0.18, 0.06, 'sine', 520);
        break;
      case 'walljump':
        this.thud(1800, 0.22, 0.1);
        this.blip(360, 0.2, 0.05, 'sine', 620);
        break;
      case 'grab':
        this.thud(700, 0.14, 0.14);
        break;
      case 'mantle':
        this.thud(500, 0.2, 0.12);
        break;
      case 'land':
        this.thud(400, 0.22, 0.16);
        break;
      case 'step':
        this.stepAlt = !this.stepAlt;
        this.thud(this.stepAlt ? 900 : 750, 0.07, 0.05);
        break;
      case 'checkpoint':
        this.blip(660, 0.5, 0.05);
        setTimeout(() => this.blip(990, 0.7, 0.05), 130);
        break;
      case 'respawn':
        this.blip(440, 0.6, 0.04, 'sine', 220);
        break;
      case 'finish': {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        notes.forEach((f, i) => setTimeout(() => this.blip(f, 1.6, 0.05), i * 180));
        break;
      }
      default:
        break;
    }
  }
}

export const audio = new AudioSystem();
