export const SPAWN = [100, 101, 100];
export const TUTORIAL_BLOCK = [100, 100, 100];
export const PRACTICE = [0, 1, 40];

export const KOTH = { x: 0, y: -50, z: 0, radius: 8, holdMs: 5000, reward: 2 };
export const DUEL_POS = { a: [-6, 1, -40], b: [6, 1, -40], center: [0, 1, -40], radius: 35, inviteMs: 30000 };
export const BOUNTY_CFG = { minStreak: 5, baseReward: 15, perKillBonus: 3, maxReward: 50 };
export const CRATE_CFG = { everyMs: 65000, durMs: 12000, maxCrates: 2 };
export const BOSS_CFG = {
  intervalMs: 3600000, // 60 minutes
  durationMs: 300000, // 5 minutes fight time
  maxHp: 5000,
  rewardPoolSlaps: 1500,
  secretDropChance: 0.01, // 1%
  spawnPos: [0, -49, 0],
};
export const WORLD_LB = {
  anchor: [100, 95, 100],
  boards: [
    [100, 103, 95],
    [100, 102, 95],
    [100, 101, 95],
  ],
  maxEntries: 250,
};

export const EVENT_CFG = {
  minWaitMs: 300000, // 5 minutes
  maxWaitMs: 600000, // 10 minutes
  secretChance: 0.04, // 4% super-rare secret glove event roll
  arenaMinY: -52,
  arenaMaxY: -40,
  spawnRadius: 46,
};

export const DB_KEY = "slapV2";
export const LEGACY_DB_KEY = "slapV1";
export const LEGACY_X_KEY = "slapX1";
export const ADMIN_NAME = "kwissyr";
export const STAR = "\u2605";

export const PORTAL_COOLDOWN_MS = 1500;
export const PORTAL_SEARCH_RADIUS = 80;

export const TIERS = {
  common: { label: "COMMON", color: "#d8dee9", stars: 1, order: 1 },
  uncommon: { label: "UNCOMMON", color: "#30d158", stars: 2, order: 2 },
  rare: { label: "RARE", color: "#5ac8fa", stars: 3, order: 3 },
  epic: { label: "EPIC", color: "#bf5af2", stars: 4, order: 4 },
  legendary: { label: "LEGENDARY", color: "#ffd60a", stars: 5, order: 5 },
  extreme: { label: "EXTREME", color: "#ff2d92", stars: 6, order: 6 },
  special: { label: "SPECIAL", color: "#ff3b30", stars: 6, order: 7 },
  secret: { label: "SECRET", color: "#ff2d55", stars: 7, order: 8 },
};

export const CFG = {
  killY: -58,
  creditMs: 8500,
  killReward: 6,
  revengeReward: 4,
  assistReward: 2,
  assistMs: 8500,
  assistPairMs: 120000,
  killstreakFarmMs: 15000,
  force: 19,
  lift: 8.5,
  maxPush: 48,
  facingBlend: 0.6,
  slapReach: 3.85,
  slapHitboxRadius: 0.78,
  slapProxRadius: 2.55,
  slapProxVert: 2.2,
  slapConeCos: 0.35,
  slapSweetDist: 1.75,
  slapSweetMult: 1.08,
  slapTipMinMult: 0.78,
  slapSwingDebounceMs: 120,
  comboDecay: 0.16,
  comboMin: 0.56,
  comboReset: 2300,
  comboMaxHits: 3,
  comboBreakMs: 950,
  hitIframesMs: 320,
  heatGain: 0.14,
  heatMax: 1.25,
  heatDecay: 0.10,
  heatScale: 0.52,
  airBonus: 1.12,
  ragBase: 1300,
  ragComboExtMs: 420,
  ragMaxChainMs: 2200,
  ragSpeed: 0.14,
  ragAirAcc: 0.24,
  ragPoseFlipMs: 240,
  ragGetupMs: 180,
  ragBowlSpeed: 10.5,
  ragBowlForce: 0.42,
  ragSlideDrag: 0.86,
  ragImmune: 0,
  cancelStart: 380,
  cancelEnd: 940,
  perfectMs: 160,
  techWindow: 350,
  cancelHop: 7,
  cancelDash: 7,
  perfectHop: 11,
  perfectDash: 13,
  centerAssist: 0.5,
  armorMs: 550,
  bounceMin: 5.5,
  bounceRest: 0.62,
  groundBounce: 0.36,
  groundBounceMin: 6.8,
  maxBounces: 3,
  switchCd: 6000,
  protectMs: 2000,
  warpDist: 15,
  warpLockMs: 8000,
  pracRadius: 60,
  saveEveryMs: 20000,
  tzStd: -5,
  tzDst: 1,
  graceDays: 1,
  dailyBase: 10,
  dailyPerDay: 5,
  dailyCap: 60,
  afkMs: 60000,
  sessionRepeatMs: 1800000,
  sessionRepeatSlaps: 60,
  fx: 1,
  orbitCount: 3,
  orbitRadius: 0.9,
  orbitHeight: 2.4,
  orbitSpeed: 3,
  orbBlocks: 1,
  orbBlockCount: 3,
  orbBlockSize: 0.32,
  orbBlockRadius: 1.25,
  orbBlockHeight: 1.5,
  handSize: 0.42,
  handY: -0.5,
  handZ: 0.2,
  tetherMs: 550,
  iceSize: 1.9,
  shieldSize: 2.3,
  bombSize: 0.7,
  trail: 1,
  presets: 1,
  ringSteps: 12,
  tagMs: 500,
  particles: 1,
  pmode: 0,
  usePose: 1,
  allowTune: 1,
  maxZones: 20,

  // Ability tuning constants
  chargeDash: 14,
  chargeMs: 500,
  chargeForce: 1.4,
  chargeArmorMs: 700,
  overMult: 1.8,
  overMs: 5000,
  overRag: 1.4,
  slamForward: 9,
  slamUp: 13,
  slamRadius: 5.5,
  slamForce: 1.7,
  slamArmMs: 400,
  slamMaxMs: 4000,
  springHop: 15,
  springDash: 8,
  shieldMs: 2500,
  freezeRadius: 6,
  freezeMs: 2000,
  shatterForce: 1.3,
  slowMult: 0.6,
  slowMs: 1500,
  swapRange: 14,
  swapShove: 0.8,
  pullRange: 12,
  pullForce: 1.25,
  chainRange: 10,
  chainJump: 6.5,
  chainCount: 3,
  chainForce: 1.85,
  chainFalloff: 0.72,
  launchRange: 6.5,
  anchorMs: 3500,
  trapMs: 14000,
  trapRadius: 1.7,
  dashDist: 6.5,
  magnetRadius: 10.5,
  magnetForce: 1.2,
  bombRange: 12,
  bombMs: 1500,
  bombRadius: 5.5,
  bombForce: 1.85,
  cycloneRadius: 7,
  cycloneInMs: 550,
  cycloneOutForce: 1.45,
  cycloneLift: 2.6,
  ghostMs: 3000,
  ghostDash: 7,
  gravityRadius: 6.5,
  gravityMs: 3600,
  mirrorMs: 2500,
  phantomRange: 14,
  phantomMs: 2000,
  reapRadius: 7.5,
  reapForce: 1.5,
  reapStreak: 0.15,
  portalMs: 10000,
  portalDist: 8,
  rewindHistoryMs: 3000,
  rewindRange: 13,
  leechRange: 10,
  leechCdGain: 4000,
  leechCdDrain: 3000,
  decoyMs: 2600,
  decoyRadius: 4.5,
  timeRadius: 7.5,
  timeMs: 4000,
  echoRange: 10,
  echoMs: 5500,
  echoDelayMs: 1000,
  meteorRange: 11,
  meteorRadius: 6,
  meteorForce: 2.1,
  singularityRange: 7,
  singularityRadius: 8.5,
  singularityMs: 1800,
  singularityForce: 2.0,
  titanMs: 4000,
  titanRadius: 6.5,
  titanForce: 2.0,
  novaRadius: 12,
  novaPullMs: 500,
  novaForce: 2.6,
};

export const GLOVES = {
  // COMMON
  default: {
    id: "default", tag: "CLASSIC", tier: "common", cat: "basic",
    need: 0, cd: 600, f: 1.0, l: 1.0, r: 1.0,
    d: "Balanced slap with reliable knockback.",
    abName: "CHARGE", abCd: 6000,
    abDesc: "Dash forward with armor; anyone you ram is launched.",
    b: "Block of Iron", c: ["#ffffff", "#7fdbff"], s: 1,
    preset: "aura", ring: 3,
  },
  power: {
    id: "power", tag: "POWER", tier: "common", cat: "basic",
    need: 10, cd: 1400, f: 2.15, l: 1.22, r: 1.35,
    d: "Supercharged heavy punchy slap with high knockback.",
    abName: "OVERCHARGE", abCd: 10000,
    abDesc: "Empowers your next slap with 1.8x knockback and longer ragdoll.",
    b: "Lava", c: ["#ff3b30", "#ff9500", "#ffd60a"], s: 2,
    preset: "orangeFirecrackerSmall", ring: 3,
  },
  rocket: {
    id: "rocket", tag: "ROCKET", tier: "common", cat: "basic",
    need: 30, cd: 900, f: 1.2, l: 1.05, r: 1.0,
    d: "Explosive-tipped slap with crisp knockback.",
    abName: "ROCKET SLAM", abCd: 10000,
    abDesc: "Blast skyward, then crash down to detonate everyone nearby.",
    b: "Fireball Block", c: ["#ff9500", "#ff3b30"], s: 2,
    preset: "stomp", ring: 0,
  },
  spring: {
    id: "spring", tag: "SPRING", tier: "common", cat: "basic",
    need: 50, cd: 750, f: 0.9, l: 1.65, r: 1.0,
    d: "Bouncy slap that pops opponents upward.",
    abName: "BOING LEAP", abCd: 7500,
    abDesc: "High vertical vault with forward momentum to escape or ambush.",
    b: "Lime Concrete", c: ["#30d158", "#a8ff78"], s: 2,
    preset: "limeFirecrackerSmall", ring: 2.5,
  },
  shield: {
    id: "shield", tag: "AEGIS", tier: "common", cat: "basic",
    need: 80, cd: 850, f: 1.1, l: 1.0, r: 1.0,
    d: "Steady defensive slap.",
    abName: "AEGIS GUARD", abCd: 11000,
    abDesc: "Raise a 2.5s barrier that blocks slaps and knocks back attackers.",
    b: "Block of Iron", c: ["#64d2ff", "#ffffff"], s: 2,
    preset: "boardShopSuccess", ring: 3,
  },

  // UNCOMMON
  freeze: {
    id: "freeze", tag: "FREEZE", tier: "uncommon", cat: "basic",
    need: 120, cd: 800, f: 1.0, l: 1.0, r: 1.0,
    d: "Chills opponents on slap, briefly slowing them.",
    abName: "DEEP FREEZE", abCd: 13000,
    abDesc: "Encase nearby foes in ice, then shatter them outward.",
    b: "Ice", c: ["#7fdbff", "#c8f4ff", "#ffffff"], s: 3,
    preset: "whiteFirecrackerSmall", ring: 6,
  },
  swap: {
    id: "swap", tag: "SWAP", tier: "uncommon", cat: "basic",
    need: 170, cd: 800, f: 1.1, l: 1.0, r: 1.0,
    d: "Quick slap built for positional plays.",
    abName: "SWAP", abCd: 10000,
    abDesc: "Trade places with the player you face, then shove them back.",
    b: "Pumpkin", c: ["#bf5af2", "#ff2d92"], s: 3,
    preset: "brainRot", ring: 3,
  },
  pull: {
    id: "pull", tag: "PULL", tier: "uncommon", cat: "basic",
    need: 230, cd: 800, f: 1.1, l: 1.0, r: 1.0,
    d: "Quick slap that pairs with grapple setups.",
    abName: "GRAPPLE PULL", abCd: 9000,
    abDesc: "Tether and yank the player you face directly toward you.",
    b: "Block of Diamond", c: ["#30d158", "#64f0a0", "#7fdbff"], s: 3,
    preset: "mobSpawnOrb", ring: 3,
  },
  shock: {
    id: "shock", tag: "SHOCK", tier: "uncommon", cat: "basic",
    need: 300, cd: 950, f: 1.3, l: 1.1, r: 1.1,
    d: "Crackling electric slap.",
    abName: "CHAIN LIGHTNING", abCd: 12000,
    abDesc: "Zap a target in front; lightning arcs to up to 2 nearby foes.",
    b: "Block of Gold", c: ["#ffd60a", "#fffbd0", "#ff9500"], s: 3,
    preset: "yellowFirecrackerSmall", ring: 4,
  },
  launch: {
    id: "launch", tag: "LAUNCH", tier: "uncommon", cat: "basic",
    need: 390, cd: 950, f: 0.85, l: 2.2, r: 1.2,
    d: "Uppercut slap that sends opponents skyward.",
    abName: "SKY LAUNCH", abCd: 10000,
    abDesc: "Send the player you face soaring high into the sky.",
    b: "Glass", c: ["#5e5ce6", "#ff2d92", "#64d2ff"], s: 3,
    preset: "purpleFirecrackerSmall", ring: 3,
  },
  anchor: {
    id: "anchor", tag: "ANCHOR", tier: "uncommon", cat: "basic",
    need: 480, cd: 1000, f: 1.35, l: 0.8, r: 1.15,
    d: "Heavy grounded slap with low upward lift.",
    abName: "IRON ANCHOR", abCd: 12000,
    abDesc: "Drop anchor for 3.5s: gain near-immunity to knockback and ragdoll.",
    b: "Block of Coal", c: ["#8e8e93", "#d1d1d6"], s: 3,
    preset: "stomp", ring: 3.5,
  },
  trap: {
    id: "trap", tag: "TRAP", tier: "uncommon", cat: "basic",
    need: 580, cd: 850, f: 1.15, l: 1.1, r: 1.0,
    d: "Tactical slap.",
    abName: "SNAP TRAP", abCd: 10500,
    abDesc: "Place a hidden-hazard trap on the ground that pops the first enemy to step near.",
    b: "Red Concrete", c: ["#ff9500", "#ff3b30"], s: 3,
    preset: "orangeFirecrackerSmall", ring: 2,
  },
  dash: {
    id: "dash", tag: "BLINK", tier: "uncommon", cat: "basic",
    need: 680, cd: 700, f: 1.1, l: 1.0, r: 0.95,
    d: "Fast agile slap.",
    abName: "FLASH STEP", abCd: 8000,
    abDesc: "Instantly blink forward safely to dodge ledges or flank foes.",
    b: "Light Blue Concrete", c: ["#64d2ff", "#ffffff"], s: 3,
    preset: "aura", ring: 2.5,
  },

  // RARE
  magnet: {
    id: "magnet", tag: "MAGNET", tier: "rare", cat: "elite",
    need: 850, cd: 800, f: 1.15, l: 1.0, r: 1.0,
    d: "Magnetic slap that disrupts enemy spacing.",
    abName: "MAGNETIC CORE", abCd: 11000,
    abDesc: "Pull all nearby enemies into a focal point 4 blocks ahead of you.",
    b: "Red Concrete", c: ["#ff3b30", "#c8c8c8", "#ff6b6b"], s: 4,
    preset: "redFirecrackerSmall", ring: 10.5,
  },
  bomb: {
    id: "bomb", tag: "BOMB", tier: "rare", cat: "elite",
    need: 1050, cd: 950, f: 1.45, l: 1.1, r: 1.2,
    d: "Volatile slap with strong punch.",
    abName: "TIME BOMB", abCd: 12000,
    abDesc: "Stick a 1.5s bomb on the player you face; blasts everyone around them.",
    b: "Block of Coal", c: ["#ff9500", "#6b6b6b", "#ff3b30"], s: 4,
    preset: "redFirecrackerSmall", ring: 3,
  },
  cyclone: {
    id: "cyclone", tag: "CYCLONE", tier: "rare", cat: "elite",
    need: 1300, cd: 900, f: 1.15, l: 1.5, r: 1.2,
    d: "Swirling slap that lifts opponents off balance.",
    abName: "TEMPEST VORTEX", abCd: 12000,
    abDesc: "Pulls nearby enemies into a vortex swirl, then violently blasts them outward.",
    b: "Sand", c: ["#c8f4ff", "#7fdbff", "#e8d9a0"], s: 4,
    preset: "whiteFirecrackerLarge", ring: 7,
  },
  ghost: {
    id: "ghost", tag: "GHOST", tier: "rare", cat: "elite",
    need: 1600, cd: 700, f: 1.2, l: 1.0, r: 1.1,
    d: "Fast spectral slap.",
    abName: "PHASE", abCd: 14000,
    abDesc: "Turn intangible for 3s: slaps pass through you while you dash forward.",
    b: "Snow", c: ["#ffffff", "#c8c8e8", "#9aa0ff"], s: 4,
    preset: "whiteFirecrackerSmall", ring: 3,
  },
  gravity: {
    id: "gravity", tag: "GRAVITY", tier: "rare", cat: "elite",
    need: 1950, cd: 900, f: 1.25, l: 1.35, r: 1.15,
    d: "Warped-weight slap.",
    abName: "ZERO-G WELL", abCd: 13000,
    abDesc: "Creates a gravity field that floats nearby foes, then slams them down.",
    b: "Purple Concrete", c: ["#bf5af2", "#5e5ce6", "#ffffff"], s: 4,
    preset: "purpleFirecrackerSmall", ring: 6.5,
  },
  mirror: {
    id: "mirror", tag: "MIRROR", tier: "rare", cat: "elite",
    need: 2300, cd: 850, f: 1.15, l: 1.05, r: 1.05,
    d: "Reflective slap.",
    abName: "MIRROR COUNTER", abCd: 13000,
    abDesc: "2.5s reflective stance: reverses incoming slaps and targeted abilities back at attackers.",
    b: "Glass", c: ["#ffffff", "#a0f0ff", "#ff99ff"], s: 4,
    preset: "boardShopSuccess", ring: 3.5,
  },
  phantom: {
    id: "phantom", tag: "PHANTOM", tier: "rare", cat: "elite",
    need: 2700, cd: 750, f: 1.35, l: 1.1, r: 1.15,
    d: "Crisp ambush slap.",
    abName: "SHADOW STALK", abCd: 12000,
    abDesc: "Vanish briefly and teleport directly behind the nearest opponent for a back-slap.",
    b: "Black Concrete", c: ["#9a7bff", "#2c2c54", "#ff2d92"], s: 4,
    preset: "mobDeathSoul", ring: 3.5,
  },

  // EPIC
  reaper: {
    id: "reaper", tag: "REAPER", tier: "epic", cat: "elite",
    need: 3200, cd: 1200, f: 2.15, l: 1.2, r: 1.35,
    d: "Very heavy grim slap.",
    abName: "SOUL HARVEST", abCd: 14000,
    abDesc: "Unleash a dark blast that grows stronger with your knock-off streak.",
    b: "Obsidian", c: ["#8a2be2", "#ff2d92", "#4b0082"], s: 5,
    preset: "mobDeathSoul", ring: 7.5,
  },
  hammer: {
    id: "hammer", tag: "THOR", tier: "epic", cat: "elite",
    need: 3500, cd: 1050, f: 1.95, l: 1.25, r: 1.3,
    d: "Thunder-forged heavy slap.",
    abName: "THUNDER SMASH", abCd: 13000,
    abDesc: "Call down a lightning strike ahead that blasts & stuns nearby enemies.",
    b: "Block of Gold", c: ["#ffd60a", "#64d2ff", "#ffffff"], s: 5,
    preset: "yellowFirecrackerLarge", ring: 6.5,
  },
  portal: {
    id: "portal", tag: "PORTAL", tier: "epic", cat: "elite",
    need: 3700, cd: 850, f: 1.25, l: 1.05, r: 1.1,
    d: "Spatial slap.",
    abName: "WARP GATES", abCd: 14000,
    abDesc: "Open two linked portals ahead & at your feet; anyone touching one warps to the other.",
    b: "Purple Concrete", c: ["#00f5d4", "#9b5de5", "#f15bb5"], s: 5,
    preset: "magentaFirecrackerSmall", ring: 3.5,
  },
  rewind: {
    id: "rewind", tag: "REWIND", tier: "epic", cat: "elite",
    need: 4200, cd: 850, f: 1.25, l: 1.05, r: 1.1,
    d: "Temporal slap.",
    abName: "TEMPORAL RECALL", abCd: 13500,
    abDesc: "Snap the target you face (or yourself if alone) back to where they stood 3s ago.",
    b: "Cyan Concrete", c: ["#64d2ff", "#ffd60a", "#ffffff"], s: 5,
    preset: "brainRot", ring: 4,
  },
  leech: {
    id: "leech", tag: "LEECH", tier: "epic", cat: "elite",
    need: 4700, cd: 850, f: 1.3, l: 1.05, r: 1.1,
    d: "Siphoning slap that briefly slows your target.",
    abName: "SYPHON", abCd: 13000,
    abDesc: "Steal speed and ability cooldown charge from the target in front of you.",
    b: "Red Concrete", c: ["#ff2d92", "#30d158", "#8a2be2"], s: 5,
    preset: "mobDeath", ring: 3.5,
  },
  decoy: {
    id: "decoy", tag: "DECOY", tier: "epic", cat: "elite",
    need: 5200, cd: 850, f: 1.3, l: 1.1, r: 1.1,
    d: "Illusionist slap.",
    abName: "ILLUSION CLONE", abCd: 13000,
    abDesc: "Send a charging decoy forward that detonates on enemy contact or timeout.",
    b: "Yellow Concrete", c: ["#ffd60a", "#7fdbff", "#ffffff"], s: 5,
    preset: "pinkFirecrackerSmall", ring: 3,
  },

  // LEGENDARY
  time: {
    id: "time", tag: "CHRONO", tier: "legendary", cat: "elite",
    need: 5800, cd: 900, f: 1.45, l: 1.15, r: 1.2,
    d: "Clockwork slap with crisp knockback.",
    abName: "CHRONO FIELD", abCd: 16000,
    abDesc: "Emit a 4s time-dilation dome that slows enemies inside while speeding you up.",
    b: "Block of Gold", c: ["#ffd60a", "#64d2ff", "#ffffff"], s: 5,
    preset: "yellowFirecrackerLarge", ring: 7.5,
  },
  echo: {
    id: "echo", tag: "ECHO", tier: "legendary", cat: "elite",
    need: 6400, cd: 900, f: 1.4, l: 1.15, r: 1.2,
    d: "Resonant slap.",
    abName: "RESONANCE ECHO", abCd: 15000,
    abDesc: "Mark a target for 5.5s: every slap they take echoes 1s later with a second blast.",
    b: "Block of Diamond", c: ["#7fdbff", "#bf5af2", "#ffffff"], s: 5,
    preset: "purpleFirecrackerLarge", ring: 4,
  },
  vortex: {
    id: "vortex", tag: "VORTEX", tier: "legendary", cat: "elite",
    need: 6800, cd: 900, f: 1.75, l: 1.25, r: 1.25,
    d: "Spinning tidal slap with crisp range control.",
    abName: "ORBITAL GRAB", abCd: 14500,
    abDesc: "Vacuum nearby foes around you in a tight spiral, then fling them skyward.",
    b: "Block of Diamond", c: ["#64d2ff", "#00f5d4", "#ffffff"], s: 6,
    preset: "whiteFirecrackerLarge", ring: 7.5,
  },
  meteor: {
    id: "meteor", tag: "METEOR", tier: "legendary", cat: "elite",
    need: 7200, cd: 1050, f: 1.95, l: 1.28, r: 1.35,
    d: "Molten heavy slap.",
    abName: "METEOR STRIKE", abCd: 16000,
    abDesc: "Call down a blazing sky meteor onto the spot ahead, shattering the impact zone.",
    b: "Lava", c: ["#ff3b30", "#ff9500", "#ffd60a"], s: 6,
    preset: "orangeFirecrackerLarge", ring: 6,
  },
  singularity: {
    id: "singularity", tag: "SINGULARITY", tier: "legendary", cat: "elite",
    need: 8000, cd: 1000, f: 1.9, l: 1.25, r: 1.3,
    d: "Crushing cosmic slap.",
    abName: "BLACK HOLE", abCd: 17000,
    abDesc: "Summon a gravity singularity that drags foes inward, then violently explodes.",
    b: "Obsidian", c: ["#5e5ce6", "#ff2d92", "#1c1c1e"], s: 6,
    preset: "purpleFirecrackerLarge", ring: 8.5,
  },

  // EXTREME
  titan: {
    id: "titan", tag: "TITAN", tier: "extreme", cat: "elite",
    need: 9200, cd: 1150, f: 2.35, l: 1.32, r: 1.5,
    d: "Colossal shockwave slap.",
    abName: "TITAN CRUSH", abCd: 18000,
    abDesc: "Enter 4s Juggernaut armor and slam the ground with a devastating shockwave.",
    b: "Block of Gold", c: ["#ffd60a", "#ff9500", "#ffffff"], s: 6,
    preset: "yellowFirecrackerLarge", ring: 6.5,
  },
  berserker: {
    id: "berserker", tag: "BERSERKER", tier: "extreme", cat: "elite",
    need: 10000, cd: 950, f: 2.35, l: 1.25, r: 1.45,
    d: "Savage high-power slap built for relentless pressure.",
    abName: "RAMPAGE ROAR", abCd: 16000,
    abDesc: "Unleash a 4s bloodlust surge: +45% slap power & speed burst.",
    b: "Red Concrete", c: ["#ff2d55", "#ff9500", "#ffffff"], s: 7,
    preset: "redFirecrackerLarge", ring: 5.5,
  },
  nova: {
    id: "nova", tag: "NOVA", tier: "extreme", cat: "elite",
    need: 11000, cd: 1150, f: 2.55, l: 1.4, r: 1.6,
    d: "Cosmic pinnacle slap with legendary force.",
    abName: "SUPERNOVA", abCd: 20000,
    abDesc: "Draws nearby foes slightly inward, then erupts in a massive multi-wave Supernova.",
    b: "Block of Emerald", c: ["#ffd60a", "#ff2d92", "#64d2ff", "#30d158"], s: 8,
    preset: "yellowFirecrackerLarge", ring: 12,
  },
  godhand: {
    id: "godhand", tag: "GOD HAND", tier: "extreme", cat: "elite",
    need: 14000, cd: 1200, f: 2.65, l: 1.45, r: 1.65,
    d: "Colossal divine slap that sends opponents across the arena.",
    abName: "TIME STOP", abCd: 22000,
    abDesc: "Freeze all nearby opponents in place for 2.2s, then detonate them outward.",
    b: "Block of Gold", c: ["#ffffff", "#ffd60a", "#64d2ff"], s: 8,
    preset: "whiteFirecrackerLarge", ring: 9.5,
  },

  // SPECIAL
  killstreak: {
    id: "killstreak", tag: "KILLSTREAK", tier: "special", cat: "elite",
    need: 2500, cd: 850, f: 1.0, l: 1.0, r: 1.0, special: true,
    d: "Starts light, then evolves through 6 deadly stages as you rack up arena kills!",
    abName: "BLOOD SURGE", abCd: 11000,
    abDesc: "Evolves with your streak: Dash -> Slash -> Carnage Wave -> Soul Pulse -> Final Judgment.",
    b: "Red Concrete", c: ["#ff3b30", "#ff9500", "#ffd60a"], s: 6,
    preset: "redFirecrackerLarge", ring: 4,
  },

  // SECRET GLOVES (HARD TO UNLOCK)
  eclipse: {
    id: "eclipse", tag: "ECLIPSE", tier: "secret", cat: "elite",
    need: 0, cd: 820, f: 2.1, l: 1.28, r: 1.4, secret: true,
    unlockHint: "Collect 3 Eclipse Shards during Total Eclipse Rituals.",
    d: "Secret Event Glove: forged from 3 shards during Total Eclipse Rituals.",
    abName: "VOID UMBRA", abCd: 14000,
    abDesc: "Draw foes inward toward a dark eclipse singularity, then shatter outward.",
    b: "Obsidian", c: ["#bf5af2", "#1c1c1e", "#ff2d55"], s: 7,
    preset: "purpleFirecrackerLarge", ring: 8.5,
  },
  celestial: {
    id: "celestial", tag: "CELESTIAL", tier: "secret", cat: "elite",
    need: 0, cd: 780, f: 2.15, l: 1.32, r: 1.4, secret: true,
    unlockHint: "Collect 3 Starlight Cores during Starfall Blessings.",
    d: "Secret Event Glove: claimed from 3 Starlight Cores during Starfall Blessings.",
    abName: "ASTRAL JUDGEMENT", abCd: 15000,
    abDesc: "Surge forward on starlight and detonate an 8-block radiant shockwave.",
    b: "Block of Diamond", c: ["#64d2ff", "#ffd60a", "#ffffff"], s: 7,
    preset: "yellowFirecrackerLarge", ring: 8,
  },
  phoenix: {
    id: "phoenix", tag: "PHOENIX", tier: "secret", cat: "elite",
    need: 0, cd: 800, f: 2.05, l: 1.35, r: 1.35, secret: true,
    unlockHint: "Land 5 Perfect Ragdoll Cancels in a SINGLE life.",
    d: "Secret Skill Glove: forged from 5 Perfect Cancels without dying.",
    abName: "REBIRTH UPDRAFT", abCd: 14000,
    abDesc: "Works even mid-ragdoll! Clear disables, rocket skyward, and blast nearby foes.",
    b: "Lava", c: ["#ff9500", "#ff3b30", "#ffd60a"], s: 7,
    preset: "orangeFirecrackerLarge", ring: 6.5,
  },
  jester: {
    id: "jester", tag: "JESTER", tier: "secret", cat: "elite",
    need: 0, cd: 760, f: 1.95, l: 1.35, r: 1.45, secret: true,
    unlockHint: "Dethrone 3 KOTH Kings or Bounty Targets.",
    d: "Secret Combat Glove: earned by toppling 3 KOTH Kings or Bounty Targets.",
    abName: "CHAOS ROULETTE", abCd: 12000,
    abDesc: "Unleash a wildcard prank: swap-blast, confetti meteor, or mega shockwave!",
    b: "Magenta Concrete", c: ["#ff2d92", "#ffd60a", "#30d158"], s: 7,
    preset: "pinkFirecrackerLarge", ring: 7,
  },
  voidwalker: {
    id: "voidwalker", tag: "VOIDWALKER", tier: "secret", cat: "elite",
    need: 0, cd: 820, f: 2.25, l: 1.32, r: 1.45, secret: true,
    unlockHint: "Reach 1,500 Slaps + 10 KOs, then find the Secret Shrine [115,96,115].",
    d: "Secret Hunt Glove: discovered at the hidden Void Shrine.",
    abName: "ABYSSAL BLINK", abCd: 13500,
    abDesc: "Warp 12 blocks forward while leaving behind an imploding void rift.",
    b: "Obsidian", c: ["#5e5ce6", "#bf5af2", "#ffffff"], s: 8,
    preset: "purpleFirecrackerLarge", ring: 7,
  },
  colossus: {
    id: "colossus", tag: "COLOSSUS", tier: "secret", cat: "elite",
    need: 0, cd: 900, f: 2.4, l: 1.4, r: 1.5, secret: true,
    unlockHint: "Deal the highest damage to the Hourly World Boss.",
    d: "Secret Boss Glove: forged by conquering the Hourly World Boss.",
    abName: "TITANIC SLAM", abCd: 16000,
    abDesc: "Slam the ground with colossal force, launching all nearby opponents skyward.",
    b: "Obsidian", c: ["#ff3b30", "#ffd60a", "#ffffff"], s: 8,
    preset: "redFirecrackerLarge", ring: 9,
  },
};

export const GORDER = Object.keys(GLOVES);

export const EVENTS = {
  low_grav: {
    id: "low_grav", name: "ZERO-G CHAOS", durMs: 90000, color: "#64d2ff",
    desc: "Double jump unlocked & +55% launch height on every slap!",
  },
  frenzy: {
    id: "frenzy", name: "2X SLAPS FRENZY", durMs: 120000, color: "#ffd60a",
    desc: "All arena Slaps, KOs & Assists award 2x Slaps + 15% faster cooldowns!",
  },
  slapple: {
    id: "slapple", name: "GOLDEN SLAPPLE RAIN", durMs: 120000, color: "#ffd60a",
    desc: "Golden Slapples are raining on grass islands \u2014 touch them for +15 to +35 Slaps!",
    dropBlock: "Block of Gold", dropEveryMs: 4500, maxDrops: 6,
  },
  knockback: {
    id: "knockback", name: "MEGA KNOCKBACK STORM", durMs: 75000, color: "#ff3b30",
    desc: "Knockback force boosted 1.45x & longer ragdolls!",
  },
  shuffle: {
    id: "shuffle", name: "GLOVE SHUFFLE", durMs: 90000, color: "#30d158",
    desc: "Everyone in the arena temporarily wields a mystery high-tier glove!",
  },
  eclipse: {
    id: "eclipse", name: "TOTAL ECLIPSE RITUAL", durMs: 180000, color: "#bf5af2", rare: true,
    desc: "SUPER RARE! Collect 3 Eclipse Shards across rituals to unlock ECLIPSE!",
    dropBlock: "Obsidian", dropEveryMs: 14000, maxDrops: 2, secretGlove: "eclipse", secretNeed: 3,
  },
  celestial: {
    id: "celestial", name: "STARFALL BLESSING", durMs: 150000, color: "#64d2ff", rare: true,
    desc: "SUPER RARE! Collect 3 Starlight Cores across Starfalls to unlock CELESTIAL!",
    dropBlock: "Block of Diamond", dropEveryMs: 14000, maxDrops: 2, secretGlove: "celestial", secretNeed: 3,
  },
};

export const KILL_EFFECTS = {
  fx_default: { id: "fx_default", name: "Standard Spark", cost: 0, icon: "Block of Iron", colors: ["#ffd60a", "#ffffff"], preset: "yellowFirecrackerSmall", koSound: "exp_collect", hitSound: "hit" },
  fx_lightning: { id: "fx_lightning", name: "Thunderstrike", cost: 400, icon: "Block of Gold", colors: ["#ffd60a", "#64d2ff"], preset: "yellowFirecrackerLarge", koSound: "zapAccent", hitSound: "zapAccent" },
  fx_confetti: { id: "fx_confetti", name: "Party Pop", cost: 750, icon: "Yellow Concrete", colors: ["#ff2d92", "#30d158", "#ffd60a"], preset: "pinkFirecrackerLarge", koSound: "levelup", hitSound: "hit" },
  fx_crimson: { id: "fx_crimson", name: "Crimson Nova", cost: 1200, icon: "Red Concrete", colors: ["#ff3b30", "#ff9500"], preset: "redFirecrackerLarge", koSound: "cannonFire", hitSound: "hit" },
  fx_frost: { id: "fx_frost", name: "Glacial Shatter", cost: 1800, icon: "Ice", colors: ["#7fdbff", "#ffffff"], preset: "whiteFirecrackerLarge", koSound: "glass", hitSound: "glass" },
  fx_void: { id: "fx_void", name: "Void Collapse", cost: 3000, icon: "Obsidian", colors: ["#bf5af2", "#1c1c1e", "#ff2d55"], preset: "purpleFirecrackerLarge", koSound: "magicAccent", hitSound: "magicAccent" },
};
export const FX_ORDER = Object.keys(KILL_EFFECTS);

export const KILLSTREAK_STAGES = [
  { stage: 0, kills: 0, name: "DORMANT", color: "#ff6b6b", f: 1.0, l: 1.0, r: 1.0, speed: 1.0, orbs: 0, block: "Red Concrete", abName: "BLOOD FOCUS", preset: "aura" },
  { stage: 1, kills: 2, name: "AWAKENED", color: "#ff3b30", f: 1.15, l: 1.05, r: 1.05, speed: 1.06, orbs: 1, block: "Red Concrete", abName: "BLOOD SURGE", preset: "redFirecrackerSmall" },
  { stage: 2, kills: 4, name: "BLOODTHIRSTY", color: "#ff9500", f: 1.32, l: 1.12, r: 1.15, speed: 1.12, orbs: 2, block: "Fireball Block", abName: "CRIMSON SLASH", preset: "orangeFirecrackerSmall" },
  { stage: 3, kills: 7, name: "RAMPAGE", color: "#ff2d92", f: 1.52, l: 1.2, r: 1.25, speed: 1.18, orbs: 2, block: "Lava", abName: "CARNAGE WAVE", preset: "magentaFirecrackerLarge" },
  { stage: 4, kills: 10, name: "NIGHTMARE", color: "#bf5af2", f: 1.75, l: 1.28, r: 1.35, speed: 1.24, orbs: 3, block: "Obsidian", abName: "SOUL PULSE", preset: "purpleFirecrackerLarge" },
  { stage: 5, kills: 15, name: "ASCENDANT", color: "#ffd60a", f: 2.0, l: 1.38, r: 1.45, speed: 1.3, orbs: 4, block: "Block of Emerald", abName: "FINAL JUDGMENT", preset: "redFirecrackerLarge" },
];

export const ACHIEVEMENTS = [
  { id: "first_blood", name: "First Elimination", desc: "Knock your first opponent off the arena.", stat: "kills", target: 1, reward: 15 },
  { id: "slap_100", name: "Slap Apprentice", desc: "Land 100 total slaps.", stat: "slaps", target: 100, reward: 20 },
  { id: "kills_10", name: "Arena Menace", desc: "Score 10 knock-offs.", stat: "kills", target: 10, reward: 35 },
  { id: "kills_100", name: "Centurion", desc: "Score 100 knock-offs.", stat: "kills", target: 100, reward: 150 },
  { id: "streak_3", name: "Hot Streak", desc: "Reach a 3 knock-off streak in one life.", stat: "bestStreak", target: 3, reward: 25 },
  { id: "streak_7", name: "Untouchable", desc: "Reach a 7 knock-off streak in one life.", stat: "bestStreak", target: 7, reward: 80 },
  { id: "streak_15", name: "Living Legend", desc: "Reach a 15 knock-off streak in one life.", stat: "bestStreak", target: 15, reward: 250 },
  { id: "ks_rampage", name: "Blood Awakening", desc: "Reach Killstreak Stage 3 (Rampage) with the Killstreak glove.", stat: "ksMaxStage", target: 3, reward: 100 },
  { id: "ks_ascendant", name: "Reaper Ascendant", desc: "Reach Killstreak Stage 5 (Ascendant) with the Killstreak glove.", stat: "ksMaxStage", target: 5, reward: 400 },
  { id: "cancel_10", name: "Quick Recovery", desc: "Perform 10 ragdoll cancels.", stat: "cancels", target: 10, reward: 25 },
  { id: "perfect_25", name: "Frame Perfect", desc: "Perform 25 perfect ragdoll cancels.", stat: "perfects", target: 25, reward: 75 },
  { id: "multi_kill", name: "Double Trouble", desc: "Knock off 2+ opponents within 5 seconds.", stat: "multiKills", target: 1, reward: 60 },
  { id: "reflect_1", name: "No U", desc: "Reflect an enemy attack or ability using Mirror or Shield.", stat: "reflects", target: 1, reward: 30 },
  { id: "collector_10", name: "Glove Collector", desc: "Unlock 10 different gloves.", stat: "gloves", target: 10, reward: 60 },
  { id: "collector_25", name: "Arsenal Master", desc: "Unlock 25 different gloves.", stat: "gloves", target: 25, reward: 200 },
  { id: "nova_owner", name: "Star Forger", desc: "Unlock the Extreme Nova glove.", stat: "hasNova", target: 1, reward: 300 },
  { id: "assist_25", name: "Team Player", desc: "Earn 25 knock-off assists.", stat: "assists", target: 25, reward: 50 },
  { id: "daily_7", name: "Dedicated Fighter", desc: "Reach a 7-day login streak.", stat: "bestDaily", target: 7, reward: 100 },
];

export const TITLES = [
  ["cancel", "Cancel Master", "#ffd60a", "perfects", 250, "perfect cancels", "Block of Gold"],
  ["exec", "Executioner", "#ff3b30", "kills", 1000, "knock-offs", "Obsidian"],
  ["streak", "Unstoppable", "#ff2d92", "bestStreak", 20, "best knock-off streak", "Fireball Block"],
  ["god", "Slap God", "#64d2ff", "slaps", 25000, "slaps", "Block of Diamond"],
  ["coll", "Collector", "#30d158", "gloves", 25, "gloves unlocked", "Block of Emerald"],
  ["loyal", "Devoted", "#ff9500", "bestDaily", 14, "day login streak", "Pumpkin"],
  ["nolife", "No Life", "#bf5af2", "hours", 25, "hours played", "Block of Coal"],
  ["wing", "Wingman", "#7fdbff", "assists", 200, "assists", "Ice"],
  ["punch", "Punching Bag", "#c8c8c8", "falls", 1000, "falls", "Sand"],
  ["reaper", "Ascendant", "#ff3b30", "ksMaxStage", 5, "Killstreak Stage 5", "Red Concrete"],
];

export const DAILY_BONUS = { 3: 15, 7: 50, 14: 100, 30: 250, 60: 500, 100: 1000 };
export const SESSION_REWARDS = [[300000, 10], [600000, 20], [1200000, 40], [1800000, 60]];
export const LIFETIME_REWARDS = [
  [3600000, 100, "1 hour"],
  [18000000, 300, "5 hours"],
  [36000000, 600, "10 hours"],
  [90000000, 1500, "25 hours"],
  [180000000, 3000, "50 hours"],
];

export const BADGES = {
  brawler: { id: "brawler", tag: "BRAWL", name: "Life Brawler", color: "#ff9500", icon: "Block of Gold", desc: "Slapped 5 times in a single life." },
  void_pusher: { id: "void_pusher", tag: "VOID", name: "Void Pusher", color: "#bf5af2", icon: "Obsidian", desc: "Completed a daily KO objective." },
  heavy_hand: { id: "heavy_hand", tag: "SLAP+", name: "Heavy Hand", color: "#5ac8fa", icon: "Block of Diamond", desc: "Landed 25 daily arena slaps." },
  spell_slinger: { id: "spell_slinger", tag: "CASTER", name: "Spell Slinger", color: "#30d158", icon: "Block of Emerald", desc: "Activated 8 glove abilities in a day." },
  quick_reflex: { id: "quick_reflex", tag: "TECH", name: "Quick Reflex", color: "#ffd60a", icon: "Lime Concrete", desc: "Pulled off 2 daily ragdoll cancels." },
  hill_monarch: { id: "hill_monarch", tag: "MONARCH", name: "Hill Monarch", color: "#ff3b30", icon: "Red Concrete", desc: "Claimed King of the Hill." },
  counter_ace: { id: "counter_ace", tag: "MIRROR", name: "Counter Ace", color: "#64d2ff", icon: "Glass", desc: "Blocked or reflected an incoming slap." },
  daily_champ: { id: "daily_champ", tag: "CHAMP", name: "Daily Champion", color: "#ff2d92", icon: "Block of Emerald", desc: "Completed all 3 daily objectives in one day." },
  phoenix_soul: { id: "phoenix_soul", tag: "PHOENIX", name: "Reborn Ash", color: "#ff9500", icon: "Lava", desc: "Pulled off 5 Perfect Cancels in a single life." },
  king_slayer: { id: "king_slayer", tag: "SLAYER", name: "Regicide", color: "#ff2d92", icon: "Block of Gold", desc: "Dethroned 3 KOTH Kings or Bounty targets." },
  void_finder: { id: "void_finder", tag: "SEEKER", name: "Shrine Seeker", color: "#bf5af2", icon: "Obsidian", desc: "Found the hidden Void Shrine." },
  bounty_hunter: { id: "bounty_hunter", tag: "HUNTER", name: "Bounty Hunter", color: "#ffd60a", icon: "Red Concrete", desc: "Claimed an arena Bounty." },
  duelist: { id: "duelist", tag: "DUELIST", name: "1v1 Champion", color: "#64d2ff", icon: "Block of Diamond", desc: "Won a 1v1 Arena Duel." },
};

export const DAILY_QUEST_POOL = {
  slap_5_life: {
    id: "slap_5_life", slot: 1, name: "Untouchable Combo",
    desc: "Slap 5 players in one life",
    event: "slap_hit", target: 5, perLife: true, reward: 40, badge: "brawler",
  },
  ko_3_daily: {
    id: "ko_3_daily", slot: 2, name: "Ring Out Specialist",
    desc: "Score 3 arena knock-offs today",
    event: "ko", target: 3, perLife: false, reward: 50, badge: "void_pusher",
  },
  ko_5_daily: {
    id: "ko_5_daily", slot: 2, name: "Abyssal Sweeper",
    desc: "Score 5 arena knock-offs today",
    event: "ko", target: 5, perLife: false, reward: 80, badge: "void_pusher",
  },
  slap_25_daily: {
    id: "slap_25_daily", slot: 2, name: "Slap Marathon",
    desc: "Land 25 arena slaps today",
    event: "slap_hit", target: 25, perLife: false, reward: 55, badge: "heavy_hand",
  },
  ability_8_daily: {
    id: "ability_8_daily", slot: 3, name: "Power User",
    desc: "Use glove abilities 8 times today",
    event: "ability", target: 8, perLife: false, reward: 45, badge: "spell_slinger",
  },
  cancel_2_daily: {
    id: "cancel_2_daily", slot: 3, name: "Second Wind",
    desc: "Perform 2 ragdoll cancels today",
    event: "cancel", target: 2, perLife: false, reward: 50, badge: "quick_reflex",
  },
  koth_1_daily: {
    id: "koth_1_daily", slot: 3, name: "Crown Seeker",
    desc: "Capture King of the Hill once",
    event: "koth_capture", target: 1, perLife: false, reward: 60, badge: "hill_monarch",
  },
  reflect_1_daily: {
    id: "reflect_1_daily", slot: 3, name: "No U",
    desc: "Block or reflect an enemy slap",
    event: "reflect", target: 1, perLife: false, reward: 50, badge: "counter_ace",
  },
};

export const ANTICHEAT_CFG = {
  baseMaxSpeed: 12.2,       // Base horizontal blocks/sec cap (walk/sprint ~6.5-8.5)
  speedBuffer: 4.0,         // Lag/jitter grace on top of speedMultiplier-adjusted cap
  teleportThreshold: 22.0,  // Instant distance jump per tick without tpAt/grace
  speedStrikesNeeded: 3,    // Consecutive anomalous ticks before logging SPEED flag
  maxSlapDist: 4.65,        // Soft reach threshold (logs WARN)
  hardRejectDist: 5.65,     // Hard reach threshold (blocks hit & logs HIGH)
  pingReachGrace: 0.75,     // Velocity/latency buffer for moving targets
  logCooldownMs: 4000,      // Min ms between duplicate log types per player
  maxLogs: 60,              // Max retained SecurityLog entries
};

// Physical lobby block coordinates mapped to interactive actions (extensible in-world)
export const LOBBY_BLOCKS = {
  "100,100,100": { type: "tutorial" },
  "103,101,100": { type: "shop", cat: "gloves_basic" },
  "104,101,100": { type: "shop", cat: "gloves_elite" },
  "105,101,100": { type: "shop", cat: "titles" },
  "102,101,100": { type: "shop", cat: "cosmetics" },
  "96,101,100": { type: "shop", cat: "quests" },
  "97,101,100": { type: "practice" },
  "101,101,95": { type: "lb_view" },
  "99,101,95": { type: "lb_mode" },
  "95,101,95": { type: "admin_panel" },
  "115,96,115": { type: "secret_shrine" },
};

export function getMasteryRank(kills) {
  const k = kills || 0;
  if (k >= 50) return { rank: 3, cdMult: 0.85, forceMult: 1.08, badge: "[M3]", label: "MASTERED" };
  if (k >= 25) return { rank: 2, cdMult: 0.90, forceMult: 1.05, badge: "[M2]", label: "ADEPT" };
  if (k >= 10) return { rank: 1, cdMult: 0.95, forceMult: 1.0, badge: "[M1]", label: "TRAINED" };
  return { rank: 0, cdMult: 1.0, forceMult: 1.0, badge: "", label: "NONE" };
}

export function getKsStageConfig(stageIdx) {
  const idx = Math.max(0, Math.min(KILLSTREAK_STAGES.length - 1, stageIdx || 0));
  return KILLSTREAK_STAGES[idx];
}

export function activeGloveVisual(p) {
  const base = GLOVES[p.glove] || GLOVES.default;
  if (p.glove === "killstreak") {
    const st = getKsStageConfig(p.ksStage);
    return {
      b: st.block,
      c: [st.color, "#ffffff", "#ff3b30"],
      s: Math.min(8, base.s + Math.floor(p.ksStage / 2)),
      t: "KS-" + st.name,
      orbs: st.orbs,
    };
  }
  return { b: base.b, c: base.c, s: base.s, t: base.tag, orbs: base.id === "default" ? 0 : CFG.orbBlockCount };
}
