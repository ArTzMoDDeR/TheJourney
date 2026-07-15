import { create } from 'zustand';
import { runtime, resetRuntime } from './runtime';
import { START_POS } from '../constants';

// Checkpoint de départ : position de respawn + altitude de mort (chute)
export const START_CHECKPOINT = { pos: START_POS, killY: -30 };

const BEST_KEY = 'thejourney-best-v1';

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY));
  } catch {
    return null;
  }
}

export const useGame = create((set, get) => ({
  phase: 'title', // title | playing | paused | finished
  checkpoint: START_CHECKPOINT,
  splits: [], // [{ name, label, t }] — temps au passage de chaque biome
  finalTime: null,
  best: loadBest(),
  isNewBest: false,
  resetToken: 0, // incrémenté à chaque restart : le contrôleur téléporte le joueur

  start: () => set({ phase: 'playing' }),
  pause: () => {
    if (get().phase === 'playing') set({ phase: 'paused' });
  },
  resume: () => {
    if (get().phase === 'paused') set({ phase: 'playing' });
  },

  // Ne peut que monter : on ne régresse jamais de checkpoint
  setCheckpoint: (cp) => {
    const cur = get().checkpoint;
    if (cp.pos[1] > cur.pos[1]) set({ checkpoint: cp });
  },

  addSplit: (name, label, t) =>
    set((s) =>
      s.splits.some((x) => x.name === name)
        ? {}
        : { splits: [...s.splits, { name, label, t }] }
    ),

  finish: () => {
    if (get().phase !== 'playing') return;
    const t = runtime.timer;
    runtime.timerRunning = false;
    let best = get().best;
    let isNewBest = false;
    if (!best || t < best.time) {
      best = { time: t, splits: get().splits };
      isNewBest = true;
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(best));
      } catch {
        /* stockage indisponible : le run reste valide, juste non sauvegardé */
      }
    }
    set({ phase: 'finished', finalTime: t, best, isNewBest });
  },

  restart: () => {
    resetRuntime();
    runtime.fade = 1;
    set((s) => ({
      phase: 'playing',
      checkpoint: START_CHECKPOINT,
      splits: [],
      finalTime: null,
      isNewBest: false,
      resetToken: s.resetToken + 1,
    }));
  },
}));
