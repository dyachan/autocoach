export class Player {
  constructor({ team, name, rules, x, y, baseX, baseY, defaultAction, currentFieldSide }) {
    this.team = team;
    this.name = name;
    this.rules = rules || [[],[]];
    this.x = x;
    this.y = y;
    this.baseX = baseX;
    this.baseY = baseY;
    this.hasBall = false;
    this.marked = false;
    this.defaultAction = defaultAction;
    this.currentFieldSide = currentFieldSide;

    this.ballCooldown = 0;
    this.bodyCooldown = 0;

    this.maxSpeed = 2.0;
    this.currentSpeed = { vx: 0, vy: 0 };
    this.target = { x: this.baseX, y: this.baseY };

    this.currentAction = this.defaultAction;
    this.currentCondition = null;
  }

  /** Resets player to base position */
  resetPosition() {
    this.x = this.baseX;
    this.y = this.baseY;
  }

  update(dt){
    if (this.ballCooldown > 0) {
      this.ballCooldown -= dt;
    }
    if (this.bodyCooldown > 0) {
      this.bodyCooldown -= dt;
    }

    this.moveToward(dt);
  }

  /** Calculate distance to another object {x,y} */
  distanceTo(obj) {
    return Math.hypot(obj.x - this.x, obj.y - this.y);
  }

  /** Move toward a target point */
  moveToward(dt = 1) {
    if (!this.target || this.bodyCooldown > 0) return;

    const acceleration = 0.2;
    const deceleration = 0.3;
    const stopThreshold = 0.5;

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    // If the player is close enough, start slowing down
    if (dist < stopThreshold) {
      this.currentSpeed.vx *= 0.8;
      this.currentSpeed.vy *= 0.8;
      if (Math.abs(this.currentSpeed.vx) < 0.05) this.currentSpeed.vx = 0;
      if (Math.abs(this.currentSpeed.vy) < 0.05) this.currentSpeed.vy = 0;
      if (this.currentSpeed.vx === 0 && this.currentSpeed.vy === 0) this.target = null;
      return;
    }

    // Desired normalized direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // --- X Axis ---
    const desiredVx = dirX * this.maxSpeed;
    const changingDirX = Math.sign(this.currentSpeed.vx) !== Math.sign(desiredVx) && Math.abs(this.currentSpeed.vx) > 0.1;

    if (changingDirX) {
      // Brake before reversing direction
      this.currentSpeed.vx -= Math.sign(this.currentSpeed.vx) * deceleration * dt;
    } else {
      // Accelerate toward desired velocity
      if (Math.abs(this.currentSpeed.vx - desiredVx) > 0.05)
      this.currentSpeed.vx += Math.sign(desiredVx - this.currentSpeed.vx) * acceleration * dt;
    }

    // --- Y Axis ---
    const desiredVy = dirY * this.maxSpeed;
    const changingDirY = Math.sign(this.currentSpeed.vy) !== Math.sign(desiredVy) && Math.abs(this.currentSpeed.vy) > 0.1;

    if (changingDirY) {
      this.currentSpeed.vy -= Math.sign(this.currentSpeed.vy) * deceleration * dt;
    } else {
      if (Math.abs(this.currentSpeed.vy - desiredVy) > 0.05)
      this.currentSpeed.vy += Math.sign(desiredVy - this.currentSpeed.vy) * acceleration * dt;
    }

    // Apply movement
    this.x += this.currentSpeed.vx * dt;
    this.y += this.currentSpeed.vy * dt;
  }

  /** Update the “marked” status */
  checkMarked(opponents, markRadius) {
    this.marked = opponents.some(op => this.distanceTo(op) < markRadius);
    return this.marked;
  }

  /** Decide what to do based on rules and world state */
  decide(simState) {
    // simState = { ball, teammates, opponents, fieldWidth, fieldHeight }
    for (const rule of this.rules[simState.ballTeam === this.team ? 0 : 1]) {
      if (this.evaluateCondition(rule.condition, rule.action, simState)) {
        this.currentCondition = rule.condition;
        this.currentAction = rule.action;
        return rule.action;
      }
    }
    this.currentCondition = null;
    this.currentAction = this.defaultAction;
    return this.currentAction;
  }

  /** Executes a single action (movement-oriented actions only here) */
  execute(simState, passToCB, shootToCB) {
    const { ball, teammates, opponents, fieldWidth, fieldHeight } = simState;

    switch (this.currentAction) {
      case "Keep in my zone":
        this.target = { x: this.baseX, y: this.baseY };
        break;

      case "Go to the ball":
        this.target = { x: ball.x, y: ball.y };
        break;

      case "Go to my goal":
        this.target = {x: (this.currentFieldSide === "left" ? 10 : fieldWidth-10), y: fieldHeight / 2};
        break;

      case "Go to rival goal":
        this.target = {x: (this.currentFieldSide === "left" ? fieldWidth-10 : 10), y: fieldHeight / 2};
        break;

      case "Go forward":
        this.target = {x: (this.currentFieldSide === "left" ? fieldWidth-10 : 10), y: this.y};
        break;

      case "Go back":
        this.target = {x: (this.currentFieldSide === "left" ? 10 : fieldWidth-10), y: this.y};
        break;

      case "Pass the ball":
        // find free mate
        if (this.hasBall) {
          // Filter out marked teammates first
          const freeMates = teammates.filter(p => !p.marked);

          if (freeMates.length > 0) {
            const availableTargets = freeMates.filter(mate => {
              // Check if any opponent is blocking the pass to this mate
              return !opponents.some(op => {
                const ax = this.x, ay = this.y;
                const bx = mate.x, by = mate.y;
                const px = op.x, py = op.y;

                const abx = bx - ax;
                const aby = by - ay;
                const apx = px - ax;
                const apy = py - ay;
                const abLenSq = abx * abx + aby * aby;

                const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));

                const closestX = ax + abx * t;
                const closestY = ay + aby * t;

                const dist = Math.hypot(px - closestX, py - closestY);
                const interceptionThreshold = 25;
                const between = t > 0.05 && t < 0.95;

                return dist < interceptionThreshold && between;
              });
            });

            if (availableTargets.length > 0) {
              // Pick one open teammate
              const target = availableTargets[Math.floor(Math.random() * availableTargets.length)];

              this.ballCooldown = 20;
              this.hasBall = false;
              passToCB({ x: target.x, y: target.y });
              document.getElementById("log").addLog([this.team, this.name,"pass to",target.name].join(" "));
            }
          }
        }
        break;

      case "Shoot to goal":
        if(this.hasBall){
          this.ballCooldown = 30;
          this.hasBall = false;
          shootToCB(this.team);
          document.getElementById("log").addLog([this.team, this.name,"shoot to goal"].join(" "));
        }
        break;

      case "Change side":
        const sides = [{x: this.x, y: fieldHeight * 0.3}, {x: this.x, y: fieldHeight * 0.7}];
        if(this.y > fieldHeight * 0.5){
          if(this.target?.x !== sides[1].x && this.target?.y !== sides[1].y){
            this.target = {x: sides[0].x, y: sides[0].y};
          }
        } else {
          if(this.target?.x !== sides[0].x && this.target?.y !== sides[0].y){
            this.target = {x: sides[1].x, y: sides[1].y};
          }
        }
        break;

      default:
        break;
    }
  }

  /** Evaluate a single condition string */
  evaluateCondition(cond, action, simState) {
    const { ball, teammates, opponents, fieldWidth, fieldHeight } = simState;

    if(["Pass the ball", "Shoot to goal"].includes(action) && !this.hasBall){
      return false;
    }

    switch (cond) {
      case "I has the ball":
        return this.hasBall;

      case "I am near a rival":
          return this.marked;

      case "The ball is near my goal":
        return (this.currentFieldSide === "left" && ball.x < fieldWidth * 0.3) ||
               (this.currentFieldSide === "right" && ball.x > fieldWidth * 0.7);

      case "The ball is in my side":       
        return (this.currentFieldSide === "left" && ball.x < fieldWidth * 0.51) ||
               (this.currentFieldSide === "right" && ball.x > fieldWidth * 0.49);

      case "The ball is in other side":
        return (this.currentFieldSide === "right" && ball.x < fieldWidth * 0.51) ||
               (this.currentFieldSide === "left" && ball.x > fieldWidth * 0.49);

      case "The ball is near rival goal":       
        return (this.currentFieldSide === "right" && ball.x < fieldWidth * 0.3) ||
               (this.currentFieldSide === "left" && ball.x > fieldWidth * 0.7);
         
      case "Rival in my side":       
        return (this.currentFieldSide === "left" && !opponents.every(p => p.x > fieldWidth * 0.49)) ||
               (this.currentFieldSide === "right" && !opponents.every(p => p.x < fieldWidth * 0.51));
         
      case "No rival in my side":       
        return (this.currentFieldSide === "left" && opponents.every(p => p.x > fieldWidth * 0.49)) ||
               (this.currentFieldSide === "right" && opponents.every(p => p.x < fieldWidth * 0.51));
         
      default:
        return false;
    }
  }
}