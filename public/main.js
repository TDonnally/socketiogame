var socket = io();

//All the properties of the canvas
var canvas = document.getElementsByClassName("arena")[0];
canvas.style.display = "none";
var ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
ctx.fillStyle = "#41B6E6";
ctx.fillRect(0, 0, canvas.width, canvas.height);

//Variables init
var displayName = "";
var mousePosX = 1;
var mousePosY = 1;
var radius = 10;
var playerID = "";
var roomno = 0;
var inGame = false;
var speed = 10;
var width = 50;
var wins = 0;
var pregameTimer;
var leftMargin = canvas.width / 2 - 200;
var obstacles = [
  new Obstacle(0, 0, canvas.width / 2 - 200, canvas.height, 0),
  new Obstacle(
    canvas.width / 2 + 200,
    0,
    canvas.width / 2 - 200,
    canvas.height,
    0
  ),
];

//Connect to room logic
socket.on("connect", () => (playerID = socket.id));

function joinGame() {
  socket.emit("joinGame");
  if (obstacles.length > 2) {
    obstacles = removeLast(obstacles, obstacles.length - 2);
  }
  displayName = document.getElementById("displayName").value;
  console.log(displayName);
  document.getElementById("mainMenu").style.display = "none";
  canvas.style.display = "block";
}
function removeLast(arr, n) {
  arr.splice(arr.length - n, arr.length);
  return arr;
}
socket.on("connectToRoom", function (data) {
  inGame = true;
  pregameTimer = undefined;
  roomno = data;
  socket.emit("addPlayer", {
    mousePosX,
    mousePosY,
    radius,
    playerID,
    roomno,
    displayName,
    wins,
    leftMargin,
  });
});

//Mouse tracker
function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

canvas.addEventListener(
  "mousemove",
  function (evt) {
    let mousePos = getMousePos(canvas, evt);
    mousePosX = mousePos.x;
    mousePosY = mousePos.y;
    socket.emit("pos", {
      mousePosX,
      mousePosY,
      radius,
      playerID,
      roomno,
      displayName,
      wins,
      leftMargin,
    });
  },
  false
);

//Updates blocks position through updates from server
socket.on("blockUpdate", (data) => {
  if (inGame) {
    for (i = 0; i < data.length - 1; i++) {
      obstacles.splice(
        i + 2,
        1,
        new Obstacle(
          data[i].x + (canvas.width / 2 - 200),
          data[i].y - 600,
          data[i].width,
          data[i].height,
          data[i].speed
        )
      );
    }
  }
});

//Handles pregame timers and logic
socket.on("lobbyClock", (data) => {
  pregameTimer = data;
});
function animate() {
  obstacles[0] = new Obstacle(0, 0, canvas.width / 2 - 200, canvas.height, 0);
  obstacles[1] = new Obstacle(
    canvas.width / 2 + 200,
    0,
    canvas.width / 2 - 200,
    canvas.height,
    0
  );
  ctx.beginPath();
  ctx.arc(mousePosX, mousePosY, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = "black";
  ctx.fill();
  ctx.closePath();
  if (!inGame) {
    ctx.beginPath();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.closePath();
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText("Move mouse to blue", canvas.width / 2, canvas.height / 2);
    ctx.fillText("While others join", canvas.width / 2, canvas.height / 2 + 30);
    if (pregameTimer != undefined) {
      ctx.fillText(pregameTimer, canvas.width / 2, canvas.height / 2 + 60);
    }

    for (i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(219, 62, 177, 0.5)";
      ctx.rect(
        obstacles[i].x,
        obstacles[i].y,
        obstacles[i].width,
        obstacles[i].height
      );
      ctx.fill();
    }
  } else if (inGame) {
    socket.emit("playerRequest", roomno);
    for (i = 0; i < obstacles.length - 1; i++) {
      if (
        mousePosX - radius < obstacles[i].x + obstacles[i].width &&
        mousePosX + radius > obstacles[i].x &&
        mousePosY - radius < obstacles[i].y + obstacles[i].height &&
        mousePosY + radius > obstacles[i].y
      ) {
        inGame = false;
        socket.emit("backToLobby", playerID);
        document.getElementById("mainMenu").style.display = "block";
        canvas.style.display = "none";
      }
    }
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

//Updates position of obstacles and other players on clients screen
socket.on("playerInfo", (data) => {
  ctx.beginPath();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.closePath();
  for (i = 0; i < obstacles.length - 1; i++) {
    ctx.beginPath();
    ctx.fillStyle = "#DB3EB1";
    ctx.rect(
      obstacles[i].x,
      obstacles[i].y,
      obstacles[i].width,
      obstacles[i].height
    );
    ctx.fill();
    ctx.closePath();
  }

  for (i = 0; i < data.length; i++) {
    if (data.length == 1) {
      wins++;
      loopSpeed = 1000;
      width = 50;
      speed = 10;
      inGame = false;
      socket.emit("backToLobby", playerID);
      document.getElementById("mainMenu").style.display = "block";
      canvas.style.display = "none";
    }
    ctx.beginPath();
    ctx.arc(
      data[i].mousePosX - data[i].leftMargin + leftMargin,
      data[i].mousePosY,
      data[i].radius,
      0,
      2 * Math.PI,
      false
    );
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.font = "12px Arial bold";
    ctx.fillText(
      data[i].displayName + " " + "Wins: " + data[i].wins,
      data[i].mousePosX - data[i].leftMargin + leftMargin,
      data[i].mousePosY - 20
    );
    ctx.fill();
  }
});

function Obstacle(x, y, width, height, speed) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.speed = speed;
}

//resizes canvas to window.

window.addEventListener("resize", resizeCanvas, false);

function resizeCanvas() {
  leftMargin = canvas.width / 2 - 200;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
