import { useMemo } from 'react';
import { Sky } from './Sky';
import { Plat, Solid, Deco } from './Build';
import {
  Ladder,
  Trampoline,
  Elevator,
  Bumper,
  Gate,
  Souvenir,
  FinishZone,
  WindColumn,
  CloudPuff,
  DriftParticles,
} from './kit';
import { mulberry32 } from '../utils/rng';

// ============================================================
// THE JOURNEY — une ascension continue habillée de vrais kits 3D.
// Village (bois, pierre) → Ville (béton, toits) → Falaises (roche, nature)
// → Ciel (nuages). Un chemin principal lisible + branches et raccourcis.
// Tout ce qui porte le joueur est un collider fiable ; les modèles Synty
// habillent. Sauts ≤ 2,3 m ; échelles/ascenseurs/trampolines pour le reste.
// ============================================================

// habillage décoratif dispersé (déterministe), sans collision
function Scatter({ seed, count, area, y, models, scale }) {
  const items = useMemo(() => {
    const rng = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      pos: [area[0] + rng() * (area[2] - area[0]), y, area[1] + rng() * (area[3] - area[1])],
      model: models[Math.floor(rng() * models.length)],
      rot: rng() * Math.PI * 2,
      s: scale[0] + rng() * (scale[1] - scale[0]),
    }));
  }, [seed, count, y]);
  return items.map((it, i) => (
    <Deco key={i} pos={it.pos} model={it.model} rot={it.rot} scale={it.s} />
  ));
}

export function World() {
  return (
    <group>
      <Sky />

      {/* ===================== LE VILLAGE (1 → 55) ===================== */}
      {/* grande place pavée */}
      <Plat pos={[0, 1, 0]} size={[30, 30]} model="floorStone" tile={4} />
      {/* décor de place : caisses, tonneaux, charrette, puits, bâtiments */}
      <Solid pos={[8, 1, -6]} model="wagon" scale={2.2} rot={0.5} />
      <Solid pos={[-9, 1, 5]} model="crate" scale={2} />
      <Solid pos={[-11, 1, 3]} model="crate" scale={2} rot={0.6} />
      <Deco pos={[11, 1, 9]} model="planter" scale={2.5} />
      <Scatter seed={1} count={6} area={[-14, -14, 14, 14]} y={1} models={['crate', 'fence', 'planter']} scale={[1.6, 2.4]} />
      {/* maisons du village autour (profondeur) */}
      <Solid pos={[-24, 1, -18]} model="buildingS" scale={3} rot={0.3} />
      <Solid pos={[26, 1, -14]} model="buildingS" scale={3} rot={-0.5} />
      <Solid pos={[22, 1, 22]} model="buildingM" scale={2.6} rot={2.4} />

      {/* montée A : escalier de caisses → toit de la maison */}
      <Solid pos={[13, 1, -14]} model="crate" scale={2} />
      <Plat pos={[13, 4, -18]} size={[6, 6]} model="floorWood" tile={3} />
      <Plat pos={[10, 6.2, -23]} size={[5, 5]} model="floorWood" tile={3} />
      <Ladder pos={[10, 6.2, -25.4]} height={7} yaw={Math.PI} style="wood" />
      <Plat pos={[10, 13.4, -28]} size={[8, 7]} model="floorWood" tile={4} />
      {/* branche : trampoline caché derrière la cheminée → raccourci haut */}
      <Solid pos={[13, 13.4, -30]} model="chimney" scale={2.4} />
      <Trampoline pos={[7, 14, -30]} size={[3.5, 1, 3.5]} power={20} />
      {/* le trampoline projette sur la charpente haute (voie rapide) */}
      <Plat pos={[2, 24, -30]} size={[6, 6]} model="floorWood" tile={3} />

      {/* montée B (principale) : sauts de toits + poutres */}
      <Plat pos={[3, 15.5, -22]} size={[5, 5]} model="floorBrick" tile={3} />
      <Plat pos={[-3, 17.5, -18]} size={[5, 5]} model="floorBrick" tile={3} />
      <Solid pos={[-3, 17.5, -18]} model="beam" scale={2} rot={0.5} />
      <Plat pos={[-9, 19.5, -22]} size={[5, 4]} model="floorWood" tile={3} />
      {/* ascenseur à contrepoids (monte-charge du grenier) */}
      <Elevator from={[-9, 20, -27]} to={[-9, 30.5, -27]} size={[4, 0.5, 4]} period={4.5} dwell={1.6} />
      <Plat pos={[-9, 31, -32]} size={[6, 6]} model="floorWood" tile={3} />
      {/* jonction avec la voie rapide (24) puis grimpe vers le beffroi */}
      <Plat pos={[-4, 33, -31]} size={[5, 5]} model="floorBrick" tile={3} />
      <Ladder pos={[-4, 33, -28.6]} height={9} yaw={0} style="wood" />
      <Plat pos={[-4, 42, -31]} size={[7, 6]} model="floorStone" tile={4} />
      <Souvenir id="cloche" pos={[-4, 43.5, -33]} />
      {/* le beffroi : dernières marches vers la porte de la ville */}
      <Plat pos={[2, 44.5, -36]} size={[5, 5]} model="floorStone" tile={3} />
      <Plat pos={[6, 47, -32]} size={[5, 5]} model="floorStone" tile={3} />
      <Trampoline pos={[6, 47.6, -32]} size={[3, 1, 3]} power={17} />
      <Plat pos={[4, 54, -30]} size={[10, 10]} model="floorStone" tile={4} />
      <Gate pos={[4, 55.5, -30]} killY={-15} label="La Ville" beaconHeight={40} />

      {/* ===================== LA VILLE (55 → 130) ===================== */}
      {/* tours de béton alentour (profondeur + décor grimpable) */}
      <Solid pos={[-30, 55, -30]} model="buildingL" scale={5} rot={0.2} />
      <Solid pos={[32, 55, -40]} model="buildingL" scale={5} rot={-0.4} />
      <Solid pos={[30, 55, 24]} model="buildingM" scale={4} rot={2.2} />
      <Solid pos={[-34, 55, 20]} model="buildingM" scale={4} rot={-1.8} />

      {/* toits en zigzag avec climatiseurs (marches) et colonnes */}
      <Plat pos={[4, 60, -22]} size={[8, 8]} model="floorCity" tile={4} />
      <Solid pos={[7, 60, -24]} model="ac" scale={2} />
      <Plat pos={[12, 63, -18]} size={[7, 6]} model="floorCity" tile={3} />
      <Plat pos={[16, 66, -12]} size={[6, 6]} model="floorCity" tile={3} />
      {/* échelle de secours */}
      <Solid pos={[20, 66, -12]} model="column" scale={2.4} />
      <Ladder pos={[18.5, 66, -12]} height={10} yaw={-Math.PI / 2} style="metal" width={1.4} />
      <Plat pos={[24, 76, -12]} size={[8, 8]} model="floorCity" tile={4} />
      {/* trampoline caché derrière un AC → toit voisin très haut */}
      <Solid pos={[27, 76, -14]} model="ac" scale={2} />
      <Trampoline pos={[24, 76.6, -8]} size={[3.5, 1, 3.5]} power={22} />
      <Plat pos={[18, 88, -6]} size={[7, 7]} model="floorCity" tile={4} />

      {/* voie principale : grue/monte-charge de chantier */}
      <Plat pos={[16, 78, -2]} size={[6, 6]} model="floorCity" tile={3} />
      <Elevator from={[16, 78.5, 2]} to={[16, 90.5, 2]} size={[4, 0.5, 4]} period={5} dwell={1.5} />
      <Plat pos={[16, 91, 7]} size={[7, 7]} model="floorCity" tile={4} />
      <Souvenir id="neon" pos={[18, 92.5, 9]} />
      {/* saut d'immeuble en immeuble vers le haut */}
      <Plat pos={[9, 94, 12]} size={[6, 6]} model="roof" tile={3} />
      <Plat pos={[2, 97, 10]} size={[6, 6]} model="roof" tile={3} />
      <Plat pos={[-5, 100, 6]} size={[6, 6]} model="roof" tile={3} />
      <Solid pos={[-5, 100, 6]} model="ac" scale={1.8} />
      <Ladder pos={[-5, 100, 3.6]} height={11} yaw={0} style="metal" width={1.4} />
      <Plat pos={[-5, 111, -1]} size={[8, 8]} model="floorCity" tile={4} />
      {/* dernier bond : deux toits puis la porte des falaises */}
      <Plat pos={[-12, 114, -6]} size={[6, 6]} model="roof" tile={3} />
      <Trampoline pos={[-12, 114.6, -6]} size={[3, 1, 3]} power={18} />
      <Plat pos={[-16, 122, -12]} size={[7, 7]} model="floorCity" tile={4} />
      <Plat pos={[-14, 128, -18]} size={[9, 9]} model="floorStone" tile={4} />
      <Gate pos={[-14, 129.5, -18]} killY={52} label="Les Falaises" beaconHeight={44} />

      {/* ===================== LES FALAISES (130 → 205) ===================== */}
      {/* massif rocheux + arbres (profondeur) */}
      <Solid pos={[-40, 130, -30]} model="rockM3" scale={7} />
      <Solid pos={[30, 130, -34]} model="rockM2" scale={8} rot={1.2} />
      <Scatter seed={7} count={10} area={[-45, -45, 45, 20]} y={130} models={['pine1', 'pine3', 'tree2']} scale={[3, 6]} />

      {/* vasques de roche à escalader (rochers-plateformes + lianes) */}
      <Plat pos={[-14, 134, -26]} size={[7, 7]} model="rockPlatR" tile={7} />
      <Solid pos={[-10, 134, -30]} model="rockM1" scale={4} />
      <Plat pos={[-8, 137, -32]} size={[6, 6]} model="rockPlatS" tile={6} />
      {/* champignon-bumper caché sous une fougère */}
      <Bumper pos={[-4, 138, -28]} r={1.8} power={19} model="mushroom">
        <Deco pos={[0, -1.8, 0]} model="mushroom" scale={3} />
      </Bumper>
      <Plat pos={[2, 148, -30]} size={[6, 6]} model="rockPlatR" tile={6} />
      {/* voie principale : vire étroite le long de la falaise */}
      <Plat pos={[-8, 140, -26]} size={[10, 3]} model="rockPlatS" tile={5} />
      <Ladder pos={[-8, 140, -24.6]} height={9} yaw={0} style="rope" />
      <Plat pos={[-8, 149, -28]} size={[6, 6]} model="rockPlatR" tile={6} />
      <Deco pos={[-6, 149, -30]} model="fern" scale={2.5} />
      <Plat pos={[-2, 152, -33]} size={[5, 5]} model="rockPlatS" tile={5} />
      <Plat pos={[4, 155, -30]} size={[5, 5]} model="rockPlatR" tile={5} />
      <Souvenir id="edelweiss" pos={[4, 156.5, -30]} />
      {/* ascenseur naturel : plateau de pierre sur ressort d'eau (élévateur) */}
      <Elevator from={[4, 155.5, -25]} to={[4, 168.5, -25]} size={[4, 0.5, 4]} period={5} dwell={1.6} model="rockPlatS" />
      <Plat pos={[4, 169, -20]} size={[7, 7]} model="rockPlatR" tile={7} />
      {/* grande grimpe finale de la falaise */}
      <Solid pos={[8, 169, -18]} model="rockM2" scale={5} />
      <Ladder pos={[6, 172, -17]} height={12} yaw={Math.PI / 2} style="rope" />
      <Plat pos={[12, 184, -18]} size={[7, 7]} model="rockPlatR" tile={7} />
      <Plat pos={[8, 190, -22]} size={[5, 5]} model="rockPlatS" tile={5} />
      <Trampoline pos={[8, 190.6, -22]} size={[3, 1, 3]} power={19} />
      <Plat pos={[2, 200, -24]} size={[9, 9]} model="rockPlatR" tile={8} />
      <Deco pos={[5, 200, -26]} model="deadTree" scale={4} />
      <Gate pos={[2, 201.5, -24]} killY={126} label="Le Ciel" beaconHeight={48} />

      {/* ===================== LE CIEL (205 → 300) ===================== */}
      {/* plateformes de nuages + courants ascendants, gravité déjà légère */}
      <CloudPuff pos={[2, 206, -28]} r={3} />
      <CloudPuff pos={[-4, 210, -32]} r={2.6} dissolve />
      <CloudPuff pos={[-10, 214, -28]} r={2.6} dissolve />
      <Plat pos={[-14, 218, -24]} size={[6, 6]} model="floorStone" tile={3} />
      <WindColumn pos={[-14, 219, -24]} height={16} radius={2} />
      <Plat pos={[-14, 236, -24]} size={[6, 6]} model="floorStone" tile={3} />
      <Souvenir id="plume" pos={[-14, 237.5, -26]} />
      {/* îlots flottants montants */}
      <CloudPuff pos={[-8, 240, -20]} r={2.6} />
      <CloudPuff pos={[-2, 244, -18]} r={2.6} dissolve />
      <Plat pos={[4, 248, -20]} size={[6, 6]} model="floorStone" tile={3} />
      <Trampoline pos={[4, 248.6, -20]} size={[3.5, 1, 3.5]} power={22} />
      <Plat pos={[2, 262, -24]} size={[7, 7]} model="floorStone" tile={4} />
      <WindColumn pos={[2, 263, -24]} height={16} radius={2.2} />
      <Plat pos={[2, 280, -24]} size={[7, 7]} model="floorStone" tile={4} />
      {/* le plateau final : lumière */}
      <CloudPuff pos={[-2, 284, -28]} r={3} />
      <CloudPuff pos={[-6, 288, -30]} r={3} />
      <Plat pos={[-10, 293, -30]} size={[10, 10]} model="floorStone" tile={5} />
      <Souvenir id="etoile" pos={[-10, 295, -30]} />
      <FinishZone position={[-10, 296, -30]} />

      {/* poussière de lumière autour du joueur */}
      <DriftParticles />
    </group>
  );
}
