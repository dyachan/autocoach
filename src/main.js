// import { PlayerInstructionComponent } from "./components/PlayerInstructionComponent.js";
import { TeamFormationComponent } from "./components/TeamFormationComponent.js";
import { MatchSimulationComponent } from "./components/MatchSimulationComponent.js";
// import { FieldRendererComponent } from "./components/FieldRendererComponent.js";
// import { GameStateManager } from "./components/GameStateManager.js";
// import { UIController } from "./components/UIController.js";

// // Core setup
// const stateManager = new GameStateManager();
// const renderer = new FieldRendererComponent(document.getElementById("gameCanvas"), stateManager);
// const match = new MatchSimulationComponent(stateManager, renderer);

// const teamA = new TeamFormationComponent("Team A");
// const teamB = new TeamFormationComponent("Team B");

// const ui = new UIController(stateManager, match);

// // Attach editors to sidebar
// const editorPanel = document.getElementById("editorPanel");
// editorPanel.appendChild(teamA.element);
// editorPanel.appendChild(teamB.element);

// match.setTeams(teamA, teamB);
// renderer.start();

const conditions = [
    "I has the ball",
    "The ball is near my goal",
    "The ball is in my side",
    "The ball is in other side",
    "The ball is near rival goal",
    "I am near a rival"
];
const actions = [
    "Keep in my zone",
    "Go to the ball",
    "Go to rival goal",
    "Pass the ball",
    "Shoot to goal",
    "Change side",
    "Go forward"
]

let teamA = new TeamFormationComponent("Team A", conditions, actions);
document.getElementById("editorPanel").appendChild(teamA.root);
let teamB = new TeamFormationComponent("Team B", conditions, actions);
document.getElementById("editorPanel").appendChild(teamB.root);

let match = new MatchSimulationComponent();
document.getElementById("btn-init-match").addEventListener("click", () => {
  match.loadTeams(teamA.getTeamData(), teamB.getTeamData());
  match.start();
});

match.on("teamHasBall", ({ team }) => {
  if(team === "Team A"){
    teamA.setMyTeamHasBall(true);
    teamB.setMyTeamHasBall(false);
  } else if(team === "Team B"){
    teamB.setMyTeamHasBall(true);
    teamA.setMyTeamHasBall(false);
  } else {
    teamA.setMyTeamHasBall(false);
    teamB.setMyTeamHasBall(false);
  }
});

match.on("rule", ({ player, condition }) => {
  if(player.team === "Team B"){
    teamA.setCurrentRule(player, condition)
  } else {
    teamB.setCurrentRule(player, condition)
  }
});
