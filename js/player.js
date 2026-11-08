// ========================================
// 공격
// ========================================

function attack(direction) {
  if (abilitySelecting || shopSelecting || eventSelecting || gamePaused) return;
  if (player.attackCooldown > 0) return;

  player.direction = direction;
  player.facing = direction;
  player.attacking = true;
  playSound("attack");

  // 아렌은 초기 파란 네모 캐릭터 시절의 회전형 검기 공격을 그대로 사용합니다.
  // 시안은 짧은 검기를 빠르게 두 번, 카르는 넓은 검기를 느리게 한 번 휘두릅니다.
  const styles = {
    knight: {
      style: "slash", duration: 12, cooldown: 25, multiplier: 1.00,
      rangeMultiplier: 1.00, color: "knight", swingCount: 1
    },
    rogue: {
      style: "slash", duration: 16, cooldown: 26, multiplier: 0.60,
      rangeMultiplier: 0.75, color: "rogue", swingCount: 2, swingDuration: 8
    },
    mage: {
      style: "bolt", duration: 10, cooldown: 34, multiplier: 1.28,
      rangeMultiplier: 1.00, color: "mage", swingCount: 1
    },
    berserker: {
      style: "slash", duration: 18, cooldown: 44, multiplier: 1.55,
      rangeMultiplier: 1.35, color: "berserker", swingCount: 1
    }
  };
  const config = styles[player.characterId] || styles.knight;
  player.attackStyle = config.style;
  player.attackRangeMultiplier = config.rangeMultiplier || 1;
  player.attackColor = config.color || "knight";
  player.attackTimerMax = config.duration;
  player.attackTimer = config.duration;
  player.attackSwingCount = config.swingCount || 1;
  player.attackSwingDuration = config.swingDuration || config.duration;
  player.attackSwingIndex = -1;
  player.attackCooldown = Math.max(1, Math.floor(config.cooldown / player.attackSpeedMultiplier));
  player.attackCount++;
  player.currentAttackDamage = player.damage * player.finalDamageMultiplier * config.multiplier;

  const berserkerBonus = player.characterId === "berserker" && player.hp / player.maxHp <= 0.4 ? 0.30 : 0;
  if (player.lowHpDamageBonus > 0 || berserkerBonus > 0) {
    player.currentAttackDamage *= (1 + player.lowHpDamageBonus + berserkerBonus);
  }
  if (player.thirdHitBonus > 0 && player.attackCount % 3 === 0) {
    player.currentAttackDamage *= (1 + player.thirdHitBonus);
  }
  player.hitEnemies = [];
}

function getFacingAngle(direction = player.direction) {
  if (direction === "up") return -Math.PI / 2;
  if (direction === "down") return Math.PI / 2;
  if (direction === "left") return Math.PI;
  return 0;
}

// 현재 공격 중 몇 번째 휘두르기인지와 해당 휘두르기의 진행도를 계산합니다.
function getAttackSwingState() {
  const count = Math.max(1, player.attackSwingCount || 1);
  const swingDuration = Math.max(1, player.attackSwingDuration || player.attackTimerMax || 12);
  const elapsed = Math.max(0, (player.attackTimerMax || 12) - player.attackTimer);
  const index = Math.min(count - 1, Math.floor(elapsed / swingDuration));
  const localElapsed = elapsed - index * swingDuration;
  return {
    index,
    progress: Math.max(0, Math.min(1, localElapsed / swingDuration))
  };
}

function getSwordAngle() {
  const angle = getFacingAngle();
  const swingState = getAttackSwingState();
  // 원본 공격과 동일하게 검기가 약 162도 회전하며 휘둘러집니다.
  const swing = (swingState.progress - 0.5) * Math.PI * 0.9;
  return angle + swing;
}

function applyPlayerAttackHit(enemy, damageMultiplier = 1) {
  let hitDamage = Math.round((player.currentAttackDamage || player.damage) * damageMultiplier);
  if (enemy.isBoss) hitDamage = Math.round(hitDamage * (player.bossDamageMultiplier || 1));
  if (enemy.hp <= enemy.maxHp * 0.30) hitDamage = Math.round(hitDamage * (1 + (player.executeBonus || 0)));
  const critical = Math.random() < (player.critChance || 0);
  if (critical) hitDamage = Math.round(hitDamage * 1.75);
  enemy.hp = Math.max(0, enemy.hp - hitDamage);
  playSound("hit");
  createHitEffect(enemy, hitDamage);
  if (critical) {
    const message = document.getElementById("message");
    if (message) message.textContent = `치명타! ${hitDamage} 피해`;
  }
  if (player.lifeSteal > 0) player.hp = Math.min(player.maxHp, player.hp + Math.max(1, Math.ceil(hitDamage * player.lifeSteal)));
  if (player.burnChance > 0 && Math.random() < player.burnChance) {
    enemy.burnTimer = Math.max(enemy.burnTimer || 0, 180);
    enemy.burnDamage = Math.max(enemy.burnDamage || 0, Math.ceil(hitDamage * 0.12));
  }
  if (player.doubleStrikeChance > 0 && Math.random() < player.doubleStrikeChance) {
    const echoDamage = Math.max(1, Math.ceil(hitDamage * 0.55));
    enemy.hp = Math.max(0, enemy.hp - echoDamage);
    createHitEffect(enemy, echoDamage);
  }
  player.hitEnemies.push(enemy);
}

function checkSwordHit() {
  if (!player.attacking) return;

  const swingState = getAttackSwingState();
  // 시안은 두 번째 휘두르기가 시작될 때 같은 적도 다시 맞을 수 있습니다.
  if (player.attackSwingIndex !== swingState.index) {
    player.attackSwingIndex = swingState.index;
    player.hitEnemies = [];
  }

  const angle = player.attackStyle === "bolt" ? getFacingAngle() : getSwordAngle();
  const rangeScale = player.attackRange / 90;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (player.hitEnemies.includes(enemy)) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    let hit = false;

    if (player.attackStyle === "bolt") {
      // 엘리안: 기존 직선 관통 마력탄 공격
      const forward = dx * cos + dy * sin;
      const side = Math.abs(-dx * sin + dy * cos);
      const length = 168 * rangeScale;
      const width = 17 * rangeScale + enemy.size / 2;
      hit = forward >= 0 && forward <= length && side <= width;
    } else {
      // 원본 파란 네모 캐릭터의 회전형 검기 판정을 복원합니다.
      const radius = 55 * rangeScale * (player.attackRangeMultiplier || 1);
      const swordCenterX = player.x + Math.cos(angle) * 15;
      const swordCenterY = player.y + Math.sin(angle) * 15;
      const distance = Math.hypot(enemy.x - swordCenterX, enemy.y - swordCenterY);
      if (distance <= radius + enemy.size / 2) {
        const enemyAngle = Math.atan2(enemy.y - swordCenterY, enemy.x - swordCenterX);
        let angleDifference = enemyAngle - angle;
        while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
        while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
        hit = Math.abs(angleDifference) <= 0.55;
      }
    }

    if (hit) {
      applyPlayerAttackHit(enemy, 1);
      if (enemy.hp <= 0) {
        enemies.splice(i, 1);
        registerEnemyDefeat(enemy);
      }
    }
  }
}

// ========================================
// 플레이어 이동
// ========================================

function updatePlayer() {
  if (abilitySelecting || shopSelecting || eventSelecting) {
    return;
  }

  let dx = 0;

  let dy = 0;

  if (keys["w"]) {
    dy--;
  }

  if (keys["s"]) {
    dy++;
  }

  if (keys["a"]) {
    dx--;
  }

  if (keys["d"]) {
    dx++;
  }

  // 대각선 이동 속도 보정

  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;

    dy *= 0.707;
  }

  const moveMultiplier = player.slowTimer > 0 ? 0.62 : 1;
  player.x += dx * player.speed * moveMultiplier;

  player.y += dy * player.speed * moveMultiplier;

  // 화면 밖으로 못 나가게

  player.x = Math.max(
    player.size,
    Math.min(canvas.width - player.size, player.x)
  );

  player.y = Math.max(
    player.size,
    Math.min(canvas.height - player.size, player.y)
  );

  // 공격 쿨타임

  if (player.attackCooldown > 0) {
    player.attackCooldown--;
  }

  // 무적 시간

  if (player.invincible > 0) {
    player.invincible--;
  }

  // 공격 애니메이션

  if (player.attackTimer > 0) {
    checkSwordHit();

    player.attackTimer--;
  } else {
    player.attacking = false;

    player.hitEnemies = [];
  }
}
