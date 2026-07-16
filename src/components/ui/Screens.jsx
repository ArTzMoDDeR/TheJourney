import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { useGame, TOTAL_SOUVENIRS } from '../../store/gameStore';
import { runtime } from '../../store/runtime';
import { formatTime } from '../../utils/time';
import { audio } from '../../audio/AudioSystem';
import { STRINGS, t } from '../../utils/i18n';

// Écran de chargement : suit le vrai téléchargement des kits glTF.
export function Loading() {
  const { active, progress, total } = useProgress();
  const lang = useGame((s) => s.language);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // prêt quand plus rien ne charge et qu'au moins un asset a été vu
    if (!active && total > 0 && progress >= 100) {
      const id = setTimeout(() => setReady(true), 400);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [active, progress, total]);

  if (ready) return null;
  const pct = Math.min(100, Math.round(progress));
  return (
    <div className="overlay loading">
      <h1 className="tj-title small">THE JOURNEY</h1>
      <div className="load-bar">
        <div className="load-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="load-label">
        {STRINGS[lang].loading} {pct}%
      </div>
    </div>
  );
}

function LangChips() {
  const lang = useGame((s) => s.language);
  const setLanguage = useGame((s) => s.setLanguage);
  return (
    <div className="lang-chips">
      {['fr', 'en'].map((l) => (
        <button
          key={l}
          className={`chip ${lang === l ? 'on' : ''}`}
          onClick={() => setLanguage(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ControlsTable() {
  const lang = useGame((s) => s.language);
  const s = STRINGS[lang];
  const rows = [
    ['Z Q S D', s.move],
    ['Espace', s.jump],
    ['⇧ Shift', s.sprint],
    ['🖱 R', s.slow],
    ['↑', s.ladder],
  ];
  return (
    <div className="controls-table">
      {rows.map(([k, v]) => (
        <div className="crow" key={k}>
          <b>{k}</b>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

export function TitleScreen({ onStart }) {
  const phase = useGame((s) => s.phase);
  const best = useGame((s) => s.best);
  const lang = useGame((s) => s.language);
  if (phase !== 'title') return null;

  return (
    <div className="overlay dim title-screen">
      <h1 className="tj-title">THE JOURNEY</h1>
      <p className="sub">{STRINGS[lang].subtitle}</p>

      <div className="title-panel">
        <div className="panel-block">
          <div className="panel-label">{STRINGS[lang].language}</div>
          <LangChips />
        </div>
        <div className="panel-block">
          <div className="panel-label">{STRINGS[lang].controls}</div>
          <ControlsTable />
        </div>
      </div>

      <button
        className="btn"
        onClick={() => {
          audio.init();
          audio.setMasterVolume(useGame.getState().volume);
          runtime.fadeTarget = 0;
          useGame.getState().start();
          onStart?.();
        }}
      >
        {STRINGS[lang].play}
      </button>
      {best && (
        <div className="best-line">
          {STRINGS[lang].best} — {formatTime(best.time)}
        </div>
      )}
    </div>
  );
}

export function PauseMenu({ onResume }) {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.language);
  const volume = useGame((s) => s.volume);

  useEffect(() => {
    audio.setPaused(phase === 'paused');
  }, [phase]);

  if (phase !== 'paused') return null;
  const s = STRINGS[lang];

  return (
    <div className="overlay dim">
      <div className="pause-title">{s.paused}</div>

      <div className="volume-row">
        <span>{s.volume}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            useGame.getState().setVolume(v);
            audio.setMasterVolume(v);
          }}
        />
        <span className="vol-pct">{Math.round(volume * 100)}</span>
      </div>

      <button
        className="btn"
        onClick={() => {
          useGame.getState().resume();
          onResume?.();
        }}
      >
        {s.resume}
      </button>
      <button
        className="btn secondary"
        onClick={() => {
          useGame.getState().restart();
          onResume?.();
        }}
      >
        {s.restart}
      </button>
      <LangChips />
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
  const lang = useGame((s) => s.language);
  if (phase !== 'finished') return null;
  const s = STRINGS[lang];

  return (
    <div className="overlay dim end-screen">
      <div className="final-time">{formatTime(finalTime)}</div>
      {isNewBest && <div className="new-best">{s.newBest}</div>}
      <div className="best-line">
        ✦ {souvenirs}/{TOTAL_SOUVENIRS} {s.souvenirsFound}
      </div>
      <div className="splits">
        {splits.map((sp) => (
          <div className="row" key={sp.name}>
            <span>{sp.label}</span>
            <span>{formatTime(sp.t)}</span>
          </div>
        ))}
      </div>
      <button
        className="btn"
        onClick={() => {
          useGame.getState().restart();
          onRestart?.();
        }}
      >
        {s.replay}
      </button>
    </div>
  );
}

// Rappel discret des contrôles au tout début de la partie.
export function ControlsHint() {
  const phase = useGame((s) => s.phase);
  const lang = useGame((s) => s.language);
  const [faded, setFaded] = useState(false);
  const shownAt = useRef(null);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    if (shownAt.current == null) shownAt.current = performance.now();
    const iv = setInterval(() => {
      if (performance.now() - shownAt.current > 9000 || (runtime.timerRunning && runtime.timer > 6)) {
        setFaded(true);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [phase]);

  if (phase !== 'playing' || faded) return null;
  const s = STRINGS[lang];
  return (
    <div className="controls-hint">
      <span><b>ZQSD</b> {s.move}</span>
      <span><b>Espace</b> {s.jump}</span>
      <span><b>Shift</b> {s.sprint}</span>
      <span><b>Clic droit</b> {s.slow}</span>
    </div>
  );
}
