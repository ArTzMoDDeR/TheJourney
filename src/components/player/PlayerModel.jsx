import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { runtime } from '../../store/runtime';
import { fabricTexture } from '../../utils/textures';

// LE VOYAGEUR — personnage entièrement procédural mais avec une âme :
// tunique rouge à liseré doré (hommage à Journey), capuche, regard lumineux,
// écharpe qui flotte, bras et jambes articulés (coudes/genoux).
// Animations : idle (respiration + regard), course (cycle jambes/bras),
// saut, chute (cape qui s'évase), échelle (montée main sur main),
// squash à l'atterrissage, stretch au trampoline.

const cloak = new THREE.MeshStandardMaterial({
  map: fabricTexture('#8a2f2b', '#6e2320'),
  roughness: 0.85,
  emissive: '#3a0f0c',
  emissiveIntensity: 0.25,
});
const trim = new THREE.MeshStandardMaterial({
  color: '#d9a441',
  roughness: 0.4,
  metalness: 0.4,
  emissive: '#7a5210',
  emissiveIntensity: 0.4,
});
const limb = new THREE.MeshStandardMaterial({
  color: '#2a2436',
  roughness: 0.8,
  emissive: '#151022',
  emissiveIntensity: 0.3,
});
const scarfMat = new THREE.MeshStandardMaterial({
  color: '#f2e3c2',
  roughness: 0.9,
  emissive: '#5a4c30',
  emissiveIntensity: 0.25,
  side: THREE.DoubleSide,
});
const faceDark = new THREE.MeshStandardMaterial({ color: '#12101e', roughness: 0.6 });
const eyes = new THREE.MeshStandardMaterial({
  color: '#fff',
  emissive: '#ffd9a0',
  emissiveIntensity: 2.4,
});

function damp(cur, target, lambda, dt) {
  return THREE.MathUtils.damp(cur, target, lambda, dt);
}

export function PlayerModel() {
  const root = useRef();
  const squash = useRef();
  const parts = useRef({});
  const anim = useRef({ runPh: 0, climbPh: 0 }).current;

  const upperGeo = useMemo(() => new THREE.CapsuleGeometry(0.07, 0.26, 4, 8), []);
  const lowerGeo = useMemo(() => new THREE.CapsuleGeometry(0.06, 0.24, 4, 8), []);
  const scarfGeo = useMemo(() => new THREE.BoxGeometry(0.16, 0.02, 0.26), []);

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

    // avance des cycles
    anim.runPh += dt * (4 + speed * 1.1);
    anim.climbPh += dt * Math.abs(runtime.climbDir) * 6;

    // cibles d'articulations
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
        flare = 1.22;
        scarfLift = 1.0;
        hood = -0.2;
      }
    } else if (speed > 0.8) {
      const amp = Math.min(1, speed / 7);
      const ph = anim.runPh;
      thighL = Math.sin(ph) * 1.0 * amp;
      thighR = -Math.sin(ph) * 1.0 * amp;
      // le genou plie pendant le retour de la jambe
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
      // idle : respiration, regard qui se promène
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

    // écharpe : vague qui court le long des segments
    for (let i = 0; i < 4; i++) {
      const seg = p[`scarf${i}`];
      if (!seg) continue;
      const wave = Math.sin(time * (5 + speed * 0.5) - i * 0.9) * (0.12 + speed * 0.02);
      seg.rotation.x = damp(
        seg.rotation.x,
        0.35 + wave - scarfLift * (0.5 + i * 0.18),
        10,
        dt
      );
    }

    // squash & stretch (atterrissage / trampoline)
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

  return (
    <group ref={root}>
      <group ref={squash}>
        <group ref={set('torso')}>
          {/* tunique évasée */}
          <group ref={set('robe')}>
            <mesh castShadow position={[0, 0.05, 0]} material={cloak}>
              <cylinderGeometry args={[0.2, 0.34, 0.95, 12]} />
            </mesh>
            {/* liseré doré à l'ourlet */}
            <mesh position={[0, -0.4, 0]} material={trim}>
              <cylinderGeometry args={[0.345, 0.35, 0.06, 12]} />
            </mesh>
          </group>
          {/* épaules */}
          <mesh castShadow position={[0, 0.5, 0]} material={cloak}>
            <sphereGeometry args={[0.24, 12, 10]} />
          </mesh>
          {/* tête + capuche + visage lumineux */}
          <group ref={set('head')} position={[0, 0.78, 0]}>
            <mesh castShadow material={cloak}>
              <sphereGeometry args={[0.19, 14, 12]} />
            </mesh>
            {/* pointe de capuche */}
            <mesh position={[0, 0.16, -0.1]} rotation={[-0.6, 0, 0]} material={cloak}>
              <coneGeometry args={[0.12, 0.3, 10]} />
            </mesh>
            {/* visage sombre */}
            <mesh position={[0, -0.01, 0.13]} rotation={[0, 0, 0]} material={faceDark}>
              <sphereGeometry args={[0.12, 10, 8]} />
            </mesh>
            {/* yeux lumineux */}
            <mesh position={[-0.05, 0.01, 0.22]} material={eyes}>
              <sphereGeometry args={[0.022, 6, 6]} />
            </mesh>
            <mesh position={[0.05, 0.01, 0.22]} material={eyes}>
              <sphereGeometry args={[0.022, 6, 6]} />
            </mesh>
          </group>
          {/* écharpe : segments chaînés dans le dos */}
          <group position={[0, 0.62, -0.16]}>
            <group ref={set('scarf0')}>
              <mesh geometry={scarfGeo} material={scarfMat} position={[0, 0, -0.13]} />
              <group position={[0, 0, -0.26]}>
                <group ref={set('scarf1')}>
                  <mesh geometry={scarfGeo} material={scarfMat} position={[0, 0, -0.13]} />
                  <group position={[0, 0, -0.26]}>
                    <group ref={set('scarf2')}>
                      <mesh geometry={scarfGeo} material={scarfMat} position={[0, 0, -0.13]} />
                      <group position={[0, 0, -0.26]}>
                        <group ref={set('scarf3')}>
                          <mesh geometry={scarfGeo} material={scarfMat} position={[0, 0, -0.11]} scale={[0.75, 1, 0.9]} />
                        </group>
                      </group>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
          {/* bras articulés (épaule → coude) */}
          <group ref={set('armL')} position={[-0.27, 0.44, 0]}>
            <mesh castShadow position={[0, -0.17, 0]} geometry={upperGeo} material={cloak} />
            <group ref={set('elbL')} position={[0, -0.34, 0]}>
              <mesh castShadow position={[0, -0.14, 0]} geometry={lowerGeo} material={limb} />
            </group>
          </group>
          <group ref={set('armR')} position={[0.27, 0.44, 0]}>
            <mesh castShadow position={[0, -0.17, 0]} geometry={upperGeo} material={cloak} />
            <group ref={set('elbR')} position={[0, -0.34, 0]}>
              <mesh castShadow position={[0, -0.14, 0]} geometry={lowerGeo} material={limb} />
            </group>
          </group>
          {/* jambes articulées (hanche → genou) + pieds */}
          <group ref={set('thighL')} position={[-0.11, -0.32, 0]}>
            <mesh castShadow position={[0, -0.16, 0]} geometry={upperGeo} material={limb} />
            <group ref={set('shinL')} position={[0, -0.32, 0]}>
              <mesh castShadow position={[0, -0.14, 0]} geometry={lowerGeo} material={limb} />
              <mesh castShadow position={[0, -0.28, 0.04]} material={limb}>
                <boxGeometry args={[0.11, 0.06, 0.2]} />
              </mesh>
            </group>
          </group>
          <group ref={set('thighR')} position={[0.11, -0.32, 0]}>
            <mesh castShadow position={[0, -0.16, 0]} geometry={upperGeo} material={limb} />
            <group ref={set('shinR')} position={[0, -0.32, 0]}>
              <mesh castShadow position={[0, -0.14, 0]} geometry={lowerGeo} material={limb} />
              <mesh castShadow position={[0, -0.28, 0.04]} material={limb}>
                <boxGeometry args={[0.11, 0.06, 0.2]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
