// ========================================
// Canvas
// ========================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ========================================
// 게임 변수
// ========================================

let floor = 1;
let gold = 0;
let kills = 0;

let level = 1;
let experience = 0;
let experienceToNextLevel = 30;
let floorEventHandled = false;

let gameRunning = false;
let gamePaused = false;

let enemies = [];
let items = [];
let enemyProjectiles = [];
let floorHazards = [];
let biomeHazardCooldown = 540;
let eventSelecting = false;
let activeDungeonEvent = null;
let countdownToEvent = false;
let eventEncounterCompleted = false;
let pendingTrialReward = false;
let bossKillsThisRun = 0;
let runRecorded = false;
let lastRunShardReward = 0;
let activeSynergies = [];
let activatedSynergies = new Set();

// 다음 층 카운트다운
let floorCountdownActive = false;
let floorCountdownTime = 5;
// 카운트다운 종료 후 상점으로 갈지 여부
let countdownToShop = false;

// 5초를 밀리초로 저장
const FLOOR_COUNTDOWN_DURATION = 5000;

// 카운트다운 HTML 요소
const floorCountdown = document.getElementById("floorCountdown");
const countdownText = document.getElementById("countdownText");
const countdownNumber = document.getElementById("countdownNumber");
const countdownProgress = document.getElementById("countdownProgress");

// ========================================
// 플레이어
// ========================================

const player = {
  x: 400,
  y: 250,

  size: 24,

  speed: 3,

  hp: 100,
  maxHp: 100,

  damage: 25,

  attackRange: 90,

  attackSpeedMultiplier: 1,
  finalDamageMultiplier: 1,
  defense: 0,
  thirdHitBonus: 0,
  attackCount: 0,

  attackCooldown: 0,

  invincible: 0,

  direction: "down",

  attacking: false,

  attackTimer: 0,
  attackTimerMax: 12,
  attackSwingCount: 1,
  attackSwingDuration: 12,
  attackSwingIndex: -1,
  moving: false,
  facing: "down",
  attackStyle: "slash",

  // 현재 공격에서 이미 맞은 적
  hitEnemies: [],

  // 확장 콘텐츠 전투 능력치
  characterId: "knight",
  critChance: 0,
  lifeSteal: 0,
  burnChance: 0,
  goldBonusMultiplier: 1,
  flatGoldBonus: 0,
  eventGoldMultiplier: 1,
  xpMultiplier: 1,
  executeBonus: 0,
  doubleStrikeChance: 0,
  lowHpDamageBonus: 0,
  bossDamageMultiplier: 1,
  damageReduction: 0,
  healOnKill: 0,
  thornDamage: 0,
  reviveAvailable: false,
  burnTimer: 0,
  slowTimer: 0
};

// ========================================
// 능력 선택 시스템
// ========================================

let abilitySelecting = false;

const abilityOverlay = document.getElementById("abilityOverlay");

const abilityChoices = document.getElementById("abilityChoices");
const eventOverlay = document.getElementById("eventOverlay");
const eventChoices = document.getElementById("eventChoices");

// ========================================
// 상점 시스템
// ========================================

let shopSelecting = false;

// 이번 상점에서 상품별 구매 횟수 기록
let shopPurchaseCount = 0;
let shopProductPurchaseCounts = {};

const shopOverlay = document.getElementById("shopOverlay");

const shopItems = document.getElementById("shopItems");

const shopGold = document.getElementById("shopGold");

const shopPurchaseCountText = null; // 상점 전체 구매 횟수 표시 제거

const shopMessage = document.getElementById("shopMessage");

const nextFloorButton = document.getElementById("nextFloorButton");
const shopRerollButton = document.getElementById("shopRerollButton");
const shopRelicButton = document.getElementById("shopRelicButton");
let shopRerollCount = 0;

// ========================================
// 유물 및 스탯 성장
// ========================================

// 보스 처치 후 아직 보유하지 않은 유물 중 3개를 제시합니다.
const baseRelics = [
  { id: "feather", name: "질풍의 깃털", icon: "🪶", image: "images/relics/gust_feather.png", rarity: "일반", tags: ["speed", "wind"], description: "공격 속도 +12%", apply() { player.attackSpeedMultiplier *= 1.12; } },
  { id: "heart", name: "생명의 심장", icon: "❤️", image: "images/relics/life_heart.png", rarity: "일반", tags: ["life", "defense"], description: "최대 체력 +35", apply() { player.maxHp += 35; player.hp = Math.min(player.maxHp, player.hp + 35); } },
  { id: "rune", name: "파멸의 룬", icon: "🔮", image: "images/relics/ruin_rune.png", rarity: "희귀", tags: ["arcane", "damage"], description: "최종 대미지 +8%", apply() { player.finalDamageMultiplier *= 1.08; } },
  { id: "triple", name: "삼중의 맹격", icon: "⚔️", image: "images/relics/triple_strike.png", rarity: "희귀", tags: ["physical", "speed"], description: "3번째 타격 대미지 +35%", apply() { player.thirdHitBonus += 0.35; } },
  { id: "wind", name: "바람의 발걸음", icon: "👟", image: "images/relics/windstep_boots.png", rarity: "일반", tags: ["speed", "wind"], description: "이동 속도 +0.15", apply() { player.speed += 0.15; } },
  { id: "eye", name: "확장의 눈", icon: "👁️", image: "images/relics/expansion_eye.png", rarity: "일반", tags: ["range", "physical"], description: "공격 범위 +15%", apply() { player.attackRange *= 1.15; } },
  { id: "hourglass", name: "성장의 모래시계", icon: "⌛", image: "images/relics/growth_hourglass.png", rarity: "희귀", tags: ["growth", "gold"], description: "층마다 대미지 +1, 최대 체력 +4", apply() { player.hourglass = true; }, onFloor() { player.damage += 1; player.maxHp += 4; } },
  { id: "guardian", name: "철벽의 수호자", icon: "🛡️", image: "images/relics/iron_guardian.png", rarity: "일반", tags: ["defense", "life"], description: "방어력 +7", apply() { player.defense += 7; } },
];

const relics = [...baseRelics, ...EXTRA_RELICS];
let ownedRelics = [];

// 모든 유물을 획득한 뒤에는 일반 스탯 선택이 표시됩니다.
const abilities = [
  { name: "대미지 증가", icon: "⚔️", description: "공격 대미지 +10", apply() { player.damage += 10; } },
  { name: "체력 증가", icon: "❤️", description: "최대 체력 +20, 현재 체력 +20", apply() { player.maxHp += 20; player.hp = Math.min(player.maxHp, player.hp + 20); } },
  { name: "방어력 증가", icon: "🛡️", description: "방어력 +2", apply() { player.defense += 2; } },
];

// 추후 장비 등에서 활용할 수 있도록 이동 속도/공격 범위 능력 정의는 유지합니다.
const reservedAbilities = [
  { name: "이동속도 증가", icon: "👟", description: "이동속도 +0.5", apply() { player.speed += 0.5; } },
  { name: "공격 범위 증가", icon: "🗡️", description: "공격 범위 +15", apply() { player.attackRange += 15; } },
];

// ========================================
// 상점 상품 목록
// ========================================

const shopProducts = [
  {
    id: "heal", name: "응급 회복약", icon: "🧪",
    description: "최대 체력의 35%를 회복합니다.", basePrice: 55, limit: Infinity,
    buy() {
      if (player.hp >= player.maxHp) { shopMessage.textContent = "현재 체력이 이미 가득 차 있습니다."; return false; }
      player.hp = Math.min(player.maxHp, player.hp + Math.ceil(player.maxHp * 0.35));
      return true;
    }
  },
  {
    id: "emberOil", name: "화염 기름", icon: "🔥",
    description: "공격이 25% 확률로 적에게 화상을 부여합니다.", basePrice: 105, limit: 1,
    buy() { player.burnChance += 0.25; return true; }
  },
  {
    id: "assassinMark", name: "암살자의 인장", icon: "✦",
    description: "치명타 확률 +12%", basePrice: 125, limit: 1,
    buy() { player.critChance = Math.min(0.75, player.critChance + 0.12); return true; }
  },
  {
    id: "shadowCloak", name: "그림자 망토", icon: "🌑",
    description: "받는 피해 10% 감소, 이동 속도 +0.15", basePrice: 145, limit: 1,
    buy() { player.damageReduction = Math.min(0.65, player.damageReduction + 0.10); player.speed += 0.15; return true; }
  },
  {
    id: "echoSigil", name: "메아리 문장", icon: "🔱",
    description: "공격 시 18% 확률로 55% 추가 피해를 줍니다.", basePrice: 165, limit: 1,
    buy() { player.doubleStrikeChance += 0.18; return true; }
  },
  {
    id: "frostCore", name: "빙결의 핵", icon: "❄️",
    description: "보스에게 주는 피해 +18%, 방어력 +1", basePrice: 185, limit: 1,
    buy() { player.bossDamageMultiplier *= 1.18; player.defense += 1; return true; }
  },
  {
    id: "bloodPact", name: "피의 맹약", icon: "🩸",
    description: "최대 체력 -12, 최종 대미지 +22%", basePrice: 195, limit: 1,
    buy() {
      if (player.maxHp <= 12 || player.hp <= 1) { shopMessage.textContent = "최대 체력이 부족합니다."; return false; }
      player.maxHp -= 12; player.hp = Math.min(player.hp, player.maxHp); player.finalDamageMultiplier *= 1.22; return true;
    }
  },
  {
    id: "greedSeal", name: "탐욕의 인장", icon: "🪙",
    description: "이후 몬스터 처치 골드 +30%, 공격력 +4", basePrice: 175, limit: 1,
    buy() { player.goldBonusMultiplier *= 1.30; player.damage += 4; return true; }
  }
];

function getShopPrice(product) {
  const depthMultiplier = 1 + Math.max(0, floor - 1) * 0.035;
  return Math.round(product.basePrice * depthMultiplier / 5) * 5;
}

let currentShopProducts = [];

// ========================================
// 메인 메뉴 / 일시정지
// ========================================

const mainMenuOverlay = document.getElementById("mainMenuOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");

function startGame() {
  closeMetaMenu();
  closeCodexMenu();
  mainMenuOverlay.style.display = "none";
  pauseOverlay.style.display = "none";
  const idle = document.getElementById("pauseIdle");
  if (idle) idle.style.display = "block";
  restartGame();
}

function returnToMainMenu() {
  gameRunning = false;
  gamePaused = false;
  abilitySelecting = false;
  shopSelecting = false;
  eventSelecting = false;
  abilityOverlay.style.display = "none";
  shopOverlay.style.display = "none";
  eventOverlay.style.display = "none";
  closeMetaMenu();
  closeCodexMenu();
  document.getElementById("gameOver").style.display = "none";
  pauseOverlay.style.display = "none";
  const idle = document.getElementById("pauseIdle");
  if (idle) idle.style.display = "block";
  mainMenuOverlay.style.display = "flex";
  renderCharacterSelection();
}

function resumeGame() {
  gamePaused = false;
  gameRunning = true;
  pauseOverlay.style.display = "none";
  const idle = document.getElementById("pauseIdle");
  if (idle) idle.style.display = "block";
}

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  e.preventDefault();

  // 이벤트/성장 선택/상점에서는 선택을 취소하지 않고, 일반 플레이만 일시정지합니다.
  if (mainMenuOverlay.style.display !== "none" ||
      document.getElementById("gameOver").style.display === "flex" ||
      abilitySelecting || shopSelecting || eventSelecting) return;

  if (gamePaused) {
    resumeGame();
  } else if (gameRunning) {
    openPauseMenu();
  }
});

// ========================================
// 키 입력
// ========================================

const keys = {};

// 이동 키
document.addEventListener("keydown", function (e) {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", function (e) {
  keys[e.key.toLowerCase()] = false;
});

// ========================================
// 방향키 공격
// ========================================

document.addEventListener("keydown", function (e) {
  if (!gameRunning) {
    return;
  }

  let direction = null;

  if (e.key === "ArrowUp") {
    direction = "up";
  } else if (e.key === "ArrowDown") {
    direction = "down";
  } else if (e.key === "ArrowLeft") {
    direction = "left";
  } else if (e.key === "ArrowRight") {
    direction = "right";
  }

  if (direction !== null) {
    e.preventDefault();

    attack(direction);
  }
});

// ========================================
// 아이템 생성
// ========================================

function createItems() {
  items = [];

  const itemCount = Math.floor(random(1, 4));

  for (let i = 0; i < itemCount; i++) {
    items.push({
      x: random(50, 750),

      y: random(50, 450),

      type: "gold", // 층 시작 시 맵에 회복 구슬은 배치하지 않음
    });
  }
}

// ========================================
// 아이템 업데이트
// ========================================

function updateItems() {
  if (abilitySelecting || shopSelecting || eventSelecting) {
    return;
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    const distance = Math.hypot(
      player.x - item.x,

      player.y - item.y
    );

    if (distance < 25) {
      // 골드

      if (item.type === "gold") {
        gold += Math.max(1, Math.ceil(5 * player.goldBonusMultiplier));
        playSound("gold");
      }

      // 회복
      else {
        playSound("heal");
        player.hp = Math.min(
          player.maxHp,

          player.hp + Math.ceil(player.maxHp * 0.10)
        );
      }

      items.splice(i, 1);
    }
  }
}

// ========================================
// 다음 층
// ========================================

function nextFloor() {
  // 능력 선택 / 상점 중이면 중복 실행 방지

  if (abilitySelecting || shopSelecting || eventSelecting) {
    return;
  }

  floor++;
  floorEventHandled = false;
  eventEncounterCompleted = false;
  enemyProjectiles = [];
  floorHazards = [];
  biomeHazardCooldown = getCurrentBiome().id === "crypt" ? 900 : 360;

  // 성장의 모래시계: 새 층에 진입할 때마다 성장
  if (ownedRelics.some((relic) => relic.id === "hourglass")) {
    const hourglass = relics.find((relic) => relic.id === "hourglass");
    hourglass.onFloor();
  }

  // 층 이동 시 체력은 회복하지 않음

  // 플레이어 위치 초기화
  // 보스 층에서는 아래쪽 중앙, 일반 층에서는 기존 중앙 위치
  player.x = 400;

  player.y = floor % 5 === 0 ? 400 : 250;

  // 공격 상태 초기화

  player.attacking = false;

  player.attackTimer = 0;

  player.hitEnemies = [];

  // 새로운 층의 적과 아이템 생성

  createEnemies();

  createItems();
}

// ========================================
// 경험치 및 레벨업
// ========================================

function gainExperience(amount) {
  experience += Math.max(1, Math.round(amount * (player.xpMultiplier || 1)));

  // 경험치가 충분하면 연속으로 레벨업 가능
  while (experience >= experienceToNextLevel) {
    experience -= experienceToNextLevel;
    level++;
    playSound("levelUp");

    // 레벨업 시 최대 체력과 공격력만 증가
    player.maxHp += 10;
    player.hp = Math.min(player.maxHp, player.hp + 10);
    player.damage += 5;

    // 다음 레벨에 필요한 경험치 증가
    experienceToNextLevel = 30 + level * 20;
  }
}

// ========================================
// 게임 업데이트
// ========================================

function update() {
  if (!gameRunning) {
    return;
  }

  updatePlayer();

  if (!abilitySelecting && !shopSelecting && !eventSelecting && !floorCountdownActive) updatePlayerStatuses();

  updateEnemies();

  updateBiomeHazards();

  updateHitEffects();

  updateItems();

  updateFloorCountdown();

  // 층을 클리어했을 때 해당 층의 이벤트를 한 번만 실행
  if (!floorEventHandled && !abilitySelecting && !shopSelecting &&
      !eventSelecting && !floorCountdownActive && enemies.length === 0) {
    floorEventHandled = true;

    // 층 구성: 3·8·13층은 상점, 4·9·14층은 단일 이벤트, 5·10·15층은 보스
    if (floor % 5 === 3) {
      startFloorCountdown(true);
    } else if (floor % 5 === 0) {
      startFloorCountdown(false);
    } else if (eventEncounterCompleted) {
      eventEncounterCompleted = false;
      startFloorCountdown(false);
    } else if (isScheduledEventFloor(floor)) {
      startFloorCountdown(false, true);
    } else {
      startFloorCountdown(false);
    }
  }

  // 플레이어 사망

  if (player.hp <= 0) {
    gameOver();
  }

  updateUI();
}

// ========================================
// 지역 환경 위험 요소
// ========================================

function updateBiomeHazards() {
  if (abilitySelecting || shopSelecting || eventSelecting || floorCountdownActive) return;
  const biome = getCurrentBiome();
  if (biome.id === "crypt") return;

  if (biomeHazardCooldown > 0) biomeHazardCooldown--;
  if (biomeHazardCooldown <= 0) {
    const hazardType = biome.id === "ember" ? "fire" : biome.id === "frost" ? "frost" : "poison";
    floorHazards.push({
      type: hazardType,
      x: random(90, canvas.width - 90),
      y: random(90, canvas.height - 90),
      radius: 58,
      warning: 90,
      active: 210,
      tick: 0
    });
    biomeHazardCooldown = 660;
  }

  floorHazards.forEach((hazard) => {
    if (hazard.warning > 0) {
      hazard.warning--;
      return;
    }
    if (hazard.active > 0) hazard.active--;
    if (hazard.active <= 0) return;

    const distance = Math.hypot(player.x - hazard.x, player.y - hazard.y);
    if (distance <= hazard.radius + player.size / 2) {
      if (hazard.type === "frost") {
        player.slowTimer = Math.max(player.slowTimer, 3);
      } else if (hazard.tick <= 0) {
        damagePlayer(hazard.type === "fire" ? 5 : 3, null, hazard.type);
        hazard.tick = 55;
      }
    }
    if (hazard.tick > 0) hazard.tick--;
  });
  floorHazards = floorHazards.filter((hazard) => hazard.warning > 0 || hazard.active > 0);
}

// ========================================
// 플레이어 상태 효과
// ========================================

function updatePlayerStatuses() {
  if (player.burnTimer > 0) {
    player.burnTimer--;
    if (player.burnTimer % 45 === 0) {
      player.hp -= 1;
      if (player.hp <= 0 && player.reviveAvailable) {
        player.reviveAvailable = false;
        player.hp = Math.max(1, Math.ceil(player.maxHp * 0.35));
        player.invincible = 120;
        document.getElementById("message").textContent = "불사조의 깃털이 발동했습니다!";
      }
    }
  }
  if (player.slowTimer > 0) player.slowTimer--;
}

// ========================================
// 유물 시너지
// ========================================

function activateRelicSynergies() {
  RELIC_SYNERGIES.forEach((synergy) => {
    if (activatedSynergies.has(synergy.id)) return;
    const firstTag = synergy.tags[0];
    const secondTag = synergy.tags[1];
    const hasSeparatePair = ownedRelics.some((first, index) =>
      ownedRelics.slice(index + 1).some((second) =>
        (first.tags || []).includes(firstTag) && (second.tags || []).includes(secondTag) ||
        (first.tags || []).includes(secondTag) && (second.tags || []).includes(firstTag)
      )
    );
    if (hasSeparatePair) {
      synergy.apply();
      activatedSynergies.add(synergy.id);
      activeSynergies.push(synergy);
      markSynergyDiscovered();
      const message = document.getElementById("message");
      if (message) message.textContent = `✦ 유물 시너지 발동: ${synergy.name} — ${synergy.description}`;
    }
  });
}

function grantRandomRelic() {
  const unowned = relics.filter((relic) => !ownedRelics.some((owned) => owned.id === relic.id));
  if (unowned.length === 0) {
    player.damage += 8;
    player.maxHp += 10;
    player.hp = Math.min(player.maxHp, player.hp + 10);
    return "중복 유물 대신 공격력 +8, 최대 체력 +10";
  }
  const relic = unowned[Math.floor(Math.random() * unowned.length)];
  relic.apply();
  ownedRelics.push(relic);
  markRelicDiscovered(relic.id);
  activateRelicSynergies();
  updateRelicInventory();
  return `${relic.name} 획득`;
}

// ========================================
// 이벤트 방
// ========================================

function isScheduledEventFloor(targetFloor) {
  return targetFloor >= 4 && targetFloor % 5 === 4;
}

function weightedEventChoices(count = 1) {
  const pool = [...DUNGEON_EVENTS];
  const selected = [];
  while (pool.length && selected.length < count) {
    const totalWeight = pool.reduce((sum, event) => sum + event.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosenIndex = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll <= 0) { chosenIndex = i; break; }
    }
    selected.push(pool.splice(chosenIndex, 1)[0]);
  }
  return selected;
}

function showEventRoom() {
  eventSelecting = true;
  gameRunning = true;
  eventOverlay.style.display = "flex";
  eventChoices.innerHTML = "";
  const event = weightedEventChoices(1)[0];
  activeDungeonEvent = event;
  eventOverlay.querySelector("h2").textContent = `${event.icon} ${event.name}`;
  eventOverlay.querySelector("p").textContent = `${event.description}  ${event.detail}`;

  const accept = document.createElement("button");
  accept.type = "button";
  accept.className = "event-card event-action-card event-action-primary";
  accept.innerHTML = `<strong>${getEventActionLabel(event.id)}</strong><span>${getEventActionDescription(event.id)}</span>`;
  accept.addEventListener("click", () => resolveDungeonEvent(event.id, "accept"));
  eventChoices.appendChild(accept);

  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "event-card event-action-card event-action-secondary";
  skip.innerHTML = `<strong>지나가기</strong><span>이번 이벤트를 이용하지 않고 다음 층으로 이동합니다.</span>`;
  skip.addEventListener("click", () => resolveDungeonEvent(event.id, "skip"));
  eventChoices.appendChild(skip);
}

function getEventActionLabel(eventId) {
  const labels = {
    rest: "안식하기", treasure: "상자 열기", trial: "도전 수락", shrine: "제단에 헌신하기",
    merchant: "상인의 제안 수락", fountain: "샘물 마시기", cursed: "관의 봉인 풀기", gamble: "운명의 제비 뽑기"
  };
  return labels[eventId] || "이벤트 진행";
}

function getEventActionDescription(eventId) {
  const descriptions = {
    rest: "잃은 체력 일부를 회복합니다.", treasure: "무작위 보물 하나를 획득합니다. 저주가 있을 수도 있습니다.",
    trial: "정예 수문장과 싸웁니다. 승리하면 큰 보상을 얻습니다.", shrine: "체력을 대가로 공격 능력을 강화합니다.",
    merchant: "골드를 지불하고 무작위 특수 능력을 구매합니다.", fountain: "체력을 회복하고 무작위 축복을 얻습니다.",
    cursed: "저주받은 관을 열어 높은 보상을 노립니다.", gamble: "골드 50을 걸고 더 큰 보상에 도전합니다."
  };
  return descriptions[eventId] || "이벤트의 보상을 획득합니다.";
}

function resolveDungeonEvent(eventId, action = "accept") {
  const event = DUNGEON_EVENTS.find((item) => item.id === eventId);
  if (!event || !eventSelecting) return;
  markEventDiscovered(eventId);
  eventSelecting = false;
  activeDungeonEvent = null;
  if (action === "skip") {
    eventOverlay.style.display = "none";
    const message = document.getElementById("message");
    if (message) message.textContent = `${event.name}을(를) 지나쳤습니다.`;
    floorEventHandled = true;
    startFloorCountdown(false);
    return;
  }
  eventOverlay.style.display = "none";
  const message = document.getElementById("message");
  let result = "";

  switch (eventId) {
    case "rest": {
      const heal = Math.min(player.maxHp - player.hp, Math.max(0, Math.ceil((player.maxHp - player.hp) * 0.45)));
      player.hp = Math.min(player.maxHp, player.hp + heal);
      result = heal > 0 ? `안식의 성소에서 체력 ${heal} 회복` : "안식의 성소에서 충분한 휴식을 취했습니다. 체력이 가득 차 있습니다.";
      playSound("heal");
      break;
    }
    case "treasure": {
      const roll = Math.random();
      if (roll < 0.58) {
        const reward = Math.round((28 + Math.random() * 37) * player.eventGoldMultiplier * player.goldBonusMultiplier);
        gold += reward;
        result = `보물상자에서 ${reward} Gold 획득`;
        playSound("gold");
      } else if (roll < 0.84) {
        player.maxHp += 12;
        player.hp = Math.min(player.maxHp, player.hp + 20);
        player.damage += 4;
        result = "숨겨진 영약과 무기를 발견했습니다. 최대 체력 +12, 공격력 +4";
        playSound("heal");
      } else {
        player.maxHp = Math.max(1, player.maxHp - 8);
        player.hp = Math.min(player.hp, player.maxHp);
        player.damage += 13;
        result = "저주받은 보물입니다. 최대 체력 -8, 공격력 +13";
      }
      break;
    }
    case "trial": {
      pendingTrialReward = true;
      floorEventHandled = true;
      enemies = [createEventElite()];
      enemyProjectiles = [];
      result = "정예 수문장이 나타났습니다. 처치하면 특별 보상을 획득합니다!";
      break;
    }
    case "shrine": {
      const cost = Math.ceil(player.maxHp * 0.12);
      if (player.hp > cost + 1) {
        player.hp -= cost;
        player.damage += 10;
        player.finalDamageMultiplier *= 1.05;
        result = `제단에 생명력 ${cost}을 바쳤습니다. 공격력 +10, 최종 대미지 +5%`;
      } else {
        player.damage += 4;
        result = "제단이 부족한 생명력을 감안해 작은 축복을 내렸습니다. 공격력 +4";
      }
      break;
    }
    case "merchant": {
      const fee = Math.round((45 + floor * 3) / 5) * 5;
      if (gold >= fee) {
        gold -= fee;
        const offers = [
          () => { player.burnChance += 0.16; result = `떠돌이 상인에게서 화염 기름을 구매했습니다. 화상 확률 +16% (골드 ${fee})`; },
          () => { player.critChance = Math.min(0.75, player.critChance + 0.08); result = `떠돌이 상인에게서 날카로운 부적을 구매했습니다. 치명타 확률 +8% (골드 ${fee})`; },
          () => { player.doubleStrikeChance += 0.10; result = `떠돌이 상인에게서 메아리 문장을 구매했습니다. 추가 타격 확률 +10% (골드 ${fee})`; }
        ];
        offers[Math.floor(Math.random() * offers.length)]();
      } else {
        player.hp = Math.min(player.maxHp, player.hp + 10);
        result = "골드가 부족해 상인이 작은 응급 붕대를 건넸습니다. 체력 +10";
      }
      break;
    }
    case "fountain": {
      const heal = Math.ceil(player.maxHp * 0.22);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      if (Math.random() < 0.5) { player.defense += 1; result = `고대의 샘에서 체력 ${heal} 회복, 방어력 +1`; }
      else { player.speed += 0.08; result = `고대의 샘에서 체력 ${heal} 회복, 이동 속도 +0.08`; }
      playSound("heal");
      break;
    }
    case "cursed": {
      if (Math.random() < 0.55) {
        result = `저주받은 관의 보상: ${grantRandomRelic()}`;
      } else {
        player.hp = Math.max(1, player.hp - Math.ceil(player.maxHp * 0.18));
        player.damage += 12;
        result = "관의 저주를 받았습니다. 체력을 잃었지만 공격력 +12를 얻었습니다.";
      }
      break;
    }
    case "gamble": {
      if (gold < 50) {
        result = "골드가 50 이상 필요합니다. 빈손으로 돌아왔습니다.";
      } else {
        gold -= 50;
        if (Math.random() < 0.5) {
          const reward = Math.round(105 * player.eventGoldMultiplier * player.goldBonusMultiplier);
          gold += reward;
          result = `운명의 제비가 승리를 가져왔습니다. ${reward} Gold 획득`;
          playSound("gold");
        } else {
          const lost = Math.ceil(player.maxHp * 0.12);
          player.hp = Math.max(1, player.hp - lost);
          result = `운명의 제비가 빗나갔습니다. 체력 ${lost} 손실`;
        }
      }
      break;
    }
  }

  if (message) message.textContent = result;
  updateRelicInventory();
  updateUI();

  if (eventId === "trial") return;
  floorEventHandled = true;
  startFloorCountdown(false);
}

function registerEnemyDefeat(enemy) {
  playSound("enemyDeath");
  const baseGold = enemy.isBoss ? 28 : enemy.isEventElite ? 18 : enemy.isElite ? 9 : 4;
  const earnedGold = Math.max(1, Math.round(baseGold * player.goldBonusMultiplier + player.flatGoldBonus));
  gold += earnedGold;
  kills++;
  if (enemy.isBoss) bossKillsThisRun++;
  gainExperience(enemy.isBoss ? 50 : enemy.isEventElite ? 28 : 10);

  if (Math.random() < (enemy.isBoss ? 0.85 : enemy.isElite ? 0.42 : 0.28)) {
    items.push({ x: enemy.x, y: enemy.y, type: Math.random() < 0.95 ? "gold" : "heal" });
  }
  onEnemyKilled(enemy);
}

function onEnemyKilled(enemy) {
  if (player.healOnKill > 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.healOnKill);
  }
  if (enemy.isEventElite && pendingTrialReward) {
    pendingTrialReward = false;
    const reward = Math.round(70 * player.goldBonusMultiplier);
    gold += reward;
    const heal = Math.ceil(player.maxHp * 0.20);
    player.hp = Math.min(player.maxHp, player.hp + heal);
    eventEncounterCompleted = true;
    floorEventHandled = false;
    const message = document.getElementById("message");
    if (message) message.textContent = `도전 성공! ${reward} Gold와 체력 ${heal} 회복을 획득했습니다.`;
  }
}

// ========================================
// UI 업데이트
// ========================================

function updateUI() {
  const currentHp = Math.max(0, Math.ceil(player.hp));
  const hpBarFill = document.getElementById("hpBarFill");
  const hpBarText = document.getElementById("hpBarText");
  if (hpBarFill) hpBarFill.style.width = `${Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100))}%`;
  if (hpBarText) hpBarText.textContent = `${currentHp} / ${player.maxHp}`;

  const statValues = {
    statMaxHp: player.maxHp,
    statDamage: Math.round(player.damage),
    statAttackSpeed: `${Math.round(player.attackSpeedMultiplier * 100)}%`,
    statSpeed: player.speed.toFixed(2),
    statRange: Math.round(player.attackRange),
    statDefense: player.defense,
    statCritChance: `${Math.round(player.critChance * 100)}%`,
    statFinalDamage: `${Math.round(player.finalDamageMultiplier * 100)}%`
  };
  Object.entries(statValues).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  document.getElementById("floor").textContent = `지하 ${floor}층`;
  const mapFloor = document.getElementById("mapFloor");
  if (mapFloor) mapFloor.textContent = `${String(floor).padStart(2, "0")}F`;
  const portrait = document.getElementById("heroPortrait");
  if (portrait) portrait.src = `images/characters/${player.characterId || "knight"}.png`;
  const heroName = document.getElementById("heroName");
  if (heroName && typeof CHARACTERS !== "undefined") {
    const selected = CHARACTERS.find((character) => character.id === player.characterId);
    if (selected) heroName.textContent = selected.name;
  }
  const heartDisplay = document.getElementById("heartDisplay");
  if (heartDisplay) {
    const heartCount = Math.max(4, Math.min(8, Math.ceil(player.maxHp / 25)));
    const filledHearts = Math.max(0, Math.ceil((player.hp / player.maxHp) * heartCount));
    const heartMarkup = Array.from({ length: heartCount }, (_, index) => `<span class="${index < filledHearts ? "heart-on" : "heart-off"}">♥</span>`).join("");
    if (heartDisplay.dataset.markup !== heartMarkup) { heartDisplay.innerHTML = heartMarkup; heartDisplay.dataset.markup = heartMarkup; }
  }
  const relicCount = document.getElementById("relicCount");
  if (relicCount) relicCount.textContent = `${ownedRelics.length} / ${relics.length}`;
  const biomeElement = document.getElementById("biomeName");
  if (biomeElement) biomeElement.textContent = getCurrentBiome().name;

  document.getElementById("gold").textContent = `🪙 ${gold}`;

  document.getElementById("kills").textContent = `☠ ${kills}`;
  const levelElement = document.getElementById("level");
  if (levelElement) {
    levelElement.textContent = `Lv. ${level}`;
  }

  // 경험치 바: 현재 레벨에서 다음 레벨까지의 경험치 비율 표시
  const xpBarFill = document.getElementById("xpBarFill");
  const xpBarText = document.getElementById("xpBarText");
  const xpRatio = Math.max(0, Math.min(100, (experience / experienceToNextLevel) * 100));
  if (xpBarFill) xpBarFill.style.width = `${xpRatio}%`;
  if (xpBarText) xpBarText.textContent = `${experience} / ${experienceToNextLevel} XP`;

  // 상점 UI

  if (shopGold) {
    shopGold.textContent = `💰 Gold: ${gold}`;
  }

}

// ========================================
// 게임 오버
// ========================================

function gameOver() {
  if (runRecorded) return;
  runRecorded = true;
  gameRunning = false;

  abilitySelecting = false;

  shopSelecting = false;
  eventSelecting = false;

  abilityOverlay.style.display = "none";

  shopOverlay.style.display = "none";
  eventOverlay.style.display = "none";

  lastRunShardReward = recordRunProgress({ floor, kills, bossKills: bossKillsThisRun });

  document.getElementById(
    "result"
  ).textContent = `Floor ${floor} · ${kills}명 처치 · 보스 ${bossKillsThisRun}마리 · ${gold} Gold · 영혼 파편 +${lastRunShardReward}`;

  document.getElementById("gameOver").style.display = "flex";
  playSound("gameOver");
}

// ========================================
// 재시작
// ========================================

function restartGame() {
  floor = 1;

  gold = 0;

  kills = 0;

  level = 1;
  experience = 0;
  experienceToNextLevel = 30;
  floorEventHandled = false;
  eventSelecting = false;
  countdownToEvent = false;
  eventEncounterCompleted = false;
  pendingTrialReward = false;
  bossKillsThisRun = 0;
  runRecorded = false;
  activeSynergies = [];
  activatedSynergies = new Set();
  enemyProjectiles = [];
  floorHazards = [];
  biomeHazardCooldown = 540;

  // ====================================
  // 선택 캐릭터 및 영구 강화 반영
  // ====================================

  const chosenCharacter = CHARACTERS.find((character) => character.id === selectedCharacterId) || CHARACTERS[0];
  const metaBonus = getMetaStartingBonuses();
  player.characterId = chosenCharacter.id;
  player.hp = chosenCharacter.stats.hp + metaBonus.hp;
  player.maxHp = chosenCharacter.stats.hp + metaBonus.hp;
  player.damage = chosenCharacter.stats.damage + metaBonus.damage;
  player.speed = chosenCharacter.stats.speed;
  player.defense = chosenCharacter.stats.defense + metaBonus.defense;

  player.attackRange = 90;
  player.attackSpeedMultiplier = chosenCharacter.stats.attackSpeed;
  player.finalDamageMultiplier = chosenCharacter.stats.finalDamage;
  player.defense = chosenCharacter.stats.defense + metaBonus.defense;
  player.thirdHitBonus = 0;
  player.attackCount = 0;
  player.critChance = chosenCharacter.stats.critChance || 0;
  player.lifeSteal = 0;
  player.burnChance = 0;
  player.goldBonusMultiplier = 1;
  player.flatGoldBonus = 0;
  player.eventGoldMultiplier = 1;
  player.xpMultiplier = 1;
  player.executeBonus = 0;
  player.doubleStrikeChance = 0;
  player.lowHpDamageBonus = 0;
  player.bossDamageMultiplier = 1;
  player.damageReduction = 0;
  player.healOnKill = 0;
  player.thornDamage = 0;
  player.reviveAvailable = false;
  player.burnTimer = 0;
  player.slowTimer = 0;
  player.hourglass = false;
  gold = metaBonus.gold;
  ownedRelics = [];
  updateRelicInventory();

  // 위치

  player.x = 400;

  player.y = 250;

  // 공격

  player.direction = "down";

  player.attacking = false;

  player.attackTimer = 0;

  player.attackCooldown = 0;

  player.hitEnemies = [];
  player.attackTimerMax = 12;
  player.attackSwingCount = 1;
  player.attackSwingDuration = 12;
  player.attackSwingIndex = -1;
  player.moving = false;
  player.facing = "down";

  // 무적

  player.invincible = 0;

  // 능력 선택 상태

  abilitySelecting = false;

  abilityOverlay.style.display = "none";
  eventOverlay.style.display = "none";

  // 상점 상태

  shopSelecting = false;

  // 카운트다운 초기화
  floorCountdownActive = false;
  countdownToShop = false;
  floorCountdownTime = FLOOR_COUNTDOWN_DURATION;

  floorCountdown.style.display = "none";

  shopPurchaseCount = 0;
  shopRerollCount = 0;

  shopOverlay.style.display = "none";
  eventOverlay.style.display = "none";

  // 상점 메시지

  if (shopMessage) {
    shopMessage.textContent = "최대 3개까지 구매할 수 있습니다.";
  }

  // 게임 상태

  gamePaused = false;
  gameRunning = true;
  pauseOverlay.style.display = "none";
  mainMenuOverlay.style.display = "none";

  // 게임 오버 화면 제거

  document.getElementById("gameOver").style.display = "none";

  // 적 / 아이템 생성

  createEnemies();

  createItems();

  updateUI();
}

// ========================================
// 랜덤 선택 카드 생성
// ========================================

function shuffleList(list) {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function showAbilitySelection() {
  abilitySelecting = true;
  abilityOverlay.style.display = "flex";
  abilityChoices.innerHTML = "";

  // 유물을 모두 모으기 전에는 미보유 유물 중 3개 선택
  const unowned = relics.filter((relic) => !ownedRelics.some((owned) => owned.id === relic.id));
  const choosingRelics = unowned.length > 0;
  const choices = shuffleList(choosingRelics ? unowned : abilities).slice(0, 3);

  const title = abilityOverlay.querySelector("h2");
  const subtitle = abilityOverlay.querySelector("p");
  title.textContent = choosingRelics ? "✨ 유물을 선택하세요" : "⬆ 스탯을 선택하세요";
  subtitle.textContent = choosingRelics
    ? "보스 보상: 유물을 하나를 선택하세요."
    : "모든 유물을 모았습니다. 스탯 하나를 강화하세요.";

  choices.forEach((choice) => {
    const card = document.createElement("div");
    card.className = "ability-card";

    const imageMarkup = choice.image
      ? `<img class="relic-card-image" src="${choice.image}" alt="${choice.name}">`
      : `<div class="ability-icon">${choice.icon}</div>`;

    card.innerHTML = `${imageMarkup}
      <div class="relic-rarity rarity-${(choice.rarity || "일반").toLowerCase()}">${choice.rarity || "일반"}</div>
      <div class="ability-name">${choice.name}</div>
      <div class="ability-description">${choice.description}</div>`;

    card.addEventListener("click", function () {
      choice.apply();

      if (choosingRelics) {
        ownedRelics.push(choice);
        markRelicDiscovered(choice.id);
        activateRelicSynergies();
        updateRelicInventory();
      }

      abilityOverlay.style.display = "none";
      abilitySelecting = false;
      nextFloor();
    });

    abilityChoices.appendChild(card);
  });
}

// ========================================
// 유물 인벤토리 표시
// ========================================

function updateRelicInventory() {
  const inventory = document.getElementById("relicInventory");
  if (!inventory) return;

  inventory.innerHTML = "";
  if (ownedRelics.length === 0) {
    inventory.innerHTML = '<div class="relic-empty">보유한 유물이 없습니다.</div>';
    return;
  }

  ownedRelics.forEach((relic) => {
    const item = document.createElement("div");
    item.className = "relic-inventory-item";
    item.title = `${relic.name}: ${relic.description}`;
    item.innerHTML = `${relic.image ? `<img src="${relic.image}" alt="${relic.name}">` : `<span class="relic-inventory-icon">${relic.icon}</span>`}<span>${relic.name}</span>`;
    inventory.appendChild(item);
  });

  activeSynergies.forEach((synergy) => {
    const item = document.createElement("div");
    item.className = "relic-synergy-item";
    item.textContent = `✦ ${synergy.name}`;
    item.title = synergy.description;
    inventory.appendChild(item);
  });
}

// ========================================
// 다음 층 카운트다운 시작
// ========================================

function startFloorCountdown(toShop = false, toEvent = false) {
  floorCountdownActive = true;
  countdownToShop = toShop;
  countdownToEvent = toEvent;
  floorCountdownTime = FLOOR_COUNTDOWN_DURATION;

  floorCountdown.style.display = "block";

  countdownText.textContent = toEvent ? "5초 뒤 특별 이벤트 방이 열립니다" : toShop ? "5초 뒤 상점이 열립니다" : "5초 뒤 다음 층으로 넘어갑니다";
  countdownNumber.textContent = "5";
  countdownProgress.style.width = "100%";
}

// ========================================
// 다음 층 카운트다운 업데이트
// ========================================

function updateFloorCountdown() {
  if (!floorCountdownActive) {
    return;
  }

  floorCountdownTime -= 1000 / 60;

  // 남은 시간을 초 단위로 표시
  const secondsLeft = Math.max(0, Math.ceil(floorCountdownTime / 1000));

  countdownNumber.textContent = secondsLeft;

  // 남은 시간에 맞춰 막대바 줄이기
  const progress = Math.max(0, floorCountdownTime / FLOOR_COUNTDOWN_DURATION);

  countdownProgress.style.width = `${progress * 100}%`;

  // 카운트다운 종료: 보스 층이면 보상 선택, 일반 층이면 다음 층
  if (floorCountdownTime <= 0) {
    floorCountdownActive = false;
    floorCountdown.style.display = "none";

    if (countdownToEvent) {
      countdownToEvent = false;
      showEventRoom();
    } else if (countdownToShop) {
      countdownToShop = false;
      showShop();
    } else if (floor % 5 === 0) {
      showAbilitySelection();
    } else {
      nextFloor();
    }
  }
}

// ========================================
// 상점 표시
// ========================================

function showShop() {
  shopSelecting = true;

  shopPurchaseCount = 0;
  shopProductPurchaseCounts = {};
  shopRerollCount = 0;

  shopOverlay.style.display = "flex";
  playSound("shop");

  shopMessage.textContent = "";

  const randomProducts = shuffleList(shopProducts.filter((product) => product.id !== "heal")).slice(0, 3);
  currentShopProducts = [shopProducts.find((product) => product.id === "heal"), ...randomProducts];
  createShopItems();

  updateShopUI();
}

// ========================================
// 상점 상품 생성
// ========================================

function createShopItems() {
  shopItems.innerHTML = "";

  currentShopProducts.forEach((product, index) => {
    const card = document.createElement("div");

    card.className = "shop-item";

    card.innerHTML = `

                <div class="shop-item-icon">
                    ${product.icon}
                </div>

                <div class="shop-item-name">
                    ${product.name}
                </div>

                <div class="shop-item-description">
                    ${product.description}
                </div>

                <div class="shop-item-price">
                    💰 ${getShopPrice(product)} Gold
                </div>

            `;

    card.addEventListener("click", function () {
      buyShopItem(index, card);
    });

    shopItems.appendChild(card);
  });
}

// ========================================
// 상점 상품 구매
// ========================================

function buyShopItem(index, card) {
  const product = currentShopProducts[index];
  const purchased = shopProductPurchaseCounts[product.id] || 0;

  // 상품별 구매 제한 확인 (회복은 무제한)
  if (purchased >= product.limit) {
    shopMessage.textContent = `${product.name} 구매 제한을 모두 사용했습니다.`;
    return;
  }

  // 골드 부족

  const price = getShopPrice(product);
  if (gold < price) {
    shopMessage.textContent = "Gold가 부족합니다.";

    return;
  }

  // 체력이 가득 찬 상태에서
  // 체력 회복을 누른 경우

  const success = product.buy();

  if (!success) {
    return;
  }

  // 구매 효과음과 골드 차감
  playSound("purchase");
  gold -= price;

  // 전체 구매 횟수와 해당 상품 구매 횟수 증가
  shopPurchaseCount++;
  shopProductPurchaseCounts[product.id] = purchased + 1;

  shopMessage.textContent = `${product.name} 구매 완료!`;
  updateShopUI();
}

// ========================================
// 상점 UI 업데이트
// ========================================

function updateShopUI() {
  shopGold.textContent = `💰 Gold: ${gold}`;
  const rerollCost = 45 + floor * 5 + shopRerollCount * 35;
  const relicCost = 160 + floor * 12;
  if (shopRerollButton) {
    shopRerollButton.textContent = `재고 새로고침 · ${rerollCost}G`;
    shopRerollButton.disabled = gold < rerollCost;
  }
  if (shopRelicButton) {
    shopRelicButton.textContent = `무작위 유물 감정 · ${relicCost}G`;
    shopRelicButton.disabled = gold < relicCost || ownedRelics.length >= relics.length;
  }


  const cards = shopItems.querySelectorAll(".shop-item");

  cards.forEach((card, index) => {
    const product = currentShopProducts[index];

    const purchased = shopProductPurchaseCounts[product.id] || 0;
    const limitReached = purchased >= product.limit;
    const fullHealth = product.id === "heal" && player.hp >= player.maxHp;

    // 골드 부족, 상품별 구매 제한, 체력 가득 참이면 비활성화
    if (limitReached || fullHealth || gold < getShopPrice(product) || shopPurchaseCount >= 3) {
      card.classList.add("disabled");
    } else {
      card.classList.remove("disabled");
    }

    // 체력 회복 상품에는 구매 횟수/무제한 문구를 표시하지 않음
    let countLabel = card.querySelector(".shop-item-count");
    if (product.id === "heal") {
      if (countLabel) countLabel.remove();
    } else {
      const remainingLabel = `구매: ${purchased}/${product.limit}회`;
      if (!countLabel) {
        countLabel = document.createElement("div");
        countLabel.className = "shop-item-count";
        card.appendChild(countLabel);
      }
      countLabel.textContent = remainingLabel;
    }
  });
}

// 상점 서비스: 골드가 쌓이기만 하지 않도록 재고와 유물에 소비처를 추가합니다.
function rerollShopStock() {
  const cost = 45 + floor * 5 + shopRerollCount * 35;
  if (gold < cost) { shopMessage.textContent = `새로고침에는 골드 ${cost}이 필요합니다.`; return; }
  gold -= cost;
  shopRerollCount++;
  const randomProducts = shuffleList(shopProducts.filter((product) => product.id !== "heal" && (shopProductPurchaseCounts[product.id] || 0) < product.limit)).slice(0, 3);
  currentShopProducts = [shopProducts.find((product) => product.id === "heal"), ...randomProducts];
  createShopItems();
  shopMessage.textContent = `재고를 새로고침했습니다. 골드 ${cost} 사용`;
  updateShopUI();
}

function buyShopRelic() {
  const cost = 160 + floor * 12;
  if (gold < cost) { shopMessage.textContent = `유물 감정에는 골드 ${cost}이 필요합니다.`; return; }
  const unowned = relics.filter((relic) => !ownedRelics.some((owned) => owned.id === relic.id));
  if (!unowned.length) { shopMessage.textContent = "이미 모든 유물을 보유하고 있습니다."; return; }
  gold -= cost;
  const relic = unowned[Math.floor(Math.random() * unowned.length)];
  relic.apply();
  ownedRelics.push(relic);
  markRelicDiscovered(relic.id);
  activateRelicSynergies();
  updateRelicInventory();
  shopMessage.textContent = `유물 감정 완료: ${relic.name} 획득 (골드 ${cost})`;
  updateUI();
  updateShopUI();
}

if (shopRerollButton) shopRerollButton.addEventListener("click", rerollShopStock);
if (shopRelicButton) shopRelicButton.addEventListener("click", buyShopRelic);

// ========================================
// 상점 → 다음 층
// ========================================

nextFloorButton.addEventListener("click", function () {
  // 상점 닫기

  shopOverlay.style.display = "none";

  shopOverlay.classList.remove("shop-complete");

  shopSelecting = false;

  // 다음 층 시작

  nextFloor();
});

// ========================================
// 게임 루프
// ========================================

function gameLoop() {
  update();

  draw();

  requestAnimationFrame(gameLoop);
}

// ========================================
// 게임 시작
// ========================================

createEnemies();

createItems();

updateRelicInventory();
updateUI();

gameLoop();
