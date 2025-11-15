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
    "I am marked",
    "I am near a rival",
    "The ball is near my goal",
    "The ball is in my side",
    "The ball is in other side",
    "The ball is near rival goal",
    "Rival in my side",
    "No rival in my side"
];
const actions = [
    "Keep in my zone",
    "Go to the ball",
    "Go to near rival",
    "Go to my goal",
    "Go to rival goal",
    "Go forward",
    "Go back",
    "Pass the ball",
    "Shoot to goal",
    "Change side"
]

let teamA = new TeamFormationComponent("Team A", conditions, actions);
document.getElementById("editorPanel").appendChild(teamA.root);
let teamB = new TeamFormationComponent("Team B", conditions, actions);
document.getElementById("editorPanel").appendChild(teamB.root);
teamB.root.style.display = "none";

let match = new MatchSimulationComponent();
document.getElementById("btn-init-match").addEventListener("click", () => {
  match.loadTeams(teamA.getTeamData(), teamB.getTeamData());
  match.start();
  document.getElementById("log").addLog("-----------------------");
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
  if(player.team === "Team A"){
    teamA.setCurrentRule(player, condition)
  } else {
    teamB.setCurrentRule(player, condition)
  }
});

// log system
document.getElementById("log").addLog = function(log){
  log = log.replace("Team A", "<span class='teamacolor'>Team A</span>").replace("Team B", "<span class='teambcolor'>Team B</span>");
  document.getElementById("log").innerHTML = log + "<br>" + document.getElementById("log").innerHTML;
};
