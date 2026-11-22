import {
  CFG, SPAWN, PRACTICE, DUEL_POS, PORTAL_COOLDOWN_MS, PORTAL_SEARCH_RADIUS,
  KOTH, EVENT_CFG, EVENTS, CRATE_CFG, BOSS_CFG, GLOVES, GORDER, STAR,
} from "./Config.js";
import {
  safe, okSafe, clearTint, flash, sfx, tint, bcast, T, ent, nm,
  ring, pillar, preset, mkBlock, killEnt, unlockFx,
  cleanupOrphans, cleanupPlayerEntities, cleanupAllAnimations,
  removeOrbs, thTick, fxTick,
} from "./Visuals.js";
import {
  P, LB, WORLD_STATE, pd, loadPlayer, savePlayer, saveAll, tp, grantMovementGrace,
  setLobbyState, setArenaState, refreshSpeed,
  recordPosHistory, lbTouch, lbTop, loadAllLb, touchAllLb,
  loadBans, saveBans, isPlayerBanned,
} from "./PlayerData.js";

import {
  claimDaily, playTick, checkAchievements, checkTitles, lobbyTab,
  giveSlaps, renderPhysicalLeaderboard,
} from "./Progression.js";
import { recordQuestEvent, ensureDailyQuestState } from "./Quests.js";
import {
  COMBAT_HOOKS, knock, near, nearPoint, resetCombatState, handleFall, warpCheck, tickRagdollPhysics, resolveDuelForfeit,
} from "./Combat.js";
import {
  resetKillstreak, useAbility, slamBoom, shatter, bombBoom, tickZones, cleanupAllZones,
} from "./Gloves.js";
import {
  INTERFACE_HOOKS, shopSync, handleLobbyBlockClick, leavePractice, updateHud, updateTag,
} from "./Interface.js";

let lastT = 0;
let lastLbSweep = 0;

// ============================================================================
// ARENA EVENTS (5-10 MIN COOLDOWN, 1-3 MIN DURATION + SECRET GLOVE EVENTS)
// ============================================================================

const REGULAR_EVENT_KEYS = ["low_grav", "frenzy", "slapple", "knockback", "shuffle"];
const SECRET_EVENT_KEYS = ["eclipse", "celestial"];
const SHUFFLE_POOL = ["hammer", "vortex", "berserker", "godhand", "meteor", "singularity", "titan", "nova", "cyclone", "gravity", "phantom", "reaper"];
const CRATE_BUFFS = ["ability_reset", "speed", "kb", "shield"];

export function scheduleNextEvent(now) {
  const span = Math.max(1000, EVENT_CFG.maxWaitMs - EVENT_CFG.minWaitMs);
  WORLD_STATE.nextEventAt = now + EVENT_CFG.minWaitMs + Math.floor(Math.random() * (span + 1));
}

export function cleanupEventDrops() {
  const drops = WORLD_STATE.eventDrops;
  for (let i = 0; i < drops.length; i++) {
    if (drops[i].eid) killEnt(drops[i].eid);
  }
  drops.length = 0;
}

function findArenaGrassSpot() {
  const yOrder = [-50, -49, -48, -51, -52, -47, -46, -45, -44, -43, -42, -41, -40];
  for (let i = 0; i < 36; i++) {
    const nx = Math.floor(KOTH.x + (2 * Math.random() - 1) * EVENT_CFG.spawnRadius);
    const nz = Math.floor(KOTH.z + (2 * Math.random() - 1) * EVENT_CFG.spawnRadius);
    for (let yi = 0; yi < yOrder.length; yi++) {
      const gy = yOrder[yi];
      if (gy < EVENT_CFG.arenaMinY || gy > EVENT_CFG.arenaMaxY) continue;
      const b0 = safe("event grass check", () => api.getBlock(nx, gy, nz));
      if (!b0 || String(b0).toLowerCase().indexOf("grass") < 0) continue;
      const b1 = safe("event air1", () => api.getBlock(nx, gy + 1, nz));
      const b2 = safe("event air2", () => api.getBlock(nx, gy + 2, nz));
      if ((!b1 || b1 === "Air") && (!b2 || b2 === "Air")) {
        return [nx + 0.5, gy + 1.4, nz + 0.5];
      }
    }
  }
  return null;
}

function spawnEventDrop(ev, now) {
  const spot = findArenaGrassSpot();
  if (!spot) return false;
  const eid = mkBlock(ev.dropBlock || "Block of Gold", ev.secretGlove ? 0.65 : 0.52, true);
  if (eid) {
    safe("eventDropPos", () => api.setPosition(eid, spot[0], spot[1], spot[2]));
  }
  WORLD_STATE.eventDrops.push({
    eid,
    x: spot[0],
    y: spot[1],
    z: spot[2],
    glove: ev.secretGlove || null,
    bornAt: now,
  });
  pillar([spot[0], spot[1] - 0.8, spot[2]], [ev.color || "#ffd60a", "#ffffff"], 18);
  return true;
}

function applyShuffleToPlayer(id, p, ev) {
  if (!p || p.prac) return;
  if (!p.shuffleSavedGlove) p.shuffleSavedGlove = p.glove;
  const gPick = (ev && ev.shuffleGlove) || SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)];
  if (GLOVES[gPick] && p.glove !== gPick) {
    p.glove = gPick;
    removeOrbs(p);
    p.orbRetry = 0;
    p.hudSig = "";
    p.tagSig = "";
    p.btnGlove = null;
    refreshSpeed(id);
  }
}

function restoreShuffleGlove(id, p) {
  if (!p || !p.shuffleSavedGlove) return;
  const orig = GLOVES[p.shuffleSavedGlove] ? p.shuffleSavedGlove : "default";
  p.shuffleSavedGlove = null;
  if (p.glove !== orig) {
    p.glove = orig;
    removeOrbs(p);
    p.orbRetry = 0;
    p.hudSig = "";
    p.tagSig = "";
    p.btnGlove = null;
    refreshSpeed(id);
  }
}

export function endEvent() {
  const ev = WORLD_STATE.event;
  if (!ev) return;
  WORLD_STATE.event = null;
  cleanupEventDrops();
  scheduleNextEvent(Date.now());

  const ids = api.getPlayerIds();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (P[id]) {
      restoreShuffleGlove(id, P[id]);
      P[id].hudSig = "";
      refreshSpeed(id);
    }
  }
  bcast(
    [T("EVENT ENDED: ", "#ffd60a", true), T(ev.name, ev.color || "#ffffff", true)],
    "EVENT ENDED: " + ev.name,
    "gold"
  );
}

export function startEvent(forceKey) {
  let key = String(forceKey || "random").toLowerCase();
  if (key === "random") {
    key = Math.random() < EVENT_CFG.secretChance
      ? SECRET_EVENT_KEYS[Math.floor(Math.random() * SECRET_EVENT_KEYS.length)]
      : REGULAR_EVENT_KEYS[Math.floor(Math.random() * REGULAR_EVENT_KEYS.length)];
  } else if (key === "secret") {
    key = SECRET_EVENT_KEYS[Math.floor(Math.random() * SECRET_EVENT_KEYS.length)];
  }
  const ev = EVENTS[key];
  if (!ev) return false;

  cleanupEventDrops();
  const now = Date.now();
  const shuffleGlove = key === "shuffle" ? SHUFFLE_POOL[Math.floor(Math.random() * SHUFFLE_POOL.length)] : null;
  WORLD_STATE.event = { ...ev, endsAt: now + ev.durMs, lastDropAt: 0, shuffleGlove };
  WORLD_STATE.nextEventAt = 0;

  const ids = api.getPlayerIds();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (P[id]) {
      if (key === "shuffle") applyShuffleToPlayer(id, P[id], WORLD_STATE.event);
      else restoreShuffleGlove(id, P[id]);
      P[id].hudSig = "";
    }
    refreshSpeed(id);
    sfx(id, ev.rare ? "levelup" : "magicAccent");
    flash(id, (ev.rare ? STAR + " SUPER RARE EVENT: " : "EVENT: ") + ev.name);
  }
  bcast(
    [
      T(ev.rare ? STAR + " SUPER RARE EVENT: " : "ARENA EVENT: ", ev.rare ? "#ff2d55" : "#ffd60a", true),
      T(ev.name + (shuffleGlove ? " [" + GLOVES[shuffleGlove].tag + "]" : "") + " \u2014 ", ev.color || "#ffffff", true),
      T(ev.desc, "#ffffff"),
    ],
    (ev.rare ? "SUPER RARE EVENT: " : "ARENA EVENT: ") + ev.name + " \u2014 " + ev.desc,
    ev.rare ? "hotpink" : "gold"
  );
  if (ev.dropBlock) {
    spawnEventDrop(WORLD_STATE.event, now);
    WORLD_STATE.event.lastDropAt = now;
  }
  return true;
}

export function tickEvents(now) {
  const ev = WORLD_STATE.event;
  if (!ev) {
    if (!WORLD_STATE.nextEventAt) scheduleNextEvent(now);
    else if (now >= WORLD_STATE.nextEventAt) startEvent("random");
    return;
  }

  if (now >= ev.endsAt) {
    endEvent();
    return;
  }

  const drops = WORLD_STATE.eventDrops;
  if (ev.dropBlock && drops.length < (ev.maxDrops || 4) && now - (ev.lastDropAt || 0) >= (ev.dropEveryMs || 6000)) {
    ev.lastDropAt = now;
    spawnEventDrop(ev, now);
  }

  if (!drops.length) return;
  const ids = api.getPlayerIds();
  for (let dIdx = drops.length - 1; dIdx >= 0; dIdx--) {
    const d = drops[dIdx];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const p = P[id];
      if (!p || !p.loaded || !p.inArena || p.prac || p.rag) continue;
      const pos = p.lastPos || safe("getPosition", () => api.getPosition(id));
      if (!pos) continue;
      if (Math.hypot(pos[0] - d.x, pos[2] - d.z) <= 1.85 && Math.abs(pos[1] - d.y) <= 2.4) {
        if (d.eid) killEnt(d.eid);
        drops.splice(dIdx, 1);

        if (d.glove && GLOVES[d.glove]) {
          const g = GLOVES[d.glove];
          const need = ev.secretNeed || 3;
          if (!p.un[d.glove]) {
            p.secProg[d.glove] = (p.secProg[d.glove] || 0) + 1;
            const prog = p.secProg[d.glove];
            p.dirty = true;
            p.shopSig = "";
            if (prog >= need) {
              p.un[d.glove] = true;
              p.fresh[d.glove] = true;
              p.hudSig = "";
              unlockFx(id, d.glove);
              sfx(id, "levelup");
              flash(id, STAR + " SECRET GLOVE UNLOCKED: " + g.tag + " " + STAR);
              safe("msg", () =>
                api.sendMessage(id, "SECRET GLOVE UNLOCKED (" + prog + "/" + need + "): " + g.tag + "! Open Shop -> Gloves (Rare+) or type '" + d.glove + "' to equip!", { color: "gold" })
              );
              bcast(
                [ent(id, "#ff2d55"), T(" forged the SECRET ", "#ffffff"), T(g.tag + " glove!", g.c[0], true)],
                nm(id) + " forged the SECRET " + g.tag + " glove!",
                "hotpink"
              );
            } else {
              sfx(id, "exp_collect");
              flash(id, STAR + " " + g.tag + " SHARD (" + prog + "/" + need + ") " + STAR);
              safe("msg", () =>
                api.sendMessage(id, "Collected " + g.tag + " Shard (" + prog + "/" + need + ")! Collect " + (need - prog) + " more to unlock!", { color: "aqua" })
              );
              ring([d.x, d.y, d.z], [ev.color || "#bf5af2", "#ffffff"], 3.0, 10);
            }
            savePlayer(id);
          } else {
            giveSlaps(id, 40, true);
            flash(id, "+40 SECRET BONUS SLAPS!");
            sfx(id, "exp_collect");
          }
        } else {
          const amt = 15 + Math.floor(Math.random() * 21);
          giveSlaps(id, amt, false);
          flash(id, STAR + " GOLDEN SLAPPLE +" + amt + " SLAPS! " + STAR);
          sfx(id, "exp_collect");
          ring([d.x, d.y, d.z], ["#ffd60a", "#ffffff"], 2.5, 8);
        }
        break;
      }
    }
  }
}

export function cleanupCrates() {
  const crates = WORLD_STATE.crates;
  for (let i = 0; i < crates.length; i++) {
    if (crates[i].eid) killEnt(crates[i].eid);
  }
  crates.length = 0;
}

export function spawnCrateNow() {
  const spot = findArenaGrassSpot();
  if (!spot) return false;
  const now = Date.now();
  const eid = mkBlock("Block of Emerald", 0.72, true);
  if (eid) safe("cratePos", () => api.setPosition(eid, spot[0], spot[1], spot[2]));
  WORLD_STATE.crates.push({ eid, x: spot[0], y: spot[1], z: spot[2], bornAt: now });
  WORLD_STATE.lastCrateAt = now;
  pillar([spot[0], spot[1] - 0.8, spot[2]], ["#30d158", "#ffd60a"], 20);
  bcast([T("SUPPLY CRATE dropped on the arena islands!", "#30d158", true)], "SUPPLY CRATE dropped on the arena islands!", "lime");
  return true;
}

export function tickCrates(now) {
  const crates = WORLD_STATE.crates;
  if (!WORLD_STATE.lastCrateAt) WORLD_STATE.lastCrateAt = now;
  if (crates.length < CRATE_CFG.maxCrates && now - WORLD_STATE.lastCrateAt >= CRATE_CFG.everyMs) {
    const ids = api.getPlayerIds();
    let anyArena = false;
    for (let i = 0; i < ids.length; i++) {
      if (P[ids[i]] && P[ids[i]].inArena && !P[ids[i]].prac) { anyArena = true; break; }
    }
    if (anyArena) spawnCrateNow();
    else WORLD_STATE.lastCrateAt = now;
  }
  if (!crates.length) return;
  const ids = api.getPlayerIds();
  for (let cIdx = crates.length - 1; cIdx >= 0; cIdx--) {
    const c = crates[cIdx];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const p = P[id];
      if (!p || !p.loaded || !p.inArena || p.prac || p.rag) continue;
      const pos = p.lastPos || safe("getPosition", () => api.getPosition(id));
      if (!pos) continue;
      if (Math.hypot(pos[0] - c.x, pos[2] - c.z) <= 1.85 && Math.abs(pos[1] - c.y) <= 2.4) {
        if (c.eid) killEnt(c.eid);
        crates.splice(cIdx, 1);
        const buff = CRATE_BUFFS[Math.floor(Math.random() * CRATE_BUFFS.length)];
        if (buff === "ability_reset") {
          p.abilityReady = 0;
          giveSlaps(id, 15, true);
          flash(id, STAR + " CRATE: ABILITY RESET + 15 SLAPS! " + STAR);
        } else {
          p.crateBuff = buff;
          p.crateUntil = now + CRATE_CFG.durMs;
          refreshSpeed(id);
          const label = buff === "speed" ? "HYPER SPEED 1.35x" : buff === "kb" ? "MEGA KNOCKBACK 1.4x" : "HIT SHIELD";
          flash(id, STAR + " CRATE: " + label + " (12s) " + STAR);
        }
        p.hudSig = "";
        sfx(id, "levelup");
        ring([c.x, c.y, c.z], ["#30d158", "#ffd60a"], 3, 10);
        break;
      }
    }
  }
}

export function spawnWorldBoss(now) {
  const boss = WORLD_STATE.boss;
  if (boss.active) return;
  boss.active = true;
  boss.hp = BOSS_CFG.maxHp;
  boss.maxHp = BOSS_CFG.maxHp;
  boss.spawnedAt = now;
  boss.damageMap = {};
  const eid = mkBlock("Obsidian", 2.2, true);
  if (eid) safe("bossPos", () => api.setPosition(eid, BOSS_CFG.spawnPos[0], BOSS_CFG.spawnPos[1] + 1, BOSS_CFG.spawnPos[2]));
  boss.entityId = eid;

  pillar(BOSS_CFG.spawnPos, ["#ff3b30", "#ffd60a"], 50);
  bcast(
    [T(STAR + " HOURLY WORLD BOSS SPAWNED: TITAN GOLEM! (" + boss.hp + " HP) " + STAR, "#ff3b30", true)],
    "HOURLY WORLD BOSS SPAWNED: TITAN GOLEM! Head to the center arena!",
    "red"
  );
}

export function endWorldBoss(defeated) {
  const boss = WORLD_STATE.boss;
  if (!boss.active) return;
  if (boss.entityId) killEnt(boss.entityId);
  boss.active = false;
  boss.entityId = null;
  boss.nextAt = Date.now() + BOSS_CFG.intervalMs;

  if (defeated) {
    let totalDmg = 0;
    let topId = null;
    let topDmg = -1;
    for (const pid in boss.damageMap) {
      const dmg = boss.damageMap[pid];
      totalDmg += dmg;
      if (dmg > topDmg) {
        topDmg = dmg;
        topId = pid;
      }
    }

    if (totalDmg > 0) {
      for (const pid in boss.damageMap) {
        const p = P[pid];
        if (!p || !p.loaded) continue;
        const share = boss.damageMap[pid] / totalDmg;
        const reward = Math.round(BOSS_CFG.rewardPoolSlaps * share);
        if (reward > 0) {
          giveSlaps(pid, reward, true);
          flash(pid, "BOSS REWARD: +" + reward + " SLAPS!");
          safe("msg", () => api.sendMessage(pid, "World Boss defeated! You contributed " + Math.round(share * 100) + "% damage and earned +" + reward + " Slaps.", { color: "gold" }));
        }
      }
    }

    if (topId && P[topId] && Math.random() < BOSS_CFG.secretDropChance) {
      const tpState = P[topId];
      if (!tpState.un.colossus) {
        tpState.un.colossus = true;
        tpState.fresh.colossus = true;
        tpState.dirty = true;
        unlockFx(topId, "colossus");
        sfx(topId, "levelup");
        flash(topId, STAR + " SECRET BOSS GLOVE UNLOCKED: COLOSSUS " + STAR);
        bcast(
          [ent(topId, "#ffd60a"), T(" conquered the World Boss and unlocked the SECRET ", "#ffffff"), T("COLOSSUS glove!", "#ff3b30", true)],
          nm(topId) + " conquered the World Boss and unlocked the secret COLOSSUS glove!",
          "gold"
        );
        savePlayer(topId);
      }
    }

    bcast(
      [T("HOURLY WORLD BOSS DEFEATED! Rewards distributed to participants.", "#30d158", true)],
      "Hourly World Boss defeated!",
      "lime"
    );
  } else {
    bcast(
      [T("HOURLY WORLD BOSS ESCAPED! Time ran out.", "#ff9500", true)],
      "Hourly World Boss escaped!",
      "orange"
    );
  }
}

export function damageWorldBoss(attackerId, amount) {
  const boss = WORLD_STATE.boss;
  if (!boss.active) return;
  const dmg = Math.max(1, Math.floor(amount || 10));
  boss.hp = Math.max(0, boss.hp - dmg);
  boss.damageMap[attackerId] = (boss.damageMap[attackerId] || 0) + dmg;

  if (Math.random() < 0.35) {
    const list = nearPoint(BOSS_CFG.spawnPos, 8, null, false);
    for (let i = 0; i < list.length; i++) {
      const item = list[i], len = item[1] || 1;
      knock(attackerId, item[0], item[2] / len, item[3] / len, 1.8, 1.3, 1.3, true);
      tint(item[0], pd(item[0]), "rgba(255,59,48,0.55)", 250);
      flash(item[0], "BOSS STOMP!");
    }
    ring(BOSS_CFG.spawnPos, ["#ff3b30", "#ffd60a"], 7, 14);
    sfx(attackerId, "stomp");
  }

  if (boss.hp <= 0) {
    endWorldBoss(true);
  }
}

export function tickWorldBoss(now) {
  const boss = WORLD_STATE.boss;
  if (!boss.active) {
    if (now >= boss.nextAt) {
      spawnWorldBoss(now);
    }
  } else {
    if (now - boss.spawnedAt >= BOSS_CFG.durationMs) {
      endWorldBoss(false);
    } else if (boss.entityId && Math.random() < 0.2) {
      ring(BOSS_CFG.spawnPos, ["#ff3b30", "#ffffff"], 5, 10);
    }
  }
}

export function tickKoth(now) {
  const ids = api.getPlayerIds();
  const contenders = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = P[id];
    if (!p || !p.loaded || !p.inArena || p.prac || p.rag) continue;
    const pos = p.lastPos || safe("getPosition", () => api.getPosition(id));
    if (!pos) continue;
    if (Math.hypot(pos[0] - KOTH.x, pos[2] - KOTH.z) <= KOTH.radius && Math.abs(pos[1] - KOTH.y) <= 4.5) {
      contenders.push(id);
    }
  }

  if (contenders.length === 1) {
    const kingId = contenders[0];
    if (WORLD_STATE.kothHolder !== kingId) {
      WORLD_STATE.kothHolder = kingId;
      WORLD_STATE.kothSince = now;
      WORLD_STATE.kothLastPay = now;
      if (P[kingId]) {
        P[kingId].tagSig = "";
        P[kingId].hudSig = "";
      }
      recordQuestEvent(kingId, "koth_capture", 1);
      flash(kingId, STAR + " KING OF THE HILL! +" + KOTH.reward + " Slaps/5s " + STAR);
      sfx(kingId, "levelup");
    } else if (now - WORLD_STATE.kothLastPay >= KOTH.holdMs) {
      WORLD_STATE.kothLastPay = now;
      giveSlaps(kingId, KOTH.reward);
      flash(kingId, "KOTH +" + KOTH.reward + " SLAPS!");
      sfx(kingId, "exp_collect");
      ring([KOTH.x, KOTH.y + 0.5, KOTH.z], ["#ffd60a", "#ffffff"], KOTH.radius * 0.65, 10);
    }
  } else if (WORLD_STATE.kothHolder) {
    const prev = WORLD_STATE.kothHolder;
    WORLD_STATE.kothHolder = null;
    WORLD_STATE.kothSince = 0;
    if (P[prev]) {
      P[prev].tagSig = "";
      P[prev].hudSig = "";
    }
    if (contenders.length > 1) {
      for (let i = 0; i < contenders.length; i++) flash(contenders[i], "HILL CONTESTED!");
    }
  }
}

function bossSwing(id, p, now, g) {
  const boss = WORLD_STATE.boss;
  if (!boss.active || p.prac || !p.inArena) return;
  const pos = safe("getPosition", () => api.getPosition(id));
  if (!pos) return;
  const bp = BOSS_CFG.spawnPos;
  if (Math.hypot(pos[0] - bp[0], pos[2] - bp[2]) > CFG.slapReach + 2.2) return;
  if (Math.abs(pos[1] - (bp[1] + 1)) > 4) return;
  p.lastSlap = now;
  damageWorldBoss(id, Math.round(10 * (g ? g.f : 1)));
  sfx(id, "hit");
  if (boss.active) flash(id, "Boss HP: " + boss.hp + "/" + boss.maxHp);
}

export function initEventHooks() {
  COMBAT_HOOKS.onSwingMiss = bossSwing;
  INTERFACE_HOOKS.startEvent = startEvent;
  INTERFACE_HOOKS.endEvent = endEvent;
  INTERFACE_HOOKS.spawnCrate = spawnCrateNow;
  if (!WORLD_STATE.event && !WORLD_STATE.nextEventAt) {
    scheduleNextEvent(Date.now());
  }
}

// ============================================================================
// PORTALS, LIFECYCLE & MAIN TICK
// ============================================================================

export function randomGrassTeleport(id, pos) {
  const p = pd(id);
  const now = Date.now();
  if (now < (p.portalReady || 0)) return false;
  p.portalReady = now + PORTAL_COOLDOWN_MS;

  for (let i = 0; i < 60; i++) {
    const nx = Math.floor(pos[0] + (2 * Math.random() - 1) * PORTAL_SEARCH_RADIUS);
    const nz = Math.floor(pos[2] + (2 * Math.random() - 1) * PORTAL_SEARCH_RADIUS);
    const b0 = safe("portal grass check", () => api.getBlock(nx, -50, nz));
    const b1 = safe("portal clearance1", () => api.getBlock(nx, -49, nz));
    const b2 = safe("portal clearance2", () => api.getBlock(nx, -48, nz));
    const lower = String(b0).toLowerCase();
    if (lower.indexOf("grass") >= 0 && (!b1 || b1 === "Air") && (!b2 || b2 === "Air")) {
      grantMovementGrace(id, 1800);
      tp(id, nx + 0.5, -49.05, nz + 0.5);
      setArenaState(id);
      if (WORLD_STATE.event && WORLD_STATE.event.id === "shuffle") {
        applyShuffleToPlayer(id, p, WORLD_STATE.event);
      }
      if (!p.firstPortalTracked) {
        p.firstPortalTracked = true;
        safe("analytics portal", () => api.registerAnalyticsEvent(id, "portal", "entered_arena", null, now));
      }
      p.protUntil = now + CFG.protectMs;
      flash(id, "Portal!");
      sfx(id, "teleport");
      return true;
    }
  }
  flash(id, "No grass destination found!");
  p.portalReady = now + 1000;
  return false;
}

export function portalTick(id, pos) {
  const p = pd(id);
  if (Date.now() < (p.portalReady || 0)) return false;
  const blocks = safe("getBlockTypesPlayerStandingOn", () => api.getBlockTypesPlayerStandingOn(id)) || [];
  for (let i = 0; i < blocks.length; i++) {
    if (String(blocks[i]).toLowerCase().indexOf("portal") >= 0) {
      return randomGrassTeleport(id, pos);
    }
  }
  return false;
}

export function handleBlockStand(id, blockName) {
  if (!blockName) return;
  if (String(blockName).toLowerCase().indexOf("portal") >= 0) {
    const pos = safe("getPosition", () => api.getPosition(id));
    if (pos) randomGrassTeleport(id, pos);
  }
}

export function handleJoin(id) {
  const now = Date.now();
  safe("analytics joined", () => api.registerAnalyticsEvent(id, "joined", null, null, now));
  loadAllLb();
  loadBans();
  const p = pd(id);
  const ban = isPlayerBanned(id);
  if (ban) {
    p.adminBanned = true;
    setLobbyState(id);
    tp(id, SPAWN[0], SPAWN[1], SPAWN[2]);
    refreshSpeed(id);
    safe("msg", () => api.sendMessage(id, "You are banned from this server: " + ban.reason, { color: "red" }));
    okSafe("kickPlayer", () => api.kickPlayer(id, "Banned: " + ban.reason));
    return;
  }
  p.adminBanned = false;
  loadPlayer(id);
  ensureDailyQuestState(p, now);
  setLobbyState(id);
  tp(id, SPAWN[0], SPAWN[1], SPAWN[2]);

  if (WORLD_STATE.event && WORLD_STATE.event.id === "shuffle") {
    applyShuffleToPlayer(id, p, WORLD_STATE.event);
  }

  p.tutorialPending = true;
  p.tutorialCheckAt = 0;
  p.firstPortalTracked = false;
  p.firstSlapTracked = false;
  safe("tutorial gate pending", () => api.setPlayerDbValue(id, "slap_tut_gate", "pending"));
  safe("tutorial movement lock", () => api.setClientOption(id, "speedMultiplier", 0));
  safe("tutorial stop velocity", () => api.setVelocity(id, 0, 0, 0));

  p.protUntil = now + CFG.protectMs;
  removeOrbs(p);
  safe("msg", () => api.sendMessage(id, "Welcome to Slap Battles! Click the Code Block to finish the tutorial.", { color: "gold" }));
  safe("msg", () => api.sendMessage(id, "Type 'shop' or click lobby stations to unlock " + GORDER.length + " gloves! Type 'help' for commands.", { color: "aqua" }));
  if (p.loaded && p.hadSave) {
    safe("msg", () => api.sendMessage(id, "Progress: " + p.slaps + " Slaps | " + p.kills + " Knock-offs.", { color: "white" }));
  }

  p.lastActive = now;
  p.sessActive = 0;
  p.sessIdx = 0;
  claimDaily(id, p, now);
  shopSync(id, p);
}

export function handleLeave(id) {
  if (WORLD_STATE.kothHolder === id) {
    WORLD_STATE.kothHolder = null;
    WORLD_STATE.kothSince = 0;
  }
  resolveDuelForfeit(id);
  restoreShuffleGlove(id, P[id]);
  savePlayer(id);
  cleanupPlayerEntities(P[id]);
  delete P[id];
}

export function handleRespawn(id) {
  const p = pd(id);
  const now = Date.now();
  resetKillstreak(id, false);
  resetCombatState(id);
  grantMovementGrace(id, 1800);
  if (p.prac) {
    tp(id, PRACTICE[0], PRACTICE[1], PRACTICE[2]);
    setArenaState(id);
  } else {
    setLobbyState(id);
    tp(id, SPAWN[0], SPAWN[1], SPAWN[2]);
  }
  api.setVelocity(id, 0, 0, 0);
  p.protUntil = now + CFG.protectMs;
}

export function handleClick(id, wasAltClick, x, y, z) {
  if (handleLobbyBlockClick(id, x, y, z)) return;
  if (wasAltClick) useAbility(id);
}

export function gameTick() {
  const now = Date.now();
  const dt = Math.min(0.2, Math.max(0.01, (now - (lastT || now)) / 1000));
  lastT = now;

  thTick(now);
  tickZones(now, dt);
  tickEvents(now);
  tickCrates(now);
  tickKoth(now);
  tickWorldBoss(now);

  if (now - lastLbSweep > 2000) {
    lastLbSweep = now;
    loadAllLb();
    loadBans();
    saveBans(false);
    lbTouch();
    const allIds = api.getPlayerIds();
    for (let i = 0; i < allIds.length; i++) {
      if (P[allIds[i]]) touchAllLb(allIds[i], P[allIds[i]]);
    }
    renderPhysicalLeaderboard(false);
    if (Object.keys(LB).length > 80) {
      const top = lbTop(40);
      for (const k in LB) delete LB[k];
      for (let i = 0; i < top.length; i++) LB[top[i][0].toLowerCase()] = top[i];
    }
  }

  const ids = api.getPlayerIds();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = pd(id);

    if (p.adminBanned || p.adminFrozen) {
      safe("admin freeze lock", () => api.setClientOption(id, "speedMultiplier", 0));
      safe("admin freeze vel", () => api.setVelocity(id, 0, 0, 0));
      if (p.frozenPos) {
        safe("admin freeze pos", () => api.setPosition(id, p.frozenPos[0], p.frozenPos[1], p.frozenPos[2]));
      }
      updateTag(id, p, now);
      updateHud(id, p, now);
      continue;
    }

    if (p.tutorialPending && now - (p.tutorialCheckAt || 0) >= 500) {
      p.tutorialCheckAt = now;
      const gate = safe("tutorial gate read", () => api.getPlayerDbValue(id, "slap_tut_gate"));
      if (gate === "done") {
        p.tutorialPending = false;
        grantMovementGrace(id, 1200);
        refreshSpeed(id);
      } else {
        safe("tutorial keep movement locked", () => api.setClientOption(id, "speedMultiplier", 0));
        safe("tutorial stop velocity poll", () => api.setVelocity(id, 0, 0, 0));
      }
    }

    const pos = safe("getPosition", () => api.getPosition(id));
    if (!pos) continue;
    if (!p.duelOpp && portalTick(id, pos)) continue;

    if (!p.loaded && p.loadTries < 10 && now - p.loadTry > 5000) loadPlayer(id);
    if (p.loaded && p.dirty && now - p.lastSave > CFG.saveEveryMs) savePlayer(id);

    const realVel = safe("getVelocity", () => api.getVelocity(id));
    if (realVel && realVel.length === 3 && isFinite(realVel[0])) {
      p.vel = [realVel[0], realVel[1], realVel[2]];
    } else if (p.lastPos) {
      const vx = (pos[0] - p.lastPos[0]) / dt;
      const vy = (pos[1] - p.lastPos[1]) / dt;
      const vz = (pos[2] - p.lastPos[2]) / dt;
      p.vel = [0.5 * p.vel[0] + 0.5 * vx, 0.5 * p.vel[1] + 0.5 * vy, 0.5 * p.vel[2] + 0.5 * vz];
    }
    p.lastPos = [pos[0], pos[1], pos[2]];
    recordPosHistory(p, pos, now);

    p.heat = Math.max(0, p.heat - CFG.heatDecay * dt);
    if (Math.hypot(p.vel[0], p.vel[2]) > 0.3) p.lastActive = now;

    playTick(id, p, now, dt);
    fxTick(id, p, pos, now, dt);
    updateTag(id, p, now);
    updateHud(id, p, now);

    if (p.tinted && now > p.tintUntil) {
      p.tinted = false;
      clearTint(id);
    }

    warpCheck(id, p, pos, now, leavePractice);


    if (p.loaded && now - p.titleAt > 2000) {
      p.titleAt = now;
      ensureDailyQuestState(p, now);
      checkAchievements(id, p);
      checkTitles(id, p);
      shopSync(id, p);
      lobbyTab(id, p);
    }

    if (p.prac && Math.hypot(pos[0] - PRACTICE[0], pos[2] - PRACTICE[2]) > CFG.pracRadius) {
      leavePractice(id, true);
    }

    // Grounded slam check + full ragdoll tumble, skid, wall ricochet, bowling & recovery
    const wasGrounded = p.grounded;
    tickRagdollPhysics(id, p, pos, now, dt);
    if (!wasGrounded && p.grounded && p.slamUntil > now && now > p.slamArm) {
      slamBoom(id, p, pos);
    }
    if (p.slamUntil && now > p.slamUntil) p.slamUntil = 0;

    // Frozen hold / shatter
    if (p.frozenPos) {
      if (now < p.frozenUntil) {
        api.setPosition(id, p.frozenPos[0], p.frozenPos[1], p.frozenPos[2]);
        api.setVelocity(id, 0, 0, 0);
      } else {
        p.frozenPos = null;
        shatter(id, p, pos);
      }
    }

    // Time bomb detonation
    if (p.bombAt && now >= p.bombAt) bombBoom(id, p, pos);

    // Timed status speed refreshes
    if (p.slowUntil && now >= p.slowUntil) {
      p.slowUntil = 0;
      refreshSpeed(id);
    }
    if (p.speedBoostUntil && now >= p.speedBoostUntil) {
      p.speedBoostUntil = 0;
      p.speedBoostMult = 1;
      refreshSpeed(id);
    }
    if (p.anchorUntil && now >= p.anchorUntil) {
      p.anchorUntil = 0;
      refreshSpeed(id);
    }
    if (p.crateBuff && now >= p.crateUntil) {
      p.crateBuff = "";
      p.crateUntil = 0;
      p.hudSig = "";
      refreshSpeed(id);
    }
    if (p.rageUntil && now >= p.rageUntil) {
      p.rageUntil = 0;
      refreshSpeed(id);
    }

    // Charge / Blood Surge dash hit check
    if (now < p.dashUntil) {
      const list = near(id, 1.8);
      let closest = null;
      for (let k = 0; k < list.length; k++) {
        if (!closest || list[k][1] < closest[1]) closest = list[k];
      }
      if (closest) {
        const len = closest[1] || 1;
        knock(id, closest[0], closest[2] / len, closest[3] / len, CFG.chargeForce, 1, 1.1);
        tint(closest[0], pd(closest[0]), "rgba(255,60,60,0.45)", 200);
        flash(id, "CHARGE HIT!");
        sfx(closest[0]);
        p.dashUntil = 0;
      }
    }

    if (p.duelOpp && !p.prac) {
      if (pos[1] < DUEL_POS.center[1] - 8 || Math.hypot(pos[0] - DUEL_POS.center[0], pos[2] - DUEL_POS.center[2]) > DUEL_POS.radius) {
        handleFall(id);
      }
    } else if (pos[1] < CFG.killY) {
      handleFall(id);
    }
  }
}

export function shutdown() {
  cleanupEventDrops();
  cleanupCrates();
  saveAll();
  saveBans(true);
  cleanupAllAnimations(P);
  cleanupAllZones();
  cleanupOrphans();
}
