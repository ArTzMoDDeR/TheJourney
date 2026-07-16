import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { M } from '../components/level/materials';
import { B, Cyl, Ladder, Trampoline, Souvenir, WindColumn, CloudPuff, FinishZone, Gate } from '../level/kit';
import { mulberry32 } from '../utils/rng';
import { runtime } from '../store/runtime';

// ============================================================
// CHAPITRE 4 — LE PARADIS (heure dorée, 230 → 290 m)
// Un archipel d'îles flottantes au-dessus de la mer de nuages.
// La gravité s'allège : les sauts portent deux fois plus loin.
//  A — les échelles de lumière, d'îlot en îlot
//  B — les nuages-trampolines (les plus rapides)
//  C — le courant ascendant et les nuages qui se dissolvent
// Au sommet : l'arche dorée, l'arbre, et le nounours de la chambre
// qui attendait depuis le début. La boucle est bouclée.
// ============================================================

// Statue de l'ange (procédurale)
function Angel({ pos, yaw = 0 }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh castShadow material={M.marble} position={[0, 3.2, 0]}>
        <cylinderGeometry args={[1, 2.6, 6.4, 12]} />
      </mesh>
      <mesh castShadow material={M.marble} position={[0, 7, 0]}>
        <sphereGeometry args={[0.9, 12, 10]} />
      </mesh>
      {/* ailes */}
      <mesh castShadow material={M.marble} position={[-1.8, 5.4, -0.6]} rotation={[0.2, 0.4, 0.9]}>
        <boxGeometry args={[0.5, 4.6, 1.8]} />
      </mesh>
      <mesh castShadow material={M.marble} position={[1.8, 5.4, -0.6]} rotation={[0.2, -0.4, -0.9]}>
        <boxGeometry args={[0.5, 4.6, 1.8]} />
      </mesh>
      {/* auréole */}
      <mesh material={M.gold} position={[0, 8.3, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[1, 0.1, 8, 24]} />
      </mesh>
      <pointLight position={[0, 8, 1]} color="#ffe9b0" intensity={20} distance={16} decay={2} />
    </group>
  );
}

// Le nounours géant, assis, qui attend depuis le début
function Teddy({ pos, yaw = 0 }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh castShadow material={M.teddy} position={[0, 2.2, 0]}>
        <sphereGeometry args={[2.4, 14, 12]} />
      </mesh>
      <mesh castShadow material={M.teddyMuzzle} position={[0, 2, 2]}>
        <sphereGeometry args={[1.2, 12, 10]} />
      </mesh>
      <mesh castShadow material={M.teddy} position={[0, 5.2, 0]}>
        <sphereGeometry args={[1.7, 14, 12]} />
      </mesh>
      <mesh material={M.teddyMuzzle} position={[0, 4.9, 1.4]}>
        <sphereGeometry args={[0.8, 10, 8]} />
      </mesh>
      <mesh material={M.woodDark} position={[0, 5.1, 2.05]}>
        <sphereGeometry args={[0.18, 8, 8]} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} material={M.woodDark} position={[x, 5.6, 1.5]}>
          <sphereGeometry args={[0.16, 8, 8]} />
        </mesh>
      ))}
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} castShadow material={M.teddy} position={[x, 6.4, 0]}>
          <sphereGeometry args={[0.7, 10, 8]} />
        </mesh>
      ))}
      {/* bras et jambes */}
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} castShadow material={M.teddy} position={[x, 2.6, 0.6]} rotation={[0, 0, x > 0 ? -0.5 : 0.5]}>
          <capsuleGeometry args={[0.7, 1.6, 4, 8]} />
        </mesh>
      ))}
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} castShadow material={M.teddy} position={[x, 0.8, 2]} rotation={[1.2, 0, 0]}>
          <capsuleGeometry args={[0.75, 1.6, 4, 8]} />
        </mesh>
      ))}
    </group>
  );
}

// Porte flottante, entrouverte sur rien — on peut la traverser
function FloatingDoor({ pos, yaw = 0 }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh castShadow material={M.marble} position={[-1.6, 2.6, 0]}>
        <boxGeometry args={[0.5, 5.2, 0.6]} />
      </mesh>
      <mesh castShadow material={M.marble} position={[1.6, 2.6, 0]}>
        <boxGeometry args={[0.5, 5.2, 0.6]} />
      </mesh>
      <mesh castShadow material={M.marble} position={[0, 5.3, 0]}>
        <boxGeometry args={[3.7, 0.6, 0.6]} />
      </mesh>
      <mesh castShadow material={M.gold} position={[0.5, 2.5, 0.3]} rotation={[0, 0.7, 0]}>
        <boxGeometry args={[2.4, 4.8, 0.2]} />
      </mesh>
    </group>
  );
}

// Ballons rouges qui montent lentement, à l'infini
function Balloons() {
  const refs = useRef([]);
  const seeds = useMemo(() => {
    const rng = mulberry32(303);
    return Array.from({ length: 7 }, () => ({
      x: -60 + rng() * 90,
      z: -60 + rng() * 90,
      speed: 1 + rng() * 1.4,
      phase: rng() * 60,
    }));
  }, []);

  useFrame(() => {
    const t = runtime.simTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const s = seeds[i];
      const y = 228 + ((t * s.speed + s.phase) % 75);
      g.position.set(s.x + Math.sin(t * 0.4 + i) * 2, y, s.z + Math.cos(t * 0.3 + i) * 2);
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh material={M.balloon}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
          <mesh material={M.balloon} position={[0, -1.1, 0]}>
            <coneGeometry args={[0.2, 0.3, 8]} />
          </mesh>
          <mesh material={M.knob} position={[0, -2.4, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2.6, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ParadiseWorld() {
  const fragments = useMemo(() => {
    const rng = mulberry32(777);
    return Array.from({ length: 16 }, () => {
      const a = rng() * Math.PI * 2;
      const r = 40 + rng() * 40;
      return {
        pos: [-14 + Math.cos(a) * r, 238 + rng() * 55, -14 + Math.sin(a) * r],
        rot: [rng() * 0.6 - 0.3, rng() * Math.PI, rng() * 0.6 - 0.3],
        size: [1 + rng() * 3, 0.4 + rng() * 4, 1 + rng() * 2],
        gold: rng() < 0.25,
      };
    });
  }, []);

  return (
    <group>
      {/* ------------------------------------------------ L'ÎLE D'ARRIVÉE */}
      <Cyl pos={[-14, 231, -20]} r={20} h={6} rTop={20} mat={M.marble} />
      <mesh position={[-14, 234.05, -20]} rotation={[-Math.PI / 2, 0, 0]} material={M.gold}>
        <ringGeometry args={[3.4, 4, 32]} />
      </mesh>
      <Angel pos={[-14, 234, -28]} yaw={0} />
      <Souvenir id="photo" pos={[-14, 235.6, -32.5]} />
      <Gate pos={[-14, 236, -14]} killY={190} label="Le Paradis" beaconHeight={40} />
      {/* colonnes brisées */}
      {[
        [-28, -12, 4.5],
        [-24, -30, 3],
        [0, -28, 5.5],
        [-2, -8, 2.5],
        [-26, -2, 3.5],
      ].map(([x, z, h], k) => (
        <Cyl key={k} pos={[x, 234 + h / 2, z]} r={1.3} h={h} mat={M.marble} />
      ))}
      <FloatingDoor pos={[-4, 234, 0]} yaw={0.9} />

      {/* ------------------------------------------------ VOIE A : les échelles de lumière */}
      <B pos={[4, 240, -36]} size={[10, 2, 10]} mat={M.marble} />
      <Ladder pos={[4, 234.2, -30.6]} height={6.8} yaw={0} style="light" />
      <B pos={[15, 246, -40]} size={[9, 2, 9]} mat={M.marble} />
      <Ladder pos={[9.9, 241.4, -40]} height={5.8} yaw={-Math.PI / 2} style="light" />
      <B pos={[15, 252, -30]} size={[9, 2, 9]} mat={M.marble} />
      <Ladder pos={[15, 247.4, -34.9]} height={5.8} yaw={Math.PI} style="light" />
      {/* îlots en gravité légère */}
      <B pos={[26, 256, -20]} size={[7, 2, 7]} mat={M.marble} />
      <B pos={[36, 260, -8]} size={[7, 2, 7]} mat={M.marble} />
      <B pos={[30, 264, 6]} size={[8, 2, 8]} mat={M.gold} />

      {/* ------------------------------------------------ VOIE B : les nuages-trampolines */}
      <Trampoline pos={[-40, 233.4, 4]} size={[5, 1.2, 5]} power={22} mat={M.cloud}>
        <group>
          <mesh castShadow material={M.cloud}>
            <sphereGeometry args={[3, 12, 9]} />
          </mesh>
          <mesh material={M.cloud} position={[1.8, -0.4, 1]} scale={[0.6, 0.45, 0.6]}>
            <sphereGeometry args={[3, 10, 8]} />
          </mesh>
        </group>
      </Trampoline>
      <CloudPuff pos={[-50, 241, -8]} r={2.6} />
      <Trampoline pos={[-46, 249.4, -22]} size={[5, 1.2, 5]} power={24} mat={M.cloud}>
        <group>
          <mesh castShadow material={M.cloud}>
            <sphereGeometry args={[3, 12, 9]} />
          </mesh>
          <mesh material={M.cloud} position={[-1.6, -0.4, -1]} scale={[0.6, 0.45, 0.6]}>
            <sphereGeometry args={[3, 10, 8]} />
          </mesh>
        </group>
      </Trampoline>
      <B pos={[-38, 256, -34]} size={[8, 2, 8]} mat={M.marble} />
      <B pos={[-26, 260, -40]} size={[7, 2, 7]} mat={M.marble} />
      <Souvenir id="plume" pos={[-26, 262.6, -40]} />
      <B pos={[-32, 264, -26]} size={[7, 2, 7]} mat={M.marble} />
      <B pos={[-34, 268, -10]} size={[7, 2, 7]} mat={M.marble} />
      <B pos={[-36, 272, 2]} size={[6, 2, 6]} mat={M.marble} />
      <B pos={[-38, 276, 12]} size={[6, 2, 6]} mat={M.marble} />

      {/* ------------------------------------------------ VOIE C : le courant + les dissolvants */}
      <WindColumn pos={[2, 234, -2]} height={20} radius={1.9} />
      <CloudPuff pos={[10, 252, 6]} r={2.4} dissolve />
      <CloudPuff pos={[18, 256, 12]} r={2.4} dissolve />
      <CloudPuff pos={[26, 260, 10]} r={2.4} dissolve />

      {/* ------------------------------------------------ LA COLONNADE FINALE */}
      <Cyl pos={[16, 266, 14]} r={2.8} h={6} mat={M.marble} />
      <Cyl pos={[2, 269.5, 22]} r={2.8} h={7} mat={M.marble} />
      <Cyl pos={[-12, 273, 26]} r={2.8} h={8} mat={M.marble} />

      {/* ------------------------------------------------ L'ÎLE DU SOMMET */}
      <Cyl pos={[-34, 276.5, 22]} r={16} h={7} rTop={16} mat={M.marble} />
      {/* l'arche dorée */}
      <group position={[-34, 280, 26]}>
        {[-2.6, 2.6].map((x) => (
          <mesh key={x} castShadow material={M.gold} position={[x, 2.8, 0]}>
            <cylinderGeometry args={[0.35, 0.45, 5.6, 10]} />
          </mesh>
        ))}
        <mesh castShadow material={M.gold} position={[0, 5.9, 0]}>
          <boxGeometry args={[6.6, 0.6, 0.8]} />
        </mesh>
      </group>
      {/* l'arbre doré */}
      <group position={[-26, 280, 30]}>
        <mesh castShadow material={M.teddyMuzzle} position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.5, 0.9, 5.2, 8]} />
        </mesh>
        {[
          [0, 6, 0, 2.6],
          [-1.6, 5, 0.8, 1.6],
          [1.4, 5.2, -0.6, 1.5],
        ].map(([x, y, z, r], k) => (
          <mesh key={k} castShadow material={M.gold} position={[x, y, z]}>
            <sphereGeometry args={[r, 12, 10]} />
          </mesh>
        ))}
      </group>
      {/* le nounours qui attendait */}
      <Teddy pos={[-28, 280, 27]} yaw={-2.4} />
      {/* tapis d'arrivée */}
      <mesh position={[-34, 280.06, 26]} rotation={[-Math.PI / 2, 0, 0]} material={M.gold}>
        <ringGeometry args={[2, 2.6, 32]} />
      </mesh>
      <FinishZone position={[-34, 282, 26]} />

      {/* ------------------------------------------------ l'archipel autour */}
      {fragments.map((f, k) => (
        <mesh key={k} position={f.pos} rotation={f.rot} material={f.gold ? M.gold : M.marble}>
          <boxGeometry args={f.size} />
        </mesh>
      ))}
      <FloatingDoor pos={[8, 260, -18]} yaw={-0.8} />
      <Balloons />
    </group>
  );
}
