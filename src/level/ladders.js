// Registre global des échelles — la SEULE façon de grimper.
// Chaque échelle est un plan vertical : le contrôleur vérifie par simple
// géométrie (pas de physique) si le joueur est devant une échelle.
//
// { cx, cz : centre de la face d'escalade
//   y0, y1 : plage verticale
//   nx, nz : normale de la face (pointe vers le grimpeur)
//   halfW  : demi-largeur }

export const ladders = [];

export function registerLadder(l) {
  ladders.push(l);
  return () => {
    const i = ladders.indexOf(l);
    if (i >= 0) ladders.splice(i, 1);
  };
}

// ------------------------------------------------------------ Bumpers
// Sphères qui repoussent le joueur (champignons, boules de neige,
// boosters…) — détectées par simple distance dans le contrôleur.
// { x, y, z, r, power }
export const bumpers = [];

export function registerBumper(b) {
  bumpers.push(b);
  return () => {
    const i = bumpers.indexOf(b);
    if (i >= 0) bumpers.splice(i, 1);
  };
}

// ------------------------------------------------------------ Trampolines
// Zones de rebond détectées par le contrôleur via son raycast de sol
// (déterministe, indépendant des événements de collision).
// { cx, cz, halfW, halfD, topY, power }
export const bouncers = [];

export function registerBouncer(b) {
  bouncers.push(b);
  return () => {
    const i = bouncers.indexOf(b);
    if (i >= 0) bouncers.splice(i, 1);
  };
}

// Trampoline sous les pieds (fx,fz = position, feetY = altitude des pieds).
export function findBouncer(fx, fz, feetY) {
  for (const b of bouncers) {
    if (Math.abs(fx - b.cx) > b.halfW + 0.3) continue;
    if (Math.abs(fz - b.cz) > b.halfD + 0.3) continue;
    if (Math.abs(feetY - b.topY) > 0.8) continue;
    return b;
  }
  return null;
}

// Échelle la plus proche devant laquelle se trouve (px,py,pz), sinon null.
export function findLadder(px, py, pz) {
  let best = null;
  let bestD = Infinity;
  for (const l of ladders) {
    if (py < l.y0 - 0.4 || py > l.y1 + 1.0) continue;
    const dx = px - l.cx;
    const dz = pz - l.cz;
    const front = dx * l.nx + dz * l.nz; // distance devant la face
    if (front < -0.25 || front > 1.0) continue;
    const lat = -dx * l.nz + dz * l.nx; // coordonnée latérale
    if (Math.abs(lat) > l.halfW + 0.35) continue;
    const d = Math.abs(front - 0.45) + Math.abs(lat) * 0.2;
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best;
}
