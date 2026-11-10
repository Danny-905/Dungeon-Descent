// ========================================
// 영구 성장 / 캐릭터 해금 데이터
// ========================================

const META_STORAGE_KEY = "dungeonDescentMetaV1";
const BASE_RELIC_CATALOG = [
  { id: "feather", name: "질풍의 깃털", icon: "🪶", rarity: "일반" },
  { id: "heart", name: "생명의 심장", icon: "❤️", rarity: "일반" },
  { id: "rune", name: "파멸의 룬", icon: "🔮", rarity: "희귀" },
  { id: "triple", name: "삼중의 맹격", icon: "⚔️", rarity: "희귀" },
  { id: "wind", name: "바람의 발걸음", icon: "👟", rarity: "일반" },
  { id: "eye", name: "확장의 눈", icon: "👁️", rarity: "일반" },
  { id: "hourglass", name: "성장의 모래시계", icon: "⌛", rarity: "희귀" },
  { id: "guardian", name: "철벽의 수호자", icon: "🛡️", rarity: "일반" }
];
const DEFAULT_META_PROGRESS = {
  soulShards: 0,
  totalKills: 0,
  totalBosses: 0,
  runs: 0,
  highestFloor: 1,
  unlockedCharacters: ["knight"],
  discoveredRelics: [],
  discoveredEnemies: [],
  discoveredBosses: [],
  discoveredEvents: [],
  unlockedAchievements: [],
  totalSynergies: 0,
  upgrades: { vitality: 0, might: 0, fortune: 0, ward: 0 }
};

function loadMetaProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return structuredClone(DEFAULT_META_PROGRESS);
    return {
      ...structuredClone(DEFAULT_META_PROGRESS),
      ...saved,
      unlockedCharacters: Array.isArray(saved.unlockedCharacters) ? saved.unlockedCharacters : ["knight"],
      discoveredRelics: Array.isArray(saved.discoveredRelics) ? saved.discoveredRelics : [],
      discoveredEnemies: Array.isArray(saved.discoveredEnemies) ? saved.discoveredEnemies : [],
      discoveredBosses: Array.isArray(saved.discoveredBosses) ? saved.discoveredBosses : [],
      discoveredEvents: Array.isArray(saved.discoveredEvents) ? saved.discoveredEvents : [],
      unlockedAchievements: Array.isArray(saved.unlockedAchievements) ? saved.unlockedAchievements : [],
      totalSynergies: Number(saved.totalSynergies) || 0,
      upgrades: { ...DEFAULT_META_PROGRESS.upgrades, ...(saved.upgrades || {}) }
    };
  } catch (error) {
    console.warn("영구 성장 데이터를 불러오지 못했습니다.", error);
    return structuredClone(DEFAULT_META_PROGRESS);
  }
}

let metaProgress = loadMetaProgress();
let selectedCharacterId = "knight";

const META_UPGRADES = [
  { id: "vitality", name: "생명력 각인", icon: "❤️", description: "탐험 시작 시 최대 체력 +5", maxLevel: 5, cost: (level) => 12 + level * 10 },
  { id: "might", name: "전투의 각인", icon: "⚔️", description: "탐험 시작 시 공격력 +1", maxLevel: 5, cost: (level) => 15 + level * 12 },
  { id: "fortune", name: "황금의 각인", icon: "💰", description: "탐험 시작 골드 +10", maxLevel: 5, cost: (level) => 10 + level * 10 },
  { id: "ward", name: "수호의 각인", icon: "🛡️", description: "탐험 시작 방어력 +1", maxLevel: 5, cost: (level) => 14 + level * 11 }
];

function saveMetaProgress() {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaProgress));
  } catch (error) {
    console.warn("영구 성장 데이터를 저장하지 못했습니다.", error);
  }
}

function refreshCharacterUnlocks() {
  let unlockedAny = false;
  CHARACTERS.forEach((character) => {
    const alreadyUnlocked = metaProgress.unlockedCharacters.includes(character.id);
    if (!alreadyUnlocked && character.unlockRule && character.unlockRule(metaProgress)) {
      metaProgress.unlockedCharacters.push(character.id);
      unlockedAny = true;
    }
  });
  if (unlockedAny) saveMetaProgress();
  return unlockedAny;
}

function renderCharacterSelection() {
  const container = document.getElementById("characterSelection");
  const info = document.getElementById("selectedCharacterInfo");
  if (!container || !info) return;

  refreshCharacterUnlocks();
  container.innerHTML = "";

  CHARACTERS.forEach((character) => {
    const unlocked = metaProgress.unlockedCharacters.includes(character.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "character-card";
    if (character.id === selectedCharacterId) card.classList.add("selected");
    if (!unlocked) card.classList.add("locked");
    card.disabled = !unlocked;
    card.innerHTML = `
      <span class="character-portrait">${unlocked ? `<img src="images/characters/${character.id}.png" alt="${character.name}">` : "🔒"}</span>
      <span class="character-name">${unlocked ? character.name : "미해금 캐릭터"}</span>
      <span class="character-unlock">${unlocked ? character.title : character.unlock}</span>
    `;
    if (unlocked) {
      card.addEventListener("click", () => {
        selectedCharacterId = character.id;
        renderCharacterSelection();
      });
    }
    container.appendChild(card);
  });

  const selected = CHARACTERS.find((character) => character.id === selectedCharacterId) || CHARACTERS[0];
  info.textContent = `${selected.name} · ${selected.passive} — ${selected.description}`;
  const record = document.getElementById("mainMenuRecord");
  if (record) {
    record.textContent = `최고 기록: ${metaProgress.highestFloor}층 · 누적 처치: ${metaProgress.totalKills} · 보스 처치: ${metaProgress.totalBosses} · 영혼 파편: ${metaProgress.soulShards}`;
  }
}

function openMetaMenu() {
  renderMetaMenu();
  const overlay = document.getElementById("metaOverlay");
  if (overlay) overlay.style.display = "flex";
}

function closeMetaMenu() {
  const overlay = document.getElementById("metaOverlay");
  if (overlay) overlay.style.display = "none";
}

function renderMetaMenu() {
  const summary = document.getElementById("metaSummary");
  const upgrades = document.getElementById("metaUpgrades");
  const unlocks = document.getElementById("metaUnlocks");
  if (!summary || !upgrades || !unlocks) return;

  summary.innerHTML = `
    <div><strong>${metaProgress.soulShards}</strong><span>영혼 파편</span></div>
    <div><strong>${metaProgress.runs}</strong><span>탐험 횟수</span></div>
    <div><strong>${metaProgress.highestFloor}</strong><span>최고 도달 층</span></div>
  `;

  upgrades.innerHTML = "<h3>영구 강화</h3>";
  META_UPGRADES.forEach((upgrade) => {
    const level = Math.min(upgrade.maxLevel, Number(metaProgress.upgrades[upgrade.id]) || 0);
    const cost = upgrade.cost(level);
    const maxed = level >= upgrade.maxLevel;
    const card = document.createElement("div");
    card.className = "meta-upgrade-card";
    card.innerHTML = `
      <div class="meta-upgrade-icon">${upgrade.icon}</div>
      <div class="meta-upgrade-copy"><strong>${upgrade.name} · Lv.${level}/${upgrade.maxLevel}</strong><span>${upgrade.description}</span></div>
      <button type="button" ${maxed || metaProgress.soulShards < cost ? "disabled" : ""}>${maxed ? "최대 강화" : `강화 · ${cost} 파편`}</button>
    `;
    const button = card.querySelector("button");
    button.addEventListener("click", () => purchaseMetaUpgrade(upgrade.id));
    upgrades.appendChild(card);
  });

  unlocks.innerHTML = `<h3>캐릭터 해금 (${metaProgress.unlockedCharacters.length}/${CHARACTERS.length})</h3>`;
  CHARACTERS.forEach((character) => {
    const unlocked = metaProgress.unlockedCharacters.includes(character.id);
    const row = document.createElement("div");
    row.className = "meta-unlock-row";
    row.innerHTML = `<span>${unlocked ? character.icon : "🔒"} ${character.name}</span><span>${unlocked ? "해금 완료" : character.unlock}</span>`;
    unlocks.appendChild(row);
  });
}

const META_ACHIEVEMENTS = [
  { id: "first_run", name: "첫 발자국", description: "첫 번째 탐험을 마칩니다.", reward: 5, check: (m) => m.runs >= 1 },
  { id: "slayer", name: "망자의 사냥꾼", description: "누적 몬스터 100마리를 처치합니다.", reward: 8, check: (m) => m.totalKills >= 100 },
  { id: "boss_hunter", name: "거대 사냥꾼", description: "보스를 누적 5회 처치합니다.", reward: 12, check: (m) => m.totalBosses >= 5 },
  { id: "deep_explorer", name: "심층 탐험가", description: "20층에 도달합니다.", reward: 12, check: (m) => m.highestFloor >= 20 },
  { id: "relic_collector", name: "유물 수집가", description: "서로 다른 유물 12종을 발견합니다.", reward: 10, check: (m) => m.discoveredRelics.length >= 12 },
  { id: "synergy_master", name: "공명의 연구가", description: "유물 시너지 3종을 발동합니다.", reward: 10, check: (m) => m.totalSynergies >= 3 },
  { id: "unyielding", name: "불굴의 의지", description: "탐험을 10회 마칩니다.", reward: 15, check: (m) => m.runs >= 10 }
];

function addDiscovery(listName, id) {
  const list = metaProgress[listName];
  if (!Array.isArray(list) || !id || list.includes(id)) return false;
  list.push(id);
  saveMetaProgress();
  return true;
}

function markRelicDiscovered(id) { addDiscovery("discoveredRelics", id); }
function markEnemyDiscovered(id) { addDiscovery("discoveredEnemies", id); }
function markBossDiscovered(id) { addDiscovery("discoveredBosses", id); }
function markEventDiscovered(id) { addDiscovery("discoveredEvents", id); }

function markSynergyDiscovered() {
  metaProgress.totalSynergies += 1;
  saveMetaProgress();
  checkMetaAchievements();
}

function checkMetaAchievements() {
  let reward = 0;
  META_ACHIEVEMENTS.forEach((achievement) => {
    if (!metaProgress.unlockedAchievements.includes(achievement.id) && achievement.check(metaProgress)) {
      metaProgress.unlockedAchievements.push(achievement.id);
      reward += achievement.reward;
    }
  });
  if (reward > 0) metaProgress.soulShards += reward;
  saveMetaProgress();
  return reward;
}

function openCodexMenu() {
  renderCodexMenu();
  const overlay = document.getElementById("codexOverlay");
  if (overlay) overlay.style.display = "flex";
}

function closeCodexMenu() {
  const overlay = document.getElementById("codexOverlay");
  if (overlay) overlay.style.display = "none";
}

function renderCodexMenu() {
  const container = document.getElementById("codexContent");
  if (!container) return;
  const sections = [];
  const relicCards = relicCatalogForCodex();
  sections.push(`<section class="codex-section"><h3>유물 (${metaProgress.discoveredRelics.length}/${relicCards.length})</h3><div class="codex-grid">${relicCards.map((item) => {
    const found = metaProgress.discoveredRelics.includes(item.id);
    return `<div class="codex-entry ${found ? "found" : "unknown"}"><span>${found ? item.icon : "?"}</span><strong>${found ? item.name : "미발견 유물"}</strong><small>${found ? item.rarity : "아직 발견하지 못했습니다"}</small></div>`;
  }).join("")}</div></section>`);
  sections.push(`<section class="codex-section"><h3>몬스터 (${metaProgress.discoveredEnemies.length}/${Object.keys(ENEMY_ARCHETYPES).length})</h3><div class="codex-grid">${Object.values(ENEMY_ARCHETYPES).map((item) => {
    const found = metaProgress.discoveredEnemies.includes(item.id);
    return `<div class="codex-entry ${found ? "found" : "unknown"}"><span>${found ? item.icon : "?"}</span><strong>${found ? item.name : "미확인 개체"}</strong><small>${found ? "발견 완료" : "미발견"}</small></div>`;
  }).join("")}</div></section>`);
  sections.push(`<section class="codex-section"><h3>보스 (${metaProgress.discoveredBosses.length}/${Object.keys(BOSS_ARCHETYPES).length})</h3><div class="codex-grid">${Object.values(BOSS_ARCHETYPES).map((item) => {
    const found = metaProgress.discoveredBosses.includes(item.id);
    return `<div class="codex-entry ${found ? "found" : "unknown"}"><span>${found ? item.icon : "?"}</span><strong>${found ? item.name : "봉인된 보스"}</strong><small>${found ? "발견 완료" : "미발견"}</small></div>`;
  }).join("")}</div></section>`);
  sections.push(`<section class="codex-section"><h3>이벤트 (${metaProgress.discoveredEvents.length}/${DUNGEON_EVENTS.length})</h3><div class="codex-grid">${DUNGEON_EVENTS.map((item) => {
    const found = metaProgress.discoveredEvents.includes(item.id);
    return `<div class="codex-entry ${found ? "found" : "unknown"}"><span>${found ? item.icon : "?"}</span><strong>${found ? item.name : "미확인 사건"}</strong><small>${found ? item.detail : "미발견"}</small></div>`;
  }).join("")}</div></section>`);
  sections.push(`<section class="codex-section achievement-section"><h3>업적 (${metaProgress.unlockedAchievements.length}/${META_ACHIEVEMENTS.length})</h3><div class="achievement-list">${META_ACHIEVEMENTS.map((item) => {
    const found = metaProgress.unlockedAchievements.includes(item.id);
    return `<div class="achievement-entry ${found ? "unlocked" : ""}"><span>${found ? "🏆" : "🔒"}</span><div><strong>${item.name}</strong><small>${item.description}</small></div><em>${found ? "달성" : `보상 ${item.reward} 파편`}</em></div>`;
  }).join("")}</div></section>`);
  container.innerHTML = sections.join("");
}

function relicCatalogForCodex() {
  return [...BASE_RELIC_CATALOG, ...EXTRA_RELICS];
}

function purchaseMetaUpgrade(id) {
  const upgrade = META_UPGRADES.find((item) => item.id === id);
  if (!upgrade) return;
  const level = Number(metaProgress.upgrades[id]) || 0;
  if (level >= upgrade.maxLevel) return;
  const cost = upgrade.cost(level);
  if (metaProgress.soulShards < cost) return;

  metaProgress.soulShards -= cost;
  metaProgress.upgrades[id] = level + 1;
  saveMetaProgress();
  renderMetaMenu();
  renderCharacterSelection();
}

function recordRunProgress(runData) {
  if (!runData) return 0;
  const runKills = Math.max(0, Number(runData.kills) || 0);
  const runBosses = Math.max(0, Number(runData.bossKills) || 0);
  const runFloor = Math.max(1, Number(runData.floor) || 1);
  const reward = Math.max(2, Math.floor(runFloor * 1.5) + Math.floor(runKills / 8) + runBosses * 4);

  metaProgress.soulShards += reward;
  metaProgress.totalKills += runKills;
  metaProgress.totalBosses += runBosses;
  metaProgress.runs += 1;
  metaProgress.highestFloor = Math.max(metaProgress.highestFloor, runFloor);
  refreshCharacterUnlocks();
  const achievementReward = checkMetaAchievements();
  saveMetaProgress();
  renderCharacterSelection();
  return reward + achievementReward;
}

function getMetaStartingBonuses() {
  return {
    hp: (Number(metaProgress.upgrades.vitality) || 0) * 5,
    damage: Number(metaProgress.upgrades.might) || 0,
    gold: (Number(metaProgress.upgrades.fortune) || 0) * 10,
    defense: Number(metaProgress.upgrades.ward) || 0
  };
}

refreshCharacterUnlocks();
renderCharacterSelection();
