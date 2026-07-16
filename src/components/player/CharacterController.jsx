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
  GRAVITY,
  START_POS,
  bandAt,
} from '../../constants';
import { Character } from './Character';

// ============================================================
// CONTRÔLEUR DU VOYAGEUR — réécrit avec le KinematicCharacterController
// de Rapier (la méthode standard, robuste). Le corps est kinematic : on
// calcule un déplacement voulu, Rapier le corrige contre le décor (murs,
// pentes, marches) et nous dit si on touche le sol. Fini les « vitesses
// posées mais le corps ne bouge pas ». La physique tourne en mode NORMAL.
// ============================================================

const CAP_HALF = 0.6; // demi-hauteur du cylindre de la capsule
const CAP_RADIUS = 0.35;
const CAP_BOTTOM = CAP_HALF + CAP_RADIUS; // 0.95 : distance centre → pieds

const _pos = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _move = new THREE.Vector3();

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

  const ctrl = useRef(null); // KinematicCharacterController
  const collider = useRef(null);

  const s = useRef({
    mode: 'move', // move | ladder | mantle
    velX: 0,
    velY: 0,
    velZ: 0,
    extX: 0,
    extZ: 0, // impulsion horizontale (bumpers/wall-jump), s'amortit
    grounded: false,
    coyote: 0,
    jumpBuf: 0,
    ladder: null,
    ladderSide: 1,
    prevClimbY: 0,
    ladderCd: 0,
    bumpCd: 0,
    mantleT: 0,
    mantleDur: 1.2,
    mantleStart: new THREE.Vector3(),
    mantleEnd: new THREE.Vector3(),
    mantleDir: new THREE.Vector3(),
    faceYaw: Math.PI,
    stepAcc: 0,
    respawnT: -1,
    wasGrounded: false,
    landedOnce: false,
  }).current;

  // raycast helper (exclut sensors + le corps du joueur)
  const ray = useRef(null);
  if (!ray.current) ray.current = new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  const FLAGS = rapier.QueryFilterFlags.EXCLUDE_SENSORS;
  const cast = (ox, oy, oz, dx, dy, dz, maxToi) => {
    const r = ray.current;
    r.origin.x = ox; r.origin.y = oy; r.origin.z = oz;
    r.dir.x = dx; r.dir.y = dy; r.dir.z = dz;
    return world.castRayAndGetNormal(r, maxToi, true, FLAGS, undefined, undefined, body.current);
  };
  const toi = (hit) => (hit ? (hit.timeOfImpact ?? hit.toi) : Infinity);

  // Création du character controller (une fois)
  useEffect(() => {
    const c = world.createCharacterController(0.08);
    c.setUp({ x: 0, y: 1, z: 0 });
    c.enableAutostep(0.5, 0.25, true); // monte les petites marches
    c.enableSnapToGround(0.5); // colle au sol dans les descentes
    c.setMaxSlopeClimbAngle((55 * Math.PI) / 180);
    c.setMinSlopeSlideAngle((40 * Math.PI) / 180);
    c.setApplyImpulsesToDynamicBodies(false);
    ctrl.current = c;
    runtime.playerBody = body.current;
    if (body.current) collider.current = body.current.collider(0);
    return () => {
      try { world.removeCharacterController(c); } catch { /* nop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teleport = (p) => {
    if (!body.current) return;
    body.current.setNextKinematicTranslation({ x: p[0], y: p[1], z: p[2] });
    body.current.setTranslation({ x: p[0], y: p[1], z: p[2] }, true);
    s.velX = s.velY = s.velZ = 0;
    s.extX = s.extZ = 0;
    s.mode = 'move';
    s.ladder = null;
    s.respawnT = -1;
    runtime.mode = 'move';
  };

  useEffect(() => {
    if (resetToken > 0) teleport(START_POS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  useFrame((_, rawDelta) => {
    if (!body.current || !ctrl.current || !collider.current) return;
    const game = useGame.getState();
    if (game.phase !== 'playing') {
      input.jumpPressed = false;
      input.jumpReleased = false;
      return;
    }

    const dt = Math.min(rawDelta, 0.05);

    // slow-motion (clic droit) : ralentit le temps de JEU (pas le rendu)
    const wantSlow = input.slow;
    runtime.targetTimeScale = wantSlow ? SLOWMO_SCALE : 1;
    runtime.timeScale += (runtime.targetTimeScale - runtime.timeScale) * Math.min(1, dt * 10);
    runtime.slowmoActive = wantSlow;
    audio.setSlow(wantSlow);
    const sdt = dt * runtime.timeScale;
    if (sdt <= 0) return;
    runtime.simTime += sdt;

    // chrono (temps réel)
    if (!runtime.timerRunning && input.anyMove) runtime.timerRunning = true;
    if (runtime.timerRunning) runtime.timer += rawDelta;

    const t = body.current.translation();
    _pos.set(t.x, t.y, t.z);

    // --- respawn (chute dans le vide) ---
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

    // --- direction voulue relative caméra ---
    const yaw = runtime.camYaw;
    _fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const fAmt = (input.f ? 1 : 0) - (input.b ? 1 : 0);
    const rAmt = (input.r ? 1 : 0) - (input.l ? 1 : 0);
    _wish.copy(_fwd).multiplyScalar(fAmt).addScaledVector(_right, rAmt);
    if (_wish.lengthSq() > 1) _wish.normalize();

    // fronts d'input
    const jumpPressed = input.jumpPressed;
    input.jumpPressed = false;
    input.jumpReleased = false;
    if (jumpPressed) s.jumpBuf = 0.14;
    else s.jumpBuf = Math.max(0, s.jumpBuf - dt);
    s.ladderCd = Math.max(0, s.ladderCd - dt);
    s.bumpCd = Math.max(0, s.bumpCd - dt);

    const gravity = GRAVITY * (_pos.y > 205 ? 0.7 : 1);
    let absolute = null; // position absolue (mantle)

    // ============================ ÉTATS ============================
    if (s.mode === 'mantle') {
      s.mantleT += sdt;
      const k = Math.min(1, s.mantleT / s.mantleDur);
      const kUp = Math.min(1, k / 0.55);
      const kFwd = Math.max(0, (k - 0.3) / 0.7);
      const ease = (x) => x * x * (3 - 2 * x);
      absolute = {
        x: s.mantleStart.x + (s.mantleEnd.x - s.mantleStart.x) * ease(kFwd),
        y: s.mantleStart.y + (s.mantleEnd.y - s.mantleStart.y) * ease(kUp),
        z: s.mantleStart.z + (s.mantleEnd.z - s.mantleStart.z) * ease(kFwd),
      };
      s.faceYaw = dampAngle(s.faceYaw, Math.atan2(s.mantleDir.x, s.mantleDir.z), 10, sdt);
      if (k >= 1) {
        s.mode = 'move';
        s.velX = s.velY = s.velZ = 0;
        s.ladderCd = 0.15;
      }
    } else if (s.mode === 'ladder') {
      const l = s.ladder;
      const lat = -(_pos.x - l.cx) * l.nz + (_pos.z - l.cz) * l.nx;
      const front = (_pos.x - l.cx) * l.nx + (_pos.z - l.cz) * l.nz;
      const stillOn = l && _pos.y > l.y0 - 0.6 && _pos.y < l.y1 + 1.3 && Math.abs(lat) < l.halfW + 0.6;
      const blockedTop =
        fAmt > 0 &&
        (_pos.y >= l.y1 - 0.25 || (_pos.y >= l.y1 - 2.2 && _pos.y - s.prevClimbY < CLIMB_SPEED * sdt * 0.3));

      if (jumpPressed) {
        // saut d'échelle : vers l'extérieur + direction voulue
        s.mode = 'move';
        s.ladder = null;
        s.velY = 8.5;
        s.extX = -l.nx * s.ladderSide * 4 + _wish.x * 3.5;
        s.extZ = -l.nz * s.ladderSide * 4 + _wish.z * 3.5;
        s.ladderCd = 0.25;
        runtime.climbDir = 0;
        audio.sfx('walljump');
      } else if (!stillOn) {
        s.mode = 'move';
        s.ladder = null;
        runtime.climbDir = 0;
      } else if (blockedTop) {
        // hissée sur la plateforme d'arrivée (des deux côtés)
        let bestY = -Infinity, bestSign = -s.ladderSide;
        for (const sgn of [1, -1]) {
          const ox = l.cx + l.nx * sgn;
          const oz = l.cz + l.nz * sgn;
          const hit = cast(ox, l.y1 + 3, oz, 0, -1, 0, 6);
          if (hit && hit.normal.y > 0.5) {
            const yTop = l.y1 + 3 - toi(hit);
            if (yTop > l.y0 && yTop < l.y1 + 2 && yTop > bestY) { bestY = yTop; bestSign = sgn; }
          }
        }
        const topY = bestY > -Infinity ? bestY : l.y1;
        s.mode = 'mantle';
        s.mantleT = 0; s.mantleDur = 1.0;
        s.mantleStart.copy(_pos);
        s.mantleEnd.set(l.cx + l.nx * bestSign, topY + CAP_BOTTOM + 0.05, l.cz + l.nz * bestSign);
        s.mantleDir.set(l.nx * bestSign, 0, l.nz * bestSign);
        s.ladder = null;
        runtime.climbDir = 0;
        audio.sfx('mantle');
      } else if (fAmt < 0 && (s.grounded || _pos.y <= l.y0 + 0.15)) {
        s.mode = 'move';
        s.ladder = null;
        runtime.climbDir = 0;
      } else {
        // grimpe : Z monte / S descend / Q-D latéral, plaqué au plan
        const targetFront = 0.42 * s.ladderSide;
        const latOk = (rAmt > 0 && lat < l.halfW) || (rAmt < 0 && lat > -l.halfW);
        const latV = latOk ? rAmt * 2.6 : 0;
        _move.set(
          (-l.nz * latV + l.nx * (targetFront - front) * 6) * sdt,
          fAmt * CLIMB_SPEED * sdt,
          (l.nx * latV + l.nz * (targetFront - front) * 6) * sdt
        );
        s.prevClimbY = _pos.y;
        s.faceYaw = dampAngle(s.faceYaw, Math.atan2(-l.nx * s.ladderSide, -l.nz * s.ladderSide), 16, sdt);
        runtime.climbDir = fAmt;
        s.velY = 0;
        if (fAmt !== 0) {
          s.stepAcc += CLIMB_SPEED * sdt;
          if (s.stepAcc > 1.3) { s.stepAcc = 0; audio.sfx('step'); }
        }
      }
    }

    if (s.mode === 'move') {
      // accroche d'échelle
      if (s.ladderCd <= 0) {
        const l = findLadder(_pos.x, _pos.y, _pos.z);
        if (l) {
          const front = (_pos.x - l.cx) * l.nx + (_pos.z - l.cz) * l.nz;
          const side = front >= 0 ? 1 : -1;
          const towards = _wish.x * (-side * l.nx) + _wish.z * (-side * l.nz);
          const near = Math.abs(front) < 0.75 && _wish.lengthSq() > 0.02;
          if (towards > 0.25 || near || (!s.grounded && input.jump)) {
            s.mode = 'ladder';
            s.ladder = l;
            s.ladderSide = side;
            s.prevClimbY = _pos.y - 1;
            s.velX = s.velY = s.velZ = 0;
            audio.sfx('grab');
          }
        }
      }

      // accroche de rebord (espace maintenu en l'air près d'un bord)
      if (s.mode === 'move' && input.jump && !s.grounded && s.velY < 4 && s.ladderCd <= 0) {
        const bases = [];
        if (_wish.lengthSq() > 0.04) bases.push(Math.atan2(_wish.x, _wish.z));
        bases.push(s.faceYaw);
        outer: for (const base of bases) {
          for (const a of [0, -0.35, 0.35]) {
            const dx = Math.sin(base + a), dz = Math.cos(base + a);
            const wall = cast(_pos.x, _pos.y + 0.3, _pos.z, dx, 0, dz, 1.05);
            const wt = toi(wall);
            if (!wall || Math.abs(wall.normal.y) > 0.4) continue;
            if (wall.normal.x * dx + wall.normal.z * dz > -0.2) continue;
            const clear = cast(_pos.x, _pos.y + 1.9, _pos.z, dx, 0, dz, wt + 0.7);
            if (clear) continue;
            const ox = _pos.x + dx * (wt + 0.45), oz = _pos.z + dz * (wt + 0.45);
            const top = cast(ox, _pos.y + 1.9, oz, 0, -1, 0, 2.2);
            if (!top || top.normal.y < 0.6) continue;
            const topY = _pos.y + 1.9 - toi(top);
            const rise = topY - (_pos.y - CAP_BOTTOM);
            if (rise < 0.3 || rise > 2.6) continue;
            s.mode = 'mantle';
            s.mantleT = 0; s.mantleDur = 1.2;
            s.mantleStart.copy(_pos);
            s.mantleEnd.set(ox, topY + CAP_BOTTOM + 0.05, oz);
            s.mantleDir.set(dx, 0, dz);
            s.ladderCd = 0.3;
            audio.sfx('grab');
            break outer;
          }
        }
      }

      if (s.mode === 'move') {
        const target = input.sprint && s.grounded ? SPRINT_SPEED : WALK_SPEED;
        const accel = s.grounded ? 12 : 4;
        s.velX = THREE.MathUtils.damp(s.velX, _wish.x * target, accel, sdt);
        s.velZ = THREE.MathUtils.damp(s.velZ, _wish.z * target, accel, sdt);

        // saut
        if (s.jumpBuf > 0 && (s.grounded || s.coyote > 0)) {
          s.velY = JUMP_VELOCITY;
          s.jumpBuf = 0;
          s.coyote = 0;
          audio.sfx('jump');
        } else if (s.grounded && s.velY <= 0) {
          s.velY = -2; // colle au sol
        }

        // trampolines (détectés sous les pieds)
        const gh = cast(_pos.x, _pos.y, _pos.z, 0, -1, 0, CAP_BOTTOM + 0.25);
        if (gh && s.velY < 1 && s.bumpCd <= 0) {
          const feetY = _pos.y - toi(gh);
          const b = findBouncer(_pos.x, _pos.z, feetY);
          if (b) {
            s.velY = b.power;
            s.bumpCd = 0.3;
            runtime.bouncedAt = runtime.simTime;
            audio.sfx('bounce');
          }
        }

        // bumpers (sphères qui repoussent)
        if (s.bumpCd <= 0) {
          for (const bp of bumpers) {
            const dx = _pos.x - bp.x, dy = _pos.y - bp.y, dz = _pos.z - bp.z;
            const rr = bp.r + 0.7;
            if (dx * dx + dy * dy + dz * dz < rr * rr) {
              const len = Math.max(0.001, Math.hypot(dx, dy, dz));
              s.velY = Math.max((dy / len) * bp.power, bp.power * 0.55);
              s.extX = (dx / len) * bp.power;
              s.extZ = (dz / len) * bp.power;
              s.bumpCd = 0.35;
              runtime.bouncedAt = runtime.simTime;
              audio.sfx('bounce');
              break;
            }
          }
        }

        // gravité (GRAVITY est négatif → fait descendre)
        s.velY += gravity * sdt;
        if (s.velY < -40) s.velY = -40;

        // orientation vers le déplacement
        const hSpeed = Math.hypot(s.velX + s.extX, s.velZ + s.extZ);
        if (hSpeed > 0.8 && _wish.lengthSq() > 0.01) {
          s.faceYaw = dampAngle(s.faceYaw, Math.atan2(_wish.x, _wish.z), 12, sdt);
        }
        if (s.grounded && hSpeed > 1) {
          s.stepAcc += hSpeed * sdt;
          if (s.stepAcc > 2.6) { s.stepAcc = 0; audio.sfx('step'); }
        }

        _move.set((s.velX + s.extX) * sdt, s.velY * sdt, (s.velZ + s.extZ) * sdt);
        // amortissement de l'impulsion externe
        const decay = Math.exp(-6 * sdt);
        s.extX *= decay;
        s.extZ *= decay;
      }
    }

    // ===================== APPLICATION DU MOUVEMENT =====================
    if (absolute) {
      body.current.setNextKinematicTranslation(absolute);
      _pos.set(absolute.x, absolute.y, absolute.z);
      s.grounded = false;
    } else {
      ctrl.current.computeColliderMovement(collider.current, _move, FLAGS);
      const corr = ctrl.current.computedMovement();
      const grounded = ctrl.current.computedGrounded();
      // si on cogne un plafond en montant, annule la vitesse verticale
      if (s.velY > 0 && corr.y < _move.y - 1e-4) s.velY = 0;
      body.current.setNextKinematicTranslation({
        x: _pos.x + corr.x,
        y: _pos.y + corr.y,
        z: _pos.z + corr.z,
      });
      _pos.set(_pos.x + corr.x, _pos.y + corr.y, _pos.z + corr.z);
      s.grounded = grounded && s.mode === 'move';
    }

    // coyote time
    s.coyote = s.grounded ? 0.12 : Math.max(0, s.coyote - dt);
    if (s.grounded && !s.wasGrounded && s.landedOnce && s.velY < -9) audio.sfx('land');
    s.landedOnce = true;
    s.wasGrounded = s.grounded;

    // ===================== SORTIES GLOBALES =====================
    runtime.playerPos.copy(_pos);
    runtime.playerVel.set(s.velX + s.extX, s.velY, s.velZ + s.extZ);
    runtime.grounded = s.grounded;
    runtime.mode = s.mode;
    runtime.speed = Math.hypot(s.velX + s.extX, s.velZ + s.extZ);
    runtime.faceYaw = s.faceYaw;
    audio.setWind(s.grounded ? 0 : Math.max(0, (Math.abs(s.velY) - 8) / 20));

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
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={START_POS}
      userData={{ player: true }}
      name="player"
    >
      <CapsuleCollider args={[CAP_HALF, CAP_RADIUS]} />
      <Character />
    </RigidBody>
  );
}
