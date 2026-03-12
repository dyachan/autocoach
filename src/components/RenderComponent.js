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
    this.ctx.arc(x, y, this.PLAYER_SIZE*1, 0, Math.PI * 2);
    this.ctx.fillStyle = color+"00";
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = color+"17";
    this.ctx.stroke();
    this.ctx.fillStyle = color;
    if(cooldown > 0){
      this.ctx.beginPath();
      this.ctx.arc( x, y, this.PLAYER_SIZE*0.5, 0, Math.max(0, Math.PI * 2 - cooldown*0.3) );
      this.ctx.fill();
      this.ctx.fillStyle = color+"55";
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
    this.ctx.moveTo(0, this.height * 0.5);
    this.ctx.lineTo(this.width, this.height * 0.5);
    this.ctx.stroke();

    // goals lines
    this.ctx.strokeStyle = "#ffffff17";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height * 0.3);
    this.ctx.lineTo(this.width, this.height * 0.3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height * 0.7);
    this.ctx.lineTo(this.width, this.height * 0.7);
    this.ctx.stroke();

    // goals
    this.ctx.fillStyle = "#222";
    this.ctx.fillRect((this.width - this.GOAL_SIZE) / 2, 0, this.GOAL_SIZE, 10);
    this.ctx.fillRect((this.width - this.GOAL_SIZE) / 2, this.height - 10, this.GOAL_SIZE, 10);
  }

  update(instant) {
    this.renderField();

    const style = getComputedStyle(document.documentElement);
    const teamColors = [
      style.getPropertyValue('--team-A-color').trim(),
      style.getPropertyValue('--team-B-color').trim(),
    ];
    ["teamA", "teamB"].forEach((team, i) => {
      instant[team].forEach(p => {
        this.renderPlayer(
          p.x, this.height - p.y,
          teamColors[i],
          Math.max(p.ballCooldown, p.bodyCooldown),
          p.marked,
          p.name
        );
      });
    });

    // ball
    this.ctx.beginPath();
    this.ctx.fillStyle = "#fff";
    this.ctx.arc(instant["ball"]["x"], this.height - instant["ball"]["y"], this.PLAYER_SIZE * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
  }
}