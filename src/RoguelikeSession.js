const STORAGE_KEY = 'roguelike';

export class RoguelikeSession {
  constructor() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    this.teamId        = saved?.teamId        ?? null;
    this.turn          = saved?.turn          ?? 0;
    this.wins          = saved?.wins          ?? 0;
    this.draws         = saved?.draws         ?? 0;
    this.losses        = saved?.losses        ?? 0;
    this.matchesPlayed = saved?.matchesPlayed ?? 0;
  }

  get isStarted()  { return this.teamId !== null; }
  get isGameOver() { return this.losses >= 5; }

  /** 1 rule at turn 0, +1 every 3 completed turns */
  get maxRulesPerSection() {
    return 1 + Math.floor(this.turn / 3);
  }

  applyMatchResult({ result, team }) {
    this.wins          = team.wins;
    this.draws         = team.draws;
    this.losses        = team.losses;
    this.matchesPlayed = team.matches_played;
    this.turn         += 1;
    this.save();
  }

  setTeamId(id) {
    this.teamId = id;
    this.save();
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.teamId        = null;
    this.turn          = 0;
    this.wins          = 0;
    this.draws         = 0;
    this.losses        = 0;
    this.matchesPlayed = 0;
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      teamId:        this.teamId,
      turn:          this.turn,
      wins:          this.wins,
      draws:         this.draws,
      losses:        this.losses,
      matchesPlayed: this.matchesPlayed,
    }));
  }
}
