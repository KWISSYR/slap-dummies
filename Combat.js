import { CFG, GLOVES, KILL_EFFECTS, PRACTICE, SPAWN, DUEL_POS, STAR, getMasteryRank } from "./Config.js";
import {
  safe, T, ent, nm, bcast, flash, sfx, tint, facing, solid,
  impactFx, ring, pillar, killFx, unlockFx,
} from "./Visuals.js";
import {
  P, WORLD_STATE, pd, tp, savePlayer, setLobbyState, setArenaState, refreshSpeed,
  getKsStageConfig, getBountyValue, grantMovementGrace,
} from "./PlayerData.js";
import { giveSlaps, checkAchievements, showRecap, awardGloveMastery } from "./Progression.js";
import { recordQuestEvent, resetLifeQuests } from "./Quests.js";

export const COMBAT_HOOKS = {
  onKill: null,
  onResetStreak: null,
  onSlapApplied: null,
  onSwingMiss: null,
};

export function duelAllowed(idA, idB) {
  const pa = idA ? P[idA] : null;
  const pb = idB ? P[idB] : null;
  if ((pa && pa.duelOpp) || (pb && pb.duelOpp)) {
    return !!(pa && pb && pa.duelOpp === idB && pb.duelOpp === idA);
  }
  return true;
}

export function getEyeRay(id) {
  const pos = safe("getPosition", () => api.getPosition(id));
  const info = safe("getPlayerFacingInfo", () => api.getPlayerFacingInfo(id));
  let origin = null;
  let dir = null;

  if (info && info.camPos && info.camPos.length === 3) {
    origin = [info.camPos[0], info.camPos[1], info.camPos[2]];
  } else if (pos) {
    origin = [pos[0], pos[1] + 1.62, pos[2]];
  }

  if (info && info.dir && info.dir.length === 3) {
    const len = Math.hypot(info.dir[0], info.dir[1], info.dir[2]);
    if (len > 0.001) {
      dir = [info.dir[0] / len, info.dir[1] / len, info.dir[2] / len];
    }
  }

  if (!dir) {
    const f = facing(id);
    dir = f ? [f[0], 0, f[1]] : [0, 0, 1];
  }

  return origin ? { origin, dir, pos } : null;
}

export function rayWallDistance(origin, dir, maxDist) {
  const hit = safe("blockRaycast", () => api.blockRaycast(origin, dir));
  if (hit) {
    const pt = Array.isArray(hit) ? hit : (hit.position || hit.pos || hit.hitPos);
    if (pt && pt.length === 3) {
      const hd = Math.hypot(pt[0] + 0.5 - origin[0], pt[1] + 0.5 - origin[1], pt[2] + 0.5 - origin[2]);
      if (hd >= 0.45 && hd < maxDist) return hd;
    }
  }

  for (let d = 0.65; d <= maxDist; d += 0.45) {
    if (solid(origin[0] + dir[0] * d, origin[1] + dir[1] * d, origin[2] + dir[2] * d)) {
      return d;
    }
  }
  return maxDist;
}

function raySegmentClosest(origin, dir, segA, segB, maxT) {
  const ux = dir[0], uy = dir[1], uz = dir[2];
  const vx = segB[0] - segA[0], vy = segB[1] - segA[1], vz = segB[2] - segA[2];
  const wx = origin[0] - segA[0], wy = origin[1] - segA[1], wz = origin[2] - segA[2];

  const a = ux * ux + uy * uy + uz * uz;
  const b = ux * vx + uy * vy + uz * vz;
  const c = vx * vx + vy * vy + vz * vz;
  const d = ux * wx + uy * wy + uz * wz;
  const e = vx * wx + vy * wy + vz * wz;
  const denom = a * c - b * b;

  let sc, sN, sD = denom;
  let tc, tN, tD = denom;

  if (denom < 1e-6) {
    sN = 0;
    sD = 1;
    tN = e;
    tD = c;
  } else {
    sN = b * e - c * d;
    tN = a * e - b * d;
    if (sN < 0) {
      sN = 0;
      tN = e;
      tD = c;
    } else if (sN > maxT * sD) {
      sN = maxT * sD;
      tN = e + b * maxT;
      tD = c;
    }
  }

  if (tN < 0) {
    tN = 0;
    if (-d < 0) sN = 0;
    else if (-d > a * maxT) sN = maxT * sD;
    else {
      sN = -d;
      sD = a;
    }
  } else if (tN > tD) {
    tN = tD;
    if (-d + b < 0) sN = 0;
    else if (-d + b > a * maxT) sN = maxT * sD;
    else {
      sN = -d + b;
      sD = a;
    }
  }

  sc = Math.abs(sN) < 1e-6 ? 0 : sN / sD;
  tc = Math.abs(tN) < 1e-6 ? 0 : tN / tD;

  const px = wx + sc * ux - tc * vx;
  const py = wy + sc * uy - tc * vy;
  const pz = wz + sc * uz - tc * vz;
  return { t: sc, s: tc, perpDist: Math.hypot(px, py, pz) };
}

export function aimDir(attackerId, victimId) {
  const aPos = api.getPosition(attackerId);
  const vPos = api.getPosition(victimId);
  let dx = vPos[0] - aPos[0];
  let dz = vPos[2] - aPos[2];
  const rawLen = Math.hypot(dx, dz);
  const f = facing(attackerId);

  if (rawLen < 0.05) {
    dx = f ? f[0] : 0;
    dz = f ? f[1] : 1;
  } else {
    dx /= rawLen;
    dz /= rawLen;
    if (f) {
      const blend = CFG.facingBlend;
      dx = dx * (1 - blend) + f[0] * blend;
      dz = dz * (1 - blend) + f[1] * blend;
      const nLen = Math.hypot(dx, dz) || 1;
      dx /= nLen;
      dz /= nLen;
    }
  }
  return [dx, dz, aPos, vPos];
}

export function distanceKnockMult(dist, aimQuality) {
  const d = typeof dist === "number" && isFinite(dist) ? Math.max(0, dist) : CFG.slapSweetDist;
  const aq = typeof aimQuality === "number" && isFinite(aimQuality) ? Math.max(0.84, Math.min(1.04, aimQuality)) : 1;

  let forceMult;
  let liftMult;
  if (d <= CFG.slapSweetDist) {
    forceMult = CFG.slapSweetMult;
    liftMult = 1.04;
  } else {
    const span = Math.max(0.5, CFG.slapReach - CFG.slapSweetDist);
    const ratio = Math.min(1, (d - CFG.slapSweetDist) / span);
    forceMult = CFG.slapSweetMult - ratio * (CFG.slapSweetMult - CFG.slapTipMinMult);
    liftMult = 1.04 - ratio * 0.16;
  }

  return {
    force: Math.max(0.72, Math.min(1.12, forceMult * (0.9 + 0.1 * aq))),
    lift: Math.max(0.84, Math.min(1.08, liftMult * (0.92 + 0.08 * aq))),
  };
}

export function raycastSlapTarget(attackerId, customReach) {
  const a = pd(attackerId);
  const ray = getEyeRay(attackerId);
  if (!ray || !ray.pos) return null;

  const reach = customReach || CFG.slapReach;
  const wallDist = rayWallDistance(ray.origin, ray.dir, reach);
  const ids = api.getPlayerIds();
  const now = Date.now();
  const f = facing(attackerId) || [ray.dir[0], ray.dir[2]];
  const fLen = Math.hypot(f[0], f[1]) || 1;
  const fx = f[0] / fLen;
  const fz = f[1] / fLen;

  let best = null;
  for (let i = 0; i < ids.length; i++) {
    const oid = ids[i];
    if (oid === attackerId) continue;
    const op = pd(oid);
    if (!op.inArena || op.prac !== a.prac) continue;
    if (!duelAllowed(attackerId, oid)) continue;
    if (now < op.protUntil) continue;

    const vPos = safe("getPosition", () => api.getPosition(oid));
    if (!vPos) continue;

    const segA = [vPos[0], vPos[1] + 0.15, vPos[2]];
    const segB = [vPos[0], vPos[1] + 1.85, vPos[2]];
    const hit = raySegmentClosest(ray.origin, ray.dir, segA, segB, reach + 0.25);

    const dx = vPos[0] - ray.pos[0];
    const dz = vPos[2] - ray.pos[2];
    const hDist = Math.hypot(dx, dz);
    const dyCenter = (vPos[1] + 0.9) - (ray.pos[1] + 0.9);
    const dist3d = Math.hypot(dx, dyCenter, dz);

    let tier = 0;
    let aimQuality = 0.9;
    let score = 1e9;

    // Tier 1: Direct 3D aim ray hits target capsule without wall occlusion
    if (hit.t >= -0.15 && hit.t <= Math.min(reach, wallDist + 0.35) && hit.perpDist <= CFG.slapHitboxRadius) {
      tier = 1;
      aimQuality = 1 - 0.14 * (hit.perpDist / CFG.slapHitboxRadius);
      score = hit.perpDist * 2.2 + dist3d * 0.45;
    } else if (
      hDist <= CFG.slapProxRadius &&
      Math.abs(dyCenter) <= CFG.slapProxVert &&
      hDist <= wallDist + 0.35
    ) {
      // Tier 2: Close-quarters melee proximity / cone check
      const dot = hDist > 0.05 ? (dx * fx + dz * fz) / hDist : 1;
      if (hDist <= 1.35 || dot >= CFG.slapConeCos) {
        tier = 2;
        aimQuality = 0.86 + 0.1 * Math.max(0, dot);
        score = 10 + dist3d * 0.9 - dot * 0.6;
      }
    }

    if (!tier) continue;

    // Prefer targets that aren't currently mid-iframe or combo-break protected
    const immunePenalty = (now < op.hitIframesUntil || now < op.comboImmuneUntil) ? 50 : 0;
    const totalScore = score + immunePenalty;

    if (!best || totalScore < best.score) {
      best = {
        id: oid,
        dist: dist3d,
        aimQuality,
        via: tier === 1 ? "ray" : "prox",
        score: totalScore,
      };
    }
  }

  return best;
}

export function near(id, radius, opts) {
  const pos = api.getPosition(id);
  if (!pos) return [];
  const ids = api.getPlayerIds();
  const out = [];
  const now = Date.now();
  const includeRag = opts && opts.includeRag;
  const ignoreComboImmune = opts && opts.ignoreComboImmune;
  const myPrac = pd(id).prac;

  for (let i = 0; i < ids.length; i++) {
    const oid = ids[i];
    if (oid === id) continue;
    const op = pd(oid);
    if (!op.inArena || op.prac !== myPrac) continue;
    if (!duelAllowed(id, oid)) continue;
    if (now < op.protUntil || now < op.ghostUntil) continue;
    if (!includeRag && CFG.ragImmune && op.rag) continue;
    if (!includeRag && !ignoreComboImmune && now < op.comboImmuneUntil) continue;
    const opos = api.getPosition(oid);
    if (!opos) continue;
    const d = Math.hypot(opos[0] - pos[0], opos[2] - pos[2]);
    if (d <= radius) out.push([oid, d, opos[0] - pos[0], opos[2] - pos[2], opos]);
  }
  return out;
}

export function nearPoint(pos, radius, excludeId, pracMode) {
  const ids = api.getPlayerIds();
  const out = [];
  const now = Date.now();
  for (let i = 0; i < ids.length; i++) {
    const oid = ids[i];
    if (oid === excludeId) continue;
    const op = pd(oid);
    if (!op.inArena || op.prac !== !!pracMode) continue;
    if (excludeId && !duelAllowed(excludeId, oid)) continue;
    if (now < op.protUntil || now < op.ghostUntil) continue;
    const opos = api.getPosition(oid);
    if (!opos) continue;
    const d = Math.hypot(opos[0] - pos[0], opos[2] - pos[2]);
    if (d <= radius) out.push([oid, d, opos[0] - pos[0], opos[2] - pos[2], opos]);
  }
  return out;
}

export function findTarget(id, radius, opts) {
  const f = facing(id);
  const list = near(id, radius, opts);
  let best = null;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (f && item[1] > 2.5 && (item[2] * f[0] + item[3] * f[1]) / item[1] < 0.55) continue;
    if (!best || item[1] < best[1]) best = item;
  }
  return best;
}

export function nearestTo(pos, radius, skipMap, pracMode) {
  const ids = api.getPlayerIds();
  const now = Date.now();
  let best = null;
  for (let i = 0; i < ids.length; i++) {
    const oid = ids[i];
    if (skipMap[oid]) continue;
    const op = pd(oid);
    if (!op.inArena || op.prac !== !!pracMode) continue;
    if (now < op.protUntil || now < op.ghostUntil || (CFG.ragImmune && op.rag)) continue;
    const opos = api.getPosition(oid);
    if (!opos) continue;
    const d = Math.hypot(opos[0] - pos[0], opos[2] - pos[2]);
    if (d <= radius && (!best || d < best[1])) best = [oid, d, opos];
  }
  return best;
}

export function isMirrored(targetId, attackerId) {
  const tpState = pd(targetId);
  const now = Date.now();
  if (now < tpState.mirrorUntil && attackerId && attackerId !== targetId) {
    tpState.reflects++;
    tpState.dirty = true;
    flash(targetId, "MIRROR REFLECT!");
    flash(attackerId, "REFLECTED BY MIRROR!");
    sfx(targetId, "glass");
    sfx(attackerId, "glass");
    return true;
  }
  return false;
}

function setRagPose(id, p, pose, now) {
  if (!CFG.usePose || p.ragPose === pose) return;
  p.ragPose = pose;
  p.ragPoseAt = now;
  safe("setPlayerPose", () => api.setPlayerPose(id, pose));
}

export function startRagdoll(id, durMs, power) {
  const p = pd(id);
  const now = Date.now();
  if (now < p.anchorUntil) return;
  const pwr = typeof power === "number" && isFinite(power) ? Math.max(0.5, power) : 1;
  p.ragPower = Math.max(p.ragPower || 0, pwr);

  if (p.rag) {
    const capUntil = p.ragStart + CFG.ragMaxChainMs;
    p.ragUntil = Math.min(capUntil, Math.max(p.ragUntil, now + Math.min(durMs, CFG.ragComboExtMs)));
    setRagPose(id, p, pwr >= 1.15 ? "gliding" : "sleeping", now);
    return;
  }

  p.rag = true;
  p.ragStart = now;
  p.ragUntil = now + Math.min(durMs, CFG.ragMaxChainMs);
  p.cue = false;
  p.landedAt = 0;
  p.bounces = 0;
  setRagPose(id, p, pwr >= 1.15 ? "gliding" : "sleeping", now);
  refreshSpeed(id);
}

export function endRagdoll(id) {
  const p = pd(id);
  if (!p.rag) return;
  p.rag = false;
  p.ragUntil = 0;
  p.ragPower = 0;
  setRagPose(id, p, "standing", Date.now());
  refreshSpeed(id);
}

export function tickRagdollPhysics(id, p, pos, now, dt) {
  p.stillT = Math.abs(p.vel[1]) < 0.4 ? p.stillT + 1 : 0;
  const isGrounded = (solid(pos[0], pos[1] - 0.15, pos[2]) && Math.abs(p.vel[1]) < 2) || p.stillT >= 3;
  const hSpeed = Math.hypot(p.vel[0], p.vel[2]);

  if (!isGrounded && p.vel[1] < p.fallSpeed) p.fallSpeed = p.vel[1];

  // Ground impact bounce & landing tech window
  if (!p.grounded && isGrounded) {
    const impactV = -p.fallSpeed;
    if (p.slamUntil > now && now > p.slamArm) {
      // Handled via caller slamBoom check before ragdoll recovery
    }
    if (p.rag) {
      p.landedAt = now;
      if (impactV > CFG.groundBounceMin && p.bounces < CFG.maxBounces) {
        p.bounces++;
        const reboundY = Math.min(10.5, impactV * CFG.groundBounce);
        api.applyImpulse(id, p.vel[0] * 0.12, reboundY, p.vel[2] * 0.12);
        ring(pos, "default", 1.8, 6);
        sfx(id, impactV > 12 ? "hit" : "fallsmall");
        if (impactV > 12) flash(id, "BOUNCE!");
      } else if (impactV > 4.5) {
        sfx(id, "fallsmall");
      }
    }
    p.fallSpeed = 0;
  }
  p.grounded = isGrounded;

  if (!p.rag) return;

  // Grounded skid dust & progressive friction slide
  if (isGrounded && hSpeed > 2.4) {
    if (now - p.trailAt > 90) {
      p.trailAt = now;
      ring([pos[0], pos[1] + 0.05, pos[2]], "default", 1.1, 4);
    }
    const drag = Math.pow(CFG.ragSlideDrag, Math.max(0.5, dt * 20));
    safe("setVelocity(slide)", () => api.setVelocity(id, p.vel[0] * drag, p.vel[1], p.vel[2] * drag));
  }

  // Wall & obstacle ricochet
  const vx = p.vel[0], vz = p.vel[2];
  if (hSpeed > CFG.bounceMin && now - p.wallAt > 240) {
    const hitX = solid(pos[0] + (vx > 0 ? 0.72 : -0.72), pos[1] + 0.5, pos[2]);
    const hitZ = solid(pos[0], pos[1] + 0.5, pos[2] + (vz > 0 ? 0.72 : -0.72));
    if (hitX || hitZ) {
      p.wallAt = now;
      api.applyImpulse(id, hitX ? -vx * CFG.bounceRest : 0, 1.35, hitZ ? -vz * CFG.bounceRest : 0);
      ring([pos[0], pos[1] + 0.7, pos[2]], "default", 1.9, 6);
      flash(id, "BONK!");
      sfx(id, "fallsmall");
    }
  }

  // Domino player-to-player ragdoll bowling at high speed
  if (hSpeed >= CFG.ragBowlSpeed && now - (p.bowlAt || 0) > 450 && p.inArena) {
    const bystanders = near(id, 1.3, { includeRag: false });
    if (bystanders.length) {
      const b = bystanders[0];
      const bp = pd(b[0]);
      if (now - (bp.bowlAt || 0) > 600) {
        p.bowlAt = now;
        bp.bowlAt = now;
        const nx = (vx / hSpeed) * 0.7 + (b[2] / (b[1] || 1)) * 0.3;
        const nz = (vz / hSpeed) * 0.7 + (b[3] / (b[1] || 1)) * 0.3;
        const nLen = Math.hypot(nx, nz) || 1;
        knock(p.lastHitBy || id, b[0], nx / nLen, nz / nLen, CFG.ragBowlForce, 0.85, 0.75, true);
        flash(b[0], "BOWLED OVER!");
        sfx(b[0], "hit");
      }
    }
  }

  // Multi-phase ragdoll pose choreography (flight -> tumble -> floor flop -> get-up crouch -> stand)
  const remMs = p.ragUntil - now;
  if (remMs <= CFG.ragGetupMs) {
    setRagPose(id, p, "driving", now);
  } else if (!isGrounded && (hSpeed > 7.5 || Math.abs(p.vel[1]) > 4.2)) {
    if (now - p.ragPoseAt >= CFG.ragPoseFlipMs) {
      setRagPose(id, p, p.ragPose === "gliding" ? "sleeping" : "gliding", now);
    }
  } else {
    setRagPose(id, p, "sleeping", now);
  }

  if (!p.cue && now - p.ragStart >= CFG.cancelStart) {
    p.cue = true;
    flash(id, "JUMP TO RECOVER!");
  }
  if (now >= p.ragUntil) endRagdoll(id);
}

export function knock(attackerId, victimId, dx, dz, forceMult, liftMult, ragMult, skipEcho, opts) {
  const v = pd(victimId);
  const now = Date.now();

  // Anchor protection drastically dampens knockback and blocks ragdoll
  if (now < v.anchorUntil) {
    const anchoredPush = Math.min(CFG.force * forceMult * 0.12, 5);
    api.applyImpulse(victimId, dx * anchoredPush, 0.5, dz * anchoredPush);
    v.lastHitBy = attackerId;
    v.lastHitTime = now;
    flash(victimId, "ANCHORED!");
    return 0.12;
  }

  if (v.combo && v.combo.by === attackerId && now - v.combo.t < CFG.comboReset) {
    v.combo.n++;
  } else {
    v.combo = { by: attackerId, n: 0, t: now };
  }
  v.combo.t = now;

  if (now - (v.chainHitAt || 0) <= CFG.comboReset) {
    v.chainHits = (v.chainHits || 0) + 1;
  } else {
    v.chainHits = 1;
  }
  v.chainHitAt = now;

  const isFinisher =
    v.combo.n >= CFG.comboMaxHits - 1 ||
    v.chainHits >= CFG.comboMaxHits + 1;

  let armorMult = 1;
  if (now < v.titanUntil) armorMult = 0.35;
  else if (now < v.armorUntil) armorMult = 0.5;

  const distForceScale = opts && typeof opts.distForce === "number" ? opts.distForce : 1;
  const distLiftScale = opts && typeof opts.distLift === "number" ? opts.distLift : 1;
  const finisherMult = isFinisher ? 1.12 : 1;

  const mult =
    Math.max(CFG.comboMin, 1 - CFG.comboDecay * v.combo.n) *
    (1 + v.heat * CFG.heatScale) *
    (v.grounded ? 1 : CFG.airBonus) *
    armorMult *
    distForceScale *
    finisherMult;

  v.heat = Math.min(CFG.heatMax, v.heat + CFG.heatGain);
  const push = Math.min(CFG.force * forceMult * mult, CFG.maxPush);
  const lift = CFG.lift * liftMult * distLiftScale * (0.6 + 0.4 * mult);

  api.applyImpulse(victimId, dx * push, lift, dz * push);
  grantMovementGrace(victimId, 2000);

  if (ragMult > 0 && now >= v.titanUntil) {
    const baseDur = CFG.ragBase * ragMult * (0.8 + 0.2 * Math.min(mult, 1.4));
    startRagdoll(victimId, isFinisher ? Math.min(baseDur, 1000) : baseDur, mult);
  }

  v.hitIframesUntil = now + CFG.hitIframesMs;
  if (isFinisher) {
    v.comboImmuneUntil = now + CFG.comboBreakMs;
    v.combo = null;
    v.chainHits = 0;
    flash(victimId, "COMBO BREAK!");
    if (attackerId && attackerId !== victimId && !skipEcho) {
      flash(attackerId, "COMBO FINISHER!");
    }
  }

  v.dashUntil = 0;
  v.slamUntil = 0;
  v.lastHitBy = attackerId;
  v.lastHitTime = now;

  v.hits.push({ by: attackerId, t: now });
  while (v.hits.length > 12 || (v.hits.length && now - v.hits[0].t > 20000)) {
    v.hits.shift();
  }

  if (!skipEcho && COMBAT_HOOKS.onSlapApplied) {
    COMBAT_HOOKS.onSlapApplied(attackerId, victimId, dx, dz, forceMult, liftMult, now);
  }
  return mult;
}

export function handleJumpCancel(id) {
  const p = pd(id);
  const now = Date.now();
  p.lastActive = now;
  if (!p.rag) return;

  const elapsed = now - p.ragStart;
  const techOk = p.landedAt > 0 && now - p.landedAt <= CFG.techWindow;
  const winOk = elapsed >= CFG.cancelStart && elapsed <= CFG.cancelEnd;

  if (winOk || techOk) {
    const perfect =
      (winOk && elapsed - CFG.cancelStart <= CFG.perfectMs) ||
      (techOk && now - p.landedAt <= CFG.perfectMs);
    const f = facing(id);
    const hop = perfect ? CFG.perfectHop : CFG.cancelHop;
    const dash = perfect ? CFG.perfectDash : CFG.cancelDash;
    const pos = api.getPosition(id);
    const cx = SPAWN[0] - pos[0], cz = SPAWN[2] - pos[2];
    const clen = Math.hypot(cx, cz) || 1;
    let dx = cx / clen, dz = cz / clen;

    if (f) {
      dx = f[0] * (1 - CFG.centerAssist) + dx * CFG.centerAssist;
      dz = f[1] * (1 - CFG.centerAssist) + dz * CFG.centerAssist;
      const dlen = Math.hypot(dx, dz) || 1;
      dx /= dlen;
      dz /= dlen;
    }

    endRagdoll(id);
    grantMovementGrace(id, 1400);
    api.applyImpulse(id, dx * dash, hop, dz * dash);
    p.armorUntil = now + CFG.armorMs;
    p.comboImmuneUntil = Math.max(p.comboImmuneUntil || 0, now + (perfect ? CFG.armorMs : 280));
    p.combo = null;
    p.chainHits = 0;
    p.cancelStreak++;
    p.cancels++;
    if (perfect) p.perfects++;
    p.dirty = true;
    recordQuestEvent(id, "cancel", 1);

    flash(id, perfect ? "PERFECT CANCEL x" + p.cancelStreak : "Ragdoll cancel");
    if (perfect) {
      tint(id, p, "rgba(255,215,0,0.5)", 300);
      ring(pos, "shock", 2.5, 8);
      pillar(pos, "shock", 14);
      if (!p.prac) {
        p.lifePerfects = (p.lifePerfects || 0) + 1;
        if (p.lifePerfects >= 5 && !p.un.phoenix) {
          p.un.phoenix = true;
          p.fresh.phoenix = true;
          p.badges.phoenix_soul = true;
          p.shopSig = "";
          p.hudSig = "";
          unlockFx(id, "phoenix");
          sfx(id, "levelup");
          flash(id, STAR + " SECRET GLOVE UNLOCKED: PHOENIX " + STAR);
          safe("msg", () =>
            api.sendMessage(id, "SECRET GLOVE UNLOCKED: PHOENIX (5 Perfect Cancels in 1 life) + [PHOENIX] Badge!", { color: "gold" })
          );
          bcast(
            [ent(id, "#ff9500"), T(" forged the SECRET ", "#ffffff"), T("PHOENIX glove!", "#ff3b30", true)],
            nm(id) + " forged the SECRET PHOENIX glove!",
            "orange"
          );
          savePlayer(id);
        }
      }
    }

    if (p.prac) {
      p.cancels--;
      if (perfect) p.perfects--;
      p.cancelStreak = 0;
      safe("msg", () =>
        api.sendMessage(
          id,
          "Cancel at " + elapsed + "ms | window " + CFG.cancelStart + "-" + CFG.cancelEnd + "ms" + (perfect ? "  PERFECT!" : ""),
          { color: perfect ? "gold" : "white" }
        )
      );
    }
  } else if (elapsed < CFG.cancelStart && now - p.lastFail > 200) {
    p.lastFail = now;
    p.ragUntil = Math.min(p.ragStart + CFG.ragMaxChainMs, p.ragUntil + 250);
    p.cancelStreak = 0;
    flash(id, "Too early!");
  }
}

export function processSlap(attackerId, victimId, opts) {
  if (attackerId === victimId) return "preventDamage";
  const a = pd(attackerId);
  const v = pd(victimId);
  const now = Date.now();
  const isAttackEvt = !!(opts && opts.source === "attack");

  if (!isAttackEvt) {
    a.lastDmgEvtAt = now;
    if (now - (a.lastAttackEvtAt || 0) < CFG.slapSwingDebounceMs &&
      (a.lastHitTargetId === victimId || now - a.lastSlap < CFG.slapSwingDebounceMs)) {
      return "preventDamage";
    }
  } else {
    a.lastAttackEvtAt = now;
  }

  if (a.prac !== v.prac) return "preventDamage";
  if (!a.inArena || !v.inArena) return "preventDamage";
  if (!duelAllowed(attackerId, victimId)) return "preventDamage";

  const g = GLOVES[a.glove] || GLOVES.default;
  const ev = a.inArena && !a.prac ? WORLD_STATE.event : null;
  const cdFactor = ev && ev.id === "frenzy" ? 0.85 : 1;
  const mast = getMasteryRank(a.mastery ? a.mastery[a.glove] : 0);
  if (a.rag || now < a.frozenUntil || now - a.lastSlap < g.cd * cdFactor) return "preventDamage";
  if (now < v.protUntil) {
    flash(attackerId, "Spawn protected");
    return "preventDamage";
  }
  if (now < v.ghostUntil) {
    flash(attackerId, "Ghost! Slap passed through");
    return "preventDamage";
  }
  if (now < v.comboImmuneUntil) {
    flash(attackerId, "Combo protected!");
    return "preventDamage";
  }
  if (now < v.hitIframesUntil) {
    return "preventDamage";
  }
  if (CFG.ragImmune && v.rag) {
    flash(attackerId, "They're already down!");
    return "preventDamage";
  }

  a.lastSlap = now;
  a.lastHitTargetId = victimId;
  a.lastActive = now;
  if (!a.firstSlapTracked) {
    a.firstSlapTracked = true;
    safe("analytics first slap", () => api.registerAnalyticsEvent(attackerId, "first_slap", "slapped", null, now));
  }

  // Aegis Shield counter
  if (now < v.shieldUntil) {
    const dir = aimDir(victimId, attackerId);
    knock(victimId, attackerId, dir[0], dir[1], 1.15, 0.9, 0.9, true);
    v.reflects++;
    v.dirty = true;
    recordQuestEvent(victimId, "reflect", 1);
    flash(victimId, "AEGIS BLOCK!");
    flash(attackerId, "BLOCKED BY AEGIS!");
    sfx(victimId, "glass");
    sfx(attackerId, "hit");
    ring(dir[3], "shield", 2.8, 10);
    return "preventDamage";
  }

  // Mirror Counter reflection
  if (isMirrored(victimId, attackerId)) {
    const rDir = aimDir(victimId, attackerId);
    const ksF = a.glove === "killstreak" ? getKsStageConfig(a.ksStage).f : g.f;
    knock(victimId, attackerId, rDir[0], rDir[1], ksF * 1.1, g.l, g.r, true);
    recordQuestEvent(victimId, "reflect", 1);
    tint(attackerId, a, "rgba(160,240,255,0.55)", 260);
    impactFx(rDir[3], "mirror", true);
    return "preventDamage";
  }

  const dir = aimDir(attackerId, victimId);
  const hitDist = (opts && typeof opts.dist === "number")
    ? opts.dist
    : Math.hypot(dir[3][0] - dir[2][0], dir[3][1] - dir[2][1], dir[3][2] - dir[2][2]);
  const distScale = distanceKnockMult(hitDist, opts && opts.aimQuality);

  let forceMult = g.f * mast.forceMult;
  let liftMult = g.l;
  let ragMult = g.r;

  if (a.glove === "killstreak") {
    const st = getKsStageConfig(a.ksStage);
    forceMult = st.f * mast.forceMult;
    liftMult = st.l;
    ragMult = st.r;
  }

  if (ev && ev.id === "low_grav") liftMult *= 1.55;
  if (ev && ev.id === "knockback") {
    forceMult *= 1.45;
    ragMult *= 1.3;
  }
  if (now < a.rageUntil) forceMult *= 1.45;
  if (a.crateBuff === "kb" && now < a.crateUntil) forceMult *= 1.4;
  if (v.crateBuff === "shield" && now < v.crateUntil) {
    v.crateBuff = "";
    v.crateUntil = 0;
    forceMult *= 0.35;
    ragMult = 0;
    flash(victimId, "CRATE SHIELD BLOCKED!");
    flash(attackerId, "SHIELDED!");
  }

  let isCrit = false;
  if (now < a.chargeUntil) {
    forceMult *= CFG.overMult;
    ragMult *= CFG.overRag;
    a.chargeUntil = 0;
    isCrit = true;
    flash(attackerId, "OVERCHARGED SLAP!");
  } else if (hitDist <= CFG.slapSweetDist && (!opts || (opts.aimQuality || 1) >= 0.94)) {
    isCrit = true;
  }

  knock(attackerId, victimId, dir[0], dir[1], forceMult, liftMult, ragMult, false, {
    distForce: distScale.force,
    distLift: distScale.lift,
  });

  if (a.glove === "freeze" || a.glove === "leech") {
    v.slowUntil = now + CFG.slowMs;
    refreshSpeed(victimId);
  }
  if (a.glove === "titan") {
    ring(dir[3], "titan", 3.5, 10);
  }

  giveSlaps(attackerId, 1);
  recordQuestEvent(attackerId, "slap_hit", 1);
  tint(victimId, v, "rgba(255,60,60,0.45)", 200);
  impactFx(dir[3], a.glove, isCrit);
  const kfx = KILL_EFFECTS[a.killFx] || KILL_EFFECTS.fx_default;
  sfx(victimId);
  sfx(attackerId, kfx.hitSound || "hit");
  if (!a.prac) flash(attackerId, "Slaps: " + a.slaps);
  return "preventDamage";
}

export function handlePlayerAttack(attackerId) {
  const a = pd(attackerId);
  const now = Date.now();
  if (!a.inArena || a.rag || now < a.frozenUntil) return;
  if (now - (a.lastDmgEvtAt || 0) < CFG.slapSwingDebounceMs) return;
  if (now - (a.lastRayCheckAt || 0) < 60) return;
  a.lastRayCheckAt = now;

  const g = GLOVES[a.glove] || GLOVES.default;
  if (now - a.lastSlap < g.cd) return;

  const target = raycastSlapTarget(attackerId);
  if (!target) {
    if (COMBAT_HOOKS.onSwingMiss) COMBAT_HOOKS.onSwingMiss(attackerId, a, now, g);
    return;
  }

  processSlap(attackerId, target.id, {
    source: "attack",
    dist: target.dist,
    aimQuality: target.aimQuality,
    via: target.via,
  });
}

export function resetCombatState(id) {
  const p = pd(id);
  p.streak = 0;
  p.lastHitBy = null;
  p.combo = null;
  p.hitIframesUntil = 0;
  p.comboImmuneUntil = 0;
  p.chainHits = 0;
  p.chainHitAt = 0;
  p.lastHitTargetId = null;
  p.heat = 0;
  p.cancelStreak = 0;
  p.frozenUntil = 0;
  p.frozenPos = null;
  p.shatterBy = null;
  p.armorUntil = 0;
  p.dashUntil = 0;
  p.slamUntil = 0;
  p.slowUntil = 0;
  p.speedBoostUntil = 0;
  p.speedBoostMult = 1;
  p.bombAt = 0;
  p.bombBy = null;
  p.ghostUntil = 0;
  p.shieldUntil = 0;
  p.anchorUntil = 0;
  p.mirrorUntil = 0;
  p.titanUntil = 0;
  p.echoUntil = 0;
  p.echoBy = null;
  p.chargeUntil = 0;
  p.rageUntil = 0;
  p.crateBuff = "";
  p.crateUntil = 0;
  p.lifePerfects = 0;
  p.posHist = [];
  p.hits = [];
  resetLifeQuests(id);
  endRagdoll(id);
  refreshSpeed(id);
}

export function resolveDuelWin(winnerId, loserId, reason) {
  const lp = P[loserId];
  const wp = winnerId ? P[winnerId] : null;
  const wager = (lp && lp.duelWager) || (wp && wp.duelWager) || 0;
  if (lp) {
    lp.duelOpp = null;
    lp.duelWager = 0;
    lp.hudSig = "";
    lp.tagSig = "";
  }
  if (wp) {
    const now = Date.now();
    wp.duelOpp = null;
    wp.duelWager = 0;
    wp.duelWins = (wp.duelWins || 0) + 1;
    wp.badges.duelist = true;
    wp.dirty = true;
    wp.hudSig = "";
    wp.tagSig = "";
    const prize = wager > 0 ? wager * 2 : 10;
    giveSlaps(winnerId, prize, true);
    resetCombatState(winnerId);
    setLobbyState(winnerId);
    tp(winnerId, SPAWN[0], SPAWN[1], SPAWN[2]);
    api.setVelocity(winnerId, 0, 0, 0);
    wp.protUntil = now + CFG.protectMs;
    sfx(winnerId, "levelup");
    flash(winnerId, STAR + " DUEL VICTORY! +" + prize + " SLAPS " + STAR);
    bcast(
      [
        ent(winnerId, "#30d158"),
        T(" defeated ", "#ffffff"),
        T(nm(loserId), "#ff6b6b"),
        T(" in a 1v1 Duel" + (wager > 0 ? " (+" + prize + " Slaps)" : "") + "!" + (reason ? " [" + reason + "]" : ""), "#ffd60a", true),
      ],
      nm(winnerId) + " defeated " + nm(loserId) + " in a 1v1 Duel!",
      "lime"
    );
    savePlayer(winnerId);
  }
}

export function resolveDuelForfeit(loserId) {
  const lp = P[loserId];
  if (lp && lp.duelOpp) resolveDuelWin(lp.duelOpp, loserId, "Forfeit");
}

export function handleFall(id) {
  const p = pd(id);
  const now = Date.now();
  if (now - p.lastFall < 800) return;
  p.lastFall = now;

  if (p.prac) {
    p.hits = [];
    resetCombatState(id);
    tp(id, PRACTICE[0], PRACTICE[1], PRACTICE[2]);
    setArenaState(id);
    api.setVelocity(id, 0, 0, 0);
    p.protUntil = now + 1500;
    return;
  }

  const wasKing = WORLD_STATE.kothHolder === id;
  const bountyVal = getBountyValue(p);
  const duelOpp = p.duelOpp;

  p.falls++;
  p.dirty = true;

  const killerId = p.lastHitBy;
  let killerInfo = null;
  if (killerId && killerId !== id && P[killerId] && now - p.lastHitTime < CFG.creditMs) {
    const assists = [];
    const seen = {};
    let directHits = 0;
    for (let i = 0; i < p.hits.length; i++) {
      const h = p.hits[i];
      if (h.by === killerId) {
        if (now - h.t < CFG.creditMs) directHits++;
      } else if (h.by !== id && P[h.by] && now - h.t < CFG.assistMs && !seen[h.by]) {
        seen[h.by] = 1;
        assists.push(h.by);
      }
    }

    const kp = P[killerId];
    giveSlaps(killerId, CFG.killReward);
    sfx(killerId, "exp_collect");
    kp.kills++;
    kp.streak++;
    kp.dirty = true;
    if (kp.streak > kp.bestStreak) kp.bestStreak = kp.streak;

    // Multi-kill achievement tracking (2+ kills within 5s)
    kp.recentKillTimes.push(now);
    while (kp.recentKillTimes.length && now - kp.recentKillTimes[0] > 5000) {
      kp.recentKillTimes.shift();
    }
    if (kp.recentKillTimes.length >= 2) {
      kp.multiKills++;
    }

    bcast(
      [
        ent(killerId, "#ffd60a"),
        T(" knocked off ", "#ff9500"),
        ent(id, "#ffffff"),
        T("!  +" + CFG.killReward, "#30d158", true),
      ],
      nm(killerId) + " knocked off " + nm(id) + "! (+" + CFG.killReward + ")",
      "orange"
    );

    if (kp.streak === 3 || kp.streak === 5 || kp.streak === 10 || kp.streak === 15) {
      bcast(
        [ent(killerId, "#ff2d92"), T(" is on a " + kp.streak + " knock-off streak!", "#ff3b30", true)],
        nm(killerId) + " is on a " + kp.streak + " knock-off streak!",
        "red"
      );
      if (kp.streak === 5) {
        kp.tagSig = "";
        flash(killerId, "BOUNTY ON YOUR HEAD!");
      }
    }

    // Bounty payout
    if (bountyVal > 0) {
      giveSlaps(killerId, bountyVal);
      kp.bountiesClaimed = (kp.bountiesClaimed || 0) + 1;
      kp.badges.bounty_hunter = true;
      flash(killerId, "BOUNTY CLAIMED +" + bountyVal + " SLAPS!");
      bcast(
        [ent(killerId, "#ffd60a"), T(" claimed the +" + bountyVal + " Slap BOUNTY on " + nm(id) + "!", "#ff3b30", true)],
        nm(killerId) + " claimed the +" + bountyVal + " Slap Bounty on " + nm(id) + "!",
        "gold"
      );
    }

    // Revenge bonus
    if (kp.lastKilledBy === id) {
      kp.lastKilledBy = null;
      giveSlaps(killerId, CFG.revengeReward);
      flash(killerId, "REVENGE +" + CFG.revengeReward + " SLAPS!");
      safe("msg", () => api.sendMessage(killerId, "REVENGE! +" + CFG.revengeReward + " bonus Slaps for knocking off " + nm(id) + ".", { color: "gold" }));
    }
    p.lastKilledBy = killerId;

    // King / Bounty dethrone tracking -> Secret JESTER glove at 3
    if (wasKing || bountyVal > 0) {
      kp.kingsDethroned = (kp.kingsDethroned || 0) + 1;
      if (kp.kingsDethroned >= 3 && !kp.un.jester) {
        kp.un.jester = true;
        kp.fresh.jester = true;
        kp.badges.king_slayer = true;
        kp.shopSig = "";
        kp.hudSig = "";
        unlockFx(killerId, "jester");
        sfx(killerId, "levelup");
        flash(killerId, STAR + " SECRET GLOVE UNLOCKED: JESTER " + STAR);
        safe("msg", () =>
          api.sendMessage(killerId, "SECRET GLOVE UNLOCKED: JESTER (3 Kings/Bounties dethroned) + [SLAYER] Badge!", { color: "gold" })
        );
        bcast(
          [ent(killerId, "#ff2d92"), T(" unlocked the SECRET ", "#ffffff"), T("JESTER glove!", "#ffd60a", true)],
          nm(killerId) + " unlocked the SECRET JESTER glove!",
          "hotpink"
        );
      } else if (!kp.un.jester) {
        safe("msg", () =>
          api.sendMessage(killerId, "Dethroned King/Bounty (" + kp.kingsDethroned + "/3 toward secret JESTER glove).", { color: "aqua" })
        );
      }
    }

    killFx(killerId, kp);
    awardGloveMastery(killerId, kp, kp.glove);
    recordQuestEvent(killerId, "ko", 1);
    if (COMBAT_HOOKS.onKill) COMBAT_HOOKS.onKill(killerId, id, now);
    checkAchievements(killerId, kp);

    killerInfo = { k: killerId, g: kp.glove, n: directHits, as: assists };
  } else {
    safe("msg", () => api.sendMessage(id, "You fell off!", { color: "gray" }));
  }

  if (COMBAT_HOOKS.onResetStreak) COMBAT_HOOKS.onResetStreak(id, true);
  resetCombatState(id);
  setLobbyState(id);
  tp(id, SPAWN[0], SPAWN[1], SPAWN[2]);
  api.setVelocity(id, 0, 0, 0);
  p.protUntil = now + CFG.protectMs;

  if (duelOpp) {
    resolveDuelWin(duelOpp, id, "KO");
  }

  if (killerInfo) {
    const assistNames = [];
    for (let i = 0; i < killerInfo.as.length; i++) {
      const aid = killerInfo.as[i];
      const ap = P[aid];
      if (!ap) continue;
      if (now - (ap.assistFrom[id] || 0) > CFG.assistPairMs) {
        ap.assistFrom[id] = now;
        ap.assists++;
        ap.dirty = true;
        giveSlaps(aid, CFG.assistReward);
        flash(aid, "ASSIST +" + CFG.assistReward);
        safe("msg", () =>
          api.sendMessage(aid, "Assist! You helped knock " + nm(id) + " off. +" + CFG.assistReward + " Slaps.", { color: "aqua" })
        );
        assistNames.push(nm(aid));
      }
    }
    p.recap = [
      "Knocked off by " + nm(killerInfo.k) + " (" + (GLOVES[killerInfo.g] || GLOVES.default).tag + " glove)",
      "Their hits: " + killerInfo.n + (assistNames.length ? "   Assists: " + assistNames.join(", ") : ""),
    ];
    flash(id, "Knocked off by " + nm(killerInfo.k));
    showRecap(id, p);
  }
}

export function warpCheck(id, p, pos, now, leavePracticeFn) {
  const prev = p.prevPos;
  p.prevPos = [pos[0], pos[1], pos[2]];
  if (!prev) return;
  if (now - (p.tpAt || 0) < 700) return;
  if (p.frozenPos && now < p.frozenUntil) return;
  if (Math.hypot(pos[0] - prev[0], pos[1] - prev[1], pos[2] - prev[2]) < CFG.warpDist) return;
  if (!p.inArena && !p.prac) return;

  const lockRem = CFG.warpLockMs - (now - p.lastHitTime);
  if (!p.prac && lockRem > 0) {
    tp(id, prev[0], prev[1], prev[2]);
    api.setVelocity(id, 0, 0, 0);
    p.prevPos = prev;
    flash(id, "No warping for " + Math.ceil(lockRem / 1000) + "s after a hit!");
    safe("msg", () =>
      api.sendMessage(id, "You can't warp for " + Math.ceil(lockRem / 1000) + "s after being hit.", { color: "red" })
    );
    return;
  }

  if (p.prac && leavePracticeFn) {
    leavePracticeFn(id, false);
  } else {
    if (COMBAT_HOOKS.onResetStreak) COMBAT_HOOKS.onResetStreak(id, false);
    resetCombatState(id);
    setLobbyState(id);
    p.protUntil = now + CFG.protectMs;
    safe("msg", () => api.sendMessage(id, "You warped to spawn: peaceful mode, abilities off.", { color: "aqua" }));
  }
}
