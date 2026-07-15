import { useEffect, useRef } from 'react';
import { runtime } from '../../store/runtime';
import { useGame, TOTAL_SOUVENIRS } from '../../store/gameStore';
import { formatTime } from '../../utils/time';
import { POEMS } from '../../constants';

// HUD minimaliste, mis à jour par requestAnimationFrame en écrivant
// directement dans le DOM (aucun re-render React à 60 fps).
export function HUD() {
  const phase = useGame((s) => s.phase);
  const souvenirs = useGame((s) => s.souvenirs.length);
  const timerRef = useRef();
  const slowmoRef = useRef();
  const fadeRef = useRef();
  const poemRef = useRef();
  const shownPoemFor = useRef(null);

  useEffect(() => {
    let raf;
    let lastT = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (timerRef.current) timerRef.current.textContent = formatTime(runtime.timer);
      if (slowmoRef.current) {
        slowmoRef.current.style.transform = `scaleX(${runtime.slowmo})`;
      }
      if (fadeRef.current) {
        runtime.fade += (runtime.fadeTarget - runtime.fade) * Math.min(1, dt * 6);
        fadeRef.current.style.opacity = String(runtime.fade);
      }
      if (poemRef.current) {
        // vers poétique à l'entrée de chaque chapitre
        if (shownPoemFor.current !== runtime.biome) {
          shownPoemFor.current = runtime.biome;
          poemRef.current.textContent = POEMS[runtime.biome] || '';
        }
        const since = performance.now() - runtime.biomeChangedAt;
        const show =
          (since < 6000 && runtime.timerRunning) ||
          (runtime.biome === 'bedroom' && !runtime.timerRunning);
        poemRef.current.style.opacity = show ? '1' : '0';
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = phase === 'playing' || phase === 'paused';

  return (
    <>
      <div className="fade" ref={fadeRef} style={{ opacity: 1 }} />
      {visible && (
        <div className="hud">
          <div className="timer" ref={timerRef}>
            0:00.00
          </div>
          <div className="poem" ref={poemRef} />
          <div className="souvenirs">
            ✦ {souvenirs}/{TOTAL_SOUVENIRS}
          </div>
          <div className="gauges">
            <div>
              <div className="gauge-label">Ralenti</div>
              <div className="gauge slowmo">
                <div className="fill" ref={slowmoRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
