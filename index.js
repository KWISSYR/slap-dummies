import { initGame, callbacks } from "./Main.js";

initGame();

export const {
  tick,
  onClose,
  doPeriodicSave,
  onPlayerJoin,
  onPlayerLeave,
  onPlayerJump,
  onRespawnRequest,
  onPlayerChat,
  playerCommand,
  onPlayerAttack,
  onPlayerDamagingOtherPlayer,
  onPlayerClick,
  onPlayerAltAction,
  onTouchscreenActionButton,
  onPlayerBoughtShopItem,
  onPlayerToggledShopMenu,
  onBlockStand,
} = callbacks;
