// ========================================
// 효과음 재생 및 볼륨 설정
// ========================================
const gameSounds = {
  click: new Audio("sounds/01_ui_click.wav"),
  attack: new Audio("sounds/02_player_attack.wav"),
  hit: new Audio("sounds/03_enemy_hit.wav"),
  enemyDeath: new Audio("sounds/04_enemy_death.wav"),
  gold: new Audio("sounds/05_gold_pickup.wav"),
  heal: new Audio("sounds/06_heal.wav"),
  levelUp: new Audio("sounds/07_level_up.wav"),
  bossWarning: new Audio("sounds/08_boss_warning.wav"),
  bossImpact: new Audio("sounds/09_boss_melee_impact.wav"),
  shop: new Audio("sounds/10_shop_open.wav"),
  purchase: new Audio("sounds/11_purchase.wav"),
  gameOver: new Audio("sounds/12_game_over.wav"),
  playerHurt: new Audio("sounds/13_player_hurt.wav")
};

// 저장된 볼륨이 없으면 기본 50%로 시작 (Number(null)은 0이므로 별도 확인)
const savedSoundVolume = localStorage.getItem("descentSoundVolume");
let soundVolume = savedSoundVolume === null ? 0.5 : Number(savedSoundVolume);
if (!Number.isFinite(soundVolume)) soundVolume = 0.5;

// 브라우저의 사용자 조작 전 오디오 차단을 해제하기 위한 준비
let soundUnlocked = false;
function unlockGameAudio() {
  if (soundUnlocked) return;
  soundUnlocked = true;
  Object.values(gameSounds).forEach(function (sound) {
    sound.volume = 0;
    const attempt = sound.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(function () {
        sound.pause();
        sound.currentTime = 0;
      }).catch(function () {});
    } else {
      sound.pause();
      sound.currentTime = 0;
    }
  });
}

document.addEventListener("pointerdown", unlockGameAudio, { once: true });
document.addEventListener("keydown", unlockGameAudio, { once: true });

// 효과음을 처음부터 재생하고 현재 설정 볼륨 적용
function playSound(name) {
  const sound = gameSounds[name];
  if (!sound || soundVolume <= 0) return;
  const copy = sound.cloneNode();
  copy.volume = soundVolume;
  copy.currentTime = 0;
  copy.play().catch(function () {});
}

// 볼륨 슬라이더 변경
function setSoundVolume(value) {
  soundVolume = Number(value) / 100;
  localStorage.setItem("descentSoundVolume", soundVolume);
  document.getElementById("soundVolumeValue").textContent = value + "%";
}

// 버튼 클릭 효과음 (슬라이더 자체는 제외)
document.addEventListener("click", function (event) {
  if (event.target.closest("button") && !event.target.closest("#soundControl")) {
    playSound("click");
  }
});
