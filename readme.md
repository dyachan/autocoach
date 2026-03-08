# simulation mode

you dont has performance counters. You can modify all players of both teams, change stats, and add as many rules as you want.You can simulate as many matches as you want. Can upload created team to community, and load community uploaded teams.

# roguelike mode

When you init this mode you get 3 players with 0.1 in all stats and they can only use 1 rule when the team has ball and only 1 rule when team dont has ball conditions. Must select rules for each player and when ready init match.

A match in this mode is play with another team with similar counters, created by another player in the past. Backend must give you the team.

The match modify the current player counters (wins, draw, losses, played matches).

The turn ends when backend send replay of match.

Backend keep a snapshot of team with player counters to use it in the future with others players. 

Next turn player has 0.5 points of stats to distribute in stats for each player. Prev stats cant be modified. Each 3 turns players can add another rule for "when has ball" and "when dont has ball".

If player get 5 losses the game is over.


claude:

Plan de implementación: Modo Roguelike
Contexto del proyecto
Frontend: /home/dmint/Desktop/monster/public/ — vanilla JS con ES modules, sin framework

Backend: /home/dmint/workspace/laraveltest/ — Laravel, API REST

Estado actual del frontend relevante
src/main.js — orquestador principal
src/components/TeamFormationComponent.js — panel de equipo (wrappea 3 PlayerInstructionComponent)
src/components/PlayerInstructionComponent.js — panel de un jugador (reglas + stats)
src/MatchPlayer.js — reproduce replay tick a tick
src/i18n.js + src/locales/{en,es,fr}.js — sistema de traducción con función t(key)
src/PlayerRules.js — exporta CONDITIONS y ACTIONS con {id, key} (sin label)
Estado actual del backend relevante
POST /teams — crea equipo, guarda en tabla teams con wins/draws/losses/matches_played
POST /match/play — recibe team_id, busca oponente por similitud de contadores (MatchmakingService), corre simulación, guarda GameMatch con snapshot del oponente, actualiza contadores → devuelve result + summary + counters (⚠️ falta el replay de ticks)
POST /teams/{team}/upgrade — sube un atributo en +0.05 (UPGRADE_DELTA)
POST /teams/{team}/rule — asigna regla {condition, action} a {position_index, slot, priority}
GET /match/history/{team} — historial de partidos
Cambios necesarios
1. Backend — app/Http/Controllers/MatchController.php
Único cambio: agregar match (replay de ticks) a la respuesta de play().


// Después de correr el loop de simulación, antes del return:
return response()->json([
    'result'         => $result,
    'goals_for'      => $goalsFor,
    'goals_against'  => $goalsAgainst,
    'opponent'       => ['id' => $opponent->id, 'name' => $opponent->name],
    'team'           => [
        'wins'           => $team->wins,
        'draws'          => $team->draws,
        'losses'         => $team->losses,
        'matches_played' => $team->matches_played,
    ],
    'match'   => $simulation->tickHistoric,   // ← AGREGAR
    'summary' => $summary,
]);
2. Frontend — archivos a crear
src/RoguelikeSession.js (nuevo)
Gestiona el estado persistente en localStorage bajo la clave 'roguelike'.


export class RoguelikeSession {
  constructor() {
    const saved = JSON.parse(localStorage.getItem('roguelike') || 'null');
    this.teamId        = saved?.teamId        ?? null;
    this.turn          = saved?.turn          ?? 0;   // 0 = no iniciado
    this.wins          = saved?.wins          ?? 0;
    this.draws         = saved?.draws         ?? 0;
    this.losses        = saved?.losses        ?? 0;
    this.matchesPlayed = saved?.matchesPlayed ?? 0;
  }

  get isStarted()  { return this.teamId !== null; }
  get isGameOver() { return this.losses >= 5; }
  get maxRulesPerSection() {
    // 1 regla al inicio, +1 cada 3 turnos completados
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
    localStorage.removeItem('roguelike');
    this.teamId = null;
    this.turn = this.wins = this.draws = this.losses = this.matchesPlayed = 0;
  }

  save() {
    localStorage.setItem('roguelike', JSON.stringify({
      teamId: this.teamId, turn: this.turn,
      wins: this.wins, draws: this.draws,
      losses: this.losses, matchesPlayed: this.matchesPlayed,
    }));
  }
}
src/RoguelikeUI.js (nuevo)
Panel de estado que se monta sobre el logEl existente o en un elemento nuevo.


import { t } from './i18n.js';
import { CONSTANTS } from './Constants.js';

export class RoguelikeUI {
  constructor(session, onStartMatch, onNextTurn, onReset) {
    this.session      = session;
    this.onStartMatch = onStartMatch; // callback: () => void
    this.onNextTurn   = onNextTurn;   // callback: () => void
    this.onReset      = onReset;      // callback: () => void
    this.root = document.createElement('div');
    this.root.className = 'roguelike-panel';
    this._render();
  }

  _render() {
    const s = this.session;
    if (s.isGameOver) {
      this.root.innerHTML = `
        <p>GAME OVER</p>
        <p>${s.wins}W ${s.draws}D ${s.losses}L</p>
        <button id="rogue-reset">Nueva partida</button>`;
      this.root.querySelector('#rogue-reset').addEventListener('click', this.onReset);
      return;
    }
    this.root.innerHTML = `
      <div>Turno: ${s.turn} | ❌ ${s.losses}/5 | ✓ ${s.wins} = ${s.draws}</div>
      <div>Reglas máx por sección: ${s.maxRulesPerSection}</div>
      ${!s.isStarted
        ? `<button id="rogue-start">Crear equipo e iniciar</button>`
        : `<button id="rogue-play">Jugar turno</button>`
      }`;
    this.root.querySelector('#rogue-start, #rogue-play')
      ?.addEventListener('click', this.onStartMatch);
  }

  showResult(result, goalsFor, goalsAgainst, opponentName) {
    this.root.innerHTML = `
      <div>Resultado: ${result.toUpperCase()} (${goalsFor} - ${goalsAgainst})</div>
      <div>vs ${opponentName}</div>
      <div>Distribuye 0.5 stats por jugador, luego:</div>
      <button id="rogue-next">Siguiente turno</button>`;
    this.root.querySelector('#rogue-next').addEventListener('click', this.onNextTurn);
  }

  refresh() { this._render(); }
}
3. Frontend — archivos a modificar
src/components/PlayerInstructionComponent.js
Agregar 3 métodos al final de la clase (antes del último }):


/** Limita el número de reglas por sección. Deshabilita + Add Rule si ya llegó al máximo. */
setMaxRules(n) {
  this._maxRules = n;
  this.rulesContainer.forEach(container => {
    const addBtn = container.closest('article').querySelector('.btn-add-rule');
    if (addBtn) addBtn.disabled = container.querySelectorAll('.rule-item').length >= n;
  });
}

/**
 * Bloquea los sliders en sus valores actuales como piso.
 * Llama a esto al inicio de cada turno DESPUÉS del turno 1.
 */
lockCurrentStats() {
  this._lockedStats = {};
  this.root.querySelectorAll('.stat-input').forEach(input => {
    const key = input.dataset.stat;
    this._lockedStats[key] = parseFloat(input.value);
    input.min = input.value; // No se puede bajar del valor actual
    input.disabled = true;   // Deshabilitar: el usuario no toca los bloqueados
  });
}

/**
 * Habilita distribución de `delta` puntos adicionales sobre los stats bloqueados.
 * Crea sliders separados (delta) o reactiva con nuevo cap.
 * Implementación simple: reactiva todos los sliders, fija min=locked y cap=locked_total+delta
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
También modificar el listener de input existente para respetar el min dinámico. Buscar la línea:


input.value = Math.max(0, Math.round(...))
Cambiarla a:


input.value = Math.max(parseFloat(input.min || 0), Math.round(...))
También modificar createRule() para respetar _maxRules al agregar regla desde loadRules(): después de container.appendChild(this.createRule(...)) en loadRules, llamar this.updateUpAndDownDisabled(...) (ya existe) y adicionalmente actualizar el estado del botón. Crear un helper:


_updateAddRuleButtons() {
  if (this._maxRules === undefined) return;
  this.rulesContainer.forEach(container => {
    const addBtn = container.closest('article').querySelector('.btn-add-rule');
    if (addBtn) addBtn.disabled = container.querySelectorAll('.rule-item').length >= this._maxRules;
  });
}
Llamar this._updateAddRuleButtons() al final de createRule() y loadRules().

src/components/TeamFormationComponent.js
Agregar al final de la clase:


/**
 * Activa restricciones del modo roguelike.
 * Oculta botones de upload/select/import/export.
 * Limita reglas a maxRules por sección en cada jugador.
 */
setRoguelikeMode(maxRules) {
  // Ocultar controles irrelevantes
  this.root.querySelector('.btn-upload-team').style.display = 'none';
  this.root.querySelector('.btn-select-team').closest('label').style.display = 'none';
  this.root.querySelector('.btn-export-team').closest('label').style.display = 'none';
  this.root.querySelector('.btn-change-team').style.display = 'none';
  // Limitar reglas en cada jugador
  this.players.forEach(p => p.setMaxRules(maxRules));
}

/** Actualiza el límite de reglas al avanzar de turno (sin recrear el componente). */
updateRoguelikeRules(maxRules) {
  this.players.forEach(p => p.setMaxRules(maxRules));
}

/** Bloquea stats actuales y abre delta budget para el nuevo turno. */
startNewTurnDistribution(delta = 0.5) {
  this.players.forEach(p => {
    p.lockCurrentStats();
    p.enableDeltaBudget(delta);
  });
}
src/main.js
Agregar al principio los imports necesarios:


import { RoguelikeSession } from './RoguelikeSession.js';
import { RoguelikeUI }      from './RoguelikeUI.js';
Agregar al final del archivo (después del bloque i18n existente) el bloque del modo roguelike:


// =====================
// MODO ROGUELIKE
// =====================
const rogueSession = new RoguelikeSession();
let rogueUI = null;
let isRoguelikeMode = false;

const toggleModeBtn = document.getElementById('btn-toggle-mode');

function enterRoguelikeMode() {
  isRoguelikeMode = true;
  toggleModeBtn.textContent = 'Modo Simulación';
  teamB.root.style.display = 'none';
  teamA.setRoguelikeMode(rogueSession.maxRulesPerSection);

  rogueUI = new RoguelikeUI(
    rogueSession,
    handleRoguePlay,   // onStartMatch / onPlay
    handleRogueNext,   // onNextTurn
    handleRogueReset,  // onReset
  );
  document.querySelector('.matchpanel').prepend(rogueUI.root);
  document.getElementById('btn-init-match').style.display = 'none';

  if (rogueSession.turn > 0) {
    // Reanudando sesión: aplicar estado de turno
    teamA.startNewTurnDistribution(0.5);
    teamA.updateRoguelikeRules(rogueSession.maxRulesPerSection);
  }
}

function exitRoguelikeMode() {
  isRoguelikeMode = false;
  toggleModeBtn.textContent = 'Modo Roguelike';
  teamB.root.style.display = null;
  rogueUI?.root.remove();
  rogueUI = null;
  document.getElementById('btn-init-match').style.display = null;
  // Restaurar TeamA (recargar sin restricciones)
  // Nota: los stats y reglas quedan en memoria; el usuario puede editar libremente
}

toggleModeBtn.addEventListener('click', () => {
  isRoguelikeMode ? exitRoguelikeMode() : enterRoguelikeMode();
});

async function handleRoguePlay() {
  if (!rogueSession.isStarted) {
    // Primer turno: crear equipo en backend con stats 0.1
    const teamData = teamA.getTeamData();
    const configuration = teamData.players.map(p => ({
      name:               p.name,
      default_zone_x:     parseFloat(p.defaultZone.x),
      default_zone_y:     parseFloat(p.defaultZone.y),
      max_speed:          0.1, accuracy: 0.1, control: 0.1,
      reaction:           0.1, dribble:  0.1, strength: 0.1,
      endurance:          0.1, scan_with_ball: null, scan_without_ball: null,
      rules_with_ball:    p.rules[0],
      rules_without_ball: p.rules[1],
    }));
    const teamName = teamA.getTeamName() + '_rogue_' + Date.now();
    const res = await fetch(CONSTANTS.server_url + 'teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, configuration }),
    }).then(r => r.json());
    rogueSession.setTeamId(res.data?.id ?? res.id);
  } else {
    // Turno N: sincronizar reglas en backend antes de jugar
    const teamData = teamA.getTeamData();
    for (let i = 0; i < teamData.players.length; i++) {
      const p = teamData.players[i];
      for (const [slotKey, slot] of [['with_ball', p.rules[0]], ['without_ball', p.rules[1]]]) {
        for (let j = 0; j < slot.length; j++) {
          await fetch(`${CONSTANTS.server_url}teams/${rogueSession.teamId}/rule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              position_index: i, slot: slotKey,
              priority: j, condition: slot[j].condition, action: slot[j].action,
            }),
          });
        }
      }
    }
  }

  // Jugar partida
  const data = await fetch(CONSTANTS.server_url + 'match/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_id: rogueSession.teamId }),
  }).then(r => r.json());

  rogueSession.applyMatchResult(data);

  // Reproducir como en modo simulación
  document.getElementById('pausebutton').disabled = false;
  document.getElementById('teamalabel').textContent = teamA.getTeamName();
  document.getElementById('teamblabel').textContent = data.opponent.name;
  matchPlayer.load(data.match, data.summary);
  matchPlayer.play();

  rogueUI.showResult(data.result, data.goals_for, data.goals_against, data.opponent.name);

  if (rogueSession.isGameOver) {
    rogueUI.refresh(); // muestra pantalla de game over
  }
}

function handleRogueNext() {
  if (rogueSession.isGameOver) return;
  // Distribuir stats: lockear y habilitar delta
  teamA.startNewTurnDistribution(0.5);
  teamA.updateRoguelikeRules(rogueSession.maxRulesPerSection);
  rogueUI.refresh();
}

function handleRogueReset() {
  rogueSession.reset();
  exitRoguelikeMode();
  enterRoguelikeMode();
}
index.html
Agregar el botón de toggle de modo dentro del <article class="matchcontrols">, junto al selector de idioma existente:


<button id="btn-toggle-mode">Modo Roguelike</button>
Flujo completo de un turno

Turno 1:
  Usuario entra a modo roguelike
  Configura reglas (máx 1 por sección) — stats fijos en 0.1
  → handleRoguePlay()
    → POST /teams  →  guarda team_id en localStorage
    → POST /match/play  →  { match, summary, result, team counters }
    → MatchPlayer reproduce el partido
    → rogueUI.showResult()
  
Turno 2+:
  handleRogueNext() → lockCurrentStats() + enableDeltaBudget(0.5)
  Usuario mueve sliders (sólo el delta, mínimo = valor anterior)
  Cada 3 turnos: maxRulesPerSection sube, se habilita agregar más reglas
  → handleRoguePlay()
    → POST /teams/{id}/rule  (sincroniza reglas nuevas)
    → POST /match/play  →  { match, summary, result, team counters }
    → replay + resultado

Game Over (losses >= 5):
  rogueUI muestra pantalla de game over
  → handleRogueReset() → borra localStorage → reinicia
Notas importantes para la implementación
Stats iniciales 0.1: el backend acepta cualquier valor numérico en configuration, pero TeamController::store() aplica defaults de 0.5 para atributos omitidos. El frontend debe enviar explícitamente 0.1 en todos los atributos.

Sync de reglas: el backend guarda el equipo con configuration JSON. Las reglas se modifican vía POST /teams/{id}/rule. En cada handleRoguePlay() del turno 2+ hay que sincronizar las reglas porque el backend no conoce los cambios del frontend (el frontend es la fuente de verdad para las reglas entre turnos).

Stats upgrade entre turnos: la distribución de 0.5 puntos se gestiona sólo en el frontend (sliders). NO se llama /teams/{id}/upgrade en cada cambio de slider — sería demasiado costoso. En cambio, al iniciar el siguiente handleRoguePlay() se podría sincronizar los stats también vía POST /teams/{id}/upgrade por diferencia. Pero dado que MatchController::play() usa $team->toSimulationFormat() que lee directamente de la BD, es necesario sincronizar los stats antes de jugar. Agregar al inicio de handleRoguePlay() (turno 2+), antes de sync de reglas:


// Sincronizar stats: calcular delta y llamar upgrade por diferencia
const currentStats = teamA.getTeamData().players;
for (let i = 0; i < currentStats.length; i++) {
  for (const attr of ['maxSpeed','accuracy','control','reaction','dribble','strength','endurance']) {
    const backendAttr = attr.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase → snake_case
    // Calcular cuántos upgrades (de 0.05) necesita
    const current = currentStats[i][attr];
    const locked  = teamA.players[i]._lockedStats?.[attr] ?? 0.1;
    const delta   = Math.round((current - locked) * 100) / 100;
    const steps   = Math.round(delta / 0.05);
    for (let s = 0; s < steps; s++) {
      await fetch(`${CONSTANTS.server_url}teams/${rogueSession.teamId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_index: i, attribute: backendAttr }),
      });
    }
  }
}
_lockedStats en turno 1: en el primer turno los stats son 0.1 hardcodeados (no editables). lockCurrentStats() no se llama en el turno 1 — los sliders simplemente se dejan en 0.1. Al entrar al turno 2, lockCurrentStats() toma los valores que están en los sliders (que siguen siendo 0.1 si el usuario no los modificó, lo cual es correcto).

Nombre de equipo único: el backend exige unique:teams,name. Usar timestamp en el nombre (_rogue_${Date.now()}) garantiza unicidad sin requerir input del usuario.