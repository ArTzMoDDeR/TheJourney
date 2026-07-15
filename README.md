# THE JOURNEY

**The Journey** est un jeu de plateforme/escalade en vue troisième personne, jouable dans le navigateur. Un voyageur en cape rouge gravit quatre mondes ouverts empilés dans le ciel — les âges d'une vie — de la chambre d'enfance jusqu'au paradis.

Une vie en une journée : la nuit douce de l'enfance, l'aube de l'école, le jour blanc du bureau, l'heure dorée du lâcher-prise.

## Jouer

```bash
npm install
npm run dev      # http://localhost:5173
```

Build de production (déployable tel quel sur Netlify, `netlify.toml` inclus) :

```bash
npm run build && npm run preview
```

## Contrôles

| Action | Touche |
|---|---|
| Se déplacer | **Z Q S D** (ou WASD — détection par position physique des touches) |
| Sauter | **Espace** |
| Se hisser sur un rebord | **Espace maintenu** en l'air près du bord d'un bloc |
| Grimper | avancer contre une **échelle** (Z/S monte/descend, Espace saute de l'échelle) |
| Sprint | **Shift** (maintenu, au sol) |
| Slow motion | **Clic droit** (maintenu — jauge limitée, se recharge au sol et sur les échelles) |
| Caméra | Souris |
| Pause | **Échap** |

On ne grimpe **que** sur les échelles : échelle-jouet, échelle de bibliothèque, gouttières, espaliers de gym, échelles de maintenance, échelles de corde, échelles de lumière… Lever les yeux montre toujours à peu près le chemin (les faisceaux dorés marquent les portes de chapitre).

## Les quatre mondes ouverts

1. **La Chambre** (nuit) — une chambre d'enfant géante : lit-trampoline, tour de Lego, grande bibliothèque, mobile de planètes, coffre à jouets, armoire. Trois grandes routes vers la fenêtre entrouverte, des raccourcis au trampoline, un canard qui fait couic sous le lit.
2. **L'École** (aube) — une cour de récré flottante : matelas de gym-trampoline, préau, panier de basket, corniches étroites de la façade, escalier de secours, espaliers du gymnase, poutre d'équilibre, couloirs de casiers, tour de l'horloge (bloquée à 15h59), passerelle et monte-charge.
3. **Le Bureau** (jour blanc) — un open space suspendu, trois étages : labyrinthe de cubicles, ascenseur, échafaudage, chaise de bureau-trampoline, couloir de serveurs, plante géante qui n'a jamais cessé de pousser, pont de câbles, cabine d'ascenseur brisée, colonne de clim.
4. **Le Paradis** (heure dorée) — un archipel au-dessus de la mer de nuages, gravité réduite : échelles de lumière, nuages-trampolines, nuages qui se dissolvent, colonnade brisée, portes flottantes, ballons — et au sommet, sous l'arbre doré, le nounours de la chambre qui attendait depuis le début.

Autour : ciel qui change avec l'altitude, lune puis soleil, étoiles, ville infinie à l'horizon, montagnes, oiseaux, mer de nuages.

## Speedrun & exploration

- Chrono temps réel, splits par chapitre, meilleur temps en localStorage.
- **Monde entièrement fixe** : apprenable par cœur, plusieurs chemins par chapitre, trampolines et courants d'air comme raccourcis assumés.
- **Checkpoints uniquement aux portes de chapitre.** Tomber, c'est retomber dans le monde d'en dessous — on ne meurt jamais vraiment, on retombe en enfance. (Tomber dans le vide extérieur ramène à la porte du chapitre.)
- **8 souvenirs** cachés à collectionner (✦), comptés en fin de run.

## Stack technique

- React Three Fiber + drei (Three.js), Rapier (`@react-three/rapier`), Zustand, Vite
- **Zéro asset externe** : textures procédurales (canvas 2D — bois, briques, papier d'écolier, post-its, horloges, dessins d'enfant…), personnage et décors modélisés en primitives, musique générative WebAudio par monde + SFX synthétisés
- Post-processing : bloom, vignette, aberration chromatique en slow-motion

## Architecture

```
src/
  constants.js                  # chapitres, physique, vers du poème
  store/ (gameStore, runtime)   # état de jeu / état par frame (hors React)
  utils/ (input, textures, rng) # clavier ZQSD, textures canvas, seed fixe
  audio/AudioSystem.js          # musique générative + SFX
  components/
    player/                     # contrôleur (move/ladder/mantle), caméra
                                # spring-arm, voyageur procédural animé
    systems/                    # stepping physique manuel (slow-mo),
                                # ambiance par altitude, post-processing
    ui/                         # HUD rAF, écrans titre/pause/fin
  level/
    kit.jsx                     # briques de gameplay : B, Ladder, Trampoline,
                                # Elevator, WindColumn, CloudPuff, Gate, Souvenir…
    ladders.js                  # registres échelles + trampolines (géométrie pure)
    Sky.jsx                     # dôme, astres, nuages, ville infinie, oiseaux
    World.jsx                   # assemblage des chapitres
  worlds/                       # les 4 mondes ouverts, entièrement level-designés
```

### Notes d'implémentation

- **Échelles** : registre géométrique pur (pas de colliders) ; le contrôleur teste chaque frame si le joueur pousse contre une face d'échelle. Rétablissement automatique au sommet, saut d'échelle avec Espace.
- **Trampolines** : zones enregistrées, rebond déclenché par le raycast de sol du contrôleur — déterministe, indépendant des événements de collision.
- **Slow motion** : la simulation Rapier est en `<Physics paused>` et avancée manuellement avec `delta × timeScale`.
- **Chrono** : temps réel non clampé (exact même si le rendu ralentit).
- Handle de debug : `window.__journey` (runtime, store, échelles, trampolines).
