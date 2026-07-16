import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { M } from '../components/level/materials';
import { B, Cyl, Ramp, Ladder, Bumper, Gate, Souvenir, WindColumn } from '../level/kit';
import { mulberry32 } from '../utils/rng';
import { runtime } from '../store/runtime';

// ============================================================
// CHAPITRE 6 — L'ESPACE (nuit noire, 428 → 516 m)
// La gravité tombe à 35 % : les sauts deviennent des vols planés
// de quinze mètres. Astéroïdes, station spatiale, panneaux solaires
// à remonter, boosters oranges, échelle de l'antenne.
// Un cosmonaute assis regarde la Terre. La fusée de l'enfance est là.
// Fake way : le module de service — un hublot, et c'est tout.
// ============================================================

function Asteroid({ pos, r }) {
  return (
    <group position={pos}>
      <B pos={[0, 0, 0]} size={[r * 2, r * 1.1, r * 2]} mat={M.asteroid} visible={false} />
      <mesh castShadow receiveShadow material={M.asteroid} scale={[1, 0.62, 1]}>
        <dodecahedronGeometry args={[r * 1.18, 0]} />
      </mesh>
    </group>
  );
}

function Booster({ pos, power = 20 }) {
  return (
    <Bumper pos={pos} r={1.5} power={power} mat={M.booster}>
      <group>
        <mesh castShadow material={M.hullDark}>
          <cylinderGeometry args={[1.1, 1.4, 1.6, 10]} />
        </mesh>
        <mesh position={[0, 1, 0]} material={M.booster}>
          <sphereGeometry args={[1.15, 12, 10]} />
        </mesh>
        <pointLight color="#ff9c52" intensity={16} distance={12} decay={2} position={[0, 1.4, 0]} />
      </group>
    </Bumper>
  );
}

// Le cosmonaute assis, qui regarde la Terre en contrebas
function Cosmonaut({ pos, yaw = 0 }) {
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh castShadow material={M.mattress} position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.42, 0.7, 4, 10]} />
      </mesh>
      <mesh castShadow material={M.mattress} position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.36, 12, 10]} />
      </mesh>
      <mesh material={M.screenOff} position={[0, 1.65, 0.22]} scale={[0.9, 0.7, 0.6]}>
        <sphereGeometry args={[0.3, 10, 8]} />
      </mesh>
      {/* jambes ballantes dans le vide */}
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} castShadow material={M.mattress} position={[x, 0.25, 0.35]} rotation={[0.9, 0, 0]}>
          <capsuleGeometry args={[0.14, 0.6, 4, 8]} />
        </mesh>
      ))}
      {/* sac à dos de survie */}
      <mesh castShadow material={M.hullDark} position={[0, 1, -0.42]}>
        <boxGeometry args={[0.6, 0.8, 0.35]} />
      </mesh>
    </group>
  );
}

export function SpaceWorld() {
  // débris qui dérivent lentement (décor)
  const debris = useRef([]);
  const debrisSeeds = useMemo(() => {
    const rng = mulberry32(1969);
    return Array.from({ length: 14 }, () => ({
      x: -80 + rng() * 160,
      y: 430 + rng() * 80,
      z: -80 + rng() * 160,
      s: 0.5 + rng() * 1.8,
      sp: 0.2 + rng() * 0.5,
    }));
  }, []);

  useFrame(() => {
    const t = runtime.simTime;
    debris.current.forEach((m, i) => {
      if (!m) return;
      const s = debrisSeeds[i];
      m.position.set(s.x + Math.sin(t * s.sp + i) * 4, s.y + Math.cos(t * s.sp * 0.7 + i) * 3, s.z);
      m.rotation.x = t * s.sp;
      m.rotation.y = t * s.sp * 0.6;
    });
  });

  return (
    <group>
      {/* ------------------------------------------------ l'astéroïde d'accueil */}
      <Asteroid pos={[-14, 429, -36]} r={7} />
      <Gate pos={[-14, 432.5, -34]} killY={385} label="L'Espace" beaconHeight={36} />

      {/* ------------------------------------------------ le champ d'astéroïdes */}
      {/* gravité 0.35 : chaque saut porte à ~6 m de haut et 15 m de long */}
      <Asteroid pos={[8, 434, -22]} r={5} />
      <Asteroid pos={[26, 439, -6]} r={5.5} />
      <Asteroid pos={[18, 445, 12]} r={4.5} />
      <Asteroid pos={[-2, 450, 20]} r={5} />
      {/* booster raccourci : de l'accueil directement vers la station */}
      <Booster pos={[-30, 432, -20]} power={22} />
      <Asteroid pos={[-34, 446, 0]} r={4} />

      {/* ------------------------------------------------ LA STATION */}
      {/* module principal */}
      <B pos={[-14, 455, 24]} size={[22, 7, 8]} mat={M.hull} />
      <mesh position={[-25.5, 455, 24]} material={M.hullDark} castShadow>
        <cylinderGeometry args={[3.4, 3.4, 3, 12]} />
      </mesh>
      {/* hublots */}
      {[-20, -14, -8].map((x, k) => (
        <mesh key={k} position={[x, 456, 28.05]} material={M.screen}>
          <cylinderGeometry args={[0.9, 0.9, 0.1, 14]} />
        </mesh>
      ))}
      {/* panneaux solaires : des rampes qu'on remonte à pied */}
      <Ramp pos={[4, 461, 24]} size={[14, 0.5, 7]} pitch={0} yaw={0} mat={M.solar} />
      <Ramp pos={[18, 464, 24]} size={[15, 0.5, 7]} pitch={0.44} yaw={-Math.PI / 2} mat={M.solar} />
      <B pos={[28, 467.8, 24]} size={[6, 1, 7]} mat={M.hullDark} />
      {/* fake way : le module de service, un cul-de-sac avec vue */}
      <B pos={[-14, 460, 10]} size={[6, 6, 14]} mat={M.hull} />
      <B pos={[-14, 463.9, 3.5]} size={[6, 1.8, 1]} mat={M.hullDark} />
      <mesh position={[-14, 460.5, 2.9]} material={M.screen}>
        <cylinderGeometry args={[1.4, 1.4, 0.12, 16]} />
      </mesh>
      <Souvenir id="étoile" pos={[-14, 464.9, 8]} />

      {/* ------------------------------------------------ L'ANTENNE */}
      {/* pylône en treillis + échelle jusqu'au sommet */}
      <B pos={[36, 476, 24]} size={[3.4, 18, 3.4]} mat={M.hullDark} />
      <Ladder pos={[36, 468.3, 27.9]} height={17.5} yaw={0} style="metal" width={1.4} />
      <B pos={[36, 486, 24]} size={[7, 1.2, 7]} mat={M.hull} />
      <mesh position={[36, 492, 24]} material={M.booster}>
        <coneGeometry args={[0.4, 9, 8]} />
      </mesh>
      {/* boosters de sortie : sommet d'antenne → plateformes satellites */}
      <Booster pos={[30, 488, 12]} power={20} />
      <B pos={[16, 494, 0]} size={[6, 1, 6]} mat={M.solar} />
      <B pos={[0, 497, -14]} size={[6, 1, 6]} mat={M.solar} />
      <B pos={[-14, 494, -30]} size={[7, 1.2, 7]} mat={M.hull} />

      {/* ------------------------------------------------ le rayon vers le paradis */}
      <WindColumn pos={[-14, 495, -44]} height={22} radius={2.6} />

      {/* ------------------------------------------------ poésie et souvenirs d'ici */}
      {/* la fusée — celle du papier peint de la chambre, en vrai */}
      <group position={[26, 441.8, -6]} rotation={[0, 0.6, 0.06]}>
        <mesh castShadow material={M.legoRed}>
          <cylinderGeometry args={[1.1, 1.4, 5, 12]} />
        </mesh>
        <mesh castShadow position={[0, 3.4, 0]} material={M.mattress}>
          <coneGeometry args={[1.15, 2.2, 12]} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            castShadow
            material={M.mattress}
            position={[Math.cos((i * Math.PI * 2) / 3) * 1.4, -2, Math.sin((i * Math.PI * 2) / 3) * 1.4]}
            rotation={[0, -(i * Math.PI * 2) / 3, 0.5]}
          >
            <boxGeometry args={[1.2, 1.8, 0.3]} />
          </mesh>
        ))}
        <mesh position={[0, 0.8, 1.15]} material={M.screen}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 12]} />
        </mesh>
      </group>
      {/* le cosmonaute assis au bord du module, face à la Terre */}
      <Cosmonaut pos={[-18, 458.5, 28.3]} yaw={0} />
      {/* drapeau planté sur l'astéroïde d'accueil */}
      <group position={[-9, 430.5, -40]}>
        <Cyl pos={[0, 2, 0]} r={0.08} h={4} mat={M.metal} />
        <mesh position={[0.9, 3.4, 0]} material={M.legoYellow}>
          <boxGeometry args={[1.8, 1.1, 0.08]} />
        </mesh>
      </group>

      {/* débris en dérive */}
      {debrisSeeds.map((s, i) => (
        <mesh key={i} ref={(el) => (debris.current[i] = el)} material={M.hullDark}>
          <boxGeometry args={[s.s, s.s * 0.6, s.s * 0.8]} />
        </mesh>
      ))}
    </group>
  );
}
