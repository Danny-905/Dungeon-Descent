// ========================================
// 타격 효과 변수
// ========================================

// 피해 숫자와 파티클을 저장
let hitEffects = [];

// 화면 흔들림 시간
let screenShake = 0;


// ========================================
// 적 피격 효과 생성
// ========================================

function createHitEffect(enemy, damage) {
  // 적의 체력바 애니메이션을 위한 초기값
  if (enemy.displayHp === undefined) {
    enemy.displayHp = enemy.hp + damage;
  }

  // 적 피격 깜빡임
  enemy.hitFlash = 8;

  // 적 피격 흔들림
  enemy.hitShake = 6;

  // 화면 흔들림
  screenShake = 5;

  // 피해 숫자 생성
  hitEffects.push({
    x: enemy.x,
    y: enemy.y - enemy.size,
    damage: damage,
    life: 35,
    maxLife: 35
  });

  // 타격 파티클 생성
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;

    hitEffects.push({
      type: "particle",
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 15,
      maxLife: 15
    });
  }
}


// ========================================
// 타격 효과 업데이트
// ========================================

function updateHitEffects() {
  // 적 체력바 부드럽게 감소
  enemies.forEach((enemy) => {
    if (enemy.displayHp === undefined) {
      enemy.displayHp = enemy.hp;
    }

    enemy.displayHp += (enemy.hp - enemy.displayHp) * 0.18;

    // 거의 같아지면 정확한 체력으로 맞춤
    if (Math.abs(enemy.displayHp - enemy.hp) < 0.1) {
      enemy.displayHp = enemy.hp;
    }

    // 피격 효과 시간 감소
    if (enemy.hitFlash > 0) {
      enemy.hitFlash--;
    }

    if (enemy.hitShake > 0) {
      enemy.hitShake--;
    }
  });

  // 피해 숫자와 파티클 업데이트
  hitEffects.forEach((effect) => {
    effect.life--;

    if (effect.type === "particle") {
      effect.x += effect.vx;
      effect.y += effect.vy;

      // 파티클이 점점 느려짐
      effect.vx *= 0.92;
      effect.vy *= 0.92;
    } else {
      // 피해 숫자는 위로 떠오름
      effect.y -= 0.8;
    }
  });

  // 수명이 끝난 효과 제거
  hitEffects = hitEffects.filter((effect) => effect.life > 0);

  // 화면 흔들림 감소
  if (screenShake > 0) {
    screenShake *= 0.8;

    if (screenShake < 0.2) {
      screenShake = 0;
    }
  }
}


// ========================================
// 피해 숫자와 파티클 그리기
// ========================================

function drawHitEffects() {
  hitEffects.forEach((effect) => {
    const alpha = effect.life / effect.maxLife;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (effect.type === "particle") {
      // 타격 파티클
      ctx.fillStyle = "#ffd166";

      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 피해 숫자 외곽
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#3b1010";

      ctx.strokeText(
        "-" + effect.damage,
        effect.x,
        effect.y
      );

      // 피해 숫자
      ctx.fillStyle = "#fff1a8";

      ctx.fillText(
        "-" + effect.damage,
        effect.x,
        effect.y
      );
    }

    ctx.restore();
  });
}