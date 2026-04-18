/**
 * HTML/CSS/JS templates for the Cursor MCP App iframe renderer.
 * Terminal aesthetic meets polished game UI.
 */

// --- Rarity color hex values (index 0-7) ---
export const RARITY_HEX = [
  "#9e9e9e", // 0 Common (grey)
  "#ffffff", // 1 Uncommon (white)
  "#00e676", // 2 Rare (green)
  "#00e5ff", // 3 Superior (cyan)
  "#448aff", // 4 Elite (blue)
  "#d500f9", // 5 Epic (magenta)
  "#ffea00", // 6 Legendary (yellow)
  "#ff1744", // 7 Mythic (red)
];

export const RARITY_NAMES = [
  "Common", "Uncommon", "Rare", "Superior",
  "Elite", "Epic", "Legendary", "Mythic",
];

export function rarityHex(rarity: number): string {
  return RARITY_HEX[rarity] ?? RARITY_HEX[0];
}

// --- CSS ---

export const BASE_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg-primary: #0a0a0f;
  --bg-secondary: #10101a;
  --bg-card: #14141f;
  --bg-card-hover: #1a1a2e;
  --border-card: #2a2a3e;
  --border-card-hover: #3a3a5e;
  --text-primary: #e0e0e8;
  --text-secondary: #8888a0;
  --text-dim: #55556a;
  --accent: #7c5cff;
  --accent-glow: rgba(124, 92, 255, 0.3);
  --success: #00e676;
  --danger: #ff1744;
  --warning: #ffea00;
  --energy-color: #ffea00;
  --font-mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
}

html, body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  min-height: 100vh;
  overflow-x: hidden;
}

body { padding: 16px 20px; }

/* --- Status HUD --- */
.status-hud {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 12px;
}

.hud-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hud-label {
  color: var(--text-dim);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.hud-value {
  color: var(--text-primary);
  font-weight: bold;
}

/* Progress bars */
.bar-track {
  width: 80px;
  height: 6px;
  background: #1a1a2e;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.bar-fill.energy { background: linear-gradient(90deg, #e6b800, #ffea00); }
.bar-fill.xp { background: linear-gradient(90deg, #5c3cff, #7c5cff); }

/* --- Card container --- */
.card-row {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 20px 0;
}

/* --- Game card (catch) --- */
.game-card {
  width: 220px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  animation: slideUp 0.4s ease forwards;
  opacity: 0;
}

.game-card:nth-child(1) { animation-delay: 0.05s; }
.game-card:nth-child(2) { animation-delay: 0.15s; }
.game-card:nth-child(3) { animation-delay: 0.25s; }

.game-card:hover {
  transform: translateY(-6px);
  border-color: var(--border-card-hover);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px var(--accent-glow);
  background: var(--bg-card-hover);
}

.game-card:active {
  transform: translateY(-2px) scale(0.98);
}

.game-card.dimmed {
  opacity: 0.25;
  pointer-events: none;
  filter: grayscale(0.5);
  transform: scale(0.96);
}

.card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 13px;
  z-index: 2;
  box-shadow: 0 2px 8px var(--accent-glow);
}

.card-type-banner {
  padding: 6px 12px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-dim);
  border-bottom: 1px solid var(--border-card);
}

.card-art {
  padding: 12px 16px;
  display: flex;
  justify-content: center;
}

.card-art pre {
  font-family: var(--font-mono);
  font-size: 15px;
  line-height: 1.3;
  white-space: pre;
}

.card-name {
  padding: 4px 12px;
  font-weight: bold;
  font-size: 14px;
}

.card-traits {
  padding: 8px 12px;
  border-top: 1px solid var(--border-card);
}

.trait-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-size: 12px;
}

.trait-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.trait-name { color: var(--text-primary); }
.trait-rarity { color: var(--text-secondary); font-size: 11px; }

.card-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--border-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.card-energy {
  color: var(--energy-color);
  font-weight: bold;
}

.card-rate {
  color: var(--text-secondary);
}

/* --- Breed card (big) --- */
.breed-card-big {
  width: 100%;
  max-width: 520px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 12px;
  overflow: hidden;
  margin: 0 auto;
  animation: slideUp 0.4s ease forwards;
  opacity: 0;
  cursor: pointer;
}

.breed-card-big:hover {
  border-color: var(--border-card-hover);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px var(--accent-glow);
}

.breed-card-big.dimmed {
  opacity: 0.25;
  pointer-events: none;
  filter: grayscale(0.5);
}

.breed-title {
  text-align: center;
  padding: 10px;
  font-size: 13px;
  letter-spacing: 1px;
  color: #ff6b9d;
  border-bottom: 1px solid var(--border-card);
}

.breed-parents {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 16px;
}

.breed-parent {
  text-align: center;
}

.breed-parent pre {
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.3;
  white-space: pre;
}

.breed-parent-name {
  font-weight: bold;
  margin-top: 4px;
  font-size: 13px;
}

.breed-heart {
  font-size: 24px;
  color: #ff6b9d;
  animation: heartbeat 1.5s ease infinite;
}

.breed-slots {
  padding: 8px 16px;
  border-top: 1px solid var(--border-card);
}

.breed-slot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 12px;
}

.breed-slot-label { color: var(--text-secondary); width: 60px; }
.breed-slot-match { color: var(--success); font-weight: bold; }
.breed-slot-nomatch { color: var(--text-dim); }

.breed-actions {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-card);
}

.breed-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border-card);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.breed-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent);
}

.breed-btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.breed-btn.primary:hover {
  background: #6a4ae0;
  box-shadow: 0 0 16px var(--accent-glow);
}

/* --- Skip button --- */
.skip-btn {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 20px;
  border: 1px solid var(--border-card);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.skip-btn:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
  background: var(--bg-card);
}

/* --- Result overlay --- */
.result-overlay {
  position: relative;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 12px;
  text-align: center;
  animation: slideUp 0.3s ease forwards;
  transition: opacity 0.5s ease;
}

.result-overlay.catch-success {
  background: linear-gradient(135deg, rgba(0, 230, 118, 0.1), rgba(0, 230, 118, 0.02));
  border: 1px solid rgba(0, 230, 118, 0.3);
}

.result-overlay.catch-fail {
  background: linear-gradient(135deg, rgba(255, 23, 68, 0.1), rgba(255, 23, 68, 0.02));
  border: 1px solid rgba(255, 23, 68, 0.3);
}

.result-overlay.catch-escaped {
  background: linear-gradient(135deg, rgba(255, 234, 0, 0.1), rgba(255, 234, 0, 0.02));
  border: 1px solid rgba(255, 234, 0, 0.3);
}

.result-overlay.breed-success {
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(124, 92, 255, 0.02));
  border: 1px solid rgba(124, 92, 255, 0.3);
}

.result-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.result-subtitle {
  color: var(--text-secondary);
  font-size: 12px;
  margin-bottom: 12px;
}

.result-xp {
  color: var(--success);
  font-size: 12px;
}

.result-creature-name {
  font-weight: bold;
  font-size: 15px;
  margin: 8px 0;
}

/* Upgrade arrow in breed results */
.upgrade-arrow {
  color: var(--warning);
  font-weight: bold;
}

/* --- Collection grid --- */
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.collection-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  padding: 12px;
  transition: all 0.2s;
}

.collection-card:hover {
  border-color: var(--border-card-hover);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.collection-card pre {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.3;
  white-space: pre;
  text-align: center;
  margin-bottom: 8px;
}

.collection-name {
  font-weight: bold;
  font-size: 13px;
  margin-bottom: 2px;
}

.collection-species {
  color: var(--text-dim);
  font-size: 11px;
  margin-bottom: 6px;
}

.collection-traits {
  font-size: 11px;
}

/* --- Empty / no energy states --- */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-state-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.empty-state-text {
  font-size: 13px;
}

/* --- Animations --- */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.15); }
  30% { transform: scale(1); }
  45% { transform: scale(1.1); }
}

@keyframes burst {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(0, 230, 118, 0.2); }
  50% { box-shadow: 0 0 24px rgba(0, 230, 118, 0.5); }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; transform: translateY(-10px); }
}

.anim-burst { animation: burst 0.4s ease; }
.anim-shake { animation: shake 0.4s ease; }
`;

// --- Sidecar JS ---

function sidecarScript(port: number): string {
  return `
<script>
const SIDECAR_PORT = ${port};
const SIDECAR_URL = "http://127.0.0.1:" + SIDECAR_PORT;

async function pickCard(choice) {
  document.querySelectorAll('.game-card,.breed-card-big').forEach(c => {
    if (c.dataset.choice !== choice) c.classList.add('dimmed');
  });
  try {
    const res = await fetch(SIDECAR_URL + "/action?choice=" + choice);
    if (res.ok) {
      const html = await res.text();
      document.documentElement.innerHTML = html;
    }
  } catch (e) { console.warn("Sidecar unreachable:", e); }
}

async function skipTurn() {
  try {
    const res = await fetch(SIDECAR_URL + "/action?choice=s");
    if (res.ok) {
      const html = await res.text();
      document.documentElement.innerHTML = html;
    }
  } catch (e) { console.warn("Sidecar unreachable:", e); }
}
</script>`;
}

// --- Auto-dismiss script for result overlay ---

export const RESULT_AUTO_DISMISS_SCRIPT = `
<script>
(function() {
  var overlay = document.querySelector('.result-overlay');
  var nextContent = document.querySelector('.next-draw-content');
  if (overlay && nextContent) {
    nextContent.style.opacity = '0.3';
    setTimeout(function() {
      overlay.style.animation = 'fadeOut 0.5s ease forwards';
      nextContent.style.transition = 'opacity 0.5s ease';
      nextContent.style.opacity = '1';
      setTimeout(function() {
        overlay.style.display = 'none';
      }, 500);
    }, 2500);
  }
})();
</script>`;

// --- Page wrapper ---

export interface WrapPageOptions {
  sidecarPort: number | null;
}

export function wrapPage(bodyContent: string, options: WrapPageOptions): string {
  const sidecar = options.sidecarPort != null ? sidecarScript(options.sidecarPort) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${BASE_CSS}</style>
</head>
<body>
${bodyContent}
${sidecar}
</body>
</html>`;
}
