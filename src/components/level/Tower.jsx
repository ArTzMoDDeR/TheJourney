import { useMemo } from 'react';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { buildRoute, pickCheckpoints } from './route';
import { biomeAt } from '../../constants';
import { M } from './materials';
import { Checkpoint, FinishZone, DriftParticles } from './pieces';
import { BedroomPiece, BedroomDecor } from '../biomes/Bedroom';
import { SchoolPiece, SchoolDecor } from '../biomes/School';
import { OfficePiece, OfficeDecor } from '../biomes/Office';
import { ParadisePiece, ParadiseDecor } from '../biomes/Paradise';

// LA TOUR : une seule structure verticale continue, quatre biomes superposés.
// La route (seed fixe) est générée une fois ; chaque élément est habillé
// par le biome correspondant à son altitude.

const PIECE = {
  bedroom: BedroomPiece,
  school: SchoolPiece,
  office: OfficePiece,
  paradise: ParadisePiece,
};

export function Tower() {
  const { els } = useMemo(() => buildRoute(), []);
  const checkpoints = useMemo(() => pickCheckpoints(els), [els]);

  return (
    <group>
      {/* éléments de la route, habillés par biome */}
      {els.map((el) => {
        const Piece = PIECE[biomeAt(el.pos[1]).name];
        return <Piece key={el.i} el={el} />;
      })}

      {/* colonne centrale de la tour (non grimpable : pas de raccourci gratuit) */}
      {[
        { y: [0, 90], mat: M.woodDark },
        { y: [90, 185], mat: M.lockerDark },
        { y: [185, 285], mat: M.officeDark },
      ].map((seg, k) => {
        const h = seg.y[1] - seg.y[0];
        const cy = (seg.y[0] + seg.y[1]) / 2;
        return (
          <RigidBody key={k} type="fixed" colliders={false}>
            <CuboidCollider args={[2.6, h / 2, 2.6]} position={[0, cy, 0]} />
            <mesh position={[0, cy, 0]} material={seg.mat}>
              <boxGeometry args={[5.2, h, 5.2]} />
            </mesh>
          </RigidBody>
        );
      })}

      {/* checkpoints */}
      {checkpoints.map((cp, k) => (
        <Checkpoint key={k} cp={cp} />
      ))}

      {/* plateau final : arrivée ouverte, épurée */}
      <RigidBody type="fixed" colliders={false} userData={{ grabbable: true }}>
        <CylinderCollider args={[0.75, 7.5]} position={[0, 370.75, 0]} friction={1} />
        <mesh receiveShadow position={[0, 370.75, 0]} material={M.marble}>
          <cylinderGeometry args={[7.5, 8.5, 1.5, 32]} />
        </mesh>
        <mesh position={[0, 371.55, 0]} material={M.gold}>
          <cylinderGeometry args={[2.2, 2.2, 0.08, 32]} />
        </mesh>
      </RigidBody>
      {/* arche dorée */}
      <group position={[0, 371.5, -4.5]}>
        {[-2.2, 2.2].map((x, k) => (
          <mesh key={k} castShadow position={[x, 2.5, 0]} material={M.gold}>
            <cylinderGeometry args={[0.28, 0.34, 5, 10]} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 5.2, 0]} material={M.gold}>
          <boxGeometry args={[5.6, 0.5, 0.7]} />
        </mesh>
      </group>
      <FinishZone position={[0, 373.5, 0]} />

      {/* décors de biome */}
      <BedroomDecor />
      <SchoolDecor />
      <OfficeDecor />
      <ParadiseDecor />

      {/* poussière/lumière flottante autour du joueur */}
      <DriftParticles />
    </group>
  );
}
