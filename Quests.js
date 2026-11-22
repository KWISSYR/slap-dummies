import { DAILY_QUEST_POOL, BADGES, STAR } from "./Config.js";
import {
  safe, T, ent, nm, bcast, flash, sfx, localDay, msToNextDay, fmtDur, unlockFx,
} from "./Visuals.js";
import { P, pd, savePlayer } from "./PlayerData.js";
import { giveSlaps } from "./Progression.js";

// ============================================================================
// DAILY QUESTS & EARNABLE BADGE REWARDS
// ============================================================================

const SLOT_2_IDS = ["ko_3_daily", "ko_5_daily", "slap_25_daily"];
const SLOT_3_IDS = ["ability_8_daily", "cancel_2_daily", "koth_1_daily", "reflect_1_daily"];

export function getActiveDailyQuests(now) {
  const day = localDay(now || Date.now());
  const q1 = DAILY_QUEST_POOL.slap_5_life;
  const q2 = DAILY_QUEST_POOL[SLOT_2_IDS[Math.abs(day) % SLOT_2_IDS.length]];
  const q3 = DAILY_QUEST_POOL[SLOT_3_IDS[Math.abs(day * 3 + 1) % SLOT_3_IDS.length]];
  return [q1, q2, q3];
}

export function ensureDailyQuestState(p, now) {
  if (!p) return null;
  const day = localDay(now || Date.now());
  if (!p.dailyQuestState || p.dailyQuestState.day !== day) {
    p.dailyQuestState = { day, prog: {}, done: {}, bonusClaimed: false };
    p.hudSig = "";
    p.shopSig = "";
    p.dirty = true;
  }
  return p.dailyQuestState;
}

export function awardBadge(id, badgeId, silent) {
  const p = P[id];
  const b = BADGES[badgeId];
  if (!p || !b || p.badges[badgeId]) return false;
  p.badges[badgeId] = true;
  if (!p.badge) p.badge = badgeId;
  p.dirty = true;
  p.tagSig = "";
  p.shopSig = "";
  if (!silent) {
    sfx(id, "levelup");
    flash(id, STAR + " BADGE EARNED: " + b.name.toUpperCase() + " " + STAR);
    safe("msg", () =>
      api.sendMessage(id, "BADGE UNLOCKED: [" + b.tag + "] " + b.name + " \u2014 " + b.desc + " (Equip via Shop -> Quests & Badges or 'badge " + badgeId + "')", { color: "gold" })
    );
    bcast(
      [ent(id, "#ffd60a"), T(" earned the ", "#ffffff"), T("[" + b.tag + "] " + b.name + " badge!", b.color, true)],
      nm(id) + " earned the [" + b.tag + "] " + b.name + " badge!",
      "gold"
    );
    unlockFx(id, p.glove);
  }
  return true;
}

export function equipBadge(id, badgeId) {
  const p = pd(id);
  if (badgeId === "none" || badgeId === "off") {
    p.badge = "";
    p.dirty = true;
    p.tagSig = "";
    p.shopSig = "";
    safe("msg", () => api.sendMessage(id, "Badge unequipped.", { color: "gray" }));
    savePlayer(id);
    return true;
  }
  const b = BADGES[badgeId];
  if (!b) {
    safe("msg", () => api.sendMessage(id, "Unknown badge. Type 'badges' to see earned badges.", { color: "orange" }));
    return false;
  }
  if (!p.badges[badgeId]) {
    safe("msg", () => api.sendMessage(id, b.name + " is locked: " + b.desc, { color: "red" }));
    return false;
  }
  p.badge = p.badge === badgeId ? "" : badgeId;
  p.dirty = true;
  p.tagSig = "";
  p.shopSig = "";
  safe("msg", () =>
    api.sendMessage(id, p.badge ? "Equipped Badge: [" + b.tag + "] " + b.name : "Badge removed.", { color: "lime" })
  );
  savePlayer(id);
  return true;
}

export function resetLifeQuests(id) {
  const p = P[id];
  if (!p || !p.loaded || p.prac) return;
  const dq = ensureDailyQuestState(p, Date.now());
  const active = getActiveDailyQuests(Date.now());
  let changed = false;
  for (let i = 0; i < active.length; i++) {
    const q = active[i];
    if (q.perLife && !dq.done[q.id] && (dq.prog[q.id] || 0) > 0) {
      dq.prog[q.id] = 0;
      changed = true;
    }
  }
  if (changed) {
    p.hudSig = "";
    p.shopSig = "";
  }
}

export function recordQuestEvent(id, eventName, amount) {
  const p = P[id];
  if (!p || !p.loaded || p.prac) return false;
  const now = Date.now();
  const dq = ensureDailyQuestState(p, now);
  const active = getActiveDailyQuests(now);
  const inc = Math.max(1, Math.floor(amount || 1));
  let completedAny = false;

  for (let i = 0; i < active.length; i++) {
    const q = active[i];
    if (q.event !== eventName || dq.done[q.id]) continue;

    const nextVal = Math.min(q.target, (dq.prog[q.id] || 0) + inc);
    dq.prog[q.id] = nextVal;
    p.dirty = true;
    p.hudSig = "";
    p.shopSig = "";

    if (nextVal >= q.target) {
      dq.done[q.id] = true;
      completedAny = true;
      giveSlaps(id, q.reward, true);
      flash(id, STAR + " QUEST COMPLETE: " + q.name.toUpperCase() + " +" + q.reward + " " + STAR);
      sfx(id, "levelup");
      safe("msg", () =>
        api.sendMessage(id, "DAILY QUEST COMPLETE: " + q.desc + " (+" + q.reward + " Slaps!)", { color: "lime" })
      );
      if (q.badge) awardBadge(id, q.badge, false);
    } else if (q.perLife) {
      safe("msg", () =>
        api.sendMessage(id, "Quest [" + q.name + "]: " + nextVal + "/" + q.target + " (one life)", { color: "aqua" })
      );
    }
  }

  // All 3 daily quests done -> Daily Champion badge + 100 bonus slaps!
  if (completedAny && !dq.bonusClaimed) {
    let allDone = true;
    for (let i = 0; i < active.length; i++) {
      if (!dq.done[active[i].id]) {
        allDone = false;
        break;
      }
    }
    if (allDone) {
      dq.bonusClaimed = true;
      giveSlaps(id, 100, true);
      safe("msg", () =>
        api.sendMessage(id, "ALL DAILY QUESTS COMPLETE! Bonus +100 Slaps awarded!", { color: "gold" })
      );
      awardBadge(id, "daily_champ", false);
    }
    savePlayer(id);
  }
  return completedAny;
}

export function getQuestHudSummary(p, now) {
  const dq = ensureDailyQuestState(p, now);
  const active = getActiveDailyQuests(now);
  let done = 0;
  for (let i = 0; i < active.length; i++) {
    if (dq.done[active[i].id]) done++;
  }
  const lifeQ = active[0];
  const lifeProg = dq.done[lifeQ.id] ? "DONE" : (dq.prog[lifeQ.id] || 0) + "/" + lifeQ.target;
  return done + "/" + active.length + " (" + lifeProg + ")";
}

export function showQuestsChat(id, p) {
  const now = Date.now();
  const dq = ensureDailyQuestState(p, now);
  const active = getActiveDailyQuests(now);
  safe("msg", () =>
    api.sendMessage(id, "DAILY OBJECTIVES \u2014 Resets in " + fmtDur(msToNextDay(now)), { color: "gold" })
  );
  for (let i = 0; i < active.length; i++) {
    const q = active[i];
    const done = !!dq.done[q.id];
    const prog = done ? q.target : (dq.prog[q.id] || 0);
    const b = BADGES[q.badge];
    safe("msg", () =>
      api.sendMessage(
        id,
        (done ? "[DONE] " : "[" + prog + "/" + q.target + "] ") + q.name + ": " + q.desc +
          " (+" + q.reward + " Slaps" + (b ? " + [" + b.tag + "] Badge" : "") + ")",
        { color: done ? "lime" : "white" }
      )
    );
  }
  safe("msg", () => api.sendMessage(id, "Type 'badges' or open Shop -> Quests & Badges to equip earned badges!", { color: "aqua" }));
}

export function showBadgesChat(id, p) {
  const keys = Object.keys(BADGES);
  let owned = 0;
  for (let i = 0; i < keys.length; i++) if (p.badges[keys[i]]) owned++;
  safe("msg", () => api.sendMessage(id, "BADGES (" + owned + "/" + keys.length + ") \u2014 type 'badge <id>' to wear:", { color: "gold" }));
  for (let i = 0; i < keys.length; i++) {
    const bid = keys[i];
    const b = BADGES[bid];
    const has = !!p.badges[bid];
    const wearing = p.badge === bid;
    safe("msg", () =>
      api.sendMessage(
        id,
        (wearing ? "[WEARING] " : has ? "[OWNED] " : "[LOCKED] ") + bid + " [" + b.tag + "] " + b.name + " \u2014 " + b.desc,
        { color: wearing ? "lime" : has ? "aqua" : "gray" }
      )
    );
  }
}
