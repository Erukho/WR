const t = textmode.create({
  width: window.innerWidth,
  height: window.innerHeight,
  fontSize: 20,
});

let playerX = 0;
let playerY = 0;
let moveSpeed = 20;
let playerLevel = 1;
let playerXp = 0;
let xpToNextLevel = 100;
let maxHp = playerLevel * 10;
let currentHp = maxHp;
let hydratation = 100;
let satiation = 100;
let hydratationTimer = 0;
let satiationTimer = 0;
let stamina = 100;
let peace = 100;
let body = 10;
let mind = 10;
let spirit = 10;
let maxBody = 10;
let maxMind = 10;
let maxSpirit = 10;
let baseBody = 10;
let baseMind = 10;
let baseSpirit = 10;

let eventMessages = [];
const maxEventMessages = 5;
const eventMessageDuration = 5;

function gainXp(amount) {
  playerXp += amount;

  while (playerXp >= xpToNextLevel) {
    playerXp -= xpToNextLevel;
    playerLevel++;
    updateMaxStats();
    maxHp = playerLevel * 10;
    xpToNextLevel *= 2;
  }
}

function takeDamage(amount) {
  currentHp = Math.max(0, currentHp - amount);
}

function heal(amount) {
  currentHp = Math.min(maxHp, currentHp + amount);
}

function updateMaxStats() {
  const newMax = playerLevel * (playerLevel + 1) * 5;
  const statGain = playerLevel * 10;

  maxBody = newMax;
  maxMind = newMax;
  maxSpirit = newMax;

  baseBody = Math.min(maxBody, baseBody + statGain);
  baseMind = Math.min(maxMind, baseMind + statGain);
  baseSpirit = Math.min(maxSpirit, baseSpirit + statGain);

  updateEffectiveStats();
}

function updateEffectiveStats() {
  const bodyPenalty = Math.min(100, 100 - hydratation + (100 - satiation));
  body = baseBody * (1 - bodyPenalty / 100);
  mind = baseMind * (stamina / 100);
  spirit = baseSpirit * (peace / 100);
}

function spendBody(amount) {
  if (body < amount) return false;

  baseBody = Math.max(0, baseBody - amount);
  updateEffectiveStats();
  return true;
}

function spendMind(amount) {
  if (mind < amount) return false;

  baseMind = Math.max(0, baseMind - amount);
  updateEffectiveStats();
  return true;
}

function spendSprit(amount) {
  if (spirit < amount) return false;

  baseSpirit = Math.max(0, baseSpirit - amount);
  updateEffectiveStats();
  return true;
}

function addEventMessage(text) {
  eventMessages.push({
    text,
    timeLeft: eventMessageDuration,
  });
  if (eventMessages.length > maxEventMessages) {
    eventMessages.shift();
  }
}

function updateEventMessages(dt) {
  for (const message of eventMessages) {
    message.timeLeft -= dt;
  }

  eventMessages = eventMessages.filter((message) => message.timeLeft > 0);
}

function drawEventMessages() {
  const right = Math.floor(t.grid.cols / 2) - 2;
  const bottom = Math.floor(t.grid.rows / 2) - 2;

  t.charColor(220, 220, 220);

  for (let i = 0; i < eventMessages.length; i++) {
    const message = eventMessages[i];
    const y = bottom - (eventMessages.length - 1 - i) * 2;
    t.print(message.text, right - message.text.length, y);
  }
}

function drawObject(obj, screenX, screenY) {
  let symbol = "?";
  let color = [200, 200, 200];

  if (obj.type === "tree") {
    symbol = "T";
    color = [80, 180, 100];
  } else if (obj.type === "rock") {
    symbol = "O";
    color = [150, 150, 160];
  } else if (obj.type === "flower") {
    symbol = "*";
    color = [220, 180, 100];
  }

  t.push();
  t.translate(screenX, screenY);
  t.charColor(...color);
  t.char(symbol);
  t.point();
  t.pop();
}

const inventory = [];
const droppedItems = [];
const maxCarryWeight = 40;
let inventoryOpen = false;
let inventorySelection = 0;
let inventoryScroll = 0;
const previousKeys = {};
const harvestedFruit = new Set();
const usedTiles = new Set();
let weatherTimer = 0;
let ashStorm = 0;

function justPressed(key) {
  const pressed = t.isKeyPressed(key);
  const result = pressed && !previousKeys[key];
  previousKeys[key] = pressed;
  return result;
}
function getCarryWeight() {
  return inventory.reduce(
    (total, item) => total + item.weight * item.amount,
    0,
  );
}
function addItem(name, weight, amount = 1, symbol = "?") {
  const existing = inventory.find((item) => item.name === name);
  if (getCarryWeight() + weight * amount > maxCarryWeight) {
    addEventMessage("Too heavy to carry!");
    return false;
  }
  if (existing) {
    existing.amount += amount;
  } else {
    inventory.push({ name, weight, amount, symbol });
  }
  addEventMessage(`Obtained ${name}`);
  return true;
}
function dropSelectedItem() {
  const item = inventory[inventorySelection];
  if (!item) return;
  droppedItems.push({
    x: Math.round(playerX),
    y: Math.round(playerY),
    name: item.name,
    weight: item.weight,
    amount: item.amount,
    symbol: item.symbol,
    color: [210, 175, 115],
  });
  addEventMessage(`Dropped ${item.name} x${item.amount}`);
  inventory.splice(inventorySelection, 1);
  inventorySelection = Math.min(
    inventorySelection,
    Math.max(0, inventory.length - 1),
  );
}
function drawDroppedItem() {
  for (const item of droppedItems) {
    const screenX = Math.round(item.x - playerX);
    const screenY = Math.round(item.y - playerY);
    if (
      screenX < -Math.floor(t.grid.cols / 2) ||
      screenX > Math.floor(t.grid.cols / 2) ||
      screenY < -Math.floor(t.grid.rows / 2) ||
      screenY > Math.floor(t.grid.rows)
    ) {
      continue;
    }
    t.push();
    t.translate(screenX, screenY);
    t.charColor(...item.color);
    t.char(item.symbol);
    t.point();
    t.pop();
  }
}
function pickUpItem() {
  let nearestIndex = -1;
  let nearestDistance = 1.5;
  for (let i = 0; i < droppedItems.length; i++) {
    const item = droppedItems[i];
    const distance = Math.hypot(item.x - playerX, item.y - playerY);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  }
  if (nearestIndex === -1) {
    addEventMessage("Nothing nearby to pick up!");
    return;
  }
  const item = droppedItems[nearestIndex];
  if (!addItem(item.name, item.weight, item.amount, item.symbol)) {
    return;
  }
  droppedItems.splice(nearestIndex, 1);
}

function pickUpAshFruit() {
  //rewwrite later
  for (let y = Math.floor(playerY) - 1; y <= Math.ceil(playerY) + 1; y++) {
    for (let x = Math.floor(playerX) - 1; x <= Math.ceil(playerX) + 1; x++) {
      if (
        getTerrain(x, y).type === "ashFruit" &&
        Math.hypot(x - playerX, y - playerY) <= 1.5
      ) {
        if (addItem("Ash Fruit", 0.2, 1, "%")) {
          harvestedFruit.add(`${x},${y}`);
        }
        return true;
      }
    }
  }

  return false;
}

function useSelectedItem() {
  const item = inventory[inventorySelection];

  if (!item) return;

  if (item.name === "Ash Fruit") {
    satiation = Math.min(100, satiation + 25);
    item.amount--;

    if (item.amount <= 0) {
      inventory.splice(inventorySelection, 1);
      inventorySelection = Math.min(
        inventorySelection,
        Math.max(0, inventory.length - 1),
      );
    }

    updateEffectiveStats();
    addEventMessage("You eat the Ash Fruit. Hunger fades.");
  } else {
    addEventMessage("You cannot use that item yet.");
  }
}

const WORLD_SEED = 12345;
function randomAt(x, y, salt = 0) {
  let n =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(WORLD_SEED + salt, 1442695041);

  n = Math.imul(n ^ (n >> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}

function getTerrain(x, y) {
  const ground = randomAt(Math.floor(x / 12), Math.floor(y / 12), 10);
  const patch = randomAt(Math.floor(x / 4), Math.floor(y / 4), 20);
  const detail = randomAt(x, y, 30);
  if (!usedTiles.has(tile)) {
    if (randomAt(x, y, 51) > 0.996) {
      return { type: "mushroom", symbol: "m", color: [160, 90, 190] };
    }
    if (randomAt(x, y, 54) > 0.996) {
      return { type: "bones", symbol: "x", color: [190, 180, 155] };
    }
    if (randomAt(x, y, 58) > 0.998) {
      return { type: "rune", symbol: "♦", color: [155, 100, 230] };
    }
    if (randomAt(x, y, 53) > 0.997) {
      return { type: "well", symbol: "O", color: [120, 130, 145] };
    }
    if (randomAt(x, y, 55) > 0.997) {
      return { type: "ember", symbol: "*", color: [240, 210, 45] };
    }
    if (randomAt(x, y, 56) > 0.994) {
      return { type: "rations", symbol: "&", color: [200, 170, 105] };
    }
    if (randomAt(x, y, 52) > 0.997) {
      return { type: "deadTree", symbol: "T", color: [115, 90, 70] };
    }
    if (randomAt(x, y, 57) > 0.994) {
      return { type: "bandage", symbol: "+", color: [210, 210, 195] };
    }
  }
  if (randomAt(x, y, 60) > 0.099) {
    return { type: "shrine", symbol: "†", color: [150, 135, 160] };
  }
  if (ground < 0.72 && patch > 0.45) {
    return {
      type: "rubble",
      symbol: ".",
      color: [115, 105, 91],
    };
  }
  if (ground < 0.35 && patch > 0.67) {
    return {
      type: "deadGrass",
      symbol: ";",
      color: [173, 148, 94],
    };
  }
  if (detail > 0.992) {
    return {
      type: "deadWood",
      symbol: "/",
      color: [180, 119, 83],
    };
  }
  if (randomAt(Math.floor(x / 24), Math.floor(y / 24), 40) > 0.995) {
    return {
      type: "water",
      symbol: "~",
      color: [65, 145, 200],
    };
  }
  if (randomAt(x, y, 50) > 0.997 && !harvestedFruit.has(`${x},${y}`)) {
    return {
      type: "ashFruit",
      symbol: "%",
      color: [190, 75, 115],
    };
  }
  const shade = Math.floor(detail * 10);
  return {
    type: "wornEarth",
    symbol: ":",
    color: [103 + shade, 98 + shade, 86 + shade],
  };
}

t.draw(() => {
  t.background(16, 19, 24);

  const cols = t.grid.cols;
  const rows = t.grid.rows;
  const startX = Math.floor(playerX - cols / 2);
  const startY = Math.floor(playerY - rows / 2);
  const endX = Math.floor(playerX + cols / 2);
  const endY = Math.floor(playerY + rows / 2);
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const terrain = getTerrain(x, y);
      const screenX = Math.round(x - playerX);
      const screenY = Math.round(y - playerY);

      t.push();
      t.translate(screenX, screenY);
      t.charColor(...terrain.color);
      t.char(terrain.symbol);
      t.point();
      t.pop();
    }
  }

  const dt = t.deltaTime() / 1000;
  updateEventMessages(dt);

  hydratationTimer += dt;
  satiationTimer += dt;

  if (hydratationTimer >= 30) {
    hydratation = Math.max(0, hydratation - Math.floor(hydratationTimer / 30));
    hydratationTimer %= 30;
  }

  if (satiationTimer >= 90) {
    satiation = Math.max(0, satiation - Math.floor(satiationTimer / 90));
    satiationTimer %= 90;
  }

  updateEffectiveStats();
  if (justPressed("i")) {
    inventoryOpen = !inventoryOpen;
  }
  if (inventoryOpen) {
    if (justPressed("w")) {
      inventorySelection = Math.max(0, inventorySelection - 1);
    }
    if (justPressed("s")) {
      inventorySelection = Math.min(
        inventory.length - 1,
        inventorySelection + 1,
      );
    }
    if (justPressed("g")) {
      dropSelectedItem();
    }
    if (justPressed("u")) {
      useSelectedItem();
    }
  } else {
    if (t.isKeyPressed("w")) playerY -= moveSpeed * dt;
    if (t.isKeyPressed("s")) playerY += moveSpeed * dt;
    if (t.isKeyPressed("a")) playerX -= moveSpeed * dt;
    if (t.isKeyPressed("d")) playerX += moveSpeed * dt;
  }
  if (!inventoryOpen && justPressed("f")) {
    let found = false;
    for (let y = Math.floor(playerY) - 1; y <= Math.ceil(playerY) + 1; y++) {
      for (let x = Math.floor(playerX) - 1; x <= Math.ceil(playerX) + 1; x++) {
        if (Math.hypot(x - playerX, y - playerY) > 1.5) continue;
        const tile = `${x},${y}`;
        if (usedTiles.has(tile)) continue;
        const type = getTerrain(x, y).type;
        let item = null;
        if (type === "mushroom") item = ["Grave Mushroom", 0.2, "m"];
        if (type === "rations") item = ["Forgotten Rations", 0.5, "&"];
        if (type === "bandage") item = ["Torn Bandage", 0.2, "+"];
        if (type === "rune") item = ["Grave Rune", 0.1, "♦"];
      }
    }
  }

  if (t.isKeyPressed("e")) {
    // TEMPORARY!!!!!!!!!!!!
    gainXp(10);
    addEventMessage(`Gained 10 XP!`);
    addItem("Dry roots", 0.2, 3, ";");
    addItem("Stone", 2.0, 5, "o");
    addItem("Old cloth", 0.2, 2, "~");
    addItem("Broken wood", 1.5, 4, "/");
  }

  const right = Math.floor(t.grid.cols / 2) - 2;
  const top = -Math.floor(t.grid.rows / 2) + 2;

  t.charColor(220, 220, 220);
  t.print(`Level: ${playerLevel}`, right - 10, top);
  t.print(
    `XP: ${playerXp} / ${xpToNextLevel}`,
    right - 10 - playerLevel / 2,
    top + 2,
  );

  t.charColor(220, 100, 100);
  t.print(`HP: ${currentHp} / ${maxHp}`, right - 10, top + 4);

  t.charColor(80, 170, 220);
  t.print(`Hydration: ${hydratation}%`, right - 15, top + 6);
  t.charColor(210, 180, 100);
  t.print(`Satiation: ${satiation}%`, right - 15, top + 8);

  t.charColor(100, 200, 120);
  t.print(`Stamina: ${stamina}%`, right - 15, top + 10);

  t.charColor(180, 150, 220);
  t.print(`Peace: ${peace}%`, right - 15, top + 12);

  t.charColor(220, 220, 220);
  t.print(`Body: ${body.toFixed(1)}`, right - 15, top + 14);
  t.print(`Mind: ${mind.toFixed(1)}`, right - 15, top + 16);
  t.print(`Spirit: ${spirit.toFixed(1)}`, right - 15, top + 18);

  drawEventMessages();

  function drawInventory() {
    if (!inventoryOpen) return;
    const left = -Math.floor(t.grid.cols / 2) + 2;
    const top = -Math.floor(t.grid.rows / 2) + 2;
    const visibleRows = Math.max(1, Math.floor(t.grid.rows / 2) - 5);
    if (inventorySelection < inventoryScroll) {
      inventoryScroll = inventorySelection;
    }
    if (inventorySelection >= inventoryScroll + visibleRows) {
      inventoryScroll = inventorySelection - visibleRows + 1;
    }
    t.charColor(210, 195, 165);
    t.print("INVENTORY", left, top);
    t.charColor(170, 170, 160);
    t.print(
      `Weight: ${getCarryWeight().toFixed(1)} / ${maxCarryWeight}`,
      left,
      top + 2,
    );
    for (let row = 0; row < visibleRows; row++) {
      const index = inventoryScroll + row;
      const item = inventory[index];
      if (!item) break;
      const y = top + 5 + row * 2;
      const selected = index === inventorySelection;
      t.charColor(
        selected ? 230 : 155,
        selected ? 210 : 155,
        selected ? 160 : 145,
      );
      const name = selected ? `> ${item.name}` : `${item.name}`;
      t.print(name, left, y);
      t.charColor(175, 170, 155);
      t.print(
        `x${item.amount} ${(item.weight * item.amount).toFixed(1)}`,
        left + 2,
        y + 1,
      );
    }
    t.charColor(170, 170, 160);
    t.print("W/S select", left, top + 5 + visibleRows * 2);
    t.print("G drop U use I close", left, top + 7 + visibleRows * 2);
  }

  drawInventory();
  drawDroppedItem();

  t.char("@");
  t.charColor(180, 220, 180);
  t.point();
  t.pop();

  t.charColor(220, 220, 220);
  t.print(
    `X: ${playerX.toFixed(1)} Y: ${playerY.toFixed(1)}`,
    -Math.floor(t.grid.cols / 2) + 2,
    -Math.floor(t.grid.rows / 2) + 2,
  );

  t.windowResized(() => {
    t.resizeCanvas(window.innerWidth, window.innerHeight);
  });
});
