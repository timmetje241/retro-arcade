// Protein Catcher: vang kwark, creatine en halters, maar laat pizza en donuts liggen.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROND_Y = H - 70;
  const RECORD_SLEUTEL = "protein-catcher.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  const gezicht = Arcade.gezichten()[3];

  // --- Spelregels ---
  const LOOPSNELHEID = 430;
  const LEVENS = 3;
  const VANG_BREEDTE = 52;  // hoe ver naast Jessy je nog iets vangt
  const VANG_Y = GROND_Y - 110;
  const SOORTEN = [
    { naam: "kwark", punten: 1, kans: 40, kreten: ["KWARKIE!", "+PROTEINE"] },
    { naam: "creatine", punten: 2, kans: 25, kreten: ["GAINS!", "+5 KG"] },
    { naam: "halter", punten: 3, kans: 8, kreten: ["PUMP!", "BEAST!"] },
    { naam: "pizza", punten: 0, kans: 15, kreten: ["CHEAT MEAL!"] },
    { naam: "donut", punten: 0, kans: 12, kreten: ["NEE! SUIKER!"] }
  ];
  const SLECHT = ["pizza", "donut"];

  let toestand, speler, vallers, kreten, score, levens, tijd, spelTijd, volgende, eindeSinds, schud, nieuwRecord;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  const toetsen = {};
  let wijzerX = null;

  function nieuwSpel() {
    toestand = "klaar";
    speler = { x: W / 2, richting: 1, stap: 0 };
    vallers = [];
    kreten = [];
    score = 0;
    levens = LEVENS;
    spelTijd = 0;
    volgende = 0.5;
    schud = 0;
    nieuwRecord = false;
  }
  tijd = 0;
  eindeSinds = 0;

  function kiesSoort() {
    const totaal = SOORTEN.reduce((s, x) => s + x.kans, 0);
    let r = Math.random() * totaal;
    for (const s of SOORTEN) {
      r -= s.kans;
      if (r < 0) return s;
    }
    return SOORTEN[0];
  }

  // --- Besturing ---
  function start() {
    if (toestand === "klaar") toestand = "spelen";
    else if (toestand === "einde" && tijd - eindeSinds > 0.8) nieuwSpel();
  }

  document.addEventListener("keydown", (e) => {
    toetsen[e.code] = true;
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); if (!e.repeat) start(); }
    if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });
  document.addEventListener("keyup", (e) => { toetsen[e.code] = false; });

  function canvasX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) * (W / r.width);
  }
  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); start(); wijzerX = canvasX(e); });
  canvas.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType === "mouse") wijzerX = canvasX(e); });
  canvas.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") wijzerX = null; });

  // --- Spel bijwerken ---
  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1);
    if (toestand !== "spelen") return;
    spelTijd += dt;

    // Lopen met toetsen of de muis/vinger volgen
    let dx = 0;
    if (toetsen.ArrowLeft || toetsen.KeyA) dx -= 1;
    if (toetsen.ArrowRight || toetsen.KeyD) dx += 1;
    if (dx) {
      wijzerX = null;
      speler.x += dx * LOOPSNELHEID * dt;
    } else if (wijzerX !== null) {
      const verschil = wijzerX - speler.x;
      dx = Math.sign(verschil);
      speler.x += Math.sign(verschil) * Math.min(Math.abs(verschil), LOOPSNELHEID * 1.3 * dt);
      if (Math.abs(verschil) < 4) dx = 0;
    }
    speler.x = Math.max(36, Math.min(W - 36, speler.x));
    if (dx) { speler.richting = dx; speler.stap += dt * 10; }

    // Nieuwe dingen laten vallen, steeds sneller
    volgende -= dt;
    if (volgende <= 0) {
      volgende = Math.max(0.32, 1.0 - spelTijd * 0.012) * (0.7 + Math.random() * 0.6);
      const soort = kiesSoort();
      vallers.push({
        soort,
        x: 30 + Math.random() * (W - 60),
        y: -30,
        v: 150 + spelTijd * 4 + Math.random() * 60,
        draai: (Math.random() - 0.5) * 3,
        hoek: 0
      });
    }

    for (const v of vallers) {
      v.y += v.v * dt;
      v.hoek += v.draai * dt;
      if (!v.weg && v.y >= VANG_Y && v.y <= VANG_Y + 40 && Math.abs(v.x - speler.x) < VANG_BREEDTE) {
        v.weg = true;
        vang(v);
      }
      if (v.y > H + 40) v.weg = true;
    }
    vallers = vallers.filter((v) => !v.weg);
  }

  function vang(v) {
    const s = v.soort;
    kreten.push({ tekst: s.kreten[Math.floor(Math.random() * s.kreten.length)], x: v.x, y: VANG_Y - 30, leeftijd: 0, slecht: SLECHT.includes(s.naam) });
    if (SLECHT.includes(s.naam)) {
      levens--;
      schud = 0.3;
      Arcade.ruis({ duur: 0.2, volume: 0.25 });
      Arcade.toon({ type: "square", van: 300, naar: 80, duur: 0.3, volume: 0.12 });
      if (levens <= 0) einde();
    } else {
      score += s.punten;
      Arcade.toon({ type: "square", van: 600 + s.punten * 150, naar: 1200 + s.punten * 200, duur: 0.1, volume: 0.1 });
    }
  }

  function einde() {
    toestand = "einde";
    eindeSinds = tijd;
    Arcade.toon({ type: "square", van: 440, naar: 55, duur: 0.8, volume: 0.15, vertraging: 0.1 });
    if (score > record) {
      record = score;
      nieuwRecord = true;
      Arcade.bewaar(RECORD_SLEUTEL, record);
    }
  }

  // --- Tekenen ---
  function tekenAchtergrond() {
    const lucht = c.createLinearGradient(0, 0, 0, GROND_Y);
    lucht.addColorStop(0, "#58b8f0");
    lucht.addColorStop(1, "#c4ecff");
    c.fillStyle = lucht;
    c.fillRect(0, 0, W, H);
    // Struiken langs de rivier
    for (let x = 0; x < W; x += 40) {
      const h = 140 + Math.sin(x * 0.07) * 30 + Math.cos(x * 0.13) * 20;
      c.fillStyle = "#2f7d32";
      c.fillRect(x, GROND_Y - h, 41, h);
      c.fillStyle = "#43a047";
      c.fillRect(x + 6, GROND_Y - h + 10, 20, h - 10);
    }
    // Stenen en water
    c.fillStyle = "#d8d2c4";
    c.fillRect(0, GROND_Y, W, H - GROND_Y);
    c.fillStyle = "#b9b1a0";
    for (let x = 10; x < W; x += 46) {
      c.beginPath();
      c.ellipse(x, GROND_Y + 20 + (x % 3) * 8, 18, 10, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "rgba(90, 180, 200, 0.7)";
    c.fillRect(0, H - 22, W, 22);
  }

  function tekenSpeler() {
    const x = speler.x;
    const voet = GROND_Y + 4;
    const been = Math.sin(speler.stap) * 6;
    const huid = "#f1b48e";
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 8, 0);
    // Benen
    c.fillStyle = huid;
    c.fillRect(x - 14 + been, voet - 42, 10, 42);
    c.fillRect(x + 4 - been, voet - 42, 10, 42);
    // Zwembroek in mintgroen, zoals op de foto
    c.fillStyle = "#3ee0b0";
    c.fillRect(x - 20, voet - 62, 40, 26);
    c.fillStyle = "#fff";
    c.fillRect(x - 2, voet - 60, 4, 8);
    // Bovenlijf met spiertjes
    c.fillStyle = huid;
    c.fillRect(x - 22, voet - 112, 44, 52);
    c.fillStyle = "#dc9a74";
    c.fillRect(x - 1, voet - 105, 2, 40);
    c.fillRect(x - 16, voet - 92, 30, 2);
    // Armen omhoog om te vangen
    c.fillStyle = huid;
    c.fillRect(x - 34, voet - 140, 10, 40);
    c.fillRect(x + 24, voet - 140, 10, 40);
    c.fillRect(x - 34, voet - 112, 14, 10);
    c.fillRect(x + 20, voet - 112, 14, 10);
    // Hoofd
    c.fillStyle = "#ff3ea5";
    c.beginPath();
    c.arc(x, voet - 138, 31, 0, Math.PI * 2);
    c.fill();
    Arcade.plaatje(c, gezicht, x, voet - 138, 28);
    c.restore();
  }

  function tekenHart(x, y, vol) {
    c.fillStyle = vol ? "#ff3e5a" : "#444";
    const p = 3;
    const vorm = ["01100110", "11111111", "11111111", "01111110", "00111100", "00011000"];
    vorm.forEach((rij, j) => {
      [...rij].forEach((b, i) => { if (b === "1") c.fillRect(x + i * p, y + j * p, p, p); });
    });
  }

  function teken() {
    c.save();
    tekenAchtergrond();
    for (const v of vallers) {
      c.save();
      c.translate(v.x, v.y);
      c.rotate(v.hoek);
      Tekening[v.soort.naam](c, 0, 0, 44);
      c.restore();
    }
    tekenSpeler();
    kreten.forEach((k) => {
      c.globalAlpha = 1 - k.leeftijd;
      tekst(k.tekst, k.x, k.y - k.leeftijd * 50, 12, k.slecht ? "#ff5a5a" : "#ffe14d");
    });
    c.globalAlpha = 1;

    tekst("SCORE " + score, 16, 30, 14, "#fff", "left");
    for (let i = 0; i < LEVENS; i++) tekenHart(W - 34 - i * 30, 22, i < levens);

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.55)";
      c.fillRect(0, 0, W, H);
      tekst("PROTEIN", W / 2, 140, 34, "#ffe14d");
      tekst("CATCHER", W / 2, 190, 34, "#ffe14d");
      const voorbeelden = [["kwark", "+1"], ["creatine", "+2"], ["halter", "+3"]];
      voorbeelden.forEach(([naam, punten], i) => {
        Tekening[naam](c, 130 + i * 110, 280, 44);
        tekst(punten, 130 + i * 110, 325, 12, "#5fd35f");
      });
      Tekening.pizza(c, 185, 390, 44);
      Tekening.donut(c, 295, 390, 44);
      tekst("NIET VANGEN!", W / 2, 435, 12, "#ff5a5a");
      tekst("PIJLTJES / MUIS / VINGER", W / 2, 500, 11, "#3ef0ff");
      tekst("SPATIE = START", W / 2, 550, 16);
      tekst("ESC = PAUZE   M = GELUID", W / 2, 690, 10, "#ddd");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.6)";
      c.fillRect(0, 0, W, H);
      tekst("GAME OVER", W / 2, 200, 34, "#ff5a5a");
      tekst("TE VEEL CHEAT MEALS", W / 2, 255, 12, "#ffe14d");
      tekst("SCORE " + score, W / 2, 330, 20);
      tekst("RECORD " + record, W / 2, 375, 20, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 420, 14, "#ff3ea5");
      if (tijd - eindeSinds > 0.8 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE = OPNIEUW", W / 2, 500, 16);
      tekst("ESC = PAUZE", W / 2, 550, 12, "#ddd");
    }
    c.restore();
  }

  nieuwSpel();
  Arcade.lus(update, teken);
})();
