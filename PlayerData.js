import {
  CFG, DB_KEY, LEGACY_DB_KEY, LEGACY_X_KEY, GLOVES, GORDER,
  TITLES, ACHIEVEMENTS, ADMIN_NAME, WORLD_LB, KILL_EFFECTS, BADGES, BOUNTY_CFG,
  getKsStageConfig, activeGloveVisual,
} from "./Config.js";
import { safe, okSafe, rawName, numf, FAIL } from "./Visuals.js";
import { recordReplayPosition } from "./Replay.js";
export { getKsStageConfig, activeGloveVisual };

export const P = {};
export const LB = {};
export const WORLD_STATE = {
  event: null,
  nextEventAt: 0,
  eventDrops: [],
  crates: [],
  lastCrateAt: 0,
  boss: {
    active: false,
    hp: 5000,
    maxHp: 5000,
    spawnedAt: 0,
    nextAt: Date.now() + 60000,
    damageMap: {},
    entityId: null,
  },
  kothHolder: null,
  kothSince: 0,
  kothLastPay: 0,
  allLb: {},
  allLbLoaded: false,
  allLbDirty: false,
  lbMode: "s",
  bans: {},
  bansLoaded: false,
  bansDirty: false,
  bansVersion: 0,
};

const TITLE_MAP = {};
for (let i = 0; i < TITLES.length; i++) TITLE_MAP[TITLES[i][0]] = TITLES[i];

const ACH_MAP = {};
for (let i = 0; i < ACHIEVEMENTS.length; i++) ACH_MAP[ACHIEVEMENTS[i].id] = ACHIEVEMENTS[i];

export function isG(id) {
  return Object.prototype.hasOwnProperty.call(GLOVES, id);
}

export function isAdmin(id) {
  return String(rawName(id) || "").toLowerCase() === ADMIN_NAME;
}

export function titleById(id) {
  return TITLE_MAP[id] || null;
}

export function achById(id) {
  return ACH_MAP[id] || null;
}

export function pd(id) {
  if (!P[id]) {
    const now = Date.now();
    P[id] = {
      // Persistent progression
      slaps: 0,
      totalSlaps: 0,
      kills: 0,
      falls: 0,
      bestStreak: 0,
      cancels: 0,
      perfects: 0,
      assists: 0,
      reflects: 0,
      multiKills: 0,
      ksMaxStage: 0,
      glove: "default",
      un: { default: true },
      fresh: {},
      mastery: {},
      killFx: "fx_default",
      ownedFx: { fx_default: true },
      ach: {},
      ownedTitles: {},
      title: "",
      badges: {},
      badge: "",
      dailyQuestState: { day: 0, prog: {}, done: {}, bonusClaimed: false },
      lastDay: 0,
      dailyStreak: 0,
      bestDaily: 0,
      dailyClaims: 0,
      playMs: 0,
      playMin: 0,
      lifeIdx: 0,
      duelWins: 0,
      kingsDethroned: 0,
      bountiesClaimed: 0,
      secProg: {},
      loadouts: {},

      // Save tracking
      loaded: false,
      hadSave: false,
      loadTries: 0,
      loadTry: 0,
      dirty: false,
      lastSave: 0,
      verified: false,

      // Combat & status timers
      inArena: false,
      prac: false,
      realGlove: null,
      shuffleSavedGlove: null,
      lastSlap: 0,
      frozenUntil: 0,
      frozenPos: null,
      shatterBy: null,
      slowUntil: 0,
      speedBoostUntil: 0,
      speedBoostMult: 1,
      lastHitBy: null,
      lastHitTime: 0,
      lastFall: 0,
      combo: null,
      hitIframesUntil: 0,
      comboImmuneUntil: 0,
      chainHits: 0,
      chainHitAt: 0,
      lastAttackEvtAt: 0,
      lastDmgEvtAt: 0,
      lastRayCheckAt: 0,
      lastHitTargetId: null,
      heat: 0,
      rag: false,
      ragStart: 0,
      ragUntil: 0,
      ragPose: "standing",
      ragPoseAt: 0,
      ragPower: 0,
      bowlAt: 0,
      cue: false,
      landedAt: 0,
      bounces: 0,
      wallAt: 0,
      lastPos: null,
      prevPos: null,
      tpAt: 0,
      vel: [0, 0, 0],
      grounded: false,
      stillT: 0,
      fallSpeed: 0,
      cancelStreak: 0,
      armorUntil: 0,
      protUntil: 0,
      lastFail: 0,

      // Glove ability states
      switchReady: 0,
      abilityReady: 0,
      chargeUntil: 0,
      dashUntil: 0,
      slamUntil: 0,
      slamArm: 0,
      lastTry: 0,
      lastAltAt: 0,
      portalReady: 0,
      ghostUntil: 0,
      shieldUntil: 0,
      anchorUntil: 0,
      mirrorUntil: 0,
      titanUntil: 0,
      echoUntil: 0,
      echoBy: null,
      bombAt: 0,
      bombBy: null,
      posHist: [],
      posHistAt: 0,

      // Killstreak runtime
      streak: 0,
      ksStage: 0,
      recentKillTimes: [],
      victimKillAt: {},

      // Visual & entity tracking
      puffAt: 0,
      trailAt: 0,
      orbs: null,
      orbBlock: null,
      orbTargetCount: 0,
      orbRetry: 0,
      orbAngle: 0,
      orbitPuffAt: 0,
      fe: {},
      feRetry: {},
      handSig: "",
      handRetry: 0,
      tagSig: "",
      hudSig: "",
      shopSig: "",
      shopMade: false,
      lbSig: "",
      lbInfo: 0,
      btnGlove: null,
      tintUntil: 0,
      tinted: false,
      spinUntil: 0,
      titleAt: 0,
      dummyAt: 0,



      // Combat attribution, bounties, duels, crates & admin controls
      hits: [],
      assistFrom: {},
      recap: null,
      lastKilledBy: null,
      lifePerfects: 0,
      crateBuff: "",
      crateUntil: 0,
      rageUntil: 0,
      duelOpp: null,
      duelWaitId: null,
      duelWaitExp: 0,
      duelWager: 0,
      adminTargetIdx: 0,
      adminGloveIdx: 0,
      adminBanned: false,
      adminFrozen: false,
      tutorialPending: false,
      tutorialCheckAt: 0,
      firstPortalTracked: false,
      firstSlapTracked: false,
      lastDailyCheck: 0,
      sessActive: 0,
      sessIdx: 0,
      lastActive: now,
      afk: false,
    };
  }
  return P[id];
}

export function tp(id, x, y, z) {
  const p = pd(id);
  p.tpAt = Date.now();
  api.setPosition(id, x, y, z);
  p.lastPos = null;
  p.vel = [0, 0, 0];
  p.stillT = 0;
  p.grounded = false;
  p.fallSpeed = 0;
}

export function setMode(id, mode) {
  safe("setPlayerGamemode " + mode, () => api.setPlayerGamemode(id, mode));
}

export function setLobbyState(id) {
  pd(id).inArena = false;
  setMode(id, "peacefuladventure");
}

export function setArenaState(id) {
  pd(id).inArena = true;
  setMode(id, "survivaladventure");
}

export function refreshSpeed(id) {
  const p = pd(id);
  const now = Date.now();
  let mult = 1;
  if (p.adminBanned || p.adminFrozen) {
    mult = 0;
  } else if (p.rag) {
    mult = CFG.ragSpeed;
  } else if (now < p.slowUntil) {
    mult = CFG.slowMult;
  } else if (now < p.anchorUntil) {
    mult = 0.85;
  } else {
    if (p.glove === "killstreak") {
      mult *= getKsStageConfig(p.ksStage).speed;
    }
    if (now < p.speedBoostUntil) {
      mult *= p.speedBoostMult;
    }
    if (p.crateBuff === "speed" && now < p.crateUntil) {
      mult *= 1.35;
    }
    if (now < p.rageUntil) {
      mult *= 1.28;
    }
    if (p.inArena && WORLD_STATE.event && WORLD_STATE.event.id === "celestial") {
      mult *= 1.18;
    }
  }
  p.acSpeedMult = mult;
  const airMom = !!p.rag;
  const airAcc = p.rag ? CFG.ragAirAcc : 1;
  const airJumps = (!p.adminBanned && !p.adminFrozen && !p.rag && p.inArena && WORLD_STATE.event &&
    (WORLD_STATE.event.id === "low_grav" || WORLD_STATE.event.id === "celestial")) ? 1 : 0;

  if (!okSafe("setClientOptions", () => api.setClientOptions(id, {
    speedMultiplier: mult,
    airMomentumConservation: airMom,
    airAccScale: airAcc,
    airJumpCount: airJumps,
  }))) {
    safe("speedMultiplier", () => api.setClientOption(id, "speedMultiplier", mult));
    safe("airMomentum", () => api.setClientOption(id, "airMomentumConservation", airMom));
    safe("airAccScale", () => api.setClientOption(id, "airAccScale", airAcc));
    safe("airJumpCount", () => api.setClientOption(id, "airJumpCount", airJumps));
  }
}

export function recordPosHistory(p, pos, now) {
  recordReplayPosition(p, pos, now);
  if (now - p.posHistAt < 500) return;
  p.posHistAt = now;
  p.posHist.push({ t: now, p: [pos[0], pos[1], pos[2]] });
  if (p.posHist.length > 8) p.posHist.shift();
}

export function getRewindPos(p, now) {
  if (!p.posHist.length) return null;
  const targetT = now - CFG.rewindHistoryMs;
  let best = p.posHist[0];
  let bestDiff = Math.abs(best.t - targetT);
  for (let i = 1; i < p.posHist.length; i++) {
    const diff = Math.abs(p.posHist[i].t - targetT);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p.posHist[i];
    }
  }
  return best.p;
}

export function lbTouch() {
  const ids = api.getPlayerIds();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = P[id];
    const name = p && p.loaded && rawName(id);
    if (name) LB[name.toLowerCase()] = [name, Math.max(p.totalSlaps || 0, p.slaps)];
  }
}

export function lbMerge(entries) {
  if (!entries || !entries.length) return;
  for (let i = 0; i < entries.length; i++) {
    const row = entries[i];
    if (row && typeof row[0] === "string" && typeof row[1] === "number") {
      const k = row[0].toLowerCase();
      if (!LB[k] || LB[k][1] < row[1]) {
        LB[k] = [row[0], Math.floor(row[1])];
      }
    }
  }
}

export function lbTop(limit) {
  const arr = [];
  for (const k in LB) arr.push(LB[k]);
  arr.sort((a, b) => b[1] - a[1]);
  return arr.slice(0, limit);
}

export function loadAllLb() {
  if (WORLD_STATE.allLbLoaded) return WORLD_STATE.allLb;
  WORLD_STATE.allLbLoaded = true;
  const ax = WORLD_LB.anchor[0], ay = WORLD_LB.anchor[1], az = WORLD_LB.anchor[2];
  const raw = safe("getBlockData(allLb)", () => api.getBlockData(ax, ay, az));
  const saved = raw && raw.persisted && raw.persisted.shared && raw.persisted.shared.allLb;
  if (saved && typeof saved === "object") {
    for (const k in saved) {
      const r = saved[k];
      if (r && typeof r.n === "string") {
        WORLD_STATE.allLb[k] = { n: r.n, s: numf(r.s), k: numf(r.k), b: numf(r.b) };
      }
    }
  }
  return WORLD_STATE.allLb;
}

export function touchAllLb(id, p) {
  if (!p || !p.loaded) return;
  loadAllLb();
  const name = rawName(id);
  if (!name) return;
  const dbId = safe("getPlayerDbId", () => api.getPlayerDbId(id));
  const key = dbId ? String(dbId) : name.toLowerCase();
  const cur = WORLD_STATE.allLb[key];
  const nextS = Math.max(cur ? cur.s : 0, Math.max(p.totalSlaps || 0, p.slaps || 0));
  const nextK = Math.max(cur ? cur.k : 0, p.kills || 0);
  const nextB = Math.max(cur ? cur.b : 0, p.bestStreak || 0);
  if (!cur || cur.n !== name || cur.s !== nextS || cur.k !== nextK || cur.b !== nextB) {
    WORLD_STATE.allLb[key] = { n: name, s: nextS, k: nextK, b: nextB };
    WORLD_STATE.allLbDirty = true;
  }
}

export function allLbTop(limit, sortKey) {
  loadAllLb();
  const field = sortKey === "k" || sortKey === "b" ? sortKey : "s";
  const arr = [];
  for (const key in WORLD_STATE.allLb) {
    const r = WORLD_STATE.allLb[key];
    arr.push([key, r.n, r.s, r.k, r.b]);
  }
  arr.sort((a, b) => {
    const idx = field === "k" ? 3 : field === "b" ? 4 : 2;
    return b[idx] - a[idx] || b[2] - a[2];
  });
  return limit ? arr.slice(0, limit) : arr;
}

export function saveAllLb() {
  if (!WORLD_STATE.allLbDirty) return false;
  const rows = allLbTop(WORLD_LB.maxEntries, "s");
  const compact = {};
  for (let i = 0; i < rows.length; i++) {
    compact[rows[i][0]] = { n: rows[i][1], s: rows[i][2], k: rows[i][3], b: rows[i][4] };
  }
  WORLD_STATE.allLb = compact;
  const ax = WORLD_LB.anchor[0], ay = WORLD_LB.anchor[1], az = WORLD_LB.anchor[2];
  const ok = okSafe("setBlockData(allLb)", () => {
    const prev = api.getBlockData(ax, ay, az) || {};
    const persisted = prev.persisted || {};
    const shared = persisted.shared || {};
    api.setBlockData(ax, ay, az, {
      ...prev,
      persisted: { ...persisted, shared: { ...shared, allLb: compact } },
    });
  });
  if (ok) WORLD_STATE.allLbDirty = false;
  return ok;
}

export function getBountyValue(p) {
  if (!p || (p.streak || 0) < BOUNTY_CFG.minStreak) return 0;
  return Math.min(
    BOUNTY_CFG.maxReward,
    BOUNTY_CFG.baseReward + (p.streak - BOUNTY_CFG.minStreak) * BOUNTY_CFG.perKillBonus
  );
}

export function getPlayerIdentityKey(id) {
  const dbId = safe("getPlayerDbId", () => api.getPlayerDbId(id));
  if (dbId) return String(dbId);
  return String(rawName(id) || id || "").toLowerCase();
}

export function loadBans() {
  if (WORLD_STATE.bansLoaded) return WORLD_STATE.bans;
  WORLD_STATE.bansLoaded = true;
  const ax = WORLD_LB.anchor[0], ay = WORLD_LB.anchor[1], az = WORLD_LB.anchor[2];
  const raw = safe("getBlockData(bans)", () => api.getBlockData(ax, ay, az));
  const saved = raw && raw.persisted && raw.persisted.shared && raw.persisted.shared.bans;
  if (saved && typeof saved === "object") {
    WORLD_STATE.bans = { ...saved };
  }
  return WORLD_STATE.bans;
}

export function saveBans(force) {
  if (!force && !WORLD_STATE.bansDirty) return false;
  const ax = WORLD_LB.anchor[0], ay = WORLD_LB.anchor[1], az = WORLD_LB.anchor[2];
  const ok = okSafe("setBlockData(bans)", () => {
    const prev = api.getBlockData(ax, ay, az) || {};
    const persisted = prev.persisted || {};
    const shared = persisted.shared || {};
    api.setBlockData(ax, ay, az, {
      ...prev,
      persisted: { ...persisted, shared: { ...shared, bans: WORLD_STATE.bans } },
    });
  });
  if (ok) WORLD_STATE.bansDirty = false;
  return ok;
}

export function isPlayerBanned(id) {
  loadBans();
  const key = getPlayerIdentityKey(id);
  const nameLower = String(rawName(id) || "").toLowerCase();
  if (WORLD_STATE.bans[key]) return WORLD_STATE.bans[key];
  for (const k in WORLD_STATE.bans) {
    const b = WORLD_STATE.bans[k];
    if (b && b.nameLower === nameLower) return b;
  }
  return null;
}

export function banPlayerAccount(adminId, targetId, reason) {
  loadBans();
  const key = getPlayerIdentityKey(targetId);
  const targetName = rawName(targetId) || "Player";
  const entry = {
    key,
    name: targetName,
    nameLower: String(targetName).toLowerCase(),
    reason: String(reason || "Banned by Admin").slice(0, 60),
    by: rawName(adminId) || ADMIN_NAME,
    at: Date.now(),
  };
  WORLD_STATE.bans[key] = entry;
  WORLD_STATE.bansDirty = true;
  WORLD_STATE.bansVersion++;
  saveBans(true);
  if (P[targetId]) {
    P[targetId].adminBanned = true;
    P[targetId].inArena = false;
    P[targetId].prac = false;
    refreshSpeed(targetId);
  }
  okSafe("kickPlayer", () => api.kickPlayer(targetId, "Banned: " + entry.reason));
  return entry;
}

export function unbanPlayerName(query) {
  loadBans();
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  let removed = null;
  for (const k in WORLD_STATE.bans) {
    const b = WORLD_STATE.bans[k];
    if (k.toLowerCase() === q || (b && b.nameLower === q)) {
      removed = b;
      delete WORLD_STATE.bans[k];
      WORLD_STATE.bansDirty = true;
      WORLD_STATE.bansVersion++;
      break;
    }
  }
  if (removed) {
    saveBans(true);
    for (const pid in P) {
      if (P[pid] && P[pid].adminBanned && String(rawName(pid) || "").toLowerCase() === removed.nameLower) {
        P[pid].adminBanned = false;
        refreshSpeed(pid);
      }
    }
  }
  return removed;
}

export function loadPlayer(id) {
  const p = pd(id);
  if (p.loaded) return true;
  p.loadTry = Date.now();
  p.loadTries++;

  let raw;
  try {
    raw = api.getPlayerDbValue(id, DB_KEY);
    if (!raw) raw = api.getPlayerDbValue(id, LEGACY_DB_KEY);
  } catch (err) {
    FAIL.dbRead = String(err);
    safe("log", () => api.log("DB read failed: " + err));
    return false;
  }

  let data = null;
  if (raw) {
    try { data = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (err) { FAIL.dbParse = String(err); data = null; }
  }

  if (data && typeof data === "object") {
    const savedSlaps = numf(data.s);
    p.slaps += savedSlaps;
    p.totalSlaps += data.ts !== undefined ? numf(data.ts) : savedSlaps;
    p.kills += numf(data.k);
    p.falls += numf(data.fl);
    p.cancels += numf(data.cn);
    p.perfects += numf(data.pf);
    p.assists += numf(data.as);
    p.reflects += numf(data.rf);
    p.multiKills += numf(data.mk);
    p.ksMaxStage = Math.max(p.ksMaxStage, numf(data.ks));
    p.bestStreak = Math.max(p.bestStreak, numf(data.b));
    p.lastDay = Math.max(p.lastDay, numf(data.ld));
    p.dailyStreak = Math.max(p.dailyStreak, numf(data.ds));
    p.bestDaily = Math.max(p.bestDaily, numf(data.bds));
    p.dailyClaims += numf(data.dc);
    p.playMs += numf(data.pt);
    p.lifeIdx = Math.max(p.lifeIdx, numf(data.lt));
    p.duelWins += numf(data.dw);
    p.kingsDethroned += numf(data.kd);
    p.bountiesClaimed += numf(data.bc);
    if (data.sp && typeof data.sp === "object") {
      for (const sk in data.sp) {
        if (GLOVES[sk]) p.secProg[sk] = Math.max(p.secProg[sk] || 0, numf(data.sp[sk]));
      }
    }
    if (data.lo && typeof data.lo === "object") {
      for (const lk in data.lo) {
        const slot = data.lo[lk];
        if (slot && typeof slot === "object") {
          p.loadouts[lk] = {
            g: typeof slot.g === "string" && GLOVES[slot.g] ? slot.g : "default",
            fx: typeof slot.fx === "string" && KILL_EFFECTS[slot.fx] ? slot.fx : "fx_default",
            bd: typeof slot.bd === "string" ? slot.bd : "",
            tl: typeof slot.tl === "string" ? slot.tl : "",
          };
        }
      }
    }

    if (Array.isArray(data.u)) {
      for (let i = 0; i < data.u.length; i++) {
        if (GLOVES[data.u[i]]) p.un[data.u[i]] = true;
      }
    }
    if (Array.isArray(data.f)) {
      for (let i = 0; i < data.f.length; i++) {
        if (GLOVES[data.f[i]]) p.fresh[data.f[i]] = true;
      }
    }
    if (Array.isArray(data.ac)) {
      for (let i = 0; i < data.ac.length; i++) {
        if (ACH_MAP[data.ac[i]]) p.ach[data.ac[i]] = true;
      }
    }
    if (Array.isArray(data.ot)) {
      for (let i = 0; i < data.ot.length; i++) {
        if (TITLE_MAP[data.ot[i]]) p.ownedTitles[data.ot[i]] = true;
      }
    }
    if (data.m && typeof data.m === "object") {
      for (const gk in data.m) {
        if (GLOVES[gk]) p.mastery[gk] = numf(data.m[gk]);
      }
    }
    if (Array.isArray(data.ofx)) {
      for (let i = 0; i < data.ofx.length; i++) {
        if (KILL_EFFECTS[data.ofx[i]]) p.ownedFx[data.ofx[i]] = true;
      }
    }
    if (typeof data.kfx === "string" && KILL_EFFECTS[data.kfx] && p.ownedFx[data.kfx]) {
      p.killFx = data.kfx;
    }
    if (Array.isArray(data.bg)) {
      for (let i = 0; i < data.bg.length; i++) {
        if (BADGES[data.bg[i]]) p.badges[data.bg[i]] = true;
      }
    }
    if (typeof data.bd === "string" && BADGES[data.bd] && p.badges[data.bd]) {
      p.badge = data.bd;
    }
    if (data.dq && typeof data.dq === "object") {
      p.dailyQuestState = {
        day: numf(data.dq.day),
        prog: data.dq.prog && typeof data.dq.prog === "object" ? { ...data.dq.prog } : {},
        done: data.dq.done && typeof data.dq.done === "object" ? { ...data.dq.done } : {},
        bonusClaimed: !!data.dq.bonusClaimed,
      };
    }
    if (typeof data.tl === "string" && TITLE_MAP[data.tl]) p.title = data.tl;
    if (typeof data.g === "string" && GLOVES[data.g] && p.un[data.g]) p.glove = data.g;
    if (data.lb) lbMerge(data.lb);
    p.hadSave = true;
  }

  // Migrate legacy slapX1 titles/assists if present and not yet merged
  try {
    const rawX = api.getPlayerDbValue(id, LEGACY_X_KEY);
    if (rawX) {
      const xd = typeof rawX === "string" ? JSON.parse(rawX) : rawX;
      if (xd && typeof xd === "object") {
        if (!p.assists && xd.a) p.assists = numf(xd.a);
        if (Array.isArray(xd.o)) {
          for (let i = 0; i < xd.o.length; i++) {
            if (TITLE_MAP[xd.o[i]]) p.ownedTitles[xd.o[i]] = true;
          }
        }
        if (!p.title && typeof xd.t === "string" && TITLE_MAP[xd.t]) p.title = xd.t;
        if (xd.lb) lbMerge(xd.lb);
      }
    }
  } catch (_) {}

  // Ensure starter milestone gloves (need <= 80) are unlocked based on lifetime slaps
  for (let i = 0; i < GORDER.length; i++) {
    const gid = GORDER[i];
    if (!p.un[gid] && !GLOVES[gid].special && !GLOVES[gid].secret && GLOVES[gid].need <= 80 && p.totalSlaps >= GLOVES[gid].need) {
      p.un[gid] = true;
    }
  }

  p.loaded = true;
  p.playMin = Math.floor(p.playMs / 60000);
  p.hudSig = "";
  p.tagSig = "";
  p.shopSig = "";
  p.btnGlove = null;
  touchAllLb(id, p);
  return true;
}

export function savePlayer(id) {
  const p = P[id];
  if (!p || !p.loaded) return false;

  touchAllLb(id, p);
  const prevGlove = p.prac && p.realGlove ? p.realGlove : p.shuffleSavedGlove || p.glove;
  const unList = [];
  for (const k in p.un) if (p.un[k]) unList.push(k);
  const freshList = [];
  for (const k in p.fresh) if (p.fresh[k]) freshList.push(k);
  const achList = [];
  for (const k in p.ach) if (p.ach[k]) achList.push(k);
  const titleList = [];
  for (const k in p.ownedTitles) if (p.ownedTitles[k]) titleList.push(k);
  const fxList = [];
  for (const k in p.ownedFx) if (p.ownedFx[k]) fxList.push(k);
  const badgeList = [];
  for (const k in p.badges) if (p.badges[k]) badgeList.push(k);

  const payload = JSON.stringify({
    v: 2,
    s: p.slaps,
    ts: p.totalSlaps,
    k: p.kills,
    fl: p.falls,
    b: p.bestStreak,
    cn: p.cancels,
    pf: p.perfects,
    as: p.assists,
    rf: p.reflects,
    mk: p.multiKills,
    ks: p.ksMaxStage,
    g: prevGlove,
    u: unList,
    f: freshList,
    m: p.mastery,
    kfx: p.killFx,
    ofx: fxList,
    ac: achList,
    ot: titleList,
    tl: p.title,
    bg: badgeList,
    bd: p.badge,
    dq: p.dailyQuestState,
    ld: p.lastDay,
    ds: p.dailyStreak,
    bds: p.bestDaily,
    dc: p.dailyClaims,
    pt: Math.floor(p.playMs),
    lt: p.lifeIdx,
    dw: p.duelWins,
    kd: p.kingsDethroned,
    bc: p.bountiesClaimed,
    sp: p.secProg,
    lo: p.loadouts,
    lb: lbTop(15),
  });

  const ok = okSafe("setPlayerDbValue", () => api.setPlayerDbValue(id, DB_KEY, payload));
  if (ok) {
    p.dirty = false;
    p.lastSave = Date.now();
    if (!p.verified) {
      p.verified = true;
      const readBack = safe("getPlayerDbValue(verify)", () => api.getPlayerDbValue(id, DB_KEY));
      if (readBack !== payload) {
        FAIL.dbVerify = "saved value did not read back identically";
      }
    }
  }
  return ok;
}

export function saveAll(onlyDirty) {
  lbTouch();
  const ids = api.getPlayerIds();
  let saved = 0;
  let failed = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const p = P[id];
    if (!p || !p.loaded) continue;
    if (onlyDirty && !p.dirty) continue;
    if (savePlayer(id)) saved++;
    else failed++;
  }
  saveAllLb();
  return { saved, failed };
}

export function handlePeriodicSave() {
  return saveAll(true);
}

export function grantMovementGrace() {}

