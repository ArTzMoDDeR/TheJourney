import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';
import { runtime } from '../../store/runtime';
import { formatTime } from '../../utils/time';
import { audio } from '../../audio/AudioSystem';

// Écrans : titre, pause, fin de run, aide contrôles.

export function TitleScreen({ onStart }) {
  const phase = useGame((s) => s.phase);
  const best = useGame((s) => s.best);
  if (phase !== 'title') return null;

  return (
    <div className="overlay dim title-screen">
      <h1>THE JOURNEY</h1>
      <p className="sub">Une vie, une ascension</p>
      <button
        className="btn"
        onClick={() => {
          audio.init();
          runtime.fadeTarget = 0;
          useGame.getState().start();
          onStart?.();
        }}
      >
        Commencer
      </button>
      {best && <div className="best-line">Meilleur temps — {formatTime(best.time)}</div>}
    </div>
  );
}

export function PauseMenu({ onResume }) {
  const phase = useGame((s) => s.phase);

  useEffect(() => {
    audio.setPaused(phase === 'paused');
  }, [phase]);

  if (phase !== 'paused') return null;

  return (
    <div className="overlay dim">
      <div className="pause-title">Pause</div>
      <button
        className="btn"
        onClick={() => {
          useGame.getState().resume();
          onResume?.();
        }}
      >
        Reprendre
      </button>
      <button
        className="btn secondary"
        onClick={() => {
          useGame.getState().restart();
          onResume?.();
        }}
      >
        Recommencer
      </button>
    </div>
  );
}

export function EndScreen({ onRestart }) {
  const phase = useGame((s) => s.phase);
  const finalTime = useGame((s) => s.finalTime);
  const splits = useGame((s) => s.splits);
  const best = useGame((s) => s.best);
  const isNewBest = useGame((s) => s.isNewBest);
  const souvenirs = useGame((s) => s.souvenirs.length);

  if (phase !== 'finished') return null;

  return (
    <div className="overlay dim end-screen">
      <div className="final-time">{formatTime(finalTime)}</div>
      {isNewBest && <div className="new-best">Nouveau meilleur temps</div>}
      <div className="best-line">✦ {souvenirs}/8 souvenirs retrouvés</div>
      <div className="splits">
        {splits.map((sp) => (
          <div className="row" key={sp.name}>
            <span>{sp.label}</span>
            <span>{formatTime(sp.t)}</span>
          </div>
        ))}
        <div className="row">
          <span>Le Paradis</span>
          <span>{formatTime(finalTime)}</span>
        </div>
        {best && !isNewBest && (
          <div className="row" style={{ opacity: 0.5 }}>
            <span>Meilleur temps</span>
            <span>{formatTime(best.time)}</span>
          </div>
        )}
      </div>
      <button
        className="btn"
        onClick={() => {
          useGame.getState().restart();
          onRestart?.();
        }}
      >
        Rejouer
      </button>
    </div>
  );
}

// Rappel des contrôles, affiché discrètement au début, disparaît de lui-même.
export function ControlsHint() {
  const phase = useGame((s) => s.phase);
  const [faded, setFaded] = useState(false);
  const shownAt = useRef(null);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    if (shownAt.current == null) shownAt.current = performance.now();
    const iv = setInterval(() => {
      const elapsed = performance.now() - shownAt.current;
      if (elapsed > 9000 || (runtime.timerRunning && runtime.timer > 5)) setFaded(true);
    }, 500);
    return () => clearInterval(iv);
  }, [phase]);

  if (phase !== 'playing' || faded) return null;

  return (
    <div className="controls-hint" style={{ opacity: faded ? 0 : 1 }}>
      <span>
        <b>Z Q S D</b> se déplacer
      </span>
      <span>
        <b>Espace</b> sauter · maintenir près d'un rebord pour se hisser
      </span>
      <span>
        <b>Échelles</b> avancer contre pour grimper
      </span>
      <span>
        <b>Shift</b> sprint
      </span>
      <span>
        <b>Clic droit</b> ralenti
      </span>
    </div>
  );
}
