import { PlayerInstructionComponent } from "./PlayerInstructionComponent.js";
import { CONSTANTS } from "../Constants.js";

export class TeamFormationComponent {
  constructor(teamName, conditions, actions, onUpdate) {
    this.teamName = teamName;
    this.conditions = conditions;
    this.actions = actions;
    this.onUpdate = onUpdate;

    this.players = [];
    this.root = null;

    // roles will be created in order (index -> role mapping)
    this.roles = ["Goalkeeper", "Defender", "Striker"];

    this.createUI();
  }

  setMyTeamHasBall(value){
    this.players.forEach( (player) => {
      player.setMyTeamHasBall(value);
      player.setCurrentRule("");
    });
  }

  setCurrentRule(playerName, rule){
    this.players.forEach( (p) => {
      if(p.playerName === playerName){
        p.setCurrentRule(rule);
      }
    });
  }

  createUI() {
    const tpl = document.getElementById("tpl-team-formation");
    if (!tpl) {
      throw new Error("Template #tpl-team-formation not found in DOM.");
    }

    const node = tpl.content.cloneNode(true);
    const container = node.querySelector(".team-formation");

    // set team name
    const titleEl = container.querySelector(".team-name");
    if (titleEl) titleEl.value = this.teamName;

    // players wrapper where PlayerInstructionComponents will be mounted
    const playersWrapper = container.querySelector(".players-wrapper");

    let basePositions = [
      {x: 10, y: 50},
      {x: 65, y: 20},
      {x: 65, y: 80}
    ];
    if(this.teamName === "Team B"){
      basePositions = [
        {x: 90, y: 50},
        {x: 35, y: 20},
        {x: 35, y: 80}
      ];
    }

    // create the 3 player instruction components and mount their UI
    this.roles.forEach((role, idx) => {
      const playerComp = new PlayerInstructionComponent(
        role,
        this.conditions,
        this.actions,
        basePositions[idx],
        () => this.triggerUpdate()
      );
      if(this.teamName === "Team A"){
        playerComp.setTeamColor("teamacolor", "teamabgcolor");
      } else {
        playerComp.setTeamColor("teambcolor", "teambbgcolor");
      }

      playersWrapper.appendChild(playerComp.root);
      this.players.push(playerComp);
    });

    // wire import/export buttons from the template
    const btnExport = container.querySelector(".btn-export-team");
    const btnImport = container.querySelector(".btn-import-team");
    btnExport.addEventListener("click", () => this.exportTeam());
    btnImport.addEventListener("click", () => this.importTeam());

    if(this.teamName === "Team A"){
      titleEl.classList.add("teamacolor");
      btnExport.classList.add("teamabgcolor");
      btnImport.classList.add("teamabgcolor");
    } else {
      titleEl.classList.add("teambcolor");
      btnExport.classList.add("teambbgcolor");
      btnImport.classList.add("teambbgcolor");
    }
    
    this.root = container;
    
    if(localStorage.getItem(this.teamName)){
      this.root.querySelector(".import-area").value = localStorage.getItem(this.teamName);
      this.importTeam();
    }
    return container;
  }

  getTeamData() {
    const team = {
      players: this.players.map((p) => ({
        name: p.playerName,
        rules: p.getRules(),
        defaultZone: p.getDefaultZoneValues()
      })),
    };
    return team;
  }

  loadTeamData(teamData) {
    if (!teamData || !Array.isArray(teamData.players)) return;
    teamData.players.forEach((pd, idx) => {
      if (this.players[idx]) {
        this.players[idx].loadRules(pd.rules || [[],[]]);
        this.players[idx].defaultZone = pd.defaultZone;
        this.players[idx].setDefaultZoneValues();
      }
    });
    this.triggerUpdate();
  }

  exportTeam() {
    const data = JSON.stringify(this.getTeamData());
    this.root.querySelector(".import-area").value = data;

    // fetch(CONSTANTS.server_url+"storeteam", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ name: "testname", formation: data })
    // });


    // manza pilleria
    // const blob = new Blob([data], { type: "application/json" });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = `${this.teamName.replace(/\s+/g, "_")}.json`;
    // document.body.appendChild(a);
    // a.click();
    // a.remove();
    // URL.revokeObjectURL(url);
  }

  importTeam() {
    this.loadTeamData(JSON.parse(this.root.querySelector(".import-area").value || "[]"));
    localStorage.setItem(this.teamName, this.root.querySelector(".import-area").value);
  }

  triggerUpdate() {
    if (typeof this.onUpdate === "function") {
      this.onUpdate(this.getTeamData());
    }
  }
}