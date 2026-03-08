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
  isRoguelikeMode = true;
  toggleModeBtn.textContent = t('sim_mode_btn');
  teamB.root.style.display = "none";
  loadBtn.style.display = "none";
  teamA.setRoguelikeMode(rogueSession.maxRulesPerSection);

  rogueUI = new RoguelikeUI(rogueSession, handleRoguePlay, handleRogueNext, handleRogueReset);
  document.querySelector(".matchcontrols").appendChild(rogueUI.root);

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
  rogueUI?.root.remove();
  rogueUI = null;
}

toggleModeBtn.addEventListener("click", () => {
  isRoguelikeMode ? exitRoguelikeMode() : enterRoguelikeMode();
});

async function handleRoguePlay() {
  const playBtn = rogueUI.root.querySelector("button");
  if (playBtn) playBtn.disabled = true;

  if (!rogueSession.isStarted) {
    // Turno 1: crear equipo en backend con stats 0.1
    const teamData = teamA.getTeamData();
    const configuration = teamData.players.map(p => ({
      name:               p.name,
      default_zone_x:     parseFloat(p.defaultZone.x),
      default_zone_y:     parseFloat(p.defaultZone.y),
      max_speed:          0.1, accuracy:  0.1, control:  0.1,
      reaction:           0.1, dribble:   0.1, strength: 0.1,
      endurance:          0.1, scan_with_ball: null, scan_without_ball: null,
      rules_with_ball:    p.rules[0],
      rules_without_ball: p.rules[1],
    }));
    const teamName = (teamA.getTeamName() || "rogue") + "_" + Date.now();
    const res = await fetch(CONSTANTS.server_url + "teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName, configuration }),
    }).then(r => r.json());
    rogueSession.setTeamId(res.data?.id ?? res.id);

  } else {
    // Turno 2+: sincronizar stats y reglas en backend
    const teamData = teamA.getTeamData();
    const statMap = { maxSpeed: "max_speed", accuracy: "accuracy", control: "control",
      reaction: "reaction", dribble: "dribble", strength: "strength", endurance: "endurance" };

    for (let i = 0; i < teamData.players.length; i++) {
      const p = teamData.players[i];
      const locked = teamA.players[i]._lockedStats ?? {};

      // Sync stat upgrades (0.05 per step)
      for (const [jsKey, apiKey] of Object.entries(statMap)) {
        const current = p[jsKey] ?? 0;
        const floor   = locked[jsKey] ?? 0.1;
        const steps   = Math.round((current - floor) / 0.05);
        for (let s = 0; s < steps; s++) {
          await fetch(`${CONSTANTS.server_url}teams/${rogueSession.teamId}/upgrade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position_index: i, attribute: apiKey }),
          });
        }
      }

      // Sync rules
      for (const [slotKey, rules] of [["with_ball", p.rules[0]], ["without_ball", p.rules[1]]]) {
        for (let j = 0; j < rules.length; j++) {
          await fetch(`${CONSTANTS.server_url}teams/${rogueSession.teamId}/rule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              position_index: i, slot: slotKey,
              priority: j, condition: rules[j].condition, action: rules[j].action,
            }),
          });
        }
      }
    }
  }

  // Jugar partida
  const data = await fetch(CONSTANTS.server_url + "match/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_id: rogueSession.teamId }),
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

  if (rogueSession.isGameOver) {
    rogueUI.refresh();
  } else {
    rogueUI.showResult(data.result, data.goals_for, data.goals_against, data.opponent.name);
  }
}

function handleRogueNext() {
  teamA.startNewTurnDistribution(0.5);
  teamA.updateRoguelikeRules(rogueSession.maxRulesPerSection);
  rogueUI.refresh();
}

function handleRogueReset() {
  rogueSession.reset();
  exitRoguelikeMode();
  enterRoguelikeMode();
}
