# THE JOURNEY

**The Journey** est un jeu de plateforme/escalade en vue troisième personne, jouable dans le navigateur. Vous incarnez une silhouette qui gravit une tour verticale représentant les âges de la vie — de la chambre d'enfance jusqu'au paradis — en s'accrochant à de vrais objets du quotidien devenus montagnes.

Une vie racontée sans un mot : plus on monte, plus on vieillit.

## Jouer

```bash
npm install
npm run dev      # http://localhost:5173
```

Build de production (déployable tel quel sur Netlify, `netlify.toml` inclus) :

```bash
npm run build
npm run preview
```

## Contrôles

| Action | Touche |
|---|---|
| Se déplacer | **Z Q S D** (ou WASD — détection par position physique des touches) |
| Sauter | **Espace** (appui court) |
| S'accrocher / grimper | **Espace maintenu** près d'une surface grimpable |
| Saut depuis le mur | relâcher **Espace** en tenant une direction |
| Lâcher prise | relâcher **Espace** sans direction |
| Sprint | **Shift** (maintenu, au sol) |
| Slow motion | **Clic droit** (maintenu — jauge limitée, se recharge au sol et accroché) |
| Caméra | Souris |
| Pause | **Échap** |

En grimpe : **Z/S** montent/descendent, **Q/D** se déplacent latéralement le long de la surface. En haut d'un rebord, le rétablissement (mantle) est automatique.

## Les quatre biomes

1. **La Chambre** (0–90 m) — cocon chaud, échelle géante : Lego, piles de livres, commodes, tiroirs mobiles.
2. **L'École** (90–185 m) — néons froids, casiers, grilles de cour, silhouettes d'ombre.
3. **Le Bureau** (185–285 m) — grisaille répétitive, classeurs, écrans, serveurs, monte-charges.
4. **Le Paradis** (285–372 m) — lumière et silence : nuages solides, colonnes de lumière, courants ascendants, plateformes qui se dissolvent, gravité réduite dans les derniers mètres.

## Speedrun

- Chrono en temps réel, démarré au premier input, arrêté au plateau final.
- **Carte à seed fixe** : identique pour tous, apprenable par cœur.
- Splits par biome affichés en fin de run.
- Meilleur temps sauvegardé en local (`localStorage`).
- Chute = retour au dernier checkpoint, sans écran punitif.
- L'endurance (jauge) se vide accroché au mur : on progresse, on ne campe pas.

## Stack technique

- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) + [drei](https://github.com/pmndrs/drei) (Three.js)
- [Rapier](https://rapier.rs/) via `@react-three/rapier` — physique déterministe, character controller custom
- Zustand (état de jeu), Vite (build), `@react-three/postprocessing` (bloom, vignette, aberration chromatique)
- Audio 100 % génératif WebAudio : musique adaptative par biome, SFX synthétisés, aucun asset

## Architecture

```
src/
  constants.js                  # hauteurs des biomes, physique, gameplay
  store/
    gameStore.js                # Zustand : phase, checkpoint, splits, best
    runtime.js                  # état mutable par frame (hors React)
  utils/input.js                # clavier (e.code → ZQSD/WASD), souris
  audio/AudioSystem.js          # musique générative + SFX
  components/
    player/
      CharacterController.jsx   # LE cœur : move/hang/climb/mantle/wall-jump,
                                # slow-mo, stamina, respawn, splits
      CameraRig.jsx             # spring-arm, collision caméra, FOV dynamique
      PlayerModel.jsx           # silhouette low-poly animée procéduralement
    systems/
      Stepper.jsx               # stepping physique manuel × timeScale (slow-mo)
      EnvironmentManager.jsx    # fog/lumières interpolés selon l'altitude
      Effects.jsx               # post-processing
    level/
      route.js                  # génération déterministe de la route (seed fixe)
      Tower.jsx                 # assemblage des 4 biomes + checkpoints + arrivée
      pieces.jsx                # Solid, Mover, WindColumn, DissolvingCloud…
      materials.js              # matériaux partagés
    biomes/                     # habillage : Bedroom, School, Office, Paradise
    ui/                         # HUD (rAF direct DOM), écrans titre/pause/fin
```

### Notes d'implémentation

- **Escalade** : raycasts en éventail depuis le buste (priorité à la direction d'input), surfaces taguées `grabbable` via `userData` des corps Rapier, angle de surface contrôlé (60–105°). Colliders boîtes propres, séparés des meshes visuels.
- **Slow motion** : la simulation Rapier est en `<Physics paused>` et avancée manuellement chaque frame avec `delta × timeScale` — pause et ralenti propres, sans toucher aux vitesses.
- **Chrono** : temps réel non clampé (reste exact même si le rendu ralentit).
- Un handle de debug est exposé : `window.__journey` (runtime, store, route).
