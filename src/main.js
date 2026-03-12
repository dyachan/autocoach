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
  const style = getComputedStyle(document.documentElement);
  const color = teamBVisible
    ? style.getPropertyValue('--team-B-color').trim()
    : style.getPropertyValue('--team-A-color').trim();

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
function setSimulateBtns(disabled, display = undefined) {
  document.querySelectorAll('.btn-simulate').forEach(b => {
    b.disabled = disabled;
    if (display !== undefined) b.style.display = display;
  });
}

document.querySelectorAll('.btn-simulate').forEach(btn => {
  btn.addEventListener('click', () => {
    setSimulateBtns(true);

    matchPlayer.pause();

    fetch(CONSTANTS.server_url + "play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamA: teamA.getTeamData(), teamB: teamB.getTeamData() }),
    })
      .then(r => r.json())
      .then(data => {
        setSimulateBtns(false);
        document.getElementById("pausebutton").disabled = false;
        document.getElementById("restartbutton").disabled = false;
        document.getElementById("teamalabel").textContent = teamA.getTeamName();
        document.getElementById("teamblabel").textContent = teamB.getTeamName();

        logSystem.addRawEntry("-------");
        matchPlayer.load(data.match, data.summary);
        matchPlayer.play();
      });
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
  setSimulateBtns(false);
});

// --- i18n ---
applyTranslations();

const langSwitcher = document.getElementById("lang-switcher");
langSwitcher.value = getLang();
langSwitcher.addEventListener("change", (e) => setLocale(e.target.value));

// =====================
// MODO ROGUELIKE
// =====================
function _applyTeamColor(prefix, hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bg = `#${[r, g, b].map(c => Math.round(c * 0.44).toString(16).padStart(2, '0')).join('')}`;
  document.documentElement.style.setProperty(`--${prefix}-color`, hex);
  document.documentElement.style.setProperty(`--${prefix}-background-color`, bg);
}
function setTeamAColor(hex) { _applyTeamColor('team-A', hex); }
function setTeamBColor(hex) { _applyTeamColor('team-B', hex); }
const rogueSession = new RoguelikeSession();
let rogueUI = null;
let isRoguelikeMode = false;
let _colorPickerHandler = null;

const toggleModeBtn = document.getElementById("btn-toggle-mode");

function enterRoguelikeMode() {
  matchPlayer.pause();
  matchPlayer.load(null, null);
  rogueSession.reset();
  isRoguelikeMode = true;
  toggleModeBtn.textContent = t('sim_mode_btn');
  teamA.root.style.display = null;
  teamB.root.style.display = "none";
  setSimulateBtns(true, 'none');
  teamA.setReadOnly(false);
  teamA.setNameEditable(true);
  teamA.setCounters(null);
  teamB.setCounters(null);
  teamA.setRoguelikeMode(rogueSession.maxRulesPerSection);
  teamA.setColorPickerVisible(true);
  const colorPicker = teamA.root.querySelector('.team-color-picker');
  setTeamAColor(colorPicker.value);
  _colorPickerHandler = (e) => {
    setTeamAColor(e.target.value);
    updateFieldPreview();
  };
  colorPicker.addEventListener('input', _colorPickerHandler);
  teamB.setRoguelikeMode(rogueSession.maxRulesPerSection);
  teamB.setReadOnly(true);

  const roguePanel = teamA.root.querySelector('#roguelike-panel');
  rogueUI = new RoguelikeUI(roguePanel, rogueSession);
  rogueUI.root.style.display = null;

  if (rogueSession.turn > 0) {
    teamA.startNewTurnDistribution(0.5);
    teamA.updateRoguelikeRules(rogueSession.maxRulesPerSection);
  } else {
    // Turn 0: stats locked at 0.1, no budget to distribute yet
    teamA.players.forEach(p => p.initRoguelikeStats());
  }
}

const congratsOverlay = document.getElementById('rogue-congrats-overlay');
let _pendingOverlay = null; // { type: 'pioneer'|'gameover', team }

document.getElementById('rogue-congrats-close').addEventListener('click', () => {
  congratsOverlay.style.display = 'none';
  const type = _pendingOverlay?.type;
  _pendingOverlay = null;
  if (type === 'gameover') {
    rogueUI.showEnded('rogue_game_over');
  } else if (type === 'pioneer' || type === 'frontier') {
    rogueUI.showEnded('rogue_congrats_title');
  } else {
    _doNextTurn();
  }
});

function showCongratsPanel(title, subtitle, team = null) {
  document.getElementById('rogue-congrats-title').textContent = title;
  document.querySelector('.rogue-congrats-subtitle').textContent = subtitle;
  document.getElementById('rogue-congrats-team').textContent = team ? teamA.getTeamName() : '';
  document.getElementById('rogue-congrats-record').textContent = team
    ? `${team.matches_played} = ${team.wins} + ${team.draws} + ${team.losses}` : '';
  congratsOverlay.style.display = 'flex';
}

function exitRoguelikeMode() {
  isRoguelikeMode = false;
  congratsOverlay.style.display = 'none';
  toggleModeBtn.textContent = t('rogue_mode_btn');
  setSimulateBtns(false, null);

  if (rogueUI) {
    rogueUI.root.style.display = 'none';
    rogueUI = null;
  }

  teamA.exitRoguelikeMode();
  teamA.setNameEditable(false);
  teamA.setColorPickerVisible(false);
  teamA.setReadOnly(false);
  const colorPicker = teamA.root.querySelector('.team-color-picker');
  if (_colorPickerHandler) {
    colorPicker.removeEventListener('input', _colorPickerHandler);
    _colorPickerHandler = null;
  }
  document.documentElement.style.removeProperty('--team-A-color');
  document.documentElement.style.removeProperty('--team-A-background-color');
  document.documentElement.style.removeProperty('--team-B-color');
  document.documentElement.style.removeProperty('--team-B-background-color');

  teamA.setCounters(null);
  teamB.exitRoguelikeMode();
  teamB.setReadOnly(false);
  teamB.setCounters(null);

  document.querySelectorAll('.btn-change-team').forEach(b => b.style.display = null);
  matchPlayer.pause();
  matchPlayer.load(null, null);
  updateFieldPreview();
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
        name:         (teamA.getTeamName() || Date.now()),
        player_names: teamData.players.map(p => p.name),
        color:        teamA.getColor(),
      }),
    }).then(r => r.json());
    rogueSession.setTeamId(res.game_team_id);
    rogueSession.setPlayerIds(res.players.map(p => p.id));
  }

  // Lock team name and color — set on first play and cannot change afterwards
  teamA.setNameEditable(false);
  teamA.setColorPickerVisible(false);

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

  if (data.no_opponent_at_level) {
    _pendingOverlay = { type: 'frontier', team: data.team };
    rogueUI.showFrontier();
    return;
  }

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
  teamA.setCounters(data.team);
  teamB.setCounters(data.opponent);
  if (data.opponent.color) setTeamBColor(data.opponent.color);
  document.querySelectorAll('.btn-change-team').forEach(b => b.style.display = null);

  rogueUI.showResult(data.result, data.goals_for, data.goals_against, data.opponent.name);

  if (rogueSession.isGameOver) {
    _pendingOverlay = { type: 'gameover', team: data.team };
  } else if (data.is_pioneer && data.result !== 'loss') {
    _pendingOverlay = { type: 'pioneer', team: data.team };
  }
}

function _doNextTurn() {
  if (teamB.root.style.display !== 'none') toggleTeam();
  document.querySelectorAll('.btn-change-team').forEach(b => b.style.display = 'none');
  matchPlayer.pause();
  matchPlayer.load(null, null);
  updateFieldPreview();
  teamA.setReadOnly(false);
  teamA.setNameEditable(false);
  teamA.startNewTurnDistribution(0.5);
  teamA.updateRoguelikeRules(rogueSession.maxRulesPerSection);
  rogueUI.refresh();
}

function handleRogueNext() {
  if (_pendingOverlay) {
    const { type, team } = _pendingOverlay;
    if (type === 'gameover') {
      showCongratsPanel(t('rogue_game_over'), '', team);
    } else {
      showCongratsPanel(t('rogue_congrats_title'), t('rogue_congrats_subtitle'), team);
    }
    return; // close button will handle _doNextTurn or rogueUI.refresh
  }

  const turn = rogueSession.turn;
  if (turn === 1) {
    _pendingOverlay = { type: 'tutorial' };
    showCongratsPanel(t('rogue_tutorial_stat_title'), t('rogue_tutorial_stat_body'));
    return;
  }
  if (turn > 0 && turn % 3 === 0) {
    _pendingOverlay = { type: 'tutorial' };
    showCongratsPanel(t('rogue_tutorial_rules_title'), t('rogue_tutorial_rules_body'));
    return;
  }

  _doNextTurn();
}

function handleRogueReset() {
  rogueSession.reset();
  exitRoguelikeMode();
  enterRoguelikeMode();
}

const roguePanel = teamA.root.querySelector('#roguelike-panel');
roguePanel.querySelector('#rogue-play-btn').addEventListener('click', () => handleRoguePlay());
roguePanel.querySelector('#rogue-next-btn').addEventListener('click', () => handleRogueNext());
roguePanel.querySelector('#rogue-reset-btn').addEventListener('click', () => handleRogueReset());
