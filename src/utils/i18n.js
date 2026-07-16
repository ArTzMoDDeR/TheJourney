// Internationalisation minimale (FR / EN). La langue est dans le store ;
// t(key) lit la langue courante.
import { useGame } from '../store/gameStore';

export const STRINGS = {
  fr: {
    subtitle: 'Une vie, une ascension',
    play: 'Commencer',
    language: 'Langue',
    controls: 'Contrôles',
    move: 'Se déplacer',
    jump: 'Sauter',
    grab: 'Se hisser sur un rebord (maintenu)',
    ladder: 'Grimper : avancer contre une échelle',
    sprint: 'Sprint',
    slow: 'Ralenti',
    pauseCam: 'Caméra',
    pause: 'Pause',
    paused: 'Pause',
    resume: 'Reprendre',
    restart: 'Recommencer',
    volume: 'Volume',
    replay: 'Rejouer',
    newBest: 'Nouveau meilleur temps',
    best: 'Meilleur temps',
    souvenirsFound: 'souvenirs retrouvés',
    loading: 'Chargement du monde…',
    tip: 'Lève les yeux : le chemin monte toujours.',
  },
  en: {
    subtitle: 'One life, one climb',
    play: 'Start',
    language: 'Language',
    controls: 'Controls',
    move: 'Move',
    jump: 'Jump',
    grab: 'Grab a ledge to climb up (hold)',
    ladder: 'Climb: walk into a ladder',
    sprint: 'Sprint',
    slow: 'Slow motion',
    pauseCam: 'Camera',
    pause: 'Pause',
    paused: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    volume: 'Volume',
    replay: 'Play again',
    newBest: 'New best time',
    best: 'Best time',
    souvenirsFound: 'keepsakes found',
    loading: 'Loading the world…',
    tip: 'Look up: the path always rises.',
  },
};

export function t(key) {
  const lang = useGame.getState().language;
  return (STRINGS[lang] || STRINGS.fr)[key] || key;
}
