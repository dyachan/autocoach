import { PlayerInstructionComponent } from "./PlayerInstructionComponent.js";
import { CONSTANTS } from "../Constants.js";

export class TeamFormationComponent {
  constructor(teamName, conditions, actions, onUpdate) {
    this.teamName = teamName;
    this.conditions = conditions;
    this.actions = actions;
    this.onUpdate = onUpdate;
    this.formations = []

    this.players = [];
    this.root = null;
    this.currentUploadClick = 0;
    this.currentUploadTimeout = null;

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
      {x: 50, y: 20},
      {x: 35, y: 50},
      {x: 65, y: 80}
    ];

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

    const btnSelectTeam = container.querySelector(".btn-select-team");
    btnSelectTeam.addEventListener("click", () => this.selectTeam());

    const btnUploadTeam = container.querySelector(".btn-upload-team");
    btnUploadTeam.addEventListener("click", () => this.uploadTeam());

    if(this.teamName === "Team A"){
      titleEl.classList.add("teamacolor");
      btnExport.classList.add("teamabgcolor");
      btnImport.classList.add("teamabgcolor");
      btnSelectTeam.classList.add("teamabgcolor");
      container.querySelector(".btn-change-team").classList.add("teambbgcolor");
    } else {
      titleEl.classList.add("teambcolor");
      btnExport.classList.add("teambbgcolor");
      btnImport.classList.add("teambbgcolor");
      btnSelectTeam.classList.add("teambbgcolor");
      container.querySelector(".btn-change-team").classList.add("teamabgcolor");
    }
    
    this.root = container;
    
    if(localStorage.getItem(this.teamName)){
      this.root.querySelector(".import-area").value = localStorage.getItem(this.teamName);
      this.importTeam();
    }
    return container;
  }

  getTeamName() {
    return this.root.querySelector(".team-name").value;
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

  selectTeam() {
    const name = this.root.querySelector(".team-selection").value;
    for(let formation of this.formations){
      if(formation.name == name){
        this.loadTeamData(JSON.parse(formation.formation));
        this.root.querySelector(".team-name").value = formation.name;
        break;
      }
    }
  }

  uploadTeam() {
    const messages = [
      "Upload this team?",
      "database is limited ...",
      "sure? sure? sure?",
    ];
    
    if(this.currentUploadClick < messages.length){ // before upload
      this.root.querySelector(".team-message").textContent = messages[this.currentUploadClick];
      this.currentUploadClick++
      if(this.currentUploadTimeout){
        clearTimeout(this.currentUploadTimeout);
        this.currentUploadTimeout = null;
      }
      this.currentUploadTimeout = setTimeout(() => {
        this.currentUploadClick = 0;
        this.root.querySelector(".team-message").textContent = "";
      }, 5000);
    } else { // upload
      clearTimeout(this.currentUploadTimeout);
      this.currentUploadTimeout = null;
      this.currentUploadClick = 0;
      this.root.querySelector(".team-message").textContent = "Uploading";
      this.root.querySelector(".btn-upload-team").disabled = true;
      fetch(CONSTANTS.server_url+"storeteam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.getTeamName(), formation: JSON.stringify(this.getTeamData()) })
      }).then( (response) => {
        return response.json();
      }).then( (response) => {
        if(response.success){
          this.root.querySelector(".team-message").textContent = "Uploaded :)";
          document.updateTeams();
        } else {
          this.root.querySelector(".team-message").textContent = response.error + " :(";
        }
        this.root.querySelector(".btn-upload-team").disabled = false;
      }).catch( (error) => {
        console.log(error);
      });
    }
  }

  triggerUpdate() {
    if (typeof this.onUpdate === "function") {
      this.onUpdate(this.getTeamData());
    }
  }

  setFormations(formations) {
    this.formations = formations;
    const selectDom = this.root.querySelector(".team-selection");

    while (selectDom.firstChild) {
      selectDom.removeChild(selectDom.lastChild);
    }

    formations.forEach( (formation) => {
      const opt = document.createElement("option");
      opt.textContent = formation.name;
      selectDom.appendChild(opt);
    });
  }
}