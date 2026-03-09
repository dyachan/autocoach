import { t } from './i18n.js';

export class RoguelikeUI {
  constructor(session, onPlay, onNextTurn, onReset) {
    this.session    = session;
    this.onPlay     = onPlay;
    this.onNextTurn = onNextTurn;
    this.onReset    = onReset;

    this.root         = document.getElementById('roguelike-panel');
    this._viewTurn    = document.getElementById('rogue-view-turn');
    this._viewResult  = document.getElementById('rogue-view-result');
    this._viewGameover= document.getElementById('rogue-view-gameover');

    document.getElementById('rogue-play-btn').addEventListener('click', () => this.onPlay());
    document.getElementById('rogue-next-btn').addEventListener('click', () => this.onNextTurn());
    document.getElementById('rogue-reset-btn').addEventListener('click', () => this.onReset());

    this._render();
  }

  _show(view) {
    this._viewTurn.style.display    = view === 'turn'    ? null : 'none';
    this._viewResult.style.display  = view === 'result'  ? null : 'none';
    this._viewGameover.style.display= view === 'gameover'? null : 'none';
  }

  _render() {
    const s = this.session;

    if (s.isGameOver) {
      this._show('gameover');
      document.getElementById('rogue-final-record').textContent =
        `${s.wins}W  ${s.draws}D  ${s.losses}L`;
      return;
    }

    this._show('turn');
    document.getElementById('rogue-turn-label').textContent =
      `${t('rogue_turn')} ${s.turn + 1}`;
    document.getElementById('rogue-record-label').textContent =
      `❌ ${s.losses}/5  ✅ ${s.wins}  = ${s.draws}`;
    document.getElementById('rogue-rules-label').textContent =
      `${t('rogue_max_rules')}: ${s.maxRulesPerSection}`;
    document.getElementById('rogue-play-btn').textContent =
      s.isStarted ? t('rogue_play_btn') : t('rogue_create_btn');
  }

  showResult(result, goalsFor, goalsAgainst, opponentName) {
    const labelKey = { win: 'rogue_result_win', loss: 'rogue_result_loss', draw: 'rogue_result_draw' }[result];
    this._show('result');
    document.getElementById('rogue-result-label').textContent =
      `${labelKey ? t(labelKey) : result}  ${goalsFor} - ${goalsAgainst}`;
    document.getElementById('rogue-opponent-label').textContent =
      `${t('rogue_vs')} ${opponentName}`;
  }

  refresh() { this._render(); }
}
