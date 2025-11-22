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

  renderPlayer(x, y, color, cooldown, marked, name){
    this.ctx.beginPath();
    this.ctx.fillStyle = color;

    this.ctx.beginPath();
    if(cooldown > 0){
      this.ctx.arc( x, y, this.PLAYER_SIZE*0.5, 0, Math.max(0, Math.PI * 2 - cooldown*0.3) );
      this.ctx.fill();
      this.ctx.fillStyle += "55";
    }
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.PLAYER_SIZE*0.5, 0, Math.PI * 2);
    this.ctx.fill();

    if(marked){
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = "#5d0b0b55";
      this.ctx.stroke();
    }
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "10px sans-serif";
    this.ctx.fillText(name[0], x - 3, y + 3);
  }

  renderField(){
    this.ctx.clearRect(0, 0, this.width, this.height);

    // field
    this.ctx.fillStyle = "#0b5d0b";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // center line
    this.ctx.strokeStyle = "#ffffff44";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();

    // goals
    this.ctx.fillStyle = "#222";
    this.ctx.fillRect((this.width - this.GOAL_SIZE) / 2, 0, this.GOAL_SIZE, 10);
    this.ctx.fillRect((this.width - this.GOAL_SIZE) / 2, this.height - 10, this.GOAL_SIZE, 10);
  }

  update(instant) {
    this.renderField();

    // players
    this.renderPlayer( 
      instant["teamA"]["goalkeeper"]["x"], this.height-instant["teamA"]["goalkeeper"]["y"], 
      "#fd9946",
      Math.max(instant["teamA"]["goalkeeper"]["ballCooldown"], instant["teamA"]["goalkeeper"]["bodyCooldown"]),
      instant["teamA"]["goalkeeper"]["marked"], "Goalkeeper");
    this.renderPlayer( 
      instant["teamA"]["defender"]["x"], this.height-instant["teamA"]["defender"]["y"], 
      "#fd9946",
      Math.max(instant["teamA"]["defender"]["ballCooldown"], instant["teamA"]["defender"]["bodyCooldown"]),
      instant["teamA"]["defender"]["marked"], "Defender");
    this.renderPlayer( 
      instant["teamA"]["striker"]["x"], this.height-instant["teamA"]["striker"]["y"], 
      "#fd9946",
      Math.max(instant["teamA"]["striker"]["ballCooldown"], instant["teamA"]["striker"]["bodyCooldown"]),
      instant["teamA"]["striker"]["marked"], "Striker");

    this.renderPlayer( 
      instant["teamB"]["goalkeeper"]["x"], this.height-instant["teamB"]["goalkeeper"]["y"], 
      "#b676ff",
      Math.max(instant["teamB"]["goalkeeper"]["ballCooldown"], instant["teamB"]["goalkeeper"]["bodyCooldown"]),
      instant["teamB"]["goalkeeper"]["marked"], "Goalkeeper");
    this.renderPlayer( 
      instant["teamB"]["defender"]["x"], this.height-instant["teamB"]["defender"]["y"], 
      "#b676ff",
      Math.max(instant["teamB"]["defender"]["ballCooldown"], instant["teamB"]["defender"]["bodyCooldown"]),
      instant["teamB"]["defender"]["marked"], "Defender");
    this.renderPlayer( 
      instant["teamB"]["striker"]["x"], this.height-instant["teamB"]["striker"]["y"], 
      "#b676ff",
      Math.max(instant["teamB"]["striker"]["ballCooldown"], instant["teamB"]["striker"]["bodyCooldown"]),
      instant["teamB"]["striker"]["marked"], "Striker");

    // ball
    this.ctx.beginPath();
    this.ctx.fillStyle = "#fff";
    this.ctx.arc(instant["ball"]["x"], this.height-instant["ball"]["y"], this.PLAYER_SIZE*0.2, 0, Math.PI * 2);
    this.ctx.fill();
  }
}