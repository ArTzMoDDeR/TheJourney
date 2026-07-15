import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { runtime } from '../../store/runtime';

// Ambiance continue le long de la tour : brouillard, couleur de fond,
// lumières — interpolés selon l'altitude du joueur. C'est la transition
// "fondu architectural" entre biomes demandée par le brief.

// Points-clés d'ambiance par altitude
const KEYS = [
  { y: 0,   bg: '#2e2231', fog: 0.030, hemiSky: '#ffd9a8', hemiGnd: '#4a3226', hemiI: 0.55, sun: '#ffc98d', sunI: 1.15 },
  { y: 70,  bg: '#33283a', fog: 0.026, hemiSky: '#ffd9a8', hemiGnd: '#4a3226', hemiI: 0.5,  sun: '#ffc98d', sunI: 1.0 },
  { y: 100, bg: '#39434e', fog: 0.024, hemiSky: '#cfe4ff', hemiGnd: '#2c343c', hemiI: 0.55, sun: '#dceeff', sunI: 1.0 },
  { y: 170, bg: '#3c4650', fog: 0.022, hemiSky: '#cfe4ff', hemiGnd: '#2c343c', hemiI: 0.5,  sun: '#dceeff', sunI: 0.9 },
  { y: 200, bg: '#41454b', fog: 0.026, hemiSky: '#c6cbd2', hemiGnd: '#33363b', hemiI: 0.5,  sun: '#d7dade', sunI: 0.75 },
  { y: 270, bg: '#4a4e55', fog: 0.022, hemiSky: '#c6cbd2', hemiGnd: '#33363b', hemiI: 0.55, sun: '#e2e4e8', sunI: 0.8 },
  { y: 300, bg: '#c9b795', fog: 0.012, hemiSky: '#fff3d8', hemiGnd: '#c0a884', hemiI: 0.8,  sun: '#ffedc4', sunI: 1.3 },
  { y: 365, bg: '#f2e7cd', fog: 0.007, hemiSky: '#fffaf0', hemiGnd: '#e8d8b8', hemiI: 1.0, sun: '#fff3d4', sunI: 1.5 },
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

  const fog = useMemo(() => new THREE.FogExp2('#2e2231', 0.03), []);
  const bg = useMemo(() => new THREE.Color('#2e2231'), []);

  useFrame(() => {
    const y = runtime.playerPos.y;
    scene.fog = fog;
    lerpKeys(y, 'bg', true, fog.color);
    bg.copy(fog.color);
    scene.background = bg;
    fog.density = lerpKeys(y, 'fog', false);

    if (hemi.current) {
      lerpKeys(y, 'hemiSky', true, hemi.current.color);
      lerpKeys(y, 'hemiGnd', true, hemi.current.groundColor);
      hemi.current.intensity = lerpKeys(y, 'hemiI', false);
    }
    if (sun.current) {
      lerpKeys(y, 'sun', true, sun.current.color);
      sun.current.intensity = lerpKeys(y, 'sunI', false);
      // le soleil (et son ombre) suit le joueur le long de la tour
      const p = runtime.playerPos;
      sun.current.position.set(p.x + 18, p.y + 30, p.z + 12);
      sun.current.target.position.set(p.x, p.y, p.z);
      sun.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffd9a8', '#4a3226', 0.55]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={1.15}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={0.25} />
    </>
  );
}
