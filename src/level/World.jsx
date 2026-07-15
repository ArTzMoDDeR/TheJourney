import { Sky } from './Sky';
import { DriftParticles } from './kit';
import { BedroomWorld } from '../worlds/Bedroom';
import { SchoolWorld } from '../worlds/School';
import { OfficeWorld } from '../worlds/Office';
import { ParadiseWorld } from '../worlds/Paradise';

// LE MONDE — quatre chapitres ouverts, empilés dans le ciel.
// Tomber d'un chapitre, c'est retomber dans le précédent :
// on ne meurt jamais vraiment, on retombe en enfance.
export function World() {
  return (
    <group>
      <Sky />
      <BedroomWorld />
      <SchoolWorld />
      <OfficeWorld />
      <ParadiseWorld />
      <DriftParticles />
    </group>
  );
}
