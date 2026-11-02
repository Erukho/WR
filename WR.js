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
let respawnX = 0;
let respawnY = 0;
const boneTotems = [];
let equippedWeapon = null;
let playerFacing = "down";
const enemies = [];
let enemySpawnTimer = 5;
const maxEnemies = 12;
const enemySpawnInterval = 12;
let playerAttackCooldown = 0;
let peaceRecoveryRate = 0;

let eventMessages = [];
const maxEventMessages = 5;
const eventMessageDuration = 5;

const discoveredItems = new Set();
let craftingOpen = false;
let craftingSelection = 0;
let travelOpen = false;
let travelSelection = 0;

const recipes = [
  {
    name: "Campfire",
    ingredients: { Branches: 3, "Ash Ember": 1 },
    type: "campfire",
    symbol: "F",
  },
  {
    name: "Bone Totem",
    ingredients: { Bones: 4, "Ash Ember": 1 },
    type: "boneTotem",
    symbol: "Y",
  },
  {
    name: "Rusty Spear",
    ingredients: { Branches: 2, "Scrap Metal": 1 },
    type: "weapon",
    symbol: "/",
  },
  {
    name: "Storage Chest",
    ingredients: { Branches: 4, "Scrap Metal": 2 },
    type: "storageChest",
    symbol: "C",
  },
];

function isRecipeDiscovered(recipe) {
  return Object.keys(recipe.ingredients).every((item) =>
    discoveredItems.has(item),
  );
}

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
  if (currentHp <= 0) {
    playerX = respawnX;
    playerY = respawnY;
    currentHp = maxHp;
    stamina = 50;
    peace = 50;
    addEventMessage("And so you rise again...");
    updateEffectiveStats();
  }
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
const campfires = [];
const maxCarryWeight = 40;
let inventoryOpen = false;
let inventorySelection = 0;
let inventoryScroll = 0;
const previousKeys = {};
const harvestedFruit = new Set();
const usedTiles = new Set();
const searchedStructures = new Set();
let weatherTimer = 0;
let ashStorm = 0;
const storageChest = [];
let chestOpen = false;
let chestSelection = 0;
let chestSide = "player";
let activeChest = null;

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
  discoveredItems.add(name);
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

function getStructureTile(x, y) {
  const regionX = Math.floor(x / 64);
  const regionY = Math.floor(y / 64);

  if (randomAt(regionX, regionY, 90) < 0.84) {
    return null;
  }

  const centerX =
    regionX * 64 + 12 + Math.floor(randomAt(regionX, regionY, 91) * 40);
  const centerY =
    regionY * 64 + 12 + Math.floor(randomAt(regionX, regionY, 92) * 40);
  const layout = [
    "#########",
    "#.......#",
    "#..W....#",
    "#.......#",
    "####.####",
  ];

  const localX = x - (centerX - 4);
  const localY = y - (centerY - 2);

  if (
    localY < 0 ||
    localY >= layout.length ||
    localX < 0 ||
    localX >= layout[0].length
  ) {
    return null;
  }
  const symbol = layout[localY][localX];
  if (symbol === ".") {
    return {
      type: "workshopFloor",
      symbol: ".",
      color: [100, 91, 79],
    };
  }
  if (symbol === "#") {
    return {
      type: "workshopWall",
      symbol: "#",
      color: [125, 115, 105],
    };
  }
  if (symbol === "W") {
    return {
      type: "workbench",
      symbol: "W",
      color: [180, 135, 85],
      structureId: `${regionX},${regionY}:workshop`,
      regionX,
      regionY,
    };
  }
  return null;
}

function getTerrain(x, y) {
  const tile = `${x},${y}`;
  const ground = randomAt(Math.floor(x / 12), Math.floor(y / 12), 10);
  const patch = randomAt(Math.floor(x / 4), Math.floor(y / 4), 20);
  const detail = randomAt(x, y, 30);
  const structure = getStructureTile(x, y);
  if (structure) return structure;
  if (!usedTiles.has(tile)) {
    if (randomAt(Math.floor(x / 24), Math.floor(y / 24), 40) > 0.995) {
      return {
        type: "water",
        symbol: "~",
        color: [65, 145, 200],
      };
    }
    if (randomAt(x, y, 51) > 0.99996) {
      return { type: "mushroom", symbol: "m", color: [160, 90, 190] };
    }
    if (randomAt(x, y, 54) > 0.99996) {
      return { type: "bones", symbol: "x", color: [190, 180, 155] };
    }
    if (randomAt(x, y, 58) > 0.99998) {
      return { type: "rune", symbol: "@", color: [155, 100, 230] };
    }
    if (randomAt(x, y, 53) > 0.99997) {
      return { type: "well", symbol: "O", color: [120, 130, 145] };
    }
    if (randomAt(x, y, 55) > 0.99997) {
      return { type: "ember", symbol: "*", color: [240, 210, 45] };
    }
    if (randomAt(x, y, 56) > 0.99994) {
      return { type: "rations", symbol: "&", color: [200, 170, 105] };
    }
    if (isDeadTree(x, y)) {
      return { type: "deadTree", symbol: "T", color: [115, 90, 70] };
    }
    if (randomAt(x, y, 57) > 0.99994) {
      return { type: "bandage", symbol: "+", color: [210, 210, 195] };
    }
  }
  if (randomAt(x, y, 60) > 0.999995 && !usedTiles.has(tile)) {
    return { type: "shrine", symbol: "Y", color: [150, 135, 160] };
  }

  function isDeadTree(x, y) {
    const regionX = Math.floor(x / 35);
    const regionY = Math.floor(y / 35);
    if (randomAt(regionX, regionY, 80) < 0.97) {
      return false;
    }
    const centerX =
      regionX * 35 + Math.floor(randomAt(regionX, regionY, 81) * 35);
    const centerY =
      regionY * 35 + Math.floor(randomAt(regionX, regionY, 82) * 35);
    const dx = x - centerX;
    const dy = y - centerY;
    return dx * dx + dy * dy <= 5 && randomAt(x, y, 83) > 0.35;
  }

  if (ground < 0.55 && patch > 0.6) {
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
  if (randomAt(x, y, 50) > 0.99997 && !harvestedFruit.has(`${x},${y}`)) {
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

function searchNearbyStructure() {
  for (let y = Math.floor(playerY) - 1; y <= Math.ceil(playerY) + 1; y++) {
    for (let x = Math.floor(playerX) - 1; x <= Math.ceil(playerX) + 1; x++) {
      if (Math.hypot(x - playerX, y - playerY) > 1.5) continue;

      const structure = getTerrain(x, y);

      if (structure.type !== "workbench") continue;

      const id = structure.structureId;

      if (searchedStructures.has(id)) {
        addEventMessage("Workshop already searched.");
        return true;
      }

      const scrapAmount =
        1 + Math.floor(randomAt(structure.regionX, structure.regionY, 93) * 3);

      if (!addItem("Scrap Metal", 0.8, scrapAmount, "#")) {
        return true;
      }

      searchedStructures.add(id);

      if (randomAt(structure.regionX, structure.regionY, 94) > 0.7) {
        addItem("Rusted Parts", 1.2, 1, "]");
      }

      addEventMessage(
        `You search the workshop and find ${scrapAmount} Scrap Metal.`,
      );

      return true;
    }
  }

  return false;
}

function removeItem(name, amount) {
  const item = inventory.find((item) => item.name === name);
  if (!item || item.amount < amount) return false;
  item.amount -= amount;
  if (item.amount <= 0) {
    inventory.splice(inventory.indexOf(item), 1);
    inventorySelection = Math.min(
      inventorySelection,
      Math.max(0, inventory.length - 1),
    );
  }
  return true;
}

function getFacingTile() {
  let x = Math.round(playerX);
  let y = Math.round(playerY);
  if (playerFacing === "up") y--;
  if (playerFacing === "down") y++;
  if (playerFacing === "left") x--;
  if (playerFacing === "right") x++;
  return { x, y };
}

function openNearbyChest() {
  const chest = storageChest.find(
    (chest) => Math.hypot(chest.x - playerX, chest.y - playerY) <= 1.5,
  );
  if (!chest) return false;
  activeChest = chest;
  chestOpen = true;
  chestSelection = 0;
  chestSide = "player";
  return true;
}

function transferChestItem() {
  if (!activeChest) return;
  const source = chestSide === "player" ? inventory : activeChest.items;
  const item = source[chestSelection];
  if (!item) return;
  if (chestSide === "player") {
    const stored = activeChest.items.find(
      (storedItem) => storedItem.name === item.name,
    );
    if (stored) {
      stored.amount += item.amount;
    } else {
      activeChest.items.push({ ...item });
    }
    removeItem(item.name, item.amount);
  } else {
    if (!addItem(item.name, item.weight, item.amount, item.symbol)) {
      return;
    }
    item.amount = 0;
    activeChest.items = activeChest.item.filter(
      (storedItem) => storedItem.amount > 0,
    );
  }
  const updatedSource = chestSide === "player" ? inventory : activeChest.items;
  chestSelection = Math.min(
    chestSelection,
    Math.max(0, updatedSource.length - 1),
  );
}

function craftSelectedRecipe() {
  const recipe = availableRecipes()[craftingSelection];
  if (!recipe) return;
  const x = Math.round(playerX);
  const y = Math.round(playerY);

  if (
    campfires.some((obj) => obj.x === x && obj.y === y) ||
    boneTotems.some((obj) => obj.x === x && obj.y === y)
  ) {
    addEventMessage("There is already structure there.");
    return;
  }
  for (const [name, amount] of Object.entries(recipe.ingredients)) {
    const item = inventory.find((item) => item.name === name);
    if (!item || item.amount < amount) {
      addEventMessage(`Not enough ${name}.`);
      return;
    }
  }
  for (const [name, amount] of Object.entries(recipe.ingredients)) {
    removeItem(name, amount);
  }
  if (recipe.type === "weapon") {
    equippedWeapon = {
      name: "Rusty Spear",
      damage: 5,
    };
    craftingOpen = false;
    return;
  }
  if (recipe.type === "campfire") {
    campfires.push({ x, y });
    addEventMessage("Campfire built.");
  } else if (recipe.type === "boneTotem") {
    boneTotems.push({ x, y });
    respawnX = x;
    respawnY = y;
    addEventMessage("Bone Totem build. Respawn point set.");
  }
  craftingOpen = false;
}

function availableRecipes() {
  return recipes.filter(isRecipeDiscovered);
}

function restAtTheCampfire() {
  const nearby = campfires.some(
    (fire) => Math.hypot(fire.x - playerX, fire.y - playerY) <= 2,
  );
  if (!nearby) {
    addEventMessage("You need nearby campfire to rest.");
    return;
  }
  stamina = Math.min(100, stamina + 40);
  peace = Math.min(100, peace + 25);
  satiation = Math.max(0, satiation - 5);
  hydratation = Math.max(0, hydratation - 5);
  heal(20);
  updateEffectiveStats();
  addEventMessage("You rest beside the fire.");
}

function drawCampfires() {
  for (const fire of campfires) {
    const screenX = Math.round(fire.x - playerX);
    const screenY = Math.round(fire.y - playerY);
    t.push();
    t.translate(screenX, screenY);
    t.charColor(240, 130, 50);
    t.char("F");
    t.point();
    t.pop();
  }
}

function isBlocked(x, y) {
  const tileX = Math.round(x);
  const tileY = Math.round(y);
  const tile = `${tileX},${tileY}`;
  const terrain = getTerrain(tileX, tileY);
  return (
    terrain.type === "water" ||
    terrain.type === "deadTree" ||
    terrain.type === "shrine" ||
    terrain.type === "workshopWall" ||
    terrain.type === "workbench" ||
    campfires.some((obj) => obj.x === tileX && obj.y === tileY) ||
    boneTotems.some((obj) => obj.x === tileX && obj.y === tileY)
  );
}

function spawnEnemy() {
  if (enemies.length >= maxEnemies) return;
  for (let attempt = 0; attempt < 20; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 120;
    const x = Math.round(playerX + Math.cos(angle) * distance);
    const y = Math.round(playerY + Math.sin(angle) * distance);
    if (isBlocked(x, y)) continue;
    const occupied = enemies.some(
      (enemy) => Math.hypot(enemy.x - x, enemy.y - y) < 3,
    );
    if (occupied) continue;
    enemies.push({
      x,
      y,
      hp: 15,
      maxHp: 15,
      speed: 3,
      attackCooldown: 1,
    });
    addEventMessage("Feeling of dread...");
    return;
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    const dx = playerX - enemy.x;
    const dy = playerY - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 12 && distance > 1.1) {
      const moveX = (dx / distance) * enemy.speed * dt;
      const moveY = (dy / distance) * enemy.speed * dt;
      const nextX = enemy.x + moveX;
      const nextY = enemy.y + moveY;
      if (!isBlocked(nextX, enemy.y)) {
        enemy.x = nextX;
      }
      if (!isBlocked(enemy.x, nextY)) {
        enemy.y = nextY;
      }
    }
    const newDistance = Math.hypot(playerX - enemy.x, playerY - enemy.y);
    if (newDistance <= 1.2 && enemy.attackCooldown <= 0) {
      takeDamage(5);
      enemy.attackCooldown = 1.5;
      addEventMessage("Pain creeps in...");
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      enemies.splice(i, 1);
      gainXp(20);
      addItem("Bones", 0, 2, "X");
      addEventMessage("Ashes to ashes");
    }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    const screenX = Math.round(enemy.x - playerX);
    const screenY = Math.round(enemy.y - playerY);
    if (
      screenX < -Math.floor(t.grid.cols / 2) ||
      screenX > Math.floor(t.grid.cols / 2) ||
      screenY < -Math.floor(t.grid.rows / 2) ||
      screenY > Math.floor(t.grid.rows / 2)
    ) {
      continue;
    }
    t.push();
    t.translate(screenX, screenY);
    t.charColor(190, 75, 85);
    t.char("h");
    t.point();
    t.pop();
  }
}

function attackWithWeapon() {
  if (!equippedWeapon) {
    addEventMessage("No weapon equipped");
    return;
  }
  if (playerAttackCooldown > 0) return;
  playerAttackCooldown = 0.5;
  let targetX = playerX;
  let targetY = playerY;
  if (playerFacing === "up") targetY -= 1;
  if (playerFacing === "down") targetY += 1;
  if (playerFacing === "left") targetX -= 1;
  if (playerFacing === "right") targetX += 1;
  let target = null;
  let nearestDistance = 2;
  for (const enemy of enemies) {
    const dx = enemy.x - targetX;
    const dy = enemy.y - targetY;
    const distance = Math.hypot(dx, dy);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      target = enemy;
    }
  }
  if (!target) {
    addEventMessage("Wind whisles");
    return;
  }
  target.hp -= equippedWeapon.damage;
}

function isNearPeacfulPlace() {
  for (let y = Math.floor(playerY) - 5; y <= Math.ceil(playerY) + 5; y++) {
    for (let x = Math.floor(playerX) - 5; x <= Math.ceil(playerX) + 5; x++) {
      if (Math.hypot(x - playerX, y - playerY) > 5) continue;
      if (getTerrain(x, y).type === "shrine") {
        return true;
      }
    }
  }
  return campfires.some(
    (fire) => Math.hypot(fire.x - playerX, fire.y - playerY) <= 3,
  );
}

function updatePeace(dt) {
  let nearestDistance = Infinity;
  for (const enemy of enemies) {
    const distance = Math.hypot(enemy.x - playerX, enemy.y - playerY);
    nearestDistance = Math.min(nearestDistance, distance);
  }
  if (nearestDistance <= 3) {
    peace = Math.max(0, peace - 4 * dt);
  } else if (nearestDistance <= 6) {
    peace = Math.max(0, peace - 2 * dt);
  } else if (nearestDistance <= 10) {
    peace = Math.max(0, peace - 0.75 * dt);
  } else {
    const recovery = isNearPeacfulPlace() ? 3 : peaceRecoveryRate;
    peace = Math.min(100, peace + recovery * dt);
  }
  updateEffectiveStats();
}

function getNearbyTotems() {
  return boneTotems.find(
    (totems) => Math.hypot(totems.x - playerX, totems.y - playerY) <= 1.5,
  );
}

function activateTotem() {
  const totems = getNearbyTotems();
  if (!totems) {
    addEventMessage("No bone totem nearby.");
    return;
  }
  respawnX = totems.x;
  respawnY = totems.y;
  addEventMessage("Respawn point changed.");
}

function openTravelMenu() {
  if (!getNearbyTotems()) {
    addEventMessage("You need to be near a bone totem");
    return;
  }
  if (boneTotems.length < 2) {
    addEventMessage("No other totems to travel to");
    return;
  }
  travelOpen = true;
  travelSelection = 0;
}

function travelToSelectedTotem() {
  const totem = boneTotems[travelSelection];
  if (!totem) return;
  playerX = totem.x;
  playerY = totem.y;
  travelOpen = false;
  addEventMessage("You travel to the bone totem");
}

function drawBoneTotems() {
  for (const totem of boneTotems) {
    const screenX = Math.round(totem.x - playerX);
    const screenY = Math.round(totem.y - playerY);
    t.push();
    t.translate(screenX, screenY);
    t.charColor(190, 180, 155);
    t.char("Y");
    t.point();
    t.pop();
  }
}

function drawCraftingMenu() {
  if (!craftingOpen) return;
  const left = -Math.floor(t.grid.cols / 2) + 2;
  const top = -Math.floor(t.grid.rows / 2) + 2;
  const list = availableRecipes();
  t.charColor(210, 195, 165);
  t.print("CRAFTING", left, top);
  if (list.length === 0) {
    t.charColor(170, 170, 160);
    t.print("No recipes discovered", left, top + 3);
  }
  for (let i = 0; i < list.length; i++) {
    const recipe = list[i];
    const y = top + 3 + i * 5;
    t.charColor(i === craftingSelection ? 230 : 155, 200, 165);
    t.print(`${i === craftingSelection ? ">" : " "} ${recipe.name}`, left, y);
    t.charColor(170, 170, 160);
    let ingredients = Object.entries(recipe.ingredients)
      .map(([name, amount]) => `${name} x${amount}`)
      .join(", ");
    t.print(ingredients, left + 2, y + 2);
  }
  t.charColor(170, 170, 160);
  t.print("W/S select ENTER craft C close", left, top + 3 + list.length * 5);
}

function drawTravelMenu() {
  if (!travelOpen) return;

  const left = -Math.floor(t.grid.cols / 2) + 2;
  const top = -Math.floor(t.grid.rows / 2) + 2;
  t.charColor(210, 195, 165);
  t.print("BONE TOTEMS", left, top);

  for (let i = 0; i < boneTotems.length; i++) {
    const totem = boneTotems[i];
    const y = top + 3 + i * 2;

    t.charColor(i === travelSelection ? 230 : 155, 200, 165);
    t.print(`${i === travelSelection ? ">" : " "} Totem ${i + 1}`, left, y);
    t.charColor(170, 170, 160);
    t.print(`(${totem.x}, ${totem.y})`, left + 2, y + 1);
  }
  t.charColor(170, 170, 160);
  t.print(
    "W/S select ENTER travel V close",
    left,
    top + 5 + boneTotems.length * 2,
  );
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

  drawCampfires();
  drawBoneTotems();
  const dt = t.deltaTime() / 1000;
  updateEventMessages(dt);
  enemySpawnTimer -= dt;
  playerAttackCooldown = Math.max(0, playerAttackCooldown - dt);
  if (enemySpawnTimer <= 0) {
    spawnEnemy();
    enemySpawnTimer = enemySpawnInterval + Math.random() * 8;
  }
  updateEnemies(dt);
  updatePeace(dt);

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
  if (justPressed("i") && !craftingOpen && !travelOpen) {
    inventoryOpen = !inventoryOpen;
  }
  if (craftingOpen) {
    const list = availableRecipes();
    if (justPressed("w")) {
      craftingSelection = Math.max(0, craftingSelection - 1);
    }
    if (justPressed("s")) {
      craftingSelection = Math.min(list.length - 1, craftingSelection + 1);
    }
    if (justPressed("Enter")) {
      craftSelectedRecipe();
    }
    if (justPressed("c")) {
      craftingOpen = false;
    }
  } else if (travelOpen) {
    if (justPressed("w")) {
      travelSelection = Math.max(0, travelSelection - 1);
    }
    if (justPressed("s")) {
      travelSelection = Math.min(boneTotems.length - 1, travelSelection + 1);
    }
    if (justPressed("Enter")) {
      travelToSelectedTotem();
    }
    if (justPressed("v")) {
      travelOpen = false;
    }
  } else if (inventoryOpen) {
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
    let nextX = playerX;
    let nextY = playerY;

    if (justPressed("c")) {
      craftingOpen = true;
      craftingSelection = 0;
    }

    if (justPressed("r")) {
      restAtTheCampfire();
    }

    if (justPressed(" ")) {
      attackWithWeapon();
    }

    if (justPressed("e")) {
      activateTotem();
    }

    if (justPressed("v")) {
      openTravelMenu();
    }

    if (t.isKeyPressed("w")) {
      nextY -= moveSpeed * dt;
      playerFacing = "up";
    }
    if (t.isKeyPressed("s")) {
      nextY += moveSpeed * dt;
      playerFacing = "down";
    }
    if (t.isKeyPressed("a")) {
      nextX -= moveSpeed * dt;
      playerFacing = "left";
    }
    if (t.isKeyPressed("d")) {
      nextX += moveSpeed * dt;
      playerFacing = "right";
    }

    if (!isBlocked(playerX, nextY)) playerY = nextY;
    if (!isBlocked(nextX, playerY)) playerX = nextX;
  }
  if (!inventoryOpen && !craftingOpen && !travelOpen && justPressed("f")) {
    if (!searchNearbyStructure()) {
      let found = false;
      for (let y = Math.floor(playerY) - 1; y <= Math.ceil(playerY) + 1; y++) {
        for (
          let x = Math.floor(playerX) - 1;
          x <= Math.ceil(playerX) + 1;
          x++
        ) {
          if (Math.hypot(x - playerX, y - playerY) > 1.5) continue;
          const tile = `${x},${y}`;
          if (usedTiles.has(tile)) continue;
          const type = getTerrain(x, y).type;
          let item = null;
          if (type === "mushroom") item = ["Grave Mushroom", 0.2, "m"];
          if (type === "rations") item = ["Forgotten Rations", 0.5, "&"];
          if (type === "bandage") item = ["Torn Bandage", 0.2, "+"];
          if (type === "rune") item = ["Grave Rune", 0.1, "@"];
          if (type === "ashFruit") item = ["Ash Fruit", 0.2, "%"];
          if (type === "bones") item = ["Bones", 0, "x"];
          if (type === "ember") item = ["Ash Ember", 0.1, "*"];
          if (type === "deadTree") item = ["Branches", 0.5, "/"];
          if (type === "deadGrass") item = ["Dead Grass", 0.1, ";"];
          if (type === "deadWood") item = ["Dead Wood", 0.4, "/"];
          if (item) {
            if (addItem(item[0], item[1], 1, item[2])) {
              usedTiles.add(tile);
              harvestedFruit.add(tile);
            }
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        addEventMessage("Nothing to harvest nearby.");
      }
    }
  }

  /*
  if (t.isKeyPressed("e")) {
    // TEMPORARY!!!!!!!!!!!!
    gainXp(10);
    addEventMessage(`Gained 10 XP!`);
    addItem("Ash Ember", 0.1, 1, "*");
    addItem("Branches", 0.5, 3, "/");
  }
*/

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
  drawEnemies();
  drawCraftingMenu();
  drawTravelMenu();

  t.char("@");
  t.charColor(180, 220, 180);
  t.point();

  if (equippedWeapon) {
    let weaponX = 0;
    let weaponY = 0;
    let weaponSymbol = "|";
    if (playerFacing === "up") {
      weaponY = -1;
    } else if (playerFacing === "down") {
      weaponY = 1;
    } else if (playerFacing === "left") {
      weaponX = -1;
      weaponSymbol = "-";
    } else if (playerFacing === "right") {
      weaponX = 1;
      weaponSymbol = "-";
    }

    t.push();
    t.translate(weaponX, weaponY);
    t.charColor(190, 160, 110);
    t.char(weaponSymbol);
    t.point();
    t.pop();
  }

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
