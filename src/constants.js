// Constantes globales du jeu — chapitres, physique, gameplay.
// Le monde est entièrement fixe : même carte pour tous les joueurs.

export const BIOMES = [
  { name: 'bedroom', label: 'La Chambre', from: -80, to: 74, gravity: 1 },
  { name: 'jungle', label: 'La Jungle', from: 74, to: 168, gravity: 1 },
  { name: 'ice', label: 'La Glace', from: 168, to: 262, gravity: 1 },
  { name: 'school', label: "L'École", from: 262, to: 338, gravity: 1 },
  { name: 'office', label: 'Le Bureau', from: 338, to: 424, gravity: 1 },
  { name: 'space', label: "L'Espace", from: 424, to: 502, gravity: 0.35 },
  { name: 'paradise', label: 'Le Paradis', from: 502, to: 700, gravity: 0.55 },
];

// Une vie, une ascension : chaque chapitre a son vers.
export const POEMS = {
  bedroom: 'Tout commence dans une chambre, la nuit.',
  jungle: 'On grandit sauvage. Tout est vivant, tout est jeu.',
  ice: 'Parfois le monde se fige. On avance quand même.',
  school: "À l'aube, on apprend les règles.",
  office: 'Puis les jours se ressemblent. On oublie pourquoi on monte.',
  space: 'Si haut que plus rien ne pèse. La Terre est si petite, en bas.',
  paradise: 'Un jour, on lâche prise. Et tout devient léger.',
};

export const FINISH_Y = 556;

export const GRAVITY = -28;

// Déplacement
export const WALK_SPEED = 6.5;
export const SPRINT_SPEED = 11;
export const JUMP_VELOCITY = 11.5;
export const CLIMB_SPEED = 4.2; // sur les échelles

// Slow motion (clic droit) — sans jauge, un outil de précision libre
export const SLOWMO_SCALE = 0.3;

export const START_POS = [-20, 1.5, 30];

export function biomeAt(y) {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (y >= BIOMES[i].from) return BIOMES[i];
  }
  return BIOMES[0];
}
