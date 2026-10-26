// Flappy Koe: een vliegende koe tussen Mario-pijpen door.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const GROND_Y = H - 96;
  const FONT = '"Press Start 2P", "Courier New", monospace';
  const RECORD_SLEUTEL = "flappy-koe.record";

  // --- Spelregels (hier kun je de moeilijkheid aanpassen) ---
  const ZWAARTEKRACHT = 1700;   // px per seconde²
  const SPRONG = -520;          // snelheid omhoog bij een klik
  const MAX_VAL = 720;
  const PIJP_BREED = 78;
  const RAND_BREED = 92;        // de rand bovenop de pijp
  const RAND_HOOG = 34;
  const PIJP_AFSTAND = 250;     // ruimte tussen twee pijpen
  const MIN_PIJP = 150;         // kortste pijp, zodat "VIBECODE" er altijd op past
  const PIJP_TEKST = "VIBECODE";

  // --- Schaal het canvas zodat het in het venster past ---
  function pasAan() {
    const schaal = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = Math.floor(W * schaal) + "px";
    canvas.style.height = Math.floor(H * schaal) + "px";
  }
  window.addEventListener("resize", pasAan);
  pasAan();

  // --- De koe, getekend als pixel-art ---
  const KLEUR = { k: "#1a1a1a", w: "#ffffff", p: "#ff9eb5", y: "#f4e4b0", g: "#d9d9e6" };
  const PIXEL = 3;

  function maakKoe(vleugel) {
    const sprite = document.createElement("canvas");
    sprite.width = 24;
    sprite.height = 18;
    const s = sprite.getContext("2d");
    const vak = (x, y, b, h, kleur) => { s.fillStyle = kleur; s.fillRect(x, y, b, h); };
    // Blok met een zwarte rand eromheen
    const blok = (x, y, b, h, kleur) => { vak(x - 1, y - 1, b + 2, h + 2, KLEUR.k); vak(x, y, b, h, kleur); };

    vak(0, 5, 1, 5, KLEUR.k);                  // staart
    vak(0, 10, 2, 2, KLEUR.k);                 // staartpluim
    [3, 7, 11, 14].forEach((x) => blok(x, 14, 2, 2, KLEUR.w)); // poten
    blok(9, 14, 2, 1, KLEUR.p);                // uier
    blok(2, 6, 14, 7, KLEUR.w);                // lijf
    vak(2, 11, 14, 2, KLEUR.g);                // schaduw onder het lijf
    vak(4, 6, 3, 2, KLEUR.k);                  // vlekken
    vak(5, 8, 1, 1, KLEUR.k);
    vak(10, 9, 3, 2, KLEUR.k);
    vak(11, 11, 2, 1, KLEUR.k);
    vak(13, 6, 2, 2, KLEUR.k);
    vak(6, 11, 2, 2, KLEUR.k);

    // Vleugeltje dat op en neer klappert
    if (vleugel === 0) blok(6, 2, 5, 2, KLEUR.w);
    if (vleugel === 1) blok(5, 6, 6, 2, KLEUR.w);
    if (vleugel === 2) blok(6, 9, 5, 2, KLEUR.w);

    blok(12, 4, 2, 1, KLEUR.p);                // oor
    blok(15, 3, 7, 7, KLEUR.w);                // kop
    blok(15, 1, 1, 1, KLEUR.y);                // horens
    blok(21, 1, 1, 1, KLEUR.y);
    blok(17, 8, 6, 3, KLEUR.p);                // snuit
    vak(18, 9, 1, 1, KLEUR.k);                 // neusgaten
    vak(21, 9, 1, 1, KLEUR.k);
    vak(18, 4, 2, 2, KLEUR.k);                 // oog
    vak(19, 4, 1, 1, KLEUR.w);
    return sprite;
  }
  const KOE_FRAMES = [maakKoe(0), maakKoe(1), maakKoe(2), maakKoe(1)];

  // --- Toestand van het spel ---
  let toestand;          // "klaar", "spelen", "dood" of "einde"
  let koe;
  let pijpen;
  let score;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  let nieuwRecord;
  let afstand;           // hoe ver de wereld al is opgeschoven
  let tijd = 0;
  let eindeSinds = 0;
  let schud = 0;
  let flits = 0;

  const wolken = Array.from({ length: 6 }, (_, i) => ({
    x: i * 90 + Math.random() * 60,
    y: 40 + Math.random() * 260,
    s: 0.6 + Math.random() * 0.8
  }));

  function nieuwSpel() {
    toestand = "klaar";
    koe = { x: 110, y: H / 2 - 40, vy: 0, hoek: 0, frame: 0 };
    pijpen = [];
    score = 0;
    nieuwRecord = false;
    afstand = 0;
  }

  function snelheid() {
    return 165 + Math.min(score * 3, 75);
  }

  function opening() {
    return Math.max(150, 180 - score * 1.5);
  }

  function nieuwePijp(x) {
    const gat = opening();
    const minBoven = MIN_PIJP + RAND_HOOG;
    const maxBoven = GROND_Y - MIN_PIJP - RAND_HOOG - gat;
    const boven = minBoven + Math.random() * (maxBoven - minBoven);
    pijpen.push({ x, boven, onder: boven + gat, geteld: false });
  }

  // --- Besturing ---
  function vlieg() {
    if (toestand === "klaar") {
      toestand = "spelen";
      nieuwePijp(W + 60);
    }
    if (toestand === "spelen") {
      koe.vy = SPRONG;
      Arcade.toon({ type: "square", van: 380, naar: 760, duur: 0.08, volume: 0.08 });
    } else if (toestand === "einde" && tijd - eindeSinds > 0.6) {
      nieuwSpel();
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") {
      e.preventDefault();
      vlieg();
    } else if (e.code === "Escape") {
      Arcade.naarMenu();
    } else if (e.code === "KeyM") {
      Arcade.zetStil(!Arcade.isStil());
    }
  });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    vlieg();
  });

  // --- Geluiden ---
  function boe() {
    // Een "boe" uit een zaagtand die langzaam lager wordt
    Arcade.toon({ type: "sawtooth", van: 180, naar: 120, duur: 0.25, volume: 0.25, filter: 900 });
    Arcade.toon({ type: "sawtooth", van: 120, naar: 85, duur: 0.7, volume: 0.25, filter: 700, vertraging: 0.2 });
  }

  function botsing() {
    if (toestand !== "spelen") return;
    toestand = "dood";
    schud = 0.3;
    flits = 1;
    koe.vy = Math.min(koe.vy, 0) - 150;
    Arcade.ruis({ duur: 0.25, volume: 0.3 });
    setTimeout(boe, 250);
    if (score > record) {
      record = score;
      nieuwRecord = true;
      Arcade.bewaar(RECORD_SLEUTEL, record);
    }
  }

  // Raakt een cirkel (de koe) een rechthoek (een stuk pijp)?
  function raakt(cx, cy, r, x, y, b, h) {
    const dx = cx - Math.max(x, Math.min(cx, x + b));
    const dy = cy - Math.max(y, Math.min(cy, y + h));
    return dx * dx + dy * dy < r * r;
  }

  // --- Spel bijwerken ---
  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    flits = Math.max(0, flits - dt * 3);

    const beweegt = toestand === "klaar" || toestand === "spelen";
    if (beweegt) afstand += snelheid() * dt;
    wolken.forEach((w) => {
      w.x -= (beweegt ? 18 : 4) * w.s * dt;
      if (w.x < -100) { w.x = W + 50; w.y = 40 + Math.random() * 260; }
    });

    if (toestand === "klaar") {
      koe.y = H / 2 - 40 + Math.sin(tijd * 4) * 10;
      koe.frame = Math.floor(tijd * 8) % 4;
      return;
    }

    if (toestand === "spelen" || toestand === "dood") {
      koe.vy = Math.min(koe.vy + ZWAARTEKRACHT * dt, MAX_VAL);
      koe.y += koe.vy * dt;
      const doelHoek = Math.max(-0.45, Math.min(koe.vy / 550, toestand === "dood" ? 1.5 : 1.2));
      koe.hoek += (doelHoek - koe.hoek) * Math.min(1, dt * 10);
      if (toestand === "spelen") koe.frame = koe.vy < 100 ? Math.floor(tijd * 14) % 4 : 1;
    }

    if (toestand === "spelen") {
      const v = snelheid();
      pijpen.forEach((p) => { p.x -= v * dt; });
      pijpen = pijpen.filter((p) => p.x > -RAND_BREED);
      const laatste = pijpen[pijpen.length - 1];
      if (laatste && laatste.x < W - PIJP_AFSTAND) nieuwePijp(laatste.x + PIJP_AFSTAND);

      const r = 22;
      const kx = koe.x;
      const ky = koe.y;
      for (const p of pijpen) {
        const rx = p.x - (RAND_BREED - PIJP_BREED) / 2;
        if (
          raakt(kx, ky, r, p.x, -200, PIJP_BREED, p.boven + 200) || // ook boven het scherm, anders vlieg je eroverheen

          raakt(kx, ky, r, rx, p.boven - RAND_HOOG, RAND_BREED, RAND_HOOG) ||
          raakt(kx, ky, r, p.x, p.onder, PIJP_BREED, GROND_Y - p.onder) ||
          raakt(kx, ky, r, rx, p.onder, RAND_BREED, RAND_HOOG)
        ) {
          botsing();
          break;
        }
        if (!p.geteld && p.x + PIJP_BREED < kx) {
          p.geteld = true;
          score++;
          Arcade.toon({ type: "square", van: 988, duur: 0.08, volume: 0.1 });
          Arcade.toon({ type: "square", van: 1319, duur: 0.2, volume: 0.1, vertraging: 0.08 });
        }
      }
      if (koe.y < -40) koe.y = -40; // niet boven het scherm uit vliegen
    }

    // Op de grond geland?
    if (koe.y + 22 >= GROND_Y && toestand !== "einde" && toestand !== "klaar") {
      koe.y = GROND_Y - 22;
      botsing();
      toestand = "einde";
      eindeSinds = tijd;
    }
  }

  // --- Tekenen ---
  function tekst(woord, x, y, grootte, kleur = "#fff", uitlijning = "center") {
    c.font = `${grootte}px ${FONT}`;
    c.textAlign = uitlijning;
    c.textBaseline = "middle";
    c.lineJoin = "round";
    c.lineWidth = Math.max(3, grootte / 3);
    c.strokeStyle = "#000";
    c.strokeText(woord, x, y);
    c.fillStyle = kleur;
    c.fillText(woord, x, y);
  }

  function tekenLucht() {
    const lucht = c.createLinearGradient(0, 0, 0, GROND_Y);
    lucht.addColorStop(0, "#4ec0e9");
    lucht.addColorStop(1, "#b5ecff");
    c.fillStyle = lucht;
    c.fillRect(0, 0, W, GROND_Y);

    c.fillStyle = "#fff";
    wolken.forEach((w) => {
      const s = 10 * w.s;
      c.fillRect(w.x, w.y, s * 8, s * 2);
      c.fillRect(w.x + s, w.y - s, s * 5, s);
      c.fillRect(w.x + s * 2, w.y - s * 2, s * 2, s);
    });
  }

  // Heuvels in blokjes, die langzamer bewegen dan de voorgrond
  function tekenHeuvels(snelheidFactor, basis, hoogte, kleur, blok) {
    c.fillStyle = kleur;
    const verschuiving = (afstand * snelheidFactor) % blok;
    for (let x = -blok; x < W + blok; x += blok) {
      const wx = x + Math.floor(afstand * snelheidFactor / blok) * blok;
      const h = hoogte * (0.55 + 0.45 * Math.sin(wx / 140) * Math.cos(wx / 61));
      c.fillRect(x - verschuiving, basis - h, blok + 1, h + 1);
    }
  }

  function tekenSchuur() {
    // Een rode boerderij-schuur die langzaam voorbij schuift
    const x = W - ((afstand * 0.35) % (W + 300)) + 60;
    const y = GROND_Y - 120;
    c.fillStyle = "#9b2c2c";
    c.fillRect(x, y, 100, 80);
    c.fillStyle = "#6e1d1d";
    c.beginPath();
    c.moveTo(x - 10, y);
    c.lineTo(x + 50, y - 45);
    c.lineTo(x + 110, y);
    c.fill();
    c.fillStyle = "#fff";
    c.fillRect(x + 32, y + 30, 36, 50);
    c.fillStyle = "#9b2c2c";
    c.fillRect(x + 36, y + 34, 28, 46);
    c.strokeStyle = "#fff";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + 36, y + 34); c.lineTo(x + 64, y + 80);
    c.moveTo(x + 64, y + 34); c.lineTo(x + 36, y + 80);
    c.stroke();
  }

  // Een groene Mario-pijp. boven = true als de opening naar beneden wijst.
  function tekenPijp(x, y, lengte, opening) {
    const rand = c;
    const lijf = (px, py, b, h) => {
      rand.fillStyle = "#0a3d0a";
      rand.fillRect(px - 3, py - 3, b + 6, h + 6);
      rand.fillStyle = "#43b047";
      rand.fillRect(px, py, b, h);
      rand.fillStyle = "#8fe36b";
      rand.fillRect(px + 6, py, 8, h);
      rand.fillRect(px + 18, py, 4, h);
      rand.fillStyle = "#2a8a2e";
      rand.fillRect(px + b - 18, py, 8, h);
      rand.fillStyle = "#1e6b22";
      rand.fillRect(px + b - 10, py, 10, h);
    };
    const randX = x - (RAND_BREED - PIJP_BREED) / 2;
    if (opening === "onder") {
      lijf(x, y, PIJP_BREED, lengte - RAND_HOOG);
      lijf(randX, y + lengte - RAND_HOOG, RAND_BREED, RAND_HOOG);
      tekenPijpTekst(x, y, lengte - RAND_HOOG);
    } else {
      lijf(x, y + RAND_HOOG, PIJP_BREED, lengte - RAND_HOOG);
      lijf(randX, y, RAND_BREED, RAND_HOOG);
      tekenPijpTekst(x, y + RAND_HOOG, lengte - RAND_HOOG);
    }
  }

  // "VIBECODE" van boven naar beneden op de pijp
  function tekenPijpTekst(x, y, lengte) {
    const stap = Math.min(28, (lengte - 20) / PIJP_TEKST.length);
    if (stap < 8) return;
    const grootte = Math.floor(stap * 0.8);
    const begin = y + lengte / 2 - (stap * (PIJP_TEKST.length - 1)) / 2;
    c.font = `${grootte}px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineWidth = 4;
    c.lineJoin = "round";
    for (let i = 0; i < PIJP_TEKST.length; i++) {
      const ly = begin + i * stap;
      c.strokeStyle = "#0a3d0a";
      c.strokeText(PIJP_TEKST[i], x + PIJP_BREED / 2, ly);
      c.fillStyle = "#fff";
      c.fillText(PIJP_TEKST[i], x + PIJP_BREED / 2, ly);
    }
  }

  function tekenGrond() {
    const v = afstand % 24;
    c.fillStyle = "#0a3d0a";
    c.fillRect(0, GROND_Y, W, 4);
    for (let x = -24; x < W + 24; x += 24) {
      c.fillStyle = "#5fd35f";
      c.fillRect(x - v, GROND_Y + 4, 12, 18);
      c.fillStyle = "#3fae3f";
      c.fillRect(x - v + 12, GROND_Y + 4, 12, 18);
    }
    c.fillStyle = "#2f7d2f";
    c.fillRect(0, GROND_Y + 22, W, 4);
    c.fillStyle = "#b07a45";
    c.fillRect(0, GROND_Y + 26, W, H - GROND_Y - 26);
    c.fillStyle = "#8d5d31";
    for (let x = -48; x < W + 48; x += 48) {
      c.fillRect(x - (afstand % 48), GROND_Y + 44, 8, 6);
      c.fillRect(x - (afstand % 48) + 26, GROND_Y + 68, 6, 6);
    }
  }

  function tekenKoe() {
    const sprite = KOE_FRAMES[koe.frame];
    c.save();
    c.translate(koe.x, koe.y);
    c.rotate(koe.hoek);
    c.imageSmoothingEnabled = false;
    c.drawImage(sprite, -sprite.width * PIXEL / 2, -sprite.height * PIXEL / 2, sprite.width * PIXEL, sprite.height * PIXEL);
    c.restore();
  }

  function medaille() {
    if (score >= 50) return ["PLATINA KOEBEL", "#e5f6ff"];
    if (score >= 30) return ["GOUDEN KOEBEL", "#ffd700"];
    if (score >= 20) return ["ZILVEREN KOEBEL", "#d0d0d0"];
    if (score >= 10) return ["BRONZEN KOEBEL", "#e08a3c"];
    return null;
  }

  function tekenEinde() {
    c.fillStyle = "rgba(0, 0, 0, 0.35)";
    c.fillRect(0, 0, W, H);
    tekst("GAME OVER", W / 2, 200, 34, "#ff5a5a");

    const px = 56, py = 260, pb = W - 112, ph = 250;
    c.fillStyle = "#000";
    c.fillRect(px - 4, py - 4, pb + 8, ph + 8);
    c.fillStyle = "#ded895";
    c.fillRect(px, py, pb, ph);
    c.fillStyle = "#c9b86a";
    c.fillRect(px, py + ph - 10, pb, 10);

    tekst("SCORE", W / 2, py + 34, 14, "#e86a17");
    tekst(String(score), W / 2, py + 72, 30);
    tekst("RECORD", W / 2, py + 120, 14, "#e86a17");
    tekst(String(record), W / 2, py + 158, 30);
    const m = medaille();
    if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, py + 210, 12, "#ff3ea5");
    else if (m) tekst(m[0], W / 2, py + 210, 12, m[1]);

    if (tijd - eindeSinds > 0.6 && Math.floor(tijd * 2) % 2 === 0) {
      tekst("SPATIE = OPNIEUW", W / 2, 570, 14);
    }
    tekst("ESC = MENU", W / 2, 610, 12, "#ddd");
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);

    tekenLucht();
    tekenHeuvels(0.15, GROND_Y, 170, "#8fd18f", 24);
    tekenSchuur();
    tekenHeuvels(0.4, GROND_Y, 90, "#5bb85b", 16);

    pijpen.forEach((p) => {
      tekenPijp(p.x, 0, p.boven, "onder");
      tekenPijp(p.x, p.onder, GROND_Y - p.onder, "boven");
    });

    tekenGrond();
    tekenKoe();

    if (toestand === "klaar") {
      tekst("FLAPPY KOE", W / 2, 150, 32, "#ffe14d");
      tekst("SPATIE / KLIK", W / 2, 470, 16);
      tekst("OM TE VLIEGEN", W / 2, 500, 16);
      tekst("RECORD " + record, W / 2, 560, 12, "#ffe14d");
      tekst("ESC = MENU   M = GELUID", W / 2, 730, 10, "#fff");
    } else if (toestand === "spelen" || toestand === "dood") {
      tekst(String(score), W / 2, 80, 44);
    } else if (toestand === "einde") {
      tekenEinde();
    }

    if (flits > 0) {
      c.fillStyle = `rgba(255, 255, 255, ${flits})`;
      c.fillRect(0, 0, W, H);
    }
    c.restore();
  }

  // --- Hoofdlus ---
  let vorige = performance.now();
  function lus(nu) {
    const dt = Math.max(0, Math.min((nu - vorige) / 1000, 1 / 30)); // geen gekke sprongen na een hapering
    vorige = nu;
    update(dt);
    teken();
    requestAnimationFrame(lus);
  }

  nieuwSpel();
  requestAnimationFrame(lus);
})();
