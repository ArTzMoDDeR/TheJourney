// Constantes globales du jeu — hauteurs des chapitres, physique, gameplay.
// La carte est entièrement fixe : même monde pour tous les joueurs.

export const BIOMES = [
  { name: 'bedroom', label: 'La Chambre', from: -60, to: 70 },
  { name: 'school', label: "L'École", from: 70, to: 150 },
  { name: 'office', label: 'Le Bureau', from: 150, to: 230 },
  { name: 'paradise', label: 'Le Paradis', from: 230, to: 400 },
];

// Une vie en une journée : nuit douce de l'enfance, aube de l'école,
// jour blanc du bureau, heure dorée du paradis.
export const POEMS = {
  bedroom: 'Tout commence dans une chambre, la nuit.',
  school: "À l'aube, on apprend les règles.",
  office: 'Puis les jours se ressemblent. On oublie pourquoi on monte.',
  paradise: "Un jour, on lâche prise. Et tout devient léger.",
};

export const FINISH_Y = 302; // plateau final
export const LOW_GRAVITY_Y = 238; // au-dessus : gravité réduite (lâcher-prise)

export const GRAVITY = -28;

// Déplacement
export const WALK_SPEED = 6.5;
export const SPRINT_SPEED = 11;
export const JUMP_VELOCITY = 11.5;
export const CLIMB_SPEED = 4.2; // sur les échelles

// Slow motion
export const SLOWMO_SCALE = 0.3;
export const SLOWMO_DRAIN = 0.33; // par seconde réelle
export const SLOWMO_REGEN = 0.25; // par seconde, au sol ou sur une échelle

export const START_POS = [-20, 1.5, 30];

export function biomeAt(y) {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (y >= BIOMES[i].from) return BIOMES[i];
  }
  return BIOMES[0];
}
