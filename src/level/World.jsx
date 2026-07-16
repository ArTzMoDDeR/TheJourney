import { Sky } from './Sky';
import { DriftParticles, WorldShift } from './kit';
import { BedroomWorld } from '../worlds/Bedroom';
import { JungleWorld } from '../worlds/Jungle';
import { IceWorld } from '../worlds/Ice';
import { SchoolWorld } from '../worlds/School';
import { OfficeWorld } from '../worlds/Office';
import { SpaceWorld } from '../worlds/Space';
import { ParadiseWorld } from '../worlds/Paradise';

// LE MONDE — sept chapitres ouverts, empilés jusqu'aux étoiles :
// la chambre (nuit) → la jungle (matin sauvage) → la glace (jour pâle)
// → l'école (aube) → le bureau (jour blanc) → l'espace (nuit noire)
// → le paradis (heure dorée). ~560 mètres d'ascension.
export function World() {
  return (
    <group>
      <Sky />
      <BedroomWorld />
      <JungleWorld />
      <IceWorld />
      {/* l'école et le bureau sont écrits en coordonnées basses,
          hissés ici à leur vraie altitude */}
      <WorldShift y={193}>
        <SchoolWorld />
      </WorldShift>
      <WorldShift y={194}>
        <OfficeWorld />
      </WorldShift>
      <SpaceWorld />
      <WorldShift y={274}>
        <ParadiseWorld />
      </WorldShift>
      <DriftParticles />
    </group>
  );
}
