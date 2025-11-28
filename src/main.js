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

const Log = document.getElementById("log");

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
let currentSummary = null;
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
    Log.addLog(log);

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

  if(currentTick == currentMatch.length){
    let tpl = document.getElementById("tpl-team-summary-item");
    let node = tpl.content.cloneNode(true);

    let teamname = node.querySelector("legend");
    teamname.textContent = teamB.getTeamName();
    teamname.classList.add("teambcolor");

    node.querySelector(".summary-possession-value").textContent = Math.round(100*currentSummary["possessionB"] / currentSummary["totalTime"])+"%";

    let container = node.querySelector(".team-summary-item");
    Log.insertBefore(container, Log.firstChild);

    let addPlayer = (playerSummary) => {
      tpl = document.getElementById("tpl-player-summary-item");
      node = tpl.content.cloneNode(true);
  
      node.querySelector(".summary-name").textContent = playerSummary['name'];
      node.querySelector(".summary-distance-value").textContent = Math.round(playerSummary['distanceTraveled'])+" ("+Math.round(playerSummary['distanceTraveledWithBall'])+")";
      node.querySelector(".summary-marked-value").textContent = Math.round(playerSummary['timeMarkedWithPossession'])+"% - "+Math.round(playerSummary['timeMarkedWithoutPossession'])+"%";
      node.querySelector(".summary-pass-value").textContent = playerSummary['passesMade']+" ("+playerSummary['passesAchieved']+")";
      node.querySelector(".summary-shoot-value").textContent = playerSummary['shootMade']+" ("+playerSummary['goals']+")";
      node.querySelector(".summary-steal-value").textContent = playerSummary['takedoffBalls']+" ("+playerSummary['stealedBalls']+")";
      node.querySelector(".summary-control-value").textContent = playerSummary['controledBalls']+" - "+playerSummary['interceptedBalls']+" - "+playerSummary['dribbledBalls'];

      return node.querySelector(".player-summary-item");
    };
    currentSummary["TeamB"].forEach( (playerSummary) => {
      container.appendChild(addPlayer(playerSummary));
    })


    tpl = document.getElementById("tpl-team-summary-item");
    node = tpl.content.cloneNode(true);

    teamname = node.querySelector("legend");
    teamname.textContent = teamA.getTeamName();
    teamname.classList.add("teamacolor");

    node.querySelector(".summary-possession-value").textContent = Math.round(100*currentSummary["possessionA"] / currentSummary["totalTime"])+"%";

    container = node.querySelector(".team-summary-item");
    Log.insertBefore(container, Log.firstChild);

    currentSummary["TeamA"].forEach( (playerSummary) => {
      container.appendChild(addPlayer(playerSummary));
    })

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
    currentSummary = data["summary"];
    teamA.setMyTeamHasBall(false);
    teamB.setMyTeamHasBall(false);
    document.getElementById("teamascore").textContent = 0;
    document.getElementById("teambscore").textContent = 0;
    document.getElementById("teamalabel").textContent = teamA.getTeamName();
    document.getElementById("teamblabel").textContent = teamB.getTeamName();
    currentTick = 0;
    maxTickLog = 0;
    Log.addLog("-------");
    renderTick();
  });
});

// log system
let bloqLog = false;
let maxTickLog = 0;
Log.addLog = function(log){
  if(bloqLog) return;
  
  if(currentTick > maxTickLog){
    let tpl = document.getElementById("tpl-log-item");
    let node = tpl.content.cloneNode(true);

    const time = node.querySelector(".log-time");
    time.textContent = Math.ceil(100*currentTick/currentMatch.length) + "%";

    const btn = node.querySelector(".log-btn");
    btn.addEventListener("click", () => {
      document.setCurrentTick(currentTick);
    });

    const team = node.querySelector(".log-team");
    if(log.startsWith("Team A")){
      team.classList.add("teamacolor");
      team.textContent = teamA.getTeamName();
    } else if(log.startsWith("Team B")){
      team.classList.add("teambcolor");
      team.textContent = teamB.getTeamName();
    }

    const msg = node.querySelector(".log-msg");
    msg.textContent = log = log.replace("Team A", "").replace("Team B", "");

    Log.insertBefore(node.querySelector(".log-item"), Log.firstChild);

    maxTickLog = currentTick;
  }
};

// update teams to select
document.updateTeams = () => {
  document.querySelectorAll(".btn-select-team").forEach( (btn) => {
    btn.disabled = true;
  });
  return fetch(CONSTANTS.server_url+"getteams")
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
document.updateTeams().then( () => {
  // server respond
  loadBtn.disabled = false;
});
