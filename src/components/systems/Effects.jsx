import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { runtime } from '../../store/runtime';

// Post-processing : bloom (marqué au paradis via les matériaux émissifs),
// vignette poétique, aberration chromatique légère pendant le slow-motion.
export function Effects() {
  const current = useRef(0);
  // Vector2 partagé avec l'uniform de l'effet : muté chaque frame, zéro re-render
  const offsetVec = useMemo(() => new THREE.Vector2(0.0002, 0.0001), []);

  useFrame((_, dt) => {
    const target = runtime.slowmoActive ? 0.0022 : 0.0002;
    current.current = THREE.MathUtils.damp(current.current, target, 8, dt);
    offsetVec.set(current.current, current.current * 0.6);
  });

  return (
    <EffectComposer disableNormalPass>
      <Bloom luminanceThreshold={0.8} intensity={0.85} mipmapBlur radius={0.7} />
      <ChromaticAberration offset={offsetVec} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
    </EffectComposer>
  );
}
