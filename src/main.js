import { TeamFormationComponent } from "./components/TeamFormationComponent.js";
import { RenderComponent } from "./components/RenderComponent.js";
import { LogSystem } from "./LogSystem.js";
import { SummaryRenderer } from "./SummaryRenderer.js";
import { MatchPlayer } from "./MatchPlayer.js";
import { CONSTANTS } from "./Constants.js";
import { CONDITIONS, ACTIONS } from "./PlayerRules.js";
import { t, getLang, setLocale, applyTranslations } from "./i18n.js";
import { RoguelikeSession } from "./RoguelikeSession.js";
import { RoguelikeUI } from "./RoguelikeUI.js";

const conditions = CONDITIONS;
const actions = ACTIONS;

// --- Field preview ---
const render = new RenderComponent();
const ROLE_KEYS = ['goalkeeper', 'defender', 'striker'];

function updateFieldPreview() {
  if (!matchPlayer.canPreview) return;

  const teamBVisible = teamA.root.style.display === "none";
  const team = teamBVisible ? teamB : teamA;
  const teamdata = team.getTeamData();
  const color = teamBVisible ? "#b676ff" : "#fd9946";

  render.renderField();
  teamdata.players.forEach((player, i) => {
    const x = teamBVisible
      ? render.width  * (100 - player.defaultZone.x) / 100
      : render.width  * player.defaultZone.x / 100;
    const y = teamBVisible
      ? render.height - render.height * (100 - player.defaultZone.y) / 100
      : render.height - render.height * player.defaultZone.y / 100;
    render.renderPlayer(x, y, color, 0, false, t(ROLE_KEYS[i]));
  });
}

// --- Teams ---
let teamA = new TeamFormationComponent("Team A", conditions, actions, updateFieldPreview);
let teamB = new TeamFormationComponent("Team B", conditions, actions, updateFieldPreview);
document.getElementById("editorPanel").appendChild(teamA.root);
document.getElementById("editorPanel").appendChild(teamB.root);
teamB.root.style.display = "none";

// Toggle which team panel is visible
function toggleTeam() {
  [teamA.root, teamB.root].forEach(root => {
    root.style.display = root.style.display === "none" ? null : "none";
  });
  updateFieldPreview();
}
document.querySelectorAll(".btn-change-team").forEach(btn =>
  btn.addEventListener("click", toggleTeam)
);

// Collapse/expand the editor panel
document.getElementById("hidecontrolsbtn").addEventListener("click", () => {
  const collapsed = !!teamA.root.style.width;
  teamA.root.style.width = collapsed ? null : "0px";
  teamB.root.style.width = collapsed ? null : "0px";
});

// --- Log, Summary, MatchPlayer ---
const logEl = document.getElementById("log");
const logSystem = new LogSystem(logEl, () => teamA.getTeamName(), () => teamB.getTeamName());
const summaryRenderer = new SummaryRenderer(logEl, () => teamA.getTeamName(), () => teamB.getTeamName());
const matchPlayer = new MatchPlayer({ render, teamA, teamB, logSystem, summaryRenderer });

logSystem.onSeekTick = (tick) => matchPlayer.setTick(tick);

updateFieldPreview();
setTimeout(updateFieldPreview, 100); // wait for canvas layout

// --- Controls ---
document.getElementById("pausebutton").addEventListener("click", () => {
  if (matchPlayer.timeoutId) {
    matchPlayer.pause();
  } else if (!matchPlayer.isFinished) {
    matchPlayer.play();
  }
});

document.getElementById("restartbutton").addEventListener("click", () => {
  matchPlayer.setTick(0);
});

const fastForwardBtn = document.getElementById("btn-fast-forward");
fastForwardBtn.addEventListener("mousedown",   () => { matchPlayer.ticksPerFrame = 15; });
fastForwardBtn.addEventListener("touchstart",  () => { matchPlayer.ticksPerFrame = 15; }, { passive: true });
fastForwardBtn.addEventListener("mouseup",     () => { matchPlayer.ticksPerFrame = 1; });
fastForwardBtn.addEventListener("mouseleave",  () => { matchPlayer.ticksPerFrame = 1; });
fastForwardBtn.addEventListener("touchend",    () => { matchPlayer.ticksPerFrame = 1; });

// --- Load match ---
const loadBtn = document.getElementById("btn-init-match");
loadBtn.addEventListener("click", () => {
  loadBtn.disabled = true;

  matchPlayer.pause();

  fetch(CONSTANTS.server_url + "play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamA: teamA.getTeamData(), teamB: teamB.getTeamData() }),
  })
    .then(r => r.json())
    .then(data => {
      loadBtn.disabled = false;
      document.getElementById("pausebutton").disabled = false;
      document.getElementById("restartbutton").disabled = false;
      document.getElementById("teamalabel").textContent = teamA.getTeamName();
      document.getElementById("teamblabel").textContent = teamB.getTeamName();

      logSystem.addRawEntry("-------");
      matchPlayer.load(data.match, data.summary);
      matchPlayer.play();
    });
});

// --- Fetch teams from server ---
function updateTeams() {
  document.querySelectorAll(".btn-select-team").forEach(btn => (btn.disabled = true));
  return fetch(CONSTANTS.server_url + "getteams")
    .then(r => r.json())
    .then(({ data }) => {
      document.querySelectorAll(".btn-select-team").forEach(btn => (btn.disabled = false));
      teamA.setFormations(data);
      teamB.setFormations(data);
    });
}

updateTeams().then(() => {
  loadBtn.disabled = false;
});

// --- i18n ---
applyTranslations();

const langSwitcher = document.getElementById("lang-switcher");
langSwitcher.value = getLang();
langSwitcher.addEventListener("change", (e) => setLocale(e.target.value));

// =====================
// MODO ROGUELIKE
// =====================
const rogueSession = new RoguelikeSession();
let rogueUI = null;
let isRoguelikeMode = false;

const toggleModeBtn = document.getElementById("btn-toggle-mode");

function enterRoguelikeMode() {
  rogueSession.reset();
  isRoguelikeMode = true;
  toggleModeBtn.textContent = t('sim_mode_btn');
  teamB.root.style.display = "none";
  loadBtn.style.display = "none";
  teamA.setReadOnly(false);
  teamA.setNameEditable(true);
  teamB.setCounters(null);
  teamA.setRoguelikeMode(rogueSession.maxRulesPerSection);
  // Hide teamB's management controls and lock it (always read-only for the opponent)
  teamB.root.querySelector('.btn-upload-team').style.display = 'none';
  teamB.root.querySelector('.btn-select-team').style.display = 'none';
  teamB.root.querySelector('.team-selection').style.display = 'none';
  teamB.root.querySelector('.btn-export-team').closest('label').style.display = 'none';
  teamB.setReadOnly(true);
  document.querySelectorAll('.btn-change-team').forEach(b => b.style.display = 'none');

  rogueUI = new RoguelikeUI(rogueSession, handleRoguePlay, handleRogueNext, handleRogueReset);
  rogueUI.root.style.display = null;

  if (rogueSession.turn > 0) {
    teamA.startNewTurnDistribution(0.5);
    teamA.updateRoguelikeRules(rogueSession.maxRulesPerSection);
  } else {
    // Turn 0: stats locked at 0.1, no budget to distribute yet
    teamA.players.forEach(p => p.initRoguelikeStats());
  }
}

function exitRoguelikeMode() {
  isRoguelikeMode = false;
  toggleModeBtn.textContent = t('rogue_mode_btn');
  teamB.root.style.display = "none"; // teamB sigue oculto (lo maneja toggleTeam)
  loadBtn.style.display = null;
  document.getElementById('roguelike-panel').style.display = 'none';
  rogueUI = null;
}

toggleModeBtn.addEventListener("click", () => {
  isRoguelikeMode ? exitRoguelikeMode() : enterRoguelikeMode();
});

async function handleRoguePlay() {
  const playBtn = document.getElementById('rogue-play-btn');
  if (playBtn) playBtn.disabled = true;

  const teamData = teamA.getTeamData();

  if (!rogueSession.isStarted) {
    // Turno 1: crear equipo y jugadores en backend con stats 0.1
    const res = await fetch(CONSTANTS.server_url + "roguelike/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:         (teamA.getTeamName() || "rogue") + "_" + Date.now(),
        player_names: teamData.players.map(p => p.name),
      }),
    }).then(r => r.json());
    rogueSession.setTeamId(res.game_team_id);
    rogueSession.setPlayerIds(res.players.map(p => p.id));
  }

  // Lock team name — name is set on first play and cannot change afterwards
  teamA.setNameEditable(false);

  // Enviar stats + zonas + reglas en un solo request
  const playersPayload = teamData.players.map((p, i) => ({
    game_player_id:     rogueSession.playerIds[i],
    default_zone_x:     parseFloat(p.defaultZone.x),
    default_zone_y:     parseFloat(p.defaultZone.y),
    rules_with_ball:    p.rules[0],
    rules_without_ball: p.rules[1],
    max_speed:          p.maxSpeed,
    accuracy:           p.accuracy,
    control:            p.control,
    reaction:           p.reaction,
    dribble:            p.dribble,
    strength:           p.strength,
    endurance:          p.endurance,
    scan_with_ball:     p.scanWithBall,
    scan_without_ball:  p.scanWithoutBall,
  }));

  const data = await fetch(CONSTANTS.server_url + "roguelike/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      game_team_id: rogueSession.teamId,
      players:      playersPayload,
    }),
  }).then(r => r.json());

  rogueSession.applyMatchResult(data);

  // Reproducir replay
  document.getElementById("pausebutton").disabled = false;
  document.getElementById("restartbutton").style.display = null;
  document.getElementById("restartbutton").disabled = false;
  document.getElementById("teamalabel").textContent = teamA.getTeamName();
  document.getElementById("teamblabel").textContent = data.opponent.name;
  logSystem.addRawEntry("-------");
  matchPlayer.load(data.match, data.summary);
  matchPlayer.play();

  // Phase 2: lock teamA (match already played), load opponent into teamB, show toggle
  teamA.setReadOnly(true);
  teamB.root.querySelector('.team-name').value = data.opponent.name;
  teamB.loadTeamData({ players: data.opponent.players });
  teamB.setCounters(data.opponent);
  document.querySelectorAll('.btn-change-team').forEach(b => b.style.display = null);

  if (rogueSession.isGameOver) {
    rogueUI.refresh();
  } else {
    rogueUI.showResult(data.result, data.goals_for, data.goals_against, data.opponent.name);
  }
}

function handleRogueNext() {
  // Return to teamA view and hide the toggle (phase 1 = own team only)
  if (teamB.root.style.display !== 'none') toggleTeam();
  document.querySelectorAll('.btn-change-team').forEach(b => b.style.display = 'none');
  // Reset match player: clear log, scores, and restore field preview
  matchPlayer.pause();
  matchPlayer.load(null, null);
  updateFieldPreview();
  // Phase 1: unlock teamA editing (but keep name locked), then apply turn distribution
  teamA.setReadOnly(false);
  teamA.setNameEditable(false);
  teamA.startNewTurnDistribution(0.5);
  teamA.updateRoguelikeRules(rogueSession.maxRulesPerSection);
  rogueUI.refresh();
}

function handleRogueReset() {
  rogueSession.reset();
  exitRoguelikeMode();
  enterRoguelikeMode();
}
