import { t } from './i18n.js';

export class RoguelikeUI {
  constructor(root, session) {
    this.session = session;
    this.root    = root;
    this._viewTurn    = root.querySelector('#rogue-view-turn');
    this._viewResult  = root.querySelector('#rogue-view-result');
    this._viewGameover= root.querySelector('#rogue-view-gameover');

    this._render();
  }

  _show(view) {
    this._viewTurn.style.display    = view === 'turn'    ? null : 'none';
    this._viewResult.style.display  = view === 'result'  ? null : 'none';
    this._viewGameover.style.display= view === 'gameover'? null : 'none';
  }

  _render() {
    const s = this.session;
    const r = this.root;

    if (s.isGameOver) {
      this.showEnded('rogue_game_over');
      return;
    }

    this._show('turn');
    r.querySelector('#rogue-turn-label').textContent = `${s.turn} = `;
    r.querySelector('#rogue-record-label').textContent = `${s.wins} + ${s.draws} + ${s.losses} (/5)`;
    const playBtn = r.querySelector('#rogue-play-btn');
    playBtn.textContent = s.isStarted ? t('rogue_play_btn') : t('rogue_create_btn');
    playBtn.disabled = false;
  }

  showEnded(titleKey = 'rogue_game_over') {
    this._show('gameover');
    const s = this.session;
    this.root.querySelector('#rogue-ended-title').textContent = t(titleKey);
    this.root.querySelector('#rogue-final-record').textContent =
      `${s.wins}W  ${s.draws}D  ${s.losses}L`;
  }

  showFrontier() {
    this._show('result');
    this.root.querySelector('#rogue-result-label').textContent = t('rogue_no_opponent');
    this.root.querySelector('#rogue-opponent-label').textContent = '';
  }

  showResult(result, goalsFor, goalsAgainst, opponentName) {
    const labelKey = { win: 'rogue_result_win', loss: 'rogue_result_loss', draw: 'rogue_result_draw' }[result];
    this._show('result');
    this.root.querySelector('#rogue-result-label').textContent =
      `${labelKey ? t(labelKey) : result}  ${goalsFor} - ${goalsAgainst}`;
    this.root.querySelector('#rogue-opponent-label').textContent =
      `${t('rogue_vs')} ${opponentName}`;
  }

  refresh() { this._render(); }
}
