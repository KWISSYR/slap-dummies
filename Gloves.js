import { CFG, GLOVES, KILLSTREAK_STAGES, STAR, getMasteryRank } from "./Config.js";
import {
  safe, okSafe, T, ent, nm, bcast, flash, sfx, tint, facing, solid,
  puff, puffPoint, ring, pillar, preset, abilityFx,
  mkBlock, killEnt, tether, removeOrbs,
} from "./Visuals.js";
import { P, WORLD_STATE, pd, tp, savePlayer, getKsStageConfig, refreshSpeed, getRewindPos, grantMovementGrace } from "./PlayerData.js";
import { giveSlaps, checkAchievements } from "./Progression.js";
import { recordQuestEvent } from "./Quests.js";
import { COMBAT_HOOKS, knock, near, nearPoint, findTarget, nearestTo, isMirrored, endRagdoll } from "./Combat.js";

// ============================================================================
// KILLSTREAK PROGRESSION (6 STAGES + ANTI-FARM PROTECTION)
// ============================================================================

function computeStageForKills(kills) {
  let stage = 0;
  for (let i = KILLSTREAK_STAGES.length - 1; i >= 0; i--) {
    if (kills >= KILLSTREAK_STAGES[i].kills) {
      stage = KILLSTREAK_STAGES[i].stage;
      break;
    }
  }
  return stage;
}

export function resetKillstreak(id, announce) {
  const p = P[id];
  if (!p) return;
  const oldStage = p.ksStage;
  const oldStreak = p.streak;
  p.ksStage = 0;
  p.streak = 0;
  p.tagSig = "";
  p.hudSig = "";
  p.btnGlove = null;
  if (p.glove === "killstreak" && oldStage > 0) {
    removeOrbs(p);
    p.orbRetry = 0;
    refreshSpeed(id);
    if (announce && oldStage >= 2) {
      bcast(
        [ent(id, "#ff6b6b"), T("'s Killstreak (" + oldStreak + " kills) was ended!", "#ffffff")],
        nm(id) + "'s Killstreak (" + oldStreak + " kills) was ended!",
        "orange"
      );
    }
  }
}

export function onKillstreakCredit(killerId, victimId, now) {
  const kp = P[killerId];
  if (!kp || kp.glove !== "killstreak" || kp.prac || !kp.inArena) return;

  const lastFromVictim = kp.victimKillAt[victimId] || 0;
  if (now - lastFromVictim < CFG.killstreakFarmMs) {
    safe("msg", () =>
      api.sendMessage(killerId, "Killstreak anti-farm: wait before gaining another stage kill from " + nm(victimId) + ".", { color: "gray" })
    );
    return;
  }
  kp.victimKillAt[victimId] = now;

  const newStage = computeStageForKills(kp.streak);
  if (newStage > kp.ksStage) {
    kp.ksStage = newStage;
    if (newStage > kp.ksMaxStage) {
      kp.ksMaxStage = newStage;
      kp.dirty = true;
    }
    const st = getKsStageConfig(newStage);
    kp.spinUntil = now + 2000;
    kp.tagSig = "";
    kp.hudSig = "";
    kp.btnGlove = null;
    removeOrbs(kp);
    kp.orbRetry = 0;
    refreshSpeed(killerId);

    const pos = safe("getPosition", () => api.getPosition(killerId));
    if (pos) {
      pillar(pos, [st.color, "#ffffff"], 28 + newStage * 6);
      ring(pos, [st.color, "#ff3b30"], 4 + newStage, 12);
      preset(st.preset, pos, 2.2);
    }
    sfx(killerId, "levelup");
    flash(killerId, STAR + " KILLSTREAK STAGE " + newStage + ": " + st.name + " " + STAR);
    safe("msg", () =>
      api.sendMessage(
        killerId,
        "KILLSTREAK EVOLVED -> Stage " + newStage + " (" + st.name + ")! Ability: " + st.abName + " | Power: " + st.f + "x",
        { color: "gold" }
      )
    );

    if (newStage >= 2) {
      bcast(
        [
          ent(killerId, st.color),
          T(" reached KILLSTREAK STAGE " + newStage + ": " + st.name + "!", st.color, true),
        ],
        nm(killerId) + " reached Killstreak Stage " + newStage + ": " + st.name + "!",
        "red"
      );
    }
    checkAchievements(killerId, kp);
  }
}

export function initKillstreakHooks() {
  COMBAT_HOOKS.onKill = onKillstreakCredit;
  COMBAT_HOOKS.onResetStreak = resetKillstreak;
}

export function useKillstreakAbility(id, p, now) {
  const stage = p.ksStage || 0;
  const st = getKsStageConfig(stage);
  const pos = api.getPosition(id);
  const f = facing(id);

  if (stage === 0) {
    p.speedBoostUntil = now + 2200;
    p.speedBoostMult = 1.25;
    p.armorUntil = now + 1000;
    refreshSpeed(id);
    flash(id, st.abName + "!");
    return true;
  }

  if (stage === 1) {
    if (!f) return false;
    api.applyImpulse(id, f[0] * 14, 2.5, f[1] * 14);
    p.dashUntil = now + 500;
    p.armorUntil = now + 700;
    flash(id, "BLOOD SURGE!");
    return true;
  }

  if (stage === 2) {
    const t = findTarget(id, 8);
    if (!t) {
      flash(id, "No target ahead");
      return false;
    }
    const len = t[1] || 1;
    knock(id, t[0], t[2] / len, t[3] / len, 1.5, 1.25, 1.2);
    tint(t[0], pd(t[0]), "rgba(255,80,0,0.55)", 280);
    puff(t[4], [st.color, "#ffffff"], 18, 5);
    sfx(t[0], "hit");
    return true;
  }

  if (stage === 3) {
    const list = near(id, 7);
    if (!list.length) {
      flash(id, "No one nearby");
      return false;
    }
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, 1.65, 1.3, 1.25);
      tint(item[0], pd(item[0]), "rgba(255,45,146,0.55)", 300);
    }
    ring(pos, [st.color, "#ff3b30"], 7, 14);
    sfx(id, "cannonFire");
    return true;
  }

  if (stage === 4) {
    const list = near(id, 8.5);
    if (!list.length) {
      flash(id, "No one nearby");
      return false;
    }
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, 1.85, 1.4, 1.35);
      pd(item[0]).slowUntil = now + 2000;
      refreshSpeed(item[0]);
      tint(item[0], pd(item[0]), "rgba(191,90,242,0.6)", 350);
    }
    pillar(pos, [st.color, "#ff2d92"], 32);
    ring(pos, [st.color, "#ffffff"], 8.5, 16);
    sfx(id, "cannonFire");
    return true;
  }

  const list = near(id, 10);
  if (!list.length) {
    flash(id, "No one in judgment range");
    return false;
  }
  for (let i = 0; i < list.length; i++) {
    const item = list[i], len = item[1] || 1;
    knock(id, item[0], item[2] / len, item[3] / len, 2.25, 1.55, 1.5);
    tint(item[0], pd(item[0]), "rgba(255,215,0,0.65)", 400);
  }
  pillar(pos, ["#ffd60a", "#ff3b30"], 44);
  ring(pos, ["#ffd60a", "#ff3b30"], 10, 18);
  preset("redFirecrackerLarge", pos, 2.8);
  sfx(id, "cannonFire");
  return true;
}

// ============================================================================
// SPATIAL HAZARDS, ZONES & DELAYED ECHO ENGINE
// ============================================================================

const ZONES = [];
const ECHOES = [];

export function addZone(z) {
  if (ZONES.length >= CFG.maxZones) {
    const oldest = ZONES.shift();
    if (oldest && oldest.eids) {
      for (let i = 0; i < oldest.eids.length; i++) killEnt(oldest.eids[i]);
    }
  }
  ZONES.push(z);
}

export function addEcho(echo) {
  if (ECHOES.length >= 24) ECHOES.shift();
  ECHOES.push(echo);
}

export function scheduleEchoHit(attackerId, victimId, dx, dz, forceMult, liftMult, now) {
  const v = P[victimId];
  if (!v || now >= v.echoUntil || !v.echoBy || !P[v.echoBy]) return;
  addEcho({
    at: now + CFG.echoDelayMs,
    caster: v.echoBy,
    victim: victimId,
    dx,
    dz,
    f: forceMult * 0.72,
    l: liftMult * 0.85,
  });
}

function cleanupZoneEnts(z) {
  if (!z.eids) return;
  for (let i = 0; i < z.eids.length; i++) killEnt(z.eids[i]);
  z.eids.length = 0;
}

export function cleanupAllZones() {
  while (ZONES.length) cleanupZoneEnts(ZONES.pop());
  ECHOES.length = 0;
}

function getActivePlayers(pracMode) {
  const ids = api.getPlayerIds();
  const out = [];
  const now = Date.now();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = P[id];
    if (!p || !p.inArena || p.prac !== !!pracMode) continue;
    if (now < p.protUntil || now < p.ghostUntil) continue;
    const pos = safe("getPosition", () => api.getPosition(id));
    if (pos) out.push([id, p, pos]);
  }
  return out;
}

export function tickZones(now, dt) {
  for (let i = ECHOES.length - 1; i >= 0; i--) {
    const ec = ECHOES[i];
    if (now < ec.at) continue;
    ECHOES.splice(i, 1);
    const vp = P[ec.victim];
    if (!vp || !vp.inArena || now < vp.protUntil || now < vp.ghostUntil) continue;
    const vpos = safe("getPosition", () => api.getPosition(ec.victim));
    if (!vpos) continue;
    knock(ec.caster, ec.victim, ec.dx, ec.dz, ec.f, ec.l, 0.9, true);
    ring(vpos, "echo", 3.2, 10);
    puff(vpos, "echo", 16, 4);
    tint(ec.victim, vp, "rgba(191,90,242,0.5)", 220);
    sfx(ec.victim, "magicAccent");
    flash(ec.victim, "ECHO HIT!");
  }

  for (let i = ZONES.length - 1; i >= 0; i--) {
    const z = ZONES[i];
    if (now >= z.until) {
      if (z.kind === "cyclone") {
        const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          const item = foes[k], len = item[1] || 1;
          knock(z.owner, item[0], item[2] / len, item[3] / len, CFG.cycloneOutForce, CFG.cycloneLift, 1.35);
          tint(item[0], pd(item[0]), "rgba(200,244,255,0.55)", 300);
          giveSlaps(z.owner, 1);
        }
        ring(z.pos, "cyclone", z.radius, 16);
        preset("whiteFirecrackerLarge", z.pos, 2.4);
        sfx(z.owner, "cannonFire");
      } else if (z.kind === "gravity") {
        const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          api.applyImpulse(foes[k][0], 0, -14, 0);
          tint(foes[k][0], pd(foes[k][0]), "rgba(191,90,242,0.55)", 260);
          giveSlaps(z.owner, 1);
        }
        ring(z.pos, "gravity", z.radius, 12);
        sfx(z.owner, "stomp");
      } else if (z.kind === "decoy") {
        const foes = nearPoint(z.pos, CFG.decoyRadius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          const item = foes[k], len = item[1] || 1;
          knock(z.owner, item[0], item[2] / len, item[3] / len, 1.45, 1.15, 1.1);
          tint(item[0], pd(item[0]), "rgba(255,215,0,0.55)", 250);
          giveSlaps(z.owner, 1);
        }
        puff(z.pos, "decoy", 20, 5);
        ring(z.pos, "decoy", CFG.decoyRadius, 12);
        preset("pinkFirecrackerSmall", z.pos, 1.8);
      } else if (z.kind === "singularity") {
        const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          const item = foes[k], len = item[1] || 1;
          knock(z.owner, item[0], item[2] / len, item[3] / len, CFG.singularityForce, 1.4, 1.4);
          tint(item[0], pd(item[0]), "rgba(94,92,230,0.6)", 320);
          giveSlaps(z.owner, 1);
        }
        pillar(z.pos, "singularity", 36);
        ring(z.pos, "singularity", z.radius, 16);
        preset("purpleFirecrackerLarge", z.pos, 2.8);
        sfx(z.owner, "cannonFire");
      } else if (z.kind === "nova_charge") {
        const foes = nearPoint(z.pos, CFG.novaRadius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          const item = foes[k], len = item[1] || 1;
          const falloff = 1 - 0.35 * (item[1] / CFG.novaRadius);
          knock(z.owner, item[0], item[2] / len, item[3] / len, CFG.novaForce * falloff, 1.55, 1.55);
          tint(item[0], pd(item[0]), "rgba(255,215,0,0.65)", 380);
          giveSlaps(z.owner, 1);
        }
        pillar(z.pos, "nova", 55);
        ring(z.pos, "nova", CFG.novaRadius, 20);
        preset("yellowFirecrackerLarge", z.pos, 3.0);
        preset("pinkFirecrackerLarge", z.pos, 2.5);
        sfx(z.owner, "cannonFire");
        addZone({
          kind: "nova_wave2",
          owner: z.owner,
          prac: z.prac,
          pos: z.pos,
          until: now + 260,
        });
      } else if (z.kind === "nova_wave2") {
        ring(z.pos, ["#30d158", "#64d2ff"], CFG.novaRadius * 1.15, 18);
      } else if (z.kind === "eclipse") {
        const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          const item = foes[k], len = item[1] || 1;
          knock(z.owner, item[0], item[2] / len, item[3] / len, 2.05, 1.45, 1.45);
          tint(item[0], pd(item[0]), "rgba(191,90,242,0.65)", 340);
          giveSlaps(z.owner, 1);
        }
        pillar(z.pos, "eclipse", 42);
        ring(z.pos, "eclipse", z.radius, 18);
        preset("purpleFirecrackerLarge", z.pos, 2.8);
        sfx(z.owner, "cannonFire");
      } else if (z.kind === "divine") {
        const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          const item = foes[k], len = item[1] || 1;
          knock(z.owner, item[0], item[2] / len, item[3] / len, 2.35, 1.5, 1.5);
          tint(item[0], pd(item[0]), "rgba(255,215,0,0.7)", 360);
          giveSlaps(z.owner, 1);
        }
        pillar(z.pos, "godhand", 48);
        ring(z.pos, "godhand", z.radius, 20);
        preset("yellowFirecrackerLarge", z.pos, 3.0);
        sfx(z.owner, "cannonFire");
      }

      cleanupZoneEnts(z);
      ZONES.splice(i, 1);
      continue;
    }

    if (now - (z.lastTick || 0) < 100) continue;
    z.lastTick = now;

    if (z.kind === "trap") {
      const foes = nearPoint(z.pos, CFG.trapRadius, z.owner, z.prac);
      if (foes.length) {
        const target = foes[0][0];
        const tpState = pd(target);
        if (!isMirrored(target, z.owner)) {
          knock(z.owner, target, 0, 0, 0.4, 2.35, 1.2);
          tpState.slowUntil = now + 1800;
          refreshSpeed(target);
          tint(target, tpState, "rgba(255,80,0,0.6)", 300);
          flash(target, "SNAPPED BY TRAP!");
        } else {
          knock(target, z.owner, 0, 0, 0.4, 2.0, 1.0);
        }
        flash(z.owner, "TRAP TRIGGERED!");
        giveSlaps(z.owner, 2);
        puff(z.pos, "trap", 20, 5);
        preset("stomp", z.pos, 2);
        sfx(target, "hit");
        cleanupZoneEnts(z);
        ZONES.splice(i, 1);
      } else if (Math.random() < 0.35) {
        puffPoint([z.pos[0], z.pos[1] + 0.2, z.pos[2]], "trap");
      }
    } else if (z.kind === "portal") {
      const players = getActivePlayers(z.prac);
      for (let k = 0; k < players.length; k++) {
        const [pid, pp, pos] = players[k];
        if (now < (pp.portalReady || 0)) continue;
        const dA = Math.hypot(pos[0] - z.posA[0], pos[2] - z.posA[2]);
        const dB = Math.hypot(pos[0] - z.posB[0], pos[2] - z.posB[2]);
        if (dA <= 1.5 && Math.abs(pos[1] - z.posA[1]) < 2.2) {
          pp.portalReady = now + 1500;
          tp(pid, z.posB[0], z.posB[1] + 0.2, z.posB[2]);
          puff(z.posB, "portal", 14, 4);
          sfx(pid, "teleport");
          flash(pid, "WARPED!");
        } else if (dB <= 1.5 && Math.abs(pos[1] - z.posB[1]) < 2.2) {
          pp.portalReady = now + 1500;
          tp(pid, z.posA[0], z.posA[1] + 0.2, z.posA[2]);
          puff(z.posA, "portal", 14, 4);
          sfx(pid, "teleport");
          flash(pid, "WARPED!");
        }
      }
      puffPoint([z.posA[0], z.posA[1] + 0.8, z.posA[2]], "portal");
      puffPoint([z.posB[0], z.posB[1] + 0.8, z.posB[2]], "portal");
    } else if (z.kind === "cyclone") {
      const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
      for (let k = 0; k < foes.length; k++) {
        const item = foes[k], len = item[1] || 1;
        const nx = -item[2] / len, nz = -item[3] / len;
        const tx = -nz, tz = nx;
        api.applyImpulse(item[0], (nx * 4.5 + tx * 5.5), 1.6, (nz * 4.5 + tz * 5.5));
      }
      ring(z.pos, "cyclone", z.radius * 0.65, 8);
    } else if (z.kind === "gravity") {
      const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
      for (let k = 0; k < foes.length; k++) {
        api.applyImpulse(foes[k][0], 0, 3.2, 0);
      }
      puffPoint([z.pos[0] + (Math.random() - 0.5) * 4, z.pos[1] + 1.4, z.pos[2] + (Math.random() - 0.5) * 4], "gravity");
    } else if (z.kind === "decoy") {
      z.pos[0] += z.dir[0] * 1.1;
      z.pos[2] += z.dir[1] * 1.1;
      if (z.eids && z.eids[0]) {
        okSafe("decoyPos", () => api.setPosition(z.eids[0], z.pos[0], z.pos[1] + 1, z.pos[2]));
      }
      puffPoint([z.pos[0], z.pos[1] + 0.8, z.pos[2]], "decoy");
      const foes = nearPoint(z.pos, 2.0, z.owner, z.prac);
      if (foes.length) z.until = now;
    } else if (z.kind === "time") {
      const players = getActivePlayers(z.prac);
      for (let k = 0; k < players.length; k++) {
        const [pid, pp, pos] = players[k];
        if (pid === z.owner) continue;
        if (Math.hypot(pos[0] - z.pos[0], pos[2] - z.pos[2]) <= z.radius) {
          pp.slowUntil = Math.max(pp.slowUntil, now + 400);
          pp.abilityReady = Math.max(pp.abilityReady, now) + 120;
          refreshSpeed(pid);
        }
      }
      if (Math.random() < 0.5) ring(z.pos, "time", z.radius, 8);
    } else if (z.kind === "meteor") {
      z.y -= 2.4;
      if (z.eids && z.eids[0]) {
        okSafe("meteorPos", () => api.setPosition(z.eids[0], z.pos[0], z.y, z.pos[2]));
      }
      puff([z.pos[0], z.y, z.pos[2]], "meteor", 5, 2.2);
      if (z.y <= z.groundY + 0.6 || solid(z.pos[0], z.y - 0.4, z.pos[2])) {
        const impactPos = [z.pos[0], z.groundY, z.pos[2]];
        const foes = nearPoint(impactPos, CFG.meteorRadius, z.owner, z.prac);
        for (let k = 0; k < foes.length; k++) {
          const item = foes[k], len = item[1] || 1;
          knock(z.owner, item[0], item[2] / len, item[3] / len, CFG.meteorForce * (1 - 0.3 * (item[1] / CFG.meteorRadius)), 1.45, 1.4);
          tint(item[0], pd(item[0]), "rgba(255,90,0,0.65)", 320);
          giveSlaps(z.owner, 1);
        }
        pillar(impactPos, "meteor", 32);
        ring(impactPos, "meteor", CFG.meteorRadius, 16);
        preset("orangeFirecrackerLarge", impactPos, 2.8);
        preset("stomp", impactPos, 2.5);
        sfx(z.owner, "cannonFire");
        cleanupZoneEnts(z);
        ZONES.splice(i, 1);
      }
    } else if (z.kind === "singularity") {
      const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
      for (let k = 0; k < foes.length; k++) {
        const item = foes[k], len = item[1] || 1;
        if (len > 1.2) {
          api.applyImpulse(item[0], (-item[2] / len) * 6.5, 0.8, (-item[3] / len) * 6.5);
        }
      }
      puff(z.pos, "singularity", 6, 1.8);
    } else if (z.kind === "nova_charge") {
      const foes = nearPoint(z.pos, CFG.novaRadius, z.owner, z.prac);
      for (let k = 0; k < foes.length; k++) {
        const item = foes[k], len = item[1] || 1;
        if (len > 1.5) {
          api.applyImpulse(item[0], (-item[2] / len) * 3.5, 0.3, (-item[3] / len) * 3.5);
        }
      }
      ring(z.pos, "nova", CFG.novaRadius * 0.5, 10);
    } else if (z.kind === "eclipse") {
      const foes = nearPoint(z.pos, z.radius, z.owner, z.prac);
      for (let k = 0; k < foes.length; k++) {
        const item = foes[k], len = item[1] || 1;
        if (len > 1.3) {
          api.applyImpulse(item[0], (-item[2] / len) * 6.0, 0.6, (-item[3] / len) * 6.0);
        }
        pd(item[0]).slowUntil = Math.max(pd(item[0]).slowUntil || 0, now + 600);
      }
      ring(z.pos, "eclipse", z.radius * 0.6, 10);
    }
  }
}

// ============================================================================
// IMPACT & STATUS RESOLVERS (SLAM, SHATTER, BOMB)
// ============================================================================

export function slamBoom(id, p, pos) {
  p.slamUntil = 0;
  const list = near(id, CFG.slamRadius);
  for (let i = 0; i < list.length; i++) {
    const item = list[i], len = item[1] || 1;
    knock(id, item[0], item[2] / len, item[3] / len, CFG.slamForce * (1 - 0.4 * (item[1] / CFG.slamRadius)), 1.3, 1.2);
    tint(item[0], pd(item[0]), "rgba(255,150,0,0.55)", 250);
    giveSlaps(id, 1);
    sfx(item[0]);
  }
  flash(id, "BOOM!");
  puff(pos, "rocket", 24, 6);
  ring(pos, "rocket", CFG.slamRadius, 14);
  preset("stomp", pos, 2.5);
  sfx(id, "cannonFire");
}

export function shatter(id, p, pos) {
  const by = p.shatterBy;
  p.shatterBy = null;
  if (!by || !pd(by)) return;
  const bpos = safe("getPosition", () => api.getPosition(by));
  if (!bpos) return;
  const dx = pos[0] - bpos[0], dz = pos[2] - bpos[2];
  const len = Math.hypot(dx, dz) || 1;
  knock(by, id, dx / len, dz / len, CFG.shatterForce, 0.8, 1);
  tint(id, p, "rgba(255,255,255,0.6)", 250);
  puff(pos, "freeze", 20, 5);
  ring(pos, "freeze", 4, 12);
  flash(id, "SHATTERED!");
  sfx(id, "glass");
  giveSlaps(by, 1);
}

export function bombBoom(id, p, pos) {
  const by = p.bombBy;
  p.bombAt = 0;
  p.bombBy = null;
  if (!by || !P[by]) return;

  const list = near(id, CFG.bombRadius);
  let hitCount = 0;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item[0] !== by) {
      const len = item[1] || 1;
      knock(by, item[0], item[2] / len, item[3] / len, CFG.bombForce * (1 - 0.4 * (item[1] / CFG.bombRadius)), 1.2, 1.2);
      tint(item[0], pd(item[0]), "rgba(255,120,0,0.55)", 250);
      hitCount++;
    }
  }
  knock(by, id, 0, 0, CFG.bombForce, 1.5, 1.2);
  tint(id, p, "rgba(255,120,0,0.6)", 300);
  giveSlaps(by, 1 + hitCount);
  puff(pos, "bomb", 28, 6);
  ring(pos, "bomb", CFG.bombRadius, 14);
  preset("redFirecrackerLarge", pos, 2.5);
  flash(by, "BOOM! Bomb exploded");
  sfx(id, "cannonFire");
}

// ============================================================================
// ALL 32 GLOVE ABILITIES (BASIC, ADVANCED, RARE, LEGENDARY, EXTREME, SPECIAL)
// ============================================================================

export const ABILITIES = {
  // COMMON & UNCOMMON
  default(id, p, now) {
    const f = facing(id);
    if (!f) return false;
    api.applyImpulse(id, f[0] * CFG.chargeDash, 2.5, f[1] * CFG.chargeDash);
    p.dashUntil = now + CFG.chargeMs;
    p.armorUntil = now + CFG.chargeArmorMs;
    return true;
  },

  power(id, p, now) {
    p.chargeUntil = now + CFG.overMs;
    flash(id, "OVERCHARGED! Slap now!");
    return true;
  },

  rocket(id, p, now) {
    const f = facing(id);
    api.applyImpulse(id, f ? f[0] * CFG.slamForward : 0, CFG.slamUp, f ? f[1] * CFG.slamForward : 0);
    p.slamArm = now + CFG.slamArmMs;
    p.slamUntil = now + CFG.slamMaxMs;
    return true;
  },

  spring(id, p, now) {
    const f = facing(id);
    api.applyImpulse(id, f ? f[0] * CFG.springDash : 0, CFG.springHop, f ? f[1] * CFG.springDash : 0);
    p.armorUntil = now + 700;
    flash(id, "BOING!");
    return true;
  },

  shield(id, p, now) {
    p.shieldUntil = now + CFG.shieldMs;
    p.armorUntil = now + CFG.shieldMs;
    flash(id, "AEGIS GUARD ACTIVE!");
    return true;
  },

  freeze(id, p, now) {
    const list = near(id, CFG.freezeRadius);
    if (!list.length) {
      flash(id, "No one nearby");
      return false;
    }
    for (let i = 0; i < list.length; i++) {
      const vid = list[i][0];
      if (isMirrored(vid, id)) {
        const myPos = api.getPosition(id);
        p.frozenUntil = now + CFG.freezeMs;
        p.frozenPos = [myPos[0], myPos[1], myPos[2]];
        p.shatterBy = vid;
        tint(id, p, "rgba(120,220,255,0.55)", CFG.freezeMs);
        continue;
      }
      const vp = pd(vid);
      const vpos = list[i][4];
      vp.frozenUntil = now + CFG.freezeMs;
      vp.frozenPos = [vpos[0], vpos[1], vpos[2]];
      vp.shatterBy = id;
      vp.lastHitBy = id;
      vp.lastHitTime = now;
      safe("msg", () => api.sendMessage(vid, "You've been frozen!", { color: "aqua" }));
      tint(vid, vp, "rgba(120,220,255,0.55)", CFG.freezeMs);
      puff(vpos, "freeze", 16, 3);
      giveSlaps(id, 1);
    }
    return true;
  },

  swap(id) {
    const t = findTarget(id, CFG.swapRange);
    if (!t) {
      flash(id, "No target in front");
      return false;
    }
    const vid = t[0];
    if (isMirrored(vid, id)) {
      const len = t[1] || 1;
      knock(vid, id, -t[2] / len, -t[3] / len, 1.0, 0.8, 0.9, true);
      return true;
    }
    const pA = api.getPosition(id);
    const pB = api.getPosition(vid);
    tp(id, pB[0], pB[1], pB[2]);
    tp(vid, pA[0], pA[1], pA[2]);
    const dx = pA[0] - pB[0], dz = pA[2] - pB[2];
    const len = Math.hypot(dx, dz) || 1;
    knock(id, vid, dx / len, dz / len, CFG.swapShove, 0.6, 0.8);
    tint(vid, pd(vid), "rgba(191,90,242,0.5)", 300);
    puff(pA, "swap", 14, 4);
    puff(pB, "swap", 14, 4);
    giveSlaps(id, 1);
    return true;
  },

  pull(id) {
    const t = findTarget(id, CFG.pullRange);
    if (!t) {
      flash(id, "No target in front");
      return false;
    }
    const vid = t[0], len = t[1] || 1;
    if (isMirrored(vid, id)) {
      knock(vid, id, t[2] / len, t[3] / len, CFG.pullForce, 0.5, 1, true);
      tether(vid, id, "Block of Diamond");
      return true;
    }
    knock(id, vid, -t[2] / len, -t[3] / len, CFG.pullForce, 0.45, 1);
    tint(vid, pd(vid), "rgba(48,209,88,0.5)", 300);
    puff(t[4], "pull", 14, 4);
    tether(id, vid, "Block of Diamond");
    giveSlaps(id, 1);
    return true;
  },

  shock(id, p) {
    const t = findTarget(id, CFG.chainRange);
    if (!t) {
      flash(id, "No target in front");
      return false;
    }
    if (isMirrored(t[0], id)) {
      const len = t[1] || 1;
      knock(t[0], id, -t[2] / len, -t[3] / len, CFG.chainForce, 1.1, 1.2, true);
      tether(t[0], id, "Block of Gold");
      return true;
    }
    const seen = { [id]: true };
    let curId = t[0];
    let prevPos = api.getPosition(id);
    let prevId = id;
    let force = CFG.chainForce;

    for (let i = 0; i < CFG.chainCount; i++) {
      seen[curId] = true;
      const cpos = api.getPosition(curId);
      const dx = cpos[0] - prevPos[0], dz = cpos[2] - prevPos[2];
      const len = Math.hypot(dx, dz) || 1;
      knock(id, curId, dx / len, dz / len, force, 1.1, 1.2);
      tint(curId, pd(curId), "rgba(255,215,0,0.6)", 300);
      puff(cpos, "shock", 14, 4);
      tether(prevId, curId, "Block of Gold");
      sfx(curId, "zapAccent");
      giveSlaps(id, 1);

      const nxt = nearestTo(cpos, CFG.chainJump, seen, p.prac);
      if (!nxt) break;
      prevId = curId;
      prevPos = cpos;
      curId = nxt[0];
      force *= CFG.chainFalloff;
    }
    return true;
  },

  launch(id) {
    const t = findTarget(id, CFG.launchRange);
    if (!t) {
      flash(id, "No target in front");
      return false;
    }
    const vid = t[0], len = t[1] || 1;
    if (isMirrored(vid, id)) {
      knock(vid, id, -t[2] / len * 0.3, -t[3] / len * 0.3, 0.7, 2.8, 1.3, true);
      return true;
    }
    knock(id, vid, (t[2] / len) * 0.3, (t[3] / len) * 0.3, 0.7, 3.0, 1.4);
    tint(vid, pd(vid), "rgba(94,92,230,0.5)", 300);
    puff(t[4], "launch", 16, 5);
    giveSlaps(id, 1);
    return true;
  },

  anchor(id, p, now) {
    p.anchorUntil = now + CFG.anchorMs;
    refreshSpeed(id);
    flash(id, "IRON ANCHOR DROPPED!");
    return true;
  },

  trap(id, p, now) {
    const pos = api.getPosition(id);
    const eid = mkBlock("Red Concrete", 0.65, true);
    if (eid) safe("trapPos", () => api.setPosition(eid, pos[0], pos[1] + 0.25, pos[2]));
    addZone({
      kind: "trap",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      until: now + CFG.trapMs,
      eids: eid ? [eid] : [],
    });
    flash(id, "SNAP TRAP PLACED!");
    return true;
  },

  dash(id) {
    const f = facing(id);
    if (!f) return false;
    const pos = api.getPosition(id);
    puff(pos, "dash", 12, 3);
    let dist = CFG.dashDist;
    while (dist > 1.5) {
      const tx = pos[0] + f[0] * dist;
      const tz = pos[2] + f[1] * dist;
      if (!solid(tx, pos[1] + 0.3, tz) && !solid(tx, pos[1] + 1.3, tz)) {
        tp(id, tx, pos[1] + 0.1, tz);
        puff([tx, pos[1] + 0.2, tz], "dash", 14, 4);
        sfx(id, "teleport");
        return true;
      }
      dist -= 1.2;
    }
    api.applyImpulse(id, f[0] * 12, 3, f[1] * 12);
    return true;
  },

  // RARE & EPIC
  magnet(id, p) {
    const f = facing(id);
    const pos = api.getPosition(id);
    const focus = f ? [pos[0] + f[0] * 4, pos[1], pos[2] + f[1] * 4] : pos;
    const list = nearPoint(pos, CFG.magnetRadius, id, p.prac);
    if (!list.length) {
      flash(id, "No one nearby");
      return false;
    }
    for (let i = 0; i < list.length; i++) {
      const vid = list[i][0], vpos = list[i][4];
      const dx = focus[0] - vpos[0], dz = focus[2] - vpos[2];
      const len = Math.hypot(dx, dz) || 1;
      knock(id, vid, dx / len, dz / len, CFG.magnetForce, 0.55, 1);
      tint(vid, pd(vid), "rgba(255,59,48,0.5)", 300);
      tether(id, vid, "Red Concrete");
      giveSlaps(id, 1);
    }
    ring(focus, "magnet", 3.5, 10);
    return true;
  },

  bomb(id, p, now) {
    const t = findTarget(id, CFG.bombRange);
    if (!t) {
      flash(id, "No target in front");
      return false;
    }
    const vid = t[0];
    if (isMirrored(vid, id)) {
      p.bombAt = now + CFG.bombMs;
      p.bombBy = vid;
      tint(id, p, "rgba(255,120,0,0.5)", CFG.bombMs);
      return true;
    }
    const vp = pd(vid);
    vp.bombAt = now + CFG.bombMs;
    vp.bombBy = id;
    safe("msg", () => api.sendMessage(vid, "You have a BOMB on you! Run away from people!", { color: "red" }));
    tint(vid, vp, "rgba(255,120,0,0.5)", CFG.bombMs);
    puff(t[4], "bomb", 10, 3);
    flash(id, "Bomb planted!");
    return true;
  },

  cyclone(id, p, now) {
    const pos = api.getPosition(id);
    const list = near(id, CFG.cycloneRadius);
    if (!list.length) {
      flash(id, "No one nearby");
      return false;
    }
    addZone({
      kind: "cyclone",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      radius: CFG.cycloneRadius,
      until: now + CFG.cycloneInMs,
      eids: [],
    });
    flash(id, "TEMPEST VORTEX!");
    return true;
  },

  ghost(id, p, now) {
    const f = facing(id);
    p.ghostUntil = now + CFG.ghostMs;
    p.armorUntil = now + CFG.ghostMs;
    if (f) api.applyImpulse(id, f[0] * CFG.ghostDash, 1.5, f[1] * CFG.ghostDash);
    flash(id, "GHOST MODE!");
    return true;
  },

  gravity(id, p, now) {
    const pos = api.getPosition(id);
    const eid = mkBlock("Purple Concrete", 0.9, true);
    if (eid) safe("gravPos", () => api.setPosition(eid, pos[0], pos[1] + 2.2, pos[2]));
    addZone({
      kind: "gravity",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      radius: CFG.gravityRadius,
      until: now + CFG.gravityMs,
      eids: eid ? [eid] : [],
    });
    flash(id, "ZERO-G WELL!");
    return true;
  },

  mirror(id, p, now) {
    p.mirrorUntil = now + CFG.mirrorMs;
    flash(id, "MIRROR STANCE ACTIVE!");
    return true;
  },

  phantom(id, p, now) {
    const list = near(id, CFG.phantomRange);
    if (!list.length) {
      flash(id, "No target in range");
      return false;
    }
    list.sort((a, b) => a[1] - b[1]);
    const targetId = list[0][0];
    const tpos = list[0][4];
    const tf = facing(targetId);
    const bx = tf ? tpos[0] - tf[0] * 1.8 : tpos[0] - 1.8;
    const bz = tf ? tpos[2] - tf[1] * 1.8 : tpos[2] - 1.8;

    puff(api.getPosition(id), "phantom", 14, 4);
    if (!solid(bx, tpos[1] + 0.4, bz)) {
      tp(id, bx, tpos[1] + 0.15, bz);
    } else {
      tp(id, tpos[0], tpos[1] + 1.2, tpos[2]);
    }
    p.speedBoostUntil = now + CFG.phantomMs;
    p.speedBoostMult = 1.25;
    refreshSpeed(id);
    puff(api.getPosition(id), "phantom", 18, 5);
    sfx(id, "teleport");
    flash(id, "SHADOW STALK!");
    return true;
  },

  reaper(id, p) {
    const list = near(id, CFG.reapRadius);
    if (!list.length) {
      flash(id, "No one nearby");
      return false;
    }
    const mult = CFG.reapForce + CFG.reapStreak * Math.min(p.streak, 10);
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, mult, 1.2, 1.3);
      tint(item[0], pd(item[0]), "rgba(138,43,226,0.55)", 300);
      giveSlaps(id, 1);
    }
    return true;
  },

  portal(id, p, now) {
    const pos = api.getPosition(id);
    const f = facing(id) || [1, 0];
    const posA = [pos[0], pos[1], pos[2]];
    const posB = [pos[0] + f[0] * CFG.portalDist, pos[1], pos[2] + f[1] * CFG.portalDist];

    const eA = mkBlock("Block of Diamond", 0.75, true);
    const eB = mkBlock("Block of Emerald", 0.75, true);
    if (eA) safe("pAPos", () => api.setPosition(eA, posA[0], posA[1] + 1.0, posA[2]));
    if (eB) safe("pBPos", () => api.setPosition(eB, posB[0], posB[1] + 1.0, posB[2]));

    p.portalReady = now + 1000;
    addZone({
      kind: "portal",
      owner: id,
      prac: p.prac,
      posA,
      posB,
      until: now + CFG.portalMs,
      eids: [eA, eB].filter(Boolean),
    });
    flash(id, "WARP GATES OPENED!");
    return true;
  },

  rewind(id) {
    const t = findTarget(id, CFG.rewindRange);
    let subjectId = t ? t[0] : id;
    if (t && isMirrored(t[0], id)) subjectId = id;

    const sp = pd(subjectId);
    const oldPos = getRewindPos(sp, Date.now());
    if (!oldPos) {
      flash(id, "Not enough time history yet");
      return false;
    }
    const curPos = api.getPosition(subjectId);
    puff(curPos, "rewind", 14, 4);
    tp(subjectId, oldPos[0], oldPos[1] + 0.15, oldPos[2]);
    api.setVelocity(subjectId, 0, 0, 0);
    puff(oldPos, "rewind", 18, 5);
    ring(oldPos, "rewind", 3.5, 10);
    sfx(subjectId, "teleport");
    if (subjectId !== id) {
      sp.lastHitBy = id;
      sp.lastHitTime = Date.now();
      giveSlaps(id, 1);
      flash(subjectId, "REWOUND IN TIME!");
    }
    flash(id, "TEMPORAL RECALL!");
    return true;
  },

  leech(id, p, now) {
    const t = findTarget(id, CFG.leechRange);
    if (!t) {
      flash(id, "No target in front");
      return false;
    }
    const vid = t[0];
    if (isMirrored(vid, id)) {
      p.slowUntil = now + 2500;
      p.abilityReady = Math.max(p.abilityReady, now) + CFG.leechCdDrain;
      refreshSpeed(id);
      return true;
    }
    const vp = pd(vid);
    vp.slowUntil = now + 2600;
    vp.abilityReady = Math.max(vp.abilityReady, now) + CFG.leechCdDrain;
    vp.lastHitBy = id;
    vp.lastHitTime = now;
    refreshSpeed(vid);

    p.speedBoostUntil = now + 2600;
    p.speedBoostMult = 1.28;
    p.armorUntil = now + 1800;
    p.abilityReady = Math.max(now, p.abilityReady - CFG.leechCdGain);
    refreshSpeed(id);

    tether(vid, id, "Red Concrete");
    tint(vid, vp, "rgba(255,45,146,0.5)", 300);
    giveSlaps(id, 1);
    flash(vid, "ENERGY SYPHONED!");
    flash(id, "SYPHON BOOST!");
    return true;
  },

  decoy(id, p, now) {
    const pos = api.getPosition(id);
    const f = facing(id) || [1, 0];
    const eid = mkBlock("Yellow Concrete", 0.85, false);
    if (eid) safe("decoyInit", () => api.setPosition(eid, pos[0] + f[0], pos[1] + 1, pos[2] + f[1]));
    addZone({
      kind: "decoy",
      owner: id,
      prac: p.prac,
      pos: [pos[0] + f[0], pos[1], pos[2] + f[1]],
      dir: [f[0], f[1]],
      until: now + CFG.decoyMs,
      eids: eid ? [eid] : [],
    });
    flash(id, "ILLUSION DECOY SENT!");
    return true;
  },

  // LEGENDARY & EXTREME
  time(id, p, now) {
    const pos = api.getPosition(id);
    p.speedBoostUntil = now + CFG.timeMs;
    p.speedBoostMult = 1.35;
    refreshSpeed(id);

    const eid = mkBlock("Block of Gold", 0.9, true);
    if (eid) safe("timeOrbPos", () => api.setPosition(eid, pos[0], pos[1] + 2.5, pos[2]));
    addZone({
      kind: "time",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      radius: CFG.timeRadius,
      until: now + CFG.timeMs,
      eids: eid ? [eid] : [],
    });
    flash(id, "CHRONO FIELD!");
    return true;
  },

  echo(id, p, now) {
    const t = findTarget(id, CFG.echoRange);
    if (!t) {
      flash(id, "No target in front");
      return false;
    }
    const vid = t[0];
    if (isMirrored(vid, id)) {
      p.echoUntil = now + CFG.echoMs;
      p.echoBy = vid;
      tint(id, p, "rgba(191,90,242,0.5)", 300);
      return true;
    }
    const vp = pd(vid);
    vp.echoUntil = now + CFG.echoMs;
    vp.echoBy = id;
    tether(id, vid, "Block of Diamond");
    tint(vid, vp, "rgba(191,90,242,0.5)", 300);
    flash(vid, "RESONANCE MARKED!");
    flash(id, "ECHO MARK APPLIED!");
    return true;
  },

  meteor(id, p, now) {
    const pos = api.getPosition(id);
    const f = facing(id) || [1, 0];
    const tx = pos[0] + f[0] * CFG.meteorRange * 0.7;
    const tz = pos[2] + f[1] * CFG.meteorRange * 0.7;
    const startY = pos[1] + 14;

    const eid = mkBlock("Lava", 1.4, true);
    if (eid) safe("meteorInit", () => api.setPosition(eid, tx, startY, tz));

    ring([tx, pos[1], tz], "meteor", CFG.meteorRadius, 12);
    addZone({
      kind: "meteor",
      owner: id,
      prac: p.prac,
      pos: [tx, pos[1], tz],
      y: startY,
      groundY: pos[1],
      until: now + 3500,
      eids: eid ? [eid] : [],
    });
    flash(id, "METEOR INBOUND!");
    return true;
  },

  singularity(id, p, now) {
    const pos = api.getPosition(id);
    const f = facing(id) || [1, 0];
    const cx = pos[0] + f[0] * CFG.singularityRange;
    const cz = pos[2] + f[1] * CFG.singularityRange;

    const eid = mkBlock("Obsidian", 1.25, true);
    if (eid) safe("singInit", () => api.setPosition(eid, cx, pos[1] + 1.4, cz));

    addZone({
      kind: "singularity",
      owner: id,
      prac: p.prac,
      pos: [cx, pos[1], cz],
      radius: CFG.singularityRadius,
      until: now + CFG.singularityMs,
      eids: eid ? [eid] : [],
    });
    flash(id, "SINGULARITY SUMMONED!");
    return true;
  },

  titan(id, p, now) {
    const pos = api.getPosition(id);
    p.titanUntil = now + CFG.titanMs;
    p.armorUntil = now + CFG.titanMs;
    refreshSpeed(id);

    const list = near(id, CFG.titanRadius);
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, CFG.titanForce, 1.35, 1.35);
      tint(item[0], pd(item[0]), "rgba(255,215,0,0.6)", 300);
      giveSlaps(id, 1);
    }
    pillar(pos, "titan", 34);
    ring(pos, "titan", CFG.titanRadius, 16);
    preset("stomp", pos, 2.5);
    sfx(id, "cannonFire");
    flash(id, "TITAN CRUSH!");
    return true;
  },

  nova(id, p, now) {
    const pos = api.getPosition(id);
    const eid = mkBlock("Block of Emerald", 1.2, true);
    if (eid) safe("novaCorePos", () => api.setPosition(eid, pos[0], pos[1] + 2.0, pos[2]));

    addZone({
      kind: "nova_charge",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      until: now + CFG.novaPullMs,
      eids: eid ? [eid] : [],
    });
    preset("aura", pos, 2.5);
    sfx(id, "magicAccent");
    flash(id, "SUPERNOVA CHARGING!");
    return true;
  },

  // SPECIAL & SECRET
  killstreak: useKillstreakAbility,

  eclipse(id, p, now) {
    const pos = api.getPosition(id);
    const eid = mkBlock("Obsidian", 1.35, true);
    if (eid) safe("eclipseOrbPos", () => api.setPosition(eid, pos[0], pos[1] + 2.2, pos[2]));
    p.armorUntil = now + 1500;
    addZone({
      kind: "eclipse",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      radius: 8.5,
      until: now + 900,
      eids: eid ? [eid] : [],
    });
    preset("purpleFirecrackerLarge", pos, 2.4);
    flash(id, "VOID UMBRA!");
    return true;
  },

  celestial(id, p, now) {
    const f = facing(id);
    const pos = api.getPosition(id);
    if (f) api.applyImpulse(id, f[0] * 14, 5.5, f[1] * 14);
    p.speedBoostUntil = now + 2600;
    p.speedBoostMult = 1.32;
    p.armorUntil = now + 1600;
    refreshSpeed(id);

    const list = near(id, 8);
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, 1.9, 1.65, 1.35);
      tint(item[0], pd(item[0]), "rgba(100,210,255,0.65)", 320);
      giveSlaps(id, 1);
    }
    pillar(pos, "celestial", 36);
    ring(pos, "celestial", 8, 16);
    preset("yellowFirecrackerLarge", pos, 2.8);
    sfx(id, "cannonFire");
    flash(id, "ASTRAL JUDGEMENT!");
    return true;
  },

  hammer(id, p, now) {
    const pos = api.getPosition(id);
    const list = near(id, 6.5);
    if (!list.length) {
      flash(id, "No one nearby");
      return false;
    }
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, 1.85, 1.35, 1.35);
      const vp = pd(item[0]);
      vp.slowUntil = Math.max(vp.slowUntil || 0, now + 1800);
      refreshSpeed(item[0]);
      tint(item[0], vp, "rgba(255,215,0,0.65)", 320);
      giveSlaps(id, 1);
    }
    pillar(pos, "hammer", 32);
    ring(pos, "hammer", 6.5, 16);
    preset("yellowFirecrackerLarge", pos, 2.4);
    sfx(id, "zapAccent");
    flash(id, "THUNDER HAMMER!");
    return true;
  },

  vortex(id, p, now) {
    const pos = api.getPosition(id);
    const list = near(id, 8.5);
    if (!list.length) {
      flash(id, "No one in vortex range");
      return false;
    }
    addZone({
      kind: "cyclone",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      radius: 8.5,
      until: now + 700,
      eids: [],
    });
    ring(pos, "vortex", 8.5, 14);
    flash(id, "VOID CYCLONE!");
    return true;
  },

  berserker(id, p, now) {
    const pos = api.getPosition(id);
    p.rageUntil = now + 4500;
    p.armorUntil = now + 2200;
    refreshSpeed(id);
    ring(pos, "berserker", 4.5, 14);
    preset("redFirecrackerLarge", pos, 2.2);
    sfx(id, "cannonFire");
    flash(id, "BLOOD RAGE (1.45x SLAP POWER)!");
    return true;
  },

  godhand(id, p, now) {
    const pos = api.getPosition(id);
    const list = near(id, 7.2);
    for (let i = 0; i < list.length; i++) {
      const vid = list[i][0];
      if (!isMirrored(vid, id)) {
        const vp = pd(vid);
        vp.frozenUntil = Math.max(vp.frozenUntil || 0, now + 1300);
        vp.frozenPos = [list[i][4][0], list[i][4][1], list[i][4][2]];
        vp.shatterBy = id;
        vp.lastHitBy = id;
        vp.lastHitTime = now;
        tint(vid, vp, "rgba(255,215,0,0.65)", 1300);
      }
    }
    addZone({
      kind: "divine",
      owner: id,
      prac: p.prac,
      pos: [pos[0], pos[1], pos[2]],
      radius: 7.5,
      until: now + 1150,
      eids: [],
    });
    pillar(pos, "godhand", 38);
    flash(id, "DIVINE JUDGMENT!");
    return true;
  },

  phoenix(id, p, now) {
    const pos = api.getPosition(id);
    endRagdoll(id);
    p.frozenUntil = 0;
    p.frozenPos = null;
    p.shatterBy = null;
    p.slowUntil = 0;
    p.bombAt = 0;
    p.armorUntil = now + 1600;
    refreshSpeed(id);
    api.applyImpulse(id, 0, 12.5, 0);

    const list = near(id, 6.5);
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, 1.9, 1.5, 1.35);
      tint(item[0], pd(item[0]), "rgba(255,140,0,0.65)", 320);
      giveSlaps(id, 1);
    }
    pillar(pos, "phoenix", 34);
    ring(pos, "phoenix", 6.5, 16);
    preset("orangeFirecrackerLarge", pos, 2.8);
    sfx(id, "cannonFire");
    flash(id, "PHOENIX REBIRTH!");
    return true;
  },

  jester(id, p, now) {
    const roll = Math.floor(Math.random() * 3);
    const pos = api.getPosition(id);
    if (roll === 0) {
      const t = findTarget(id, 12);
      if (t) {
        const vid = t[0];
        const pB = api.getPosition(vid);
        tp(id, pB[0], pB[1], pB[2]);
        tp(vid, pos[0], pos[1], pos[2]);
        const len = t[1] || 1;
        knock(id, vid, -t[2] / len, -t[3] / len, 1.85, 1.4, 1.3);
        giveSlaps(id, 2);
        flash(id, "JESTER PRANK: BAIT & SWITCH!");
        preset("pinkFirecrackerLarge", pB, 2.2);
        return true;
      }
    }
    if (roll === 1) {
      const f = facing(id) || [1, 0];
      const tx = pos[0] + f[0] * 6;
      const tz = pos[2] + f[1] * 6;
      addZone({
        kind: "meteor",
        owner: id,
        prac: p.prac,
        pos: [tx, pos[1], tz],
        y: pos[1] + 10,
        groundY: pos[1],
        until: now + 2600,
        eids: [],
      });
      flash(id, "JESTER PRANK: CONFETTI METEOR!");
      return true;
    }
    const list = near(id, 7.2);
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(id, item[0], item[2] / len, item[3] / len, 1.95, 1.55, 1.4);
      giveSlaps(id, 1);
    }
    ring(pos, "jester", 7.2, 16);
    preset("pinkFirecrackerLarge", pos, 2.6);
    flash(id, "JESTER PRANK: PARTY SHOCKWAVE!");
    return true;
  },

  voidwalker(id, p, now) {
    const f = facing(id) || [0, 1];
    const originPos = api.getPosition(id);
    let dist = 12;
    let blinked = false;
    while (dist >= 2.5) {
      const tx = originPos[0] + f[0] * dist;
      const tz = originPos[2] + f[1] * dist;
      if (!solid(tx, originPos[1] + 0.3, tz) && !solid(tx, originPos[1] + 1.3, tz)) {
        tp(id, tx, originPos[1] + 0.15, tz);
        blinked = true;
        break;
      }
      dist -= 1.5;
    }
    if (!blinked) api.applyImpulse(id, f[0] * 14, 3.5, f[1] * 14);
    p.armorUntil = now + 1200;
    addZone({
      kind: "eclipse",
      owner: id,
      prac: p.prac,
      pos: [originPos[0], originPos[1], originPos[2]],
      radius: 7.2,
      until: now + 850,
      eids: [],
    });
    sfx(id, "teleport");
    flash(id, "ABYSSAL BLINK!");
    return true;
  },
};

// ============================================================================
// GLOVE MANAGER (EQUIPPING, COOLDOWNS, ALT-ACTION ROUTING)
// ============================================================================

export function initGloveManager() {
  COMBAT_HOOKS.onSlapApplied = scheduleEchoHit;
}

export function getAbilityDisplay(p) {
  const g = GLOVES[p.glove] || GLOVES.default;
  const mast = getMasteryRank(p.mastery ? p.mastery[p.glove] : 0);
  const evMult = p.inArena && !p.prac && WORLD_STATE.event && WORLD_STATE.event.id === "frenzy" ? 0.85 : 1;
  const effAbCd = Math.round(g.abCd * mast.cdMult * evMult);
  if (p.glove === "killstreak") {
    const st = getKsStageConfig(p.ksStage);
    return { name: st.abName, cd: g.cd, abCd: effAbCd, desc: g.abDesc };
  }
  return { name: g.abName, cd: g.cd, abCd: effAbCd, desc: g.abDesc };
}

export function getAbilityCooldownRemaining(id) {
  const p = pd(id);
  return Math.max(0, p.abilityReady - Date.now());
}

export function getSwitchCooldownRemaining(id) {
  const p = pd(id);
  return Math.max(0, p.switchReady - Date.now());
}

export function useAbility(id) {
  const p = pd(id);
  const now = Date.now();
  const ab = getAbilityDisplay(p);

  if (!p.inArena) {
    flash(id, "Abilities only work in the arena!");
    return false;
  }
  if (now - p.lastTry < 250) return false;
  p.lastTry = now;
  p.lastActive = now;

  if (p.glove !== "phoenix" && (p.rag || now < p.frozenUntil)) {
    flash(id, "Can't use it right now!");
    return false;
  }
  if (now < p.abilityReady) {
    flash(id, ab.name + " ready in " + Math.ceil((p.abilityReady - now) / 1000) + "s");
    return false;
  }

  const fn = ABILITIES[p.glove];
  if (!fn) return false;
  if (fn(id, p, now) === false) return false;

  p.abilityReady = now + ab.abCd;
  p.spinUntil = now + 1200;
  grantMovementGrace(id, 2200);
  recordQuestEvent(id, "ability", 1);
  flash(id, STAR + " " + ab.name + "! " + STAR);
  puff(api.getPosition(id), p.glove, 22, 5);
  abilityFx(id, p);
  sfx(id, "magicAccent");
  return true;
}

export function handleAltAction(id) {
  const p = pd(id);
  const now = Date.now();
  if (now - p.lastAltAt < 250) return false;
  p.lastAltAt = now;
  p.lastActive = now;
  if (!p.inArena) return false;
  return useAbility(id);
}

export function equipGlove(id, gloveId) {
  const g = GLOVES[gloveId];
  const p = pd(id);
  const now = Date.now();
  if (!g) return false;

  if (p.prac) {
    safe("msg", () => api.sendMessage(id, "You cannot switch gloves while inside the practice arena!", { color: "red" }));
    return false;
  }

  if (!p.un[gloveId]) {
    safe("msg", () =>
      api.sendMessage(
        id,
        g.secret
          ? "Locked! " + g.tag + " is a SECRET EVENT glove \u2014 find its relic during a super-rare event!"
          : "Locked! " + g.tag + " costs " + g.need + " Slaps in the Shop (you have " + p.slaps + ").",
        { color: "red" }
      )
    );
    return false;
  }
  if (p.glove === gloveId) {
    safe("msg", () => api.sendMessage(id, "You already have the " + g.tag + " glove equipped.", { color: "gray" }));
    return true;
  }

  const isFresh = p.fresh[gloveId];
  if (!isFresh && now < p.switchReady) {
    safe("msg", () =>
      api.sendMessage(id, "Wait " + Math.ceil((p.switchReady - now) / 1000) + "s before switching gloves.", { color: "red" })
    );
    return false;
  }

  if (isFresh) delete p.fresh[gloveId];
  else p.switchReady = now + CFG.switchCd;

  if (p.glove === "killstreak" && gloveId !== "killstreak") {
    resetKillstreak(id, false);
  }

  p.glove = gloveId;
  p.chargeUntil = 0;
  p.dashUntil = 0;
  p.slamUntil = 0;
  p.spinUntil = now + 1500;
  p.hudSig = "";
  p.tagSig = "";
  p.btnGlove = null;
  p.dirty = true;
  removeOrbs(p);
  p.orbRetry = 0;
  refreshSpeed(id);

  flash(id, STAR + " " + g.tag + " GLOVE " + STAR);
  safe("msg", () => api.sendMessage(id, "Equipped " + g.tag + ": " + g.d + " | Ability: " + g.abName, { color: "lime" }));
  savePlayer(id);
  return true;
}
