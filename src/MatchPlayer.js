import { t } from './i18n.js';

const DEFAULT_TICK_SPEED_MS = 20;
const DEFAULT_TICKS_PER_FRAME = 1;

export class MatchPlayer {
  constructor({ render, teamA, teamB, logSystem, summaryRenderer }) {
    this.tickSpeedMs = DEFAULT_TICK_SPEED_MS;
    this.ticksPerFrame = DEFAULT_TICKS_PER_FRAME;
    this.render = render;
    this.teamA = teamA;
    this.teamB = teamB;
    this.logSystem = logSystem;
    this.summaryRenderer = summaryRenderer;

    this.match = null;
    this.summary = null;
    this.currentTick = 0;
    this.timeoutId = null;

    this.scoreAEl = document.getElementById("teamascore");
    this.scoreBEl = document.getElementById("teambscore");
    this.ballTeamEl = document.getElementById("ballteam");
    this.progressEl = document.getElementById("matchpercent");
  }

  get isFinished() {
    return !!this.match && this.currentTick >= this.match.length;
  }

  /** True when preview of default positions should be shown on canvas */
  get canPreview() {
    return !this.match || this.currentTick === 0 || this.isFinished;
  }

  load(match, summary) {
    this.match = match;
    this.summary = summary;
    this._reset();
  }

  play() {
    if (!this.match || this.timeoutId || this.isFinished) return;
    this._renderTick(true);
  }

  pause() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  setTick(tick) {
    this.currentTick = tick;
    this.logSystem.block(true);
    this._renderTick(false);
    this.logSystem.block(false);
  }

  _reset() {
    this.currentTick = 0;
    this.scoreAEl.textContent = 0;
    this.scoreBEl.textContent = 0;
    this.progressEl.textContent = 0;
    this.logSystem.reset();
    this.teamA.setMyTeamHasBall(false);
    this.teamB.setMyTeamHasBall(false);
  }

  _renderTick(loop = true) {
    const steps = loop ? this.ticksPerFrame : 1;

    for (let s = 0; s < steps; s++) {
      if (this.isFinished) break;

      const tick = this.match[this.currentTick];

      this.render.update(tick);
      this.logSystem.setContext(this.currentTick, this.match.length);

      tick.teamA.forEach((p, i) => this.teamA.players[i].setCurrentRule(p.condition));
      tick.teamB.forEach((p, i) => this.teamB.players[i].setCurrentRule(p.condition));

      this._updateBallPossession(tick.ownerTeam);

      if (tick.goal === "Team A") {
        this.scoreAEl.textContent = parseInt(this.scoreAEl.textContent) + 1;
      } else if (tick.goal === "Team B") {
        this.scoreBEl.textContent = parseInt(this.scoreBEl.textContent) + 1;
      }

      tick.logs.forEach(log => this.logSystem.addLog(log));

      if (loop) this.currentTick++;
    }

    this.progressEl.textContent = Math.floor(100 * this.currentTick / this.match.length);

    if (this.isFinished) {
      this.timeoutId = null;
      this.summaryRenderer.render(this.summary);
      return;
    }

    if (loop) {
      this.timeoutId = setTimeout(() => this._renderTick(true), this.tickSpeedMs);
    }
  }

  _updateBallPossession(ownerTeam) {
    if (ownerTeam === "Team A") {
      this.ballTeamEl.innerHTML = `<span class='teamacolor'>${this.teamA.getTeamName()}</span>`;
      this.teamA.setMyTeamHasBall(true);
      this.teamB.setMyTeamHasBall(false);
    } else if (ownerTeam === "Team B") {
      this.ballTeamEl.innerHTML = `<span class='teambcolor'>${this.teamB.getTeamName()}</span>`;
      this.teamA.setMyTeamHasBall(false);
      this.teamB.setMyTeamHasBall(true);
    } else {
      this.ballTeamEl.textContent = t('free_ball');
      this.teamA.setMyTeamHasBall(false);
      this.teamB.setMyTeamHasBall(false);
    }
  }
}
