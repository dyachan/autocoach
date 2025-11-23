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

// create formations
let teamA = new TeamFormationComponent("Team A", conditions, actions);
document.getElementById("editorPanel").appendChild(teamA.root);
let teamB = new TeamFormationComponent("Team B", conditions, actions);
document.getElementById("editorPanel").appendChild(teamB.root);
teamB.root.style.display = "none";

// render
let render = new RenderComponent();
let currentSetTimeoutID = null;
let currentMatch = null;
let currentTick = 0;
document.setCurrentTick = (tick) => {
  currentTick = tick;
  bloqLog = true;
  renderTick(false);
  bloqLog = false;
}

document.updatePlayersDefaultPosition = () => {
  if(document.getElementById("matchpercent").textContent == "0" || document.getElementById("matchpercent").textContent == "100"){
    if(document.querySelector(".team-formation").style.display === "none"){
      // first team is Team A, and is not showing, so we are showing team b
      let teamdata = teamB.getTeamData();
      render.renderField();
      render.renderPlayer(render.width * (100 - teamdata["players"][0]["defaultZone"]["x"]) / 100,
                          render.height - render.height * (100 - teamdata["players"][0]["defaultZone"]["y"]) / 100,
                          "#b676ff", 0, false, "Goalkeeper");
      render.renderPlayer(render.width * (100 - teamdata["players"][1]["defaultZone"]["x"]) / 100,
                          render.height - render.height * (100 - teamdata["players"][1]["defaultZone"]["y"]) / 100,
                          "#b676ff", 0, false, "Defender");
      render.renderPlayer(render.width * (100 - teamdata["players"][2]["defaultZone"]["x"]) / 100,
                          render.height - render.height * (100 - teamdata["players"][2]["defaultZone"]["y"]) / 100,
                          "#b676ff", 0, false, "Striker");
    } else {
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
  }
}
document.updatePlayersDefaultPosition();
setTimeout(document.updatePlayersDefaultPosition, 100); // idk why

let renderTick = (loop=true) => {
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
                .replace("Team A", "<span class='teamacolor'>"+teamA.getTeamName()+"</span>")
                .replace("Team B", "<span class='teambcolor'>"+teamB.getTeamName()+"</span>");
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

  if(loop){
    currentTick++;
  }
  document.getElementById("matchpercent").textContent = Math.floor(100 * currentTick / currentMatch.length);
  if(loop && currentTick < currentMatch.length){
    currentSetTimeoutID = setTimeout(renderTick, SPEED);
  }
}

// play / pause
document.getElementById("pausebutton").addEventListener("click", ()=>{
  if(currentSetTimeoutID){
    clearTimeout(currentSetTimeoutID);
    currentSetTimeoutID = null;
  } else if(document.getElementById("matchpercent").textContent != "100"){
    renderTick();
  }
});
// restart
document.getElementById("restartbutton").addEventListener("click", ()=>{
  document.setCurrentTick(0);
});

// load match
const loadBtn = document.getElementById("btn-init-match");
loadBtn.addEventListener("click", () => {
  loadBtn.disabled = true;

  // stop prev match
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
    document.getElementById("pausebutton").disabled = false;
    document.getElementById("restartbutton").disabled = false;
    loadBtn.disabled = false;
    currentMatch = data["match"];
    teamA.setMyTeamHasBall(false);
    teamB.setMyTeamHasBall(false);
    document.getElementById("teamascore").textContent = 0;
    document.getElementById("teambscore").textContent = 0;
    document.getElementById("teamalabel").textContent = teamA.getTeamName();
    document.getElementById("teamblabel").textContent = teamB.getTeamName();
    currentTick = 0;
    maxTickLog = 0;
    document.getElementById("log").addLog("-------");
    renderTick();
  });
});

// log system
let bloqLog = false;
let maxTickLog = 0;
document.getElementById("log").addLog = function(log){
  if(bloqLog) return;
  
  if(currentTick > maxTickLog){
    log = log.replace("Team A", "<span class='teamacolor'>"+teamA.getTeamName()+"</span>")
    .replace("Team B", "<span class='teambcolor'>"+teamB.getTeamName()+"</span>");
    document.getElementById("log").innerHTML = 
    "("+Math.ceil(100*currentTick/currentMatch.length)+"%) " +
    "<button onclick='document.setCurrentTick("+currentTick+")'>></button> " + 
    log + "<br>" + document.getElementById("log").innerHTML;

    maxTickLog = currentTick;
  }
};

// update teams to select
document.updateTeams = () => {
  document.querySelectorAll(".btn-select-team").forEach( (btn) => {
    btn.disabled = true;
  });
  fetch(CONSTANTS.server_url+"getteams")
  .then( (response) => {
    return response.json();
  }).then( ({data}) => {
    document.querySelectorAll(".btn-select-team").forEach( (btn) => {
      btn.disabled = false;
    });
    teamA.setFormations(data);
    teamB.setFormations(data);
  });
}
document.updateTeams();
