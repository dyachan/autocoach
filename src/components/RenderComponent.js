export class RenderComponent {
  PLAYER_SIZE = 38;
  GOAL_SIZE = 120;

  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) throw new Error(`Canvas not found`);

    this.ctx = this.canvas.getContext("2d");
    this.width = this.canvas.width = this.canvas.clientWidth;
    this.height = this.canvas.height = this.canvas.clientHeight;

    // Event listeners map
    this.listeners = {};
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

  start(){
    this.emit("teamHasBall", {team: ""});
  }

  renderPlayer(ctx, x, y, color, cooldown, marked, name){
    ctx.beginPath();
    ctx.fillStyle = color;

    ctx.beginPath();
    if(cooldown > 0){
      ctx.arc( x, y, this.PLAYER_SIZE*0.5, 0, Math.max(0, Math.PI * 2 - cooldown*0.3) );
      ctx.fill();
      ctx.fillStyle += "55";
    }
    ctx.beginPath();
    ctx.arc(x, y, this.PLAYER_SIZE*0.5, 0, Math.PI * 2);
    ctx.fill();

    if(marked){
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#5d0b0b55";
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.fillText(name[0], x - 3, y + 3);
  }

  update(instant) {
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
    this.renderPlayer(ctx, 
      instant["teamA"]["goalkeeper"]["x"], instant["teamA"]["goalkeeper"]["y"], 
      "#fd9946",
      Math.max(instant["teamA"]["goalkeeper"]["ballCooldown"], instant["teamA"]["goalkeeper"]["bodyCooldown"]),
      instant["teamA"]["goalkeeper"]["marked"], "Goalkeeper");
    this.renderPlayer(ctx, 
      instant["teamA"]["defender"]["x"], instant["teamA"]["defender"]["y"], 
      "#fd9946",
      Math.max(instant["teamA"]["defender"]["ballCooldown"], instant["teamA"]["defender"]["bodyCooldown"]),
      instant["teamA"]["defender"]["marked"], "Defender");
    this.renderPlayer(ctx, 
      instant["teamA"]["striker"]["x"], instant["teamA"]["striker"]["y"], 
      "#fd9946",
      Math.max(instant["teamA"]["striker"]["ballCooldown"], instant["teamA"]["striker"]["bodyCooldown"]),
      instant["teamA"]["striker"]["marked"], "Striker");

    this.renderPlayer(ctx, 
      instant["teamB"]["goalkeeper"]["x"], instant["teamB"]["goalkeeper"]["y"], 
      "#b676ff",
      Math.max(instant["teamB"]["goalkeeper"]["ballCooldown"], instant["teamB"]["goalkeeper"]["bodyCooldown"]),
      instant["teamB"]["goalkeeper"]["marked"], "Goalkeeper");
    this.renderPlayer(ctx, 
      instant["teamB"]["defender"]["x"], instant["teamB"]["defender"]["y"], 
      "#b676ff",
      Math.max(instant["teamB"]["defender"]["ballCooldown"], instant["teamB"]["defender"]["bodyCooldown"]),
      instant["teamB"]["defender"]["marked"], "Defender");
    this.renderPlayer(ctx, 
      instant["teamB"]["striker"]["x"], instant["teamB"]["striker"]["y"], 
      "#b676ff",
      Math.max(instant["teamB"]["striker"]["ballCooldown"], instant["teamB"]["striker"]["bodyCooldown"]),
      instant["teamB"]["striker"]["marked"], "Striker");

    // ball
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(instant["ball"]["x"], instant["ball"]["y"], this.PLAYER_SIZE*0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}