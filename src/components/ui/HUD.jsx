import { useEffect, useRef } from 'react';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';
import { formatTime } from '../../utils/time';

// HUD minimaliste, mis à jour par requestAnimationFrame en écrivant
// directement dans le DOM (aucun re-render React à 60 fps).
export function HUD() {
  const phase = useGame((s) => s.phase);
  const timerRef = useRef();
  const staminaRef = useRef();
  const slowmoRef = useRef();
  const fadeRef = useRef();
  const biomeRef = useRef();

  useEffect(() => {
    let raf;
    let lastT = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      if (timerRef.current) timerRef.current.textContent = formatTime(runtime.timer);
      if (staminaRef.current) {
        staminaRef.current.style.transform = `scaleX(${runtime.stamina})`;
        staminaRef.current.style.opacity = runtime.stamina < 0.3 ? '1' : '0.85';
      }
      if (slowmoRef.current) {
        slowmoRef.current.style.transform = `scaleX(${runtime.slowmo})`;
      }
      if (fadeRef.current) {
        // fondu noir lissé (respawn / entrée en jeu)
        runtime.fade += (runtime.fadeTarget - runtime.fade) * Math.min(1, dt * 6);
        fadeRef.current.style.opacity = String(runtime.fade);
      }
      if (biomeRef.current) {
        const since = performance.now() - runtime.biomeChangedAt;
        biomeRef.current.textContent = runtime.biomeLabel;
        biomeRef.current.style.opacity = since < 3500 && runtime.timerRunning ? '1' : '0';
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
          <div className="biome-label" ref={biomeRef} />
          <div className="gauges">
            <div>
              <div className="gauge-label">Endurance</div>
              <div className="gauge stamina">
                <div className="fill" ref={staminaRef} />
              </div>
            </div>
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
