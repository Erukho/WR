const t = textmode.create({
  width: window.innerWidth,
  height: window.innerHeight,
  fontSize: 18,
});

let playerX = 0;
let playerY = 0;
let moveSpeed = 20;

t.draw(() => {
  t.background(16, 19, 24);
  const dt = t.deltaTime() / 1000;

  if (t.isKeyPressed("w")) playerY -= moveSpeed * dt;
  if (t.isKeyPressed("s")) playerY += moveSpeed * dt;
  if (t.isKeyPressed("a")) playerX -= moveSpeed * dt;
  if (t.isKeyPressed("d")) playerX += moveSpeed * dt;

  t.push();
  t.translate(playerX, playerY);
  t.char("@");
  t.charColor(180, 220, 180);
  t.point();
  t.pop();
});
