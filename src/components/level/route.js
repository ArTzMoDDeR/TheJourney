import { mulberry32 } from '../../utils/rng';
import { biomeAt } from '../../constants';

// Génération DÉTERMINISTE de la route d'escalade (seed fixe) :
// même carte pour tous les joueurs, apprenable par cœur (exigence speedrun).
//
// La route est une spirale ascendante autour de l'axe de la tour, alternant :
//  - chaînes de plateformes à sauter
//  - piliers thématiques à escalader (le cœur du gameplay grab/climb)
//  - plateformes mobiles (chambre : tiroirs / bureau : monte-charge)
//  - colonnes de vent et nuages dissolvants (paradis)
//
// Chaque élément expose { kind, pos, size, yaw, top, ... } ; les biomes
// se chargent uniquement de l'habillage visuel.

export const ROUTE_SEED = 20260715;

const PARAMS = {
  bedroom: { radius: 11, platW: [2.6, 4.2], pillarW: [2.4, 3.2], moverChance: 0.14 },
  school: { radius: 10, platW: [2.2, 3.4], pillarW: [2.4, 3.4], moverChance: 0.05 },
  office: { radius: 10.5, platW: [2.2, 3.2], pillarW: [2.2, 3.0], moverChance: 0.14 },
  paradise: { radius: 12, platW: [2.6, 4.0], pillarW: [2.2, 2.8], moverChance: 0 },
};

export function buildRoute() {
  const rng = mulberry32(ROUTE_SEED);
  const els = [];
  let y = 1.6; // première plateforme accessible depuis le sol de la chambre
  let theta = Math.PI / 2; // démarre près du point de spawn (z positif)
  const endY = 358;
  let i = 0;

  const push = (el) => {
    el.i = i++;
    el.top = el.pos[1] + el.size[1] / 2;
    els.push(el);
  };

  // plateforme de départ
  push({
    kind: 'platform',
    pos: [Math.cos(theta) * 11, y, Math.sin(theta) * 11],
    size: [4, 0.6, 4],
    yaw: -theta,
  });

  while (y < endY) {
    const p = PARAMS[biomeAt(y).name];
    const r = p.radius;
    const roll = rng();

    if (roll < 0.48) {
      // --- chaîne de sauts : 2 à 3 plateformes ---
      const n = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < n && y < endY; k++) {
        const gap = 2.9 + rng() * 0.9;
        theta += gap / r;
        y += 1.1 + rng() * 0.7;
        const rr = r + (rng() - 0.5) * 2.5;
        const w = p.platW[0] + rng() * (p.platW[1] - p.platW[0]);
        const el = {
          kind: 'platform',
          pos: [Math.cos(theta) * rr, y, Math.sin(theta) * rr],
          size: [w, 0.5 + rng() * 0.4, w * (0.8 + rng() * 0.4)],
          yaw: -theta + (rng() - 0.5) * 0.3,
        };
        // au paradis, une partie des plateformes se dissout après passage
        if (biomeAt(y).name === 'paradise' && rng() < 0.38 && k > 0) {
          el.dissolve = true;
        }
        push(el);
      }
    } else if (roll < 0.48 + p.moverChance) {
      // --- plateforme mobile (tiroir / monte-charge) ---
      theta += 3.1 / r;
      y += 1.3;
      const vertical = biomeAt(y).name === 'office';
      push({
        kind: 'mover',
        pos: [Math.cos(theta) * r, y, Math.sin(theta) * r],
        size: [3, 0.6, 2.4],
        yaw: -theta,
        axis: vertical
          ? [0, 1, 0]
          : [Math.cos(theta + Math.PI / 2), 0, Math.sin(theta + Math.PI / 2)],
        amp: vertical ? 2.4 : 2.0,
        period: 4.5 + rng() * 2,
        phase: rng() * Math.PI * 2,
      });
      if (vertical) y += 1.8; // le monte-charge dépose plus haut
    } else if (biomeAt(y).name === 'paradise' && rng() < 0.45) {
      // --- colonne de vent ascendant ---
      const h = 9 + rng() * 5;
      theta += 2.6 / r;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      push({
        kind: 'wind',
        pos: [x, y + h / 2, z],
        size: [3.2, h + 4, 3.2],
        yaw: -theta,
      });
      y += h;
      // plateforme de réception en haut du courant
      theta += 2.4 / r;
      push({
        kind: 'platform',
        pos: [Math.cos(theta) * r, y + 1, Math.sin(theta) * r],
        size: [3.4, 0.6, 3.0],
        yaw: -theta,
      });
      y += 1;
    } else {
      // --- pilier à escalader (grab + climb + mantle) ---
      const h = 6 + rng() * 5.5;
      theta += 2.1 / r;
      const w = p.pillarW[0] + rng() * (p.pillarW[1] - p.pillarW[0]);
      const yBase = y - 2.5;
      const yTop = y + h;
      push({
        kind: 'pillar',
        pos: [Math.cos(theta) * r, (yBase + yTop) / 2, Math.sin(theta) * r],
        size: [w, yTop - yBase, w],
        yaw: -theta,
      });
      y = yTop;
    }
  }

  // --- accès final : grand pilier de lumière vers le plateau ---
  theta += 2.2 / 12;
  const finalBase = y - 3;
  const finalTop = 372;
  push({
    kind: 'pillar',
    pos: [Math.cos(theta) * 10.5, (finalBase + finalTop) / 2, Math.sin(theta) * 10.5],
    size: [3, finalTop - finalBase, 3],
    yaw: -theta,
    final: true,
  });

  return { els, endTheta: theta, endY: finalTop };
}

// Sélectionne les éléments qui portent un checkpoint (~ toutes les 25-30 m),
// en évitant les plateformes mobiles ou dissolvantes.
export function pickCheckpoints(els) {
  const targets = [22, 48, 72, 95, 122, 150, 178, 210, 240, 268, 296, 325, 350];
  const cps = [];
  for (const ty of targets) {
    let best = null;
    let bestD = Infinity;
    for (const el of els) {
      if (el.kind !== 'platform' && el.kind !== 'pillar') continue;
      if (el.dissolve || el.final) continue;
      const d = Math.abs(el.top - ty);
      if (d < bestD) {
        bestD = d;
        best = el;
      }
    }
    if (best && !cps.includes(best)) cps.push(best);
  }
  return cps.map((el) => ({
    pos: [el.pos[0], el.top + 1.4, el.pos[2]],
    killY: el.top - 22,
  }));
}
