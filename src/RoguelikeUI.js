import { t } from './i18n.js';

export class RoguelikeUI {
  constructor(session, onPlay, onNextTurn, onReset) {
    this.session    = session;
    this.onPlay     = onPlay;
    this.onNextTurn = onNextTurn;
    this.onReset    = onReset;
    this.root = document.createElement('div');
    this.root.className = 'roguelike-panel';
    this._render();
  }

  _render() {
    const s = this.session;

    if (s.isGameOver) {
      this.root.innerHTML = `
        <strong>${t('rogue_game_over')}</strong>
        <span>${s.wins}W &nbsp; ${s.draws}D &nbsp; ${s.losses}L</span>
        <button id="rogue-reset">${t('rogue_reset_btn')}</button>`;
      this.root.querySelector('#rogue-reset').addEventListener('click', this.onReset);
      return;
    }

    this.root.innerHTML = `
      <span>${t('rogue_turn')} ${s.turn + 1}</span>
      <span>&#10060; ${s.losses}/5 &nbsp; &#9989; ${s.wins} &nbsp; = ${s.draws}</span>
      <span>${t('rogue_max_rules')}: ${s.maxRulesPerSection}</span>
      <button id="rogue-play">${s.isStarted ? t('rogue_play_btn') : t('rogue_create_btn')}</button>`;
    this.root.querySelector('#rogue-play').addEventListener('click', this.onPlay);
  }

  showResult(result, goalsFor, goalsAgainst, opponentName) {
    const labelKey = { win: 'rogue_result_win', loss: 'rogue_result_loss', draw: 'rogue_result_draw' }[result];
    const label = labelKey ? t(labelKey) : result;
    this.root.innerHTML = `
      <strong>${label} &nbsp; ${goalsFor} - ${goalsAgainst}</strong>
      <span>${t('rogue_vs')} ${opponentName}</span>
      <span>${t('rogue_distribute')}</span>
      <button id="rogue-next">${t('rogue_next_btn')}</button>`;
    this.root.querySelector('#rogue-next').addEventListener('click', this.onNextTurn);
  }

  refresh() { this._render(); }
}
