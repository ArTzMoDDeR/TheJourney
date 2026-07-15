// Constantes globales du jeu — hauteurs des biomes, physique, gameplay.
// La carte est à seed fixe : ces valeurs définissent LA carte, identique pour tous.

export const BIOMES = [
  { name: 'bedroom', label: 'La Chambre', from: 0, to: 90 },
  { name: 'school', label: "L'École", from: 90, to: 185 },
  { name: 'office', label: 'Le Bureau', from: 185, to: 285 },
  { name: 'paradise', label: 'Le Paradis', from: 285, to: 400 },
];

export const FINISH_Y = 372; // altitude du plateau final
export const LOW_GRAVITY_Y = 330; // au-dessus : gravité réduite (lâcher-prise)

export const GRAVITY = -28;

// Déplacement
export const WALK_SPEED = 6;
export const SPRINT_SPEED = 10.5;
export const JUMP_VELOCITY = 11.5;
export const CLIMB_SPEED = 3.2;

// Slow motion
export const SLOWMO_SCALE = 0.3;
export const SLOWMO_DRAIN = 0.33; // par seconde réelle
export const SLOWMO_REGEN = 0.22; // par seconde, au sol ou accroché

// Stamina
export const STAMINA_DRAIN_HANG = 0.09; // accroché immobile
export const STAMINA_DRAIN_CLIMB = 0.045; // en grimpe active
export const STAMINA_REGEN = 0.55; // au sol

export const START_POS = [0, 1.6, 15];

export function biomeAt(y) {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (y >= BIOMES[i].from) return BIOMES[i];
  }
  return BIOMES[0];
}
