import { CFG, GLOVES, KILL_EFFECTS, DAILY_BONUS, SESSION_REWARDS, getKsStageConfig, activeGloveVisual } from "./Config.js";

// ============================================================================
// SAFE API WRAPPERS, STYLED TEXT & ENVIRONMENTAL HELPERS
// ============================================================================

export const FAIL = {};
export const MODE = { hud: 0, bc: 0, tag: 1 };
const MAXM = { hud: 4, bc: 4, tag: 5 };
let TINT_MODE = 1;

const COLOR_NAMES = [
  ["white", 255, 255, 255], ["silver", 192, 192, 192], ["gray", 128, 128, 128],
  ["gold", 255, 215, 0], ["yellow", 255, 255, 0], ["orange", 255, 165, 0],
  ["tomato", 255, 99, 71], ["red", 255, 0, 0], ["hotpink", 255, 105, 180],
  ["magenta", 255, 0, 255], ["purple", 128, 0, 128], ["violet", 238, 130, 238],
  ["lime", 0, 255, 0], ["limegreen", 50, 205, 50], ["aqua", 0, 255, 255],
  ["lightskyblue", 135, 206, 250], ["dodgerblue", 30, 144, 255],
];

export function safe(label, fn) {
  try {
    return fn();
  } catch (err) {
    if (!FAIL[label]) {
      FAIL[label] = String(err);
      try { api.log("API FAIL " + label + ": " + err); } catch (_) {}
    }
    return undefined;
  }
}

export function okSafe(label, fn) {
  try {
    fn();
    return true;
  } catch (err) {
    if (!FAIL[label]) {
      FAIL[label] = String(err);
      try { api.log("API FAIL " + label + ": " + err); } catch (_) {}
    }
    return false;
  }
}

export function rawName(id) {
  const n = safe("getEntityName", () => api.getEntityName(id));
  return typeof n === "string" ? n : undefined;
}

export function nm(id) {
  return rawName(id) || "Player";
}

export function T(text, color, bold) {
  return { t: text, c: color || "#ffffff", b: !!bold };
}

export function ent(id, color) {
  return { e: id, c: color || "#ffffff" };
}

export function cname(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex));
  if (!m) return "white";
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  let best = "white", bestD = 1e9;
  for (let i = 0; i < COLOR_NAMES.length; i++) {
    const c = COLOR_NAMES[i];
    const d = (c[1] - r) * (c[1] - r) + (c[2] - g) * (c[2] - g) + (c[3] - b) * (c[3] - b);
    if (d < bestD) { bestD = d; best = c[0]; }
  }
  return best;
}

export function hexRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex));
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
}

function plainText(parts, singleLine) {
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    out += parts[i].e !== undefined ? nm(parts[i].e) : parts[i].t;
  }
  return singleLine ? out.replace(/^\n+/, "").replace(/\n/g, "  |  ") : out;
}

export function compile(parts, mode, kind) {
  if (kind === "tag") {
    if (mode >= 5) return [{ str: plainText(parts, true) }];
    const useNames = mode === 2 || mode === 4;
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const str = p.e !== undefined ? (rawName(p.e) || nm(p.e)) : p.t;
      out.push({ str, style: { color: useNames ? cname(p.c) : p.c } });
    }
    return out;
  }
  if (mode >= 3) return plainText(parts, mode >= 4);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.e === undefined) {
      const style = { color: mode === 2 ? cname(p.c) : p.c };
      if (mode === 0 && p.b) style.fontWeight = "bold";
      out.push({ str: p.t, style });
    } else {
      out.push({ str: rawName(p.e) || nm(p.e), style: { color: mode === 2 ? cname(p.c) : p.c } });
    }
  }
  return out;
}

export function styledTry(kind, fn) {
  for (let m = MODE[kind]; m <= MAXM[kind]; m++) {
    try {
      fn(m);
      MODE[kind] = m;
      return true;
    } catch (err) {
      const msg = String(err);
      const key = "text:" + kind + ":mode" + m;
      if (!FAIL[key]) {
        FAIL[key] = msg.slice(0, 140);
        try { api.log("STYLE FAIL " + key + ": " + msg.slice(0, 200)); } catch (_) {}
      }
      if (!/invalid|expected|valid|argument/i.test(msg)) return false;
    }
  }
  return false;
}

export function bcast(parts, fallbackText, fallbackColor) {
  styledTry("bc", (m) => {
    const compiled = compile(parts, m, "bc");
    if (typeof compiled === "string") {
      api.broadcastMessage(compiled || fallbackText, { color: fallbackColor || cname(parts[0].c) });
    } else {
      api.broadcastMessage(compiled);
    }
  });
}

export function flash(id, msg) {
  safe("sendFlyingMiddleMessage", () => api.sendFlyingMiddleMessage(id, [msg], 400));
}

export function sfx(id, sound, vol, pitch) {
  safe("playSound", () => api.playSound(id, sound || "hit", vol || 1, pitch || 1));
}

function tintValue(rgba, mode) {
  if (mode === 1) return rgba;
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgba);
  if (!m) return "#ff6060";
  const toHex = (v) => {
    const h = Math.max(0, Math.min(255, +v)).toString(16);
    return h.length < 2 ? "0" + h : h;
  };
  return "#" + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
}

export function tint(id, p, rgba, ms) {
  if (TINT_MODE >= 3) return;
  p.tintUntil = Date.now() + ms;
  p.tinted = true;
  for (let m = TINT_MODE; m <= 2; m++) {
    try {
      api.setTargetedPlayerSettingForEveryone(id, "overlayColour", tintValue(rgba, m), true);
      TINT_MODE = m;
      return;
    } catch (err) {
      const k = "overlayColour:mode" + m;
      if (!FAIL[k]) {
        FAIL[k] = String(err).slice(0, 140);
        try { api.log("TINT FAIL " + k + ": " + err); } catch (_) {}
      }
      if (!/invalid|expected|valid|argument/i.test(String(err))) return;
    }
  }
  TINT_MODE = 3;
  p.tinted = false;
}

export function clearTint(id) {
  const vals = [null, ""];
  for (let i = 0; i < vals.length; i++) {
    try {
      api.setTargetedPlayerSettingForEveryone(id, "overlayColour", vals[i], true);
      return;
    } catch (err) {
      if (i === vals.length - 1 && !FAIL.clearTint) {
        FAIL.clearTint = String(err).slice(0, 140);
      }
    }
  }
}

export function solid(x, y, z) {
  const b = safe("getBlock", () => api.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
  return !!b && b !== "Air" && b !== "Water" && b !== "Lava";
}

export function facing(id) {
  const info = safe("getPlayerFacingInfo", () => api.getPlayerFacingInfo(id));
  if (info && info.dir && info.dir.length === 3) {
    const dx = info.dir[0], dz = info.dir[2];
    const len = Math.hypot(dx, dz);
    if (len > 0.01) return [dx / len, dz / len];
  }
  return null;
}

export function bar(filled, total) {
  let s = "";
  for (let i = 0; i < total; i++) s += i < filled ? "\u2588" : "\u2591";
  return s;
}

export function fmtDur(ms) {
  const sec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? h + "h " + m + "m" : m ? m + "m " + s + "s" : s + "s";
}

export function fmtShort(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return sec >= 60 ? Math.ceil(sec / 60) + "m" : sec + "s";
}

function daysFromCivil(y, m, d) {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - 400 * era;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  return 146097 * era + (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy) - 719468;
}

function yearFromDays(z) {
  z += 719468;
  const era = Math.floor(z / 146097);
  const doe = z - 146097 * era;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  return yoe + 400 * era + (Math.floor((5 * doy + 2) / 153) >= 10 ? 1 : 0);
}

function sundayOnOrAfter(d) {
  return d + (7 - ((d % 7) + 11) % 7) % 7;
}

function usDst(ms) {
  const tz = CFG.tzStd;
  const yr = yearFromDays(Math.floor((ms + 3600000 * tz) / 86400000));
  const start = sundayOnOrAfter(daysFromCivil(yr, 3, 1)) + 7;
  const end = sundayOnOrAfter(daysFromCivil(yr, 11, 1));
  return ms >= 3600000 * (24 * start + 2 - tz) && ms < 3600000 * (24 * end + 2 - (tz + 1));
}

function localOffsetMs(ms) {
  return 3600000 * (CFG.tzStd + (CFG.tzDst && usDst(ms) ? 1 : 0));
}

export function localDay(ms) {
  return Math.floor((ms + localOffsetMs(ms)) / 86400000);
}

export function msToNextDay(ms) {
  return 86400000 * (localDay(ms) + 1) - localOffsetMs(ms) - ms;
}

export function dailyReward(day) {
  return Math.min(CFG.dailyCap, CFG.dailyBase + CFG.dailyPerDay * (day - 1));
}

export function sessionThreshold(idx) {
  if (idx < SESSION_REWARDS.length) return SESSION_REWARDS[idx][0];
  return SESSION_REWARDS[SESSION_REWARDS.length - 1][0] +
    (idx - SESSION_REWARDS.length + 1) * Math.max(60000, CFG.sessionRepeatMs);
}

export function sessionSlaps(idx) {
  return idx < SESSION_REWARDS.length ? SESSION_REWARDS[idx][1] : CFG.sessionRepeatSlaps;
}

export function numf(v) {
  return typeof v === "number" && isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export { DAILY_BONUS };

// ============================================================================
// PARTICLE EFFECTS & PRESETS
// ============================================================================

let PFAIL = 0;
const PRESET_BAD = {};

function getPalette(gloveOrColors) {
  if (Array.isArray(gloveOrColors)) return gloveOrColors;
  return (GLOVES[gloveOrColors] || GLOVES.default).c;
}

export function pOpts(pos, gloveOrColors, count, power, mode, isPoint) {
  const cols = getPalette(gloveOrColors);
  const c0 = hexRgb(cols[0]);
  const c1 = hexRgb(cols[Math.min(1, cols.length - 1)]);
  const c2 = hexRgb(cols[cols.length - 1]);
  const pad = isPoint ? 0.1 : 0.4;

  return {
    pos1: [pos[0] - pad, pos[1] + (isPoint ? -pad : 0.2), pos[2] - pad],
    pos2: [pos[0] + pad, pos[1] + (isPoint ? pad : 1.6), pos[2] + pad],
    dir1: isPoint ? [-0.15, -0.15, -0.15] : [-1, 0.3, -1],
    dir2: isPoint ? [0.15, 0.15, 0.15] : [1, 1.2, 1],
    texture: mode === 0 ? "glint" : "square_particle",
    minLifeTime: isPoint ? 0.3 : 0.4,
    maxLifeTime: isPoint ? 0.7 : 1.1,
    minEmitPower: power * (isPoint ? 0.15 : 0.5),
    maxEmitPower: power * (isPoint ? 0.35 : 1),
    minSize: isPoint ? 0.14 : 0.18,
    maxSize: isPoint ? 0.3 : 0.45,
    manualEmitCount: count,
    gravity: [0, isPoint ? 0 : -7, 0],
    velocityGradients: [
      { timeFraction: 0, factor: 1, factor2: 1 },
      { timeFraction: 1, factor: 0.2, factor2: 0.4 },
    ],
    colorGradients: [
      { timeFraction: 0, minColor: [c0[0], c0[1], c0[2], 1], maxColor: [c1[0], c1[1], c1[2], 1] },
      { timeFraction: 0.6, minColor: [c1[0], c1[1], c1[2], 0.85], maxColor: [c2[0], c2[1], c2[2], 0.85] },
      { timeFraction: 1, minColor: [c2[0], c2[1], c2[2], 0], maxColor: [c2[0], c2[1], c2[2], 0] },
    ],
    blendMode: mode === 0 ? 2 : 1,
    hideDist: 60,
  };
}

function sendParticle(pos, gloveOrColors, count, power, isPoint) {
  if (!CFG.particles || CFG.pmode >= 2 || !pos) return;
  for (let m = CFG.pmode; m <= 1; m++) {
    try {
      api.playParticleEffect(pOpts(pos, gloveOrColors, count, power, m, !!isPoint));
      CFG.pmode = m;
      PFAIL = 0;
      return;
    } catch (err) {
      const msg = String(err);
      const k = "particle:m" + m;
      if (!FAIL[k]) {
        FAIL[k] = msg.slice(-160);
        try { api.log("PARTICLE FAIL " + k + ": " + msg.slice(-220)); } catch (_) {}
      }
      if (/playParticleEffect is not a function/i.test(msg)) {
        CFG.pmode = 2;
        return;
      }
    }
  }
  if (++PFAIL >= 5) CFG.pmode = 2;
}

export function puff(pos, gloveOrColors, count, power) {
  sendParticle(pos, gloveOrColors, count, power, false);
}

export function puffPoint(pos, gloveOrColors) {
  sendParticle(pos, gloveOrColors, 1, 0.8, true);
}

export function emit(opts) {
  if (!CFG.particles || CFG.pmode >= 2) return false;
  return okSafe("particle:raw", () => api.playParticleEffect(opts));
}

export function preset(presetId, pos, scale) {
  if (!CFG.presets || !CFG.particles || CFG.pmode >= 2 || !pos || !presetId || PRESET_BAD[presetId]) return false;
  const r = (scale || 1.5) / 2;
  const ok = okSafe("preset:" + presetId, () => {
    api.playParticleEffect({
      presetId,
      pos1: [pos[0] - r, pos[1] + 0.2, pos[2] - r],
      pos2: [pos[0] + r, pos[1] + 1.6, pos[2] + r],
    });
  });
  if (!ok) PRESET_BAD[presetId] = 1;
  return ok;
}

export function ring(pos, gloveOrColors, radius, steps) {
  if (!CFG.particles || CFG.pmode >= 2 || !pos || !radius) return;
  const count = steps || CFG.ringSteps;
  for (let i = 0; i < count; i++) {
    const a = (6.2832 * i) / count;
    const cx = Math.cos(a), cz = Math.sin(a);
    const o = pOpts(pos, gloveOrColors, 3, 1, CFG.pmode, false);
    o.pos1 = [pos[0] - 0.15, pos[1] + 0.1, pos[2] - 0.15];
    o.pos2 = [pos[0] + 0.15, pos[1] + 0.3, pos[2] + 0.15];
    o.dir1 = [0.95 * cx, 0, 0.95 * cz];
    o.dir2 = [1.05 * cx, 0.08, 1.05 * cz];
    o.gravity = [0, 0, 0];
    o.minLifeTime = 0.42;
    o.maxLifeTime = 0.5;
    o.minEmitPower = (radius / 0.5) * 1.6;
    o.maxEmitPower = (radius / 0.5) * 1.9;
    o.minSize = 0.2;
    o.maxSize = 0.4;
    emit(o);
  }
}

export function pillar(pos, gloveOrColors, count) {
  if (!CFG.particles || CFG.pmode >= 2 || !pos) return;
  const o = pOpts(pos, gloveOrColors, count || 24, 3, CFG.pmode, false);
  o.pos1 = [pos[0] - 0.5, pos[1] + 0.1, pos[2] - 0.5];
  o.pos2 = [pos[0] + 0.5, pos[1] + 0.3, pos[2] + 0.5];
  o.dir1 = [-0.15, 1, -0.15];
  o.dir2 = [0.15, 1, 0.15];
  o.gravity = [0, 1, 0];
  o.minLifeTime = 0.6;
  o.maxLifeTime = 1.2;
  o.minEmitPower = 4;
  o.maxEmitPower = 7;
  emit(o);
}

export function impactFx(pos, gloveId, isCrit) {
  if (!pos) return;
  const g = GLOVES[gloveId] || GLOVES.default;
  puff(pos, g.c, isCrit ? 22 : 12, isCrit ? 5.5 : 3.8);
  if (g.tier === "legendary" || g.tier === "extreme" || isCrit) {
    ring(pos, g.c, isCrit ? 3.2 : 2.2, 8);
  }
  if (g.preset && (isCrit || g.tier === "extreme")) {
    preset(g.preset, pos, 1.4);
  }
}

export function unlockFx(id, gloveId) {
  const pos = safe("getPosition", () => api.getPosition(id));
  if (!pos) return;
  pillar(pos, gloveId, 40);
  ring(pos, gloveId, 5, 14);
  preset("yellowFirecrackerLarge", pos, 2.2);
}

export function killFx(id, p) {
  const pos = safe("getPosition", () => api.getPosition(id));
  if (!pos) return;
  const fx = KILL_EFFECTS[p.killFx] || KILL_EFFECTS.fx_default;
  const vis = activeGloveVisual(p);
  const cols = p.killFx && p.killFx !== "fx_default" ? fx.colors : vis.c;
  pillar(pos, cols, p.streak >= 5 ? 28 : 20);
  if (p.killFx && p.killFx !== "fx_default") ring(pos, cols, 3.6, 12);
  preset(p.streak >= 5 ? "redFirecrackerLarge" : fx.preset, pos, 1.9);
  sfx(id, fx.koSound || "exp_collect");
}

export function abilityFx(id, p) {
  const pos = safe("getPosition", () => api.getPosition(id));
  const g = GLOVES[p.glove];
  if (!pos || !g) return;
  const vis = activeGloveVisual(p);
  if (g.ring > 0) ring(pos, vis.c, g.ring, CFG.ringSteps);
  if (g.preset) preset(g.preset, pos, 2);
}

// ============================================================================
// ORBITING MESH ENTITIES, HAND ATTACHMENTS, TETHERS & TRAILS
// ============================================================================

export const ORPH = [];
const TH = [];

export function cleanupOrphans() {
  for (let i = 0; i < ORPH.length; i++) {
    const eid = ORPH[i];
    safe("deleteMeshEntity", () => api.deleteMeshEntity(eid));
  }
  ORPH.length = 0;
}

export function mkBlock(blockName, size, autoRotate, extra) {
  const opts = { blockName, size, autoRotate: !!autoRotate, hideDist: 60 };
  if (extra) {
    for (const k in extra) opts[k] = extra[k];
  }
  const eid = safe("attemptCreateMeshEntity(" + blockName + ")", () =>
    api.attemptCreateMeshEntity("BloxdBlock", opts)
  );
  if (eid) ORPH.push(eid);
  return eid || null;
}

export function killEnt(eid) {
  if (!eid) return;
  safe("deleteMeshEntity", () => api.deleteMeshEntity(eid));
  const idx = ORPH.indexOf(eid);
  if (idx >= 0) ORPH.splice(idx, 1);
}

export function fxEnt(p, key, active, blockName, size, yOff, spin, pos, now) {
  let eid = p.fe[key];
  if (active) {
    if (!eid) {
      if (now < (p.feRetry[key] || 0)) return;
      eid = mkBlock(blockName, size, spin);
      if (!eid) {
        p.feRetry[key] = now + 4000;
        return;
      }
      p.fe[key] = eid;
    }
    if (!okSafe("fxSetPosition", () => api.setPosition(eid, pos[0], pos[1] + yOff, pos[2]))) {
      killEnt(eid);
      p.fe[key] = null;
      p.feRetry[key] = now + 2000;
    }
  } else if (eid) {
    killEnt(eid);
    p.fe[key] = null;
  }
}

export function attachHand(id, blockName) {
  return okSafe("handAttach", () => {
    api.updateEntityNodeMeshAttachment(
      id,
      "ArmRightMesh",
      "BloxdBlock",
      { blockName, size: CFG.handSize },
      [0, CFG.handY, CFG.handZ],
      [0, 0, 0]
    );
  });
}

export function spawnOrbs(p) {
  const vis = activeGloveVisual(p);
  const count = Math.max(0, Math.min(6, Math.floor(vis.orbs || 0)));
  if (!count) return false;

  const orbs = [];
  for (let i = 0; i < count; i++) {
    let eid = mkBlock(vis.b, CFG.orbBlockSize, true);
    if (!eid && vis.b !== "Block of Iron") {
      eid = mkBlock("Block of Iron", CFG.orbBlockSize, true);
    }
    if (!eid) break;
    orbs.push(eid);
  }
  if (!orbs.length) return false;
  p.orbs = orbs;
  p.orbBlock = vis.b;
  p.orbTargetCount = count;
  return true;
}

export function removeOrbs(p) {
  if (!p || !p.orbs) return;
  for (let i = 0; i < p.orbs.length; i++) killEnt(p.orbs[i]);
  p.orbs = null;
  p.orbBlock = null;
  p.orbTargetCount = 0;
}

function moveOrbs(p, pos, now, vis) {
  const count = p.orbs.length;
  const boosted =
    now < p.spinUntil || now < p.armorUntil || now < p.ghostUntil ||
    now < p.mirrorUntil || now < p.shieldUntil || now < p.titanUntil;
  const radius = CFG.orbBlockRadius * (boosted ? 1.38 : 1);
  const height = CFG.orbBlockHeight * (p.rag ? 0.45 : 1);
  const emitOrbPuff = CFG.particles && CFG.pmode < 2 && now - p.orbitPuffAt > 280;

  for (let i = 0; i < count; i++) {
    const a = p.orbAngle + (6.2832 * i) / count;
    const ox = pos[0] + Math.cos(a) * radius;
    const oy = pos[1] + height + 0.18 * Math.sin(now / 320 + 2.1 * i);
    const oz = pos[2] + Math.sin(a) * radius;
    const eid = p.orbs[i];
    if (!okSafe("orbSetPosition", () => api.setPosition(eid, ox, oy, oz))) return false;
    if (emitOrbPuff) puffPoint([ox, oy, oz], vis.c);
  }
  if (emitOrbPuff) p.orbitPuffAt = now;
  return true;
}

export function tether(fromId, toId, blockName) {
  const eid = mkBlock(blockName, 0.22, false, { lineToEId: toId });
  if (eid) {
    TH.push({ id: eid, f: fromId, until: Date.now() + CFG.tetherMs });
  }
}

export function thTick(now) {
  for (let i = TH.length - 1; i >= 0; i--) {
    const t = TH[i];
    const pos = t.until > now ? safe("getPosition", () => api.getPosition(t.f)) : null;
    if (!pos || !okSafe("tetherPos", () => api.setPosition(t.id, pos[0], pos[1] + 1, pos[2]))) {
      killEnt(t.id);
      TH.splice(i, 1);
    }
  }
}

export function cleanupPlayerEntities(p) {
  if (!p) return;
  removeOrbs(p);
  if (p.fe) {
    for (const k in p.fe) {
      if (p.fe[k]) {
        killEnt(p.fe[k]);
        p.fe[k] = null;
      }
    }
  }
}

export function cleanupAllAnimations(playerMap) {
  if (playerMap) {
    for (const id in playerMap) cleanupPlayerEntities(playerMap[id]);
  }
  while (TH.length) killEnt(TH.pop().id);
  cleanupOrphans();
}

export function fxTick(id, p, pos, now, dt) {
  const vis = activeGloveVisual(p);
  const wantOrbs = CFG.fx && CFG.orbBlocks && vis.orbs > 0;

  if (wantOrbs) {
    if (p.orbs && (p.orbBlock !== vis.b || p.orbTargetCount !== vis.orbs)) {
      removeOrbs(p);
    }
    if (!p.orbs && now >= p.orbRetry) {
      if (!spawnOrbs(p)) p.orbRetry = now + 4000;
    }
  } else if (p.orbs) {
    removeOrbs(p);
  }

  const boosted =
    now < p.spinUntil || now < p.armorUntil || now < p.ghostUntil ||
    now < p.mirrorUntil || now < p.shieldUntil || now < p.titanUntil ||
    (p.glove === "killstreak" && p.ksStage >= 3);

  if (CFG.fx && vis.orbs > 0) {
    p.orbAngle += CFG.orbitSpeed * (boosted ? 2.4 : 1) * dt;
    if (p.orbs) {
      if (!moveOrbs(p, pos, now, vis)) {
        removeOrbs(p);
        p.orbRetry = now + 2000;
      }
    } else if (CFG.particles && CFG.pmode < 2 && now - p.orbitPuffAt > 280) {
      p.orbitPuffAt = now;
      const cnt = Math.max(1, Math.min(8, Math.floor(CFG.orbitCount)));
      const rad = CFG.orbitRadius * (boosted ? 1.4 : 1);
      const h = p.rag ? 0.72 * CFG.orbitHeight : CFG.orbitHeight;
      for (let i = 0; i < cnt; i++) {
        const a = p.orbAngle + (6.2832 * i) / cnt;
        puffPoint([pos[0] + Math.cos(a) * rad, pos[1] + h + 0.12 * Math.sin(now / 250 + 2 * i), pos[2] + Math.sin(a) * rad], vis.c);
      }
    }
  }

  // Ambient aura & Killstreak aura
  if (CFG.fx && CFG.particles && (p.glove !== "default" || p.ksStage > 0)) {
    const auraEvery = p.glove === "killstreak" && p.ksStage >= 4 ? 180 : 320;
    if (now - p.puffAt > auraEvery) {
      p.puffAt = now;
      const ksBoost = p.glove === "killstreak" ? 1 + p.ksStage * 0.8 : 0;
      puff(pos, vis.c, (boosted ? 5 : 2) + Math.floor(ksBoost), boosted ? 2.4 : 1.2);
    }
  }

  // High-velocity / Dash / Killstreak trails
  if (CFG.fx && CFG.trail && CFG.particles && CFG.pmode < 2 && now - p.trailAt > 80) {
    const spd = Math.hypot(p.vel[0], p.vel[2]);
    const ksTrail = p.glove === "killstreak" && p.ksStage >= 2 && spd > 2.5;
    if ((p.rag && spd > 5) || now < p.dashUntil || p.slamUntil > now || (now < p.ghostUntil && spd > 3) || ksTrail) {
      p.trailAt = now;
      puffPoint([pos[0], pos[1] + 0.5, pos[2]], vis.c);
      puffPoint([pos[0], pos[1] + 1.1, pos[2]], vis.c);
    }
  }

  // Status block overlays
  fxEnt(p, "ice", now < p.frozenUntil && !!p.frozenPos, "Ice", CFG.iceSize, 0.9, false, pos, now);
  fxEnt(p, "bomb", p.bombAt > 0, "Block of Coal", CFG.bombSize, 2.7, true, pos, now);
  fxEnt(p, "shield", (p.inArena && now < p.protUntil) || now < p.shieldUntil, "Glass", CFG.shieldSize, 0.9, false, pos, now);
  fxEnt(p, "mirror", now < p.mirrorUntil, "Block of Diamond", 1.1, 2.5, true, pos, now);
  fxEnt(p, "anchor", now < p.anchorUntil, "Block of Coal", 1.0, 0.2, false, pos, now);

  // Hand attachment sync (evolves with Killstreak stage too)
  const handSig = vis.b + "|" + CFG.handSize + "|" + CFG.handY + "|" + CFG.handZ;
  if (p.handSig !== handSig && now >= p.handRetry) {
    if (attachHand(id, vis.b)) p.handSig = handSig;
    else p.handRetry = now + 5000;
  }

  // Killstreak stage color info cache
  if (p.glove === "killstreak") {
    p.ksColor = getKsStageConfig(p.ksStage).color;
  }
}
