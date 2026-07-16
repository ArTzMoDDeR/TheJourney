import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { runtime } from '../../store/runtime';

// Lumière et brume continues le long de l'ascension.
// Une vie en une journée : nuit douce (chambre), aube (école),
// jour blanc (bureau), heure dorée (paradis).

const KEYS = [
  { y: 0,   fog: 0.016, hemiSky: '#8a7dbf', hemiGnd: '#3a2a26', hemiI: 0.5,  sun: '#b8c4ff', sunI: 0.5,  amb: 0.3 },
  { y: 66,  fog: 0.013, hemiSky: '#8a7dbf', hemiGnd: '#3a2a26', hemiI: 0.5,  sun: '#b8c4ff', sunI: 0.55, amb: 0.3 },
  { y: 80,  fog: 0.0042, hemiSky: '#bfe0a8', hemiGnd: '#2c4224', hemiI: 0.75, sun: '#ffeec2', sunI: 1.15, amb: 0.3 },
  { y: 160, fog: 0.0042, hemiSky: '#bfe0a8', hemiGnd: '#2c4224', hemiI: 0.7,  sun: '#ffeec2', sunI: 1.1,  amb: 0.3 },
  { y: 178, fog: 0.005, hemiSky: '#dfeefc', hemiGnd: '#7a92a8', hemiI: 0.85, sun: '#eef6ff', sunI: 1.3,  amb: 0.38 },
  { y: 252, fog: 0.005, hemiSky: '#dfeefc', hemiGnd: '#7a92a8', hemiI: 0.8,  sun: '#eef6ff', sunI: 1.25, amb: 0.38 },
  { y: 268, fog: 0.006, hemiSky: '#ffc9a0', hemiGnd: '#4a4258', hemiI: 0.65, sun: '#ffb98a', sunI: 1.1,  amb: 0.32 },
  { y: 330, fog: 0.006, hemiSky: '#ffd9b8', hemiGnd: '#565064', hemiI: 0.6,  sun: '#ffcf9e', sunI: 1.0,  amb: 0.32 },
  { y: 346, fog: 0.0075, hemiSky: '#cdd3da', hemiGnd: '#5a5d64', hemiI: 0.6, sun: '#e8ecf2', sunI: 0.95, amb: 0.35 },
  { y: 415, fog: 0.006, hemiSky: '#cdd3da', hemiGnd: '#5a5d64', hemiI: 0.6,  sun: '#eef1f5', sunI: 1.0,  amb: 0.35 },
  { y: 434, fog: 0.0012, hemiSky: '#2a3050', hemiGnd: '#0c0e18', hemiI: 0.3, sun: '#f4f8ff', sunI: 1.5,  amb: 0.14 },
  { y: 498, fog: 0.0012, hemiSky: '#2a3050', hemiGnd: '#0c0e18', hemiI: 0.35, sun: '#fff2d0', sunI: 1.5, amb: 0.18 },
  { y: 512, fog: 0.003, hemiSky: '#ffe9c0', hemiGnd: '#c9a878', hemiI: 0.85, sun: '#ffdf9e', sunI: 1.5,  amb: 0.4 },
  { y: 556, fog: 0.003, hemiSky: '#fff4d8', hemiGnd: '#e8d0a0', hemiI: 1.0,  sun: '#ffe9b8', sunI: 1.6,  amb: 0.45 },
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
    if (y > 66) fog.color.set('#c2d8c4'); // jungle
    if (y > 170) fog.color.set('#d8e8f4'); // glace
    if (y > 258) fog.color.set('#c99a88'); // aube
    if (y > 340) fog.color.set('#b9bec6'); // bureau
    if (y > 428) fog.color.set('#0a0c16'); // espace
    if (y > 505) fog.color.set('#e8cfa0'); // paradis

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
        shadow-mapSize={[1024, 1024]}
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
