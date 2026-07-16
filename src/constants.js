// Constantes globales — une ascension continue façon « Only Up »,
// habillée de vrais kits 3D (village → ville → falaises → ciel).
// Une seule carte fixe, montée fluide, plusieurs chemins.

export const BANDS = [
  { name: 'village', label: 'Le Village', from: -20, to: 55 },
  { name: 'city', label: 'La Ville', from: 55, to: 130 },
  { name: 'cliffs', label: 'Les Falaises', from: 130, to: 205 },
  { name: 'sky', label: 'Le Ciel', from: 205, to: 320 },
];

export const POEMS = {
  village: 'Tout commence en bas, les pieds dans la poussière.',
  city: 'On monte vers les lumières, toujours plus haut.',
  cliffs: 'Là où la pierre remplace les murs, on apprend le vertige.',
  sky: 'Et puis un jour, il ne reste que le ciel.',
};

export const FINISH_Y = 300;
export const GRAVITY = -30;

// Déplacement
export const WALK_SPEED = 7;
export const SPRINT_SPEED = 12;
export const JUMP_VELOCITY = 12.5;
export const CLIMB_SPEED = 4.4;

// Slow motion (clic droit) — libre, sans jauge
export const SLOWMO_SCALE = 0.32;

export const START_POS = [0, 1.6, 0];

export function bandAt(y) {
  for (let i = BANDS.length - 1; i >= 0; i--) {
    if (y >= BANDS[i].from) return BANDS[i];
  }
  return BANDS[0];
}
