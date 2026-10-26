// Whack-a-Jessy: mep Jessy terug zijn hol in, maar laat de koe met rust.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "whack.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  const gezichten = Arcade.gezichten();

  // --- Spelregels ---
  const SPEELTIJD = 30;
  const KOE_KANS = 0.15;
  const KOE_STRAF = 3;
  const GAT_R = 52;
  const GATEN = [];
  for (let rij = 0; rij < 3; rij++) {
    for (let kol = 0; kol < 3; kol++) GATEN.push({ x: 90 + kol * 150, y: 250 + rij * 160 });
  }
  // Toetsen 1-9 zoals op een numpad (7 8 9 bovenaan) en QWE/ASD/ZXC
  const TOETS_GAT = {
    Numpad7: 0, Numpad8: 1, Numpad9: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad1: 6, Numpad2: 7, Numpad3: 8,
    KeyQ: 0, KeyW: 1, KeyE: 2, KeyA: 3, KeyS: 4, KeyD: 5, KeyZ: 6, KeyX: 7, KeyC: 8
  };
  const AU = ["AU!", "BONK!", "HEY!", "AUW!", "WHACK!"];

  let toestand, mollen, kreten, score, rest, volgende, nieuwRecord, schud;
  let tijd = 0;
  let eindeSinds = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  const hamer = { x: W / 2, y: H / 2, slag: 0 };

  function nieuwSpel() {
    toestand = "klaar";
    mollen = [];
    kreten = [];
    score = 0;
    rest = SPEELTIJD;
    volgende = 0.4;
    nieuwRecord = false;
    schud = 0;
  }

  // Hoe ver het spel al is, van 0 (begin) tot 1 (einde)
  function voortgang() {
    return 1 - rest / SPEELTIJD;
  }

  function nieuweMol() {
    const vrij = GATEN.map((_, i) => i).filter((i) => !mollen.some((m) => m.gat === i));
    if (!vrij.length) return;
    const gat = vrij[Math.floor(Math.random() * vrij.length)];
    mollen.push({
      gat,
      koe: Math.random() < KOE_KANS,
      gezicht: gezichten[Math.floor(Math.random() * gezichten.length)],
      hoogte: 0,        // 0 = in het gat, 1 = helemaal boven
      boven: 1.15 - voortgang() * 0.55,
      fase: "omhoog",
      geraakt: false
    });
  }

  // --- Besturing ---
  function start() {
    if (toestand === "klaar") { toestand = "spelen"; return true; }
    if (toestand === "einde" && tijd - eindeSinds > 1) { nieuwSpel(); return true; }
    return false;
  }

  function mep(gat) {
    hamer.slag = 0.15;
    if (toestand !== "spelen") return;
    const m = mollen.find((x) => x.gat === gat && !x.geraakt && x.hoogte > 0.35);
    if (!m) {
      Arcade.toon({ type: "triangle", van: 160, duur: 0.05, volume: 0.08 });
      return;
    }
    m.geraakt = true;
    m.fase = "omlaag";
    const g = GATEN[gat];
    if (m.koe) {
      score = Math.max(0, score - KOE_STRAF);
      schud = 0.3;
      kreten.push({ tekst: "NIET DE KOE! -" + KOE_STRAF, x: g.x, y: g.y - 80, leeftijd: 0, slecht: true });
      Arcade.toon({ type: "sawtooth", van: 160, naar: 95, duur: 0.6, volume: 0.2, filter: 800 });
    } else {
      score++;
      kreten.push({ tekst: AU[Math.floor(Math.random() * AU.length)], x: g.x, y: g.y - 80, leeftijd: 0 });
      Arcade.ruis({ duur: 0.06, volume: 0.2 });
      Arcade.toon({ type: "square", van: 900, naar: 300, duur: 0.12, volume: 0.1 });
    }
  }

  function canvasPunt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPunt(e);
    hamer.x = p.x;
    hamer.y = p.y;
  });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = canvasPunt(e);
    hamer.x = p.x;
    hamer.y = p.y;
    if (start()) return;
    // Het gat waar je (ongeveer) op tikt, ook als je op het hoofd boven het gat tikt
    const gat = GATEN.findIndex((g) => Math.abs(p.x - g.x) < 70 && p.y > g.y - 110 && p.y < g.y + 40);
    if (gat >= 0) mep(gat);
    else hamer.slag = 0.15;
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); if (!e.repeat) start(); return; }
    if (e.code === "Escape") { Arcade.naarMenu(); return; }
    if (e.code === "KeyM") { Arcade.zetStil(!Arcade.isStil()); return; }
    let gat = TOETS_GAT[e.code];
    if (gat === undefined && /^Digit[1-9]$/.test(e.code)) {
      const n = Number(e.code.slice(5));
      gat = [6, 7, 8, 3, 4, 5, 0, 1, 2][n - 1];
    }
    if (gat !== undefined && !e.repeat) {
      hamer.x = GATEN[gat].x + 30;
      hamer.y = GATEN[gat].y - 60;
      mep(gat);
    }
  });

  // --- Spel bijwerken ---
  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    hamer.slag = Math.max(0, hamer.slag - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 0.9);
    if (toestand !== "spelen") return;

    rest -= dt;
    if (rest <= 0) {
      rest = 0;
      toestand = "einde";
      eindeSinds = tijd;
      mollen = [];
      Arcade.toon({ type: "square", van: 523, duur: 0.15, volume: 0.1 });
      Arcade.toon({ type: "square", van: 392, duur: 0.15, volume: 0.1, vertraging: 0.15 });
      Arcade.toon({ type: "square", van: 262, duur: 0.4, volume: 0.1, vertraging: 0.3 });
      if (score > record) {
        record = score;
        nieuwRecord = true;
        Arcade.bewaar(RECORD_SLEUTEL, record);
      }
      return;
    }

    volgende -= dt;
    if (volgende <= 0) {
      volgende = (0.75 - voortgang() * 0.4) * (0.6 + Math.random() * 0.8);
      nieuweMol();
    }

    for (const m of mollen) {
      if (m.fase === "omhoog") {
        m.hoogte = Math.min(1, m.hoogte + dt * 7);
        if (m.hoogte >= 1) m.fase = "boven";
      } else if (m.fase === "boven") {
        m.boven -= dt;
        if (m.boven <= 0) m.fase = "omlaag";
      } else {
        m.hoogte -= dt * (m.geraakt ? 4 : 6);
        if (m.hoogte <= 0) m.weg = true;
      }
    }
    mollen = mollen.filter((m) => !m.weg);
  }

  // --- Tekenen ---
  function tekenAchtergrond() {
    c.fillStyle = "#6cc04a";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#5daf3d";
    for (let y = 0; y < H; y += 24) {
      for (let x = (y / 24) % 2 ? 12 : 0; x < W; x += 24) c.fillRect(x, y, 4, 8);
    }
    c.fillStyle = "#2f6b1f";
    c.fillRect(0, 0, W, 120);
  }

  function tekenKoe(x, y) {
    c.font = "86px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("🐄", x, y);
  }

  function tekenGat(g, i) {
    const m = mollen.find((x) => x.gat === i);
    // Achterkant van het gat
    c.fillStyle = "#3b2414";
    c.beginPath();
    c.ellipse(g.x, g.y, GAT_R + 8, 24, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#140b05";
    c.beginPath();
    c.ellipse(g.x, g.y, GAT_R, 18, 0, 0, Math.PI * 2);
    c.fill();

    if (m) {
      // Alleen tekenen wat boven het gat uitsteekt
      c.save();
      c.beginPath();
      c.rect(g.x - 80, g.y - 200, 160, 200);
      c.clip();
      const hoofdY = g.y + 10 - m.hoogte * 70;
      if (m.koe) {
        tekenKoe(g.x, hoofdY);
      } else {
        c.fillStyle = m.geraakt ? "#ff3e5a" : "#ffe14d";
        c.beginPath();
        c.arc(g.x, hoofdY, 45, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.translate(g.x, hoofdY);
        if (m.geraakt) c.scale(1.15, 0.8); // platgemept
        Arcade.plaatje(c, m.gezicht, 0, 0, 42);
        c.restore();
        if (m.geraakt) {
          for (let s = 0; s < 3; s++) {
            const hoek = tijd * 6 + (s * Math.PI * 2) / 3;
            tekst("*", g.x + Math.cos(hoek) * 40, hoofdY - 46 + Math.sin(hoek) * 8, 14, "#ffe14d");
          }
        }
      }
      c.restore();
    }

    // Voorrand van het gat over het hoofd heen
    c.fillStyle = "#4e321c";
    c.beginPath();
    c.ellipse(g.x, g.y + 6, GAT_R + 10, 16, 0, 0, Math.PI);
    c.fill();
  }

  function tekenHamer() {
    c.save();
    c.translate(hamer.x, hamer.y);
    c.rotate(hamer.slag > 0 ? -0.2 : -0.9);
    c.fillStyle = "#8d5524";
    c.fillRect(-5, -10, 10, 70);
    c.fillStyle = "#000";
    c.fillRect(-34, -42, 68, 36);
    c.fillStyle = "#e53935";
    c.fillRect(-31, -39, 62, 30);
    c.fillStyle = "#ff8a80";
    c.fillRect(-31, -39, 62, 6);
    c.restore();
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    tekenAchtergrond();
    GATEN.forEach(tekenGat);

    tekst("SCORE " + score, 16, 40, 16, "#fff", "left");
    tekst(String(Math.ceil(rest)), W - 20, 40, 22, rest < 6 ? "#ff5a5a" : "#ffe14d", "right");
    tekst("WHACK-A-JESSY", W / 2, 88, 16, "#ffe14d");

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 0.9);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 40, k.slecht ? 11 : 16, k.slecht ? "#ff5a5a" : "#fff");
    });
    c.globalAlpha = 1;

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.6)";
      c.fillRect(0, 0, W, H);
      tekst("WHACK-A-JESSY", W / 2, 170, 28, "#ffe14d");
      Arcade.plaatje(c, gezichten[2], 160, 280, 50);
      tekst("+1", 160, 350, 14, "#5fd35f");
      tekenKoe(320, 280);
      tekst("-" + KOE_STRAF, 320, 350, 14, "#ff5a5a");
      tekst("MEP JESSY, NIET DE KOE!", W / 2, 410, 12);
      tekst(SPEELTIJD + " SECONDEN", W / 2, 445, 12, "#3ef0ff");
      tekst("KLIK/TIK OF QWE ASD ZXC", W / 2, 500, 10, "#3ef0ff");
      tekst("SPATIE / TIK = START", W / 2, 560, 14);
      tekst("ESC = MENU   M = GELUID", W / 2, 690, 10, "#ddd");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.65)";
      c.fillRect(0, 0, W, H);
      tekst("TIJD OP!", W / 2, 200, 34, "#ff5a5a");
      tekst("JESSY " + score + "X GEMEPT", W / 2, 270, 14, "#ffe14d");
      tekst("SCORE " + score, W / 2, 340, 20);
      tekst("RECORD " + record, W / 2, 385, 20, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 430, 14, "#ff3ea5");
      if (tijd - eindeSinds > 1 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE / TIK = OPNIEUW", W / 2, 510, 14);
      tekst("ESC = MENU", W / 2, 560, 12, "#ddd");
    }
    tekenHamer();
    c.restore();
  }

  nieuwSpel();
  Arcade.lus(update, teken);
})();
