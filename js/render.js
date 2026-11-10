// ========================================
// 도트 스프라이트 로더 / 프레임 렌더러
// ========================================
const pixelSpriteSheets = {};
const pixelSpriteNames = [
  "player_knight", "player_rogue", "player_mage", "player_berserker",
  "enemy_ghoul", "enemy_brute", "enemy_runner", "enemy_cultist", "enemy_shaman",
  "boss_crypt", "boss_ember", "boss_frost", "boss_plague"
];

pixelSpriteNames.forEach((name) => {
  const image = new Image();
  image.src = `images/sprites/${name}.png`;
  pixelSpriteSheets[name] = image;
});

function drawPixelSprite(name, frame, x, y, width, height, flipX = false) {
  const image = pixelSpriteSheets[name];
  if (!image || !image.complete || !image.naturalWidth) return false;
  const cellSize = name.startsWith("boss_") ? 48 : 32;
  const frameIndex = Math.max(0, Math.min(3, frame | 0));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, frameIndex * cellSize, 0, cellSize, cellSize, 0, 0, width, height);
  } else {
    ctx.drawImage(image, frameIndex * cellSize, 0, cellSize, cellSize, x, y, width, height);
  }
  ctx.restore();
  return true;
}

// ========================================
// 게임 그리기
// ========================================

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 화면 흔들림
  ctx.save();

  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;

    ctx.translate(shakeX, shakeY);
  }

  // ====================================
  // 바닥 타일: 지역에 따라 색상과 장식 패턴이 달라집니다.
  // ====================================

  const biome = getCurrentBiome();
  canvas.style.background = biome.color;
  const TILE = 40;

  for (let x = 0; x < canvas.width; x += TILE) {
    for (let y = 0; y < canvas.height; y += TILE) {
      const tileShade = ((x / TILE + y / TILE) % 2 === 0) ? 0.045 : 0.0;
      ctx.fillStyle = biome.id === "crypt" ? `rgba(105,75,125,${tileShade})` : `rgba(255,255,255,${tileShade})`;
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.strokeStyle = biome.grid;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x, y, TILE, TILE);
      const crackSeed = (x / TILE * 13 + y / TILE * 7 + floor * 3) % 19;
      if (crackSeed === 2 || crackSeed === 11) {
        ctx.strokeStyle = "rgba(5,3,11,0.38)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + 14, y + 15); ctx.lineTo(x + 12, y + 22); ctx.stroke();
      }

      // 층 번호와 타일 좌표를 이용한 고정 장식 패턴
      const seed = (x / TILE * 17 + y / TILE * 31 + floor * 13) % 11;
      if (seed === 0 || seed === 6) {
        ctx.fillStyle = biome.accent;
        ctx.globalAlpha = 0.16;
        if (biome.id === "crypt") {
          ctx.fillRect(x + 10, y + 12, 3, 12);
          ctx.fillRect(x + 6, y + 19, 11, 3);
        } else if (biome.id === "ember") {
          ctx.fillRect(x + 8, y + 8, 3, 18);
          ctx.fillRect(x + 8, y + 22, 15, 3);
        } else if (biome.id === "frost") {
          ctx.fillRect(x + 18, y + 7, 3, 24);
          ctx.fillRect(x + 10, y + 17, 18, 3);
        } else {
          ctx.beginPath(); ctx.arc(x + 20, y + 20, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(x + 18, y + 9, 3, 22);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // ====================================
  // 던전 조명과 바닥 장식
  const ambient = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.48, 55, canvas.width * 0.5, canvas.height * 0.48, 440);
  ambient.addColorStop(0, "rgba(151,91,195,0.12)");
  ambient.addColorStop(0.68, "rgba(53,30,75,0.08)");
  ambient.addColorStop(1, "rgba(3,2,9,0.78)");
  ctx.fillStyle = ambient; ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.globalAlpha = 0.13; ctx.strokeStyle = biome.id === "frost" ? "#8edaff" : biome.id === "ember" ? "#ff9b65" : "#c48be8"; ctx.lineWidth = 4;
  for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.arc(0, 0, 42 * r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-142, 0); ctx.lineTo(142, 0); ctx.moveTo(0, -112); ctx.lineTo(0, 112); ctx.stroke();
  ctx.rotate(Math.PI / 4); ctx.strokeRect(-100, -100, 200, 200); ctx.restore();

  // 가장자리의 마법 화로와 보라색 조명
  [[34, 90], [canvas.width - 34, 90], [34, canvas.height - 82], [canvas.width - 34, canvas.height - 82]].forEach(([tx, ty], index) => {
    const glow = ctx.createRadialGradient(tx, ty, 2, tx, ty, 58);
    glow.addColorStop(0, "rgba(220,119,255,0.38)"); glow.addColorStop(1, "rgba(142,54,214,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(tx, ty, 58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#30203b"; ctx.fillRect(tx - 9, ty + 9, 18, 22);
    ctx.strokeStyle = "#8b6b9d"; ctx.lineWidth = 2; ctx.strokeRect(tx - 9, ty + 9, 18, 22);
    ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = "#c55cff"; ctx.fillStyle = index % 2 ? "#dc9cff" : "#bd65ff";
    ctx.beginPath(); ctx.moveTo(tx, ty - 17); ctx.quadraticCurveTo(tx + 15, ty - 2, tx, ty + 8); ctx.quadraticCurveTo(tx - 12, ty - 1, tx, ty - 17); ctx.fill(); ctx.restore();
  });

  ctx.fillStyle = "rgba(5,3,10,0.58)"; ctx.fillRect(0, 0, canvas.width, 16); ctx.fillRect(0, canvas.height - 16, canvas.width, 16); ctx.fillRect(0, 0, 16, canvas.height); ctx.fillRect(canvas.width - 16, 0, 16, canvas.height);
  ctx.strokeStyle = "rgba(145,112,162,0.48)"; ctx.lineWidth = 3; ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

  // ====================================
  // 보스별 공격 경고 영역
  // ====================================
  enemies.forEach((enemy) => {
    if (!enemy.isBoss || enemy.bossAttackTimer <= 0) return;
    const total = enemy.bossAttackType === "melee" ? 32 : enemy.bossAttackType === "shadowOrb" ? 46 : enemy.bossAttackType === "flameLine" ? 48 : enemy.bossAttackType === "iceFan" ? 54 : 62;
    const progress = 1 - enemy.bossAttackTimer / Math.max(1, total - (enemy.bossPhase === 2 ? 10 : 0));
    const pulse = 0.72 + Math.sin(progress * Math.PI * 8) * 0.16;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = enemy.bossColor || "#ff4646";
    ctx.fillStyle = enemy.bossColor || "#ff4646";
    ctx.lineWidth = 3;

    if (enemy.bossAttackType === "melee" || enemy.bossAttackType === "flameLine") {
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.bossMeleeAngle);
      const length = enemy.bossAttackType === "flameLine" ? 230 : enemy.bossMeleeLength;
      const width = enemy.bossAttackType === "flameLine" ? 86 : enemy.bossMeleeWidth;
      ctx.globalAlpha = pulse * 0.25;
      ctx.fillRect(0, -width / 2, length, width);
      ctx.globalAlpha = pulse;
      ctx.strokeRect(0, -width / 2, length, width);
      if (enemy.bossAttackType === "flameLine") {
        for (let x = 20; x < length; x += 38) {
          ctx.beginPath(); ctx.moveTo(x, -width / 2); ctx.lineTo(x + 12, 0); ctx.lineTo(x, width / 2); ctx.stroke();
        }
      }
    } else if (enemy.bossAttackType === "shadowOrb") {
      ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(enemy.bossAttackX, enemy.bossAttackY); ctx.stroke();
      ctx.beginPath(); ctx.arc(enemy.bossAttackX, enemy.bossAttackY, 16 + progress * 10, 0, Math.PI * 2); ctx.stroke();
    } else if (enemy.bossAttackType === "iceFan") {
      const aim = Math.atan2(enemy.bossAttackY - enemy.y, enemy.bossAttackX - enemy.x);
      for (let i = -2; i <= 2; i++) {
        const a = aim + (i / 2) * (enemy.bossPhase === 2 ? 0.72 : 0.58);
        ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(enemy.x + Math.cos(a) * 245, enemy.y + Math.sin(a) * 245); ctx.stroke();
      }
    } else if (enemy.bossAttackType === "poisonPool") {
      ctx.beginPath(); ctx.arc(enemy.bossAttackX, enemy.bossAttackY, enemy.bossAttackRadius || 76, 0, Math.PI * 2);
      ctx.globalAlpha = pulse * 0.22; ctx.fill(); ctx.globalAlpha = pulse; ctx.stroke();
      ctx.beginPath(); ctx.arc(enemy.bossAttackX, enemy.bossAttackY, (enemy.bossAttackRadius || 76) * 0.55, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  });

  // ====================================
  // 보스별 공격 발동 이펙트
  // ====================================
  enemies.forEach((enemy) => {
    if (!enemy.isBoss || enemy.bossAttackEffectTimer <= 0) return;
    const progress = enemy.bossAttackEffectTimer / 24;
    const alpha = Math.min(1, progress * 1.8);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    if (enemy.bossAttackType === "melee" || enemy.bossAttackType === "flameLine") {
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.bossMeleeAngle);
      const isFire = enemy.bossAttackType === "flameLine";
      const length = isFire ? 230 : enemy.bossMeleeLength;
      const width = isFire ? 86 : enemy.bossMeleeWidth;
      ctx.fillStyle = isFire ? `rgba(255,95,28,${alpha * 0.55})` : `rgba(255,35,75,${alpha * 0.6})`;
      ctx.fillRect(0, -width / 2, length, width);
      ctx.strokeStyle = isFire ? `rgba(255,220,125,${alpha})` : `rgba(255,235,190,${alpha})`;
      ctx.lineWidth = 5;
      ctx.strokeRect(0, -width / 2, length, width);
    } else if (enemy.bossAttackType === "shadowOrb") {
      const orbRadius = 12 + (1 - progress) * 14;
      ctx.beginPath(); ctx.arc(enemy.x, enemy.y, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(178,115,255,${alpha * 0.75})`; ctx.fill();
      ctx.strokeStyle = `rgba(240,220,255,${alpha})`; ctx.lineWidth = 3; ctx.stroke();
    } else if (enemy.bossAttackType === "iceFan") {
      const aim = Math.atan2(enemy.bossAttackY - enemy.y, enemy.bossAttackX - enemy.x);
      for (let i = -2; i <= 2; i++) {
        const a = aim + (i / 2) * (enemy.bossPhase === 2 ? 0.72 : 0.58);
        const px = enemy.x + Math.cos(a) * 28;
        const py = enemy.y + Math.sin(a) * 28;
        ctx.beginPath(); ctx.arc(px, py, 5 + (1 - progress) * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150,225,255,${alpha})`; ctx.fill();
      }
    } else if (enemy.bossAttackType === "poisonPool") {
      const radius = enemy.bossAttackRadius || 76;
      ctx.beginPath(); ctx.arc(enemy.bossAttackX, enemy.bossAttackY, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(130,220,75,${alpha * 0.38})`; ctx.fill();
      ctx.strokeStyle = `rgba(210,255,120,${alpha})`; ctx.lineWidth = 6; ctx.stroke();
    }
    ctx.restore();
  });

  // ====================================
  // 아이템
  // ====================================

  items.forEach((item) => {
    if (item.type === "gold") {
      ctx.fillStyle = "#ffd700";
    } else {
      ctx.fillStyle = "#4cff7a";
    }

    ctx.beginPath();

    ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);

    ctx.fill();
  });

  // ====================================
  // 지역 환경 위험 영역
  // ====================================

  floorHazards.forEach((hazard) => {
    const isWarning = hazard.warning > 0;
    const color = hazard.type === "fire" ? "255,105,45" : hazard.type === "frost" ? "90,190,255" : "125,205,85";
    ctx.save();
    ctx.globalAlpha = isWarning ? 0.28 + Math.sin(hazard.warning * 0.18) * 0.12 : 0.34;
    ctx.fillStyle = `rgba(${color},${isWarning ? 0.42 : 0.65})`;
    ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = isWarning ? 0.75 : 0.95;
    ctx.strokeStyle = `rgb(${color})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });

  // ====================================
  // 적 투사체
  // ====================================

  enemyProjectiles.forEach((projectile) => {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = projectile.color;
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // ====================================
  // 적 그리기
  // ====================================

  enemies.forEach((enemy) => {
    // 피격 시 적이 살짝 흔들림
    let shakeX = 0;
    let shakeY = 0;

    if (enemy.hitShake > 0) {
      shakeX = (Math.random() - 0.5) * enemy.hitShake;
      shakeY = (Math.random() - 0.5) * enemy.hitShake;
    }

    const enemyX = enemy.x + shakeX;
    const enemyY = enemy.y + shakeY;

    // 4프레임 도트 스프라이트: 이동 중 프레임을 교체해 걷는 동작을 표현합니다.
    const animationClock = gamePaused ? 0 : Date.now();
    const spriteFrame = Math.floor(animationClock / (enemy.isBoss ? 210 : 145)) % 4;
    const spriteKey = enemy.isBoss ? `boss_${enemy.bossElement === "fire" ? "ember" : enemy.bossElement === "frost" ? "frost" : enemy.bossElement === "poison" ? "plague" : "crypt"}` : `enemy_${enemy.archetypeId || "ghoul"}`;
    const spriteSize = enemy.isBoss ? enemy.size * 1.8 : enemy.size * 1.9;
    const facingLeft = (enemy.x > player.x);
    const rendered = drawPixelSprite(spriteKey, spriteFrame, enemyX - spriteSize / 2, enemyY - spriteSize / 2, spriteSize, spriteSize, facingLeft);
    if (!rendered) {
      ctx.fillStyle = enemy.hitFlash > 0 ? "#fff" : (enemy.isBoss ? enemy.bossColor : enemy.color || "#e84a5f");
      ctx.fillRect(enemyX - enemy.size / 2, enemyY - enemy.size / 2, enemy.size, enemy.size);
    } else if (enemy.hitFlash > 0) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = "#fff"; ctx.fillRect(enemyX - spriteSize / 2, enemyY - spriteSize / 2, spriteSize, spriteSize); ctx.restore();
    }

    // 화상 및 회복 이펙트
    if (enemy.burnTimer > 0) {
      ctx.strokeStyle = "rgba(255,130,45,0.8)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(enemyX, enemyY, enemy.size / 2 + 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (enemy.healFlash > 0) {
      ctx.fillStyle = "#86efac"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center"; ctx.fillText("+", enemyX, enemyY - enemy.size / 2 - 7);
    }

    // 보스/정예 이름표
    if (enemy.isBoss || enemy.isElite) {
      ctx.fillStyle = enemy.isBoss ? "#f5d0fe" : "#fde68a";
      ctx.font = "bold 12px Arial"; ctx.textAlign = "center";
      ctx.fillText(enemy.bossName || enemy.eliteName || "정예", enemyX, enemyY - enemy.size / 2 - 13);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "11px Arial"; ctx.textAlign = "center";
      ctx.fillText(enemy.archetypeIcon || "", enemyX, enemyY + 4);
    }

    // 적 크기에 비례하는 체력바
    const barWidth = enemy.isBoss ? 74 : enemy.isElite ? 48 : 36;
    const barY = enemyY - enemy.size / 2 - (enemy.isBoss || enemy.isElite ? 8 : 5);
    ctx.fillStyle = "#25202b";
    ctx.fillRect(enemyX - barWidth / 2, barY, barWidth, 5);
    ctx.fillStyle = "#ffb347";
    ctx.fillRect(enemyX - barWidth / 2, barY, barWidth * Math.max(0, enemy.displayHp / enemy.maxHp), 5);
    ctx.fillStyle = enemy.isBoss ? "#e879f9" : "#ff5555";
    ctx.fillRect(enemyX - barWidth / 2, barY, barWidth * Math.max(0, enemy.hp / enemy.maxHp), 5);
  });

  // ====================================
  // 플레이어
  // ====================================

  if (player.invincible % 10 < 5) {
    const animationClock = gamePaused ? 0 : Date.now();
    const spriteFrame = player.moving ? Math.floor(animationClock / 115) % 4 : (player.attacking ? 2 : 0);
    const playerSpriteSize = 64;
    const spriteKey = `player_${player.characterId || "knight"}`;
    const rendered = drawPixelSprite(spriteKey, spriteFrame, player.x - playerSpriteSize / 2, player.y - playerSpriteSize / 2, playerSpriteSize, playerSpriteSize, player.facing === "left");
    if (!rendered) {
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
    }
  }

  // ====================================
  // 타격 숫자와 파티클 그리기
  // ====================================

  drawHitEffects();

  // ====================================
  // 검기
  // ====================================

  drawSword();

  // ====================================
  // 플레이어 HP
  // ====================================

  ctx.fillStyle = "#333";

  ctx.fillRect(player.x - 20, player.y - 32, 40, 6);

  ctx.fillStyle = "#4cff7a";

  ctx.fillRect(
    player.x - 20,
    player.y - 32,

    40 * (player.hp / player.maxHp),

    6
  );

  ctx.restore();
}

// ========================================
// 검기 그리기
// ========================================

function drawSword() {
  if (!player.attacking) return;
  const rangeScale = (player.attackRange / 90) * (player.attackRangeMultiplier || 1);
  const radius = 55 * rangeScale;
  const swingState = getAttackSwingState();
  const progress = swingState.progress;
  const intensity = Math.sin(progress * Math.PI);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalCompositeOperation = "lighter";

  if (player.attackStyle === "bolt") {
    // 엘리안: 기존 직선 관통 마력탄 시각 효과 유지
    const angle = getFacingAngle(player.direction);
    const length = 168 * (player.attackRange / 90);
    const width = 10 + intensity * 8;
    ctx.rotate(angle);
    const gradient = ctx.createLinearGradient(8, 0, length, 0);
    gradient.addColorStop(0, "rgba(115,225,255,0.9)");
    gradient.addColorStop(0.65, "rgba(170,135,255,0.75)");
    gradient.addColorStop(1, "rgba(225,210,255,0.05)");
    ctx.fillStyle = gradient;
    ctx.fillRect(8, -width / 2, length, width);
    ctx.strokeStyle = "rgba(220,250,255,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(length, 0); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const x = 24 + i * 35 + progress * 28;
      ctx.fillStyle = "rgba(190,160,255,0.9)";
      ctx.fillRect(x, -3, 5, 6);
    }
  } else {
    // 아렌의 원본 검기 모션: 휘두르는 각도에 맞춰 반월형 검기가 함께 회전합니다.
    ctx.rotate(getSwordAngle());
    const palettes = {
      knight: { outer: "rgba(255,255,255,0.90)", inner: "rgba(255,255,255,0.55)", edge: "rgba(255,255,255,1)" },
      rogue: { outer: "rgba(177,105,255,0.92)", inner: "rgba(225,190,255,0.64)", edge: "rgba(240,215,255,1)" },
      berserker: { outer: "rgba(235,48,62,0.94)", inner: "rgba(255,165,155,0.66)", edge: "rgba(255,220,210,1)" }
    };
    const palette = palettes[player.attackColor] || palettes.knight;

    // 원본과 같은 반월형 궤적과 중심 오프셋을 사용합니다.
    ctx.beginPath();
    ctx.arc(15, 0, radius, -0.55, 0.55);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fillStyle = palette.outer;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(15, 0, Math.max(1, radius - 8), -0.42, 0.42);
    ctx.lineTo(15, 0);
    ctx.closePath();
    ctx.fillStyle = palette.inner;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(15, 0, radius, -0.55, 0.55);
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
}
