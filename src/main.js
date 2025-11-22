import { TeamFormationComponent } from "./components/TeamFormationComponent.js";
import { RenderComponent } from "./components/RenderComponent.js";
import { CONSTANTS } from "./Constants.js";

const SPEED = 10;

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
    "Stay in my zone",
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

let render = new RenderComponent();
let currentSetTimeoutID = null;
let currentMatch = null;
let currentTick = 0;

document.updatePlayersDefaultPosition = () => {
  let teamdata = teamA.getTeamData();
  render.renderField();
  render.renderPlayer(render.width * teamdata["players"][0]["defaultZone"]["x"] / 100,
                      render.height - render.height * teamdata["players"][0]["defaultZone"]["y"] / 100,
                      "#fd9946", 0, false, "Goalkeeper");
  render.renderPlayer(render.width * teamdata["players"][1]["defaultZone"]["x"] / 100,
                      render.height - render.height * teamdata["players"][1]["defaultZone"]["y"] / 100,
                      "#fd9946", 0, false, "Defender");
  render.renderPlayer(render.width * teamdata["players"][2]["defaultZone"]["x"] / 100,
                      render.height - render.height * teamdata["players"][2]["defaultZone"]["y"] / 100,
                      "#fd9946", 0, false, "Striker");
}
document.updatePlayersDefaultPosition();

let renderTick = () => {
  render.update(currentMatch[currentTick]);

  // update player state
  teamA.setCurrentRule("Goalkeeper", currentMatch[currentTick]["teamA"]["goalkeeper"]["condition"]);
  teamA.setCurrentRule("Defender", currentMatch[currentTick]["teamA"]["defender"]["condition"]);
  teamA.setCurrentRule("Striker", currentMatch[currentTick]["teamA"]["striker"]["condition"]);
  teamB.setCurrentRule("Goalkeeper", currentMatch[currentTick]["teamB"]["goalkeeper"]["condition"]);
  teamB.setCurrentRule("Defender", currentMatch[currentTick]["teamB"]["defender"]["condition"]);
  teamB.setCurrentRule("Striker", currentMatch[currentTick]["teamB"]["striker"]["condition"]);

  currentMatch[currentTick]["logs"].forEach( (log) => {
    document.getElementById("log").addLog(log);

    // check goals
    if(log.includes("do a goal")){
      if(log.includes("Team A")){
        document.getElementById("teamascore").textContent = parseInt(document.getElementById("teamascore").textContent) + 1;
      } else {
        document.getElementById("teambscore").textContent = parseInt(document.getElementById("teambscore").textContent) + 1;
      }
      document.getElementById("ballteam").textContent = "free";
      teamA.setMyTeamHasBall(false);
      teamB.setMyTeamHasBall(false);
    }

    // check ball possition
    if(log.includes(" take ball") || log.includes("steal ball to") || log.includes("take off ball to")){
      document.getElementById("ballteam").innerHTML = log.split(" take ball")[0]
                .split("steal ball to")[0]
                .split("take off ball to")[0]
                .replace("Team A", "<span class='teamacolor'>Team A</span>")
                .replace("Team B", "<span class='teambcolor'>Team B</span>");
      if(log.includes("Team A")){
        teamA.setMyTeamHasBall(true);
        teamB.setMyTeamHasBall(false);
      } else {
        teamB.setMyTeamHasBall(true);
        teamA.setMyTeamHasBall(false);
      }
    } else if(log.includes("ball bounces away") || log.includes("reset ball") 
              || log.includes("pass the ball") || log.includes("shoot to goal")){
      document.getElementById("ballteam").textContent = "free";
      teamA.setMyTeamHasBall(false);
      teamB.setMyTeamHasBall(false);
    }
  });

  currentTick++;
  document.getElementById("matchpercent").textContent = Math.floor(100 * currentTick / currentMatch.length);
  if(currentTick < currentMatch.length){
    currentSetTimeoutID = setTimeout(renderTick, SPEED);
  }
}

document.getElementById("pausebutton").addEventListener("click", ()=>{
  if(currentSetTimeoutID){
    clearTimeout(currentSetTimeoutID);
    currentSetTimeoutID = null;
  } else {
    renderTick();
  }
});


document.getElementById("btn-init-match").addEventListener("click", () => {
  if(currentSetTimeoutID){
    clearTimeout(currentSetTimeoutID);
    currentSetTimeoutID = null;
  }

  fetch(CONSTANTS.server_url+"play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamA: teamA.getTeamData(), teamB: teamB.getTeamData() })
  }).then( (response) => {
    return response.json();
  }).then( (data) => {
    currentMatch = data["match"];
    teamA.setMyTeamHasBall(false);
    teamB.setMyTeamHasBall(false);
    document.getElementById("teamascore").textContent = 0;
    document.getElementById("teambscore").textContent = 0;
    document.getElementById("log").innerHTML = "";
    currentTick = 0;
    renderTick();
  });
});

// log system
document.getElementById("log").addLog = function(log){
  log = log.replace("Team A", "<span class='teamacolor'>Team A</span>").replace("Team B", "<span class='teambcolor'>Team B</span>");
  document.getElementById("log").innerHTML = log + "<br>" + document.getElementById("log").innerHTML;
};
