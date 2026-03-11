import { PlayerInstructionComponent } from "./PlayerInstructionComponent.js";
import { CONSTANTS } from "../Constants.js";
import { t } from '../i18n.js';

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
      // player.setCurrentRule("");
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
        playerComp.setTeamColor("teamacolor", "teamabgcolor", "teamaacolor");
      } else {
        playerComp.setTeamColor("teambcolor", "teambbgcolor", "teambacolor");
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

    if (this.teamName === "Team A") {
      const rogueTpl = document.getElementById("tpl-roguelike-panel");
      const rogueNode = rogueTpl.content.cloneNode(true);
      container.querySelector(".btn-upload-team").before(rogueNode);
    }

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
        defaultZone: p.getDefaultZoneValues(),
        ...p.getStats()
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
        this.players[idx].setStats(pd);
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
    for (let formation of this.formations) {
      if (formation.name == name) {
        const teamData = {
          players: formation.configuration.map(p => ({
            name:            p.name,
            rules:           [p.rules_with_ball || [], p.rules_without_ball || []],
            defaultZone:     { x: p.default_zone_x, y: p.default_zone_y },
            maxSpeed:        p.max_speed,
            accuracy:        p.accuracy,
            control:         p.control,
            reaction:        p.reaction,
            dribble:         p.dribble,
            strength:        p.strength,
            endurance:       p.endurance,
            scanWithBall:    p.scan_with_ball,
            scanWithoutBall: p.scan_without_ball,
          }))
        };
        this.loadTeamData(teamData);
        this.root.querySelector(".team-name").value = formation.name;
        break;
      }
    }
  }

  uploadTeam() {
    const messages = [
      t('upload_confirm_1'),
      t('upload_confirm_2'),
      t('upload_confirm_3'),
    ];
    
    if(this.currentUploadClick < messages.length){ // before upload
      this.root.querySelector(".team-message").textContent = messages[this.currentUploadClick];
      this.root.querySelector(".team-message").style.display = null;
      this.currentUploadClick++
      if(this.currentUploadTimeout){
        clearTimeout(this.currentUploadTimeout);
        this.currentUploadTimeout = null;
      }
      this.currentUploadTimeout = setTimeout(() => {
        this.currentUploadClick = 0;
        this.root.querySelector(".team-message").textContent = "";
        this.root.querySelector(".team-message").style.display = "none";
      }, 5000);
    } else { // upload
      clearTimeout(this.currentUploadTimeout);
      this.currentUploadTimeout = null;
      this.currentUploadClick = 0;
      this.root.querySelector(".team-message").textContent = t('uploading');
      this.root.querySelector(".team-message").style.display = null;
      this.root.querySelector(".btn-upload-team").disabled = true;
      const configuration = this.players.map(p => {
        const stats = p.getStats();
        const rules = p.getRules();
        const zone  = p.getDefaultZoneValues();
        return {
          name:               p.playerName,
          default_zone_x:     parseFloat(zone.x),
          default_zone_y:     parseFloat(zone.y),
          max_speed:          stats.maxSpeed,
          accuracy:           stats.accuracy,
          control:            stats.control,
          reaction:           stats.reaction,
          dribble:            stats.dribble,
          strength:           stats.strength,
          endurance:          stats.endurance,
          scan_with_ball:     stats.scanWithBall    ?? null,
          scan_without_ball:  stats.scanWithoutBall ?? null,
          rules_with_ball:    rules[0],
          rules_without_ball: rules[1],
        };
      });

      fetch(CONSTANTS.server_url+"storeteam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.getTeamName(), configuration })
      }).then( (response) => {
        return response.json();
      }).then( (response) => {
        if (response.data) {
          this.root.querySelector(".team-message").textContent = t('uploaded_success');
          this.root.querySelector(".team-message").style.display = null;
          document.updateTeams();
        } else {
          const error = response.message || Object.values(response.errors || {})[0]?.[0] || t('error');
          this.root.querySelector(".team-message").textContent = error + " :(";
          this.root.querySelector(".team-message").style.display = null;
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

  // ── Roguelike methods ────────────────────────────────────────────

  /** Hides team-management controls and limits rules per section. */
  setRoguelikeMode(maxRules) {
    this.root.querySelector('.btn-upload-team').style.display = 'none';
    this.root.querySelector('.btn-select-team').style.display = 'none';
    this.root.querySelector('.team-selection').style.display = 'none';
    this.root.querySelector('.btn-export-team').closest('label').style.display = 'none';
    this.root.querySelector('.btn-change-team').style.display = 'none';
    this.players.forEach(p => p.setMaxRules(maxRules));
  }

  /**
   * Lock or unlock all interactive elements (inputs, selects, buttons)
   * except the team-toggle button. Used to enforce read-only phases.
   */
  setReadOnly(readOnly) {
    this.root.querySelectorAll('input, select, button:not(.btn-change-team):not(.btn-stats)')
      .forEach(el => {
        if (!el.closest('#roguelike-panel')) el.disabled = readOnly;
      });
  }

  setNameEditable(editable) {
    this.root.querySelector('.team-name').disabled = !editable;
  }

  setCounters(counters) {
    const el = this.root.querySelector('.other-team-counters');
    if (!counters) { el.textContent = ''; return; }
    const { wins = 0, draws = 0, losses = 0, matches_played = 0 } = counters;
    el.textContent = `${matches_played} = ${wins} + ${draws} + ${losses}`;
  }

  /** Updates the max-rules limit without recreating any component. */
  updateRoguelikeRules(maxRules) {
    this.players.forEach(p => p.setMaxRules(maxRules));
  }

  /** Locks current stats and opens a new delta budget for the next turn. */
  startNewTurnDistribution(delta = 0.5) {
    this.players.forEach(p => {
      p.lockCurrentStats();
      p.enableDeltaBudget(delta);
    });
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