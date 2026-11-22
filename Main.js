import { handlePeriodicSave, pd, loadBans, saveBans } from "./PlayerData.js";
import { cleanupOrphans } from "./Visuals.js";
import { handleJumpCancel, processSlap, handlePlayerAttack } from "./Combat.js";
import { initKillstreakHooks, initGloveManager, useAbility, handleAltAction } from "./Gloves.js";
import { initShopCategories, handleShopBuy, shopSync, routeCommand } from "./Interface.js";
import {
  handleJoin, handleLeave, handleRespawn, handleClick,
  handleBlockStand, gameTick, shutdown, initEventHooks,
} from "./GameManager.js";

let _initialized = false;

export const callbacks = {
  tick: () => gameTick(),
  onClose: () => shutdown(),
  doPeriodicSave: () => {
    saveBans(false);
    return handlePeriodicSave();
  },
  onPlayerJoin: (playerId) => handleJoin(playerId),
  onPlayerLeave: (playerId) => handleLeave(playerId),
  onPlayerJump: (playerId) => handleJumpCancel(playerId),
  onRespawnRequest: (playerId) => handleRespawn(playerId),
  onPlayerChat: (playerId, message) => routeCommand(playerId, message, false),
  playerCommand: (playerId, command) => routeCommand(playerId, command, true),
  onPlayerAttack: (playerId) => handlePlayerAttack(playerId),
  onPlayerDamagingOtherPlayer: (attackerId, victimId) => processSlap(attackerId, victimId),
  onPlayerClick: (playerId, wasAltClick, x, y, z) => handleClick(playerId, wasAltClick, x, y, z),
  onPlayerAltAction: (playerId) => handleAltAction(playerId),
  onTouchscreenActionButton: (playerId, pressed) => {
    if (pressed !== false) useAbility(playerId);
  },
  onPlayerBoughtShopItem: (playerId, categoryKey, itemKey) => handleShopBuy(playerId, categoryKey, itemKey),
  onPlayerToggledShopMenu: (playerId, isOpen) => {
    if (isOpen) shopSync(playerId, pd(playerId));
  },
  onBlockStand: (playerId, x, y, z, blockName) => handleBlockStand(playerId, blockName),
};

export function initGame() {
  if (_initialized) return callbacks;
  _initialized = true;

  cleanupOrphans();
  loadBans();
  initShopCategories();
  initKillstreakHooks();
  initGloveManager();
  initEventHooks();

  // Bind all Bloxd World Code callbacks cleanly onto globalThis
  for (const name in callbacks) {
    globalThis[name] = callbacks[name];
  }
  return callbacks;
}
