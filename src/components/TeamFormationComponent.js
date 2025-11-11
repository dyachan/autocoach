import { PlayerInstructionComponent } from "./PlayerInstructionComponent.js";

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

  setCurrentRule(player, rule){
    this.players.forEach( (p) => {
      if(p.playerName === player.name){
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
    if (titleEl) titleEl.textContent = this.teamName;

    // players wrapper where PlayerInstructionComponents will be mounted
    const playersWrapper = container.querySelector(".players-wrapper");

    // create the 3 player instruction components and mount their UI
    this.roles.forEach((role, idx) => {
      const playerComp = new PlayerInstructionComponent(
        role,
        this.conditions,
        this.actions,
        () => this.triggerUpdate()
      );

      playersWrapper.appendChild(playerComp.root);
      this.players.push(playerComp);
    });

    // wire import/export buttons from the template
    const btnExport = container.querySelector(".btn-export-team");
    const btnImport = container.querySelector(".btn-import-team");

    if (btnExport) {
      btnExport.addEventListener("click", () => this.exportTeam());
    }

    if (btnImport) {
      btnImport.addEventListener("click", () => this.importTeam());
    }

    this.root = container;
    return container;
  }

  getTeamData() {
    const team = {
      teamName: this.teamName,
      players: this.players.map((p) => ({
        name: p.playerName,
        rules: p.getRules(),
      })),
    };
    return team;
  }

  loadTeamData(teamData) {
    if (!teamData || !Array.isArray(teamData.players)) return;
    teamData.players.forEach((pd, idx) => {
      if (this.players[idx]) {
        this.players[idx].loadRules(pd.rules || [[],[]]);
      }
    });
    this.triggerUpdate();
  }

  exportTeam() {
    const data = JSON.stringify(this.getTeamData(), null, 2);
    this.root.querySelector(".import-area").value = data;

    // manza pilleria
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.teamName.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  importTeam() {
    this.loadTeamData(JSON.parse(this.root.querySelector(".import-area").value || "[]"));
  }

  triggerUpdate() {
    if (typeof this.onUpdate === "function") {
      this.onUpdate(this.getTeamData());
    }
  }
}