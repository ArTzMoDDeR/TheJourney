import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { runtime } from '../../store/runtime';

// Silhouette humaine low-poly, sans visage — animée procéduralement
// (idle, course, saut, chute, accroché, grimpe, mantle).
// Le groupe est enfant du RigidBody : il suit la capsule automatiquement,
// seule la rotation/pose est gérée ici.

const bodyMat = new THREE.MeshStandardMaterial({
  color: '#232842',
  roughness: 0.75,
  metalness: 0.05,
  emissive: '#4a5aa8',
  emissiveIntensity: 0.12,
});
const hoodMat = new THREE.MeshStandardMaterial({
  color: '#1a1e33',
  roughness: 0.9,
  emissive: '#39457f',
  emissiveIntensity: 0.1,
});

function damp(cur, target, lambda, dt) {
  return THREE.MathUtils.damp(cur, target, lambda, dt);
}

export function PlayerModel() {
  const root = useRef();
  const parts = useRef({});

  const limbGeo = useMemo(() => new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), []);

  useFrame((state, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const p = parts.current;
    const dt = Math.min(rawDelta, 1 / 30) * runtime.timeScale;
    const time = runtime.simTime;

    // Orientation : face au déplacement (ou au mur en grimpe)
    g.rotation.y = runtime.faceYaw;

    const mode = runtime.mode;
    const grounded = runtime.grounded;
    const speed = runtime.speed;
    const vy = runtime.playerVel.y;

    // Cibles de pose par articulation
    let armL = 0, armR = 0, armSpread = 0.12;
    let legL = 0, legR = 0;
    let lean = 0, bodyY = 0;

    if (mode === 'hang') {
      // bras levés agrippés, jambes pendantes avec léger balancement
      const sway = Math.sin(time * 2.2) * 0.08;
      armL = -2.6 + sway;
      armR = -2.6 - sway;
      armSpread = 0.45;
      legL = 0.25 + sway;
      legR = 0.25 - sway;
      lean = 0.25;
      if (runtime.climbAmount > 0) {
        const c = Math.sin(time * 7) * 0.5;
        armL = -2.6 + c;
        armR = -2.6 - c;
        legL = 0.3 + c * 0.6;
        legR = 0.3 - c * 0.6;
      }
    } else if (mode === 'mantle') {
      armL = -2.2;
      armR = -2.2;
      legL = -1.1;
      legR = 0.4;
      lean = 0.5;
    } else if (!grounded) {
      if (vy > 2) {
        // ascension : bras vers l'arrière, jambes groupées
        armL = 0.9;
        armR = 0.9;
        armSpread = 0.35;
        legL = -0.7;
        legR = 0.3;
      } else {
        // chute : membres écartés
        const flail = Math.sin(time * 5) * 0.15;
        armL = -1.9 + flail;
        armR = -1.9 - flail;
        armSpread = 0.9;
        legL = 0.35 + flail;
        legR = -0.25 - flail;
        lean = -0.12;
      }
    } else if (speed > 0.8) {
      // course : balancier bras/jambes
      const freq = speed > 7 ? 11 : 8;
      const ph = time * freq;
      const amp = Math.min(1, speed / 7);
      armL = Math.sin(ph) * 0.9 * amp;
      armR = -Math.sin(ph) * 0.9 * amp;
      legL = -Math.sin(ph) * 1.0 * amp;
      legR = Math.sin(ph) * 1.0 * amp;
      lean = 0.12 * amp + (speed > 7 ? 0.1 : 0);
      bodyY = Math.abs(Math.sin(ph)) * 0.04 * amp;
    } else {
      // idle : respiration
      bodyY = Math.sin(time * 1.8) * 0.015;
      armL = 0.06 + Math.sin(time * 1.8) * 0.02;
      armR = 0.06 - Math.sin(time * 1.8) * 0.02;
    }

    const L = 14; // vitesse de transition des poses
    if (p.armL) {
      p.armL.rotation.x = damp(p.armL.rotation.x, armL, L, dt);
      p.armR.rotation.x = damp(p.armR.rotation.x, armR, L, dt);
      p.armL.rotation.z = damp(p.armL.rotation.z, armSpread, L, dt);
      p.armR.rotation.z = damp(p.armR.rotation.z, -armSpread, L, dt);
      p.legL.rotation.x = damp(p.legL.rotation.x, legL, L, dt);
      p.legR.rotation.x = damp(p.legR.rotation.x, legR, L, dt);
      p.torso.rotation.x = damp(p.torso.rotation.x, lean, L, dt);
      p.torso.position.y = damp(p.torso.position.y, bodyY, L, dt);
    }
  }, -1);

  const set = (name) => (el) => {
    parts.current[name] = el;
  };

  return (
    <group ref={root}>
      <group ref={set('torso')}>
        {/* buste */}
        <mesh castShadow position={[0, 0.15, 0]} material={bodyMat}>
          <capsuleGeometry args={[0.21, 0.5, 4, 12]} />
        </mesh>
        {/* tête + capuche */}
        <mesh castShadow position={[0, 0.68, 0]} material={hoodMat}>
          <sphereGeometry args={[0.16, 12, 10]} />
        </mesh>
        <mesh position={[0, 0.74, -0.02]} rotation={[0.35, 0, 0]} material={hoodMat}>
          <coneGeometry args={[0.15, 0.24, 10]} />
        </mesh>
        {/* bras (pivot à l'épaule) */}
        <group ref={set('armL')} position={[-0.24, 0.42, 0]}>
          <mesh castShadow position={[0, -0.28, 0]} geometry={limbGeo} material={bodyMat} />
        </group>
        <group ref={set('armR')} position={[0.24, 0.42, 0]}>
          <mesh castShadow position={[0, -0.28, 0]} geometry={limbGeo} material={bodyMat} />
        </group>
        {/* jambes (pivot à la hanche) */}
        <group ref={set('legL')} position={[-0.11, -0.2, 0]}>
          <mesh castShadow position={[0, -0.32, 0]} geometry={limbGeo} material={bodyMat} />
        </group>
        <group ref={set('legR')} position={[0.11, -0.2, 0]}>
          <mesh castShadow position={[0, -0.32, 0]} geometry={limbGeo} material={bodyMat} />
        </group>
      </group>
    </group>
  );
}
