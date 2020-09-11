const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 4000;

app.use(express.static(__dirname + "/public"));

const obstacles = [];
const players = [];
var roomno = 1;
var waitRoom = 0;
var lobbyClock = 5;
var gameStart = false;

function onConnection(socket) {
  //Room system logic
  socket.on("joinGame", (data) => {
    waitRoom++;
    socket.join(roomno);
    if (waitRoom === 2) {
      let lobbyLoop = setInterval(() => {
        io.sockets.in(roomno).emit("lobbyClock", lobbyClock);
        lobbyClock--;
        console.log(lobbyClock);
        if (waitRoom > 9 || lobbyClock < 1) {
          //Sync this with blocks
          gameStart = true;

          waitRoom = 0;
          lobbyClock = 5;
          clearInterval(lobbyLoop);
        }
      }, 1000);
    }
  });

  //When a player moves
  socket.on("pos", (data) => {
    //Update player array with unique key in for loop
    for (i = 0; i < players.length; i++) {
      if (players[i].playerID === data.playerID) {
        players[i] = data;
      }
    }
  });
  //Game Info Loop
  socket.on("addPlayer", (data) => {
    players.push(data);
  });
  socket.on("playerRequest", (data) => {
    let roomPlayers = [];
    for (i = 0; i < players.length; i++) {
      if (players[i].roomno == data) {
        roomPlayers.push(players[i]);
      }
    }
    socket.emit("playerInfo", roomPlayers);
  });
  //end game for Player
  socket.on("backToLobby", (data) => {
    console.log(players);
    for (i = 0; i < players.length; i++) {
      if (players[i].playerID == data) {
        players.splice(i, 1);
      }
    }
  });
}

io.on("connection", onConnection);

http.listen(port, () => console.log("listening on port " + port));

function Obstacle(x, y, width, height, speed) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.speed = speed;
}

let blockLoop = setInterval(() => {
  if (gameStart) {
    io.sockets.in(roomno).emit("connectToRoom", roomno);
    gameStart = false;
    roomno++;
  }
  obstacles.push(
    new Obstacle(Math.floor(Math.random() * 300), -50, 150, 50, 15)
  );
}, 1000);

let obstacleUpdateLoop = setInterval(() => {
  for (i = 0; i < obstacles.length - 1; i++) {
    /*for (j = 0; j < players.length - 1; j++) {
      if (
        players[j].mousePosX - players[j].radius <
          obstacles[i].x + obstacles[i].width &&
        players[j].mousePosX + players[j].radius > obstacles[i].x &&
        players[j].mousePosY - players[j].radius <
          obstacles[i].y + obstacles[i].height &&
        players[j].mousePosY + players[j].radius > obstacles[i].y
      ) {
        io.sockets.emit("collision", obstacles[i]);
        console.log("collision " + players[j].displayName);
      }
    }*/
    obstacles[i].y += obstacles[i].speed;
    if (obstacles[i].y > 2000) {
      obstacles.splice(i, 1);
    }
  }
  io.sockets.emit("blockUpdate", obstacles);
}, 20);

/*
     &&
        players[j].mousePosY - players[j].radius <
          obstacles[i].y + obstacles[i].height &&
        players[j].mousePosY + players[j].radius > obstacles[i].y
    3)If players exits or gets hit kick them from room to death screen 
*/
