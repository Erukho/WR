const t = textmode.create({
  width: window.innerWidth,
  height: window.innerHeight,
  fontSize: 18,
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

const objects = [
  { type: "tree", x: 5, y: 5 },
  { type: "rock", x: -3, y: 2 },
  { type: "flower", x: 1, y: -4 },
];

t.draw(() => {
  t.background(16, 19, 24);

  const cols = t.grid.cols;
  const rows = t.grid.rows;
  for (let y = 0 - Math.floor(rows / 2); y < Math.ceil(rows / 2); y++) {
    for (let x = 0 - Math.floor(cols / 2); x < Math.ceil(cols / 2); x++) {
      t.push();
      t.translate(x, y);
      t.charColor(100, 115, 100);
      t.char(".");
      t.point();
      t.pop();
    }
  }

  const dt = t.deltaTime() / 1000;

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

  if (t.isKeyPressed("w")) playerY -= moveSpeed * dt;
  if (t.isKeyPressed("s")) playerY += moveSpeed * dt;
  if (t.isKeyPressed("a")) playerX -= moveSpeed * dt;
  if (t.isKeyPressed("d")) playerX += moveSpeed * dt;

  if (t.isKeyPressed("e")) {
    // TEMPORARY!!!!!!!!!!!!
    gainXp(10);
  }

  for (const obj of objects) {
    const screenX = Math.round(obj.x - playerX);
    const screenY = Math.round(obj.y - playerY);

    drawObject(obj, screenX, screenY);
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
