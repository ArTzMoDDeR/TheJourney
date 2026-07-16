import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { GRAVITY } from './constants';
import { initInput } from './utils/input';
import { useGame } from './store/gameStore';
import { CharacterController } from './components/player/CharacterController';
import { CameraRig } from './components/player/CameraRig';
import { World } from './level/World';
import { Stepper } from './components/systems/Stepper';
import { EnvironmentManager } from './components/systems/EnvironmentManager';
import { Effects } from './components/systems/Effects';
import { HUD } from './components/ui/HUD';
import { TitleScreen, PauseMenu, EndScreen, ControlsHint } from './components/ui/Screens';

export default function App() {
  const glRef = useRef(null);

  useEffect(() => {
    initInput();

    // Échap (sortie du pointer lock) pendant le jeu → pause
    const onLockChange = () => {
      if (!document.pointerLockElement && useGame.getState().phase === 'playing') {
        useGame.getState().pause();
      }
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, []);

  const lockPointer = () => {
    // petit délai : le navigateur refuse un lock immédiatement après un unlock
    setTimeout(() => {
      glRef.current?.domElement?.requestPointerLock?.();
    }, 60);
  };

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 62, near: 0.1, far: 1800, position: [-20, 5, 42] }}
        onCreated={({ gl }) => {
          glRef.current = gl;
        }}
        onPointerDown={() => {
          // re-verrouille la souris si on a cliqué dans le jeu sans lock
          if (useGame.getState().phase === 'playing' && !document.pointerLockElement) {
            glRef.current?.domElement?.requestPointerLock?.();
          }
        }}
      >
        <EnvironmentManager />
        {/* Physique en pause permanente : avancée manuellement par <Stepper/>
            avec le timeScale (slow-motion, pause propre). */}
        <Physics paused gravity={[0, GRAVITY, 0]} interpolate={false} updatePriority={-1}>
          <Stepper />
          <CharacterController />
          <CameraRig />
          <World />
        </Physics>
        <Effects />
        {/* précompile shaders et textures au chargement : plus de stutter
            à la découverte des zones */}
        <Preload all />
      </Canvas>

      <HUD />
      <ControlsHint />
      <TitleScreen onStart={lockPointer} />
      <PauseMenu onResume={lockPointer} />
      <EndScreen onRestart={lockPointer} />
    </>
  );
}
