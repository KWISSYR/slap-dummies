import {
  CFG, GLOVES, GORDER, ACHIEVEMENTS, TITLES, WORLD_LB,
  DAILY_BONUS, LIFETIME_REWARDS, STAR, getMasteryRank,
} from "./Config.js";
import {
  safe, T, ent, nm, bcast, flash, sfx,
  localDay, dailyReward, sessionThreshold, sessionSlaps,
  fmtDur, msToNextDay, unlockFx,
} from "./Visuals.js";
import { P, WORLD_STATE, savePlayer, lbTop, touchAllLb, allLbTop } from "./PlayerData.js";

// ============================================================================
// PROGRESSION, ACHIEVEMENTS, TITLES & TIMED REWARDS
// ============================================================================

export function tStat(p, stat) {
  if (stat === "gloves") {
    let cnt = 0;
    for (let i = 0; i < GORDER.length; i++) if (p.un[GORDER[i]]) cnt++;
    return cnt;
  }
  if (stat === "hours") return p.playMs / 3600000;
  if (stat === "hasNova") return p.un.nova ? 1 : 0;
  if (stat === "slaps") return Math.max(p.totalSlaps || 0, p.slaps);
  return p[stat] || 0;
}

export function giveSlaps(id, amount, rawNoDouble) {
  const p = P[id];
  if (!p || p.prac || !amount || amount <= 0) return;
  const frenzyMult = (!rawNoDouble && p.inArena && WORLD_STATE.event && WORLD_STATE.event.id === "frenzy") ? 2 : 1;
  const amt = Math.floor(amount) * frenzyMult;
  p.slaps += amt;
  p.totalSlaps += amt;
  p.dirty = true;
  touchAllLb(id, p);

  // Auto-unlock starter milestone gloves (need <= 80, non-secret)
  for (let i = 0; i < GORDER.length; i++) {
    const gid = GORDER[i];
    const g = GLOVES[gid];
    if (!p.un[gid] && !g.secret && !g.special && g.need <= 80 && p.totalSlaps >= g.need) {
      p.un[gid] = true;
      p.fresh[gid] = true;
      p.spinUntil = Date.now() + 2500;
      safe("msg", () =>
        api.sendMessage(id, "UNLOCKED the " + g.tag + " glove! Open the Shop or type '" + gid + "' to equip it (free!).", { color: "gold" })
      );
      flash(id, STAR + " " + g.tag + " UNLOCKED! " + STAR);
      sfx(id, "levelup");
      bcast(
        [ent(id, "#ffd60a"), T(" unlocked the ", "#ffffff"), T(g.tag + " glove!", g.c[0], true)],
        nm(id) + " unlocked the " + g.tag + " glove!",
        "gold"
      );
      unlockFx(id, gid);
      savePlayer(id);
    }
  }
}

export function awardGloveMastery(id, p, gloveId) {
  if (!p || p.prac || !GLOVES[gloveId]) return;
  const prevKills = p.mastery[gloveId] || 0;
  const prevRank = getMasteryRank(prevKills).rank;
  const nextKills = prevKills + 1;
  p.mastery[gloveId] = nextKills;
  p.dirty = true;

  const next = getMasteryRank(nextKills);
  if (next.rank > prevRank) {
    const g = GLOVES[gloveId];
    const bonus = next.rank === 3 ? 150 : next.rank === 2 ? 60 : 25;
    giveSlaps(id, bonus, true);
    p.hudSig = "";
    p.tagSig = "";
    sfx(id, "levelup");
    flash(id, STAR + " " + g.tag + " MASTERY " + next.badge + " +" + bonus + " " + STAR);
    safe("msg", () =>
      api.sendMessage(
        id,
        "GLOVE MASTERY RANK " + next.rank + " (" + next.label + ") for " + g.tag + "! +" + bonus + " Slaps | Perks: " +
          Math.round((1 - next.cdMult) * 100) + "% faster CD" +
          (next.forceMult > 1 ? ", +" + Math.round((next.forceMult - 1) * 100) + "% KB" : ""),
        { color: "gold" }
      )
    );
    if (next.rank === 3) {
      bcast(
        [ent(id, "#ffd60a"), T(" MASTERED the ", "#ffffff"), T(g.tag + " glove! [M3]", g.c[0], true)],
        nm(id) + " MASTERED the " + g.tag + " glove!",
        "gold"
      );
      unlockFx(id, gloveId);
    }
  }
}

export function checkAchievements(id, p) {
  if (!p.loaded || p.prac) return;
  let unlockedAny = false;
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const a = ACHIEVEMENTS[i];
    if (!p.ach[a.id] && tStat(p, a.stat) >= a.target) {
      p.ach[a.id] = true;
      p.dirty = true;
      unlockedAny = true;
      giveSlaps(id, a.reward);
      sfx(id, "levelup");
      flash(id, STAR + " ACHIEVEMENT: " + a.name.toUpperCase() + " +" + a.reward + " " + STAR);
      safe("msg", () =>
        api.sendMessage(id, "ACHIEVEMENT UNLOCKED: " + a.name + " \u2014 " + a.desc + " (+" + a.reward + " Slaps!)", { color: "gold" })
      );
      unlockFx(id, p.glove);
    }
  }
  if (unlockedAny) savePlayer(id);
}

export function checkTitles(id, p) {
  if (!p.loaded || p.prac) return;
  for (let i = 0; i < TITLES.length; i++) {
    const t = TITLES[i];
    if (!p.ownedTitles[t[0]] && tStat(p, t[3]) >= t[4]) {
      p.ownedTitles[t[0]] = true;
      p.dirty = true;
      sfx(id, "levelup");
      flash(id, STAR + " TITLE: " + t[1].toUpperCase() + " " + STAR);
      safe("msg", () =>
        api.sendMessage(id, "NEW TITLE UNLOCKED: " + t[1] + "! Open Shop -> Titles or type 'title " + t[0] + "' to wear it.", { color: "gold" })
      );
      bcast(
        [ent(id, "#ffd60a"), T(" earned the title ", "#ffffff"), T(t[1] + "!", t[2], true)],
        nm(id) + " earned the title " + t[1] + "!",
        "gold"
      );
      savePlayer(id);
    }
  }
}

export function claimDaily(id, p, now) {
  p.lastDailyCheck = now;
  if (!p.loaded) return false;
  const day = localDay(now);
  if (p.lastDay === day || (p.lastDay && day < p.lastDay)) return false;

  let savedByGrace = false;
  const oldStreak = p.dailyStreak;
  if (p.lastDay) {
    const diff = day - p.lastDay;
    if (diff === 1) p.dailyStreak++;
    else if (diff - 1 <= CFG.graceDays) {
      p.dailyStreak++;
      savedByGrace = true;
    } else {
      p.dailyStreak = 1;
    }
  } else {
    p.dailyStreak = 1;
  }

  p.lastDay = day;
  p.dailyClaims++;
  if (p.dailyStreak > p.bestDaily) p.bestDaily = p.dailyStreak;
  p.dirty = true;

  const base = dailyReward(p.dailyStreak);
  const bonus = DAILY_BONUS[p.dailyStreak] || 0;
  giveSlaps(id, base + bonus);
  sfx(id, "levelup");
  flash(id, STAR + " DAILY STREAK: DAY " + p.dailyStreak + " " + STAR);
  safe("msg", () =>
    api.sendMessage(id, "DAILY REWARD! Day " + p.dailyStreak + " streak: +" + base + " Slaps" + (bonus ? "  +" + bonus + " BONUS!" : "") + ".", { color: "gold" })
  );
  if (savedByGrace) {
    safe("msg", () => api.sendMessage(id, "You missed a day, but your streak was saved!", { color: "lime" }));
  } else if (p.dailyStreak === 1 && oldStreak > 1) {
    safe("msg", () => api.sendMessage(id, "Your " + oldStreak + "-day streak ended. A new one starts today!", { color: "orange" }));
  }
  safe("msg", () => api.sendMessage(id, "Come back tomorrow for +" + dailyReward(p.dailyStreak + 1) + " Slaps.", { color: "white" }));
  if (bonus) {
    bcast(
      [ent(id, "#ffd60a"), T(" is on a " + p.dailyStreak + "-day login streak!", "#ff9500", true)],
      nm(id) + " is on a " + p.dailyStreak + "-day login streak!",
      "orange"
    );
  }
  savePlayer(id);
  return true;
}

export function nextPlayReward(p) {
  let rem = sessionThreshold(p.sessIdx) - p.sessActive;
  if (p.lifeIdx < LIFETIME_REWARDS.length) {
    rem = Math.min(rem, LIFETIME_REWARDS[p.lifeIdx][0] - p.playMs);
  }
  return Math.max(0, rem);
}

function payReward(id, slaps, text) {
  giveSlaps(id, slaps);
  flash(id, STAR + " +" + slaps + " SLAPS " + STAR);
  safe("msg", () => api.sendMessage(id, text + "  +" + slaps + " Slaps!", { color: "gold" }));
  sfx(id, "exp_collect");
}

export function playTick(id, p, now, dt) {
  if (!p.loaded) return;
  if (now - p.lastDailyCheck > 30000) claimDaily(id, p, now);
  p.afk = now - p.lastActive > CFG.afkMs;
  if (p.afk) return;

  const ms = 1000 * dt;
  p.sessActive += ms;
  p.playMs += ms;
  const mins = Math.floor(p.playMs / 60000);
  if (mins !== p.playMin) {
    p.playMin = mins;
    p.dirty = true;
  }

  let guard = 0;
  while (p.sessActive >= sessionThreshold(p.sessIdx) && guard++ < 5) {
    const m = Math.round(sessionThreshold(p.sessIdx) / 60000);
    const rew = sessionSlaps(p.sessIdx);
    p.sessIdx++;
    payReward(id, rew, "PLAY REWARD! " + m + " minutes of active play.");
  }

  guard = 0;
  while (p.lifeIdx < LIFETIME_REWARDS.length && p.playMs >= LIFETIME_REWARDS[p.lifeIdx][0] && guard++ < 5) {
    const m = LIFETIME_REWARDS[p.lifeIdx];
    p.lifeIdx++;
    payReward(id, m[1], "MILESTONE! " + m[2] + " played in total.");
    bcast(
      [ent(id, "#ffd60a"), T(" has played for " + m[2] + "!", "#30d158", true)],
      nm(id) + " has played for " + m[2] + "!",
      "lime"
    );
    savePlayer(id);
  }
}

export function showDaily(id, p) {
  const now = Date.now();
  safe("msg", () =>
    api.sendMessage(id, "Daily streak: " + p.dailyStreak + " day" + (p.dailyStreak === 1 ? "" : "s") + " (best " + p.bestDaily + ", " + p.dailyClaims + " claimed)", { color: "gold" })
  );
  if (!p.loaded) {
    safe("msg", () => api.sendMessage(id, "Your progress has not loaded yet.", { color: "red" }));
    return;
  }
  if (p.lastDay === localDay(now)) {
    safe("msg", () => api.sendMessage(id, "Today's reward is claimed. Next one in " + fmtDur(msToNextDay(now)) + ": +" + dailyReward(p.dailyStreak + 1) + " Slaps.", { color: "white" }));
  } else {
    safe("msg", () => api.sendMessage(id, "Your daily reward is ready and will claim automatically.", { color: "lime" }));
  }
  const milestones = [3, 7, 14, 30, 60, 100];
  for (let i = 0; i < milestones.length; i++) {
    if (milestones[i] > p.dailyStreak) {
      safe("msg", () => api.sendMessage(id, "Next bonus: day " + milestones[i] + " (+" + DAILY_BONUS[milestones[i]] + " Slaps)", { color: "aqua" }));
      break;
    }
  }
}

export function showRewards(id, p) {
  safe("msg", () => api.sendMessage(id, "Time played: " + fmtDur(p.playMs) + " (active play only)", { color: "gold" }));
  safe("msg", () =>
    api.sendMessage(
      id,
      p.afk ? "Rewards are PAUSED: move, slap, or jump to keep earning!" : "Next play reward in " + fmtDur(nextPlayReward(p)) + ".",
      { color: p.afk ? "red" : "lime" }
    )
  );
  if (p.lifeIdx < LIFETIME_REWARDS.length) {
    const m = LIFETIME_REWARDS[p.lifeIdx];
    safe("msg", () => api.sendMessage(id, "Next milestone: " + m[2] + " total (+" + m[1] + " Slaps) - " + fmtDur(m[0] - p.playMs) + " left.", { color: "aqua" }));
  } else {
    safe("msg", () => api.sendMessage(id, "You have earned every play-time milestone!", { color: "aqua" }));
  }
}

export function showAchievements(id, p) {
  let done = 0;
  for (let i = 0; i < ACHIEVEMENTS.length; i++) if (p.ach[ACHIEVEMENTS[i].id]) done++;
  safe("msg", () => api.sendMessage(id, "ACHIEVEMENTS (" + done + "/" + ACHIEVEMENTS.length + ")", { color: "gold" }));
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const a = ACHIEVEMENTS[i];
    const has = !!p.ach[a.id];
    const val = Math.min(Math.floor(tStat(p, a.stat)), a.target);
    safe("msg", () =>
      api.sendMessage(
        id,
        (has ? "[DONE] " : "[" + val + "/" + a.target + "] ") + a.name + " - " + a.desc + " (+" + a.reward + " Slaps)",
        { color: has ? "lime" : "gray" }
      )
    );
  }
}

// ============================================================================
// STATISTICS & LEADERBOARD CACHE
// ============================================================================

let _lbAt = 0;
let _lbStr = "";
let _lbMode = 0;

export function sideLeaderboard() {
  const now = Date.now();
  if (_lbStr && now - _lbAt < 1000) return _lbStr;
  const top = lbTop(5);
  let txt = "TOP PLAYERS\n";
  for (let i = 0; i < top.length; i++) {
    txt += (i + 1) + ". " + top[i][0] + "  " + top[i][1] + "\n";
  }
  _lbAt = now;
  _lbStr = txt;
  return txt;
}

export function renderPhysicalLeaderboard(force) {
  const mode = WORLD_STATE.lbMode || "s";
  const top = allLbTop(12, mode);
  const label = mode === "k" ? "KOs" : mode === "b" ? "Streak" : "Slaps";
  let sig = mode + "|";
  for (let i = 0; i < top.length; i++) {
    const val = mode === "k" ? top[i][3] : mode === "b" ? top[i][4] : top[i][2];
    sig += top[i][1] + ":" + val + ";";
  }
  if (!force && sig === WORLD_STATE.lbRenderSig) return;
  WORLD_STATE.lbRenderSig = sig;

  const chunks = [
    "ALL-TIME TOP (" + label + ")\n",
    "",
    "",
  ];
  for (let i = 0; i < 12; i++) {
    const row = top[i];
    const line = row
      ? "#" + (i + 1) + " " + row[1] + " - " + (mode === "k" ? row[3] : mode === "b" ? row[4] : row[2])
      : "#" + (i + 1) + " ---";
    const boardIdx = Math.min(2, Math.floor(i / 4));
    chunks[boardIdx] += (chunks[boardIdx] ? "\n" : "") + line;
  }

  for (let b = 0; b < WORLD_LB.boards.length && b < chunks.length; b++) {
    const pos = WORLD_LB.boards[b];
    const text = chunks[b];
    safe("boardWrite:" + b, () => {
      const prev = api.getBlockData(pos[0], pos[1], pos[2]) || {};
      const persisted = prev.persisted || {};
      const shared = persisted.shared || {};
      api.setBlockData(pos[0], pos[1], pos[2], {
        ...prev,
        persisted: { ...persisted, shared: { ...shared, text } },
      });
    });
  }
}

export function showTop(id, page) {
  const mode = WORLD_STATE.lbMode || "s";
  const all = allLbTop(WORLD_LB.maxEntries, mode);
  if (!all.length) {
    safe("msg", () => api.sendMessage(id, "No scores yet.", { color: "gray" }));
    return;
  }
  const perPage = 10;
  const maxPage = Math.max(1, Math.ceil(all.length / perPage));
  const pg = Math.max(1, Math.min(maxPage, Math.floor(page || 1)));
  const start = (pg - 1) * perPage;
  const label = mode === "k" ? "Knock-offs" : mode === "b" ? "Best Streak" : "Lifetime Slaps";

  safe("msg", () => api.sendMessage(id, "ALL-TIME TOP (" + label + ") \u2014 Page " + pg + "/" + maxPage + " (" + all.length + " total)", { color: "gold" }));
  for (let i = start; i < Math.min(all.length, start + perPage); i++) {
    const row = all[i];
    const val = mode === "k" ? row[3] + " KOs" : mode === "b" ? row[4] + " streak" : row[2] + " slaps";
    safe("msg", () =>
      api.sendMessage(id, "#" + (i + 1) + " " + row[1] + " - " + val, { color: i === 0 ? "gold" : "white" })
    );
  }
  const dbId = safe("getPlayerDbId", () => api.getPlayerDbId(id));
  const myKey = dbId ? String(dbId) : nm(id).toLowerCase();
  for (let i = 0; i < all.length; i++) {
    if (all[i][0] === myKey) {
      safe("msg", () => api.sendMessage(id, "Your All-Time Rank: #" + (i + 1) + " of " + all.length, { color: "aqua" }));
      break;
    }
  }
}

export function showRecap(id, p) {
  if (!p.recap) {
    safe("msg", () => api.sendMessage(id, "No recap yet. You have not been knocked off by anyone.", { color: "gray" }));
    return;
  }
  safe("msg", () => api.sendMessage(id, "DEATH RECAP", { color: "red" }));
  for (let i = 0; i < p.recap.length; i++) {
    safe("msg", () => api.sendMessage(id, p.recap[i], { color: "white" }));
  }
}

export function myStats(id, p) {
  let unlocked = 0;
  for (let i = 0; i < GORDER.length; i++) if (p.un[GORDER[i]]) unlocked++;

  safe("msg", () =>
    api.sendMessage(
      id,
      "Slaps Balance: " + p.slaps + " (Lifetime: " + p.totalSlaps + ") | Knock-offs: " + p.kills + " | Assists: " + p.assists,
      { color: "gold" }
    )
  );
  safe("msg", () =>
    api.sendMessage(
      id,
      "Streak: " + p.streak + " (Best: " + p.bestStreak + ") | Falls: " + p.falls + " | Reflects: " + p.reflects,
      { color: "white" }
    )
  );
  safe("msg", () =>
    api.sendMessage(
      id,
      "Cancels: " + p.cancels + " (Perfect: " + p.perfects + ") | Gloves: " + unlocked + "/" + GORDER.length + " | Equipped: " + p.glove,
      { color: "white" }
    )
  );
  safe("msg", () =>
    api.sendMessage(
      id,
      "Daily streak: " + p.dailyStreak + " (best " + p.bestDaily + ") | Playtime: " + fmtDur(p.playMs),
      { color: "aqua" }
    )
  );

  const saveTxt = p.loaded
    ? p.dirty
      ? "unsaved changes (autosaves soon)"
      : p.lastSave
        ? "saved " + Math.round((Date.now() - p.lastSave) / 1000) + "s ago"
        : "loaded, nothing changed yet"
    : "NOT loaded (progress will not save - type debug)";
  safe("msg", () => api.sendMessage(id, "Save: " + saveTxt, { color: p.loaded ? "lime" : "red" }));
}

export function lobbyTab(id, p) {
  const sig = p.totalSlaps + "|" + p.kills + "|" + p.bestStreak;
  if (sig === p.lbSig) return;
  if (!p.lbInfo) {
    let ok = false;
    try {
      api.setClientOption(id, "lobbyLeaderboardInfo", {
        name: { displayName: "Name", sortPriority: 0 },
        slaps: { displayName: "Slaps", sortPriority: 1 },
        kills: { displayName: "Knock-offs", sortPriority: 2 },
        streak: { displayName: "Best Streak", sortPriority: 3 },
      });
      ok = true;
    } catch (_) {
      ok = false;
    }
    if (!ok) return;
    p.lbInfo = 1;
  }

  for (let m = _lbMode; m <= 1; m++) {
    try {
      const vals = m === 0
        ? {
            slaps: { displayValue: p.totalSlaps, sortValue: p.totalSlaps },
            kills: { displayValue: p.kills, sortValue: p.kills },
            streak: { displayValue: p.bestStreak, sortValue: p.bestStreak },
          }
        : { slaps: p.totalSlaps, kills: p.kills, streak: p.bestStreak };
      api.setTargetedPlayerSettingForEveryone(id, "lobbyLeaderboardValues", vals, true);
      _lbMode = m;
      p.lbSig = sig;
      return;
    } catch (_) {}
  }
}
