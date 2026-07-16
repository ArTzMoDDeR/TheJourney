import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { runtime } from '../../store/runtime';
import { robeTexture } from '../../utils/textures';

// LE VOYAGEUR — tunique rouge tissée à motifs dorés (hommage à Journey),
// capuche effilée, regard lumineux, longue écharpe qui ondule.
// Bras/jambes articulés (coudes, genoux), animations procédurales :
// idle, course, saut, chute (cape évasée), échelle, squash/stretch.

const cloak = new THREE.MeshStandardMaterial({
  map: robeTexture(),
  roughness: 0.8,
  emissive: '#3a0f0c',
  emissiveIntensity: 0.22,
});
const cloakPlain = new THREE.MeshStandardMaterial({
  color: '#8a2f2b',
  roughness: 0.85,
  emissive: '#3a0f0c',
  emissiveIntensity: 0.22,
});
const trim = new THREE.MeshStandardMaterial({
  color: '#d9a441',
  roughness: 0.35,
  metalness: 0.5,
  emissive: '#8a5c14',
  emissiveIntensity: 0.5,
});
const limb = new THREE.MeshStandardMaterial({
  color: '#241f30',
  roughness: 0.75,
  emissive: '#141020',
  emissiveIntensity: 0.35,
});
const scarfMat = new THREE.MeshStandardMaterial({
  color: '#f2e3c2',
  roughness: 0.85,
  emissive: '#6a5a38',
  emissiveIntensity: 0.3,
  side: THREE.DoubleSide,
});
const scarfTip = new THREE.MeshStandardMaterial({
  color: '#d9a441',
  roughness: 0.7,
  emissive: '#7a5210',
  emissiveIntensity: 0.5,
  side: THREE.DoubleSide,
});
const faceDark = new THREE.MeshStandardMaterial({ color: '#0e0c18', roughness: 0.4 });
const eyes = new THREE.MeshStandardMaterial({
  color: '#fff',
  emissive: '#ffe2ae',
  emissiveIntensity: 3,
});

function damp(cur, target, lambda, dt) {
  return THREE.MathUtils.damp(cur, target, lambda, dt);
}

const SCARF_N = 6;

export function PlayerModel() {
  const root = useRef();
  const squash = useRef();
  const parts = useRef({});
  const anim = useRef({ runPh: 0, climbPh: 0 }).current;

  const upperGeo = useMemo(() => new THREE.CapsuleGeometry(0.062, 0.26, 4, 10), []);
  const lowerGeo = useMemo(() => new THREE.CapsuleGeometry(0.052, 0.24, 4, 10), []);

  const set = (name) => (el) => {
    parts.current[name] = el;
  };

  useFrame((_, rawDelta) => {
    const g = root.current;
    const p = parts.current;
    if (!g || !p.armL) return;
    const dt = Math.min(rawDelta, 1 / 30) * runtime.timeScale;
    const time = runtime.simTime;

    g.rotation.y = runtime.faceYaw;

    const mode = runtime.mode;
    const grounded = runtime.grounded;
    const speed = runtime.speed;
    const vy = runtime.playerVel.y;

    anim.runPh += dt * (4 + speed * 1.1);
    anim.climbPh += dt * Math.abs(runtime.climbDir) * 6;

    let armL = 0.1, armR = 0.1, elbL = -0.3, elbR = -0.3, spread = 0.1;
    let thighL = 0, thighR = 0, shinL = 0.05, shinR = 0.05;
    let lean = 0, bob = 0, hood = 0, flare = 1, scarfLift = 0;

    if (mode === 'ladder') {
      const c = Math.sin(anim.climbPh);
      armL = -2.5 + c * 0.45;
      armR = -2.5 - c * 0.45;
      elbL = -0.5;
      elbR = -0.5;
      spread = 0.32;
      thighL = -0.6 - c * 0.5;
      thighR = -0.6 + c * 0.5;
      shinL = 1.0 + c * 0.4;
      shinR = 1.0 - c * 0.4;
      lean = 0.16;
      hood = -0.15;
    } else if (mode === 'mantle') {
      armL = -2.1;
      armR = -2.1;
      elbL = -1.1;
      elbR = -1.1;
      thighL = -1.3;
      thighR = 0.2;
      shinL = 1.6;
      shinR = 0.4;
      lean = 0.5;
    } else if (!grounded) {
      if (vy > 2) {
        armL = 0.9;
        armR = 0.9;
        elbL = -0.6;
        elbR = -0.6;
        spread = 0.4;
        thighL = -0.9;
        thighR = 0.25;
        shinL = 1.4;
        shinR = 0.5;
        lean = 0.1;
        scarfLift = 0.4;
      } else {
        const fl = Math.sin(time * 5) * 0.12;
        armL = -2.0 + fl;
        armR = -2.0 - fl;
        elbL = -0.4;
        elbR = -0.4;
        spread = 1.0;
        thighL = 0.3 + fl;
        thighR = -0.2 - fl;
        shinL = 0.5;
        shinR = 0.35;
        lean = -0.14;
        flare = 1.25;
        scarfLift = 1.0;
        hood = -0.2;
      }
    } else if (speed > 0.8) {
      const amp = Math.min(1, speed / 7);
      const ph = anim.runPh;
      thighL = Math.sin(ph) * 1.0 * amp;
      thighR = -Math.sin(ph) * 1.0 * amp;
      shinL = Math.max(0.08, -Math.sin(ph - 0.7)) * 1.15 * amp;
      shinR = Math.max(0.08, Math.sin(ph - 0.7)) * 1.15 * amp;
      armL = -Math.sin(ph) * 0.85 * amp;
      armR = Math.sin(ph) * 0.85 * amp;
      elbL = -0.5 - Math.max(0, Math.sin(ph)) * 0.5 * amp;
      elbR = -0.5 - Math.max(0, -Math.sin(ph)) * 0.5 * amp;
      lean = 0.14 * amp + (speed > 7.5 ? 0.1 : 0);
      bob = Math.abs(Math.sin(ph)) * 0.05 * amp;
      scarfLift = 0.25 + amp * 0.3;
    } else {
      bob = Math.sin(time * 1.7) * 0.018;
      armL = 0.08 + Math.sin(time * 1.7) * 0.03;
      armR = 0.08 - Math.sin(time * 1.7) * 0.03;
      elbL = -0.25;
      elbR = -0.25;
      hood = Math.sin(time * 0.35) * 0.12;
    }

    const L = 13;
    p.armL.rotation.x = damp(p.armL.rotation.x, armL, L, dt);
    p.armR.rotation.x = damp(p.armR.rotation.x, armR, L, dt);
    p.armL.rotation.z = damp(p.armL.rotation.z, spread, L, dt);
    p.armR.rotation.z = damp(p.armR.rotation.z, -spread, L, dt);
    p.elbL.rotation.x = damp(p.elbL.rotation.x, elbL, L, dt);
    p.elbR.rotation.x = damp(p.elbR.rotation.x, elbR, L, dt);
    p.thighL.rotation.x = damp(p.thighL.rotation.x, thighL, L, dt);
    p.thighR.rotation.x = damp(p.thighR.rotation.x, thighR, L, dt);
    p.shinL.rotation.x = damp(p.shinL.rotation.x, shinL, L, dt);
    p.shinR.rotation.x = damp(p.shinR.rotation.x, shinR, L, dt);
    p.torso.rotation.x = damp(p.torso.rotation.x, lean, L, dt);
    p.torso.position.y = damp(p.torso.position.y, bob, L, dt);
    p.head.rotation.y = damp(p.head.rotation.y, hood, 6, dt);
    p.robe.scale.x = damp(p.robe.scale.x, flare, 8, dt);
    p.robe.scale.z = damp(p.robe.scale.z, flare, 8, dt);

    for (let i = 0; i < SCARF_N; i++) {
      const seg = p[`scarf${i}`];
      if (!seg) continue;
      const wave = Math.sin(time * (5 + speed * 0.5) - i * 0.8) * (0.13 + speed * 0.02);
      seg.rotation.x = damp(
        seg.rotation.x,
        0.32 + wave - scarfLift * (0.45 + i * 0.14),
        10,
        dt
      );
      seg.rotation.z = damp(seg.rotation.z, Math.sin(time * 2.4 - i) * 0.06, 6, dt);
    }

    const sq = squash.current;
    if (sq) {
      let sy = 1;
      const eLand = time - runtime.landedAt;
      const eBounce = time - runtime.bouncedAt;
      if (eLand >= 0 && eLand < 0.28) sy = 1 - Math.sin((eLand / 0.28) * Math.PI) * 0.18;
      if (eBounce >= 0 && eBounce < 0.3) sy = 1 + Math.sin((eBounce / 0.3) * Math.PI) * 0.22;
      sq.scale.set(2 - sy, sy, 2 - sy);
    }
  }, -1);

  // écharpe : chaîne récursive de segments effilés
  const scarfChain = (i) => {
    if (i >= SCARF_N) return null;
    const w = 0.18 - i * 0.018;
    return (
      <group ref={set(`scarf${i}`)}>
        <mesh material={i >= SCARF_N - 2 ? scarfTip : scarfMat} position={[0, 0, -0.12]}>
          <boxGeometry args={[w, 0.025, 0.24]} />
        </mesh>
        <group position={[0, 0, -0.24]}>{scarfChain(i + 1)}</group>
      </group>
    );
  };

  return (
    <group ref={root}>
      <group ref={squash}>
        <group ref={set('torso')}>
          {/* tunique évasée, motifs dorés tissés */}
          <group ref={set('robe')}>
            <mesh castShadow position={[0, 0.02, 0]} material={cloak}>
              <cylinderGeometry args={[0.17, 0.38, 1.02, 18]} />
            </mesh>
          </group>
          {/* épaules douces */}
          <mesh castShadow position={[0, 0.52, 0]} material={cloakPlain} scale={[1, 0.8, 0.9]}>
            <sphereGeometry args={[0.23, 16, 12]} />
          </mesh>
          {/* liseré d'or au col */}
          <mesh position={[0, 0.62, 0]} material={trim}>
            <torusGeometry args={[0.14, 0.025, 8, 18]} />
          </mesh>
          {/* tête et capuche effilée vers l'arrière */}
          <group ref={set('head')} position={[0, 0.8, 0]}>
            <mesh castShadow material={cloakPlain} scale={[0.92, 1, 1.05]}>
              <sphereGeometry args={[0.185, 18, 14]} />
            </mesh>
            <mesh castShadow position={[0, 0.1, -0.16]} rotation={[-1.15, 0, 0]} material={cloakPlain}>
              <coneGeometry args={[0.115, 0.36, 12]} />
            </mesh>
            {/* visage d'ombre */}
            <mesh position={[0, -0.01, 0.115]} scale={[0.82, 1, 0.62]} material={faceDark}>
              <sphereGeometry args={[0.125, 14, 10]} />
            </mesh>
            {/* deux yeux de lumière */}
            <mesh position={[-0.048, 0.015, 0.21]} scale={[1, 1.5, 0.6]} material={eyes}>
              <sphereGeometry args={[0.02, 8, 8]} />
            </mesh>
            <mesh position={[0.048, 0.015, 0.21]} scale={[1, 1.5, 0.6]} material={eyes}>
              <sphereGeometry args={[0.02, 8, 8]} />
            </mesh>
          </group>
          {/* longue écharpe */}
          <group position={[0, 0.6, -0.15]}>{scarfChain(0)}</group>
          {/* bras (manches puis avant-bras sombres) */}
          <group ref={set('armL')} position={[-0.25, 0.46, 0]}>
            <mesh castShadow position={[0, -0.16, 0]} geometry={upperGeo} material={cloakPlain} />
            <group ref={set('elbL')} position={[0, -0.33, 0]}>
              <mesh castShadow position={[0, -0.13, 0]} geometry={lowerGeo} material={limb} />
            </group>
          </group>
          <group ref={set('armR')} position={[0.25, 0.46, 0]}>
            <mesh castShadow position={[0, -0.16, 0]} geometry={upperGeo} material={cloakPlain} />
            <group ref={set('elbR')} position={[0, -0.33, 0]}>
              <mesh castShadow position={[0, -0.13, 0]} geometry={lowerGeo} material={limb} />
            </group>
          </group>
          {/* jambes fines, pieds arrondis */}
          <group ref={set('thighL')} position={[-0.1, -0.34, 0]}>
            <mesh castShadow position={[0, -0.15, 0]} geometry={upperGeo} material={limb} />
            <group ref={set('shinL')} position={[0, -0.31, 0]}>
              <mesh castShadow position={[0, -0.13, 0]} geometry={lowerGeo} material={limb} />
              <mesh castShadow position={[0, -0.27, 0.045]} scale={[1, 0.6, 1.5]} material={limb}>
                <sphereGeometry args={[0.065, 10, 8]} />
              </mesh>
            </group>
          </group>
          <group ref={set('thighR')} position={[0.1, -0.34, 0]}>
            <mesh castShadow position={[0, -0.15, 0]} geometry={upperGeo} material={limb} />
            <group ref={set('shinR')} position={[0, -0.31, 0]}>
              <mesh castShadow position={[0, -0.13, 0]} geometry={lowerGeo} material={limb} />
              <mesh castShadow position={[0, -0.27, 0.045]} scale={[1, 0.6, 1.5]} material={limb}>
                <sphereGeometry args={[0.065, 10, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
