import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';

// La simulation Rapier est en <Physics paused> : ce composant la fait avancer
// manuellement. IMPORTANT : la physique tourne à pas FIXE (1/60) et rattrape
// le temps réel écoulé — ainsi le jeu garde la MÊME vitesse quel que soit le
// framerate (un FPS bas rend le jeu saccadé, jamais « au ralenti »). Le
// slow-motion (clic droit) et la pause passent par runtime.timeScale.
const FIXED = 1 / 60;
const MAX_CATCHUP = 0.5; // borne le rattrapage (spirale de la mort)

export function Stepper() {
  const { step } = useRapier();
  const acc = useRef(0);

  useFrame((_, rawDelta) => {
    if (useGame.getState().phase !== 'playing') return;
    // temps réel écoulé (borné), modulé par le slow-motion
    acc.current += Math.min(rawDelta, MAX_CATCHUP) * runtime.timeScale;
    let steps = 0;
    while (acc.current >= FIXED && steps < 40) {
      step(FIXED);
      runtime.simTime += FIXED;
      acc.current -= FIXED;
      steps++;
    }
  }, -2); // après le contrôleur (-3), avant la caméra (0)

  return null;
}
