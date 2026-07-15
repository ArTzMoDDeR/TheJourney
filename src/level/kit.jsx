import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { M } from '../components/level/materials';
import { registerLadder, registerBouncer } from './ladders';
import { runtime } from '../store/runtime';
import { useGame } from '../store/gameStore';
import { audio } from '../audio/AudioSystem';

// ============================================================ KIT DE JEU
// Briques de gameplay partagées par les quatre mondes :
// boîtes solides, échelles (seul moyen de grimper), trampolines,
// ascenseurs, colonnes de vent, nuages dissolvants, portes de chapitre,
// souvenirs à collectionner, escaliers à courir.

export const isPlayer = (other) => !!other.rigidBody?.userData?.player;

// ------------------------------------------------------------ Boîte solide
// L'atome du level design : mesh + collider exacts.
export function B({ pos, size, rot = 0, mat = M.wood, shadow = true, visible = true }) {
  return (
    <RigidBody type="fixed" colliders={false} position={pos} rotation={[0, rot, 0]}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} friction={0.9} />
      {visible && (
        <mesh castShadow={shadow} receiveShadow material={mat}>
          <boxGeometry args={size} />
        </mesh>
      )}
    </RigidBody>
  );
}

// ------------------------------------------------------- Cylindre solide
export function Cyl({ pos, r, h, rot = 0, mat = M.wood, shadow = true, rTop }) {
  return (
    <RigidBody type="fixed" colliders={false} position={pos} rotation={[0, rot, 0]}>
      <CylinderCollider args={[h / 2, Math.max(r, rTop ?? r)]} friction={0.9} />
      <mesh castShadow={shadow} receiveShadow material={mat}>
        <cylinderGeometry args={[rTop ?? r, r, h, 20]} />
      </mesh>
    </RigidBody>
  );
}

// ---------------------------------------------------------------- Échelle
// LE moyen de grimper. pos = pied de la face d'escalade, yaw = orientation
// de la normale (0 → face vers +z). styles : wood, metal, gym, rope, light.
export function Ladder({ pos, height, yaw = 0, width = 1.1, style = 'wood' }) {
  const nx = Math.sin(yaw);
  const nz = Math.cos(yaw);

  useEffect(
    () =>
      registerLadder({
        cx: pos[0],
        cz: pos[2],
        y0: pos[1],
        y1: pos[1] + height,
        nx,
        nz,
        halfW: width / 2,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const mats = {
    wood: [M.wood, M.woodDark],
    metal: [M.metal, M.officeDark],
    gym: [M.deskTop, M.metal],
    rope: [M.wood, M.teddy],
    light: [M.lightColumn, M.gold],
  }[style] || [M.wood, M.woodDark];

  const rungs = useMemo(() => {
    const arr = [];
    for (let y = 0.35; y < height - 0.15; y += 0.45) arr.push(y);
    return arr;
  }, [height]);

  const railGeo = useMemo(() => new THREE.BoxGeometry(0.09, height, 0.09), [height]);
  const rungGeo = useMemo(() => new THREE.CylinderGeometry(0.045, 0.045, width - 0.1, 8), [width]);

  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      {/* montants (légèrement derrière la face d'escalade) */}
      <mesh position={[-width / 2, height / 2, -0.12]} geometry={railGeo} material={mats[1]} castShadow />
      <mesh position={[width / 2, height / 2, -0.12]} geometry={railGeo} material={mats[1]} castShadow />
      {/* barreaux */}
      {rungs.map((y, i) => (
        <mesh key={i} position={[0, y, -0.12]} rotation={[0, 0, Math.PI / 2]} geometry={rungGeo} material={mats[0]} />
      ))}
    </group>
  );
}

// ------------------------------------------------------------- Trampoline
// Rebond puissant : raccourci qui fait gagner du temps. La zone est
// enregistrée dans un registre lu par le contrôleur (raycast de sol).
export function Trampoline({ pos, size = [4, 1, 4], power = 19, mat = M.mattress, children }) {
  const visual = useRef();

  useEffect(
    () =>
      registerBouncer({
        cx: pos[0],
        cz: pos[2],
        halfW: size[0] / 2,
        halfD: size[2] / 2,
        topY: pos[1] + size[1] / 2,
        power,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(() => {
    if (!visual.current) return;
    // squash & stretch quand le joueur rebondit ici
    const e = runtime.simTime - runtime.bouncedAt;
    const near =
      Math.abs(runtime.playerPos.x - pos[0]) < size[0] / 2 + 2 &&
      Math.abs(runtime.playerPos.z - pos[2]) < size[2] / 2 + 2 &&
      Math.abs(runtime.playerPos.y - pos[1]) < 6;
    const squash = near && e >= 0 && e < 0.35 ? 1 - Math.sin((e / 0.35) * Math.PI) * 0.35 : 1;
    visual.current.scale.set(2 - squash, squash, 2 - squash);
  });

  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} restitution={0} friction={0.8} />
      <group ref={visual}>
        {children || (
          <mesh castShadow receiveShadow material={mat}>
            <boxGeometry args={size} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}

// -------------------------------------------------------------- Ascenseur
// Plateforme cinématique entre deux points, avec pause aux extrémités.
export function Elevator({ from, to, size = [3.6, 0.5, 3.6], period = 6, dwell = 1.6, mat = M.metal, phase = 0, children }) {
  const body = useRef();
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);

  useFrame(() => {
    if (!body.current) return;
    const T = period * 2 + dwell * 2;
    let t = (runtime.simTime + phase) % T;
    let k;
    if (t < period) k = t / period; // montée
    else if (t < period + dwell) k = 1; // pause haute
    else if (t < period * 2 + dwell) k = 1 - (t - period - dwell) / period; // descente
    else k = 0; // pause basse
    k = k * k * (3 - 2 * k); // lissage
    body.current.setNextKinematicTranslation({
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      z: a.z + (b.z - a.z) * k,
    });
  }, -3);

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={from}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} friction={1.2} />
      {children || (
        <>
          <mesh castShadow receiveShadow material={mat}>
            <boxGeometry args={size} />
          </mesh>
          <mesh position={[0, size[1] / 2 + 0.02, 0]} material={M.cubicleTrim}>
            <boxGeometry args={[size[0] * 1.02, 0.05, size[2] * 1.02]} />
          </mesh>
        </>
      )}
    </RigidBody>
  );
}

// -------------------------------------------------------- Colonne de vent
export function WindColumn({ pos, height, radius = 1.8 }) {
  const inner = useRef();

  useFrame(() => {
    if (inner.current) {
      inner.current.rotation.y = runtime.simTime * 1.2;
      inner.current.children.forEach((m, i) => {
        m.position.y = ((runtime.simTime * 3.5 + i * (height / 4)) % height) - height / 2;
      });
    }
  });

  return (
    <group position={[pos[0], pos[1] + height / 2, pos[2]]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          args={[height / 2, radius]}
          sensor
          onIntersectionEnter={(e) => {
            if (isPlayer(e)) runtime.inWind++;
          }}
          onIntersectionExit={(e) => {
            if (isPlayer(e)) runtime.inWind = Math.max(0, runtime.inWind - 1);
          }}
        />
      </RigidBody>
      <mesh material={M.wind}>
        <cylinderGeometry args={[radius, radius + 0.5, height, 16, 1, true]} />
      </mesh>
      <group ref={inner}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[radius * 0.6, 0, 0]} material={M.wind}>
            <boxGeometry args={[0.14, 2, 0.14]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ------------------------------------------------------ Nuage dissolvant
export function CloudPuff({ pos, r = 2.2, dissolve = false }) {
  const collider = useRef();
  const group = useRef();
  const [mat] = useState(() => M.cloud.clone());
  const st = useRef({ touchedAt: -1, solid: true, opacity: 1 }).current;

  useFrame((_, dt) => {
    if (!dissolve) return;
    const t = runtime.simTime;
    if (st.touchedAt >= 0) {
      const e = t - st.touchedAt;
      if (st.solid && e > 1.3) {
        st.solid = false;
        collider.current?.setEnabled(false);
      }
      if (e > 5.2) {
        st.solid = true;
        st.touchedAt = -1;
        collider.current?.setEnabled(true);
      }
    }
    st.opacity = THREE.MathUtils.damp(st.opacity, st.solid ? 1 : 0, 6, dt);
    mat.opacity = st.opacity;
    mat.transparent = true;
    const warning = st.touchedAt >= 0 && st.solid;
    mat.emissiveIntensity = warning ? 0.4 + Math.sin(t * 10) * 0.25 : 0.4;
    if (group.current) group.current.scale.setScalar(0.6 + st.opacity * 0.4);
  });

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={pos}
      onCollisionEnter={(e) => {
        if (dissolve && isPlayer(e) && st.solid && st.touchedAt < 0) st.touchedAt = runtime.simTime;
      }}
    >
      <CuboidCollider ref={collider} args={[r, r * 0.35, r]} friction={1} />
      <group ref={group}>
        <mesh material={mat} castShadow>
          <sphereGeometry args={[r * 1.05, 12, 8]} />
        </mesh>
        <mesh material={mat} position={[r * 0.7, -r * 0.1, r * 0.35]} scale={[0.62, 0.45, 0.62]}>
          <sphereGeometry args={[r, 10, 7]} />
        </mesh>
        <mesh material={mat} position={[-r * 0.65, -r * 0.08, -r * 0.3]} scale={[0.55, 0.4, 0.55]}>
          <sphereGeometry args={[r, 10, 7]} />
        </mesh>
      </group>
    </RigidBody>
  );
}

// ------------------------------------------------- Porte de chapitre
// Le SEUL endroit où le checkpoint avance (demande explicite du design).
// Le faisceau de lumière sert de repère : lever les yeux montre le chemin.
export function Gate({ pos, killY, beaconHeight = 60, label }) {
  const beam = useRef();

  useFrame(() => {
    if (beam.current) {
      beam.current.material.opacity = 0.1 + Math.sin(runtime.simTime * 1.4) * 0.04;
    }
  });

  return (
    <group position={pos}>
      <RigidBody type="fixed" colliders={false} sensor>
        <CuboidCollider
          args={[3.2, 3, 3.2]}
          sensor
          onIntersectionEnter={(e) => {
            if (!isPlayer(e)) return;
            const g = useGame.getState();
            const before = g.checkpoint;
            g.setCheckpoint({ pos: [pos[0], pos[1] + 1, pos[2]], killY, label });
            if (useGame.getState().checkpoint !== before) audio.sfx('checkpoint');
          }}
        />
      </RigidBody>
      {/* faisceau-repère */}
      <mesh ref={beam} position={[0, beaconHeight / 2, 0]}>
        <cylinderGeometry args={[0.7, 1.6, beaconHeight, 12, 1, true]} />
        <meshBasicMaterial color="#ffe9b0" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#ffe0a0" intensity={30} distance={18} decay={1.8} position={[0, 2, 0]} />
    </group>
  );
}

// ------------------------------------------------------------- Souvenir
// 7 fragments de mémoire cachés dans les mondes.
export function Souvenir({ id, pos }) {
  const collected = useGame((s) => s.souvenirs.includes(id));
  const g = useRef();

  useFrame(() => {
    if (g.current) {
      g.current.rotation.y = runtime.simTime * 1.4;
      g.current.position.y = pos[1] + Math.sin(runtime.simTime * 2) * 0.18;
    }
  });

  if (collected) return null;

  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={pos} sensor>
        <CuboidCollider
          args={[1, 1.4, 1]}
          sensor
          onIntersectionEnter={(e) => {
            if (!isPlayer(e)) return;
            useGame.getState().collect(id);
            audio.sfx('souvenir');
          }}
        />
      </RigidBody>
      <group ref={g} position={pos}>
        <mesh material={M.souvenir}>
          <octahedronGeometry args={[0.32, 0]} />
        </mesh>
        <mesh material={M.souvenir} scale={[1.5, 1.5, 1.5]}>
          <octahedronGeometry args={[0.32, 0]} />
          {/* halo */}
        </mesh>
        <pointLight color="#ffe9a8" intensity={8} distance={7} decay={2} />
      </group>
    </group>
  );
}

// -------------------------------------------------------- Escalier à courir
// Marches basses : on les gravit en courant, sans sauter.
export function StairsRun({ pos, yaw = 0, steps = 8, stepW = 3, stepH = 0.55, stepD = 1.1, mat = M.wood }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      {Array.from({ length: steps }, (_, i) => (
        <RigidBody key={i} type="fixed" colliders={false} position={[0, i * stepH + stepH / 2, -i * stepD]}>
          <CuboidCollider args={[stepW / 2, stepH / 2, stepD / 2]} friction={1} />
          <mesh castShadow receiveShadow material={mat}>
            <boxGeometry args={[stepW, stepH, stepD]} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}

// ------------------------------------------------------------- Arrivée
export function FinishZone({ position }) {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider
        args={[6, 2.5, 6]}
        sensor
        onIntersectionEnter={(e) => {
          if (!isPlayer(e)) return;
          const g = useGame.getState();
          if (g.phase === 'playing') {
            g.finish();
            audio.sfx('finish');
            document.exitPointerLock?.();
          }
        }}
      />
    </RigidBody>
  );
}

// -------------------------------------------------- Poussière flottante
export function DriftParticles({ count = 260, box = 42 }) {
  const points = useRef();
  const [geo] = useState(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) p[i] = (Math.random() - 0.5) * box;
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  });
  const [mat] = useState(
    () =>
      new THREE.PointsMaterial({
        color: '#fff6dd',
        size: 0.07,
        transparent: true,
        opacity: 0.45,
        sizeAttenuation: true,
        depthWrite: false,
      })
  );

  useFrame((_, dt) => {
    if (!points.current) return;
    const p = runtime.playerPos;
    const arr = geo.attributes.position.array;
    const half = box / 2;
    const sdt = Math.min(dt, 1 / 30) * runtime.timeScale;
    for (let i = 0; i < count; i++) {
      let x = arr[i * 3];
      let y = arr[i * 3 + 1] + 0.35 * sdt;
      let z = arr[i * 3 + 2];
      x = ((((x - p.x + half) % box) + box) % box) - half + p.x;
      y = ((((y - p.y + half) % box) + box) % box) - half + p.y;
      z = ((((z - p.z + half) % box) + box) % box) - half + p.z;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = runtime.biome === 'paradise' ? 0.7 : 0.4;
  });

  return <points ref={points} geometry={geo} material={mat} />;
}
