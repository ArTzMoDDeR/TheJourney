import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { M } from './materials';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';
import { audio } from '../../audio/AudioSystem';

// Pièces de gameplay communes à tous les biomes :
// checkpoints, plateformes mobiles, colonnes de vent, nuages dissolvants,
// zone d'arrivée, particules d'ambiance.

const isPlayer = (other) => !!other.rigidBody?.userData?.player;

// ------------------------------------------------------------- Bloc solide
// Wrapper de base pour tout élément de route : un collider boîte propre
// (séparé des meshes visuels, comme demandé par le brief) + tag grabbable.
export function Solid({ el, grabbable = true, children }) {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={el.pos}
      rotation={[0, el.yaw, 0]}
      userData={{ grabbable }}
    >
      <CuboidCollider
        args={[el.size[0] / 2, el.size[1] / 2, el.size[2] / 2]}
        friction={0.9}
      />
      {children}
    </RigidBody>
  );
}

// ---------------------------------------------------------------- Checkpoint
export function Checkpoint({ cp }) {
  const active = useGame((s) => s.checkpoint.pos[1] >= cp.pos[1]);
  const ring = useRef();

  useFrame(() => {
    if (ring.current) {
      ring.current.rotation.y = runtime.simTime * 0.6;
      ring.current.position.y = Math.sin(runtime.simTime * 1.5) * 0.12;
    }
  });

  return (
    <group position={cp.pos}>
      <RigidBody type="fixed" colliders={false} sensor>
        <CuboidCollider
          args={[2.2, 2.2, 2.2]}
          sensor
          onIntersectionEnter={(e) => {
            if (!isPlayer(e)) return;
            const before = useGame.getState().checkpoint;
            useGame.getState().setCheckpoint(cp);
            if (useGame.getState().checkpoint !== before) audio.sfx('checkpoint');
          }}
        />
      </RigidBody>
      <group ref={ring}>
        <mesh material={active ? M.checkpointDone : M.checkpoint}>
          <torusGeometry args={[0.55, 0.045, 8, 32]} />
        </mesh>
        <mesh material={active ? M.checkpointDone : M.checkpoint}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

// --------------------------------------------------------- Plateforme mobile
// Tiroir (chambre, horizontal) ou monte-charge (bureau, vertical).
// Corps kinematic : position pilotée par le temps simulé (respecte le slow-mo).
export function Mover({ el, children }) {
  const body = useRef();
  const base = useRef(new THREE.Vector3(...el.pos)).current;
  const axis = useRef(new THREE.Vector3(...el.axis)).current;

  useFrame(() => {
    if (!body.current) return;
    const o = Math.sin((runtime.simTime * Math.PI * 2) / el.period + el.phase) * el.amp * 0.5;
    body.current.setNextKinematicTranslation({
      x: base.x + axis.x * o,
      y: base.y + axis.y * o,
      z: base.z + axis.z * o,
    });
  }, -3);

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={el.pos}
      rotation={[0, el.yaw, 0]}
      userData={{ grabbable: true }}
    >
      <CuboidCollider args={[el.size[0] / 2, el.size[1] / 2, el.size[2] / 2]} friction={1} />
      {children}
    </RigidBody>
  );
}

// --------------------------------------------------------- Colonne de vent
export function WindColumn({ el }) {
  const inner = useRef();
  const h = el.size[1];

  useFrame(() => {
    if (inner.current) {
      inner.current.rotation.y = runtime.simTime * 1.2;
      // stries qui montent
      inner.current.children.forEach((m, i) => {
        m.position.y = ((runtime.simTime * 3 + i * (h / 3)) % h) - h / 2;
      });
    }
  });

  return (
    <group position={el.pos}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          args={[h / 2, el.size[0] / 2]}
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
        <cylinderGeometry args={[el.size[0] / 2, el.size[0] / 2 + 0.4, h, 16, 1, true]} />
      </mesh>
      <group ref={inner}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} material={M.wind}>
            <boxGeometry args={[0.12, 1.6, 0.12]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ------------------------------------------------------ Nuage qui se dissout
// Se dissout ~1.3 s après qu'on a marché dessus, réapparaît quelques
// secondes plus tard (lisible, jamais punitif de façon aléatoire).
export function DissolvingCloud({ el }) {
  const collider = useRef();
  const group = useRef();
  const [mat] = useState(() => M.cloud.clone());
  const st = useRef({ touchedAt: -1, solid: true, opacity: 1 }).current;

  useFrame((_, dt) => {
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
    const target = st.solid ? 1 : 0;
    st.opacity = THREE.MathUtils.damp(st.opacity, target, 6, dt);
    mat.opacity = st.opacity;
    mat.transparent = true;
    // pulse d'avertissement pendant le compte à rebours
    const warning = st.touchedAt >= 0 && st.solid;
    mat.emissiveIntensity = warning ? 0.4 + Math.sin(t * 10) * 0.25 : 0.4;
    if (group.current) {
      const s = 0.6 + st.opacity * 0.4;
      group.current.scale.setScalar(s);
    }
  });

  const [w, h, d] = el.size;
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={el.pos}
      rotation={[0, el.yaw, 0]}
      userData={{ grabbable: true }}
      onCollisionEnter={(e) => {
        if (isPlayer(e) && st.solid && st.touchedAt < 0) st.touchedAt = runtime.simTime;
      }}
    >
      <CuboidCollider ref={collider} args={[w / 2, h / 2, d / 2]} friction={1} />
      <group ref={group}>
        <mesh material={mat} castShadow>
          <sphereGeometry args={[w / 2, 12, 8]} />
        </mesh>
        <mesh material={mat} position={[w * 0.3, -h * 0.1, d * 0.2]} scale={[0.7, 0.5, 0.7]}>
          <sphereGeometry args={[w / 2, 10, 7]} />
        </mesh>
        <mesh material={mat} position={[-w * 0.32, -h * 0.08, -d * 0.15]} scale={[0.6, 0.45, 0.6]}>
          <sphereGeometry args={[w / 2, 10, 7]} />
        </mesh>
      </group>
    </RigidBody>
  );
}

// ------------------------------------------------------------- Zone d'arrivée
export function FinishZone({ position }) {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider
        args={[7, 2.5, 7]}
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

// -------------------------------------------------- Particules de poussière
// Un nuage de points qui suit le joueur (positions repliées dans une boîte),
// dérive lente vers le haut — poésie à peu de frais.
export function DriftParticles({ count = 260, box = 42 }) {
  const points = useRef();
  const [geo] = useState(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * box;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
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
      let y = arr[i * 3 + 1] + 0.35 * sdt; // dérive ascendante douce
      let z = arr[i * 3 + 2];
      // repli de chaque particule dans la boîte centrée sur le joueur
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
