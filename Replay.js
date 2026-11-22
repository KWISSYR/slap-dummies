import { CFG, GLOVES } from "./Config.js";
import { safe, flash, sfx, T, ent, nm, bcast, rawName } from "./Visuals.js";

// ============================================================================
// KILLCAM & DEATH RECAP ENGINE (Last 3 seconds perspective capture)
// ============================================================================

export function recordReplayPosition(p, pos, now) {
  if (!p.replayBuf) p.replayBuf = [];
  if (now - (p.replayLastAt || 0) < 500) return;
  p.replayLastAt = now;
  p.replayBuf.push({ t: now, pos: [pos[0], pos[1], pos[2]] });
  if (p.replayBuf.length > 6) p.replayBuf.shift(); // 6 snapshots * 500ms = 3 seconds
}

// vp / kp are the victim's and killer's player-state objects (passed in so this
// module never imports PlayerData, which would create a circular import).
export function generateKillcamSummary(vp, kp, killerId) {
  const killerName = killerId ? (rawName(killerId) || "Player") : "Unknown";
  const gloveTag = kp && GLOVES[kp.glove] ? GLOVES[kp.glove].tag : "CLASSIC";
  const hitsCount = vp && vp.hits ? vp.hits.filter(h => h.by === killerId).length : 1;

  return {
    killer: killerName,
    glove: gloveTag,
    hits: hitsCount,
    text: `Eliminated by ${killerName} (${gloveTag} glove) after ${hitsCount} hits.`,
  };
}

export function showKillcamChat(id, p) {
  if (!p.recap || !p.recap.length) {
    safe("msg", () => api.sendMessage(id, "No recent killcam data available.", { color: "gray" }));
    return;
  }
  safe("msg", () => api.sendMessage(id, "=== KILLCAM DEATH RECAP ===", { color: "gold" }));
  for (let i = 0; i < p.recap.length; i++) {
    safe("msg", () => api.sendMessage(id, p.recap[i], { color: "white" }));
  }
}
