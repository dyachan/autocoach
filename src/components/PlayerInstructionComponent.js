export class PlayerInstructionComponent {
  constructor(playerName, conditions, actions, defaultZone, onUpdate) {
    this.playerName = playerName;
    this.conditions = conditions;
    this.actions = actions;
    this.defaultZone = defaultZone;
    this.onUpdate = onUpdate;
    this.rules = [];
    this.myTeamHasBall = false;
    this.teamColor = null;
    this.teamBackground = null;
    
    this.root = null;
    this.rulesContainer = null;
    this.createUI();
    
    this.hasBallContainer = this.root.querySelectorAll("article");
  }

  setMyTeamHasBall(value){
    if(value){
      this.hasBallContainer[0].classList.add("active");
      this.hasBallContainer[1].classList.remove("active");
      this.myTeamHasBall = true;
    } else {
      this.hasBallContainer[1].classList.add("active");
      this.hasBallContainer[0].classList.remove("active");
      this.myTeamHasBall = false;
    }

    // inactive rules
    this.hasBallContainer[value ? 1 : 0].querySelectorAll(".rule-item").forEach(rule => {
      rule.classList.remove("active");
    });
    this.hasBallContainer[value ? 1 : 0].querySelector(".defaultaction").classList.remove("active");
  }

  setCurrentRule(ruleString){
    let containerIndex = this.myTeamHasBall ? 0 : 1;
    
    this.hasBallContainer[containerIndex].querySelectorAll(".rule-item").forEach(rule => {
      const condSelect = rule.querySelector(".rule-condition");
      if (condSelect.value === ruleString) {
        rule.classList.add("active");
      } else {
        rule.classList.remove("active");
      }
    });

    if(ruleString == "Default"){
      this.hasBallContainer[containerIndex].querySelector(".defaultaction").classList.add("active");
    } else {
      this.hasBallContainer[containerIndex].querySelector(".defaultaction").classList.remove("active");
    }
  }


  /** Creates the component UI from HTML templates */
  createUI() {
    const tpl = document.getElementById("tpl-player-instruction");
    const node = tpl.content.cloneNode(true);
    const container = node.querySelector(".player-instructions");

    // Set player name
    container.querySelector(".player-name").textContent = this.playerName;

    // Bind internal elements
    this.rulesContainer = container.querySelectorAll(".rules-container");

    // Add event create rule
    container.querySelectorAll(".btn-add-rule").forEach((btn, index) => {
      const container = this.rulesContainer[index];
      btn.addEventListener("click", () => {
        container.appendChild(this.createRule());
        this.updateUpAndDownDisabled(container)
      });
    });
    
    // set default action
    container.querySelectorAll(".defaultaction").forEach( (element) => {
      element.textContent = this.actions[0];
    });

    // Compute total budget
    const statInputs = container.querySelectorAll(".stat-input");
    this.maxTotal = statInputs.length * 0.5;

    this.root = container;
    this.updateStatsDisplay();
    this.setDefaultZoneValues();
    this.root.querySelector(".defaultzonex").addEventListener("change", () => {
      document.updatePlayersDefaultPosition();
    })
    this.root.querySelector(".defaultzoney").addEventListener("change", () => {
      document.updatePlayersDefaultPosition();
    })

    // Toggle stats panel visibility
    const statsSection = container.querySelector(".player-stats-container");
    statsSection.style.display = "none";
    container.querySelector(".btn-stats").addEventListener("click", () => {
      statsSection.style.display = statsSection.style.display === "none" ? null : "none";
    });

    // Update output label, enforce budget cap, and trigger update
    statInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const allInputs = Array.from(this.root.querySelectorAll(".stat-input"));
        const sum = allInputs.reduce((acc, i) => acc + parseFloat(i.value), 0);
        if (sum > this.maxTotal) {
          input.value = Math.max(0, Math.round((parseFloat(input.value) - (sum - this.maxTotal)) * 100) / 100);
        }
        input.closest("label").querySelector("output").value = parseFloat(input.value).toFixed(2);
        this.updateStatsDisplay();
      });
      input.addEventListener("change", () => this.triggerUpdate());
    });

    return container;
  }

  setTeamColor(colorClass, bgColorClass, aColorClass){
    this.teamColor = colorClass;
    this.teamBackground = bgColorClass;
    this.root.querySelector(".player-name").classList.add(colorClass);
    this.root.querySelector(".btn-stats").classList.add(bgColorClass);
    this.root.querySelectorAll(".btn-add-rule").forEach( (b) => b.classList.add(bgColorClass) );
    this.root.querySelectorAll(".stat-input").forEach( (b) => b.classList.add(aColorClass) );
  }

  setDefaultZoneValues(){
    this.root.querySelector(".defaultzonex").value = this.defaultZone.x;
    this.root.querySelector(".defaultzoney").value = this.defaultZone.y;
  }
  getDefaultZoneValues(){
    return {
      x: this.root.querySelector(".defaultzonex").value,
      y: this.root.querySelector(".defaultzoney").value
    };
  }

  getStats() {
    const stats = {};
    this.root.querySelectorAll(".stat-input").forEach((input) => {
      stats[input.dataset.stat] = parseFloat(input.value);
    });
    return stats;
  }

  setStats(stats) {
    if (!stats) return;
    this.root.querySelectorAll(".stat-input").forEach((input) => {
      if (stats[input.dataset.stat] !== undefined) {
        input.value = stats[input.dataset.stat];
        input.closest("label").querySelector("output").value = parseFloat(input.value);
      }
    });
    this.updateStatsDisplay();
  }

  updateStatsDisplay() {
    const allInputs = Array.from(this.root.querySelectorAll(".stat-input"));
    const sum = allInputs.reduce((acc, i) => acc + parseFloat(i.value), 0);
    this.root.querySelector(".stat-total-display").textContent =
      `${Math.round(sum * 100) / 100} / ${this.maxTotal}`;
  }

  /** Create a new rule row */
  createRule(condition = null, action = null) {
    const tpl = document.getElementById("tpl-rule-item");
    const node = tpl.content.cloneNode(true);
    const ruleEl = node.querySelector(".rule-item");

    const selectCond = ruleEl.querySelector(".rule-condition");
    const selectAct = ruleEl.querySelector(".rule-action");
    const btnUp = ruleEl.querySelector(".btn-up");
    const btnDown = ruleEl.querySelector(".btn-down");
    const btnDelete = ruleEl.querySelector(".btn-delete");

    // Fill selects
    this.conditions.forEach((c) => {
      const opt = document.createElement("option");
      opt.textContent = c;
      selectCond.appendChild(opt);
    });
    this.actions.forEach((a) => {
      const opt = document.createElement("option");
      opt.textContent = a;
      selectAct.appendChild(opt);
    });

    // Apply defaults
    if (condition) selectCond.value = condition;
    if (action) selectAct.value = action;

    // Event listeners
    selectCond.addEventListener("change", () => this.triggerUpdate());
    selectAct.addEventListener("change", () => this.triggerUpdate());

    btnDelete.addEventListener("click", () => {
      const container = ruleEl.closest(".rules-container")
      ruleEl.remove();
      this.updateUpAndDownDisabled(container);
      this.triggerUpdate();
    });

    btnUp.classList.add(this.teamBackground);
    btnUp.addEventListener("click", () => {
      const prev = ruleEl.previousElementSibling;
      if (prev){
        const container = ruleEl.closest(".rules-container");
        container.insertBefore(ruleEl, prev);
        this.updateUpAndDownDisabled(container);
      }
      this.triggerUpdate();
    });

    btnDown.classList.add(this.teamBackground);
    btnDown.addEventListener("click", () => {
      const next = ruleEl.nextElementSibling;
      if (next){
        const container = ruleEl.closest(".rules-container");
        container.insertBefore(next, ruleEl);
        this.updateUpAndDownDisabled(container);
        this.triggerUpdate();
      }
    });

    this.triggerUpdate();

    return ruleEl;
  }

  /** Returns the current rules as structured JSON */
  getRules() {
    const rules = [[], []];
    this.rulesContainer.forEach((container, index) => {
      container.querySelectorAll(".rule-item").forEach((el) => {
        const cond = el.querySelector(".rule-condition").value;
        const act = el.querySelector(".rule-action").value;
        rules[index].push({ condition: cond, action: act });
      });
    });
    return rules;
  }

  /** Rebuilds from a JSON array */
  loadRules(ruleArray) {
    this.rulesContainer.forEach( (c) => {
      c.innerHTML = "";
    });
    ruleArray.forEach( (rules, i) => {
      rules.forEach( (r) => {
        this.rulesContainer[i].appendChild( this.createRule(r.condition, r.action) );
      });
      this.updateUpAndDownDisabled(this.rulesContainer[i]);
    });
  }

  /** Triggers the external update callback */
  triggerUpdate() {
    if (typeof this.onUpdate === "function") {
      this.onUpdate(this.getRules());
    }
  }

  updateUpAndDownDisabled(container) {
    const items = Array.from(container.querySelectorAll(".rule-item"));

    items.forEach((item, index) => {
      const btnUp = item.querySelector(".btn-up");
      const btnDown = item.querySelector(".btn-down");

      // disable / enable up
      btnUp.disabled = index === 0;

      // disable / enable down
      btnDown.disabled = index === items.length - 1;
    });
  }
}