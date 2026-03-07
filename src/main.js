import { TeamFormationComponent } from "./components/TeamFormationComponent.js";
import { RenderComponent } from "./components/RenderComponent.js";
import { LogSystem } from "./LogSystem.js";
import { SummaryRenderer } from "./SummaryRenderer.js";
import { MatchPlayer } from "./MatchPlayer.js";
import { CONSTANTS } from "./Constants.js";
import { CONDITIONS, ACTIONS } from "./PlayerRules.js";

const conditions = CONDITIONS;
const actions = ACTIONS;

// --- Field preview ---
const render = new RenderComponent();
const ROLES = ["Goalkeeper", "Defender", "Striker"];

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
    render.renderPlayer(x, y, color, 0, false, ROLES[i]);
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
