import { Player } from "../models/Player.js";

export class MatchSimulationComponent {
  PLAYER_SIZE = 38;
  GOAL_SIZE = 120;

  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) throw new Error(`Canvas not found`);

    this.ctx = this.canvas.getContext("2d");
    this.width = this.canvas.width = this.canvas.clientWidth;
    this.height = this.canvas.height = this.canvas.clientHeight;

    this.teamA = null;
    this.teamB = null;

    this.players = [];
    this.ball = { x: this.width / 2, y: this.height / 2, vx: 0, vy: 0 };
    this.gameLoopId = null;

    // Event listeners map
    this.listeners = {};

    // this.canvas.addEventListener("click", (evt) => {
    //   console.log(evt);
    // });

    this.pause = false;
    document.getElementById("pausebutton").addEventListener("click", ()=>{
      if(this.pause){
        this.start();
      } else {
        this.stop();
      }
      this.pause = !this.pause;
    });
  }

  // Basic pub/sub
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  /** Initialize both teams using their JSON data */
  loadTeams(teamAData, teamBData) {
    this.teamA = teamAData;
    this.teamB = teamBData;
    this.teamA.teamName = "Team A";
    this.teamB.teamName = "Team B";

    this.players = [];

    const initialPositions = [
        {x: this.width*0.25, y: this.height*0.5},
        {x: this.width*0.4, y: this.height*0.3},
        {x: this.width*0.4, y: this.height*0.7}
    ];

    // create players for Team A (left)
    teamAData.players.forEach((p, i) => {
      const player = new Player({
        team: this.teamA.teamName,
        name: p.name,
        rules: p.rules,
        x: initialPositions[i].x,
        y: initialPositions[i].y,
        baseX: this.width*p.defaultZone.x/100,
        baseY: this.height*p.defaultZone.y/100,
        defaultAction: "Keep in my zone",
        currentFieldSide: "left"
      });
      this.players.push(player);
    });

    // create players for Team B (right)
    teamBData.players.forEach((p, i) => {
      const player = new Player({
        team: this.teamB.teamName,
        name: p.name,
        rules: p.rules,
        x: this.width - initialPositions[i].x,
        y: initialPositions[i].y,
        baseX: this.width*p.defaultZone.x/100,
        baseY: this.height*p.defaultZone.y/100,
        defaultAction: "Keep in my zone",
        currentFieldSide: "right"
      });
      this.players.push(player);
    });

    this.ball = { x: this.width / 2, y: this.height / 2, vx: 0, vy: 0 };
  }

  start() {
    if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
    this.emit("teamHasBall", {team: ""});
    this.loop();
  }

  stop() {
    if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
  }

  loop = () => {
    this.update();
    this.render();
    this.gameLoopId = requestAnimationFrame(this.loop);
  };

  update(dt=0.5) {
    // basic ball motion
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    this.ball.vx *= 0.98;
    this.ball.vy *= 0.98;

    // clamp ball within field
    // this.ball.x = Math.max(10, Math.min(this.width - 10, this.ball.x));
    this.ball.y = Math.max(10, Math.min(this.height - 10, this.ball.y));
    const balloffset = this.PLAYER_SIZE * 0.5 + 3;
    if(this.ball.x < balloffset || this.ball.x > this.width - balloffset){
      if(this.ball.y > (this.height - this.GOAL_SIZE) / 2 && this.ball.y < (this.height + this.GOAL_SIZE) / 2){
        // score goal
        if(this.ball.x < balloffset){
          document.getElementById("teambscore").textContent = parseInt(document.getElementById("teambscore").textContent) + 1;
        } else {
          document.getElementById("teamascore").textContent = parseInt(document.getElementById("teamascore").textContent) + 1;
        }
      }

      this.ball.x = this.width * 0.5;
      this.ball.y = this.height * 0.5;
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.players.forEach( (p) => p.hasBall = false );
      this.emit("teamHasBall", {team: ""});
      document.getElementById("log").addLog("reset ball");
    }

    // players logic
    for (const player of this.players) {
      const simState = {
        ball: this.ball,
        fieldWidth: this.width,
        fieldHeight: this.height,
        teammates: this.players.filter(p => p.team === player.team && p !== player),
        opponents: this.players.filter(p => p.team !== player.team && p.bodyCooldown <= 0),
        ballTeam: this.players.find(p => p.hasBall)?.team
      };

      player.checkMarked(simState.opponents, this.PLAYER_SIZE*2);
      const action = player.decide(simState);
      player.execute(
        simState,
        ({x, y}) => {
          const dx2 = x - this.ball.x;
          const dy2 = y - this.ball.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          console.log(3 + Math.min(dist2*0.01, 3))
          this.applyForceToBall({x, y}, 2 + Math.min(dist2*0.01, 4));
        },
        (team) => {this.applyForceToBall({
          x: team === "Team A" ? this.width : 0,
          y: (this.height + this.GOAL_SIZE)/2 - Math.random()*this.GOAL_SIZE
        }, 10)}
      );
      player.update(dt);

      // colision between players
      for (const otherPlayer of this.players) {
        if (otherPlayer === player || otherPlayer.bodyCooldown > 0) continue;

        const dx2 = player.x - otherPlayer.x;
        const dy2 = player.y - otherPlayer.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        if (dist2 < this.PLAYER_SIZE*0.6 && dist2 > 0) {
          // push player away
          const overlap = this.PLAYER_SIZE*0.6 - dist2;
          player.x += (dx2 / dist2) * (overlap / 2);
          player.y += (dy2 / dist2) * (overlap / 2);
  
          // also push other player
          otherPlayer.x -= (dx2 / dist2) * (overlap / 2);
          otherPlayer.y -= (dy2 / dist2) * (overlap / 2);
        }
      }
    }

    // check ball posesion
    // If ball dont has player and only one player is near, ball will be for that player.
    // If ball dont has player and at last one player of each team is near, the ball wil jump to a near zone.
    // If the ball has a player and also an opponent player is near, the ball must be disputed.
    // In the ball is disputed, the opponet player will has a Math.random() < 0.2 of chance to keep with the ball,
    // and a Math.random() < 0.5 to make the ball jump to a near zone.

    const CONTROL_DISTANCE = this.PLAYER_SIZE;

    // Find players near the ball
    const nearPlayers = this.players.filter(p => {
      const dx = p.x - this.ball.x;
      const dy = p.y - this.ball.y;
      const dist = Math.hypot(dx, dy);
      return p.ballCooldown <= 0 && dist < CONTROL_DISTANCE;
    });

    // If the ball currently has an owner
    const currentOwner = this.players.find(p => p.hasBall);

    let currentOwnerFeedback = "free";
    if (currentOwner) {
      const opponentsClose = nearPlayers.filter(p => p.team !== currentOwner.team && p.bodyCooldown <= 0);
      currentOwnerFeedback = currentOwner.team + " " + currentOwner.name;

      // each opponent will try to get the ball
      for(const opponent of opponentsClose){
        // There is a challenge for the ball
        const chance = Math.random();
        if (chance < 0.2) {
          // Opponent steals the ball
          currentOwner.hasBall = false;
          currentOwner.ballCooldown = 60;
          currentOwner.bodyCooldown = 60;

          opponent.hasBall = true;
          this.ball.x = opponent.x;
          this.ball.y = opponent.y;
          this.ball.vx = 0;
          this.ball.vy = 0;

          this.emit("teamHasBall", {team: opponent.team});
          currentOwnerFeedback = opponent.team + " " + opponent.name;
          document.getElementById("log").addLog([opponent.team, opponent.name,"steal ball to",currentOwner.name].join(" "));
          break;

        } else if (chance < 0.5) {
          // Ball is deflected to a nearby random zone
          currentOwner.hasBall = false;
          currentOwner.ballCooldown = 20;
          opponent.ballCooldown = 20;
          this.applyForceToBall({
              x: this.ball.x + (Math.random() - 0.5) * 200,
              y: this.ball.y + (Math.random() - 0.5) * 200
            }, 4);
          currentOwnerFeedback = "free";
          
          document.getElementById("log").addLog([opponent.team, opponent.name,"take off ball to",currentOwner.name].join(" "));
          break;

        } else {
          opponent.ballCooldown = 60;
          opponent.bodyCooldown = 60;
          document.getElementById("log").addLog([opponent.team, opponent.name,"fails defending",currentOwner.name].join(" "));
        }
      }

      if(currentOwner.hasBall){
        this.ball.x = currentOwner.x;
        this.ball.y = currentOwner.y;
      }
    } else {
      // No one currently has the ball
      if (nearPlayers.length > 0){
        if (nearPlayers.every(p => p.team === nearPlayers[0].team)) {
          // Same team players near, the ball gains control for any
          const newOwner = nearPlayers[Math.floor(Math.random()*nearPlayers.length)];
          
          // Compute ball speed
          const ballSpeed = Math.hypot(this.ball.vx, this.ball.vy);
          const MAX_CONTROL_SPEED = 6.0; // tweak threshold
  
          if (ballSpeed > MAX_CONTROL_SPEED) {
            // Too fast — ball bounces away randomly
            const angle = Math.random() * Math.PI * 2;
            const reboundStrength = ballSpeed * 0.3; // lose some speed
            this.ball.vx = Math.cos(angle) * reboundStrength;
            this.ball.vy = Math.sin(angle) * reboundStrength;
  
            newOwner.ballCooldown = 30;
  
            document
              .getElementById("log")
              .addLog([newOwner.team, newOwner.name, "failed to control fast ball"].join(" "));
          } else {
            // Successful control
            newOwner.hasBall = true;
            this.ball.x = newOwner.x;
            this.ball.y = newOwner.y;
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.emit("teamHasBall", {team: newOwner.team});
            currentOwnerFeedback = newOwner.team + " " + newOwner.name;
            document.getElementById("log").addLog([newOwner.team, newOwner.name,"take ball"].join(" "));
          }
        } else {
          // Contest between teams → ball bounces away
          nearPlayers.forEach( (p) => p.ballCooldown = 20 );
          this.applyForceToBall({
            x: this.ball.x + (Math.random() - 0.5) * 200,
            y: this.ball.y + (Math.random() - 0.5) * 200
          }, 3);
          document.getElementById("log").addLog("ball bounces away");
        }
      }
    }

    // visual feedback
    const finalOwner = this.players.find(p => p.hasBall);
    if(finalOwner){
      let msg = "";
      if(finalOwner.team === "Team A"){
        msg = "<span class='teamacolor'>";
      } else {
        msg = "<span class='teambcolor'>";
      }
      msg += finalOwner.team+"</span> "+finalOwner.name;
      document.getElementById("ballteam").innerHTML = msg;
    } else {
      document.getElementById("ballteam").textContent = "free";
    }
    for (const player of this.players) {
      this.emit("rule", {player: player, condition: player.currentCondition || "Default"});
    }
  }

  applyForceToBall(target, force){
    const dx = target.x - this.ball.x;
    const dy = target.y - this.ball.y;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) return; // avoid NaN

    this.ball.vx = (dx / dist) * force;
    this.ball.vy = (dy / dist) * force;

    this.emit("teamHasBall", {team: ""});
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // field
    ctx.fillStyle = "#0b5d0b";
    ctx.fillRect(0, 0, this.width, this.height);

    // center line
    ctx.strokeStyle = "#ffffff44";
    ctx.beginPath();
    ctx.moveTo(this.width / 2, 0);
    ctx.lineTo(this.width / 2, this.height);
    ctx.stroke();

    // goals
    ctx.fillStyle = "#222";
    ctx.fillRect(0, (this.height - this.GOAL_SIZE) / 2, 10, this.GOAL_SIZE);
    ctx.fillRect(this.width - 10, (this.height - this.GOAL_SIZE) / 2, 10, this.GOAL_SIZE);

    // players
    for (const p of this.players) {
      ctx.beginPath();
      ctx.fillStyle = p.team === "Team A" ? "#fd9946" : "#b676ff";
      // keep zones
      ctx.arc(p.baseX, p.baseY, this.PLAYER_SIZE*0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      if(p.bodyCooldown > 0 || p.ballCooldown > 0){
        ctx.arc( p.x, p.y, this.PLAYER_SIZE*0.5, 0, Math.max(0, Math.PI * 2 - Math.max(p.bodyCooldown, p.ballCooldown)*0.3) );
        ctx.fill();
        ctx.fillStyle += "55";
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.PLAYER_SIZE*0.5, 0, Math.PI * 2);
      ctx.fill();

      if(p.marked){
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#5d0b0b55";
        ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.fillText(p.name[0], p.x - 3, p.y + 3);
    }

    // ball
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(this.ball.x, this.ball.y, this.PLAYER_SIZE*0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}