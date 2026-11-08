// ========================================
// 랜덤
// ========================================

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function chooseEnemyArchetype() {
  const biome = getCurrentBiome();
  const options = Object.values(ENEMY_ARCHETYPES).map((enemy) => {
    let weight = enemy.weight;
    if (biome.id === "ember" && ["runner", "cultist"].includes(enemy.id)) weight *= 1.35;
    if (biome.id === "frost" && ["brute", "shaman"].includes(enemy.id)) weight *= 1.3;
    if (biome.id === "plague" && ["shaman", "cultist"].includes(enemy.id)) weight *= 1.4;
    return { enemy, weight };
  });
  const totalWeight = options.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of options) {
    roll -= item.weight;
    if (roll <= 0) return item.enemy;
  }
  return options[0].enemy;
}

// ========================================
// 적 생성
// ========================================

function createEnemies() {
  enemies = [];
  enemyProjectiles = [];
  const isBossFloor = floor % 5 === 0;
  const enemyCount = isBossFloor ? 1 : Math.min(12, 3 + floor);
  const safeDistance = 150;
  const biome = getCurrentBiome();

  for (let i = 0; i < enemyCount; i++) {
    let enemyX = 400;
    let enemyY = 100;
    if (!isBossFloor) {
      let attempts = 0;
      do {
        enemyX = random(60, 740);
        enemyY = random(60, 440);
        attempts++;
      } while (Math.hypot(player.x - enemyX, player.y - enemyY) < safeDistance && attempts < 40);
    }

    if (isBossFloor) {
      const bossConfig = BOSS_ARCHETYPES[biome.id] || BOSS_ARCHETYPES.crypt;
      if (gameRunning) markBossDiscovered(bossConfig.id);
      const baseHp = (460 + floor * 12) * bossConfig.hp;
      enemies.push({
        x: enemyX, y: enemyY, size: 62, speed: 0.48 + Math.min(0.18, floor * 0.003),
        hp: baseHp, maxHp: baseHp, damage: (12 + Math.floor(floor * 0.5)) * bossConfig.damage,
        attackCooldown: 0, isBoss: true, isElite: false, bossName: bossConfig.name,
        bossIcon: bossConfig.icon, bossColor: bossConfig.color, bossElement: bossConfig.element,
        bossPhase: 1, phaseTwo: false,
        bossAttackCooldown: 105, bossAttackTimer: 0, bossAttackX: 0, bossAttackY: 0,
        bossAttackRadius: bossConfig.element === "fire" ? 92 : 78,
        bossMeleeRadius: 95, bossMeleeAngle: 0, bossMeleeLength: 155, bossMeleeWidth: 92,
        bossAttackType: "ranged", bossNextAttack: "melee", bossAttackEffectTimer: 0,
        displayHp: baseHp
      });
      continue;
    }

    const archetype = chooseEnemyArchetype();
    if (gameRunning) markEnemyDiscovered(archetype.id);
    const isElite = floor >= 4 && Math.random() < Math.min(0.16, 0.035 + floor * 0.0025);
    const hp = (35 + floor * 8) * archetype.hp * (isElite ? 2.15 : 1);
    enemies.push({
      x: enemyX, y: enemyY,
      size: archetype.size * (isElite ? 1.22 : 1),
      speed: archetype.speed * (1 + Math.min(0.25, floor * 0.004)),
      hp, maxHp: hp,
      damage: (4 + Math.floor(floor * 0.75)) * archetype.damage * (isElite ? 1.45 : 1),
      attackCooldown: random(15, 50),
      isBoss: false,
      isElite,
      eliteName: isElite ? `정예 ${archetype.name}` : "",
      archetypeId: archetype.id,
      archetypeName: archetype.name,
      archetypeIcon: archetype.icon,
      color: isElite ? "#fbbf24" : archetype.color,
      rangedCooldown: random(45, 100),
      healCooldown: random(90, 150),
      burnTimer: 0,
      burnDamage: 0,
      displayHp: hp
    });
  }
}

function createEventElite() {
  const hp = 190 + floor * 28;
  return {
    x: 400, y: 100, size: 46, speed: 0.92, hp, maxHp: hp,
    damage: 11 + Math.floor(floor * 0.8), attackCooldown: 30,
    isBoss: false, isElite: true, isEventElite: true,
    eliteName: "피의 투기장 수문장", archetypeId: "brute",
    archetypeName: "투기장 수문장", archetypeIcon: "♜", color: "#fbbf24",
    rangedCooldown: 100, healCooldown: 160, burnTimer: 0, burnDamage: 0, displayHp: hp
  };
}

// ========================================
// 플레이어 피해 처리
// ========================================

function damagePlayer(amount, sourceEnemy = null, elemental = null) {
  if (player.invincible > 0) return false;
  const reduced = Math.max(1, Math.ceil((amount - player.defense) * (1 - (player.damageReduction || 0))));
  player.hp -= reduced;
  player.invincible = 50;
  playSound("playerHurt");

  if (elemental === "fire" || elemental === "poison") {
    player.burnTimer = Math.max(player.burnTimer, elemental === "fire" ? 120 : 180);
  } else if (elemental === "frost") {
    player.slowTimer = Math.max(player.slowTimer, 180);
  }

  if (sourceEnemy && player.thornDamage > 0) {
    sourceEnemy.hp = Math.max(0, sourceEnemy.hp - player.thornDamage);
    createHitEffect(sourceEnemy, player.thornDamage);
  }

  if (player.hp <= 0 && player.reviveAvailable) {
    player.reviveAvailable = false;
    player.hp = Math.max(1, Math.ceil(player.maxHp * 0.35));
    player.invincible = 120;
    const message = document.getElementById("message");
    if (message) message.textContent = "불사조의 깃털이 발동했습니다!";
  }
  return true;
}

// ========================================
// 투사체 업데이트
// ========================================

function updateEnemyProjectiles() {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const projectile = enemyProjectiles[i];
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.life--;

    if (projectile.life <= 0 || projectile.x < -20 || projectile.x > canvas.width + 20 || projectile.y < -20 || projectile.y > canvas.height + 20) {
      enemyProjectiles.splice(i, 1);
      continue;
    }

    const distance = Math.hypot(player.x - projectile.x, player.y - projectile.y);
    if (distance <= player.size / 2 + projectile.size) {
      damagePlayer(projectile.damage, projectile.source, projectile.element);
      enemyProjectiles.splice(i, 1);
    }
  }
}

// ========================================
// 적 업데이트
// ========================================

function updateEnemies() {
  if (abilitySelecting || shopSelecting || eventSelecting) return;

  const defeatedByStatus = [];

  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) {
      defeatedByStatus.push(enemy);
      return;
    }

    // 화상 피해
    if (enemy.burnTimer > 0) {
      enemy.burnTimer--;
      if (enemy.burnTimer % 40 === 0 && enemy.burnDamage > 0) {
        enemy.hp = Math.max(0, enemy.hp - enemy.burnDamage);
        createHitEffect(enemy, enemy.burnDamage);
        if (enemy.hp <= 0) {
          defeatedByStatus.push(enemy);
          return;
        }
      }
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));

    // ====================================
    // 보스별 고유 공격 패턴
    // ====================================
    if (enemy.isBoss) {
      if (enemy.bossAttackEffectTimer > 0) enemy.bossAttackEffectTimer--;

      if (!enemy.phaseTwo && enemy.hp <= enemy.maxHp * 0.5) {
        enemy.phaseTwo = true;
        enemy.bossPhase = 2;
        enemy.bossAttackCooldown = Math.min(enemy.bossAttackCooldown, 28);
        const message = document.getElementById("message");
        if (message) message.textContent = `${enemy.bossName}의 힘이 폭주합니다!`;
      }

      if (enemy.bossAttackTimer > 0) {
        enemy.bossAttackTimer--;
        if (enemy.bossAttackTimer === 0) {
          enemy.bossAttackEffectTimer = 24;
          playSound("bossImpact");
          const attackPower = enemy.bossPhase === 2 ? 1.18 : 1;

          if (enemy.bossAttackType === "melee") {
            const px = player.x - enemy.x;
            const py = player.y - enemy.y;
            const forward = px * Math.cos(enemy.bossMeleeAngle) + py * Math.sin(enemy.bossMeleeAngle);
            const side = Math.abs(-px * Math.sin(enemy.bossMeleeAngle) + py * Math.cos(enemy.bossMeleeAngle));
            if (forward >= 0 && forward <= enemy.bossMeleeLength && side <= enemy.bossMeleeWidth / 2 + player.size / 2) {
              damagePlayer(Math.round((enemy.damage + 5) * attackPower), enemy, enemy.bossElement);
            }
          } else if (enemy.bossAttackType === "shadowOrb") {
            const aim = Math.atan2(enemy.bossAttackY - enemy.y, enemy.bossAttackX - enemy.x);
            enemyProjectiles.push({
              x: enemy.x, y: enemy.y, vx: Math.cos(aim) * 3.2, vy: Math.sin(aim) * 3.2,
              size: 10, damage: Math.round(enemy.damage * attackPower), life: 150,
              color: "#b78cff", element: "shadow", source: enemy
            });
          } else if (enemy.bossAttackType === "flameLine") {
            const px = player.x - enemy.x;
            const py = player.y - enemy.y;
            const forward = px * Math.cos(enemy.bossMeleeAngle) + py * Math.sin(enemy.bossMeleeAngle);
            const side = Math.abs(-px * Math.sin(enemy.bossMeleeAngle) + py * Math.cos(enemy.bossMeleeAngle));
            if (forward >= 0 && forward <= 230 && side <= 43 + player.size / 2) {
              damagePlayer(Math.round(enemy.damage * 1.35 * attackPower), enemy, "fire");
            }
            floorHazards.push({ type: "fire", x: enemy.x + Math.cos(enemy.bossMeleeAngle) * 125, y: enemy.y + Math.sin(enemy.bossMeleeAngle) * 125, radius: 48, warning: 0, active: 120, tick: 0 });
          } else if (enemy.bossAttackType === "iceFan") {
            const aim = Math.atan2(enemy.bossAttackY - enemy.y, enemy.bossAttackX - enemy.x);
            const spread = enemy.bossPhase === 2 ? 0.72 : 0.58;
            for (let shot = -2; shot <= 2; shot++) {
              const angle = aim + (shot / 2) * spread;
              enemyProjectiles.push({
                x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 3.0, vy: Math.sin(angle) * 3.0,
                size: shot === 0 ? 8 : 6, damage: Math.round(enemy.damage * 0.72 * attackPower), life: 175,
                color: "#8bd5f5", element: "frost", source: enemy
              });
            }
          } else if (enemy.bossAttackType === "poisonPool") {
            floorHazards.push({
              type: "poison", x: enemy.bossAttackX, y: enemy.bossAttackY,
              radius: enemy.bossAttackRadius || 76, warning: 0, active: enemy.bossPhase === 2 ? 300 : 220, tick: 0
            });
            const nearPool = Math.hypot(player.x - enemy.bossAttackX, player.y - enemy.bossAttackY);
            if (nearPool <= (enemy.bossAttackRadius || 76)) damagePlayer(Math.round(enemy.damage * 0.65 * attackPower), enemy, "poison");
          }

          enemy.bossAttackCooldown = enemy.bossPhase === 2 ? 78 : 112;
        }
      } else {
        if (enemy.bossAttackCooldown > 0) enemy.bossAttackCooldown--;

        if (enemy.bossAttackCooldown <= 0) {
          enemy.bossAttackX = player.x;
          enemy.bossAttackY = player.y;
          enemy.bossMeleeAngle = Math.atan2(dy, dx);

          // 지역 보스마다 공격 형태를 고정해 전투 경험을 구분합니다.
          if (enemy.bossElement === "shadow") {
            enemy.bossAttackType = distance <= enemy.bossMeleeLength ? "melee" : "shadowOrb";
          } else if (enemy.bossElement === "fire") {
            enemy.bossAttackType = "flameLine";
          } else if (enemy.bossElement === "frost") {
            enemy.bossAttackType = "iceFan";
          } else {
            enemy.bossAttackType = "poisonPool";
            enemy.bossAttackRadius = enemy.bossPhase === 2 ? 92 : 76;
          }

          const chargeTimes = { melee: 32, shadowOrb: 46, flameLine: 48, iceFan: 54, poisonPool: 62 };
          enemy.bossAttackTimer = enemy.bossPhase === 2 ? Math.max(18, chargeTimes[enemy.bossAttackType] - 10) : chargeTimes[enemy.bossAttackType];
          playSound("bossWarning");
        }

        // 보스별 이동 성향
        if (enemy.bossElement === "frost" && distance < 185) {
          enemy.x -= (dx / distance) * enemy.speed * 0.45;
          enemy.y -= (dy / distance) * enemy.speed * 0.45;
        } else if (enemy.bossElement === "poison" && distance < 145) {
          enemy.x -= (dx / distance) * enemy.speed * 0.3;
          enemy.y -= (dy / distance) * enemy.speed * 0.3;
        } else if (distance > 34) {
          const chaseFactor = enemy.bossElement === "fire" ? 0.72 : 1;
          enemy.x += (dx / distance) * enemy.speed * chaseFactor;
          enemy.y += (dy / distance) * enemy.speed * chaseFactor;
        }
      }
      return;
    }

    // ====================================
    // 일반 적 특성별 행동
    // ====================================
    const archetype = ENEMY_ARCHETYPES[enemy.archetypeId] || ENEMY_ARCHETYPES.ghoul;

    if (archetype.ranged) {
      // 원거리 적은 너무 가까워지면 후퇴하고, 사거리 안에서 투사체를 발사합니다.
      if (distance < 105) {
        enemy.x -= (dx / distance) * enemy.speed * 0.85;
        enemy.y -= (dy / distance) * enemy.speed * 0.85;
      } else if (distance > 235) {
        enemy.x += (dx / distance) * enemy.speed;
        enemy.y += (dy / distance) * enemy.speed;
      }
      if (enemy.rangedCooldown > 0) enemy.rangedCooldown--;
      if (enemy.rangedCooldown <= 0 && distance < 330) {
        const projectileSpeed = 2.8 + Math.min(1.2, floor * 0.02);
        enemyProjectiles.push({
          x: enemy.x, y: enemy.y,
          vx: (dx / distance) * projectileSpeed,
          vy: (dy / distance) * projectileSpeed,
          damage: enemy.damage * 0.82,
          size: 6, life: 150, color: enemy.color || "#a78bfa",
          element: getCurrentBiome().id === "ember" ? "fire" : getCurrentBiome().id === "frost" ? "frost" : null,
          source: enemy
        });
        enemy.rangedCooldown = enemy.isElite ? 78 : 105;
      }
    } else {
      if (distance > 30) {
        enemy.x += (dx / distance) * enemy.speed;
        enemy.y += (dy / distance) * enemy.speed;
      }
    }

    // 주술사는 주변 아군 중 체력이 가장 낮은 대상을 회복합니다.
    if (archetype.healer) {
      if (enemy.healCooldown > 0) enemy.healCooldown--;
      if (enemy.healCooldown <= 0) {
        const ally = enemies
          .filter((other) => other !== enemy && !other.isBoss && other.hp > 0 && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 145)
          .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        if (ally && ally.hp < ally.maxHp) {
          const heal = Math.ceil(ally.maxHp * 0.12);
          ally.hp = Math.min(ally.maxHp, ally.hp + heal);
          enemy.healFlash = 18;
        }
        enemy.healCooldown = 175;
      }
    }

    // 근접 접촉 피해
    if (!archetype.ranged && distance < (enemy.size + player.size) / 2 + 5) {
      if (enemy.attackCooldown <= 0) {
        damagePlayer(enemy.damage, enemy, null);
        enemy.attackCooldown = enemy.isElite ? 48 : 60;
      }
    }

    if (enemy.attackCooldown > 0) enemy.attackCooldown--;
    if (enemy.healFlash > 0) enemy.healFlash--;

    // 원거리 적의 후퇴 동작 등으로 화면 밖으로 이탈하지 않도록 제한
    const margin = enemy.size / 2;
    enemy.x = Math.max(margin, Math.min(canvas.width - margin, enemy.x));
    enemy.y = Math.max(margin, Math.min(canvas.height - margin, enemy.y));
  });

  // 상태 효과 / 가시 반격으로 처치된 적 정리
  if (defeatedByStatus.length > 0) {
    const defeatedSet = new Set(defeatedByStatus);
    enemies = enemies.filter((enemy) => !defeatedSet.has(enemy));
    defeatedByStatus.forEach((enemy) => registerEnemyDefeat(enemy));
  }

  updateEnemyProjectiles();
}
