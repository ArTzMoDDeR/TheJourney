import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { input, consumeMouse } from '../../utils/input';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';

// Caméra troisième personne à bras-ressort :
// - orbite souris (pointer lock)
// - collision caméra/décor par raycast (pas de clipping)
// - FOV dynamique (sprint, chute rapide, slow-mo)
// - recentrage doux derrière le joueur après inactivité souris
// - orbite cinématique sur l'écran-titre

const _target = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _dir = new THREE.Vector3();

const BASE_DIST = 6.2;
const MIN_DIST = 3.2; // jamais plus près : on reste en 3e personne
const BASE_FOV = 62;

function dampAngle(a, b, lambda, dt) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
}

export function CameraRig() {
  const { world, rapier } = useRapier();
  const s = useRef({
    yaw: 0,
    pitch: 0.32,
    dist: BASE_DIST,
    fov: BASE_FOV,
    smoothTarget: new THREE.Vector3(0, 2, 15),
    initialized: false,
  }).current;

  const ray = useRef(null);
  if (!ray.current) ray.current = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  const FLAGS = rapier.QueryFilterFlags.EXCLUDE_SENSORS;

  useFrame(({ camera }, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const phase = useGame.getState().phase;
    const body = runtime.playerBody;

    // Position fraîche du joueur (post-step physique)
    if (body) {
      const t = body.translation();
      _target.set(t.x, t.y + 1.5, t.z);
    } else {
      _target.copy(runtime.playerPos).y += 1.5;
    }

    if (phase === 'title') {
      // Orbite cinématique lente autour du point de départ
      const a = performance.now() * 0.00012;
      camera.position.set(
        _target.x + Math.sin(a) * 9,
        _target.y + 3.5 + Math.sin(a * 0.7) * 1.5,
        _target.z + Math.cos(a) * 9
      );
      camera.lookAt(_target.x, _target.y + 1, _target.z);
      if (camera.fov !== 55) {
        camera.fov = 55;
        camera.updateProjectionMatrix();
      }
      s.initialized = false;
      return;
    }

    // Entrée en jeu : caméra placée derrière le joueur
    if (!s.initialized) {
      s.initialized = true;
      s.yaw = runtime.faceYaw + Math.PI;
      s.smoothTarget.copy(_target);
    }

    const [dx, dy] = consumeMouse();
    if (phase === 'playing') {
      s.yaw -= dx * 0.0026;
      s.pitch = THREE.MathUtils.clamp(s.pitch + dy * 0.0022, -0.6, 1.25);

      // Recentrage doux derrière le joueur si la souris est inactive
      const idle = (performance.now() - input.mouseMovedAt) / 1000;
      if (idle > 2.5 && runtime.speed > 3 && runtime.mode === 'move') {
        s.yaw = dampAngle(s.yaw, runtime.faceYaw + Math.PI, 0.9, dt);
      }
    }
    // la caméra est à l'angle s.yaw autour du joueur et regarde vers lui :
    // l'avant "écran" partage donc le même yaw
    runtime.camYaw = s.yaw;

    // Lissage du point visé (amortit les micro-saccades physiques)
    s.smoothTarget.x = THREE.MathUtils.damp(s.smoothTarget.x, _target.x, 25, dt);
    s.smoothTarget.y = THREE.MathUtils.damp(s.smoothTarget.y, _target.y, 18, dt);
    s.smoothTarget.z = THREE.MathUtils.damp(s.smoothTarget.z, _target.z, 25, dt);

    const cosP = Math.cos(s.pitch);
    _offset.set(Math.sin(s.yaw) * cosP, Math.sin(s.pitch), Math.cos(s.yaw) * cosP);

    // Collision caméra : raycast du joueur vers la position désirée
    let dist = BASE_DIST;
    const r = ray.current;
    r.origin.x = s.smoothTarget.x;
    r.origin.y = s.smoothTarget.y;
    r.origin.z = s.smoothTarget.z;
    r.dir.x = _offset.x;
    r.dir.y = _offset.y;
    r.dir.z = _offset.z;
    const hit = world.castRay(r, BASE_DIST + 0.3, true, FLAGS, undefined, undefined, body || undefined);
    if (hit) {
      const toi = hit.timeOfImpact ?? hit.toi;
      // on n'approche la caméra que pour un VRAI obstacle entre elle et le
      // joueur ; on ignore les impacts trop proches (rayon parti dans un
      // collider) et on ne descend jamais sous MIN_DIST → toujours 3e personne
      if (toi > MIN_DIST) dist = Math.max(MIN_DIST, toi - 0.3);
    }
    s.dist = THREE.MathUtils.damp(s.dist, dist, dist < s.dist ? 24 : 6, dt);

    _desired.copy(s.smoothTarget).addScaledVector(_offset, s.dist);
    camera.position.copy(_desired);
    _dir.copy(s.smoothTarget);
    _dir.y += 0.2;
    camera.lookAt(_dir);

    // FOV dynamique : sprint, chute rapide, slow-motion
    const fallBoost = Math.max(0, -runtime.playerVel.y - 10) * 0.55;
    const sprintBoost = Math.max(0, runtime.speed - 6.5) * 1.6;
    const slowPinch = runtime.slowmoActive ? -6 : 0;
    const targetFov = THREE.MathUtils.clamp(
      BASE_FOV + fallBoost + sprintBoost + slowPinch,
      52,
      80
    );
    s.fov = THREE.MathUtils.damp(s.fov, targetFov, 4, dt);
    if (Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }
  }, 0); // priorité 0 : après le step physique et la synchro des meshes

  return null;
}
