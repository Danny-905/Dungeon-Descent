// 화면 테마용 UI 보조 기능. 기존 전투/진행 로직을 대체하지 않습니다.
function openPauseMenu() {
  if (!gameRunning || abilitySelecting || shopSelecting || eventSelecting) return;
  gamePaused = true;
  gameRunning = false;
  pauseOverlay.style.display = "flex";
  const idle = document.getElementById("pauseIdle");
  if (idle) idle.style.display = "none";
}

function toggleSoundSettings() {
  const control = document.getElementById("soundControl");
  if (control) control.classList.toggle("show");
}

(function bindPausePanel() {
  const overlay = document.getElementById("pauseOverlay");
  if (!overlay) return;
  const observer = new MutationObserver(() => {
    const idle = document.getElementById("pauseIdle");
    if (!idle) return;
    idle.style.display = overlay.style.display === "none" ? "block" : "none";
  });
  observer.observe(overlay, { attributes: true, attributeFilter: ["style"] });
})();
