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
  const MET_BRIL = [gezichten[1], gezichten[2]]; // de foto's met zonnebril

  // --- Spelregels ---
  const SPEELTIJD = 30;
  const FRENZY = 10;            // de laatste seconden gaat alles sneller
  const HAMER_HERSTEL = 0.2;    // zo lang duurt het voor je weer kunt meppen
  const MIS_STRAF = 1;
  const KOE_STRAF = 3;
  const BIER_TIJD = 3;
  const COMBO_STAP = 5;         // elke 5 raak op rij gaat de vermenigvuldiger omhoog
  const MAX_VERMENIGVULDIGER = 3;
  // Wat er uit een gat kan komen. kans = hoe vaak, levens = hoe vaak je moet meppen
  const SOORTEN = [
    { naam: "jessy", kans: 58, punten: 1, levens: 1 },
    { naam: "bril", kans: 14, punten: 2, levens: 2 },
    { naam: "goud", kans: 6, punten: 5, levens: 1, snel: true },
    { naam: "bier", kans: 7, punten: 0, levens: 1 },
    { naam: "koe", kans: 15, punten: 0, levens: 1 }
  ];
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
  const AU = ["AU!", "BONK!", "HEY!", "AUW!", "WHACK!", "MIJN KAPSEL!", "NIET HET GEZICHT!"];
  const MIS = ["MIS!", "LUCHT!", "HAHA MIS", "TE LAAT!"];

  let toestand, mollen, kreten, score, rest, volgende, nieuwRecord, schud, combo, gemept;
  let tijd = 0;
  let eindeSinds = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  const hamer = { x: W - 70, y: H - 60, slag: 0, herstel: 0 };

  function nieuwSpel() {
    toestand = "klaar";
    mollen = [];
    kreten = [];
    score = 0;
    rest = SPEELTIJD;
    volgende = 0.4;
    nieuwRecord = false;
    schud = 0;
    combo = 0;
    gemept = 0;
  }

  // Hoe ver het spel al is, van 0 (begin) tot 1 (einde)
  function voortgang() {
    return Math.min(1, Math.max(0, 1 - rest / SPEELTIJD));
  }

  function isFrenzy() {
    return toestand === "spelen" && rest <= FRENZY;
  }

  function vermenigvuldiger() {
    return Math.min(MAX_VERMENIGVULDIGER, 1 + Math.floor(combo / COMBO_STAP));
  }

  function kiesSoort() {
    const totaal = SOORTEN.reduce((s, x) => s + x.kans, 0);
    let r = Math.random() * totaal;
    for (const s of SOORTEN) {
      r -= s.kans;
      if (r < 0) return s;
    }
    return SOORTEN[0];
  }

  function nieuweMol() {
    const vrij = GATEN.map((_, i) => i).filter((i) => !mollen.some((m) => m.gat === i));
    if (!vrij.length) return;
    const gat = vrij[Math.floor(Math.random() * vrij.length)];
    const soort = kiesSoort();
    const lijst = soort.naam === "bril" ? MET_BRIL : gezichten;
    let boven = (1.05 - voortgang() * 0.5) * (isFrenzy() ? 0.75 : 1);
    if (soort.snel) boven *= 0.5;
    if (soort.naam === "bril") boven *= 1.3; // iets langer, want je moet twee keer meppen
    mollen.push({
      gat,
      soort,
      levens: soort.levens,
      gezicht: lijst[Math.floor(Math.random() * lijst.length)],
      hoogte: 0,        // 0 = in het gat, 1 = helemaal boven
      boven,
      fase: "omhoog",
      geraakt: false,
      tik: 0            // knipper-effect bij een tik die nog niet genoeg was
    });
  }

  // --- Besturing ---
  function start() {
    if (toestand === "klaar") { toestand = "spelen"; return true; }
    if (toestand === "einde" && tijd - eindeSinds > 1) { nieuwSpel(); return true; }
    return false;
  }

  function kreet(woord, gat, slecht, groot) {
    const g = GATEN[gat];
    kreten.push({ tekst: woord, x: g.x, y: g.y - 80, leeftijd: 0, slecht, groot });
  }

  function mep(gat) {
    if (hamer.herstel > 0) return; // de hamer moet eerst weer omhoog: spammen helpt niet
    hamer.slag = 0.15;
    hamer.herstel = HAMER_HERSTEL;
    if (toestand !== "spelen") return;
    const m = mollen.find((x) => x.gat === gat && !x.geraakt && x.hoogte > 0.35);
    if (!m) {
      score = Math.max(0, score - MIS_STRAF);
      combo = 0;
      kreet(MIS[Math.floor(Math.random() * MIS.length)] + " -" + MIS_STRAF, gat, true);
      Arcade.toon({ type: "triangle", van: 160, duur: 0.08, volume: 0.1 });
      return;
    }

    const naam = m.soort.naam;
    if (naam === "koe") {
      m.geraakt = true;
      m.fase = "omlaag";
      score = Math.max(0, score - KOE_STRAF);
      combo = 0;
      schud = 0.3;
      kreet("NIET DE KOE! -" + KOE_STRAF, gat, true);
      Arcade.toon({ type: "sawtooth", van: 160, naar: 95, duur: 0.6, volume: 0.2, filter: 800 });
      return;
    }
    if (naam === "bier") {
      m.geraakt = true;
      m.fase = "omlaag";
      rest += BIER_TIJD;
      kreet("PROOST! +" + BIER_TIJD + " SEC", gat, false);
      Arcade.ruis({ duur: 0.12, volume: 0.12 });
      Arcade.toon({ type: "square", van: 523, naar: 1046, duur: 0.2, volume: 0.1, vertraging: 0.08 });
      return;
    }

    m.levens--;
    if (m.levens > 0) {
      // Zonnebril-Jessy: eerste mep doet nog niks
      m.tik = 0.2;
      kreet("NOG EEN KEER!", gat, false);
      Arcade.toon({ type: "square", van: 400, duur: 0.06, volume: 0.1 });
      return;
    }
    m.geraakt = true;
    m.fase = "omlaag";
    combo++;
    gemept++;
    const punten = m.soort.punten * vermenigvuldiger();
    score += punten;
    if (naam === "goud") {
      kreet("GOUDEN JESSY! +" + punten, gat, false, true);
      schud = 0.15;
      [784, 988, 1175, 1568].forEach((f, i) => Arcade.toon({ type: "square", van: f, duur: 0.08, volume: 0.1, vertraging: i * 0.06 }));
    } else {
      kreet(AU[Math.floor(Math.random() * AU.length)] + (punten > 1 ? " +" + punten : ""), gat, false);
      Arcade.ruis({ duur: 0.06, volume: 0.2 });
      Arcade.toon({ type: "square", van: 900, naar: 300, duur: 0.12, volume: 0.1 });
    }
    // Alleen melden als de vermenigvuldiger echt omhoog gaat
    if (combo % COMBO_STAP === 0 && combo <= (MAX_VERMENIGVULDIGER - 1) * COMBO_STAP) {
      kreten.push({ tekst: "COMBO X" + vermenigvuldiger() + "!", x: W / 2, y: 150, leeftijd: 0, groot: true });
      Arcade.toon({ type: "square", van: 660, naar: 1320, duur: 0.25, volume: 0.1 });
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
    hamer.herstel = Math.max(0, hamer.herstel - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 0.9);
    if (toestand !== "spelen") return;

    const wasFrenzy = isFrenzy();
    rest -= dt;
    if (!wasFrenzy && isFrenzy()) {
      kreten.push({ tekst: "FRENZY!", x: W / 2, y: 150, leeftijd: 0, groot: true });
      Arcade.toon({ type: "sawtooth", van: 220, naar: 880, duur: 0.5, volume: 0.12 });
    }
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
      Arcade.vraagNaam("whack", score);
      return;
    }

    volgende -= dt;
    if (volgende <= 0) {
      volgende = (0.7 - voortgang() * 0.35) * (isFrenzy() ? 0.6 : 1) * (0.6 + Math.random() * 0.8);
      nieuweMol();
    }

    for (const m of mollen) {
      m.tik = Math.max(0, m.tik - dt);
      if (m.fase === "omhoog") {
        m.hoogte = Math.min(1, m.hoogte + dt * 7);
        if (m.hoogte >= 1) m.fase = "boven";
      } else if (m.fase === "boven") {
        m.boven -= dt;
        if (m.boven <= 0) {
          m.fase = "omlaag";
          // Een Jessy laten ontsnappen breekt je combo
          if (["jessy", "bril", "goud"].includes(m.soort.naam)) combo = 0;
        }
      } else {
        m.hoogte -= dt * (m.geraakt ? 4 : 6);
        if (m.hoogte <= 0) m.weg = true;
      }
    }
    mollen = mollen.filter((m) => !m.weg);
  }

  // --- Tekenen ---
  function tekenAchtergrond() {
    const frenzy = isFrenzy() && Math.floor(tijd * 6) % 2 === 0;
    c.fillStyle = frenzy ? "#8fd14a" : "#6cc04a";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#5daf3d";
    for (let y = 0; y < H; y += 24) {
      for (let x = (y / 24) % 2 ? 12 : 0; x < W; x += 24) c.fillRect(x, y, 4, 8);
    }
    c.fillStyle = isFrenzy() ? "#6b1f1f" : "#2f6b1f";
    c.fillRect(0, 0, W, 120);
  }

  function tekenKoe(x, y) {
    c.font = "86px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("🐄", x, y);
  }

  function tekenJessy(m, x, y) {
    const goud = m.soort.naam === "goud";
    c.fillStyle = m.geraakt ? "#ff3e5a" : goud ? "#ffd700" : m.tik > 0 ? "#fff" : "#ffe14d";
    c.beginPath();
    c.arc(x, y, goud ? 48 : 45, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(x, y);
    if (m.geraakt) c.scale(1.15, 0.8); // platgemept
    if (m.tik > 0) c.rotate(Math.sin(tijd * 60) * 0.15);
    Arcade.plaatje(c, m.gezicht, 0, 0, 42);
    if (goud) {
      c.fillStyle = "rgba(255, 215, 0, 0.35)";
      c.beginPath();
      c.arc(0, 0, 42, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    if (goud && !m.geraakt) {
      for (let s = 0; s < 4; s++) {
        const hoek = tijd * 4 + (s * Math.PI) / 2;
        tekst("+", x + Math.cos(hoek) * 56, y + Math.sin(hoek) * 56, 12, "#fff");
      }
    }
    if (m.soort.naam === "bril" && !m.geraakt) tekst(m.levens + "X", x + 40, y - 38, 12, "#ff3ea5");
    if (m.geraakt) {
      for (let s = 0; s < 3; s++) {
        const hoek = tijd * 6 + (s * Math.PI * 2) / 3;
        tekst("*", x + Math.cos(hoek) * 40, y - 46 + Math.sin(hoek) * 8, 14, "#ffe14d");
      }
    }
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
      if (m.soort.naam === "koe") tekenKoe(g.x, hoofdY);
      else if (m.soort.naam === "bier") Tekening.bier(c, g.x, hoofdY, 80);
      else tekenJessy(m, g.x, hoofdY);
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
    c.fillStyle = hamer.herstel > 0 ? "#9e2a27" : "#e53935";
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
    tekst(String(Math.ceil(rest)), W - 20, 40, 22, rest <= FRENZY ? "#ff5a5a" : "#ffe14d", "right");
    if (isFrenzy()) tekst("FRENZY!", W / 2, 88, 16, Math.floor(tijd * 6) % 2 ? "#ff5a5a" : "#ffe14d");
    else tekst("WHACK-A-JESSY", W / 2, 88, 16, "#ffe14d");
    if (toestand === "spelen" && vermenigvuldiger() > 1) tekst("X" + vermenigvuldiger(), W / 2, 40, 18, "#ff3ea5");

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 0.9);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 40, k.groot ? 20 : k.slecht ? 11 : 14, k.slecht ? "#ff5a5a" : k.groot ? "#ffe14d" : "#fff");
    });
    c.globalAlpha = 1;

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.7)";
      c.fillRect(0, 0, W, H);
      tekst("WHACK-A-JESSY", W / 2, 130, 28, "#ffe14d");
      const uitleg = [
        [() => Arcade.plaatje(c, gezichten[0], 0, 0, 26), "JESSY", "+1", "#5fd35f"],
        [() => Arcade.plaatje(c, gezichten[1], 0, 0, 26), "ZONNEBRIL: 2X MEPPEN", "+2", "#5fd35f"],
        [() => { c.fillStyle = "#ffd700"; c.beginPath(); c.arc(0, 0, 29, 0, Math.PI * 2); c.fill(); Arcade.plaatje(c, gezichten[4], 0, 0, 26); }, "GOUDEN JESSY (SNEL!)", "+5", "#ffd700"],
        [() => Tekening.bier(c, 0, 0, 50), "BIERTJE", "+3 SEC", "#3ef0ff"],
        [() => { c.font = "48px serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("🐄", 0, 0); }, "DE KOE", "-3", "#ff5a5a"],
        [() => tekst("?", 0, 0, 26, "#888"), "MIS-MEPPEN", "-1", "#ff5a5a"]
      ];
      uitleg.forEach(([icoon, naam, punten, kleur], i) => {
        const y = 210 + i * 64;
        c.save();
        c.translate(80, y);
        icoon();
        c.restore();
        tekst(naam, 125, y, 10, "#fff", "left");
        tekst(punten, W - 40, y, 12, kleur, "right");
      });
      tekst("5 OP RIJ = COMBO X2, 10 = X3", W / 2, 600, 10, "#ff3ea5");
      tekst("SPATIE / TIK = START", W / 2, 645, 14);
      tekst("KLIK/TIK OF QWE ASD ZXC   ESC = PAUZE", W / 2, 690, 8, "#ddd");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.65)";
      c.fillRect(0, 0, W, H);
      tekst("TIJD OP!", W / 2, 200, 34, "#ff5a5a");
      tekst("JESSY " + gemept + "X GEMEPT", W / 2, 270, 14, "#ffe14d");
      tekst("SCORE " + score, W / 2, 340, 20);
      tekst("RECORD " + record, W / 2, 385, 20, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 430, 14, "#ff3ea5");
      if (tijd - eindeSinds > 1 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE / TIK = OPNIEUW", W / 2, 510, 14);
      tekst("ESC = PAUZE", W / 2, 560, 12, "#ddd");
    }
    tekenHamer();
    c.restore();
  }

  nieuwSpel();
  Arcade.lus(update, teken);
})();
