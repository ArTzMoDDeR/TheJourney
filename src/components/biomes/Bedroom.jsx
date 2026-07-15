import { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { M, legoMats, bookMats } from '../level/materials';
import { Solid, Mover } from '../level/pieces';
import { mulberry32 } from '../../utils/rng';

// BIOME 1 — LA CHAMBRE (0 → 90 m)
// Cocon, chaleur, objets du quotidien à l'échelle géante :
// Lego, piles de livres, commodes, étagères, tiroirs mobiles.

const hash = (i) => ((i * 2654435761) % 1000) / 1000;

// --- prises/plateformes thématiques ---
export function BedroomPiece({ el }) {
  if (el.kind === 'mover') {
    // tiroir qui s'ouvre et se ferme
    const [w, h, d] = el.size;
    return (
      <Mover el={el}>
        <mesh castShadow receiveShadow material={M.wood}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        <mesh position={[0, 0, d / 2 + 0.04]} material={M.woodDark}>
          <boxGeometry args={[w * 0.96, h * 1.4, 0.1]} />
        </mesh>
        <mesh position={[0, 0, d / 2 + 0.16]} material={M.knob}>
          <sphereGeometry args={[0.14, 8, 8]} />
        </mesh>
      </Mover>
    );
  }

  const [w, h, d] = el.size;
  const v = el.i % 3;

  if (el.kind === 'platform') {
    return (
      <Solid el={el}>
        {v === 0 && (
          // étagère avec livres posés dessus
          <>
            <mesh castShadow receiveShadow material={M.wood}>
              <boxGeometry args={[w, h, d]} />
            </mesh>
            {[0, 1, 2].map((k) => (
              <mesh
                key={k}
                position={[(k - 1) * w * 0.28, h / 2 + 0.35, (hash(el.i + k) - 0.5) * d * 0.3]}
                rotation={[0, hash(el.i * 3 + k) * 0.5, 0]}
                material={bookMats[(el.i + k) % 3]}
              >
                <boxGeometry args={[0.5, 0.7, 0.35]} />
              </mesh>
            ))}
          </>
        )}
        {v === 1 && (
          // coussin/pouf moelleux
          <mesh castShadow receiveShadow material={M.fabric}>
            <boxGeometry args={[w, h, d]} />
          </mesh>
        )}
        {v === 2 && (
          // dessus de commode
          <>
            <mesh castShadow receiveShadow material={M.woodDark}>
              <boxGeometry args={[w, h, d]} />
            </mesh>
            <mesh position={[0, h / 2 + 0.02, 0]} material={M.wood}>
              <boxGeometry args={[w * 1.04, 0.08, d * 1.04]} />
            </mesh>
          </>
        )}
      </Solid>
    );
  }

  // pillar — pilier à escalader
  const legoMat = legoMats[el.i % 4];
  if (v === 0) {
    // brique de Lego géante
    const studs = [];
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        studs.push([sx * w * 0.22, h / 2 + 0.1, sz * d * 0.22]);
      }
    }
    return (
      <Solid el={el}>
        <mesh castShadow receiveShadow material={legoMat}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        {studs.map((p, k) => (
          <mesh key={k} position={p} material={legoMat}>
            <cylinderGeometry args={[w * 0.14, w * 0.14, 0.2, 12]} />
          </mesh>
        ))}
      </Solid>
    );
  }
  if (v === 1) {
    // pile de livres géants
    const n = Math.max(3, Math.round(h / 1.5));
    const bh = h / n;
    return (
      <Solid el={el}>
        {Array.from({ length: n }, (_, k) => (
          <mesh
            key={k}
            castShadow
            receiveShadow
            position={[
              (hash(el.i * 7 + k) - 0.5) * 0.25,
              -h / 2 + bh * (k + 0.5),
              (hash(el.i * 11 + k) - 0.5) * 0.25,
            ]}
            rotation={[0, (hash(el.i * 13 + k) - 0.5) * 0.25, 0]}
            material={bookMats[(el.i + k) % 3]}
          >
            <boxGeometry args={[w * (0.9 + hash(k) * 0.15), bh * 0.96, d * (0.9 + hash(k + 5) * 0.15)]} />
          </mesh>
        ))}
      </Solid>
    );
  }
  // commode haute avec tiroirs
  const nDrawers = Math.max(3, Math.round(h / 1.6));
  const dh = h / nDrawers;
  return (
    <Solid el={el}>
      <mesh castShadow receiveShadow material={M.wood}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {Array.from({ length: nDrawers }, (_, k) => (
        <group key={k} position={[0, -h / 2 + dh * (k + 0.5), d / 2 + 0.04]}>
          <mesh material={M.woodDark}>
            <boxGeometry args={[w * 0.86, dh * 0.7, 0.08]} />
          </mesh>
          <mesh position={[0, 0, 0.1]} material={M.knob}>
            <sphereGeometry args={[0.11, 8, 8]} />
          </mesh>
        </group>
      ))}
    </Solid>
  );
}

// --- décor de la chambre : sol, murs, lit géant, fenêtre lumineuse ---
export function BedroomDecor() {
  const toys = useMemo(() => {
    const rng = mulberry32(42);
    return Array.from({ length: 7 }, (_, i) => ({
      pos: [(rng() - 0.5) * 44, 0.8, (rng() - 0.5) * 44],
      size: [2 + rng() * 2, 1.6 + rng(), 2 + rng() * 2],
      yaw: rng() * Math.PI,
      mat: legoMats[i % 4],
    }));
  }, []);

  return (
    <group>
      {/* sol de la chambre */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[30, 0.5, 30]} position={[0, -0.5, 0]} friction={1} />
        <mesh receiveShadow position={[0, -0.5, 0]} material={M.woodDark}>
          <boxGeometry args={[60, 1, 60]} />
        </mesh>
      </RigidBody>
      {/* tapis */}
      <mesh receiveShadow position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.rug}>
        <circleGeometry args={[14, 32]} />
      </mesh>
      {/* murs (non grimpables : la route passe par les meubles) */}
      {[
        [30.5, 45, 0, 1, 92, 62],
        [-30.5, 45, 0, 1, 92, 62],
        [0, 45, 30.5, 62, 92, 1],
        [0, 45, -30.5, 62, 92, 1],
      ].map(([x, y, z, w, h, d], k) => (
        <RigidBody key={k} type="fixed" colliders={false}>
          <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[x, y, z]} />
          <mesh position={[x, y, z]} material={M.wallBedroom}>
            <boxGeometry args={[w, h, d]} />
          </mesh>
        </RigidBody>
      ))}
      {/* lit géant dans un coin */}
      <RigidBody type="fixed" colliders={false} userData={{ grabbable: true }}>
        <CuboidCollider args={[8, 1.5, 5]} position={[-19, 1.5, -19]} friction={1} />
        <mesh castShadow receiveShadow position={[-19, 1.5, -19]} material={M.mattress}>
          <boxGeometry args={[16, 3, 10]} />
        </mesh>
        <mesh position={[-19, 3.2, -23.5]} material={M.fabric}>
          <boxGeometry args={[5, 1.4, 2.5]} />
        </mesh>
        <mesh position={[-19, 3, -25.5]} material={M.woodDark}>
          <boxGeometry args={[16.5, 6, 1]} />
        </mesh>
      </RigidBody>
      {/* jouets épars (grimpables, échauffement) */}
      {toys.map((t, k) => (
        <RigidBody key={k} type="fixed" colliders={false} rotation={[0, t.yaw, 0]} position={t.pos} userData={{ grabbable: true }}>
          <CuboidCollider args={[t.size[0] / 2, t.size[1] / 2, t.size[2] / 2]} friction={1} />
          <mesh castShadow receiveShadow material={t.mat}>
            <boxGeometry args={t.size} />
          </mesh>
        </RigidBody>
      ))}
      {/* fenêtre chaude en haut du mur : la sortie vers le ciel */}
      <group position={[-29.8, 78, 0]}>
        <mesh material={M.neon}>
          <boxGeometry args={[0.3, 16, 12]} />
        </mesh>
        <mesh position={[0.2, 0, 0]} material={M.woodDark}>
          <boxGeometry args={[0.4, 17, 1]} />
        </mesh>
        <mesh position={[0.2, 0, 0]} material={M.woodDark}>
          <boxGeometry args={[0.4, 1, 13]} />
        </mesh>
        <pointLight color="#ffdfae" intensity={60} distance={45} decay={1.8} />
      </group>
      {/* veilleuse au sol */}
      <pointLight position={[12, 4, 12]} color="#ffc98d" intensity={30} distance={35} decay={1.8} />
    </group>
  );
}
