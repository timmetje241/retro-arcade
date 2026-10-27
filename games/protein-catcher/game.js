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
  // Elk potje een willekeurig gezicht van Jessy
  const gezichten = Arcade.gezichten();
  let gezicht = null;

  // --- Spelregels ---
  const LOOPSNELHEID = 430;
  const LEVENS = 3;
  const MAX_MISSERS = 5;        // zoveel goede dingen op rij laten vallen kost een hartje
  const DRONKEN_TIJD = 5;       // seconden omgedraaide besturing na een biertje
  const CHEAT_DAY_ELKE = 25;    // seconden tussen twee cheat days
  const CHEAT_DAY_DUUR = 4;
  const COMBO_STAP = 5;
  const MAX_VERMENIGVULDIGER = 3;
  const VANG_BREEDTE = 52;      // hoe ver naast Jessy je nog iets vangt
  const VANG_Y = GROND_Y - 110;
  const SOORTEN = [
    { naam: "kwark", punten: 1, kans: 40, goed: true, kreten: ["KWARKIE!", "+PROTEINE", "SMULLEN"] },
    { naam: "creatine", punten: 2, kans: 25, goed: true, kreten: ["GAINS!", "+5 KG", "SWOLE!"] },
    { naam: "halter", punten: 3, kans: 8, goed: true, kreten: ["PUMP!", "BEAST!", "LEG DAY!"] },
    { naam: "bier", punten: 0, kans: 6, kreten: ["PROOST! HIK!", "NOG EENTJE!"] },
    { naam: "pizza", punten: 0, kans: 12, slecht: true, kreten: ["CHEAT MEAL!", "MARGHERITA NEE!"] },
    { naam: "donut", punten: 0, kans: 9, slecht: true, kreten: ["NEE! SUIKER!", "SIXPACK WEG!"] }
  ];

  let toestand, speler, vallers, kreten, score, levens, spelTijd, volgende, schud, nieuwRecord;
  let missers, combo, dronken, cheatDay, volgendeCheat, doodsoorzaak;
  let tijd = 0;
  let eindeSinds = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  const toetsen = {};
  let wijzerX = null;

  function nieuwSpel() {
    gezicht = Arcade.anderGezicht(gezichten, gezicht);
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
    missers = 0;
    combo = 0;
    dronken = 0;
    cheatDay = 0;
    volgendeCheat = CHEAT_DAY_ELKE;
    doodsoorzaak = "";
  }

  function vermenigvuldiger() {
    return Math.min(MAX_VERMENIGVULDIGER, 1 + Math.floor(combo / COMBO_STAP));
  }

  function kiesSoort() {
    // Tijdens cheat day valt er vooral junkfood
    if (cheatDay > 0) {
      const r = Math.random();
      return SOORTEN.find((s) => s.naam === (r < 0.45 ? "pizza" : r < 0.8 ? "donut" : "kwark"));
    }
    const totaal = SOORTEN.reduce((s, x) => s + x.kans, 0);
    let r = Math.random() * totaal;
    for (const s of SOORTEN) {
      r -= s.kans;
      if (r < 0) return s;
    }
    return SOORTEN[0];
  }

  function kreet(woord, x, y, kleur, groot) {
    kreten.push({ tekst: woord, x, y, leeftijd: 0, kleur, groot });
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
    kreten = kreten.filter((k) => k.leeftijd < 1.2);
    if (toestand !== "spelen") return;
    spelTijd += dt;
    dronken = Math.max(0, dronken - dt);

    // Cheat day aankondigen en aftellen
    cheatDay = Math.max(0, cheatDay - dt);
    if (spelTijd >= volgendeCheat) {
      volgendeCheat += CHEAT_DAY_ELKE;
      cheatDay = CHEAT_DAY_DUUR;
      kreet("CHEAT DAY!", W / 2, 200, "#ff5a5a", true);
      Arcade.toon({ type: "sawtooth", van: 880, naar: 220, duur: 0.6, volume: 0.12 });
    }

    // Lopen met toetsen of de muis/vinger volgen. Dronken? Dan is links rechts.
    const om = dronken > 0 ? -1 : 1;
    let dx = 0;
    if (toetsen.ArrowLeft || toetsen.KeyA) dx -= 1;
    if (toetsen.ArrowRight || toetsen.KeyD) dx += 1;
    if (dx) {
      wijzerX = null;
      speler.x += dx * om * LOOPSNELHEID * dt;
    } else if (wijzerX !== null) {
      const doel = dronken > 0 ? W - wijzerX : wijzerX;
      const verschil = doel - speler.x;
      dx = Math.sign(verschil);
      speler.x += Math.sign(verschil) * Math.min(Math.abs(verschil), LOOPSNELHEID * 1.3 * dt);
      if (Math.abs(verschil) < 4) dx = 0;
    }
    if (dronken > 0) speler.x += Math.sin(tijd * 5) * 60 * dt; // zwalken
    speler.x = Math.max(36, Math.min(W - 36, speler.x));
    if (dx) { speler.richting = dx; speler.stap += dt * 10; }

    // Nieuwe dingen laten vallen, steeds sneller
    volgende -= dt;
    if (volgende <= 0) {
      volgende = cheatDay > 0 ? 0.2 : Math.max(0.28, 0.95 - spelTijd * 0.012) * (0.7 + Math.random() * 0.6);
      const soort = kiesSoort();
      // Na een halve minuut gaan sommige dingen zwalken tijdens het vallen
      const zwalk = spelTijd > 30 && Math.random() < Math.min(0.6, (spelTijd - 30) / 60) ? 40 + Math.random() * 50 : 0;
      vallers.push({
        soort,
        x: 40 + Math.random() * (W - 80),
        basisX: 0,
        y: -30,
        v: 150 + spelTijd * 5 + Math.random() * 60,
        draai: (Math.random() - 0.5) * 3,
        hoek: 0,
        zwalk,
        fase: Math.random() * 6
      });
      const nieuw = vallers[vallers.length - 1];
      nieuw.basisX = nieuw.x;
    }

    for (const v of vallers) {
      v.y += v.v * dt;
      v.hoek += v.draai * dt;
      if (v.zwalk) v.x = Math.max(25, Math.min(W - 25, v.basisX + Math.sin(v.y / 60 + v.fase) * v.zwalk));
      if (!v.weg && v.y >= VANG_Y && v.y <= VANG_Y + 40 && Math.abs(v.x - speler.x) < VANG_BREEDTE) {
        v.weg = true;
        vang(v);
      }
      if (!v.weg && v.y > H + 40) {
        v.weg = true;
        if (v.soort.goed) gemist(v);
      }
    }
    vallers = vallers.filter((v) => !v.weg);
  }

  function verliesLeven(oorzaak) {
    levens--;
    schud = 0.3;
    combo = 0;
    Arcade.ruis({ duur: 0.2, volume: 0.25 });
    Arcade.toon({ type: "square", van: 300, naar: 80, duur: 0.3, volume: 0.12 });
    if (levens <= 0) {
      doodsoorzaak = oorzaak;
      einde();
    }
  }

  function gemist(v) {
    if (toestand !== "spelen") return;
    missers++;
    combo = 0;
    if (missers >= MAX_MISSERS) {
      missers = 0;
      kreet("TE LUI! -1 HARTJE", W / 2, 260, "#ff5a5a", true);
      verliesLeven("lui");
    } else {
      kreet("GEMIST " + missers + "/" + MAX_MISSERS, v.x, GROND_Y - 20, "#ff9a5a");
      Arcade.toon({ type: "triangle", van: 200, duur: 0.08, volume: 0.08 });
    }
  }

  function vang(v) {
    const s = v.soort;
    const woord = s.kreten[Math.floor(Math.random() * s.kreten.length)];
    if (s.slecht) {
      kreet(woord, v.x, VANG_Y - 30, "#ff5a5a");
      verliesLeven("junk");
    } else if (s.naam === "bier") {
      dronken = DRONKEN_TIJD;
      kreet(woord, v.x, VANG_Y - 30, "#f2a900");
      kreet("DRONKEN! LINKS = RECHTS", W / 2, 230, "#f2a900", true);
      Arcade.ruis({ duur: 0.12, volume: 0.15 });
      Arcade.toon({ type: "sawtooth", van: 300, naar: 150, duur: 0.5, volume: 0.1, filter: 900 });
    } else {
      missers = 0;
      combo++;
      const punten = s.punten * vermenigvuldiger();
      score += punten;
      kreet(woord + (punten > 1 ? " +" + punten : ""), v.x, VANG_Y - 30, "#ffe14d");
      Arcade.toon({ type: "square", van: 600 + s.punten * 150, naar: 1200 + s.punten * 200, duur: 0.1, volume: 0.1 });
      if (combo % COMBO_STAP === 0 && combo <= (MAX_VERMENIGVULDIGER - 1) * COMBO_STAP) {
        kreet("COMBO X" + vermenigvuldiger() + "!", W / 2, 170, "#ff3ea5", true);
      }
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
    Arcade.vraagNaam("protein-catcher", score);
  }

  // --- Tekenen ---
  function tekenAchtergrond() {
    const lucht = c.createLinearGradient(0, 0, 0, GROND_Y);
    lucht.addColorStop(0, cheatDay > 0 ? "#f07058" : "#58b8f0");
    lucht.addColorStop(1, cheatDay > 0 ? "#ffd0c4" : "#c4ecff");
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
    if (dronken > 0) {
      c.translate(x, voet);
      c.rotate(Math.sin(tijd * 4) * 0.18);
      c.translate(-x, -voet);
    }
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
    c.fillStyle = dronken > 0 ? "#f2a900" : "#ff3ea5";
    c.beginPath();
    c.arc(x, voet - 138, 31, 0, Math.PI * 2);
    c.fill();
    Arcade.plaatje(c, gezicht, x, voet - 138, 28);
    if (dronken > 0) tekst("HIK!", x + 36, voet - 175 + Math.sin(tijd * 6) * 4, 10, "#fff");
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

  function tekenHud() {
    tekst("SCORE " + score, 16, 30, 14, "#fff", "left");
    if (vermenigvuldiger() > 1) tekst("X" + vermenigvuldiger(), 16, 58, 14, "#ff3ea5", "left");
    for (let i = 0; i < LEVENS; i++) tekenHart(W - 34 - i * 30, 22, i < levens);
    // Missers als kleine bolletjes onder de hartjes
    tekst("MIS", W - 118, 56, 8, "#fff", "right");
    for (let i = 0; i < MAX_MISSERS; i++) {
      c.fillStyle = i < missers ? "#ff9a5a" : "rgba(0, 0, 0, 0.35)";
      c.fillRect(W - 110 + i * 18, 50, 12, 12);
    }
    if (dronken > 0) tekst("DRONKEN " + Math.ceil(dronken), W / 2, 30, 12, "#f2a900");
    else if (cheatDay > 0) tekst("CHEAT DAY!", W / 2, 30, 12, "#ff5a5a");
  }

  function teken() {
    c.save();
    // Dronken: het hele scherm wiebelt een beetje mee
    if (dronken > 0) {
      c.translate(W / 2, H / 2);
      c.rotate(Math.sin(tijd * 2.5) * 0.03);
      c.translate(-W / 2, -H / 2);
    }
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
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.2);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 40, k.groot ? 16 : 12, k.kleur);
    });
    c.globalAlpha = 1;
    c.restore();

    tekenHud();

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.7)";
      c.fillRect(0, 0, W, H);
      tekst("PROTEIN", W / 2, 110, 34, "#ffe14d");
      tekst("CATCHER", W / 2, 160, 34, "#ffe14d");
      const goed = [["kwark", "+1"], ["creatine", "+2"], ["halter", "+3"]];
      goed.forEach(([naam, punten], i) => {
        Tekening[naam](c, 130 + i * 110, 240, 44);
        tekst(punten, 130 + i * 110, 285, 12, "#5fd35f");
      });
      tekst("5X OP RIJ MISSEN = -1 HARTJE", W / 2, 320, 10, "#ff9a5a");
      Tekening.pizza(c, 185, 370, 44);
      Tekening.donut(c, 295, 370, 44);
      tekst("NIET VANGEN! -1 HARTJE", W / 2, 415, 10, "#ff5a5a");
      Tekening.bier(c, W / 2, 465, 44);
      tekst("BIERTJE = 5 SEC DRONKEN", W / 2, 510, 10, "#f2a900");
      tekst("PIJLTJES / MUIS / VINGER", W / 2, 560, 11, "#3ef0ff");
      tekst("SPATIE = START", W / 2, 610, 16);
      tekst("ESC = PAUZE   M = GELUID", W / 2, 690, 10, "#ddd");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.6)";
      c.fillRect(0, 0, W, H);
      tekst("GAME OVER", W / 2, 200, 34, "#ff5a5a");
      tekst(Arcade.plaagTekst(), W / 2, 285, 10, "#fff");
      tekst(doodsoorzaak === "lui" ? "TE LUI OM TE VANGEN" : "TE VEEL CHEAT MEALS", W / 2, 255, 12, "#ffe14d");
      tekst("SCORE " + score, W / 2, 330, 20);
      tekst("RECORD " + record, W / 2, 375, 20, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 420, 14, "#ff3ea5");
      if (tijd - eindeSinds > 0.8 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE = OPNIEUW", W / 2, 500, 16);
      tekst("ESC = PAUZE", W / 2, 550, 12, "#ddd");
    }
  }

  Arcade.volgScore(() => score);
  nieuwSpel();
  Arcade.lus(update, teken);
})();
