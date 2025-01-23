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
const roomIDInput = document.getElementById("roomID");
const roomPasswordInput = document.getElementById("roomPassword");
const container = document.getElementById("floating-icons-container");

// Mảng hình ảnh xúc xắc
const diceImages = [
  "images/bau.jpg", // Bầu
  "images/cua.jpg", // Cua
  "images/tom.jpg", // Tôm
  "images/ca.jpg", // Cá
  "images/ga.jpg", // Gà
  "images/nai.jpg", // Nai
];

const icons = ["images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png", "images/icons/icon1.png"];

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
  const roomID = roomIDInput.value.trim();
  const password = roomPasswordInput.value.trim();

  if (!(roomID && password)) {
    alert("Vui lòng nhập ID và mật khẩu phòng");
    return false;
  }

  socket.emit("createRoom", { roomID, password });

  socket.on("roomCreated", function (roomID) {
    if (currentRoomID == "") {
      currentRoomID = roomID;
    }
    //show main element
    roomElement.style.cssText = "display:none !important";
    mainElement.style.display = "flex";

    //remove animation
    document.querySelectorAll(".floating-icon").forEach((e) => e.remove());

    //bank should not have right to bet
    document.getElementById("betButton").style.display = "none";
  });
});

//join room
joinRoomButton.addEventListener("click", () => {
  //validate
  const roomID = roomIDInput.value.trim();
  const password = roomPasswordInput.value.trim();
  var playerName = document.getElementById("playerName").value.trim();

  if (!(roomID && password)) {
    alert("Vui lòng nhập ID và mật khẩu phòng");
    return false;
  }
  if (!playerName) {
    alert("Vui lòng nhập tên người chơi");
    return false;
  }
  //send data to server
  socket.emit("joinRoom", { roomID, playerName, password });

  //player should not have right to shacke dice
  document.getElementById("shake-button").style.display = "none";
});

//receive data from server after join room
socket.on("roomJoined", function (room) {
  if (currentRoomID == "") {
    currentRoomID = room.roomID;
  }
  if (currentPlayerID == "") {
    currentPlayerID = room.player.id;
  }
  if (currentPlayerName == "") {
    currentPlayerName = room.player.name;
  }
  //show main element
  roomElement.style.cssText = "display:none !important";
  mainElement.style.display = "flex";

  //remove animation
  document.querySelectorAll(".floating-icon").forEach((e) => e.remove());

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
  row.insertCell(0).textContent = "Nhà cái";
  row.insertCell(1).textContent = bank || 0;
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

function createFloatingIcons() {
  icons.forEach((icon) => {
    const img = document.createElement("img");
    img.src = icon;
    img.className = "floating-icon";

    // Vị trí ngẫu nhiên ban đầu
    const startX = Math.random() * 90 + "vw"; // Vị trí ban đầu của icon (x)
    const startY = Math.random() * 90 + "vh"; // Vị trí ban đầu của icon (y)

    // Tạo vị trí ngẫu nhiên cho chuyển động
    const randomX = (Math.random() * 2 - 1) * 100 + "vw"; // Giá trị ngẫu nhiên cho hướng X
    const randomY = (Math.random() * 2 - 1) * 100 + "vh"; // Giá trị ngẫu nhiên cho hướng Y

    // Đặt vị trí ban đầu
    img.style.top = startY;
    img.style.left = startX;

    // Đặt các giá trị này vào custom properties để sử dụng trong @keyframes
    img.style.setProperty("--x", randomX);
    img.style.setProperty("--y", randomY);

    // Thêm icon vào container
    container.appendChild(img);

    // Cập nhật vị trí liên tục
    moveIcon(img);
  });
}

// Hàm tạo các icon trôi nổi
function createFloatingIcons() {
  icons.forEach((icon) => {
    const img = document.createElement("img");
    img.src = icon;
    img.className = "floating-icon";

    // Vị trí ngẫu nhiên ban đầu
    const startX = Math.random() * 90 + "vw"; // Vị trí ban đầu của icon (x)
    const startY = Math.random() * 90 + "vh"; // Vị trí ban đầu của icon (y)

    // Đặt vị trí ban đầu cho icon
    img.style.top = startY;
    img.style.left = startX;

    // Thêm icon vào container
    container.appendChild(img);

    // Bắt đầu di chuyển icon
    moveIcon(img);
  });
}

// Hàm để di chuyển icon liên tục và thay đổi hướng khi chạm vào cạnh
function moveIcon(icon) {
  let xDirection = Math.random() < 0.5 ? 1 : -1; // Hướng di chuyển ngẫu nhiên theo trục X
  let yDirection = Math.random() < 0.5 ? 1 : -1; // Hướng di chuyển ngẫu nhiên theo trục Y

  let speedX = Math.random() * 2 + 1; // Tốc độ di chuyển ngẫu nhiên theo trục X
  let speedY = Math.random() * 2 + 1; // Tốc độ di chuyển ngẫu nhiên theo trục Y

  const step = () => {
    const rect = icon.getBoundingClientRect();
    let left = rect.left + xDirection * speedX;
    let top = rect.top + yDirection * speedY;

    // Nếu chạm vào cạnh trái hoặc phải, đảo hướng X
    if (left <= 0 || left + rect.width >= window.innerWidth) {
      xDirection *= -1;
    }

    // Nếu chạm vào cạnh trên hoặc dưới, đảo hướng Y
    if (top <= 0 || top + rect.height >= window.innerHeight) {
      yDirection *= -1;
    }

    // Cập nhật vị trí icon
    icon.style.left = left + "px";
    icon.style.top = top + "px";

    // Gọi lại hàm để tiếp tục di chuyển
    requestAnimationFrame(step);
  };

  // Bắt đầu di chuyển
  step();
}

// Khởi tạo icon khi trang web đã sẵn sàng
document.addEventListener("DOMContentLoaded", createFloatingIcons);

// Khởi tạo xúc xắc
createDice();
