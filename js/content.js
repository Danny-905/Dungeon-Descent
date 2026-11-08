// ========================================
// Dungeon Descent 확장 콘텐츠 데이터
// 기존 전투/렌더링 코드를 대체하지 않고 데이터만 추가합니다.
// ========================================

const CHARACTERS = [
  {
    id: "knight", name: "기사단장 아렌", title: "무너진 성벽의 수호자", icon: "🛡️",
    description: "균형 잡힌 정면 검기로 안정적인 근접 전투를 펼칩니다.",
    passive: "수호자의 맹세 · 받는 피해 -1", unlock: "기본 해금",
    unlockedByDefault: true, stats: { hp: 120, damage: 25, speed: 2.9, defense: 2, attackSpeed: 1, finalDamage: 1, critChance: 0.03 }
  },
  {
    id: "rogue", name: "그림자 도적 시안", title: "어둠 속의 추격자", icon: "🗡️",
    description: "빠른 쌍검을 교차해 짧은 범위의 적을 연속으로 베어냅니다.",
    passive: "그림자 발놀림 · 공격 속도 +18%, 이동 속도 +0.35", unlock: "누적 몬스터 30마리 처치",
    unlockedByDefault: false, unlockRule: (m) => m.totalKills >= 30,
    stats: { hp: 90, damage: 23, speed: 3.35, defense: 0, attackSpeed: 1.18, finalDamage: 1.02, critChance: 0.12 }
  },
  {
    id: "mage", name: "별빛 술사 엘리안", title: "봉인된 별의 계승자", icon: "🔮",
    description: "직선으로 관통하는 마력탄으로 멀리 있는 적을 공격합니다.",
    passive: "별의 파동 · 최종 대미지 +12%", unlock: "보스 2회 처치",
    unlockedByDefault: false, unlockRule: (m) => m.totalBosses >= 2,
    stats: { hp: 85, damage: 29, speed: 2.75, defense: 0, attackSpeed: 0.96, finalDamage: 1.12, critChance: 0.06 }
  },
  {
    id: "berserker", name: "혈맹 광전사 카르", title: "상처로 타오르는 전사", icon: "🩸",
    description: "느리지만 넓은 범위를 휩쓰는 강력한 도끼 강타를 사용합니다.",
    passive: "피의 갈망 · 체력 40% 이하에서 대미지 +30%", unlock: "한 번의 탐험에서 15층 도달",
    unlockedByDefault: false, unlockRule: (m) => m.highestFloor >= 15,
    stats: { hp: 105, damage: 32, speed: 2.85, defense: 1, attackSpeed: 0.95, finalDamage: 1.04, critChance: 0.04 }
  }
];

const BIOMES = [
  { id: "crypt", name: "망자의 묘역", range: "1~10층", floorStart: 1, color: "#151520", grid: "#252538", accent: "#9b8ac7", description: "오래된 망자와 봉인된 수호자들이 잠든 지하 묘역." },
  { id: "ember", name: "잿불 심연", range: "11~20층", floorStart: 11, color: "#211613", grid: "#3a241f", accent: "#ef8354", description: "꺼지지 않는 불꽃과 잿더미가 길을 삼키는 화산 지대." },
  { id: "frost", name: "서리 왕관", range: "21~30층", floorStart: 21, color: "#111d2a", grid: "#263b50", accent: "#8bd5f5", description: "시간마저 얼어붙은 고대 왕국의 얼음 회랑." },
  { id: "plague", name: "부패한 심연", range: "31층 이상", floorStart: 31, color: "#151d17", grid: "#2a3a2c", accent: "#9dd17d", description: "독안개와 뒤틀린 생명체가 번식하는 심연." }
];

function getCurrentBiome() {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (floor >= BIOMES[i].floorStart) return BIOMES[i];
  }
  return BIOMES[0];
}

const ENEMY_ARCHETYPES = {
  ghoul: { id: "ghoul", name: "망령", icon: "☠", color: "#d95b66", hp: 1, speed: 0.78, damage: 1, size: 24, weight: 38 },
  brute: { id: "brute", name: "묘지 파수꾼", icon: "♜", color: "#a65b45", hp: 1.9, speed: 0.48, damage: 1.45, size: 34, weight: 18 },
  runner: { id: "runner", name: "핏빛 추적자", icon: "◆", color: "#ec8a43", hp: 0.68, speed: 1.48, damage: 0.82, size: 19, weight: 19 },
  cultist: { id: "cultist", name: "균열 술사", icon: "✦", color: "#a78bfa", hp: 0.95, speed: 0.58, damage: 0.9, size: 23, weight: 14, ranged: true },
  shaman: { id: "shaman", name: "역병 주술사", icon: "☘", color: "#79b66a", hp: 1.15, speed: 0.58, damage: 0.9, size: 25, weight: 11, healer: true }
};

const BOSS_ARCHETYPES = {
  crypt: { id: "crypt", name: "묘역의 집행관 모르가스", icon: "♜", color: "#a855f7", element: "shadow", hp: 1, damage: 1 },
  ember: { id: "ember", name: "잿불 군주 이그나르", icon: "♨", color: "#f97316", element: "fire", hp: 1.15, damage: 1.1 },
  frost: { id: "frost", name: "빙관의 여왕 셀레네", icon: "❄", color: "#60a5fa", element: "frost", hp: 1.2, damage: 1.05 },
  plague: { id: "plague", name: "심연의 포식자 바르그", icon: "☣", color: "#84cc16", element: "poison", hp: 1.35, damage: 1.15 }
};

// 기존 8종 유물과 별도로 추가되는 신규 유물 20종
const EXTRA_RELICS = [
  { id: "ember_core", image: "images/relics/ember_core.png", name: "잿불의 심장", icon: "🔥", rarity: "희귀", tags: ["fire", "arcane"], description: "화상 부여 확률 +20%", apply() { player.burnChance += 0.20; } },
  { id: "storm_coin", image: "images/relics/storm_coin.png", name: "폭풍의 동전", icon: "⚡", rarity: "희귀", tags: ["lightning", "crit"], description: "치명타 확률 +8%", apply() { player.critChance += 0.08; } },
  { id: "vampire_fang", image: "images/relics/vampire_fang.png", name: "흡혈귀의 송곳니", icon: "🦇", rarity: "희귀", tags: ["life", "curse"], description: "가한 피해의 3%를 체력으로 회복", apply() { player.lifeSteal += 0.03; } },
  { id: "iron_skin", image: "images/relics/iron_skin.png", name: "검은 강철의 피부", icon: "⛓️", rarity: "일반", tags: ["defense"], description: "방어력 +4", apply() { player.defense += 4; } },
  { id: "greed_eye", image: "images/relics/greed_eye.png", name: "탐욕의 눈동자", icon: "🪙", rarity: "희귀", tags: ["gold", "growth"], description: "획득 골드 +25%", apply() { player.goldBonusMultiplier *= 1.25; } },
  { id: "executioner", image: "images/relics/executioner.png", name: "처형자의 인장", icon: "🪓", rarity: "희귀", tags: ["physical", "crit"], description: "체력이 30% 이하인 적에게 피해 +25%", apply() { player.executeBonus += 0.25; } },
  { id: "echo_blade", image: "images/relics/echo_blade.png", name: "메아리 칼날", icon: "🌙", rarity: "전설", tags: ["physical", "speed"], description: "공격 시 12% 확률로 추가 타격", apply() { player.doubleStrikeChance += 0.12; } },
  { id: "blood_pact", image: "images/relics/blood_pact.png", name: "핏빛 맹세", icon: "🩸", rarity: "전설", tags: ["life", "curse"], description: "체력 40% 이하에서 최종 대미지 +25% (최대 체력 -10)", apply() { player.maxHp = Math.max(1, player.maxHp - 10); player.hp = Math.min(player.hp, player.maxHp); player.lowHpDamageBonus += 0.25; } },
  { id: "collector", image: "images/relics/collector.png", name: "수집가의 주머니", icon: "💰", rarity: "일반", tags: ["gold", "growth"], description: "몬스터 처치 골드 +5", apply() { player.flatGoldBonus += 5; } },
  { id: "arcane_ring", image: "images/relics/arcane_ring.png", name: "공허의 반지", icon: "🌀", rarity: "희귀", tags: ["arcane", "range"], description: "공격 범위 +18%, 최종 대미지 +5%", apply() { player.attackRange *= 1.18; player.finalDamageMultiplier *= 1.05; } },
  { id: "thorn_armor", image: "images/relics/thorn_armor.png", name: "가시 갑옷", icon: "🌵", rarity: "희귀", tags: ["defense", "life"], description: "접촉 피해를 받을 때 주변 적에게 반격 피해 8", apply() { player.thornDamage += 8; } },
  { id: "lucky_dice", image: "images/relics/lucky_dice.png", name: "운명의 주사위", icon: "🎲", rarity: "전설", tags: ["gold", "arcane"], description: "치명타 확률 +5%, 이벤트 보상 골드 +20%", apply() { player.critChance += 0.05; player.eventGoldMultiplier *= 1.2; } },
  { id: "deep_delver", image: "images/relics/deep_delver.png", name: "심층 탐험가의 나침반", icon: "🧭", rarity: "일반", tags: ["growth", "range"], description: "획득 경험치 +25%", apply() { player.xpMultiplier *= 1.25; } },
  { id: "guardian_shell", image: "images/relics/guardian_shell.png", name: "수호자의 외피", icon: "🐚", rarity: "희귀", tags: ["defense", "life"], description: "받는 피해 10% 감소", apply() { player.damageReduction += 0.10; } },
  { id: "frozen_edge", image: "images/relics/frozen_edge.png", name: "빙결의 칼날", icon: "❄️", rarity: "희귀", tags: ["frost", "physical"], description: "보스에게 주는 피해 +15%", apply() { player.bossDamageMultiplier *= 1.15; } },
  { id: "healer_seed", image: "images/relics/healer_seed.png", name: "생명의 씨앗", icon: "🌱", rarity: "일반", tags: ["life", "growth"], description: "몬스터 처치 시 체력 2 회복", apply() { player.healOnKill += 2; } },
  { id: "phoenix_feather", image: "images/relics/phoenix_feather.png", name: "불사조의 깃털", icon: "🪶", rarity: "전설", tags: ["fire", "life"], description: "탐험 중 한 번, 치명적인 피해를 버티고 체력 35%로 부활", apply() { player.reviveAvailable = true; } },
  { id: "void_battery", image: "images/relics/void_battery.png", name: "균열 축전기", icon: "🔋", rarity: "희귀", tags: ["lightning", "arcane"], description: "공격 속도 +10%, 공격 대미지 +4", apply() { player.attackSpeedMultiplier *= 1.10; player.damage += 4; } },
  { id: "war_banner", image: "images/relics/war_banner.png", name: "몰락한 군단의 깃발", icon: "🚩", rarity: "희귀", tags: ["physical", "growth"], description: "공격 대미지 +8, 이동 속도 -0.1", apply() { player.damage += 8; player.speed = Math.max(1.5, player.speed - 0.1); } },
  { id: "midas_mark", image: "images/relics/midas_mark.png", name: "황금 손길", icon: "✨", rarity: "전설", tags: ["gold", "arcane"], description: "골드 획득 +40%, 최종 대미지 +5%", apply() { player.goldBonusMultiplier *= 1.4; player.finalDamageMultiplier *= 1.05; } }
];

const RELIC_SYNERGIES = [
  { id: "storm_dance", name: "폭풍의 춤", tags: ["speed", "lightning"], description: "공격 속도 +12%", apply() { player.attackSpeedMultiplier *= 1.12; } },
  { id: "blood_feast", name: "피의 연회", tags: ["life", "curse"], description: "흡혈 +2%", apply() { player.lifeSteal += 0.02; } },
  { id: "inferno", name: "영겁의 화로", tags: ["fire", "arcane"], description: "화상 확률 +15%, 대미지 +5", apply() { player.burnChance += 0.15; player.damage += 5; } },
  { id: "iron_wall", name: "철벽 진형", tags: ["defense", "life"], description: "방어력 +4", apply() { player.defense += 4; } },
  { id: "assassin", name: "그림자의 교본", tags: ["crit", "speed"], description: "치명타 확률 +7%", apply() { player.critChance += 0.07; } },
  { id: "golden_path", name: "황금의 길", tags: ["gold", "growth"], description: "골드 획득 +20%", apply() { player.goldBonusMultiplier *= 1.2; } },
  { id: "frozen_fury", name: "빙염의 격돌", tags: ["frost", "physical"], description: "보스 대미지 +10%", apply() { player.bossDamageMultiplier *= 1.10; } },
  { id: "deep_magic", name: "심연의 공명", tags: ["arcane", "range"], description: "최종 대미지 +8%", apply() { player.finalDamageMultiplier *= 1.08; } }
];

const DUNGEON_EVENTS = [
  { id: "rest", name: "안식의 성소", icon: "🕯️", description: "희미한 불빛이 상처를 어루만집니다.", detail: "잃은 체력의 45% 회복", weight: 18 },
  { id: "treasure", name: "수상한 보물상자", icon: "🎁", description: "잠금장치가 풀린 상자 하나가 놓여 있습니다.", detail: "골드 또는 무작위 보상", weight: 20 },
  { id: "trial", name: "피의 투기장", icon: "⚔️", description: "강력한 정예 몬스터가 도전을 기다립니다.", detail: "승리 시 대량의 골드와 회복", weight: 14 },
  { id: "shrine", name: "잊힌 제단", icon: "🔮", description: "제단은 대가를 요구하며 힘을 약속합니다.", detail: "체력을 대가로 무작위 강화", weight: 14 },
  { id: "merchant", name: "떠돌이 상인", icon: "🧳", description: "상인은 단 하나의 특별한 물건을 내놓습니다.", detail: "골드로 능력치 강화", weight: 12 },
  { id: "fountain", name: "고대의 샘", icon: "💧", description: "맑은 물이 오래된 마력을 머금고 있습니다.", detail: "체력 회복 또는 방어력 강화", weight: 10 },
  { id: "cursed", name: "저주받은 관", icon: "⚰️", description: "관 안쪽에서 금속이 부딪히는 소리가 들립니다.", detail: "위험을 감수하고 높은 보상 획득", weight: 8 },
  { id: "gamble", name: "운명의 제비", icon: "🎲", description: "행운에 모든 것을 맡길 시간입니다.", detail: "성공하면 큰 보상, 실패하면 피해", weight: 8 }
];
