// Gains Snake: het hoofd van de jarige eet kwark, creatine en bier, en zijn staart groeit ervan.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const FONT = '"Press Start 2P", "Courier New", monospace';
  const RECORD_SLEUTEL = "snake.record";

  // --- Speelveld ---
  const KOLOMMEN = 20;
  const RIJEN = 20;
  const VAK = 32;
  const HUD = 64; // ruimte bovenin voor de score

  // --- Spelregels ---
  const START_TEMPO = 0.14;   // seconden per stap
  const MIN_TEMPO = 0.065;
  const SOORTEN = ["kwark", "creatine", "bier"];
  const KREETJES = {
    kwark: ["KWARKIE!", "+PROTEINE", "BULKEN!"],
    creatine: ["GAINS!", "+5 KG", "POMPEN!"],
    bier: ["PROOST!", "BIERTJE!", "SANTÉ!"]
  };

  // Elk potje krijgt de slang een willekeurig gezicht van Jessy
  const gezichten = Arcade.gezichten();
  let hoofd = null;

  function pasAan() {
    const schaal = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = Math.floor(W * schaal) + "px";
    canvas.style.height = Math.floor(H * schaal) + "px";
  }
  window.addEventListener("resize", pasAan);
  pasAan();

  // --- Toestand ---
  let toestand;        // "klaar", "spelen" of "einde"
  let posities;        // [{x, y}], index 0 is het hoofd
  let vorige;          // posities van de vorige stap, voor vloeiend bewegen
  let soorten;         // wat elk stukje staart is
  let richting;
  let wachtrij;        // ingedrukte richtingen die nog moeten gebeuren
  let eten;
  let score;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  let nieuwRecord;
  let teller;          // tijd sinds de laatste stap
  let tijd = 0;
  let eindeSinds = 0;
  let kreten = [];     // zwevende teksten
  let schud = 0;

  function nieuwSpel() {
    hoofd = Arcade.anderGezicht(gezichten, hoofd);
    toestand = "klaar";
    posities = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
    vorige = posities.map((p) => ({ ...p }));
    soorten = ["hoofd", "kwark", "bier"];
    richting = { x: 1, y: 0 };
    wachtrij = [];
    score = 0;
    nieuwRecord = false;
    teller = 0;
    kreten = [];
    nieuwEten();
  }

  function tempo() {
    return Math.max(MIN_TEMPO, START_TEMPO - score * 0.003);
  }

  function nieuwEten() {
    const vrij = [];
    for (let x = 0; x < KOLOMMEN; x++) {
      for (let y = 0; y < RIJEN; y++) {
        if (!posities.some((p) => p.x === x && p.y === y)) vrij.push({ x, y });
      }
    }
    // Het hele veld vol? Dan valt er niets meer te eten (en leg het eten buiten beeld)
    const plek = vrij.length ? vrij[Math.floor(Math.random() * vrij.length)] : { x: -10, y: -10 };
    eten = { ...plek, soort: SOORTEN[Math.floor(Math.random() * SOORTEN.length)] };
  }

  // --- Besturing ---
  function stuur(x, y) {
    if (toestand === "klaar") toestand = "spelen";
    if (toestand !== "spelen") return;
    const laatste = wachtrij.length ? wachtrij[wachtrij.length - 1] : richting;
    if ((laatste.x === x && laatste.y === y) || (laatste.x === -x && laatste.y === -y)) return;
    if (wachtrij.length < 3) wachtrij.push({ x, y });
  }

  function startOfOpnieuw() {
    if (toestand === "klaar") toestand = "spelen";
    else if (toestand === "einde" && tijd - eindeSinds > 0.6) nieuwSpel();
  }

  const PIJLEN = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };

  document.addEventListener("keydown", (e) => {
    if (PIJLEN[e.code]) {
      e.preventDefault();
      stuur(...PIJLEN[e.code]);
    } else if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      if (!e.repeat) startOfOpnieuw();
    } else if (e.code === "KeyM") {
      Arcade.zetStil(!Arcade.isStil());
    }
  });

  // Vegen op een telefoon
  let veegStart = null;
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    veegStart = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!veegStart) return;
    const dx = e.clientX - veegStart.x;
    const dy = e.clientY - veegStart.y;
    veegStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
      startOfOpnieuw();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      stuur(Math.sign(dx), 0);
    } else {
      stuur(0, Math.sign(dy));
    }
  });

  // --- Geluiden ---
  function hapGeluid(soort) {
    if (soort === "bier") {
      Arcade.ruis({ duur: 0.15, volume: 0.15 }); // pssst, blikje open
      Arcade.toon({ type: "square", van: 523, naar: 784, duur: 0.12, volume: 0.1, vertraging: 0.1 });
    } else {
      Arcade.toon({ type: "square", van: 440, naar: 880, duur: 0.08, volume: 0.1 });
      Arcade.toon({ type: "square", van: 880, naar: 1320, duur: 0.1, volume: 0.1, vertraging: 0.07 });
    }
  }

  // --- Spel bijwerken ---
  function stap() {
    if (wachtrij.length) richting = wachtrij.shift();
    const oud = posities;
    const kop = { x: oud[0].x + richting.x, y: oud[0].y + richting.y };
    const eet = kop.x === eten.x && kop.y === eten.y;

    const nieuw = [kop, ...oud.slice(0, eet ? oud.length : oud.length - 1)];
    const buitenVeld = kop.x < 0 || kop.y < 0 || kop.x >= KOLOMMEN || kop.y >= RIJEN;
    const inZichzelf = nieuw.slice(1).some((p) => p.x === kop.x && p.y === kop.y);
    if (buitenVeld || inZichzelf) {
      doodGaan();
      return;
    }

    vorige = nieuw.map((_, i) => ({ ...oud[Math.min(i, oud.length - 1)] }));
    posities = nieuw;

    if (eet) {
      soorten.push(eten.soort);
      score++;
      hapGeluid(eten.soort);
      const opties = KREETJES[eten.soort];
      kreten.push({
        tekst: opties[Math.floor(Math.random() * opties.length)],
        x: eten.x * VAK + VAK / 2,
        y: HUD + eten.y * VAK,
        leeftijd: 0
      });
      nieuwEten();
    }
  }

  function doodGaan() {
    toestand = "einde";
    eindeSinds = tijd;
    schud = 0.35;
    Arcade.ruis({ duur: 0.3, volume: 0.3 });
    Arcade.toon({ type: "square", van: 440, naar: 55, duur: 0.8, volume: 0.15, vertraging: 0.1 });
    if (score > record) {
      record = score;
      nieuwRecord = true;
      Arcade.bewaar(RECORD_SLEUTEL, record);
    }
    Arcade.vraagNaam("snake", score);
  }

  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1);

    if (toestand !== "spelen") return;
    teller += dt;
    while (teller >= tempo() && toestand === "spelen") {
      teller -= tempo();
      stap();
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

  function rondRechthoek(x, y, b, h, r) {
    c.beginPath();
    c.roundRect(x, y, b, h, r);
  }

  // Potje kwark: wit bakje met blauwe band en blauw deksel
  function tekenKwark(cx, cy, s) {
    const b = s * 0.8, h = s * 0.7;
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.moveTo(cx - b / 2 - 2, cy - h / 2 + 2);
    c.lineTo(cx + b / 2 + 2, cy - h / 2 + 2);
    c.lineTo(cx + b / 2 * 0.8 + 2, cy + h / 2 + 2);
    c.lineTo(cx - b / 2 * 0.8 - 2, cy + h / 2 + 2);
    c.fill();
    c.fillStyle = "#f7f7f7";
    c.beginPath();
    c.moveTo(cx - b / 2, cy - h / 2 + 3);
    c.lineTo(cx + b / 2, cy - h / 2 + 3);
    c.lineTo(cx + b / 2 * 0.8, cy + h / 2);
    c.lineTo(cx - b / 2 * 0.8, cy + h / 2);
    c.fill();
    c.fillStyle = "#2b6cd4";
    c.fillRect(cx - b / 2 * 0.9, cy - 2, b * 0.9, h * 0.3);
    c.fillStyle = "#1f4fa3";
    rondRechthoek(cx - b / 2 - 3, cy - h / 2 - 2, b + 6, 6, 2);
    c.fill();
  }

  // Pot creatine: zwarte pot met wit etiket en een rode C
  function tekenCreatine(cx, cy, s) {
    const b = s * 0.66, h = s * 0.82;
    c.fillStyle = "#000";
    rondRechthoek(cx - b / 2 - 2, cy - h / 2 - 2, b + 4, h + 4, 5);
    c.fill();
    c.fillStyle = "#2a2a2a";
    rondRechthoek(cx - b / 2, cy - h / 2 + 5, b, h - 5, 4);
    c.fill();
    c.fillStyle = "#555";
    c.fillRect(cx - b / 2 - 1, cy - h / 2, b + 2, 6);
    c.fillStyle = "#fff";
    c.fillRect(cx - b / 2, cy - h * 0.12, b, h * 0.36);
    c.font = `${Math.floor(s * 0.28)}px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#e0262b";
    c.fillText("C", cx, cy + h * 0.07);
  }

  // Glas bier met schuimkraag
  function tekenBier(cx, cy, s) {
    const b = s * 0.62, h = s * 0.84;
    const top = cy - h / 2;
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.moveTo(cx - b / 2 - 2, top - 2);
    c.lineTo(cx + b / 2 + 2, top - 2);
    c.lineTo(cx + b / 2 * 0.78 + 2, cy + h / 2 + 2);
    c.lineTo(cx - b / 2 * 0.78 - 2, cy + h / 2 + 2);
    c.fill();
    c.fillStyle = "#f2a900";
    c.beginPath();
    c.moveTo(cx - b / 2, top);
    c.lineTo(cx + b / 2, top);
    c.lineTo(cx + b / 2 * 0.78, cy + h / 2);
    c.lineTo(cx - b / 2 * 0.78, cy + h / 2);
    c.fill();
    c.fillStyle = "#ffd34d";
    c.fillRect(cx - b / 2 + 4, top + 6, 3, h - 10);
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(cx - b / 4, top + 1, b / 4, Math.PI, 0);
    c.arc(cx + b / 4, top + 1, b / 4, Math.PI, 0);
    c.fill();
    c.fillRect(cx - b / 2, top, b, 5);
  }

  const TEKENAAR = { kwark: tekenKwark, creatine: tekenCreatine, bier: tekenBier };

  function tekenVeld() {
    c.fillStyle = "#0b0b1e";
    c.fillRect(0, 0, W, H);
    for (let x = 0; x < KOLOMMEN; x++) {
      for (let y = 0; y < RIJEN; y++) {
        c.fillStyle = (x + y) % 2 ? "#16163a" : "#1b1b45";
        c.fillRect(x * VAK, HUD + y * VAK, VAK, VAK);
      }
    }
    c.fillStyle = "#ff3ea5";
    c.fillRect(0, HUD - 4, W, 4);
  }

  function tekenHud() {
    tekst("SCORE " + score, 16, HUD / 2, 16, "#fff", "left");
    tekst("GAINS SNAKE", W / 2, HUD / 2, 16, "#ffe14d");
    tekst("RECORD " + record, W - 16, HUD / 2, 16, "#3ef0ff", "right");
  }

  function tekenEten() {
    const cx = eten.x * VAK + VAK / 2;
    const cy = HUD + eten.y * VAK + VAK / 2;
    const puls = 1 + Math.sin(tijd * 8) * 0.08;
    c.fillStyle = "rgba(255, 225, 77, 0.25)";
    c.beginPath();
    c.arc(cx, cy, VAK * 0.65 * puls, 0, Math.PI * 2);
    c.fill();
    TEKENAAR[eten.soort](cx, cy, VAK * puls);
  }

  function tekenSlang() {
    const t = toestand === "spelen" ? Math.min(teller / tempo(), 1) : 1;
    const plek = (i) => ({
      x: (vorige[i].x + (posities[i].x - vorige[i].x) * t) * VAK + VAK / 2,
      y: HUD + (vorige[i].y + (posities[i].y - vorige[i].y) * t) * VAK + VAK / 2
    });

    // Staart van achter naar voor, zodat het hoofd bovenop komt
    for (let i = posities.length - 1; i >= 1; i--) {
      const p = plek(i);
      const wiebel = Math.sin(tijd * 10 + i) * 1.5;
      TEKENAAR[soorten[i]](p.x, p.y + wiebel, VAK * 0.95);
    }

    const k = plek(0);
    const r = VAK * 0.82;
    c.save();
    c.translate(k.x, k.y);
    if (toestand === "einde") c.rotate(Math.sin(tijd * 20) * 0.15);
    if (richting.x < 0) c.scale(-1, 1);
    c.fillStyle = "#ff3ea5";
    c.beginPath();
    c.arc(0, 0, r + 3, 0, Math.PI * 2);
    c.fill();
    Arcade.plaatje(c, hoofd, 0, 0, r);
    c.restore();
  }

  function tekenKreten() {
    kreten.forEach((k) => {
      c.globalAlpha = 1 - k.leeftijd;
      tekst(k.tekst, k.x, k.y - k.leeftijd * 40, 12, "#ffe14d");
    });
    c.globalAlpha = 1;
  }

  function scherm(regels) {
    c.fillStyle = "rgba(0, 0, 0, 0.6)";
    c.fillRect(0, HUD, W, H - HUD);
    regels.forEach(([woord, y, grootte, kleur]) => tekst(woord, W / 2, y, grootte, kleur));
  }

  function eindTekst() {
    if (score >= 40) return "BEAST MODE!";
    if (score >= 25) return "GESPIERD!";
    if (score >= 10) return "LEKKER BEZIG";
    return "MEER KWARK NODIG";
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    tekenVeld();
    tekenEten();
    tekenSlang();
    tekenKreten();
    tekenHud();

    if (toestand === "klaar") {
      scherm([
        ["GAINS SNAKE", 220, 36, "#ffe14d"],
        ["EET KWARK, CREATINE", 300, 14, "#fff"],
        ["EN BIER OM TE GROEIEN", 330, 14, "#fff"],
        ["PIJLTJES / WASD / VEGEN", 410, 12, "#3ef0ff"],
        ["SPATIE = START", 470, 16, "#fff"],
        ["ESC = PAUZE   M = GELUID", 650, 10, "#aaa"]
      ]);
    } else if (toestand === "einde") {
      const regels = [
        ["GAME OVER", 220, 36, "#ff5a5a"],
        [eindTekst(), 280, 16, "#ffe14d"],
        [Arcade.plaagTekst(), 312, 11, "#fff"],
        ["SCORE " + score, 350, 20, "#fff"],
        ["RECORD " + record, 395, 20, "#3ef0ff"],
        ["ESC = PAUZE", 560, 12, "#aaa"]
      ];
      if (nieuwRecord) regels.push(["NIEUW RECORD!", 440, 14, "#ff3ea5"]);
      if (tijd - eindeSinds > 0.6 && Math.floor(tijd * 2) % 2 === 0) regels.push(["SPATIE = OPNIEUW", 510, 16, "#fff"]);
      scherm(regels);
    }
    c.restore();
  }

  // --- Hoofdlus ---
  let vorigeTijd = performance.now();
  function lus(nu) {
    const dt = Math.max(0, Math.min((nu - vorigeTijd) / 1000, 1 / 20));
    vorigeTijd = nu;
    if (!Arcade.gepauzeerd()) update(dt);
    teken();
    requestAnimationFrame(lus);
  }

  Arcade.volgScore(() => score);
  nieuwSpel();
  requestAnimationFrame(lus);
})();
