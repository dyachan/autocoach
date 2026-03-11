export class RoguelikeSession {
  constructor() {
    this.teamId        = null;
    this.playerIds     = [];
    this.turn          = 0;
    this.wins          = 0;
    this.draws         = 0;
    this.losses        = 0;
    this.matchesPlayed = 0;
  }

  get isStarted()  { return this.teamId !== null; }
  get isGameOver() { return this.losses >= 5; }

  /** 1 rule at turn 0, +1 every 3 completed turns */
  get maxRulesPerSection() {
    return 1 + Math.floor(this.turn / 3);
  }

  applyMatchResult({ team }) {
    this.wins          = team.wins;
    this.draws         = team.draws;
    this.losses        = team.losses;
    this.matchesPlayed = team.matches_played;
    this.turn         += 1;
  }

  setTeamId(id) {
    this.teamId = id;
  }

  setPlayerIds(ids) {
    this.playerIds = ids;
  }

  reset() {
    this.teamId        = null;
    this.playerIds     = [];
    this.turn          = 0;
    this.wins          = 0;
    this.draws         = 0;
    this.losses        = 0;
    this.matchesPlayed = 0;
  }
}
