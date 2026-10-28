// TV Meppen: sla de ouwe beeldbuis met het koninklijk huis erop helemaal aan gruzelementen.
// Geen score, gewoon lekker meppen. Naar het idee van oude spelletjes als Desktop Destroyer.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);

  const foto = new Image();
  foto.src = "../../img/koninklijk-huis.jpg";

  // --- De tv ---
  const KAST = { x: 60, y: 170, b: 480, h: 360 };
  const BEELD = { x: 92, y: 205, b: 352, h: 198 };       // 16:9, net als de foto
  const KNOPPEN_X = KAST.x + KAST.b - 70;
  const ANTENNE_VOET = { x: 300, y: KAST.y };
  const ANTENNES = [{ hoek: -2.2 }, { hoek: -0.95 }];   // links en rechts omhoog
  const ANTENNE_LENGTE = 120;

  // --- Gereedschap ---
  const GEREEDSCHAP = [
    { naam: "HAMER", kracht: 1, toets: "Digit1" },
    { naam: "KLOMP", kracht: 1.7, toets: "Digit2" },
    { naam: "KOE", kracht: 3.2, toets: "Digit3" }
  ];
  const BALK_Y = 630;
  const SCHADE_PER_KLAP = 0.028;

  const KRETEN = [
    "KRAK!", "BOEM!", "PATS!", "NIET DE KROONJUWELEN!", "ORANJE BOVEN? NU BENEDEN!",
    "DE KONING STAAT SCHEEF", "MAXIMA LACHT NOG STEEDS", "STORING BIJ DE RVD",
    "DIT KOMT IN DE TELEGRAAF", "WAAR IS DE AFSTANDSBEDIENING?", "LEKKER, GEEN KERSTTOESPRAAK",
    "21 SALUUTSCHOTEN!", "TROONREDE ONDERBROKEN", "KONINGSDAG AFGELAST", "HET JOURNAAL IS VOORBIJ",
    "BLAUW BLOED? NEE, BEELDBUIS", "DAT WAS DE GOUDEN KOETS"
  ];
  const KRETEN_PER_GEREEDSCHAP = {
    KLOMP: ["HOLLANDSE KLOMPKRACHT!", "KLOMPENDANS!", "HOUTEN VERRASSING"],
    KOE: ["BOE! KOE OP DE BUIS", "600 KILO KOE!", "DE KOE IS GEEN FAN"]
  };
  const KRETEN_KAST = ["AU, MIJN KASTJE", "DAT WAS NOTENHOUT", "DEUK!", "OPA'S TV!"];
  const MIJLPALEN = [
    [0.25, "HET BEELD BIBBERT..."],
    [0.5, "GEEN SIGNAAL!"],
    [0.75, "ER KOMT ROOK UIT!"],
    [0.9, "NOG EEN PAAR KLAPPEN!"]
  ];

  let toestand, schade, barsten, deuken, dodePlekken, deeltjes, rook, kreten, schud, flits, antenneWeg, mijlpaal, ontploftSinds, brokken, koeien;
  let gereedschap = 0;
  let tijd = 0;
  const wijzer = { x: W / 2, y: H / 2, slag: 0 };

  // Een klein ruis-canvas voor de storing, dat elk frame opnieuw gevuld wordt
  const ruis = document.createElement("canvas");
  ruis.width = 88;
  ruis.height = 50;
  const ruisC = ruis.getContext("2d");
  const ruisData = ruisC.createImageData(ruis.width, ruis.height);

  function nieuweTv() {
    toestand = "meppen";
    schade = 0;
    barsten = [];
    deuken = [];
    dodePlekken = [];
    deeltjes = [];
    rook = [];
    kreten = [];
    schud = 0;
    flits = 0;
    antenneWeg = [false, false];
    mijlpaal = 0;
    ontploftSinds = 0;
    brokken = [];
    koeien = [];
  }

  function willekeurig(lijst) {
    return lijst[Math.floor(Math.random() * lijst.length)];
  }

  function binnen(x, y, r) {
    return x >= r.x && x <= r.x + r.b && y >= r.y && y <= r.y + r.h;
  }

  function antennePunt(i) {
    const a = ANTENNES[i];
    return { x: ANTENNE_VOET.x + Math.cos(a.hoek) * ANTENNE_LENGTE, y: ANTENNE_VOET.y + Math.sin(a.hoek) * ANTENNE_LENGTE };
  }

  // Afstand van een punt tot de lijn van een antenne
  function bijAntenne(x, y, i) {
    const p = antennePunt(i);
    const dx = p.x - ANTENNE_VOET.x;
    const dy = p.y - ANTENNE_VOET.y;
    const t = Math.max(0, Math.min(1, ((x - ANTENNE_VOET.x) * dx + (y - ANTENNE_VOET.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (ANTENNE_VOET.x + t * dx), y - (ANTENNE_VOET.y + t * dy)) < 18;
  }

  // Hooguit één grote melding en drie kleine kreten tegelijk, anders wordt het bij snel meppen een brij
  function kreet(woord, x, y, kleur, groot) {
    const grote = kreten.filter((k) => k.groot && !groot);
    const kleine = kreten.filter((k) => !k.groot).slice(groot ? -3 : -2);
    kreten = [...grote, ...kleine, { tekst: woord, x, y, leeftijd: 0, kleur: kleur || "#fff", groot }];
  }

  // --- Geluid ---
  function klapGeluid(kracht, glas) {
    Arcade.ruis({ duur: 0.12 + kracht * 0.06, volume: 0.25 });
    Arcade.toon({ type: "square", van: 140 / kracht, naar: 50, duur: 0.18, volume: 0.15 });
    if (glas) Arcade.toon({ type: "triangle", van: 2400, naar: 900, duur: 0.15, volume: 0.06, vertraging: 0.02 });
  }

  function boe() {
    Arcade.toon({ type: "sawtooth", van: 180, naar: 120, duur: 0.25, volume: 0.25, filter: 900 });
    Arcade.toon({ type: "sawtooth", van: 120, naar: 85, duur: 0.6, volume: 0.25, filter: 700, vertraging: 0.2 });
  }

  // --- Meppen ---
  function maakBarst(x, y, grootte) {
    const lijnen = [];
    const aantal = 5 + Math.floor(Math.random() * 4 * grootte);
    for (let i = 0; i < aantal; i++) {
      let hoek = (i / aantal) * Math.PI * 2 + Math.random() * 0.5;
      let px = x;
      let py = y;
      const lijn = [[px, py]];
      const stukken = 3 + Math.floor(Math.random() * 4 * grootte);
      for (let s = 0; s < stukken; s++) {
        hoek += (Math.random() - 0.5) * 0.8;
        const lengte = (8 + Math.random() * 22) * grootte;
        px += Math.cos(hoek) * lengte;
        py += Math.sin(hoek) * lengte;
        lijn.push([px, py]);
      }
      lijnen.push(lijn);
    }
    barsten.push(lijnen);
  }

  function scherven(x, y, aantal, kleur) {
    for (let i = 0; i < aantal; i++) {
      deeltjes.push({
        x, y,
        vx: (Math.random() - 0.5) * 360,
        vy: -Math.random() * 300,
        leeftijd: 0,
        kleur: kleur || willekeurig(["#cfe8ff", "#9ec7e6", "#fff"]),
        grootte: 2 + Math.random() * 4,
        vonk: false
      });
    }
  }

  function vonken(x, y) {
    for (let i = 0; i < 10; i++) {
      deeltjes.push({
        x, y,
        vx: (Math.random() - 0.5) * 420,
        vy: (Math.random() - 0.8) * 380,
        leeftijd: 0,
        kleur: willekeurig(["#ffe14d", "#fff", "#ff8a3d"]),
        grootte: 2,
        vonk: true
      });
    }
  }

  function mep(x, y, kracht, naam) {
    if (toestand !== "meppen") return;
    wijzer.slag = 0.15;

    // Antenne eraf meppen
    for (let i = 0; i < 2; i++) {
      if (!antenneWeg[i] && bijAntenne(x, y, i)) {
        antenneWeg[i] = { x: antennePunt(i).x, y: antennePunt(i).y, vy: -100, draai: 0 };
        schade = Math.min(1, schade + SCHADE_PER_KLAP);
        kreet("ANTENNE ERAF! GEEN ONTVANGST", x, y - 20, "#ffe14d");
        klapGeluid(1, false);
        schud = 0.15;
        return;
      }
    }
    if (!binnen(x, y, KAST)) {
      kreet(willekeurig(["MIS!", "LUCHT!", "HIER! DE TV!"]), x, y - 20, "#aaa");
      Arcade.toon({ type: "triangle", van: 200, duur: 0.06, volume: 0.06 });
      return;
    }

    const opBeeld = binnen(x, y, BEELD);
    schud = 0.12 + kracht * 0.06;
    klapGeluid(kracht, opBeeld);
    if (opBeeld) {
      schade = Math.min(1, schade + SCHADE_PER_KLAP * kracht);
      maakBarst(x, y, 0.8 + kracht * 0.3);
      scherven(x, y, 6 + kracht * 4);
      if (schade > 0.45) dodePlekken.push({ x, y, r: 10 + kracht * 10 });
      if (schade > 0.5) vonken(x, y);
      const lijst = [...KRETEN, ...(KRETEN_PER_GEREEDSCHAP[naam] || []), ...(KRETEN_PER_GEREEDSCHAP[naam] || [])];
      kreet(willekeurig(lijst), x, y - 24, "#fff");
    } else {
      schade = Math.min(1, schade + SCHADE_PER_KLAP * kracht * 0.6);
      deuken.push({ x, y, r: 8 + kracht * 6 });
      scherven(x, y, 4, willekeurig(["#6d3f19", "#8d5524", "#4a2a10"]));
      kreet(naam === "KOE" ? "BOE!" : willekeurig(KRETEN_KAST), x, y - 24, "#ffd0a0");
    }

    // Mijlpalen aankondigen
    while (mijlpaal < MIJLPALEN.length && schade >= MIJLPALEN[mijlpaal][0]) {
      kreet(MIJLPALEN[mijlpaal][1], W / 2, 120, "#ff5a5a", true);
      mijlpaal++;
    }
    if (schade >= 1) ontplof();
  }

  function gebruikGereedschap(x, y) {
    const g = GEREEDSCHAP[gereedschap];
    if (g.naam === "KOE") {
      // De koe valt uit de lucht; pas bij de landing telt de klap
      if (koeien.length) return;
      koeien.push({ x, y: -60, doelY: y, vy: 200 });
      Arcade.toon({ type: "sine", van: 1200, naar: 300, duur: 0.5, volume: 0.08 });
      return;
    }
    mep(x, y, g.kracht, g.naam);
  }

  function ontplof() {
    toestand = "ontploft";
    ontploftSinds = tijd;
    flits = 1;
    schud = 0.6;
    Arcade.ruis({ duur: 1.2, volume: 0.4 });
    Arcade.toon({ type: "sawtooth", van: 120, naar: 30, duur: 1.2, volume: 0.25, filter: 600 });
    // De antennes vliegen er ook af
    for (let i = 0; i < 2; i++) {
      if (!antenneWeg[i]) antenneWeg[i] = { x: antennePunt(i).x, y: antennePunt(i).y, vy: -350, draai: 0 };
    }
    // De tv vliegt in stukken uit elkaar
    for (let i = 0; i < 36; i++) {
      const vanBeeld = i < 16;
      const bx = vanBeeld ? BEELD.x + (i % 4) * (BEELD.b / 4) : KAST.x + Math.random() * KAST.b;
      const by = vanBeeld ? BEELD.y + Math.floor(i / 4) * (BEELD.h / 4) : KAST.y + Math.random() * KAST.h;
      brokken.push({
        x: bx, y: by,
        b: vanBeeld ? BEELD.b / 4 : 20 + Math.random() * 40,
        h: vanBeeld ? BEELD.h / 4 : 14 + Math.random() * 30,
        bronX: vanBeeld ? (i % 4) / 4 : null,
        bronY: vanBeeld ? Math.floor(i / 4) / 4 : null,
        vx: (bx - W / 2) * (2 + Math.random() * 3),
        vy: -200 - Math.random() * 400,
        draai: 0,
        draaiV: (Math.random() - 0.5) * 10
      });
    }
    setTimeout(() => {
      Arcade.confetti(200);
      boe();
    }, 900);
  }

  // --- Besturing ---
  function canvasPunt(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function knopOnder(x, y) {
    if (y < BALK_Y || y > BALK_Y + 70) return -1;
    const breed = (W - 40) / GEREEDSCHAP.length;
    return Math.floor((x - 20) / breed);
  }

  canvas.addEventListener("pointermove", (e) => {
    const p = canvasPunt(e);
    wijzer.x = p.x;
    wijzer.y = p.y;
  });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = canvasPunt(e);
    wijzer.x = p.x;
    wijzer.y = p.y;
    if (toestand === "ontploft") {
      if (tijd - ontploftSinds > 2) nieuweTv();
      return;
    }
    const knop = knopOnder(p.x, p.y);
    if (knop >= 0 && knop < GEREEDSCHAP.length) {
      gereedschap = knop;
      Arcade.toon({ van: 660, duur: 0.05, volume: 0.06 });
      return;
    }
    gebruikGereedschap(p.x, p.y);
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "KeyM") { Arcade.zetStil(!Arcade.isStil()); return; }
    const index = GEREEDSCHAP.findIndex((g) => g.toets === e.code);
    if (index >= 0) { gereedschap = index; return; }
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (e.repeat) return;
      if (toestand === "ontploft") {
        if (tijd - ontploftSinds > 2) nieuweTv();
        return;
      }
      // Met het toetsenbord: mep ergens op het beeld
      const x = BEELD.x + 30 + Math.random() * (BEELD.b - 60);
      const y = BEELD.y + 30 + Math.random() * (BEELD.h - 60);
      wijzer.x = x + 20;
      wijzer.y = y - 10;
      gebruikGereedschap(x, y);
    }
  });

  // --- Bijwerken ---
  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    flits = Math.max(0, flits - dt * 1.5);
    wijzer.slag = Math.max(0, wijzer.slag - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.3);

    deeltjes.forEach((d) => {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 900 * dt;
      d.leeftijd += dt;
    });
    deeltjes = deeltjes.filter((d) => d.leeftijd < (d.vonk ? 0.5 : 1.5) && d.y < H);

    // Rook als de tv het zwaar heeft
    if (toestand === "meppen" && schade > 0.7 && Math.random() < dt * 8 * schade) {
      rook.push({ x: KAST.x + 60 + Math.random() * (KAST.b - 120), y: KAST.y + 10, r: 8, leeftijd: 0 });
    }
    rook.forEach((r) => { r.y -= 40 * dt; r.x += Math.sin(tijd * 2 + r.r) * 10 * dt; r.r += 14 * dt; r.leeftijd += dt; });
    rook = rook.filter((r) => r.leeftijd < 2.5);
    // Af en toe spontane vonkjes uit het kapotte beeld
    if (toestand === "meppen" && schade > 0.6 && Math.random() < dt * 3) {
      vonken(BEELD.x + Math.random() * BEELD.b, BEELD.y + Math.random() * BEELD.h);
      Arcade.toon({ type: "square", van: 3000, naar: 1500, duur: 0.04, volume: 0.03 });
    }

    // Afgevallen antennes
    antenneWeg.forEach((a) => {
      if (!a) return;
      a.vy += 900 * dt;
      a.y += a.vy * dt;
      a.draai += dt * 6;
    });

    // Vallende koeien
    for (const k of koeien) {
      k.vy += 1400 * dt;
      k.y += k.vy * dt;
      if (k.y >= k.doelY) {
        k.weg = true;
        boe();
        mep(k.x, k.doelY, GEREEDSCHAP[2].kracht, "KOE");
      }
    }
    koeien = koeien.filter((k) => !k.weg);

    brokken.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 900 * dt;
      b.draai += b.draaiV * dt;
    });
  }

  // --- Tekenen ---
  function tekenKamer() {
    // Jaren-70 behang
    c.fillStyle = "#c46a2b";
    c.fillRect(0, 0, W, H);
    for (let y = 0; y < 560; y += 60) {
      for (let x = (y / 60) % 2 ? 30 : 0; x < W; x += 60) {
        c.fillStyle = "#d9823d";
        c.beginPath();
        c.arc(x, y, 22, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#a8551f";
        c.beginPath();
        c.arc(x, y, 10, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Vloer
    c.fillStyle = "#5a3a22";
    c.fillRect(0, 560, W, H - 560);
    c.fillStyle = "#4a2f1b";
    for (let x = 0; x < W; x += 50) c.fillRect(x, 560, 3, H - 560);
  }

  function tekenAntennes() {
    for (let i = 0; i < 2; i++) {
      const a = antenneWeg[i];
      if (a) {
        c.save();
        c.translate(a.x, a.y);
        c.rotate(a.draai);
        c.strokeStyle = "#ccc";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, ANTENNE_LENGTE * 0.8);
        c.stroke();
        c.restore();
        continue;
      }
      const p = antennePunt(i);
      c.strokeStyle = "#1a1a1a";
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(ANTENNE_VOET.x, ANTENNE_VOET.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      c.strokeStyle = "#d8d8d8";
      c.lineWidth = 3;
      c.stroke();
      c.fillStyle = "#d8d8d8";
      c.beginPath();
      c.arc(p.x, p.y, 6, 0, Math.PI * 2);
      c.fill();
    }
    if (toestand !== "meppen") return; // na de explosie is er geen voetje meer
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.ellipse(ANTENNE_VOET.x, ANTENNE_VOET.y, 30, 12, 0, Math.PI, 0);
    c.fill();
  }

  function tekenKast() {
    // Pootjes
    c.fillStyle = "#2b1408";
    c.fillRect(KAST.x + 50, KAST.y + KAST.h, 16, 34);
    c.fillRect(KAST.x + KAST.b - 66, KAST.y + KAST.h, 16, 34);
    // Houten kast
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.roundRect(KAST.x - 4, KAST.y - 4, KAST.b + 8, KAST.h + 8, 22);
    c.fill();
    const hout = c.createLinearGradient(0, KAST.y, 0, KAST.y + KAST.h);
    hout.addColorStop(0, "#9b6230");
    hout.addColorStop(1, "#6d3f19");
    c.fillStyle = hout;
    c.beginPath();
    c.roundRect(KAST.x, KAST.y, KAST.b, KAST.h, 18);
    c.fill();
    c.fillStyle = "rgba(255, 255, 255, 0.08)";
    for (let y = KAST.y + 12; y < KAST.y + KAST.h; y += 14) c.fillRect(KAST.x + 10, y, KAST.b - 20, 2);
    // Rand om het beeld
    c.fillStyle = "#2a2a2a";
    c.beginPath();
    c.roundRect(BEELD.x - 14, BEELD.y - 14, BEELD.b + 28, BEELD.h + 28, 20);
    c.fill();
    // Knoppen en luidspreker
    c.fillStyle = "#1a1a1a";
    c.fillRect(KNOPPEN_X - 12, BEELD.y - 14, 66, BEELD.h + 28);
    [0, 1].forEach((i) => {
      c.fillStyle = "#c0c0c0";
      c.beginPath();
      c.arc(KNOPPEN_X + 21, BEELD.y + 30 + i * 55, 16, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#555";
      c.fillRect(KNOPPEN_X + 19, BEELD.y + 16 + i * 55, 4, 14);
    });
    c.fillStyle = "#333";
    for (let y = BEELD.y + 140; y < BEELD.y + BEELD.h + 4; y += 8) c.fillRect(KNOPPEN_X - 2, y, 46, 4);
    // Merknaam
    tekst("ORANJE-VISIE", KAST.x + 150, KAST.y + KAST.h - 50, 10, "#e0c080");
    // Deuken in het hout
    deuken.forEach((d) => {
      c.fillStyle = "rgba(30, 15, 5, 0.6)";
      c.beginPath();
      c.ellipse(d.x, d.y, d.r, d.r * 0.7, 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255, 220, 180, 0.25)";
      c.beginPath();
      c.ellipse(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.4, d.r * 0.25, 0.3, 0, Math.PI * 2);
      c.fill();
    });
  }

  function vulRuis() {
    const d = ruisData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ruisC.putImageData(ruisData, 0, 0);
  }

  function tekenBeeld() {
    c.save();
    c.beginPath();
    c.roundRect(BEELD.x, BEELD.y, BEELD.b, BEELD.h, 14);
    c.clip();
    c.fillStyle = "#000";
    c.fillRect(BEELD.x, BEELD.y, BEELD.b, BEELD.h);

    const geenSignaal = schade >= 0.5 && Math.floor(tijd * 3) % 4 === 0;
    if (foto.complete && foto.naturalWidth && !geenSignaal) {
      // Bibberend beeld: hoe meer schade, hoe meer de stroken verschuiven
      const strook = 6;
      const bibber = schade > 0.2 ? (schade - 0.2) * 40 : 0;
      for (let y = 0; y < BEELD.h; y += strook) {
        const verschuif = bibber * (Math.random() - 0.5) * (Math.random() < 0.3 ? 2 : 0.4);
        const bronY = (y / BEELD.h) * foto.naturalHeight;
        c.drawImage(foto, 0, bronY, foto.naturalWidth, (strook / BEELD.h) * foto.naturalHeight, BEELD.x + verschuif, BEELD.y + y, BEELD.b, strook);
      }
      // Kleurstoring
      if (schade > 0.35) {
        c.fillStyle = `rgba(${Math.random() < 0.5 ? "255,0,120" : "0,255,200"}, ${(schade - 0.35) * 0.35 * Math.random()})`;
        c.fillRect(BEELD.x, BEELD.y, BEELD.b, BEELD.h);
      }
    }
    // Sneeuw/ruis
    const ruisSterkte = geenSignaal ? 0.9 : schade * 0.45;
    if (ruisSterkte > 0.02) {
      vulRuis();
      c.globalAlpha = ruisSterkte;
      c.imageSmoothingEnabled = false;
      c.drawImage(ruis, BEELD.x, BEELD.y, BEELD.b, BEELD.h);
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 1;
    }
    if (geenSignaal) tekst("GEEN SIGNAAL", BEELD.x + BEELD.b / 2, BEELD.y + BEELD.h / 2, 18, "#fff");
    // Dode plekken
    dodePlekken.forEach((p) => {
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, "rgba(0, 0, 0, 0.95)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fill();
    });
    // Het beeld gaat langzaam uit
    if (schade > 0.8) {
      c.fillStyle = `rgba(0, 0, 0, ${(schade - 0.8) * 3 * (0.7 + Math.random() * 0.3)})`;
      c.fillRect(BEELD.x, BEELD.y, BEELD.b, BEELD.h);
    }
    // Beeldlijnen en glans
    c.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = BEELD.y; y < BEELD.y + BEELD.h; y += 3) c.fillRect(BEELD.x, y, BEELD.b, 1);
    c.fillStyle = "rgba(255, 255, 255, 0.07)";
    c.beginPath();
    c.ellipse(BEELD.x + BEELD.b * 0.3, BEELD.y + BEELD.h * 0.25, BEELD.b * 0.35, BEELD.h * 0.2, -0.2, 0, Math.PI * 2);
    c.fill();
    // Barsten in het glas
    c.lineJoin = "round";
    barsten.forEach((lijnen) => {
      lijnen.forEach((lijn) => {
        c.beginPath();
        lijn.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.strokeStyle = "rgba(0, 0, 0, 0.6)";
        c.lineWidth = 3;
        c.stroke();
        c.strokeStyle = "rgba(230, 245, 255, 0.9)";
        c.lineWidth = 1.5;
        c.stroke();
      });
    });
    c.restore();
  }

  function tekenGereedschap(naam, x, y, slag, schaal = 1) {
    c.save();
    c.translate(x, y);
    c.scale(schaal, schaal);
    if (naam === "HAMER") {
      c.rotate(slag > 0 ? -0.2 : -0.9);
      c.fillStyle = "#8d5524";
      c.fillRect(-5, -10, 10, 70);
      c.fillStyle = "#000";
      c.fillRect(-34, -42, 68, 36);
      c.fillStyle = "#9aa0a6";
      c.fillRect(-31, -39, 62, 30);
      c.fillStyle = "#d5d9dd";
      c.fillRect(-31, -39, 62, 6);
    } else if (naam === "KLOMP") {
      c.rotate(slag > 0 ? 0.1 : -0.5);
      c.fillStyle = "#1a1a1a";
      c.beginPath();
      c.ellipse(0, -10, 46, 22, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#f2c14e";
      c.beginPath();
      c.ellipse(0, -10, 43, 19, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#c8962a";
      c.beginPath();
      c.ellipse(-14, -16, 16, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e53935";
      c.fillRect(8, -14, 18, 4);
    } else {
      c.font = "54px serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("🐄", 0, -10);
    }
    c.restore();
  }

  function tekenBalk() {
    const breed = (W - 40) / GEREEDSCHAP.length;
    GEREEDSCHAP.forEach((g, i) => {
      const x = 20 + i * breed;
      const gekozen = i === gereedschap;
      c.fillStyle = "#000";
      c.fillRect(x + 4, BALK_Y, breed - 8, 70);
      c.fillStyle = gekozen ? "#ff8a3d" : "#2a1a0e";
      c.fillRect(x + 7, BALK_Y + 3, breed - 14, 64);
      tekenGereedschap(g.naam, x + 50, BALK_Y + 50, 1, 0.55);
      tekst(i + 1 + " " + g.naam, x + breed / 2 + 26, BALK_Y + 35, 11, gekozen ? "#fff" : "#e0c080");
    });
  }

  function tekenSchadeMeter() {
    tekst("TV MEPPEN", W / 2, 30, 20, "#ff8a3d");
    c.fillStyle = "#000";
    c.fillRect(100, 52, W - 200, 18);
    c.fillStyle = schade > 0.75 ? "#ff3e5a" : schade > 0.4 ? "#ff8a3d" : "#ffe14d";
    c.fillRect(103, 55, (W - 206) * schade, 12);
    tekst("SCHADE " + Math.floor(schade * 100) + "%", W / 2, 61, 9, "#fff");
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 16 * schud * 4, (Math.random() - 0.5) * 12 * schud * 4);
    tekenKamer();

    if (toestand === "meppen") {
      tekenAntennes();
      tekenKast();
      tekenBeeld();
    } else {
      tekenAntennes();
      // Rondvliegende brokstukken
      brokken.forEach((b) => {
        c.save();
        c.translate(b.x + b.b / 2, b.y + b.h / 2);
        c.rotate(b.draai);
        if (b.bronX !== null && foto.complete) {
          c.drawImage(foto, b.bronX * foto.naturalWidth, b.bronY * foto.naturalHeight, foto.naturalWidth / 4, foto.naturalHeight / 4, -b.b / 2, -b.h / 2, b.b, b.h);
        } else {
          c.fillStyle = "#7a4a22";
          c.fillRect(-b.b / 2, -b.h / 2, b.b, b.h);
        }
        c.restore();
      });
    }

    rook.forEach((r) => {
      c.fillStyle = `rgba(80, 80, 80, ${0.5 * (1 - r.leeftijd / 2.5)})`;
      c.beginPath();
      c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      c.fill();
    });
    deeltjes.forEach((d) => {
      c.fillStyle = d.kleur;
      c.fillRect(d.x, d.y, d.grootte, d.vonk ? d.grootte * 3 : d.grootte);
    });
    koeien.forEach((k) => tekenGereedschap("KOE", k.x, k.y, 0, 1.6));
    c.restore();

    tekenSchadeMeter();
    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.3);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 40, k.groot ? 18 : 11, k.kleur);
    });
    c.globalAlpha = 1;
    tekenBalk();

    if (flits > 0) {
      c.fillStyle = `rgba(255, 255, 255, ${Math.min(1, flits)})`;
      c.fillRect(0, 0, W, H);
    }

    if (toestand === "ontploft" && tijd - ontploftSinds > 0.9) {
      c.fillStyle = "rgba(0, 0, 0, 0.55)";
      c.fillRect(0, 0, W, H);
      const dobber = Math.sin(tijd * 3) * 6;
      tekst("ZO, EINDELIJK", W / 2, 240 + dobber, 26, "#ffe14d");
      tekst("HET KONINKLIJK HUIS", W / 2, 300 - dobber, 22, "#ff8a3d");
      tekst("KAPOTGEMAAKT!", W / 2, 360 + dobber, 30, "#ff3e5a");
      if (tijd - ontploftSinds > 2 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE / KLIK = NIEUWE TV", W / 2, 470, 13, "#fff");
    }

    // Gereedschap volgt de muis
    if (toestand === "meppen" && wijzer.y < BALK_Y - 10 && !koeien.length) {
      tekenGereedschap(GEREEDSCHAP[gereedschap].naam, wijzer.x, wijzer.y, wijzer.slag);
    }
  }

  nieuweTv();
  Arcade.lus(update, teken);
})();
