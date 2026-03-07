export class SummaryRenderer {
  constructor(containerEl, getTeamAName, getTeamBName) {
    this.el = containerEl;
    this.getTeamAName = getTeamAName;
    this.getTeamBName = getTeamBName;
  }

  render(summary) {
    // Team B first so Team A ends up on top (insertBefore firstChild)
    this._renderTeam({
      name: this.getTeamBName(),
      colorClass: "teambcolor",
      possession: summary.possessionB,
      goals: summary.GoalsB,
      players: summary.TeamB,
      totalTime: summary.totalTime,
    });
    this._renderTeam({
      name: this.getTeamAName(),
      colorClass: "teamacolor",
      possession: summary.possessionA,
      goals: summary.GoalsA,
      players: summary.TeamA,
      totalTime: summary.totalTime,
    });
  }

  _renderTeam({ name, colorClass, possession, goals, players, totalTime }) {
    const tpl = document.getElementById("tpl-team-summary-item");
    const node = tpl.content.cloneNode(true);

    const legend = node.querySelector("legend");
    legend.textContent = name;
    legend.classList.add(colorClass);

    node.querySelector(".summary-possession-value").textContent =
      Math.round(100 * possession / totalTime) + "%";
    node.querySelector(".summary-goals-value").textContent = goals;

    const container = node.querySelector(".team-summary-item");
    players.forEach(p => container.appendChild(this._renderPlayer(p, colorClass)));

    this.el.insertBefore(container, this.el.firstChild);
  }

  _renderPlayer(p, colorClass) {
    const tpl = document.getElementById("tpl-player-summary-item");
    const node = tpl.content.cloneNode(true);

    const nameEl = node.querySelector(".summary-name");
    nameEl.textContent = p.name;
    nameEl.classList.add(colorClass);

    node.querySelector(".summary-distance-value").textContent =
      Math.round(p.distanceTraveled) + " (" + Math.round(p.distanceTraveledWithBall) + ")";
    node.querySelector(".summary-marked-value").textContent =
      Math.round(p.timeMarkedWithPossession) + "% - " + Math.round(p.timeMarkedWithoutPossession) + "%";
    node.querySelector(".summary-control-value").textContent =
      p.controledBalls + " - " + p.interceptedBalls;
    node.querySelector(".summary-pass-value").textContent =
      p.passesMade + " (" + p.passesAchieved + ")";
    node.querySelector(".summary-shoot-value").textContent =
      p.shootMade + " (" + p.goals + ")";
    node.querySelector(".summary-challenged-value").textContent =
      p.challengedMeWithBall + " - " + p.challengedRivalWithBall;
    node.querySelector(".summary-steal-value").textContent =
      (p.takedoffBalls + p.stealedBalls) + " (" + p.stealedBalls + ")";
    node.querySelector(".summary-dribbled-value").textContent =
      p.dribbleDone + " - " + p.dribbleFailed;

    return node.querySelector(".player-summary-item");
  }
}
