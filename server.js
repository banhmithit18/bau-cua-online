import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);
const rooms = {};
const resultName = ["Bầu", "Cua", "Tôm", "Cá", "Gà", "Nai"];
app.use(express.static("public"));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/script.js", function (req, res) {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(__dirname + "/script.js");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  //create room , when create room you are bank aka Nhà Cái
  socket.on("createRoom", function (roomID) {
    if (rooms[roomID]) {
      io.to(socket.id).emit("error", "Phòng đã tồn tại.");
    } else {
      rooms[roomID] = { players: [], bets: [], history: [], bank: 0};
      socket.join(roomID);
      io.to(roomID).emit("notify", `Phòng "${roomID}" được tạo.`);
      io.to(roomID).emit("roomCreated", roomID);
    }
  });

  //join room
  socket.on("joinRoom", function (room) {
    let roomID = room.room;
    let playerName = room.player;
    if (!rooms[roomID]) {
      io.to(socket.id).emit("error", `Phòng ${roomID} không tồn tại.`);
    } else {
      const room = rooms[roomID];
      const player = { id: socket.id, name: playerName, score: 0 };
      room.players.push(player);
      socket.join(roomID);
      io.to(roomID).emit("roomJoined", { roomID: roomID, player: player });
      io.to(roomID).emit("notify", `${playerName} đã tham gia phòng "${roomID}".`);

      //update current result to new client
      io.to(roomID).emit("updateBank", room.bank);
      io.to(roomID).emit("updatePlayers", room.players);
      io.to(roomID).emit("updateHistory", room.history);
      io.to(roomID).emit("updateBets", room.bets);
    }
  });

  //place bet
  socket.on("placeBet", ({ roomID, bet }) => {
    if (rooms[roomID]) {
      const room = rooms[roomID];
      room.bets.push(bet);
      io.to(roomID).emit("updateBets", room.bets);
      io.to(roomID).emit("notify", `${bet.playerName} đã đặt cược vào ${convertChoiceName(bet.betChoice)} ${bet.betAmount}.`);
    } else {
      io.to(socket.id).emit("error", `Phòng ${roomID} không tồn tại.`);
    }
  });

  //shake dice
  socket.on("shakeDice", ({roomID, shakeTimes}) => {
    if (rooms[roomID]) {
      const room = rooms[roomID];
      let rolledResults = []
      for (let i = 0; i < shakeTimes; i++) {
        const rolledResult = Math.floor(Math.random() * 6);     
        rolledResults.push(rolledResult)
      }
      //send signal to client to roll dice
      io.to(roomID).emit("notify", `Kết quả roll ${rolledResults}`);
      io.to(roomID).emit("diceRolled", {results: rolledResults});

      //calculate score
      room.bets.forEach((bet) => {
        const player = room.players.find((p) => p.id === bet.id);
        if (player) {
          let isWin = false;
          rolledResults.forEach((result) => {
            if (convertChoiceNameByIndex(result) === bet.betChoice) {
              isWin = true;
              player.score += bet.betAmount;
              room.bank -= bet.betAmount;
            }
          });
          if (!isWin) {
            player.score -= bet.betAmount;
            room.bank += bet.betAmount;
          }
        }
      });

      //save to history
      room.history.push({
        results: convertResultName(rolledResults), 
        bets: room.bets.map((bet) => ({ ...bet })),
      });
      //remove current bet
      room.bets = [];

      //update result to client
      io.to(roomID).emit("updateBank", room.bank);
      io.to(roomID).emit("updatePlayers", room.players);
      io.to(roomID).emit("updateHistory", room.history);
      io.to(roomID).emit("updateBets", room.bets);

    } else {
      io.to(socket.id).emit("error", `Phòng ${roomID} không tồn tại.`);
    }
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});

function convertChoiceName(name) {
  const resultID = ["front", "back", "left", "right", "top", "bottom"];
  return resultName[resultID.indexOf(name)];
}

function convertChoiceNameByIndex(index) {
  const resultID = ["front", "back", "left", "right", "top", "bottom"];
  return resultID[index];
}
function convertResultName(rolledResults) {
  var returnResult = [];
  rolledResults.forEach((index) => {
    returnResult.push(convertChoiceNameByIndex(index));
  });
  return returnResult;
}
