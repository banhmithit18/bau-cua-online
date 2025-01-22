const diceContainer = document.querySelector(".dice-container");
const shakeButton = document.getElementById("shake-button");
const betModal = document.getElementById("betModal");
const betConfirmButton = document.getElementById("betConfirmButton");
const playerNameInput = document.getElementById("playerName");
const playerSelect = document.getElementById("playerSelect");
const scoreTable = document.getElementById("scoreTable").getElementsByTagName("tbody")[0];
const historyTableBody = document.getElementById("historyTable").getElementsByTagName("tbody")[0];
const createRoomButton = document.getElementById("createRoom");
const joinRoomButton = document.getElementById("joinRoom");
const roomElement = document.getElementById("room");
const mainElement = document.getElementById("main");
const diceElements = document.querySelectorAll(".dice");

// Mảng hình ảnh xúc xắc
const diceImages = [
  "images/bau.jpg", // Bầu
  "images/cua.jpg", // Cua
  "images/tom.jpg", // Tôm
  "images/ca.jpg", // Cá
  "images/ga.jpg", // Gà
  "images/nai.jpg", // Nai
];

// Mặt xúc xắc và góc xoay tương ứng (trục X, Y)
const faceAngles = [
  { face: "front", x: 0, y: 0 }, // Bầu
  { face: "back", x: 0, y: 180 }, // Cua
  { face: "right", x: 0, y: 90 }, // Tôm
  { face: "left", x: 0, y: -90 }, // Cá
  { face: "top", x: -90, y: 0 }, // Gà
  { face: "bottom", x: 90, y: 0 }, // Nai
];

const socket = io();

let currentRoomID = "";
let currentPlayerID = "";
let currentPlayerName = "";
//handle error
socket.on("error", function (error) {
  //maybe use modal if i have time
  alert(error);
});

//handle notification
socket.on("notify", function (notification) {
  //maybe use modal if i have time
  console.log(notification);
});

//when create room you are bank aka nhà cái
createRoomButton.addEventListener("click", () => {
  var roomID = document.getElementById("roomID").value.trim();
  if (!roomID) {
    alert("Vui lòng nhập ID phòng");
    return false;
  }
  socket.emit("createRoom", roomID);
  socket.on("roomCreated", function (roomID) {
    if(currentRoomID == ''){
      currentRoomID = roomID;
    }
    //show main element
    roomElement.style.cssText = "display:none !important";
    mainElement.style.display = "flex";
    //bank should not have right to bet
    document.getElementById("betButton").style.display = "none";
  });
});

//join room
joinRoomButton.addEventListener("click", () => {
  //validate
  var roomID = document.getElementById("roomID").value.trim();
  var playerName = document.getElementById("playerName").value.trim();
  if (!roomID) {
    alert("Vui lòng nhập ID phòng");
    return false;
  }
  if (!playerName) {
    alert("Vui lòng nhập tên người chơi");
    return false;
  }
  //send data to server
  socket.emit("joinRoom", { room: roomID, player: playerName });

  //player should not have right to shacke dice
  document.getElementById("shake-button").style.display = "none";
});

//receive data from server after join room
socket.on("roomJoined", function (room) {
  if(currentRoomID == ''){
    currentRoomID = room.roomID;
  }
  if(currentPlayerID == ''){
    currentPlayerID = room.player.id;
  }
  if(currentPlayerName == ''){
    currentPlayerName = room.player.name;
  }
  //show main element
  roomElement.style.cssText = "display:none !important";
  mainElement.style.display = "flex";
  //add player to billboard
  addPlayerToTable(room.player);
});

function addPlayerToTable(player) {
  const row = scoreTable.insertRow();
  row.insertCell(0).textContent = player.name;
  row.insertCell(1).textContent = player.score || 0;
}

//place bet
betConfirmButton.addEventListener("click", () => {
  const betChoice = document.getElementById("betChoice").value;
  const betAmount = parseInt(document.getElementById("betAmount").value);
  if (betAmount > 0) {
    socket.emit("placeBet", { roomID: currentRoomID, bet: { id: currentPlayerID, playerName: currentPlayerName, betChoice: betChoice, betAmount: betAmount } });
    $("#betModal").modal("hide");
  }
});

//update bet current data
socket.on("updateBets", (bets) => {
  const tableBody = document.getElementById("currentBetsTable").getElementsByTagName("tbody")[0];
  tableBody.innerHTML = ""; // Clear old data
  bets.forEach((bet) => {
    const row = tableBody.insertRow();
    row.insertCell(0).textContent = bet.playerName; // Tên người chơi
    row.insertCell(1).textContent = convertChoiceName(bet.betChoice); // Lựa chọn cược
    row.insertCell(2).textContent = bet.betAmount; // Số tiền cược
  });
});

//shake dice
shakeButton.addEventListener("click", () => {
  shakeTimes = diceElements.length;
  socket.emit("shakeDice", { roomID: currentRoomID, shakeTimes: shakeTimes });
});

//shake animation after server confirm shake
socket.on("diceRolled", ({ results }) => {
  indexResult = 0;
  diceElements.forEach((dice) => {
    let result = results[indexResult];
    dice.style.transition = "none";
    dice.style.transform = "rotateX(0deg) rotateY(0deg)";
    setTimeout(() => {
      const rolledResult = faceAngles[result];
      const xRotation = rolledResult.x + 720; // Xoay ít nhất 2 vòng theo trục X
      const yRotation = rolledResult.y + 720; // Xoay ít nhất 2 vòng theo trục Y

      dice.style.transition = "transform 2s ease-out"; // Khôi phục hiệu ứng chuyển động
      dice.style.transform = `rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
    }, 50);
    indexResult = indexResult + 1;
  });
});

//update history
socket.on("updateHistory", (history) => {
  historyTableBody.innerHTML = "";
  history.forEach((entry, index) => {
    const row = historyTableBody.insertRow();
    row.insertCell(0).textContent = index + 1;
    row.insertCell(1).textContent = entry.results.map((result) => convertChoiceName(result)).join(", ");
    const betDetails = entry.bets.map((bet) => `${bet.playerName} cược ${bet.betAmount} vào ${convertChoiceName(bet.betChoice)}`).join("<br>");
    row.insertCell(2).innerHTML = betDetails;
  });
});

//update player stat
socket.on("updatePlayers", (players) => {
  //already clear table in updateBank
  //scoreTable.innerHTML = "";
  players.forEach((player) => addPlayerToTable(player));
});

socket.on("updateBank", (bank) => {
  //update bank point
  scoreTable.innerHTML = "";
  const row = scoreTable.insertRow();
  row.insertCell(0).textContent = "Nhà cái"
  row.insertCell(1).textContent = bank|| 0;
});

function convertChoiceName(name) {
  const resultName = ["Bầu", "Cua", "Tôm", "Cá", "Gà", "Nai"];
  const resultID = ["front", "back", "left", "right", "top", "bottom"];
  return resultName[resultID.indexOf(name)];
}

function convertResultName(rolledResults) {
  var returnResult = [];
  rolledResults.forEach((result) => {
    returnResult.push(convertChoiceName(result));
  });
  return returnResult;
}

// Tạo xúc xắc 3D với các mặt
function createDice() {
  diceElements.forEach((dice) => {
    dice.innerHTML = `
      <div class="front"><img src="${diceImages[0]}" alt="Bầu"></div>
      <div class="back"><img src="${diceImages[1]}" alt="Cua"></div>
      <div class="right"><img src="${diceImages[3]}" alt="Cá"></div>
      <div class="left"><img src="${diceImages[2]}" alt="Tôm"></div>
      <div class="top"><img src="${diceImages[4]}" alt="Gà"></div>
      <div class="bottom"><img src="${diceImages[5]}" alt="Nai"></div>
    `;
  });
}
// Khởi tạo xúc xắc
createDice();
