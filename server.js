import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);
const rooms = {};
const resultName = ["Bầu", "Cua", "Tôm", "Cá", "Gà", "Nai"];
const resultID = ["front", "back", "left", "right", "top", "bottom"];

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/script.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(__dirname + "/script.js");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle room creation
  socket.on("createRoom", ({ roomID, password }) => {
    if (rooms[roomID]) {
      return io.to(socket.id).emit("error", "Phòng đã tồn tại.");
    }

    rooms[roomID] = { players: [], bets: [], history: [], bank: 0, password };
    socket.join(roomID);
    io.to(roomID).emit("notify", `Phòng "${roomID}" được tạo.`);
    io.to(roomID).emit("roomCreated", roomID);
    console.log(`Room "${roomID}" created with password: ${password}.`);
  });

  // Handle joining a room
  socket.on("joinRoom", ({ roomID, playerName, password }) => {
    const room = rooms[roomID];

    if (!room) {
      return io.to(socket.id).emit("error", `Phòng ${roomID} không tồn tại.`);
    }

    // Validate the password
    if (room.password !== password) {
      return io.to(socket.id).emit("error", "Mật khẩu không đúng.");
    }

    // Add the player to the room
    const player = { id: socket.id, name: playerName, score: 0 };
    room.players.push(player);
    socket.join(roomID);

    // Notify clients and update state
    io.to(socket.id).emit("roomJoined", { roomID, player });
    io.to(roomID).emit("notify", `${playerName} đã tham gia phòng "${roomID}".`);
    updateRoomState(roomID);
  });

  // Handle placing a bet
  socket.on("placeBet", ({ roomID, bet }) => {
    const room = rooms[roomID];
    if (!room) {
      return io.to(socket.id).emit("error", `Phòng ${roomID} không tồn tại.`);
    }

    room.bets.push(bet);
    io.to(roomID).emit("notify", `${bet.playerName} đã đặt cược vào ${convertChoiceName(bet.betChoice)} ${bet.betAmount}.`);
    io.to(roomID).emit("updateBets", room.bets);
  });

  // Handle shaking dice
  socket.on("shakeDice", ({ roomID, shakeTimes }) => {
    const room = rooms[roomID];
    if (!room) {
      return io.to(socket.id).emit("error", `Phòng ${roomID} không tồn tại.`);
    }

    // Generate dice results
    const rolledResults = Array.from({ length: shakeTimes }, () => Math.floor(Math.random() * 6));
    io.to(roomID).emit("diceRolled", { results: rolledResults });
    io.to(roomID).emit("notify", `Kết quả roll ${rolledResults.map(convertFullName).join(", ")}.`);

    // Calculate scores
    calculateScores(room, rolledResults);

    // Save to history and clear bets
    room.history.push({ results: convertResultName(rolledResults), bets: [...room.bets] });
    room.bets = [];

    // Update room state
    updateRoomState(roomID);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    for (const roomID in rooms) {
      const room = rooms[roomID];

      // Find the player
      const player = room.players.find((p) => p.id === socket.id);

      // If the player exists, remove them
      if (player) {
        // Notify other players and update room state
        io.to(roomID).emit("notify", `${player.name} đã rời khỏi phòng.`);
      }
    }
  });
});

// Update the state of a room (bank, players, history, bets)
function updateRoomState(roomID) {
  const room = rooms[roomID];
  if (room) {
    io.to(roomID).emit("updateBank", room.bank);
    io.to(roomID).emit("updatePlayers", room.players);
    io.to(roomID).emit("updateHistory", room.history);
    io.to(roomID).emit("updateBets", room.bets);
  }
}

// Calculate scores based on rolled results
function calculateScores(room, rolledResults) {
  room.bets.forEach((bet) => {
    const player = room.players.find((p) => p.id === bet.id);
    if (player) {
      let isWin = rolledResults.some((result) => convertChoiceNameByIndex(result) === bet.betChoice);

      if (isWin) {
        player.score += bet.betAmount;
        room.bank -= bet.betAmount;
      } else {
        player.score -= bet.betAmount;
        room.bank += bet.betAmount;
      }
    }
  });
}

// Convert result name by string (e.g., "front" -> "Bầu")
function convertChoiceName(name) {
  return resultName[resultID.indexOf(name)];
}

// Convert result name by index (e.g., 0 -> "front")
function convertChoiceNameByIndex(index) {
  return resultID[index];
}

// Convert rolled results to readable names (e.g., [0, 1] -> ["front", "back"])
function convertResultName(rolledResults) {
  return rolledResults.map(convertChoiceNameByIndex);
}

function convertFullName(index) {
  return convertChoiceName(convertChoiceNameByIndex(index));
}

// Start server
server.listen(3000, () => {
  console.log("Server running at port 3000");
});
