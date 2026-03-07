export class LogSystem {
  constructor(containerEl, getTeamAName, getTeamBName) {
    this.el = containerEl;
    this.getTeamAName = getTeamAName;
    this.getTeamBName = getTeamBName;

    this.blocked = false;
    this.maxTickLog = 0;
    this.currentTick = 0;
    this.matchLength = 0;
    this.onSeekTick = null; // callback(tick) when a log entry button is clicked
  }

  reset() {
    this.maxTickLog = 0;
  }

  block(value) {
    this.blocked = value;
  }

  setContext(currentTick, matchLength) {
    this.currentTick = currentTick;
    this.matchLength = matchLength;
  }

  addLog(log) {
    if (this.blocked) return;
    if (this.currentTick <= this.maxTickLog) return;

    const tpl = document.getElementById("tpl-log-item");
    const node = tpl.content.cloneNode(true);

    node.querySelector(".log-time").textContent =
      Math.ceil(100 * this.currentTick / this.matchLength) + "%";

    const btn = node.querySelector(".log-btn");
    const thisTick = this.currentTick;
    btn.addEventListener("click", () => this.onSeekTick?.(thisTick));

    const teamEl = node.querySelector(".log-team");
    if (log.startsWith("Team A")) {
      teamEl.classList.add("teamacolor");
      teamEl.textContent = this.getTeamAName();
    } else if (log.startsWith("Team B")) {
      teamEl.classList.add("teambcolor");
      teamEl.textContent = this.getTeamBName();
    }

    node.querySelector(".log-msg").textContent =
      log.replace("Team A", "").replace("Team B", "");

    this.el.insertBefore(node.querySelector(".log-item"), this.el.firstChild);
    this.maxTickLog = this.currentTick;
  }

  addRawEntry(text) {
    this.el.insertBefore(
      Object.assign(document.createElement("div"), { textContent: text }),
      this.el.firstChild
    );
  }
}
