import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { M, legoMats, bookMats, bookCoverMats, crayonMats } from '../components/level/materials';
import { B, Cyl, Ladder, Trampoline, Souvenir, StairsRun, Ramp, isPlayer } from '../level/kit';
import { drawingTexture, letterTexture, clockTexture } from '../utils/textures';
import { mulberry32 } from '../utils/rng';
import { runtime } from '../store/runtime';
import { audio } from '../audio/AudioSystem';

// ============================================================
// CHAPITRE 1 — LA CHAMBRE (nuit, 0 → 70 m)
// Une chambre d'enfant géante, open world : trois grandes routes
// vers la fenêtre, des raccourcis au trampoline, des recoins.
//  A — le lit-trampoline → étagères ouest → grande bibliothèque
//  B — la chaise → le bureau → étagères est → tour de Lego → le mobile
//  C — le coffre à jouets → l'armoire (raccourci trampoline)
// Sortie : la fenêtre entrouverte, la gouttière, l'école au-dessus.
// ============================================================

const frameMats = ['crib', 'bike', 'gradcap', 'heart', 'house', 'star'].map(
  (k) =>
    new THREE.MeshStandardMaterial({
      map: drawingTexture(k),
      roughness: 0.9,
    })
);
const letterMatsArr = [
  ['A', '#c0392b'],
  ['B', '#2d6cdf'],
  ['C', '#3f9e4d'],
  ['J', '#e8b13a'],
  ['O', '#8a4fd9'],
  ['I', '#c0392b'],
].map(
  ([l, c]) =>
    new THREE.MeshStandardMaterial({ map: letterTexture(l, c), roughness: 0.5, emissive: '#111', emissiveIntensity: 0.2 })
);
const alarmMat = new THREE.MeshStandardMaterial({
  map: clockTexture(7, 77 % 60), // le réveil déréglé de la chambre
  roughness: 0.5,
  emissive: '#332211',
  emissiveIntensity: 0.3,
});

// Cube-lettre : plateforme et jouet à la fois
function LetterCube({ pos, size = 3, i = 0, rot = 0 }) {
  return (
    <RigidBody type="fixed" colliders={false} position={pos} rotation={[0, rot, 0]}>
      <CuboidCollider args={[size / 2, size / 2, size / 2]} friction={1} />
      <mesh castShadow receiveShadow material={letterMatsArr[i % letterMatsArr.length]}>
        <boxGeometry args={[size, size, size]} />
      </mesh>
    </RigidBody>
  );
}

// Brique de Lego géante avec tenons
function LegoBrick({ pos, size, i = 0, rot = 0 }) {
  const mat = legoMats[i % 4];
  const studs = [];
  const nx = Math.max(1, Math.round(size[0] / 2.4));
  const nz = Math.max(1, Math.round(size[2] / 2.4));
  for (let a = 0; a < nx; a++) {
    for (let b = 0; b < nz; b++) {
      studs.push([
        -size[0] / 2 + (size[0] / nx) * (a + 0.5),
        size[1] / 2 + 0.22,
        -size[2] / 2 + (size[2] / nz) * (b + 0.5),
      ]);
    }
  }
  return (
    <RigidBody type="fixed" colliders={false} position={pos} rotation={[0, rot, 0]}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} friction={1} />
      <mesh castShadow receiveShadow material={mat}>
        <boxGeometry args={size} />
      </mesh>
      {studs.map((p, k) => (
        <mesh key={k} position={p} material={mat} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.44, 14]} />
        </mesh>
      ))}
    </RigidBody>
  );
}

// Livre géant posé à plat (plateforme) — tranche de pages visible
function FlatBook({ pos, size = [6, 1.6, 4.5], i = 0, rot = 0 }) {
  return (
    <RigidBody type="fixed" colliders={false} position={pos} rotation={[0, rot, 0]}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} friction={1} />
      {/* couverture */}
      <mesh castShadow receiveShadow position={[0, size[1] / 2 - 0.08, 0]} material={bookCoverMats[i % bookCoverMats.length]}>
        <boxGeometry args={[size[0], 0.16, size[2]]} />
      </mesh>
      <mesh position={[0, -size[1] / 2 + 0.08, 0]} material={bookCoverMats[i % bookCoverMats.length]}>
        <boxGeometry args={[size[0], 0.16, size[2]]} />
      </mesh>
      {/* pages */}
      <mesh receiveShadow material={M.pages}>
        <boxGeometry args={[size[0] * 0.96, size[1] - 0.3, size[2] * 0.96]} />
      </mesh>
    </RigidBody>
  );
}

// Livre debout (obstacle/mur sur les étagères)
function UprightBook({ pos, h = 6, w = 1.2, d = 4.5, i = 0, lean = 0 }) {
  return (
    <group position={pos} rotation={[0, 0, lean]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} friction={0.9} />
        <mesh castShadow receiveShadow material={bookMats[i % bookMats.length]}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

// Crayon géant couché — pont à courir
function CrayonBridge({ pos, len = 14, yaw = 0, i = 0 }) {
  return (
    <group position={pos} rotation={[0, yaw, Math.PI / 2]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7, len / 2, 0.7]} friction={1} />
        <mesh castShadow receiveShadow material={crayonMats[i % crayonMats.length]}>
          <cylinderGeometry args={[0.7, 0.7, len, 8]} />
        </mesh>
        <mesh position={[0, len / 2 + 1, 0]} material={M.crayonWood} castShadow>
          <coneGeometry args={[0.7, 2, 8]} />
        </mesh>
        <mesh position={[0, len / 2 + 2.1, 0]} material={crayonMats[i % crayonMats.length]}>
          <coneGeometry args={[0.25, 0.7, 8]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

// Le canard en plastique — couic !
function RubberDuck({ pos }) {
  const lastQuack = useRef(-10);
  return (
    <group position={pos}>
      <RigidBody type="fixed" colliders={false} sensor>
        <CuboidCollider
          args={[1.6, 1.6, 1.6]}
          sensor
          onIntersectionEnter={(e) => {
            if (!isPlayer(e)) return;
            if (runtime.simTime - lastQuack.current < 1) return;
            lastQuack.current = runtime.simTime;
            audio.sfx('quack');
          }}
        />
      </RigidBody>
      <mesh castShadow material={M.duck}>
        <sphereGeometry args={[1.1, 12, 10]} />
      </mesh>
      <mesh position={[0, 0.9, 0.6]} castShadow material={M.duck}>
        <sphereGeometry args={[0.65, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.85, 1.25]} material={M.duckBeak}>
        <boxGeometry args={[0.5, 0.22, 0.5]} />
      </mesh>
      <mesh position={[-0.22, 1.05, 1.05]} material={M.woodDark}>
        <sphereGeometry args={[0.07, 6, 6]} />
      </mesh>
      <mesh position={[0.22, 1.05, 1.05]} material={M.woodDark}>
        <sphereGeometry args={[0.07, 6, 6]} />
      </mesh>
    </group>
  );
}

// Petit train en bois qui tourne en boucle sur le tapis
function ToyTrain() {
  const g = useRef();
  useFrame(() => {
    if (!g.current) return;
    const a = runtime.simTime * 0.35;
    g.current.position.set(Math.cos(a) * 17, 0.9, 10 + Math.sin(a) * 17);
    g.current.rotation.y = -a - Math.PI / 2;
  });
  return (
    <group ref={g}>
      <mesh castShadow material={M.legoRed}>
        <boxGeometry args={[3.2, 1.6, 1.8]} />
      </mesh>
      <mesh position={[1, 1.2, 0]} castShadow material={M.legoBlue}>
        <boxGeometry args={[1.2, 1.2, 1.6]} />
      </mesh>
      <mesh position={[-0.8, 1.1, 0]} castShadow material={M.woodDark}>
        <cylinderGeometry args={[0.35, 0.5, 0.8, 8]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 1.1, -0.8, sz * 0.95]} rotation={[Math.PI / 2, 0, 0]} material={M.woodDark}>
            <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
          </mesh>
        ))
      )}
    </group>
  );
}

export function BedroomWorld() {
  // jouets épars au sol (décor + marchepieds), déterministes
  const scatter = useMemo(() => {
    const rng = mulberry32(4242);
    return Array.from({ length: 16 }, (_, i) => ({
      pos: [(rng() - 0.5) * 110, 1 + rng() * 0.5, (rng() - 0.5) * 110],
      size: [2 + rng() * 2.5, 2 + rng(), 2 + rng() * 2],
      rot: rng() * Math.PI,
      i,
    }));
  }, []);

  return (
    <group>
      {/* ------------------------------------------------ le sol, le tapis */}
      <B pos={[0, -0.5, 0]} size={[150, 1, 150]} mat={M.floor} shadow={false} />
      <mesh receiveShadow position={[0, 0.04, 10]} rotation={[-Math.PI / 2, 0, 0]} material={M.rug}>
        <circleGeometry args={[24, 40]} />
      </mesh>

      {/* ------------------------------------------------ les murs (papier peint) */}
      {/* nord, avec la fenêtre découpée (x -10..14, y 58..70) */}
      <B pos={[-42.5, 37, -75]} size={[65, 74, 2]} mat={M.wallBedroom} shadow={false} />
      <B pos={[44.5, 37, -75]} size={[61, 74, 2]} mat={M.wallBedroom} shadow={false} />
      <B pos={[2, 29, -75]} size={[24, 58, 2]} mat={M.wallBedroom} shadow={false} />
      {/* sud, est, ouest */}
      <B pos={[0, 37, 75]} size={[150, 74, 2]} mat={M.wallBedroom} shadow={false} />
      <B pos={[75, 37, 0]} size={[2, 74, 150]} mat={M.wallBedroom} shadow={false} />
      <B pos={[-75, 37, 0]} size={[2, 74, 150]} mat={M.wallBedroom} shadow={false} />
      {/* plinthes */}
      {[
        [0, 1.5, -73.8, 148, 3, 0.6],
        [0, 1.5, 73.8, 148, 3, 0.6],
        [73.8, 1.5, 0, 0.6, 3, 148],
        [-73.8, 1.5, 0, 0.6, 3, 148],
      ].map(([x, y, z, w, h, d], k) => (
        <mesh key={k} position={[x, y, z]} material={M.woodDark}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}

      {/* cadre de la fenêtre + rebord + lumière de lune */}
      <mesh position={[2, 58.2, -74]} material={M.woodDark}>
        <boxGeometry args={[26, 1.2, 3]} />
      </mesh>
      {[-10.6, 14.6].map((x, k) => (
        <mesh key={k} position={[x, 64, -74]} material={M.woodDark}>
          <boxGeometry args={[1.2, 13, 3]} />
        </mesh>
      ))}
      {/* rideau entrouvert */}
      <mesh position={[-6, 64, -73]} material={M.fabric}>
        <boxGeometry args={[8, 13, 0.4]} />
      </mesh>
      <pointLight position={[2, 63, -70]} color="#bcd2ff" intensity={50} distance={40} decay={1.8} />

      {/* ------------------------------------------------ VOIE A : le lit */}
      {/* cadre + couette */}
      <B pos={[-52, 3, -30]} size={[26, 6, 16]} mat={M.woodDark} />
      <B pos={[-52, 6.4, -25]} size={[25, 1.2, 7]} mat={M.fabric} />
      {/* le matelas-trampoline */}
      <Trampoline pos={[-52, 6.8, -30]} size={[24, 1.6, 12]} power={20} mat={M.mattress} />
      {/* oreiller + tête de lit */}
      <B pos={[-58, 8.2, -35]} size={[9, 1.8, 5]} mat={M.mattress} />
      <B pos={[-52, 10, -37.5]} size={[26, 8, 3]} mat={M.wood} />
      {/* le canard caché sous le lit (passage étroit !) */}
      <RubberDuck pos={[-52, 1.2, -30]} />
      <Souvenir id="toupie" pos={[-44, 1.4, -33]} />

      {/* étagères murales ouest + échelle-jouet */}
      <B pos={[-66, 15.5, -44]} size={[14, 1, 7]} mat={M.wood} />
      <Ladder pos={[-68, 16, -46.4]} height={14} yaw={0} style="wood" />
      <B pos={[-68, 30.5, -50]} size={[13, 1, 7]} mat={M.wood} />
      <FlatBook pos={[-60, 32.4, -55]} size={[4.5, 2.4, 4]} i={1} rot={0.4} />
      <B pos={[-52, 33.6, -62]} size={[16, 1, 6]} mat={M.wood} />
      <UprightBook pos={[-58, 36.5, -50.5]} h={6} i={2} lean={0.12} />

      {/* ------------------------------------------------ LA BIBLIOTHÈQUE (mur nord) */}
      {/* montants */}
      {[-50, -30, -10].map((x, k) => (
        <B key={k} pos={[x, 30, -70]} size={[1.6, 60, 8]} mat={M.woodDark} />
      ))}
      {/* étagères */}
      {[12, 23, 34, 45, 56].map((y, k) => (
        <B key={k} pos={[-30, y, -70]} size={[40, 1.2, 8]} mat={M.wood} />
      ))}
      {/* livres géants : obstacles et passages étroits sur les rayonnages */}
      {[
        [-44, 12.6, 4.4, 0, 0.05],
        [-38, 12.6, 4.2, 1, -0.08],
        [-20, 12.6, 4.6, 2, 0],
        [-46, 23.6, 4.2, 3, 0],
        [-34, 23.6, 4.5, 4, 0.1],
        [-26, 23.6, 4.0, 5, -0.05],
        [-42, 34.6, 4.3, 0, 0],
        [-30, 34.6, 4.6, 1, 0.07],
        [-14, 34.6, 4.2, 2, 0],
        [-44, 45.6, 4.4, 3, -0.06],
        [-24, 45.6, 4.3, 4, 0],
        [-38, 56.6, 4.5, 5, 0.05],
        [-16, 56.6, 4.1, 0, 0],
      ].map(([x, y, h, i, lean], k) => (
        <UprightBook key={k} pos={[x, y + h / 2, -70]} h={h + 2} i={i} lean={lean} />
      ))}
      {/* livres à plat = marches entre étagères */}
      <FlatBook pos={[-13, 13.4, -66.5]} size={[6, 1.6, 5]} i={3} />
      <FlatBook pos={[-12, 24.4, -67]} size={[6, 1.6, 5]} i={4} rot={-0.3} />
      {/* l'échelle coulissante de bibliothèque */}
      <Ladder pos={[-18, 34.6, -65.8]} height={21.4} yaw={0} style="wood" width={1.4} />
      {/* le globe et le réveil sur le dernier rayon */}
      <Cyl pos={[-34, 58.2, -70]} r={1.8} h={3.2} mat={M.globeSea} />
      <Souvenir id="doudou" pos={[-46, 58.4, -70]} />

      {/* marches vers le rebord de fenêtre */}
      <FlatBook pos={[-9, 57.9, -70]} size={[4.5, 1.8, 5]} i={1} />
      <RigidBody type="fixed" colliders={false} position={[-3, 59.3, -70.5]}>
        <CuboidCollider args={[2, 1.1, 2]} friction={1} />
        <mesh castShadow material={alarmMat}>
          <boxGeometry args={[4, 2.2, 1.6]} />
        </mesh>
        <mesh position={[0, 0, -1]} material={M.metal}>
          <boxGeometry args={[3.6, 1.8, 1.4]} />
        </mesh>
      </RigidBody>
      {/* le rebord de la fenêtre, puis le balcon et la gouttière */}
      <B pos={[3, 61.4, -71]} size={[14, 1.2, 6]} mat={M.woodDark} />
      <B pos={[3, 60.9, -78.5]} size={[10, 1, 6]} mat={M.metal} />
      <Ladder pos={[3, 61.4, -81]} height={11.5} yaw={0} style="metal" />

      {/* ------------------------------------------------ VOIE B : chaise → bureau → est */}
      {/* chaise d'enfant */}
      <B pos={[30, 1.6, 43]} size={[9, 0.7, 2.5]} mat={M.wood} />
      <Trampoline pos={[30, 4.3, 38]} size={[10, 1.4, 10]} power={17} mat={M.fabric} />
      <B pos={[30, 8, 33.2]} size={[10, 9, 1.5]} mat={M.wood} />
      {/* le grand bureau */}
      <B pos={[52, 9, 24]} size={[30, 1.5, 22]} mat={M.wood} />
      {[40, 64].map((x) =>
        [15, 33].map((z) => (
          <B key={`${x}${z}`} pos={[x, 4.4, z]} size={[1.8, 8.8, 1.8]} mat={M.woodDark} />
        ))
      )}
      {/* sur le bureau : pot à crayons, livres, lampe */}
      <Cyl pos={[60, 12.5, 18]} r={2.6} h={5.5} mat={M.legoBlue} />
      {[0, 1, 2].map((i) => (
        <CrayonBridge key={i} pos={[60 + i * 0.5 - 0.5, 16.5, 18 + i - 1]} len={7} yaw={0.4 * i} i={i} />
      ))}
      <FlatBook pos={[42, 10.9, 30]} size={[8, 2.2, 6]} i={0} rot={0.2} />
      <FlatBook pos={[43, 12.6, 29]} size={[6.5, 1.4, 5]} i={2} rot={-0.15} />
      {/* lampe de bureau allumée */}
      <group position={[46, 9.75, 16]}>
        <Cyl pos={[0, 1, 0]} r={2} h={2} mat={M.metal} />
        <mesh position={[1.5, 4.5, 0]} rotation={[0, 0, -0.5]} material={M.metal} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 7, 8]} />
        </mesh>
        <mesh position={[3.8, 7.5, 0]} rotation={[0, 0, 1.1]} material={M.legoRed} castShadow>
          <coneGeometry args={[2.2, 3.5, 12, 1, true]} />
        </mesh>
        <pointLight position={[4.5, 6.5, 0]} color="#ffd9a0" intensity={40} distance={30} decay={1.8} />
      </group>
      {/* crayon-pont du bureau vers la chaise haute pile de livres */}
      <CrayonBridge pos={[36, 10.4, 12]} len={13} yaw={Math.PI / 2 + 0.3} i={3} />

      {/* étagères murales est + échelles */}
      <Ladder pos={[70.8, 9.75, 14]} height={10} yaw={-Math.PI / 2} style="wood" />
      <B pos={[71, 20, 10]} size={[8, 1, 10]} mat={M.wood} />
      <Ladder pos={[70.8, 20.5, 2]} height={11} yaw={-Math.PI / 2} style="wood" />
      <B pos={[71, 32, -2]} size={[8, 1, 10]} mat={M.wood} />
      <B pos={[60, 32.8, -12]} size={[8, 1, 6]} mat={M.wood} />
      <B pos={[48, 33.6, -22]} size={[8, 1, 5]} mat={M.wood} />

      {/* ------------------------------------------------ LA TOUR DE LEGO */}
      <LegoBrick pos={[44, 10, -34]} size={[16, 20, 16]} i={0} />
      <LegoBrick pos={[40, 24, -38]} size={[10, 8, 10]} i={1} />
      <LegoBrick pos={[47, 31.5, -31]} size={[8, 5, 8]} i={2} />
      <LegoBrick pos={[42, 37, -37]} size={[7, 6, 7]} i={3} />
      <Ladder pos={[42, 34, -33.4]} height={6} yaw={0} style="wood" width={0.9} />
      {/* briques en saillie : la voie C grimpe la tour depuis le sol */}
      <LegoBrick pos={[52, 3, -26]} size={[5, 6, 5]} i={1} />
      <LegoBrick pos={[50, 8, -32]} size={[4, 4, 4]} i={2} />
      <LegoBrick pos={[54, 13, -38]} size={[4, 4, 4]} i={3} />
      <LegoBrick pos={[48, 17.5, -42]} size={[4, 5, 4]} i={0} />
      {/* pouf-trampoline au sommet : élan vers le mobile */}
      <Trampoline pos={[42, 40.7, -37]} size={[4, 1.4, 4]} power={15} mat={M.fabric} />

      {/* ------------------------------------------------ LE MOBILE (planètes suspendues) */}
      {[
        [32, 43, -44, 0],
        [25, 44.6, -51, 1],
        [16, 46.2, -58, 2],
        [8, 47.8, -63, 3],
      ].map(([x, y, z, i]) => (
        <group key={i}>
          <RigidBody type="fixed" colliders={false} position={[x, y, z]}>
            <CuboidCollider args={[2.2, 0.8, 2.2]} friction={1} />
            <mesh castShadow material={legoMats[i]}>
              <sphereGeometry args={[2.4, 14, 12]} />
            </mesh>
            {i === 1 && (
              <mesh rotation={[Math.PI / 2.4, 0, 0]} material={M.knob}>
                <torusGeometry args={[3.4, 0.25, 8, 24]} />
              </mesh>
            )}
          </RigidBody>
          {/* fil vers le plafond */}
          <mesh position={[x, y + 12, z]} material={M.knob}>
            <cylinderGeometry args={[0.06, 0.06, 24, 4]} />
          </mesh>
        </group>
      ))}
      {/* échelle de corde du mobile vers le rebord de fenêtre */}
      <Ladder pos={[6, 48.5, -68.5]} height={13.2} yaw={0} style="rope" width={0.9} />

      {/* ------------------------------------------------ VOIE C : coffre → armoire */}
      <B pos={[0, 5, 52]} size={[20, 10, 14]} mat={M.wood} />
      <B pos={[0, 10.6, 58]} size={[20, 1.6, 4]} mat={M.woodDark} rot={0} />
      <Trampoline pos={[0, 10.8, 51]} size={[8, 1.5, 8]} power={23} mat={M.fabric} />
      {/* l'armoire */}
      <B pos={[-24, 13, 64]} size={[24, 26, 12]} mat={M.woodDark} />
      <B pos={[-24, 17, 57.2]} size={[24, 1, 2.5]} mat={M.wood} />
      {[-30, -18].map((x, k) => (
        <mesh key={k} position={[x, 13, 57.8]} material={M.wood}>
          <boxGeometry args={[10.5, 24, 0.4]} />
        </mesh>
      ))}
      <mesh position={[-24, 13, 58.2]} material={M.knob}>
        <sphereGeometry args={[0.35, 8, 8]} />
      </mesh>
      <Ladder pos={[-11.6, 17.5, 61]} height={9} yaw={Math.PI / 2} style="wood" />
      {/* de l'armoire : étagère sud, l'abat-jour suspendu, échelle de corde */}
      <B pos={[-4, 30.5, 48]} size={[10, 1, 6]} mat={M.wood} />
      <group>
        <Cyl pos={[2, 34, 37]} r={5.5} h={1.2} rTop={4} mat={M.fabric} />
        <mesh position={[2, 47, 37]} material={M.knob}>
          <cylinderGeometry args={[0.08, 0.08, 26, 4]} />
        </mesh>
        <pointLight position={[2, 32.5, 37]} color="#ffc98d" intensity={35} distance={30} decay={1.8} />
      </group>
      <Ladder pos={[2, 34.6, 33.6]} height={12} yaw={Math.PI} style="rope" width={0.9} />
      {/* étagère suspendue rejoignant la bibliothèque */}
      <B pos={[-2, 46.6, 22]} size={[8, 1, 6]} mat={M.wood} />
      <B pos={[-8, 48.4, 8]} size={[7, 1, 6]} mat={M.wood} />
      <B pos={[-14, 50.2, -6]} size={[7, 1, 6]} mat={M.wood} />
      <B pos={[-20, 52, -20]} size={[7, 1, 6]} mat={M.wood} />
      <B pos={[-26, 53.8, -34]} size={[7, 1, 6]} mat={M.wood} />
      <B pos={[-30, 55.4, -48]} size={[7, 1, 6]} mat={M.wood} />

      {/* ------------------------------------------------ décor vivant */}
      <ToyTrain />
      {/* cubes-lettres épars (marchepieds) */}
      <LetterCube pos={[16, 1.5, -6]} size={3} i={0} rot={0.3} />
      <LetterCube pos={[12, 1.5, -14]} size={3} i={1} rot={-0.2} />
      <LetterCube pos={[14, 4.2, -10]} size={2.4} i={2} rot={0.8} />
      <LetterCube pos={[-14, 1.5, 20]} size={3} i={3} />
      <LetterCube pos={[-19, 1.5, 24]} size={3} i={4} rot={0.5} />
      {/* ballon */}
      <RigidBody type="fixed" colliders={false} position={[-10, 2.2, -12]}>
        <CuboidCollider args={[1.6, 1.6, 1.6]} friction={1} />
        <mesh castShadow material={M.legoRed}>
          <sphereGeometry args={[2.2, 16, 14]} />
        </mesh>
        <mesh material={M.mattress} rotation={[0, 0.6, 0]}>
          <sphereGeometry args={[2.21, 16, 14, 0, Math.PI / 3]} />
        </mesh>
      </RigidBody>
      {/* jouets épars */}
      {scatter.map((t, k) => (
        <LegoBrick key={k} pos={t.pos} size={t.size} i={t.i} rot={t.rot} />
      ))}
      {/* cadres : les étapes d'une vie, accrochés aux murs */}
      {frameMats.map((mat, k) => {
        const wall = k % 2 === 0;
        return (
          <group
            key={k}
            position={wall ? [74, 24 + k * 7, -40 + k * 16] : [-74, 22 + k * 7, -30 + k * 14]}
            rotation={[0, wall ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <mesh material={M.woodDark}>
              <boxGeometry args={[7.4, 7.4, 0.5]} />
            </mesh>
            <mesh position={[0, 0, 0.3]} material={mat}>
              <planeGeometry args={[6.4, 6.4]} />
            </mesh>
          </group>
        );
      })}
      {/* étoiles phosphorescentes collées aux murs */}
      {useMemo(() => {
        const rng = mulberry32(888);
        return Array.from({ length: 26 }, (_, k) => {
          const wall = Math.floor(rng() * 3);
          const a = rng();
          const y = 20 + rng() * 45;
          const p =
            wall === 0
              ? [-74 + 0.4, y, (a - 0.5) * 130]
              : wall === 1
                ? [74 - 0.4, y, (a - 0.5) * 130]
                : [(a - 0.5) * 130, y, 75 - 0.4];
          return (
            <mesh key={k} position={p} rotation={[0, wall === 0 ? Math.PI / 2 : wall === 1 ? -Math.PI / 2 : Math.PI, 0]}>
              <circleGeometry args={[0.5, 5]} />
              <meshStandardMaterial color="#8aff9a" emissive="#4dff88" emissiveIntensity={1.2} />
            </mesh>
          );
        });
      }, [])}
      {/* veilleuse */}
      <pointLight position={[20, 5, 30]} color="#ffc98d" intensity={45} distance={50} decay={1.9} />
      <Cyl pos={[24, 1.5, 34]} r={1.4} h={3} rTop={0.8} mat={M.knob} />

      {/* marches de livres et planche : on grimpe aussi à pied */}
      <StairsRun pos={[-2, 0, 44]} yaw={0} steps={7} stepW={4} stepH={0.6} stepD={1.2} mat={M.woodDark} />
      <Ramp pos={[-38, 3.2, -16]} size={[4, 0.7, 13]} pitch={0.42} mat={M.wood} />
      {/* (la porte du chapitre suivant est posée dans la jungle, au-dessus) */}
    </group>
  );
}
