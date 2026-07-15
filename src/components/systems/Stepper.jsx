import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';

// La simulation Rapier est en <Physics paused> : ce composant la fait avancer
// manuellement avec un delta multiplié par runtime.timeScale.
// C'est ce qui rend le slow-motion (clic droit) et la pause possibles
// proprement, sans toucher aux vitesses des objets.
export function Stepper() {
  const { step } = useRapier();
  useFrame((_, rawDelta) => {
    if (useGame.getState().phase !== 'playing') return;
    const dt = Math.min(rawDelta, 1 / 30);
    const sdt = dt * runtime.timeScale;
    if (sdt > 0) {
      runtime.simTime += sdt;
      step(sdt);
    }
  }, -2); // après le contrôleur (-3), avant la caméra (0)
  return null;
}
