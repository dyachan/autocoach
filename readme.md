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

## flow
When the player start roguelike mode te server send 3 new players created from GamePlayer model. All with 0.1 in each stat. And turn begin.

each turn has 2 phases:
1. select formation -> this phase the player can:
  - add stats to players (except first turn, all players starts with 0.1 in each state).
  - view current team position.
  - send formation to play match and go to next phase.
2. view match -> this phase the player can:
  - look match replay.
  - look at your own team's formation without being able to change it
  - look at other team's formation without being able to change it
  - finish and go to phase 1. 
