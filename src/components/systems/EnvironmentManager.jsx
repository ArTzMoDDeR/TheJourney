import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { runtime } from '../../store/runtime';

// Lumière claire et lisible, du sol poussiéreux du village jusqu'à la
// lumière du ciel. Brume douce pour la profondeur, jamais opaque.

const KEYS = [
  { y: 0,   fog: 0.004, sky: '#cfe0ee', gnd: '#7a6a52', hemiI: 0.9, sun: '#fff2d6', sunI: 1.6, amb: 0.5 },
  { y: 55,  fog: 0.004, sky: '#cfe0ee', gnd: '#6a6a72', hemiI: 0.9, sun: '#fff2d6', sunI: 1.6, amb: 0.5 },
  { y: 130, fog: 0.0035, sky: '#d6e6f2', gnd: '#6a7a6a', hemiI: 0.95, sun: '#fff4dc', sunI: 1.7, amb: 0.52 },
  { y: 205, fog: 0.003, sky: '#e6f0fb', gnd: '#9aaec0', hemiI: 1.05, sun: '#fff8e8', sunI: 1.8, amb: 0.6 },
  { y: 300, fog: 0.0022, sky: '#f4f8ff', gnd: '#dfe8f4', hemiI: 1.2, sun: '#fffdf4', sunI: 1.9, amb: 0.7 },
];

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();

function lerpKeys(y, prop, isColor, out) {
  let a = KEYS[0];
  let b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (y >= KEYS[i].y && y <= KEYS[i + 1].y) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  if (y >= KEYS[KEYS.length - 1].y) a = b = KEYS[KEYS.length - 1];
  const t = a === b ? 0 : THREE.MathUtils.clamp((y - a.y) / (b.y - a.y), 0, 1);
  if (isColor) {
    _c1.set(a[prop]);
    _c2.set(b[prop]);
    return out.copy(_c1).lerp(_c2, t);
  }
  return a[prop] + (b[prop] - a[prop]) * t;
}

export function EnvironmentManager() {
  const scene = useThree((st) => st.scene);
  const hemi = useRef();
  const sun = useRef();
  const amb = useRef();
  const fog = useMemo(() => new THREE.FogExp2('#cfe0ee', 0.004), []);

  useFrame(() => {
    const y = runtime.playerPos.y;
    scene.fog = fog;
    scene.background = null; // le dôme de ciel fait le fond
    fog.density = lerpKeys(y, 'fog', false);
    lerpKeys(y, 'sky', true, fog.color);

    if (hemi.current) {
      lerpKeys(y, 'sky', true, hemi.current.color);
      lerpKeys(y, 'gnd', true, hemi.current.groundColor);
      hemi.current.intensity = lerpKeys(y, 'hemiI', false);
    }
    if (amb.current) amb.current.intensity = lerpKeys(y, 'amb', false);
    if (sun.current) {
      lerpKeys(y, 'sun', true, sun.current.color);
      sun.current.intensity = lerpKeys(y, 'sunI', false);
      const p = runtime.playerPos;
      sun.current.position.set(p.x + 26, p.y + 38, p.z + 20);
      sun.current.target.position.set(p.x, p.y, p.z);
      sun.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#cfe0ee', '#7a6a52', 0.9]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={1.6}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0004}
      />
      <ambientLight ref={amb} intensity={0.5} />
    </>
  );
}
