import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import { input } from '../../utils/input';
import { runtime } from '../../store/runtime';
import { useGame } from '../../store/gameStore';
import { audio } from '../../audio/AudioSystem';
import { findLadder, findBouncer, bumpers } from '../../level/ladders';
import {
  WALK_SPEED,
  SPRINT_SPEED,
  JUMP_VELOCITY,
  CLIMB_SPEED,
  SLOWMO_SCALE,
  START_POS,
  bandAt,
} from '../../constants';
import { Character } from './Character';

// CONTRÔLEUR DU VOYAGEUR
// - déplacement ZQSD relatif caméra, sprint, saut (coyote + buffer)
// - escalade UNIQUEMENT sur les échelles (registre géométrique, pas de grab mural)
// - rétablissement automatique en haut d'échelle
// - slow-motion (clic droit) par jauge
// - vent ascendant, trampolines (gérés par les objets), gravité réduite au paradis
// - respawn au checkpoint de chapitre en cas de chute dans le vide

const _pos = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dir = new THREE.Vector3();

function dampAngle(a, b, lambda, dt) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
}

export function CharacterController() {
  const body = useRef(null);
  const { world, rapier } = useRapier();
  const resetToken = useGame((st) => st.resetToken);

  const s = useRef({
    mode: 'move', // move | ladder | mantle
    ladder: null,
    ladderSide: 1, // côté d'approche de l'échelle (+1/-1)
    prevClimbY: 0, // y de la frame précédente (détection de blocage en haut)
    coyote: 0,
    jumpBuf: 0,
    bumpCd: 0, // anti-spam des bumpers
    ladderCooldown: 0, // délai avant ré-accroche après un saut d'échelle
    mantleT: 0,
    mantleDur: 1.3, // durée de la hissée automatique
    mantleStart: new THREE.Vector3(),
    mantleEnd: new THREE.Vector3(),
    mantleDir: new THREE.Vector3(),
    faceYaw: Math.PI,
    stepAcc: 0,
    respawnT: -1,
    wasGrounded: true,
    prevVy: 0,
    landedOnce: false,
  }).current;

  const ray = useRef(null);
  if (!ray.current) ray.current = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  const FLAGS = rapier.QueryFilterFlags.EXCLUDE_SENSORS;

  const cast = (ox, oy, oz, dx, dy, dz, maxToi) => {
    const r = ray.current;
    r.origin.x = ox;
    r.origin.y = oy;
    r.origin.z = oz;
    r.dir.x = dx;
    r.dir.y = dy;
    r.dir.z = dz;
    return world.castRayAndGetNormal(r, maxToi, true, FLAGS, undefined, undefined, body.current);
  };

  const groundCast = (origin) => cast(origin.x, origin.y, origin.z, 0, -1, 0, 1.12);
  const toi = (hit) => (hit ? (hit.timeOfImpact ?? hit.toi) : Infinity);

  const teleport = (p) => {
    if (!body.current) return;
    body.current.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
    body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.current.setGravityScale(1, true);
    s.mode = 'move';
    s.ladder = null;
    s.respawnT = -1;
    runtime.mode = 'move';
  };

  useEffect(() => {
    runtime.playerBody = body.current;
  }, []);

  useEffect(() => {
    if (resetToken > 0) teleport(START_POS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  useFrame((_, rawDelta) => {
    if (!body.current) return;
    const game = useGame.getState();
    if (game.phase !== 'playing') {
      input.jumpPressed = false;
      input.jumpReleased = false;
      return;
    }

    const dt = Math.min(rawDelta, 1 / 30);

    // --- Slow motion (libre, sans jauge : un outil de précision) ---
    const wantSlow = input.slow;
    runtime.targetTimeScale = wantSlow ? SLOWMO_SCALE : 1;
    runtime.timeScale += (runtime.targetTimeScale - runtime.timeScale) * Math.min(1, dt * 10);
    runtime.slowmoActive = wantSlow;
    audio.setSlow(wantSlow);

    const sdt = dt * runtime.timeScale;

    // --- Chrono (temps réel, non clampé) ---
    if (!runtime.timerRunning && input.anyMove) runtime.timerRunning = true;
    if (runtime.timerRunning) runtime.timer += rawDelta;

    // --- État physique ---
    const t = body.current.translation();
    _pos.set(t.x, t.y, t.z);
    const lv = body.current.linvel();
    _vel.set(lv.x, lv.y, lv.z);

    // --- Respawn (chute dans le vide, sous le monde) ---
    const cp = game.checkpoint;
    if (s.respawnT < 0 && _pos.y < cp.killY) {
      s.respawnT = 0;
      runtime.fadeTarget = 1;
      audio.sfx('respawn');
    }
    if (s.respawnT >= 0) {
      s.respawnT += dt;
      if (s.respawnT > 0.45) {
        teleport(cp.pos);
        runtime.fadeTarget = 0;
      }
      input.jumpPressed = false;
      input.jumpReleased = false;
      return;
    }

    // --- Sol ---
    const groundHit = groundCast(_pos);
    const rawGrounded = !!groundHit && groundHit.normal.y > 0.45;
    const grounded = s.mode === 'move' && rawGrounded && _vel.y < 4;

    if (grounded && !s.wasGrounded && s.landedOnce) {
      runtime.landedAt = runtime.simTime;
      if (s.prevVy < -9) audio.sfx('land');
    }
    s.landedOnce = true;
    s.wasGrounded = grounded;
    s.prevVy = _vel.y;

    // --- Direction voulue (relative caméra) ---
    const yaw = runtime.camYaw;
    _fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const fAmt = (input.f ? 1 : 0) - (input.b ? 1 : 0);
    const rAmt = (input.r ? 1 : 0) - (input.l ? 1 : 0);
    _wish.copy(_fwd).multiplyScalar(fAmt).addScaledVector(_right, rAmt);
    if (_wish.lengthSq() > 1) _wish.normalize();

    // --- Fronts d'input ---
    const jumpPressed = input.jumpPressed;
    input.jumpPressed = false;
    input.jumpReleased = false;
    if (jumpPressed) s.jumpBuf = 0.12;
    else s.jumpBuf = Math.max(0, s.jumpBuf - sdt);
    s.ladderCooldown = Math.max(0, s.ladderCooldown - sdt);
    s.bumpCd = Math.max(0, s.bumpCd - sdt);
    s.coyote = grounded ? 0.12 : Math.max(0, s.coyote - sdt);

    // ======================= MACHINE À ÉTATS =======================

    if (s.mode === 'ladder') {
      const l = s.ladder;
      const stillOn =
        l &&
        _pos.y > l.y0 - 0.5 &&
        _pos.y < l.y1 + 1.0 &&
        Math.abs(-(_pos.x - l.cx) * l.nz + (_pos.z - l.cz) * l.nx) < l.halfW + 0.5;

      if (jumpPressed) {
        // saut depuis l'échelle : vers l'arrière + direction voulue
        _vel.set(l.nx * 4.5, 8.5, l.nz * 4.5).addScaledVector(_wish, 3.5);
        body.current.setGravityScale(1, true);
        body.current.setLinvel(_vel, true);
        s.mode = 'move';
        s.ladder = null;
        s.ladderCooldown = 0.3;
        runtime.climbDir = 0;
        audio.sfx('walljump');
      } else if (!stillOn) {
        body.current.setGravityScale(1, true);
        s.mode = 'move';
        s.ladder = null;
        runtime.climbDir = 0;
      } else if (
        fAmt > 0 &&
        (_pos.y >= l.y1 - 0.25 ||
          // ou bloqué par une plateforme qui surplombe le haut de l'échelle
          (_pos.y >= l.y1 - 2.2 && _pos.y - s.prevClimbY < CLIMB_SPEED * sdt * 0.3))
      ) {
        // sommet : cherche une surface d'arrivée des DEUX côtés de l'échelle,
        // choisit la meilleure, et s'y hisse par une montée douce scriptée
        let bestY = -Infinity;
        let bestSign = -s.ladderSide; // par défaut, côté opposé à l'approche
        for (const sgn of [1, -1]) {
          const ox = l.cx + l.nx * 1.0 * sgn;
          const oz = l.cz + l.nz * 1.0 * sgn;
          const hit = cast(ox, l.y1 + 3, oz, 0, -1, 0, 6);
          if (hit && hit.normal.y > 0.5) {
            const yTop = l.y1 + 3 - toi(hit);
            // on préfère une surface proche du haut de l'échelle
            if (yTop > l.y0 && yTop < l.y1 + 2 && yTop > bestY) {
              bestY = yTop;
              bestSign = sgn;
            }
          }
        }
        const topY = bestY > -Infinity ? bestY : l.y1;
        const ex = l.cx + l.nx * 1.0 * bestSign;
        const ez = l.cz + l.nz * 1.0 * bestSign;
        s.mode = 'mantle';
        s.mantleT = 0;
        s.mantleDur = 1.1;
        s.mantleStart.copy(_pos);
        s.mantleEnd.set(ex, topY + 0.95, ez);
        s.mantleDir.set(l.nx * bestSign, 0, l.nz * bestSign);
        s.ladder = null;
        runtime.climbDir = 0;
        runtime.mode = 'mantle';
        audio.sfx('mantle');
      } else if (fAmt < 0 && (rawGrounded || _pos.y <= l.y0 + 0.15)) {
        // pied de l'échelle : on redescend au sol
        body.current.setGravityScale(1, true);
        s.mode = 'move';
        s.ladder = null;
        runtime.climbDir = 0;
      } else {
        // grimpe : Z monte, S descend, Q/D se déplace le long des barreaux ;
        // on se maintient à ~0.45 du plan, du côté par lequel on est monté
        const front = (_pos.x - l.cx) * l.nx + (_pos.z - l.cz) * l.nz;
        const lat = -(_pos.x - l.cx) * l.nz + (_pos.z - l.cz) * l.nx;
        const targetFront = 0.45 * s.ladderSide;
        const latVel =
          (rAmt > 0 && lat < l.halfW + 0.25) || (rAmt < 0 && lat > -l.halfW - 0.25)
            ? rAmt * 2.6
            : 0;
        _vel.set(
          -l.nz * latVel + l.nx * (targetFront - front) * 8,
          fAmt * CLIMB_SPEED,
          l.nx * latVel + l.nz * (targetFront - front) * 8
        );
        body.current.setGravityScale(0, true);
        body.current.setLinvel(_vel, true);
        s.prevClimbY = _pos.y; // mémorise pour détecter un blocage au prochain tour
        // face à l'échelle (depuis le côté où l'on grimpe)
        s.faceYaw = dampAngle(s.faceYaw, Math.atan2(-l.nx * s.ladderSide, -l.nz * s.ladderSide), 16, sdt);
        runtime.climbDir = fAmt;
        if (fAmt !== 0) {
          s.stepAcc += CLIMB_SPEED * sdt;
          if (s.stepAcc > 1.3) {
            s.stepAcc = 0;
            audio.sfx('step');
          }
        }
      }
    } else if (s.mode === 'mantle') {
      // hissée AUTOMATIQUE : le corps est piloté en position sur ~1,1-1,3 s,
      // en deux temps (on s'élève au-dessus du rebord, puis on avance dessus)
      s.mantleT += sdt;
      body.current.setGravityScale(0, true);
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      const k = Math.min(1, s.mantleT / s.mantleDur);
      // trajectoire : d'abord surtout vertical, puis vers l'avant
      const kUp = Math.min(1, k / 0.6); // atteint la hauteur à 60% du temps
      const kFwd = Math.max(0, (k - 0.35) / 0.65); // avance après 35%
      const ease = (t) => t * t * (3 - 2 * t);
      const nx =
        s.mantleStart.x + (s.mantleEnd.x - s.mantleStart.x) * ease(kFwd);
      const ny =
        s.mantleStart.y + (s.mantleEnd.y - s.mantleStart.y) * ease(kUp);
      const nz =
        s.mantleStart.z + (s.mantleEnd.z - s.mantleStart.z) * ease(kFwd);
      body.current.setTranslation({ x: nx, y: ny, z: nz }, true);
      s.faceYaw = dampAngle(s.faceYaw, Math.atan2(s.mantleDir.x, s.mantleDir.z), 10, sdt);
      if (k >= 1) {
        body.current.setGravityScale(1, true);
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        s.mode = 'move';
        s.ladderCooldown = 0.15;
      }
    } else {
      // ---- MOVE ----
      // Accroche d'échelle : on pousse vers l'échelle (ou espace en l'air devant elle)
      if (s.ladderCooldown <= 0) {
        const l = findLadder(_pos.x, _pos.y, _pos.z);
        if (l) {
          // on peut aborder l'échelle par l'un ou l'autre côté : la direction
          // « vers l'échelle » dépend du côté où l'on se trouve
          const front = (_pos.x - l.cx) * l.nx + (_pos.z - l.cz) * l.nz;
          const side = front >= 0 ? 1 : -1;
          const towards = _wish.x * (-side * l.nx) + _wish.z * (-side * l.nz);
          // accroche si on avance vers le plan de l'échelle, OU si on la
          // touche presque (proche du plan) en tenant une direction, OU en l'air
          const near = Math.abs(front) < 0.75 && _wish.lengthSq() > 0.02;
          if (towards > 0.25 || near || (!grounded && input.jump)) {
            s.mode = 'ladder';
            s.ladder = l;
            s.ladderSide = side;
            s.prevClimbY = _pos.y - 1; // évite un faux blocage à la 1re frame
            body.current.setGravityScale(0, true);
            body.current.setLinvel({ x: 0, y: Math.max(0, _vel.y * 0.2), z: 0 }, true);
            audio.sfx('grab');
          }
        }
      }

      // Accroche de rebord : espace maintenu en l'air près du bord d'un bloc
      // → le personnage attrape le rebord et se hisse dessus (mantle).
      if (s.mode === 'move' && input.jump && !grounded && _vel.y < 6 && s.ladderCooldown <= 0) {
        const bases = [];
        if (_wish.lengthSq() > 0.04) bases.push(Math.atan2(_wish.x, _wish.z));
        bases.push(s.faceYaw);
        outer: for (const base of bases) {
          for (const a of [0, -0.35, 0.35]) {
            const dx = Math.sin(base + a);
            const dz = Math.cos(base + a);
            // 1. un mur devant le buste ?
            const wall = cast(_pos.x, _pos.y + 0.3, _pos.z, dx, 0, dz, 1.05);
            const wallToi = toi(wall);
            if (!wall || Math.abs(wall.normal.y) > 0.4) continue;
            // la face doit être tournée vers nous
            if (wall.normal.x * dx + wall.normal.z * dz > -0.2) continue;
            // 2. de l'air au-dessus du rebord ?
            const clear = cast(_pos.x, _pos.y + 1.9, _pos.z, dx, 0, dz, wallToi + 0.7);
            if (clear) continue;
            // 3. un dessus praticable, à portée de main ?
            const overX = _pos.x + dx * (wallToi + 0.45);
            const overZ = _pos.z + dz * (wallToi + 0.45);
            const top = cast(overX, _pos.y + 1.9, overZ, 0, -1, 0, 2.2);
            if (!top || top.normal.y < 0.6) continue;
            const topY = _pos.y + 1.9 - toi(top);
            const rise = topY - (_pos.y - 0.95); // hauteur du rebord vs pieds
            if (rise < 0.3 || rise > 2.6) continue;
            // c'est un rebord : hissée automatique douce (~1,3 s) sur le dessus
            s.mode = 'mantle';
            s.mantleT = 0;
            s.mantleDur = 1.3;
            s.mantleStart.copy(_pos);
            s.mantleEnd.set(overX, topY + 0.95, overZ);
            s.mantleDir.set(dx, 0, dz);
            s.ladderCooldown = 0.3;
            body.current.setGravityScale(0, true);
            body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            runtime.mode = 'mantle';
            audio.sfx('grab');
            break outer;
          }
        }
      }

      // Bumpers : sphères qui repoussent (champignons, boules de neige, boosters)
      if (s.mode === 'move' && s.bumpCd <= 0) {
        for (const bp of bumpers) {
          const dx = _pos.x - bp.x;
          const dy = _pos.y - bp.y;
          const dz = _pos.z - bp.z;
          const rr = bp.r + 0.7;
          if (dx * dx + dy * dy + dz * dz < rr * rr) {
            const len = Math.max(0.001, Math.hypot(dx, dy, dz));
            _vel.set(
              (dx / len) * bp.power,
              Math.max((dy / len) * bp.power, bp.power * 0.55),
              (dz / len) * bp.power
            );
            body.current.setLinvel(_vel, true);
            s.bumpCd = 0.35;
            runtime.bouncedAt = runtime.simTime;
            audio.sfx('bounce');
            break;
          }
        }
      }

      if (s.mode === 'move') {
        const targetSpeed = input.sprint && grounded ? SPRINT_SPEED : WALK_SPEED;
        // sur la glace, on n'a presque plus d'adhérence : ça glisse
        const onIce = !!(groundHit && groundHit.collider?.parent()?.userData?.ice);
        const accel = grounded ? (onIce ? 1.6 : 11) : 3.5;
        _wish.multiplyScalar(targetSpeed);
        _vel.x = THREE.MathUtils.damp(_vel.x, _wish.x, accel, sdt);
        _vel.z = THREE.MathUtils.damp(_vel.z, _wish.z, accel, sdt);

        // Trampolines : détectés par le rayon de sol, rebond garanti
        const groundToi = groundHit ? (groundHit.timeOfImpact ?? groundHit.toi) : Infinity;
        if (groundToi < 1.1 && _vel.y < 1) {
          const feetY = _pos.y - groundToi;
          const b = findBouncer(_pos.x, _pos.z, feetY);
          if (b) {
            _vel.y = b.power;
            _vel.x *= 0.85;
            _vel.z *= 0.85;
            runtime.bouncedAt = runtime.simTime;
            audio.sfx('bounce');
          }
        }

        if (s.jumpBuf > 0 && (grounded || s.coyote > 0) && _vel.y < JUMP_VELOCITY) {
          _vel.y = JUMP_VELOCITY;
          s.jumpBuf = 0;
          s.coyote = 0;
          audio.sfx('jump');
        }

        if (runtime.inWind > 0) {
          _vel.y = Math.min(_vel.y + 55 * sdt, 14);
        }

        if (_vel.y < -34) _vel.y = -34;

        body.current.setLinvel(_vel, true);
        // gravité par chapitre (l'espace flotte, le paradis allège)
        // le ciel allège la gravité (sauts plus planés en haut)
        body.current.setGravityScale(_pos.y > 205 ? 0.7 : 1, true);

        const hSpeed = Math.hypot(_vel.x, _vel.z);
        if (hSpeed > 0.8 && _wish.lengthSq() > 0.01) {
          s.faceYaw = dampAngle(s.faceYaw, Math.atan2(_wish.x, _wish.z), 12, sdt);
        }

        if (grounded && hSpeed > 1) {
          s.stepAcc += hSpeed * sdt;
          if (s.stepAcc > 2.6) {
            s.stepAcc = 0;
            audio.sfx('step');
          }
        }
      }
    }

    // ======================= SORTIES GLOBALES =======================

    runtime.playerPos.copy(_pos);
    runtime.playerVel.copy(_vel);
    runtime.grounded = grounded;
    runtime.mode = s.mode;
    runtime.speed = Math.hypot(_vel.x, _vel.z);
    runtime.faceYaw = s.faceYaw;

    const airSpeed = _vel.length();
    audio.setWind(grounded ? 0 : Math.max(0, (airSpeed - 8) / 20));

    const band = bandAt(_pos.y);
    if (band.name !== runtime.biome) {
      const order = ['village', 'city', 'cliffs', 'sky'];
      if (order.indexOf(band.name) > order.indexOf(runtime.biome) && runtime.timerRunning) {
        game.addSplit(runtime.biome, runtime.biomeLabel, runtime.timer);
      }
      runtime.biome = band.name;
      runtime.biomeLabel = band.label;
      runtime.biomeChangedAt = performance.now();
      audio.setBiome(band.name);
    }
  }, -3);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={START_POS}
      enabledRotations={[false, false, false]}
      ccd
      linearDamping={0.03}
      userData={{ player: true }}
      name="player"
    >
      <CapsuleCollider args={[0.6, 0.35]} friction={0} restitution={0} />
      <Character />
    </RigidBody>
  );
}
