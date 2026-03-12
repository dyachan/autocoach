import { t } from '../i18n.js';

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

    // inactive rules other container
    this.hasBallContainer[value ? 1 : 0].querySelectorAll(".rule-item").forEach(rule => {
      rule.classList.remove("active");
    });
    this.hasBallContainer[value ? 1 : 0].querySelector(".defaultaction").classList.remove("active");
  }

  setCurrentRule(ruleId){
    let containerIndex = this.myTeamHasBall ? 0 : 1;

    this.hasBallContainer[containerIndex].querySelectorAll(".rule-item").forEach(rule => {
      const condSelect = rule.querySelector(".rule-condition");
      if (Number(condSelect.value) === ruleId) { // ruleId is an int from backend
        rule.classList.add("active");
      } else {
        rule.classList.remove("active");
      }
    });

    if(ruleId === null){ // null → no rule matched, default action is active
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
        this.updateUpAndDownDisabled(container);
        this._updateAddRuleButtons();
      });
    });
    
    // set default action
    container.querySelectorAll(".defaultaction").forEach( (element) => {
      element.dataset.i18n = this.actions[0].key; // A.STAY_IN_ZONE
      element.textContent = t(this.actions[0].key);
    });

    // No budget cap in simulator mode (null = unlimited)
    const statInputs = container.querySelectorAll(".stat-input");
    this.maxTotal = null;

    this.root = container;
    this.updateStatsDisplay();
    this.setDefaultZoneValues();
    this.root.querySelector(".defaultzonex").addEventListener("change", () => {
      this.triggerUpdate();
    })
    this.root.querySelector(".defaultzoney").addEventListener("change", () => {
      this.triggerUpdate();
    })

    // Toggle stats panel visibility
    const statsSection = container.querySelector(".player-stats-container");
    statsSection.style.display = "none";
    container.querySelector(".btn-stats").addEventListener("click", () => {
      statsSection.style.display = statsSection.style.display === "none" ? null : "none";
    });

    // Tactic panel
    const tacticPanel = container.querySelector(".tactic-panel");
    const btnTactic = container.querySelector(".btn-tactic");
    btnTactic.addEventListener("click", () => {
      const visible = tacticPanel.style.display !== "none";
      tacticPanel.style.display = visible ? "none" : null;
      if (!visible) this._refreshTacticSelect();
    });
    document.addEventListener("click", (e) => {
      if (tacticPanel.style.display !== "none"
          && !tacticPanel.contains(e.target)
          && e.target !== btnTactic) {
        tacticPanel.style.display = "none";
      }
    });
    container.querySelector(".tactic-name-input").placeholder = t("tactic_name_placeholder");
    container.querySelector(".btn-load-tactic").addEventListener("click", () => this._loadSelectedTactic());
    container.querySelector(".btn-save-tactic").addEventListener("click", () => this._saveCurrentTactic());

    // Update output label, enforce budget cap, and trigger update
    statInputs.forEach((input) => {
      input.addEventListener("input", () => {
        if (this.maxTotal !== null) {
          const allInputs = Array.from(this.root.querySelectorAll(".stat-input"));
          const sum = allInputs.reduce((acc, i) => acc + parseFloat(i.value), 0);
          if (sum > this.maxTotal) {
            input.value = Math.max(parseFloat(input.min || 0), Math.round((parseFloat(input.value) - (sum - this.maxTotal)) * 100) / 100);
          }
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
    this.root.querySelector(".stat-total-display").textContent = this.maxTotal === null
      ? `${Math.round(sum * 100) / 100}`
      : `${Math.round(sum * 100) / 100} / ${this.maxTotal}`;
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

    // Fill selects — value = numeric ID, text = translated label via i18n key
    this.conditions.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.dataset.i18n = c.key;
      opt.textContent = t(c.key);
      selectCond.appendChild(opt);
    });
    this.actions.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.dataset.i18n = a.key;
      opt.textContent = t(a.key);
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
      this._updateAddRuleButtons();
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
        const cond = Number(el.querySelector(".rule-condition").value); // int ID
        const act = Number(el.querySelector(".rule-action").value);     // int ID
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
    this._updateAddRuleButtons();
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

  // ── Roguelike methods ────────────────────────────────────────────

  /**
   * Sets all stats to 0.1 and locks them (used at the start of a roguelike run,
   * before the first match, when no budget is available yet).
   */
  initRoguelikeStats() {
    const initVal = 0.1;
    const statInputs = this.root.querySelectorAll('.stat-input');
    statInputs.forEach(input => {
      input.min = 0;
      input.style.width = '';
      input.value = initVal;
      input.closest('label').querySelector('output').value = initVal.toFixed(2);
      const lockedEl = input.closest('.stat-input-container')?.querySelector('.locked-stat');
      if (lockedEl) lockedEl.style.width = '';
    });
    this.maxTotal = Math.round(statInputs.length * initVal * 100) / 100;
    this.updateStatsDisplay();
    this.loadRules([[], []]);
    this.lockCurrentStats();
  }

  /** Restores unlimited stats (simulator mode). Undoes roguelike locking. */
  resetToSimulatorMode() {
    this.maxTotal = null;
    this.root.querySelectorAll('.stat-input').forEach(input => {
      input.disabled = false;
      input.min = 0;
      input.style.width = '';
      const lockedEl = input.closest('.stat-input-container')?.querySelector('.locked-stat');
      if (lockedEl) lockedEl.style.width = '';
    });
    this._lockedStats = {};
    this.updateStatsDisplay();
  }

  /** Disables the "+ Add Rule" button once the container reaches n rules. */
  setMaxRules(n) {
    this._maxRules = n;
    this._updateAddRuleButtons();
  }

  /** Freezes current stat values as the minimum floor for future turns. */
  lockCurrentStats() {
    this._lockedStats = {};
    this.root.querySelectorAll('.stat-input').forEach(input => {
      const lockedVal = parseFloat(input.value);
      this._lockedStats[input.dataset.stat] = lockedVal;
      input.min = input.value;
      input.disabled = true;
      const lockedEl = input.closest('.stat-input-container')?.querySelector('.locked-stat');
      if (lockedEl) {
        const lockedPct = parseFloat((lockedVal * 100).toFixed(1));
        lockedEl.style.width = lockedPct + '%';
        input.style.width = (100 - lockedPct) + '%';
      }
    });
  }

  /**
   * Re-enables stat sliders with a new budget of `delta` points on top of the
   * locked floor. The total cap becomes locked_total + delta.
   */
  enableDeltaBudget(delta) {
    const lockedTotal = Object.values(this._lockedStats || {}).reduce((a, b) => a + b, 0);
    this.maxTotal = Math.round((lockedTotal + delta) * 100) / 100;
    this.root.querySelectorAll('.stat-input').forEach(input => {
      input.disabled = false;
      input.min = this._lockedStats?.[input.dataset.stat] ?? 0;
    });
    this.updateStatsDisplay();
  }

  /** Keeps "+ Add Rule" buttons in sync with the current _maxRules limit. */
  _updateAddRuleButtons() {
    if (this._maxRules === undefined) return;
    this.rulesContainer.forEach(container => {
      const addBtn = container.closest('article')?.querySelector('.btn-add-rule');
      if (addBtn) addBtn.disabled = container.querySelectorAll('.rule-item').length >= this._maxRules;
    });
  }

  // ── Tactic panel ─────────────────────────────────────────────────

  static _STORAGE_KEY = 'player_tactics';

  static _readAll() {
    return JSON.parse(localStorage.getItem(PlayerInstructionComponent._STORAGE_KEY) || '[]');
  }

  static _writeAll(tactics) {
    localStorage.setItem(PlayerInstructionComponent._STORAGE_KEY, JSON.stringify(tactics));
  }

  _refreshTacticSelect() {
    const select = this.root.querySelector('.tactic-select');
    select.innerHTML = '';
    const all = PlayerInstructionComponent._readAll();
    const tactics = this._maxRules !== undefined
      ? all.filter(tac => tac.rules.every(section => section.length <= this._maxRules))
      : all;
    if (tactics.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = t('tactic_no_saved');
      select.appendChild(opt);
    } else {
      tactics.forEach((tac) => {
        const opt = document.createElement('option');
        opt.value = all.indexOf(tac);
        opt.textContent = tac.name;
        select.appendChild(opt);
      });
    }
  }

  _loadSelectedTactic() {
    const select = this.root.querySelector('.tactic-select');
    const idx = parseInt(select.value, 10);
    const tactics = PlayerInstructionComponent._readAll();
    if (!isNaN(idx) && tactics[idx]) {
      const tactic = tactics[idx];
      this.loadRules(tactic.rules);
      if (tactic.zone) {
        this.root.querySelector('.defaultzonex').value = tactic.zone.x;
        this.root.querySelector('.defaultzoney').value = tactic.zone.y;
        this.triggerUpdate();
      }
    }
  }

  _saveCurrentTactic() {
    const input = this.root.querySelector('.tactic-name-input');
    const name  = input.value.trim();
    if (!name) return;
    const tactics = PlayerInstructionComponent._readAll();
    const existing = tactics.findIndex(t => t.name === name);
    const entry = { name, rules: this.getRules(), zone: this.getDefaultZoneValues() };
    if (existing >= 0) {
      tactics[existing] = entry;
    } else {
      tactics.push(entry);
    }
    PlayerInstructionComponent._writeAll(tactics);
    input.value = '';
    this._refreshTacticSelect();
  }
}