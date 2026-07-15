import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { runtime } from '../../store/runtime';

// Lumière et brume continues le long de l'ascension.
// Une vie en une journée : nuit douce (chambre), aube (école),
// jour blanc (bureau), heure dorée (paradis).

const KEYS = [
  { y: 0,   fog: 0.016, hemiSky: '#8a7dbf', hemiGnd: '#3a2a26', hemiI: 0.5,  sun: '#b8c4ff', sunI: 0.5,  amb: 0.3 },
  { y: 60,  fog: 0.013, hemiSky: '#8a7dbf', hemiGnd: '#3a2a26', hemiI: 0.5,  sun: '#b8c4ff', sunI: 0.55, amb: 0.3 },
  { y: 75,  fog: 0.006, hemiSky: '#ffc9a0', hemiGnd: '#4a4258', hemiI: 0.65, sun: '#ffb98a', sunI: 1.1,  amb: 0.32 },
  { y: 140, fog: 0.006, hemiSky: '#ffd9b8', hemiGnd: '#565064', hemiI: 0.6,  sun: '#ffcf9e', sunI: 1.0,  amb: 0.32 },
  { y: 155, fog: 0.0075, hemiSky: '#cdd3da', hemiGnd: '#5a5d64', hemiI: 0.6, sun: '#e8ecf2', sunI: 0.95, amb: 0.35 },
  { y: 222, fog: 0.007, hemiSky: '#cdd3da', hemiGnd: '#5a5d64', hemiI: 0.6,  sun: '#eef1f5', sunI: 1.0,  amb: 0.35 },
  { y: 238, fog: 0.004, hemiSky: '#ffe9c0', hemiGnd: '#c9a878', hemiI: 0.85, sun: '#ffdf9e', sunI: 1.45, amb: 0.4 },
  { y: 295, fog: 0.003, hemiSky: '#fff4d8', hemiGnd: '#e8d0a0', hemiI: 1.0,  sun: '#ffe9b8', sunI: 1.6,  amb: 0.45 },
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

  // brume de profondeur uniquement — le fond (ciel, ville, montagnes)
  // n'est pas foggé : il reste visible à l'infini
  const fog = useMemo(() => new THREE.FogExp2('#3a2a3e', 0.016), []);

  useFrame(() => {
    const y = runtime.playerPos.y;
    scene.fog = fog;
    scene.background = null; // le dôme de ciel fait le fond
    fog.density = lerpKeys(y, 'fog', false);
    // la brume prend la couleur de l'horizon du moment
    fog.color.set('#3a2a3e');
    if (y > 60) fog.color.set('#8a7488');
    if (y > 145) fog.color.set('#b9bec6');
    if (y > 230) fog.color.set('#e8cfa0');

    if (hemi.current) {
      lerpKeys(y, 'hemiSky', true, hemi.current.color);
      lerpKeys(y, 'hemiGnd', true, hemi.current.groundColor);
      hemi.current.intensity = lerpKeys(y, 'hemiI', false);
    }
    if (amb.current) amb.current.intensity = lerpKeys(y, 'amb', false);
    if (sun.current) {
      lerpKeys(y, 'sun', true, sun.current.color);
      sun.current.intensity = lerpKeys(y, 'sunI', false);
      const p = runtime.playerPos;
      sun.current.position.set(p.x + 24, p.y + 34, p.z + 16);
      sun.current.target.position.set(p.x, p.y, p.z);
      sun.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#8a7dbf', '#3a2a26', 0.5]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={0.6}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0004}
      />
      <ambientLight ref={amb} intensity={0.3} />
    </>
  );
}
