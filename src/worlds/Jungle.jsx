import { useMemo } from 'react';
import { M } from '../components/level/materials';
import { B, Cyl, Ramp, Ladder, Trampoline, Bumper, Gate, Souvenir, StairsRun } from '../level/kit';
import { mulberry32 } from '../utils/rng';

// ============================================================
// CHAPITRE 2 — LA JUNGLE (matin vert, 74 → 178 m)
// Au-dessus de la chambre, l'enfance sauvage : arbres géants,
// lianes, champignons-bumpers, temple moussu, rivière.
//  A — le temple (escaliers à COURIR) → l'arbre A → pont de corde
//  B — les champignons-trampolines → les rochers → l'arbre B
//  C — les lianes de l'arbre A directement
// Sortie : la canopée du grand arbre → les plateformes suspendues
// → l'échelle du plateau de glace.
// Fake way : la grotte sous le temple (une idole y dort).
// ============================================================

// Champignon rebondisseur (bumper à flanc, trampoline à plat)
function Mushroom({ pos, r = 2, power = 15, stem = 2.2 }) {
  return (
    <group>
      <Cyl pos={[pos[0], pos[1] + stem / 2, pos[2]]} r={r * 0.35} h={stem} mat={M.mushroomDots} />
      <Bumper pos={[pos[0], pos[1] + stem + r * 0.5, pos[2]]} r={r} power={power} mat={M.mushroomCap}>
        <group>
          <mesh castShadow material={M.mushroomCap} scale={[1, 0.62, 1]}>
            <sphereGeometry args={[r, 16, 12]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              material={M.mushroomDots}
              position={[
                Math.cos((i * Math.PI) / 2 + 0.4) * r * 0.55,
                r * 0.35,
                Math.sin((i * Math.PI) / 2 + 0.4) * r * 0.55,
              ]}
            >
              <sphereGeometry args={[r * 0.14, 8, 6]} />
            </mesh>
          ))}
        </group>
      </Bumper>
    </group>
  );
}

// Grand arbre : tronc + canopée praticable
function Tree({ pos, r, h, canopyR }) {
  return (
    <group>
      <Cyl pos={[pos[0], pos[1] + h / 2, pos[2]]} r={r} rTop={r * 0.7} h={h} mat={M.bark} />
      <Cyl pos={[pos[0], pos[1] + h + 1.2, pos[2]]} r={canopyR} rTop={canopyR * 0.75} h={2.5} mat={M.leaf} />
      {/* boules de feuillage autour */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          castShadow
          material={M.leafDark}
          position={[
            pos[0] + Math.cos((i * Math.PI * 2) / 5) * canopyR * 0.8,
            pos[1] + h + 2 + (i % 2),
            pos[2] + Math.sin((i * Math.PI * 2) / 5) * canopyR * 0.8,
          ]}
        >
          <sphereGeometry args={[canopyR * 0.42, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export function JungleWorld() {
  const pillars = useMemo(() => {
    const rng = mulberry32(2024);
    return Array.from({ length: 10 }, () => ({
      pos: [-90 + rng() * 180, 74, -90 + rng() * 160],
      h: 3 + rng() * 6,
      lean: (rng() - 0.5) * 0.3,
    }));
  }, []);

  return (
    <group>
      {/* ------------------------------------------------ le sol de la jungle */}
      <B pos={[0, 73, -19]} size={[240, 2, 240]} mat={M.grass} shadow={false} />
      {/* la rivière (décor) et son pont de bois */}
      <mesh position={[0, 74.06, 66]} rotation={[-Math.PI / 2, 0, 0]} material={M.water}>
        <planeGeometry args={[240, 16]} />
      </mesh>
      <B pos={[-10, 74.6, 66]} size={[6, 1.2, 20]} mat={M.wood} />

      {/* ------------------------------------------------ LE TEMPLE (course à pied) */}
      {[
        [44, 4, 44, 76],
        [34, 4, 34, 80],
        [24, 4, 24, 84],
        [15, 4, 15, 88],
      ].map(([w, h, d, y], k) => (
        <B key={k} pos={[60, y, 40]} size={[w, h, d]} mat={M.mossStone} />
      ))}
      <B pos={[60, 91.5, 40]} size={[8, 3, 8]} mat={M.mossStone} />
      {/* les grands escaliers du temple, à courir */}
      <StairsRun pos={[60, 74, 68]} yaw={0} steps={9} stepW={8} stepH={0.5} stepD={1.2} mat={M.mossStone} />
      <StairsRun pos={[60, 78.5, 54]} yaw={0} steps={8} stepW={6} stepH={0.5} stepD={1.1} mat={M.mossStone} />
      <StairsRun pos={[60, 82.6, 43]} yaw={0} steps={8} stepW={5} stepH={0.5} stepD={1.05} mat={M.mossStone} />
      <StairsRun pos={[60, 86.8, 34.5]} yaw={0} steps={9} stepW={4} stepH={0.5} stepD={1} mat={M.mossStone} />
      {/* fake way : la grotte sous le temple — cul-de-sac, mais une idole y dort */}
      <B pos={[42, 76.5, 18]} size={[4, 5, 1]} mat={M.mossStone} />
      <B pos={[34, 76.5, 18]} size={[4, 5, 1]} mat={M.mossStone} />
      <B pos={[38, 79.5, 18]} size={[12, 1, 1]} mat={M.mossStone} />
      <pointLight position={[38, 77, 24]} color="#7aff9a" intensity={16} distance={16} decay={2} />
      <Souvenir id="idole" pos={[38, 75.6, 26]} />
      {/* colonnes ruinées éparses */}
      {pillars.map((c, k) => (
        <group key={k} position={c.pos} rotation={[c.lean, 0, c.lean * 0.5]}>
          <Cyl pos={[0, c.h / 2, 0]} r={1.3} h={c.h} mat={M.mossStone} />
        </group>
      ))}

      {/* ------------------------------------------------ ARBRE A (est) */}
      <Tree pos={[30, 74, -30]} r={5} h={50} canopyR={12} />
      {/* liane 1 : sol → première branche (bien en saillie du tronc) */}
      <Ladder pos={[30, 74, -20.6]} height={22} yaw={0} style="rope" />
      <B pos={[30, 95.5, -24]} size={[7, 1, 6]} mat={M.bark} />
      {/* champignons d'étagère en spirale autour du tronc */}
      <B pos={[24, 97.6, -26]} size={[4, 1, 4]} mat={M.mushroomDots} />
      <B pos={[27, 99.8, -20]} size={[4, 1, 4]} mat={M.mushroomDots} />
      <B pos={[33, 102, -18]} size={[4, 1, 4]} mat={M.mushroomDots} />
      <B pos={[36, 104.2, -24]} size={[4, 1, 4]} mat={M.mushroomDots} />
      <B pos={[35, 106.2, -20]} size={[4, 1, 4]} mat={M.mushroomDots} />
      <B pos={[30, 107.2, -23.5]} size={[7, 1, 6]} mat={M.bark} />
      {/* liane 2 : pend du bord de la canopée (la grimpée reste à l'air libre) */}
      <Ladder pos={[30, 107.7, -17.6]} height={17} yaw={0} style="rope" />
      <Souvenir id="orchidée" pos={[36, 109, -28]} />
      {/* du sommet du temple (93) on saute sur la branche 1 (96) ? non :
          une liane pend du temple vers la branche */}
      <Ladder pos={[52, 93, 36]} height={4.5} yaw={Math.PI / 2} style="rope" width={0.9} />
      <B pos={[48, 96.6, 32]} size={[5, 1, 5]} mat={M.mossStone} />
      <B pos={[42, 96.4, 18]} size={[5, 1, 5]} mat={M.bark} />
      <B pos={[38, 96.2, 4]} size={[5, 1, 5]} mat={M.bark} />
      <B pos={[34, 96, -10]} size={[5, 1, 5]} mat={M.bark} />

      {/* ------------------------------------------------ CHAMPIGNONS (voie B) */}
      <Mushroom pos={[-20, 74, 20]} r={2.6} power={16} />
      <B pos={[-30, 79, 8]} size={[8, 4, 8]} mat={M.mossStone} />
      <Mushroom pos={[-36, 82.5, -4]} r={2.2} power={17} stem={1.6} />
      <B pos={[-44, 90, -16]} size={[12, 5, 10]} mat={M.mossStone} />
      <Mushroom pos={[-48, 92.5, -28]} r={2.2} power={18} stem={1.5} />
      {/* petits bumpers décoratifs au sol */}
      <Mushroom pos={[6, 74, -44]} r={1.8} power={14} />
      <Mushroom pos={[-70, 74, 30]} r={2} power={15} />

      {/* ------------------------------------------------ LE GRAND ARBRE (nord-ouest) */}
      <Tree pos={[-50, 74, -50]} r={6} h={78} canopyR={14} />
      {/* pont de corde : canopée A (125) → branche du grand arbre (124) */}
      {[
        [16, 124.6, -34],
        [4, 124.4, -38],
        [-8, 124.2, -42],
        [-20, 124, -44],
        [-32, 123.8, -46],
      ].map(([x, y, z], k) => (
        <B key={k} pos={[x, y, z]} size={[5, 0.8, 4]} mat={M.wood} />
      ))}
      <B pos={[-42, 123.6, -47]} size={[9, 1.4, 8]} mat={M.bark} />
      {/* liane du grand arbre : branche (124) → branche haute (139), en saillie */}
      <Ladder pos={[-50, 124.3, -38.6]} height={14} yaw={0} style="rope" />
      <B pos={[-50, 138, -42.5]} size={[10, 1.5, 7]} mat={M.bark} />
      {/* champignon d'étagère puis liane pendue au bord de la canopée */}
      <B pos={[-41, 137.5, -50]} size={[4, 1, 4]} mat={M.mushroomDots} />
      <Ladder pos={[-35.9, 138.8, -50]} height={13.6} yaw={Math.PI / 2} style="rope" />
      {/* rochers-marches depuis la voie B (96) vers la branche du pont (124) */}
      <B pos={[-52, 100, -34]} size={[6, 8, 6]} mat={M.mossStone} />
      <Ladder pos={[-52, 104, -30.6]} height={8.5} yaw={0} style="rope" />
      <B pos={[-52, 112.5, -34]} size={[6, 1, 6]} mat={M.bark} />
      <B pos={[-48, 115.5, -42]} size={[5, 1, 5]} mat={M.bark} />
      <B pos={[-44, 118.5, -47]} size={[5, 1, 5]} mat={M.bark} />
      <B pos={[-43, 121.5, -47]} size={[4, 1, 4]} mat={M.bark} />

      {/* ------------------------------------------------ SORTIE : vers la glace */}
      {/* plateformes suspendues au nord, cordes vers le ciel */}
      {[
        [-50, 154.3, -64],
        [-50, 156.1, -76],
        [-50, 157.9, -88],
        [-50, 159.7, -100],
      ].map(([x, y, z], k) => (
        <group key={k}>
          <B pos={[x, y, z]} size={[5, 1, 5]} mat={M.wood} />
          <mesh position={[x, y + 8, z]} material={M.vine}>
            <cylinderGeometry args={[0.07, 0.07, 16, 4]} />
          </mesh>
        </group>
      ))}
      <B pos={[-50, 161.5, -111]} size={[6, 1, 6]} mat={M.wood} />
      {/* l'échelle du plateau de glace (on la voit briller d'en bas) */}
      <Ladder pos={[-50, 162, -110.6]} height={15.3} yaw={Math.PI} style="metal" />

      {/* ------------------------------------------------ vie de jungle */}
      {/* fougères et buissons (décor) */}
      {useMemo(() => {
        const rng = mulberry32(505);
        return Array.from({ length: 26 }, (_, k) => {
          const x = -100 + rng() * 200;
          const z = -100 + rng() * 180;
          const s = 1.5 + rng() * 2.5;
          return (
            <mesh key={k} castShadow position={[x, 74 + s * 0.4, z]} material={M.leafDark}>
              <coneGeometry args={[s, s * 1.6, 7]} />
            </mesh>
          );
        });
      }, [])}
      {/* lucioles dorées */}
      <pointLight position={[30, 90, -30]} color="#aaffb0" intensity={20} distance={30} decay={2} />
      <pointLight position={[-50, 100, -50]} color="#aaffb0" intensity={20} distance={34} decay={2} />

      {/* ------------------------------------------------ porte de chapitre suivante */}
      {/* (la porte de la glace est posée sur le plateau, dans Ice.jsx) */}
      <Gate pos={[3, 76.5, -79]} killY={40} label="La Jungle" beaconHeight={40} />
    </group>
  );
}
