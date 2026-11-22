import {
  CFG, GLOVES, GORDER, TIERS, TITLES, KILL_EFFECTS, FX_ORDER, EVENTS,
  BADGES, PRACTICE, SPAWN, DUEL_POS, LOBBY_BLOCKS, STAR, ADMIN_NAME, getMasteryRank,
} from "./Config.js";
import {
  safe, okSafe, FAIL, MODE, T, ent, nm, rawName, bcast, flash, sfx,
  styledTry, compile, bar, fmtShort, unlockFx, removeOrbs,
} from "./Visuals.js";
import {
  P, WORLD_STATE, pd, isG, isAdmin, titleById, loadPlayer, savePlayer,
  tp, setLobbyState, setArenaState, refreshSpeed,
  activeGloveVisual, getKsStageConfig, getBountyValue,
  loadBans, banPlayerAccount, unbanPlayerName,
} from "./PlayerData.js";
import { grantMovementGrace } from "./PlayerData.js";
import {
  tStat, nextPlayReward, showDaily, showRewards, showAchievements, checkAchievements,
  sideLeaderboard, showTop, showRecap, myStats, renderPhysicalLeaderboard, giveSlaps,
} from "./Progression.js";
import {
  getActiveDailyQuests, ensureDailyQuestState, equipBadge,
  showQuestsChat, showBadgesChat, getQuestHudSummary,
} from "./Quests.js";
import { endRagdoll, startRagdoll, resetCombatState } from "./Combat.js";
import { equipGlove, useAbility, getAbilityDisplay, resetKillstreak } from "./Gloves.js";

export const INTERFACE_HOOKS = {
  startEvent: null,
  endEvent: null,
  spawnCrate: null,
};

// ============================================================================
// SHOP PURCHASES & TITLE EQUIPPING
// ============================================================================

export function buyOrEquipGlove(id, gloveId) {
  const g = GLOVES[gloveId];
  const p = pd(id);
  if (!g) return false;
  if (!p.loaded) {
    safe("msg", () => api.sendMessage(id, "Your data is still loading. Try again in a moment.", { color: "red" }));
    return false;
  }

  if (p.un[gloveId]) {
    const ok = equipGlove(id, gloveId);
    p.shopSig = "";
    return ok;
  }

  if (g.secret) {
    safe("msg", () =>
      api.sendMessage(id, g.tag + " is a SECRET EVENT glove! Unlock it during a super-rare Arena Event.", { color: "red" })
    );
    return false;
  }

  if (p.slaps < g.need) {
    const missing = g.need - p.slaps;
    safe("msg", () =>
      api.sendMessage(
        id,
        "Need " + g.need + " Slaps to unlock " + g.tag + " (" + missing + " more needed).",
        { color: "red" }
      )
    );
    sfx(id, "hit");
    return false;
  }

  p.slaps -= g.need;
  p.un[gloveId] = true;
  p.fresh[gloveId] = true;
  p.dirty = true;
  p.shopSig = "";
  p.hudSig = "";

  const tierInfo = TIERS[g.tier] || TIERS.common;
  flash(id, STAR + " UNLOCKED " + g.tag + "! " + STAR);
  sfx(id, "levelup");
  unlockFx(id, gloveId);
  safe("msg", () =>
    api.sendMessage(
      id,
      "Purchased & unlocked [" + tierInfo.label + "] " + g.tag + " for " + g.need + " Slaps! Remaining: " + p.slaps,
      { color: "gold" }
    )
  );

  if (tierInfo.order >= 3) {
    bcast(
      [ent(id, "#ffd60a"), T(" unlocked ", "#ffffff"), T("[" + tierInfo.label + "] " + g.tag + "!", g.c[0], true)],
      nm(id) + " unlocked [" + tierInfo.label + "] " + g.tag + "!",
      "gold"
    );
  }

  equipGlove(id, gloveId);
  checkAchievements(id, p);
  savePlayer(id);
  return true;
}

export function setTitle(id, titleId) {
  const p = pd(id);
  const t = titleById(titleId);
  if (titleId === "none" || titleId === "off") {
    p.title = "";
    safe("msg", () => api.sendMessage(id, "Title removed.", { color: "gray" }));
  } else if (!t) {
    safe("msg", () => api.sendMessage(id, "Unknown title. Type 'titles' to see the list.", { color: "orange" }));
    return false;
  } else if (!p.ownedTitles[titleId]) {
    const prog = Math.floor(tStat(p, t[3]));
    safe("msg", () =>
      api.sendMessage(id, t[1] + " is locked: " + t[4] + " " + t[5] + " (" + prog + " so far).", { color: "red" })
    );
    return false;
  } else {
    p.title = titleId;
    safe("msg", () => api.sendMessage(id, "Now wearing title: " + t[1], { color: "lime" }));
  }

  p.dirty = true;
  p.tagSig = "";
  p.shopSig = "";
  p.titleAt = 0;
  savePlayer(id);
  return true;
}

export function buyOrEquipFx(id, fxId) {
  const fx = KILL_EFFECTS[fxId];
  const p = pd(id);
  if (!fx) return false;
  if (!p.loaded) {
    safe("msg", () => api.sendMessage(id, "Your data is still loading.", { color: "red" }));
    return false;
  }
  if (p.ownedFx[fxId]) {
    p.killFx = fxId;
    p.dirty = true;
    p.shopSig = "";
    safe("msg", () => api.sendMessage(id, "Equipped Kill Effect: " + fx.name, { color: "lime" }));
    savePlayer(id);
    return true;
  }
  if (p.slaps < fx.cost) {
    safe("msg", () =>
      api.sendMessage(id, "Need " + fx.cost + " Slaps for " + fx.name + " (" + (fx.cost - p.slaps) + " more).", { color: "red" })
    );
    sfx(id, "hit");
    return false;
  }
  p.slaps -= fx.cost;
  p.ownedFx[fxId] = true;
  p.killFx = fxId;
  p.dirty = true;
  p.shopSig = "";
  p.hudSig = "";
  flash(id, STAR + " KILL FX: " + fx.name.toUpperCase() + " " + STAR);
  sfx(id, "levelup");
  safe("msg", () =>
    api.sendMessage(id, "Unlocked & equipped Kill Effect [" + fx.name + "] for " + fx.cost + " Slaps!", { color: "gold" })
  );
  savePlayer(id);
  return true;
}

// ============================================================================
// BLOXD SHOP API CATEGORIES & SYNC
// ============================================================================

export const SHOP_CATS = {
  gloves_basic: {
    customTitle: "Gloves (Basic)",
    description: "Common & Uncommon gloves \u2014 unlock with Slaps and equip!",
  },
  gloves_elite: {
    customTitle: "Gloves (Rare+)",
    description: "Rare, Epic, Legendary, Extreme, Killstreak & Secret Event gloves!",
  },
  titles: {
    customTitle: "Titles",
    description: "Milestone titles displayed on your nametag.",
  },
  cosmetics: {
    customTitle: "Kill Effects",
    description: "Custom KO explosions & slap sound effects.",
  },
  quests: {
    customTitle: "Quests & Badges",
    description: "Daily objectives & equippable reward badges!",
  },

  admin_panel: {
    customTitle: "Admin Control Panel",
    description: "Manage Events, Gloves, Slaps, Freeze, Kick & Bans (" + ADMIN_NAME + " only).",
  },
};

export function initShopCategories() {
  for (const catKey in SHOP_CATS) {
    safe("configureShopCategory(" + catKey + ")", () =>
      api.configureShopCategory(catKey, SHOP_CATS[catKey])
    );
  }
}

function getAdminTarget(id, p) {
  const ids = api.getPlayerIds();
  if (!ids || !ids.length) return null;
  let idx = Number(p.adminTargetIdx) || 0;
  if (idx < 0 || idx >= ids.length) idx = ((idx % ids.length) + ids.length) % ids.length;
  p.adminTargetIdx = idx;
  return ids[idx] || id;
}

function getAdminSelectedGlove(p) {
  let idx = Number(p.adminGloveIdx) || 0;
  if (idx < 0 || idx >= GORDER.length) idx = ((idx % GORDER.length) + GORDER.length) % GORDER.length;
  p.adminGloveIdx = idx;
  return GORDER[idx] || "default";
}

export function shopSync(id, p) {
  const now = Date.now();
  const dq = ensureDailyQuestState(p, now);
  const activeQ = getActiveDailyQuests(now);
  const adm = isAdmin(id);
  const secVer = 0;
  const admTid = adm ? getAdminTarget(id, p) : null;
  const admTp = admTid && P[admTid] ? P[admTid] : null;
  const admGid = adm ? getAdminSelectedGlove(p) : "";
  const admSig = adm
    ? [
        WORLD_STATE.bansVersion,
        WORLD_STATE.event ? WORLD_STATE.event.id : "-",
        admTid || "-",
        admGid,
        admTp ? admTp.glove + ":" + admTp.slaps + ":" + (admTp.adminFrozen ? 1 : 0) + ":" + (admTp.adminBanned ? 1 : 0) + ":0" : "-",
      ].join("^")
    : "";

  let sig = p.glove + "|" + p.slaps + "|" + p.title + "|" + (p.killFx || "fx_default") + "|" + (p.badge || "") + "|" + dq.day + "|" + secVer + "|" + admSig + "|";
  for (let i = 0; i < GORDER.length; i++) {
    const gid = GORDER[i];
    const spCount = p.secProg && p.secProg[gid] ? p.secProg[gid] : 0;
    sig += (p.un[gid] ? 1 : 0) + (spCount ? ":" + spCount : "") + ",";
  }
  for (let i = 0; i < TITLES.length; i++) {
    const tid = TITLES[i][0];
    sig += (p.ownedTitles[tid] ? 1 : 0) + ":" + Math.floor(tStat(p, TITLES[i][3])) + ",";
  }
  for (let i = 0; i < FX_ORDER.length; i++) {
    sig += (p.ownedFx && p.ownedFx[FX_ORDER[i]] ? 1 : 0) + ",";
  }
  for (let i = 0; i < activeQ.length; i++) {
    const qid = activeQ[i].id;
    sig += (dq.done[qid] ? "D" : (dq.prog[qid] || 0)) + ",";
  }
  for (const bid in BADGES) {
    sig += (p.badges && p.badges[bid] ? 1 : 0);
  }
  if (sig === p.shopSig) return;

  let allOk = true;
  for (let i = 0; i < GORDER.length; i++) {
    const gid = GORDER[i];
    const g = GLOVES[gid];
    const tier = TIERS[g.tier] || TIERS.common;
    const cat = g.cat === "basic" ? "gloves_basic" : "gloves_elite";
    const owned = !!p.un[gid];
    const equipped = p.glove === gid;
    const canAfford = !g.secret && p.slaps >= g.need;
    const spCount = (p.secProg && p.secProg[gid]) || 0;
    const secretText = g.unlockHint
      ? " | Secret: " + g.unlockHint + ((gid === "eclipse" || gid === "celestial") && spCount > 0 ? " (" + spCount + "/3)" : "")
      : " | Unlock via Super-Rare Challenge";

    const itemCfg = {
      image: g.b,
      customTitle: "[" + tier.label + "] " + g.tag,
      description:
        g.abName + " (" + (g.abCd / 1000) + "s CD, " + g.f + "x KB): " + g.abDesc +
        (owned ? "" : g.secret ? secretText : " | Cost: " + g.need + " Slaps (You: " + p.slaps + ")"),
      canBuy: owned ? !equipped : canAfford,
      isSelected: equipped,
      buyButtonText: equipped ? "EQUIPPED" : owned ? "EQUIP" : g.secret ? "SECRET" : canAfford ? "BUY " + g.need : g.need + " SLAPS",
    };

    allOk = okSafe("shopGlove:" + gid, () => {
      if (p.shopMade) api.updateShopItemForPlayer(id, cat, gid, itemCfg);
      else api.createShopItemForPlayer(id, cat, gid, itemCfg);
    }) && allOk;
  }

  for (let i = 0; i < TITLES.length; i++) {
    const t = TITLES[i];
    const owned = !!p.ownedTitles[t[0]];
    const wearing = p.title === t[0];
    const prog = Math.floor(tStat(p, t[3]));
    const itemCfg = {
      image: t[6] || "Block of Gold",
      customTitle: t[1],
      description: owned
        ? "Unlocked: " + t[4] + " " + t[5]
        : "Locked: " + Math.min(prog, t[4]) + "/" + t[4] + " " + t[5],
      canBuy: owned && !wearing,
      isSelected: wearing,
      buyButtonText: wearing ? "WEARING" : owned ? "WEAR" : "LOCKED",
    };

    allOk = okSafe("shopTitle:" + t[0], () => {
      if (p.shopMade) api.updateShopItemForPlayer(id, "titles", t[0], itemCfg);
      else api.createShopItemForPlayer(id, "titles", t[0], itemCfg);
    }) && allOk;
  }

  for (let i = 0; i < FX_ORDER.length; i++) {
    const fid = FX_ORDER[i];
    const fx = KILL_EFFECTS[fid];
    const owned = !!(p.ownedFx && p.ownedFx[fid]);
    const equipped = p.killFx === fid;
    const canAfford = p.slaps >= fx.cost;
    const itemCfg = {
      image: fx.icon,
      customTitle: fx.name,
      description: "Custom KO explosion & hit sound." + (owned ? "" : " Cost: " + fx.cost + " Slaps"),
      canBuy: owned ? !equipped : canAfford,
      isSelected: equipped,
      buyButtonText: equipped ? "EQUIPPED" : owned ? "EQUIP" : canAfford ? "BUY " + fx.cost : fx.cost + " SLAPS",
    };

    allOk = okSafe("shopFx:" + fid, () => {
      if (p.shopMade) api.updateShopItemForPlayer(id, "cosmetics", fid, itemCfg);
      else api.createShopItemForPlayer(id, "cosmetics", fid, itemCfg);
    }) && allOk;
  }

  for (let i = 0; i < activeQ.length; i++) {
    const q = activeQ[i];
    const done = !!dq.done[q.id];
    const prog = done ? q.target : (dq.prog[q.id] || 0);
    const b = BADGES[q.badge];
    const wearing = !!(b && p.badge === b.id);
    const itemCfg = {
      image: b ? b.icon : "Block of Gold",
      customTitle: (done ? "[DONE] " : "[" + prog + "/" + q.target + "] ") + q.name,
      description: q.desc + " | Reward: +" + q.reward + " Slaps" + (b ? " + [" + b.tag + "] Badge" : ""),
      canBuy: done && !!b && !!p.badges[b.id] && !wearing,
      isSelected: wearing,
      buyButtonText: wearing ? "BADGE ON" : done ? "EQUIP BADGE" : prog + "/" + q.target,
    };
    allOk = okSafe("shopQuest:" + i, () => {
      if (p.shopMade) api.updateShopItemForPlayer(id, "quests", "q_" + i, itemCfg);
      else api.createShopItemForPlayer(id, "quests", "q_" + i, itemCfg);
    }) && allOk;
  }

  for (const bid in BADGES) {
    const b = BADGES[bid];
    const owned = !!(p.badges && p.badges[bid]);
    const wearing = p.badge === bid;
    const itemCfg = {
      image: b.icon,
      customTitle: "[" + b.tag + "] " + b.name,
      description: b.desc,
      canBuy: owned && !wearing,
      isSelected: wearing,
      buyButtonText: wearing ? "WEARING" : owned ? "WEAR" : "LOCKED",
    };
    allOk = okSafe("shopBadge:" + bid, () => {
      if (p.shopMade) api.updateShopItemForPlayer(id, "quests", "badge_" + bid, itemCfg);
      else api.createShopItemForPlayer(id, "quests", "badge_" + bid, itemCfg);
    }) && allOk;
  }



  if (adm) {
    const tName = admTid ? nm(admTid) : "None";
    const tState = admTp;
    const selG = GLOVES[admGid] || GLOVES.default;
    const evNow = WORLD_STATE.event;
    const targetBanned = !!(tState && tState.adminBanned);
    const targetFrozen = !!(tState && tState.adminFrozen);
    const admItems = [
      ["adm_target", "Block of Diamond", "Target: " + tName,
        tState ? ("Glove: " + tState.glove + " | Slaps: " + tState.slaps + " | AC Flags: " + (tState.acFlags || 0) + (targetFrozen ? " [FROZEN]" : "") + (targetBanned ? " [BANNED]" : "")) : "No players online.",
        true, "NEXT PLAYER"],
      ["adm_glove", selG.b || "Block of Gold", "Glove: " + selG.tag + " (" + admGid + ")",
        "Tier: " + selG.tier.toUpperCase() + " | Force: " + selG.f + "x | Owned by target: " + (tState && tState.un[admGid] ? "YES" : "NO"),
        true, "NEXT GLOVE"],
      ["adm_give_glove", "Lime Concrete", "Give " + selG.tag + " -> " + tName,
        "Unlocks & equips " + selG.tag + " on " + tName + ".",
        !!admTid, "GIVE GLOVE"],
      ["adm_take_glove", "Red Concrete", "Take " + selG.tag + " <- " + tName,
        "Removes " + selG.tag + " from " + tName + " (reverts to Default if equipped).",
        !!(tState && tState.un[admGid] && admGid !== "default"), "TAKE GLOVE"],
      ["adm_give_slaps", "Block of Gold", "Give +500 Slaps -> " + tName,
        "Adds 500 Slaps to " + tName + ".", !!admTid, "+500 SLAPS"],
      ["adm_take_slaps", "Sand", "Take -500 Slaps <- " + tName,
        "Removes up to 500 Slaps from " + tName + ".", !!(tState && tState.slaps > 0), "-500 SLAPS"],
      ["adm_freeze", "Ice", (targetFrozen ? "Unfreeze " : "Freeze ") + tName,
        "Toggles admin movement freeze lock on " + tName + ".", !!admTid, targetFrozen ? "UNFREEZE" : "FREEZE"],
      ["adm_ban", "Obsidian", (targetBanned ? "Unban " : "Ban ") + tName,
        "Persistent world ban/unban stored in world data.", !!(admTid && !isAdmin(admTid)), targetBanned ? "UNBAN" : "BAN PLAYER"],
      ["adm_kick", "Fireball Block", "Kick " + tName,
        "Kicks " + tName + " (or boots to spawn if kick API unavailable).", !!(admTid && !isAdmin(admTid)), "KICK"],
      ["adm_tp", "Block of Emerald", "Teleport to " + tName,
        "Spectate / warp directly to " + tName + ".", !!(admTid && admTid !== id), "TELEPORT"],
      ["adm_clear_ac", "Glass", "Clear AC Flags (" + (tState ? tState.acFlags : 0) + ")",
        "Resets AntiCheat speed/reach flags for " + tName + ".", !!(tState && tState.acFlags > 0), "CLEAR FLAGS"],
      ["adm_ev_rand", "Yellow Concrete", "Start Random Event",
        evNow ? ("Active: " + evNow.name) : "Triggers an arena event immediately.", true, "START EVENT"],
      ["adm_ev_secret", "Magenta Concrete", "Start Secret Glove Event",
        "Forces Total Eclipse Ritual or Starfall Blessing (super-rare events).", true, "SECRET EVENT"],
      ["adm_ev_shuffle", "Lime Concrete", "Start Glove Shuffle Event",
        "Gives all arena players a mystery high-tier glove temporarily.", true, "SHUFFLE EVENT"],
      ["adm_crate", "Block of Emerald", "Drop Supply Crate Now",
        "Drops a Supply Crate on an arena grass island right now.", true, "SPAWN CRATE"],
      ["adm_ev_end", "Red Concrete", "End Active Event",
        evNow ? ("Stops " + evNow.name + " now.") : "No event currently running.", !!evNow, "END EVENT"],
    ];
    for (let i = 0; i < admItems.length; i++) {
      const it = admItems[i];
      const itemCfg = {
        image: it[1],
        customTitle: it[2],
        description: it[3],
        canBuy: !!it[4],
        isSelected: false,
        buyButtonText: it[5],
      };
      allOk = okSafe("shopAdm:" + it[0], () => {
        if (p.shopMade) api.updateShopItemForPlayer(id, "admin_panel", it[0], itemCfg);
        else api.createShopItemForPlayer(id, "admin_panel", it[0], itemCfg);
      }) && allOk;
    }
  } else {
    const admLockCfg = {
      image: "Obsidian",
      customTitle: "Admins Only",
      description: "Admin Control Panel is restricted to " + ADMIN_NAME + ".",
      canBuy: false,
      isSelected: false,
      buyButtonText: "LOCKED",
    };
    allOk = okSafe("shopAdm:locked", () => {
      if (p.shopMade) api.updateShopItemForPlayer(id, "admin_panel", "adm_locked", admLockCfg);
      else api.createShopItemForPlayer(id, "admin_panel", "adm_locked", admLockCfg);
    }) && allOk;
  }

  if (allOk) {
    p.shopSig = sig;
    p.shopMade = true;
  }
}

export function handleShopBuy(id, categoryKey, itemKey) {
  safe("analytics bought", () =>
    api.registerAnalyticsEvent(id, "bought", String(categoryKey) + ":" + String(itemKey), null, Date.now())
  );
  if (categoryKey === "gloves_basic" || categoryKey === "gloves_elite") {
    safe("shopBuyGlove", () => {
      buyOrEquipGlove(id, itemKey);
      shopSync(id, pd(id));
    });
  } else if (categoryKey === "titles") {
    safe("shopBuyTitle", () => {
      setTitle(id, pd(id).title === itemKey ? "none" : itemKey);
      shopSync(id, pd(id));
    });
  } else if (categoryKey === "cosmetics") {
    safe("shopBuyFx", () => {
      buyOrEquipFx(id, itemKey);
      shopSync(id, pd(id));
    });
  } else if (categoryKey === "quests") {
    safe("shopBuyQuestBadge", () => {
      if (String(itemKey).indexOf("q_") === 0) {
        const idx = Number(String(itemKey).slice(2));
        const activeQ = getActiveDailyQuests(Date.now());
        if (activeQ[idx] && activeQ[idx].badge) equipBadge(id, activeQ[idx].badge);
      } else if (String(itemKey).indexOf("badge_") === 0) {
        equipBadge(id, String(itemKey).slice(6));
      }
      shopSync(id, pd(id));
    });

  } else if (categoryKey === "admin_panel") {
    if (!isAdmin(id)) {
      safe("msg", () => api.sendMessage(id, "Admin Panel is restricted to " + ADMIN_NAME + ".", { color: "red" }));
      return;
    }
    const p = pd(id);
    const tid = getAdminTarget(id, p);
    const tpState = tid ? pd(tid) : null;
    const gid = getAdminSelectedGlove(p);
    if (itemKey === "adm_target") {
      p.adminTargetIdx = (p.adminTargetIdx || 0) + 1;
      const nextTid = getAdminTarget(id, p);
      flash(id, "Target: " + (nextTid ? nm(nextTid) : "None"));
    } else if (itemKey === "adm_glove") {
      p.adminGloveIdx = (p.adminGloveIdx || 0) + 1;
      const ng = getAdminSelectedGlove(p);
      flash(id, "Glove: " + (GLOVES[ng] ? GLOVES[ng].tag : ng));
    } else if (itemKey === "adm_give_glove" && tid && tpState) {
      loadPlayer(tid);
      tpState.un[gid] = true;
      tpState.fresh[gid] = true;
      buyOrEquipGlove(tid, gid);
      flash(id, "Gave " + gid + " to " + nm(tid));
    } else if (itemKey === "adm_take_glove" && tid && tpState && gid !== "default") {
      delete tpState.un[gid];
      delete tpState.fresh[gid];
      if (tpState.glove === gid) {
        if (tpState.glove === "killstreak") resetKillstreak(tid, false);
        tpState.glove = "default";
        removeOrbs(tpState);
        refreshSpeed(tid);
      }
      tpState.dirty = true;
      tpState.shopSig = "";
      tpState.hudSig = "";
      tpState.tagSig = "";
      savePlayer(tid);
      shopSync(tid, tpState);
      flash(id, "Took " + gid + " from " + nm(tid));
    } else if (itemKey === "adm_give_slaps" && tid && tpState) {
      tpState.slaps += 500;
      tpState.totalSlaps += 500;
      tpState.dirty = true;
      tpState.hudSig = "";
      tpState.shopSig = "";
      savePlayer(tid);
      shopSync(tid, tpState);
      flash(id, "+500 Slaps -> " + nm(tid));
    } else if (itemKey === "adm_take_slaps" && tid && tpState) {
      tpState.slaps = Math.max(0, tpState.slaps - 500);
      tpState.dirty = true;
      tpState.hudSig = "";
      tpState.shopSig = "";
      savePlayer(tid);
      shopSync(tid, tpState);
      flash(id, "-500 Slaps <- " + nm(tid));
    } else if (itemKey === "adm_freeze" && tid && tpState) {
      tpState.adminFrozen = !tpState.adminFrozen;
      const pos = safe("getPosition", () => api.getPosition(tid));
      tpState.frozenPos = tpState.adminFrozen && pos ? [pos[0], pos[1], pos[2]] : null;
      tpState.hudSig = "";
      tpState.tagSig = "";
      refreshSpeed(tid);
      flash(id, (tpState.adminFrozen ? "Froze " : "Unfroze ") + nm(tid));
      safe("msg", () => api.sendMessage(tid, tpState.adminFrozen ? "You were frozen by Admin." : "You were unfrozen by Admin.", { color: tpState.adminFrozen ? "red" : "lime" }));
    } else if (itemKey === "adm_ban" && tid && tpState && !isAdmin(tid)) {
      if (tpState.adminBanned) {
        unbanPlayerName(rawName(tid));
        flash(id, "Unbanned " + nm(tid));
      } else {
        banPlayerAccount(id, tid, "Banned via Admin Panel");
        flash(id, "Banned " + nm(tid));
      }
    } else if (itemKey === "adm_kick" && tid && !isAdmin(tid)) {
      const kicked = okSafe("kickPlayer", () => api.kickPlayer(tid, "Kicked by Admin"));
      if (!kicked && tpState) {
        resetCombatState(tid);
        setLobbyState(tid);
        tp(tid, SPAWN[0], SPAWN[1], SPAWN[2]);
        safe("msg", () => api.sendMessage(tid, "You were booted back to Spawn by Admin.", { color: "red" }));
      }
      flash(id, "Kicked " + nm(tid));
    } else if (itemKey === "adm_tp" && tid && tid !== id) {
      const tpos = safe("getPosition", () => api.getPosition(tid));
      if (tpos) {
        grantMovementGrace(id, 2500);
        tp(id, tpos[0], tpos[1] + 1, tpos[2]);
        flash(id, "Teleported to " + nm(tid));
      }
    } else if (itemKey === "adm_clear_ac" && tpState) {
      tpState.acFlags = 0;
      tpState.acSpeedStrikes = 0;
      flash(id, "Cleared AntiCheat flags for " + nm(tid));
    } else if (itemKey === "adm_ev_rand") {
      if (INTERFACE_HOOKS.startEvent) INTERFACE_HOOKS.startEvent("random");
    } else if (itemKey === "adm_ev_secret") {
      if (INTERFACE_HOOKS.startEvent) INTERFACE_HOOKS.startEvent("secret");
    } else if (itemKey === "adm_ev_shuffle") {
      if (INTERFACE_HOOKS.startEvent) INTERFACE_HOOKS.startEvent("shuffle");
    } else if (itemKey === "adm_crate") {
      if (INTERFACE_HOOKS.spawnCrate) INTERFACE_HOOKS.spawnCrate();
    } else if (itemKey === "adm_ev_end") {
      if (INTERFACE_HOOKS.endEvent) INTERFACE_HOOKS.endEvent();
    }
    p.shopSig = "";
    shopSync(id, p);
  }
}

export function showTitlesChat(id, p) {
  safe("msg", () => api.sendMessage(id, "TITLES \u2014 earned by hitting milestones:", { color: "gold" }));
  for (let i = 0; i < TITLES.length; i++) {
    const t = TITLES[i];
    const owned = !!p.ownedTitles[t[0]];
    const val = Math.floor(tStat(p, t[3]));
    safe("msg", () =>
      api.sendMessage(
        id,
        (owned ? (p.title === t[0] ? "[WEARING] " : "[OWNED] ") : "[LOCKED] ") +
          t[0] + " - " + t[1] + (owned ? "" : " (" + Math.min(val, t[4]) + "/" + t[4] + " " + t[5] + ")"),
        { color: owned ? "lime" : "gray" }
      )
    );
  }
  safe("msg", () => api.sendMessage(id, "Wear: title <name>  |  Remove: title none", { color: "aqua" }));
}

export function openShop(id, catKey) {
  const p = pd(id);
  shopSync(id, p);
  const cat = catKey || "gloves_basic";
  if (!okSafe("openShop", () => api.openShop(id, true, cat))) {
    showTitlesChat(id, p);
  }
}

// ============================================================================
// GLOVE CATALOG, PRACTICE AREA & LOBBY BLOCK STATIONS
// ============================================================================

export function showGlove(id, gloveId) {
  const g = GLOVES[gloveId];
  if (!g) return;
  const p = pd(id);
  const tier = TIERS[g.tier] || TIERS.common;
  safe("msg", () =>
    api.sendMessage(id, "[" + tier.label + "] " + g.tag + " GLOVE \u2014 " + g.d, { color: "gold" })
  );
  safe("msg", () =>
    api.sendMessage(id, "Ability: " + g.abName + " (" + g.abCd / 1000 + "s CD) | Swing CD: " + g.cd + "ms | Force: " + g.f + "x", { color: "white" })
  );
  safe("msg", () => api.sendMessage(id, g.abDesc, { color: "gray" }));
    safe("msg", () =>
      api.sendMessage(
        id,
        p.un[gloveId]
          ? "Unlocked! Type '" + gloveId + "' or open the Shop to equip."
          : g.secret
            ? "SECRET EVENT GLOVE! Only unlocked by collecting its relic during a super-rare event."
            : "Costs " + g.need + " Slaps (you have " + p.slaps + "). Type 'buy " + gloveId + "' or open Shop!",
        { color: p.un[gloveId] ? "lime" : "aqua" }
      )
    );
}

export function listGloves(id, filterTier) {
  const p = pd(id);
  const tierKey = filterTier ? filterTier.toLowerCase() : "";
  safe("msg", () =>
    api.sendMessage(id, "GLOVE CATALOG (" + GORDER.length + " gloves) \u2014 type 'info <name>' or 'buy <name>'", { color: "gold" })
  );
  for (let i = 0; i < GORDER.length; i++) {
    const gid = GORDER[i];
    const g = GLOVES[gid];
    if (tierKey && g.tier !== tierKey) continue;
    const tier = TIERS[g.tier] || TIERS.common;
    const status = p.glove === gid ? "[EQUIPPED]" : p.un[gid] ? "[OWNED]" : g.secret ? "[SECRET EVENT]" : "[" + g.need + " SLAPS]";
    safe("msg", () =>
      api.sendMessage(id, status + " [" + tier.label + "] " + gid + " \u2014 " + g.abName, {
        color: p.glove === gid ? "lime" : p.un[gid] ? "aqua" : "white",
      })
    );
  }
}

export function enterPractice(id) {
  const p = pd(id);
  if (p.prac) return leavePractice(id, false);
  if (p.inArena) {
    safe("msg", () => api.sendMessage(id, "Return to the lobby before entering Practice.", { color: "red" }));
    return;
  }
  if (!p.loaded) {
    safe("msg", () => api.sendMessage(id, "Your progress has not loaded yet.", { color: "red" }));
    return;
  }

  p.prac = true;
  p.realGlove = p.glove;
  tp(id, PRACTICE[0], PRACTICE[1], PRACTICE[2]);
  setArenaState(id);
  p.protUntil = Date.now() + 1500;
  p.abilityReady = 0;
  p.tagSig = "";
  p.hudSig = "";
  safe("msg", () => api.sendMessage(id, "PRACTICE AREA: test any glove safely (no rewards, nothing saved).", { color: "aqua" }));
  safe("msg", () => api.sendMessage(id, "try <glove> = test any glove | dummy = practice hit & cancel | lobby = exit", { color: "white" }));
}

export function leavePractice(id, fellIntoArena) {
  const p = pd(id);
  if (!p.prac) return;
  const pos = safe("getPosition", () => api.getPosition(id));
  p.prac = false;
  if (p.realGlove && GLOVES[p.realGlove] && p.glove !== p.realGlove) {
    p.glove = p.realGlove;
    removeOrbs(p);
    p.orbRetry = 0;
  }
  p.realGlove = null;
  p.chargeUntil = 0;
  p.dashUntil = 0;
  p.slamUntil = 0;
  p.hudSig = "";
  p.tagSig = "";
  p.btnGlove = null;
  endRagdoll(id);
  refreshSpeed(id);

  if (fellIntoArena) {
    if (pos && pos[1] < -20) setArenaState(id);
    else setLobbyState(id);
  } else {
    setLobbyState(id);
    tp(id, SPAWN[0], SPAWN[1], SPAWN[2]);
    api.setVelocity(id, 0, 0, 0);
  }
  safe("msg", () => api.sendMessage(id, "Left the practice area.", { color: "gray" }));
}

export function tryGlove(id, gloveId) {
  const p = pd(id);
  if (!p.prac) {
    safe("msg", () => api.sendMessage(id, "Gloves can only be tested in Practice. Type 'practice'.", { color: "red" }));
    return;
  }
  if (!isG(gloveId)) {
    safe("msg", () => api.sendMessage(id, "Unknown glove. Type 'gloves' to see all " + GORDER.length + " gloves.", { color: "orange" }));
    return;
  }
  const g = GLOVES[gloveId];
  p.glove = gloveId;
  p.chargeUntil = 0;
  p.dashUntil = 0;
  p.slamUntil = 0;
  p.abilityReady = 0;
  p.spinUntil = Date.now() + 1200;
  p.hudSig = "";
  p.tagSig = "";
  p.btnGlove = null;
  removeOrbs(p);
  p.orbRetry = 0;
  refreshSpeed(id);
  flash(id, STAR + " TESTING " + g.tag + " " + STAR);
  safe("msg", () =>
    api.sendMessage(id, "Testing " + g.tag + ": " + g.d + " | Ability: " + g.abName + " (your real glove returns when you leave)", { color: "lime" })
  );
}

export function dummyHit(id) {
  const p = pd(id);
  const now = Date.now();
  if (!p.prac) {
    safe("msg", () => api.sendMessage(id, "Training dummy only works in the practice area.", { color: "red" }));
    return;
  }
  if (p.rag || now - p.dummyAt < 1500) return;
  p.dummyAt = now;
  const ang = 6.2832 * Math.random();
  api.applyImpulse(id, 14 * Math.cos(ang), 8, 14 * Math.sin(ang));
  startRagdoll(id, CFG.ragBase);
  flash(id, "Training hit! Jump in the window");
}

export function handleLobbyBlockClick(id, x, y, z) {
  if (x === undefined || y === undefined || z === undefined) return false;
  const p = pd(id);
  const key = Math.floor(x) + "," + Math.floor(y) + "," + Math.floor(z);
  const entry = LOBBY_BLOCKS[key];
  if (!entry) return false;

  if (entry.type === "tutorial") {
    if (p.tutorialPending) {
      p.tutorialPending = false;
      safe("tutorial gate complete", () => api.setPlayerDbValue(id, "slap_tut_gate", "done"));
      refreshSpeed(id);
      flash(id, "TUTORIAL COMPLETE! Step into a Portal!");
    } else {
      openShop(id, "gloves_basic");
    }
    return true;
  }

  if (entry.type === "shop") {
    openShop(id, entry.cat);
    return true;
  }

  if (entry.type === "practice") {
    enterPractice(id);
    return true;
  }

  if (entry.type === "lb_view") {
    showTop(id, 1);
    return true;
  }

  if (entry.type === "lb_mode") {
    const order = ["s", "k", "b"];
    const nextIdx = (order.indexOf(WORLD_STATE.lbMode) + 1) % order.length;
    WORLD_STATE.lbMode = order[nextIdx];
    renderPhysicalLeaderboard(true);
    const label = WORLD_STATE.lbMode === "k" ? "Knock-offs" : WORLD_STATE.lbMode === "b" ? "Best Streak" : "Lifetime Slaps";
    flash(id, "BOARD: " + label.toUpperCase());
    showTop(id, 1);
    return true;
  }



  if (entry.type === "admin_panel") {
    if (!isAdmin(id)) {
      safe("msg", () => api.sendMessage(id, "Admin Control Panel is restricted to " + ADMIN_NAME + ".", { color: "red" }));
      return true;
    }
    openShop(id, "admin_panel");
    return true;
  }

  if (entry.type === "secret_shrine") {
    if (p.un.voidwalker) {
      flash(id, "Void Shrine already awakened!");
      buyOrEquipGlove(id, "voidwalker");
      return true;
    }
    if (p.totalSlaps >= 1500 && p.kills >= 10) {
      p.un.voidwalker = true;
      p.fresh.voidwalker = true;
      p.badges.void_finder = true;
      p.dirty = true;
      p.shopSig = "";
      p.hudSig = "";
      unlockFx(id, "voidwalker");
      sfx(id, "levelup");
      flash(id, STAR + " SECRET GLOVE UNLOCKED: VOIDWALKER " + STAR);
      safe("msg", () =>
        api.sendMessage(id, "You awakened the VOID SHRINE and unlocked VOIDWALKER + [SEEKER] Badge!", { color: "gold" })
      );
      bcast(
        [ent(id, "#bf5af2"), T(" discovered the VOID SHRINE & unlocked ", "#ffffff"), T("VOIDWALKER!", "#5e5ce6", true)],
        nm(id) + " discovered the VOID SHRINE & unlocked VOIDWALKER!",
        "purple"
      );
      savePlayer(id);
    } else {
      flash(id, "Shrine Locked: Need 1,500 Slaps & 10 KOs!");
      safe("msg", () =>
        api.sendMessage(id, "Void Shrine rejects you: need 1,500 lifetime Slaps & 10 KOs (" + p.totalSlaps + "/1500, " + p.kills + "/10).", { color: "red" })
      );
    }
    return true;
  }

  if (entry.type === "glove" && entry.glove) {
    buyOrEquipGlove(id, entry.glove);
    return true;
  }
  return false;
}

// ============================================================================
// HUD, NAMETAGS, TOUCHSCREEN BUTTONS & COMMAND ROUTING
// ============================================================================

function findOnlinePlayer(query) {
  const q = String(query || "").toLowerCase();
  if (!q) return { error: "Enter an online player's name." };
  const ids = api.getPlayerIds();
  const exact = [], partial = [];
  for (let i = 0; i < ids.length; i++) {
    const n = String(rawName(ids[i]) || "").toLowerCase();
    if (n === q) exact.push(ids[i]);
    else if (n.indexOf(q) >= 0) partial.push(ids[i]);
  }
  if (exact.length === 1) return { id: exact[0] };
  if (exact.length > 1) return { error: "Multiple players share that exact name." };
  if (partial.length === 1) return { id: partial[0] };
  if (partial.length > 1) return { error: "Matches multiple players. Type the full name." };
  return { error: "Player not found online." };
}

function nextAffordableGlove(p) {
  let best = null;
  for (let i = 0; i < GORDER.length; i++) {
    const gid = GORDER[i];
    if (p.un[gid]) continue;
    const g = GLOVES[gid];
    if (!best || g.need < best.need) best = g;
  }
  return best;
}

export function updateHud(id, p, now) {
  const vis = activeGloveVisual(p);
  const g = GLOVES[p.glove] || GLOVES.default;
  const ab = getAbilityDisplay(p);
  const cols = vis.c;
  const cIdx = Math.floor(now / CFG.tagMs) % cols.length;
  const col = cols[cIdx];

  const remMs = p.abilityReady - now;
  const ready = remMs <= 0;
  const abFill = ready ? 10 : Math.max(0, Math.min(10, Math.floor(10 * (1 - remMs / ab.abCd))));
  const abSec = ready ? 0 : Math.ceil(remMs / 1000);
  const swSec = Math.max(0, Math.ceil((p.switchReady - now) / 1000));
  const nxt = nextAffordableGlove(p);
  const rewStr = p.afk ? "paused - move!" : fmtShort(nextPlayReward(p));
  const lb = sideLeaderboard();
  const mastKills = (p.mastery && p.mastery[p.glove]) || 0;
  const mast = getMasteryRank(mastKills);
  const ev = WORLD_STATE.event;
  const evSec = ev ? Math.max(0, Math.ceil((ev.endsAt - now) / 1000)) : 0;
  const evSig = ev ? ev.id + ":" + evSec : "-";
  const kothStr = WORLD_STATE.kothHolder ? nm(WORLD_STATE.kothHolder) : "-";

  const qStr = getQuestHudSummary(p, now);
  const bountyVal = getBountyValue(p);
  const crateSec = p.crateBuff && now < p.crateUntil ? Math.ceil((p.crateUntil - now) / 1000) : 0;
  const duelStr = p.duelOpp && P[p.duelOpp] ? nm(p.duelOpp) : "-";

  const sig = [
    p.glove, p.ksStage, cIdx, abSec, abFill, swSec,
    p.slaps, p.kills, p.streak, nxt ? nxt.id : "-",
    p.loaded ? 1 : 0, p.dailyStreak, rewStr, lb, mastKills, evSig, kothStr, qStr,
    bountyVal, crateSec ? p.crateBuff + ":" + crateSec : "-", duelStr, p.adminFrozen ? 1 : 0,
  ].join("|");

  if (sig !== p.hudSig) {
    p.hudSig = sig;
    let stars = "";
    for (let i = 0; i < vis.s; i++) stars += STAR;
    const div = "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
    const abCol = ready ? "#30d158" : "#ff9500";
    const tierInfo = TIERS[g.tier] || TIERS.common;

    const parts = [
      T(stars + " " + vis.t + (mast.badge ? " " + mast.badge : "") + " " + stars, col, true),
      T("\n" + tierInfo.label + " GLOVE" + (mastKills > 0 ? "  (" + mastKills + " KOs)" : ""), tierInfo.color),
      T("\n" + div, "#6b6b6b"),
      T("\nABILITY  ", "#c8c8c8"),
      T(ab.name, "#ffffff", true),
      T("\n" + bar(abFill, 10) + "  ", abCol),
      T(ready ? "READY!" : abSec + "s", abCol, true),
    ];

    if (swSec > 0) parts.push(T("\nSwap glove in " + swSec + "s", "#ff6b6b"));
    if (p.adminFrozen) parts.push(T("\n[ADMIN FROZEN]", "#ff3b30", true));
    if (crateSec > 0) parts.push(T("\nCRATE: " + p.crateBuff.toUpperCase() + " (" + crateSec + "s)", "#30d158", true));
    if (duelStr !== "-") parts.push(T("\n1v1 DUEL vs " + duelStr, "#64d2ff", true));
    if (bountyVal > 0) parts.push(T("\nYOUR BOUNTY: " + bountyVal + " Slaps!", "#ff3b30", true));

    if (ev) {
      parts.push(T("\n" + div, "#6b6b6b"));
      parts.push(T("\nEVENT: " + ev.name + " (" + evSec + "s)", ev.color, true));
    }
    if (WORLD_STATE.kothHolder) {
      parts.push(T("\nKING: " + kothStr, "#ffd60a", true));
    }

    parts.push(T("\n" + div, "#6b6b6b"));
    parts.push(T("\nSlaps ", "#c8c8c8"), T(String(p.slaps), "#ffd60a", true));
    parts.push(T("   KOs ", "#c8c8c8"), T(String(p.kills), "#ff9500", true));

    if (p.glove === "killstreak") {
      const st = getKsStageConfig(p.ksStage);
      parts.push(T("\nKS STAGE " + p.ksStage + ": " + st.name + " (" + p.streak + " kills)", st.color, true));
    } else if (p.streak > 1) {
      parts.push(T("\nStreak x" + p.streak, "#ff2d92", true));
    }

    parts.push(T("\n" + div, "#6b6b6b"));
    if (p.dailyStreak > 0) {
      parts.push(T("\nDaily ", "#c8c8c8"), T(p.dailyStreak + "d", "#ff9500", true));
    }
    parts.push(T("\nQuests ", "#c8c8c8"), T(qStr, "#5ac8fa", true));
    parts.push(T("\nPlay reward ", "#c8c8c8"), T(rewStr, p.afk ? "#ff6b6b" : "#30d158", true));
    parts.push(T("\n" + div, "#6b6b6b"));
    parts.push(T("\nLEADERBOARD\n" + lb.replace("TOP PLAYERS\n", ""), "#ffd60a", true));

    if (nxt) {
      const frac = Math.max(0, Math.min(1, p.slaps / nxt.need));
      const left = Math.max(0, nxt.need - p.slaps);
      parts.push(T("\nGoal: " + nxt.tag, "#7fdbff", true));
      parts.push(T("\n" + bar(Math.round(8 * frac), 8) + "  " + (left ? left + " left" : "READY IN SHOP!"), left ? "#7fdbff" : "#30d158"));
    } else {
      parts.push(T("\nAll regular gloves unlocked!", "#30d158", true));
    }

    styledTry("hud", (m) => {
      api.setClientOption(id, "RightInfoText", compile(parts, m, "hud"));
    });
  }

  const btnSig = p.glove + ":" + p.ksStage;
  if (p.btnGlove !== btnSig) {
    p.btnGlove = btnSig;
    safe("touchscreenActionButton", () => api.setClientOption(id, "touchscreenActionButton", ab.name));
  }
}

export function updateTag(id, p, now) {
  const vis = activeGloveVisual(p);
  const cols = vis.c;
  const cIdx = Math.floor(now / CFG.tagMs) % cols.length;
  const tObj = p.title && p.ownedTitles[p.title] ? titleById(p.title) : null;
  const bObj = p.badge && p.badges && p.badges[p.badge] ? BADGES[p.badge] : null;
  const mast = getMasteryRank(p.mastery ? p.mastery[p.glove] : 0);
  const isKing = WORLD_STATE.kothHolder === id;
  const bountyVal = getBountyValue(p);
  const duelFlag = p.duelOpp ? 1 : 0;
  const frzFlag = p.adminBanned ? 2 : p.adminFrozen ? 1 : 0;
  const sig = p.glove + "|" + p.ksStage + "|" + cIdx + "|" + p.slaps + "|" + (tObj ? tObj[0] : "") + "|" + (bObj ? bObj.id : "") + "|" + mast.rank + "|" + (isKing ? 1 : 0) + "|" + bountyVal + "|" + duelFlag + "|" + frzFlag + (p.prac ? "P" : "");
  if (p.tagSig === sig) return;
  p.tagSig = sig;

  let stars = "";
  for (let i = 0; i < vis.s; i++) stars += STAR;
  const sub = [T(stars + " " + vis.t + (mast.badge ? " " + mast.badge : "") + " " + stars + "  [" + p.slaps + "]", cols[cIdx])];
  if (p.prac) sub.push(T("  PRACTICE", "#7fdbff"));

  const main = [];
  if (p.adminBanned) main.push(T("[BANNED] ", "#ff3b30"));
  else if (p.adminFrozen) main.push(T("[FROZEN] ", "#64d2ff"));
  if (duelFlag) main.push(T("[DUEL] ", "#64d2ff"));
  if (bountyVal > 0) main.push(T("[BOUNTY " + bountyVal + "] ", "#ff3b30"));
  if (isKing) main.push(T("[KING] ", "#ffd60a"));
  if (bObj) main.push(T("[" + bObj.tag + "] ", bObj.color));
  if (tObj) main.push(T("[" + tObj[1] + "] ", tObj[2]));
  main.push(T(rawName(id) || "Player", "#ffffff"));

  styledTry("tag", (m) => {
    const info = { subtitle: compile(sub, m, "tag"), content: compile(main, m, "tag") };
    if (m <= 2) {
      info.backgroundColor = "rgba(0,0,0,0.55)";
      info.subtitleBackgroundColor = "rgba(0,0,0,0.55)";
    }
    api.setTargetedPlayerSettingForEveryone(id, "nameTagInfo", info, true);
  });
}

function handleAdminCommand(id, parts) {
  if (!isAdmin(id)) {
    safe("msg", () => api.sendMessage(id, "Admin commands are restricted to " + ADMIN_NAME + ".", { color: "red" }));
    return false;
  }
  const cmd = parts[0];
  if (cmd === "!adminhelp" || cmd === "!admin") {
    safe("msg", () => api.sendMessage(id, "ADMIN: !adminui | !give !giveglove !takeglove !unlockall !givetitle !addkills | !freeze !kick !ban !unban | !event !endevent !crate", { color: "gold" }));
    return false;
  }
  if (cmd === "!adminui" || cmd === "!panel" || cmd === "!adminpanel") {
    openShop(id, "admin_panel");
    return false;
  }

  if (cmd === "!event") {
    if (INTERFACE_HOOKS.startEvent) INTERFACE_HOOKS.startEvent(parts[1] || "random");
    return false;
  }
  if (cmd === "!endevent") {
    if (INTERFACE_HOOKS.endEvent) INTERFACE_HOOKS.endEvent();
    return false;
  }
  if (cmd === "!crate") {
    if (INTERFACE_HOOKS.spawnCrate) INTERFACE_HOOKS.spawnCrate();
    return false;
  }
  if (cmd === "!unban") {
    const removed = unbanPlayerName(parts[1] || "");
    safe("msg", () => api.sendMessage(id, removed ? "Unbanned " + removed.name + "." : "No ban entry matching '" + (parts[1] || "") + "'.", { color: removed ? "lime" : "orange" }));
    return false;
  }
  const tgt = parts[1] ? findOnlinePlayer(parts[1]) : null;
  if (cmd === "!unlockall") {
    const tid = tgt && !tgt.error ? tgt.id : id;
    if (tgt && tgt.error) {
      safe("msg", () => api.sendMessage(id, tgt.error, { color: "red" }));
      return false;
    }
    loadPlayer(tid);
    const tpState = pd(tid);
    for (let i = 0; i < GORDER.length; i++) {
      if (!tpState.un[GORDER[i]]) tpState.fresh[GORDER[i]] = true;
      tpState.un[GORDER[i]] = true;
    }
    tpState.dirty = true;
    tpState.hudSig = "";
    tpState.shopSig = "";
    savePlayer(tid);
    safe("msg", () => api.sendMessage(id, "Unlocked all " + GORDER.length + " gloves for " + nm(tid) + ".", { color: "lime" }));
    return false;
  }
  if (!tgt || tgt.error) {
    safe("msg", () => api.sendMessage(id, tgt ? tgt.error : "Specify a player name.", { color: "red" }));
    return false;
  }
  const tid = tgt.id;
  loadPlayer(tid);
  const tpState = pd(tid);

  if (cmd === "!give" || cmd === "!giveslaps") {
    const amt = Number(parts[2]);
    if (!isFinite(amt) || amt <= 0 || amt > 1e6 || Math.floor(amt) !== amt) {
      safe("msg", () => api.sendMessage(id, "Usage: !give <player> <whole number>", { color: "orange" }));
      return false;
    }
    tpState.slaps += amt;
    tpState.totalSlaps += amt;
    tpState.dirty = true;
    tpState.hudSig = "";
    tpState.shopSig = "";
    savePlayer(tid);
    safe("msg", () => api.sendMessage(id, "Gave " + amt + " Slaps to " + nm(tid) + ".", { color: "lime" }));
    return false;
  }
  if (cmd === "!giveglove") {
    const gid = String(parts[2] || "").toLowerCase();
    if (!isG(gid)) {
      safe("msg", () => api.sendMessage(id, "Unknown glove.", { color: "orange" }));
      return false;
    }
    tpState.un[gid] = true;
    tpState.fresh[gid] = true;
    buyOrEquipGlove(tid, gid);
    return false;
  }
  if (cmd === "!takeglove") {
    const gid = String(parts[2] || "").toLowerCase();
    if (!isG(gid) || gid === "default") {
      safe("msg", () => api.sendMessage(id, "Specify a non-default glove id.", { color: "orange" }));
      return false;
    }
    delete tpState.un[gid];
    delete tpState.fresh[gid];
    if (tpState.glove === gid) {
      if (tpState.glove === "killstreak") resetKillstreak(tid, false);
      tpState.glove = "default";
      removeOrbs(tpState);
      refreshSpeed(tid);
    }
    tpState.dirty = true;
    tpState.shopSig = "";
    tpState.hudSig = "";
    tpState.tagSig = "";
    savePlayer(tid);
    safe("msg", () => api.sendMessage(id, "Removed " + gid + " from " + nm(tid) + ".", { color: "lime" }));
    return false;
  }
  if (cmd === "!freeze") {
    tpState.adminFrozen = !tpState.adminFrozen;
    const pos = safe("getPosition", () => api.getPosition(tid));
    tpState.frozenPos = tpState.adminFrozen && pos ? [pos[0], pos[1], pos[2]] : null;
    tpState.hudSig = "";
    tpState.tagSig = "";
    refreshSpeed(tid);
    safe("msg", () => api.sendMessage(id, (tpState.adminFrozen ? "Froze " : "Unfroze ") + nm(tid) + ".", { color: "lime" }));
    return false;
  }
  if (cmd === "!ban") {
    if (isAdmin(tid)) return false;
    const reason = parts.slice(2).join(" ") || "Banned by Admin";
    banPlayerAccount(id, tid, reason);
    safe("msg", () => api.sendMessage(id, "Banned " + nm(tid) + " (" + reason + ").", { color: "red" }));
    return false;
  }
  if (cmd === "!kick") {
    if (isAdmin(tid)) return false;
    const kicked = okSafe("kickPlayer", () => api.kickPlayer(tid, "Kicked by Admin"));
    if (!kicked) {
      resetCombatState(tid);
      setLobbyState(tid);
      tp(tid, SPAWN[0], SPAWN[1], SPAWN[2]);
    }
    safe("msg", () => api.sendMessage(id, "Kicked " + nm(tid) + ".", { color: "orange" }));
    return false;
  }
  if (cmd === "!givetitle") {
    const tObj = titleById(parts[2]);
    if (!tObj) {
      safe("msg", () => api.sendMessage(id, "Unknown title id.", { color: "orange" }));
      return false;
    }
    tpState.ownedTitles[tObj[0]] = true;
    setTitle(tid, tObj[0]);
    return false;
  }
  if (cmd === "!addkills") {
    const amt = Number(parts[2]);
    if (!isFinite(amt) || amt <= 0 || Math.floor(amt) !== amt) return false;
    tpState.kills += amt;
    tpState.dirty = true;
    checkAchievements(tid, tpState);
    savePlayer(tid);
    safe("msg", () => api.sendMessage(id, "Added " + amt + " KOs to " + nm(tid) + ".", { color: "lime" }));
    return false;
  }
  return false;
}

export function routeCommand(id, rawText, fromSlash) {
  const clean = String(rawText || "").trim().replace(/^\//, "");
  if (!clean) return undefined;
  const parts = clean.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg = parts[1] ? parts[1].toLowerCase() : "";
  const p = pd(id);
  p.lastActive = Date.now();

  if (cmd.charAt(0) === "!") return handleAdminCommand(id, parts.map((x) => x.toLowerCase()));

  if (p.adminBanned) {
    safe("msg", () => api.sendMessage(id, "You are banned from this server.", { color: "red" }));
    return false;
  }

  if (p.prac && ((isG(cmd) && parts.length === 1) || (cmd === "equip" && isG(arg)))) {
    tryGlove(id, cmd === "equip" ? arg : cmd);
    return false;
  }

  if (cmd === "help" || cmd === "tutorial") {
    safe("msg", () =>
      api.sendMessage(id, "Commands: shop | gloves | buy <glove> | duel <player> [wager] | loadout [save] <1-3> | quests | badges | fx | mastery | event | top | stats | ach | titles | daily | practice", { color: "aqua" })
    );
    return false;
  }
  if (cmd === "shop") {
    const c = arg === "elite" || arg === "rare" ? "gloves_elite"
      : arg === "titles" ? "titles"
      : arg === "fx" || arg === "cosmetics" ? "cosmetics"
      : arg === "quests" || arg === "badges" ? "quests"
      : (arg === "security" || arg === "seclog") && isAdmin(id) ? "security_log"
      : (arg === "admin" || arg === "panel") && isAdmin(id) ? "admin_panel"
      : "gloves_basic";
    openShop(id, c);
    return false;
  }
  if (cmd === "duel") {
    if (p.inArena || p.prac || p.duelOpp) {
      safe("msg", () => api.sendMessage(id, "Return to the lobby before starting a duel.", { color: "red" }));
      return false;
    }
    const tgt = findOnlinePlayer(parts[1]);
    if (tgt.error) {
      safe("msg", () => api.sendMessage(id, tgt.error, { color: "orange" }));
      return false;
    }
    const tid = tgt.id;
    if (tid === id) {
      safe("msg", () => api.sendMessage(id, "You cannot duel yourself.", { color: "orange" }));
      return false;
    }
    const tpState = pd(tid);
    if (tpState.inArena || tpState.prac || tpState.duelOpp) {
      safe("msg", () => api.sendMessage(id, nm(tid) + " is busy or already in combat.", { color: "orange" }));
      return false;
    }
    const wager = parts[2] ? Math.floor(Number(parts[2])) : 0;
    if (!isFinite(wager) || wager < 0 || wager > 5000) {
      safe("msg", () => api.sendMessage(id, "Wager must be between 0 and 5000 Slaps.", { color: "orange" }));
      return false;
    }
    if (p.slaps < wager || tpState.slaps < wager) {
      safe("msg", () => api.sendMessage(id, "Both players need at least " + wager + " Slaps for that wager.", { color: "red" }));
      return false;
    }
    tpState.duelWaitId = id;
    tpState.duelWaitExp = Date.now() + DUEL_POS.inviteMs;
    tpState.duelWager = wager;
    safe("msg", () => api.sendMessage(id, "1v1 Duel invite sent to " + nm(tid) + (wager > 0 ? " (Wager: " + wager + " Slaps)" : "") + ".", { color: "aqua" }));
    safe("msg", () => api.sendMessage(tid, nm(id) + " challenged you to a 1v1 DUEL" + (wager > 0 ? " for " + wager + " Slaps" : "") + "! Type 'accept' or 'decline'.", { color: "gold" }));
    return false;
  }
  if (cmd === "accept") {
    const now = Date.now();
    const cid = p.duelWaitId;
    if (!cid || now > (p.duelWaitExp || 0) || !P[cid]) {
      p.duelWaitId = null;
      safe("msg", () => api.sendMessage(id, "No active duel challenge.", { color: "gray" }));
      return false;
    }
    const cp = P[cid];
    const wager = p.duelWager || 0;
    if (p.inArena || p.prac || cp.inArena || cp.prac || p.duelOpp || cp.duelOpp) {
      safe("msg", () => api.sendMessage(id, "Both duelists must be free in the lobby.", { color: "red" }));
      return false;
    }
    if (p.slaps < wager || cp.slaps < wager) {
      p.duelWaitId = null;
      safe("msg", () => api.sendMessage(id, "Wager no longer affordable.", { color: "red" }));
      return false;
    }
    p.duelWaitId = null;
    if (wager > 0) {
      p.slaps -= wager;
      cp.slaps -= wager;
      p.dirty = true;
      cp.dirty = true;
    }
    resetCombatState(id);
    resetCombatState(cid);
    p.duelOpp = cid;
    cp.duelOpp = id;
    p.duelWager = wager;
    cp.duelWager = wager;
    grantMovementGrace(id, 2500);
    grantMovementGrace(cid, 2500);
    setArenaState(id);
    setArenaState(cid);
    tp(cid, DUEL_POS.a[0], DUEL_POS.a[1], DUEL_POS.a[2]);
    tp(id, DUEL_POS.b[0], DUEL_POS.b[1], DUEL_POS.b[2]);
    p.protUntil = now + 2000;
    cp.protUntil = now + 2000;
    p.hudSig = "";
    cp.hudSig = "";
    p.tagSig = "";
    cp.tagSig = "";
    bcast(
      [ent(cid, "#64d2ff"), T(" vs ", "#ffffff"), ent(id, "#ff9500"), T(" \u2014 1v1 DUEL STARTED!" + (wager > 0 ? " (Pot: " + (wager * 2) + " Slaps)" : ""), "#ffd60a", true)],
      nm(cid) + " vs " + nm(id) + " \u2014 1v1 Duel started!",
      "aqua"
    );
    return false;
  }
  if (cmd === "decline") {
    if (p.duelWaitId && P[p.duelWaitId]) {
      safe("msg", () => api.sendMessage(p.duelWaitId, nm(id) + " declined your duel challenge.", { color: "orange" }));
    }
    p.duelWaitId = null;
    p.duelWager = 0;
    safe("msg", () => api.sendMessage(id, "Declined duel challenge.", { color: "gray" }));
    return false;
  }
  if (cmd === "loadout" || cmd === "lo") {
    if (arg === "save") {
      const slot = String(parts[2] || "");
      if (slot !== "1" && slot !== "2" && slot !== "3") {
        safe("msg", () => api.sendMessage(id, "Usage: loadout save <1|2|3>", { color: "orange" }));
        return false;
      }
      p.loadouts[slot] = { g: p.glove, fx: p.killFx || "fx_default", bd: p.badge || "", tl: p.title || "" };
      p.dirty = true;
      savePlayer(id);
      flash(id, "LOADOUT #" + slot + " SAVED!");
      safe("msg", () => api.sendMessage(id, "Saved Loadout #" + slot + ": Glove=" + p.glove + ", KillFX=" + p.killFx, { color: "lime" }));
      return false;
    }
    const slot = arg;
    if (slot !== "1" && slot !== "2" && slot !== "3") {
      safe("msg", () => api.sendMessage(id, "Usage: loadout save <1-3>  |  loadout <1-3>", { color: "aqua" }));
      return false;
    }
    const lo = p.loadouts && p.loadouts[slot];
    if (!lo) {
      safe("msg", () => api.sendMessage(id, "Loadout #" + slot + " is empty. Save with: loadout save " + slot, { color: "orange" }));
      return false;
    }
    if (lo.g && p.un[lo.g] && p.glove !== lo.g) equipGlove(id, lo.g);
    if (lo.fx && p.ownedFx[lo.fx]) p.killFx = lo.fx;
    if (lo.bd && p.badges[lo.bd]) p.badge = lo.bd;
    if (lo.tl && p.ownedTitles[lo.tl]) p.title = lo.tl;
    p.dirty = true;
    p.hudSig = "";
    p.tagSig = "";
    p.shopSig = "";
    savePlayer(id);
    flash(id, "LOADOUT #" + slot + " EQUIPPED!");
    return false;
  }
  if (cmd === "quests" || cmd === "quest" || cmd === "dailyquests") {
    showQuestsChat(id, p);
    return false;
  }
  if (cmd === "badges") {
    showBadgesChat(id, p);
    return false;
  }
  if (cmd === "badge") {
    equipBadge(id, arg);
    return false;
  }
  if (cmd === "fx" || cmd === "killeffects") {
    if (arg && KILL_EFFECTS[arg]) buyOrEquipFx(id, arg);
    else openShop(id, "cosmetics");
    return false;
  }
  if (cmd === "mastery") {
    const k = (p.mastery && p.mastery[p.glove]) || 0;
    const m = getMasteryRank(k);
    safe("msg", () =>
      api.sendMessage(id, "Mastery for " + p.glove + ": " + k + " KOs | Rank " + m.rank + " (" + m.label + ") | Perks: -" + Math.round((1 - m.cdMult) * 100) + "% CD, +" + Math.round((m.forceMult - 1) * 100) + "% KB", { color: "gold" })
    );
    return false;
  }
  if (cmd === "event" || cmd === "events") {
    const ev = WORLD_STATE.event;
    if (ev) {
      const rem = Math.max(0, Math.ceil((ev.endsAt - Date.now()) / 1000));
      safe("msg", () => api.sendMessage(id, "ACTIVE EVENT: " + ev.name + " (" + rem + "s left) \u2014 " + ev.desc, { color: "gold" }));
    } else {
      const nxtSec = WORLD_STATE.nextEventAt ? Math.max(0, Math.ceil((WORLD_STATE.nextEventAt - Date.now()) / 1000)) : 300;
      safe("msg", () => api.sendMessage(id, "Next random Arena Event in ~" + Math.ceil(nxtSec / 60) + " min (" + Object.keys(EVENTS).length + " total events, including super-rare Secret Glove events!).", { color: "aqua" }));
    }
    return false;
  }
  if (cmd === "titles") { showTitlesChat(id, p); return false; }
  if (cmd === "title") { setTitle(id, arg); return false; }
  if (cmd === "ability" || cmd === "ab") { useAbility(id); return false; }
  if (cmd === "gloves") { listGloves(id, arg); return false; }
  if (cmd === "buy" || cmd === "unlock") {
    if (isG(arg)) buyOrEquipGlove(id, arg);
    else safe("msg", () => api.sendMessage(id, "Usage: buy <glove> (type 'gloves' for names)", { color: "orange" }));
    return false;
  }
  if (cmd === "equip" && isG(arg)) { buyOrEquipGlove(id, arg); return false; }
  if (isG(cmd) && parts.length === 1) { buyOrEquipGlove(id, cmd); return false; }
  if ((cmd === "info" || cmd === "glove") && isG(arg)) { showGlove(id, arg); return false; }
  if (cmd === "stats" || cmd === "data") { myStats(id, p); return false; }
  if (cmd === "ach" || cmd === "achievements") { showAchievements(id, p); return false; }
  if (cmd === "top" || cmd === "lb" || cmd === "leaderboard" || cmd === "alltop") { showTop(id, Number(arg) || 1); return false; }
  if (cmd === "recap") { showRecap(id, p); return false; }
  if (cmd === "daily") { showDaily(id, p); return false; }
  if (cmd === "rewards" || cmd === "playtime") { showRewards(id, p); return false; }
  if (cmd === "practice") { enterPractice(id); return false; }
  if (cmd === "lobby") {
    if (p.prac) leavePractice(id, false);
    else safe("msg", () => api.sendMessage(id, "You are already in the lobby.", { color: "gray" }));
    return false;
  }
  if (cmd === "try") { tryGlove(id, arg); return false; }
  if (cmd === "dummy") { dummyHit(id); return false; }
  if (cmd === "debug") {
    const keys = Object.keys(FAIL);
    safe("msg", () => api.sendMessage(id, "HUD:" + MODE.hud + " Tag:" + MODE.tag + " BC:" + MODE.bc + " Particles:" + CFG.pmode + " Gloves:" + GORDER.length, { color: "aqua" }));
    if (!keys.length) safe("msg", () => api.sendMessage(id, "No API failures recorded.", { color: "lime" }));
    for (let i = 0; i < keys.length; i++) {
      safe("msg", () => api.sendMessage(id, "FAIL " + keys[i] + " -> " + FAIL[keys[i]], { color: "red" }));
    }
    return false;
  }

  return fromSlash ? false : undefined;
}
