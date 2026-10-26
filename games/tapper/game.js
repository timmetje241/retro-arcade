// Bier Tapper: Jessy staat achter de bar en schuift biertjes naar dorstige gasten.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "tapper.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  const gezicht = Arcade.gezichten()[1];

  // --- De bar ---
  const BARS = [230, 350, 470, 590];   // bovenkant van elke bar
  const BAR_LINKS = 20;
  const BAR_RECHTS = 400;               // hier staat de tap
  const LEVENS = 3;
  const BIER_SNELHEID = 330;
  const KRETEN = ["PROOST!", "SANTE!", "DANKJE!", "LEKKER!", "CHEERS!"];
  const SHIRTS = ["#e53935", "#1e88e5", "#43a047", "#8e24aa", "#fb8c00", "#00acc1", "#fdd835"];
  const HAAR = ["#3e2723", "#000", "#c68e4e", "#ffcc80", "#795548", "#b71c1c"];
  const HUID = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"];

  let toestand, bar, gasten, bieren, scherven, kreten, score, levens, spelTijd, volgende, tapPauze, schud, nieuwRecord;
  let tijd = 0;
  let eindeSinds = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);

  function nieuwSpel() {
    toestand = "klaar";
    bar = 0;
    gasten = [];
    bieren = [];
    scherven = [];
    kreten = [];
    score = 0;
    levens = LEVENS;
    spelTijd = 0;
    volgende = 0.5;
    tapPauze = 0;
    schud = 0;
    nieuwRecord = false;
  }

  function willekeurig(lijst) {
    return lijst[Math.floor(Math.random() * lijst.length)];
  }

  // --- Besturing ---
  function start() {
    if (toestand === "klaar") { toestand = "spelen"; return true; }
    if (toestand === "einde" && tijd - eindeSinds > 0.8) { nieuwSpel(); return true; }
    return false;
  }

  function tap() {
    if (toestand !== "spelen" || tapPauze > 0) return;
    tapPauze = 0.22;
    bieren.push({ bar, x: BAR_RECHTS - 30 });
    Arcade.ruis({ duur: 0.08, volume: 0.08 });
    Arcade.toon({ type: "triangle", van: 300, naar: 600, duur: 0.1, volume: 0.1 });
  }

  function wissel(stap) {
    if (toestand !== "spelen") return;
    bar = (bar + stap + BARS.length) % BARS.length;
    Arcade.toon({ van: 500, duur: 0.04, volume: 0.06 });
  }

  document.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); wissel(-1); }
    else if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); wissel(1); }
    else if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowLeft") {
      e.preventDefault();
      if (!e.repeat && !start()) tap();
    }
    else if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
  });

  // Tikken op een bar: daarheen lopen en meteen tappen
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (start()) return;
    const r = canvas.getBoundingClientRect();
    const y = (e.clientY - r.top) * (H / r.height);
    let dichtst = 0;
    BARS.forEach((b, i) => { if (Math.abs(y - (b - 20)) < Math.abs(y - (BARS[dichtst] - 20))) dichtst = i; });
    bar = dichtst;
    tapPauze = 0;
    tap();
  });

  // --- Spel bijwerken ---
  function verliesLeven(waarom, x, b) {
    levens--;
    schud = 0.35;
    kreten.push({ tekst: waarom, x, y: BARS[b] - 70, leeftijd: 0, slecht: true });
    Arcade.ruis({ duur: 0.3, volume: 0.3 });
    Arcade.toon({ type: "square", van: 260, naar: 60, duur: 0.4, volume: 0.12 });
    // Even ademruimte: alle gasten lopen weg
    gasten = [];
    bieren = [];
    if (levens <= 0) {
      toestand = "einde";
      eindeSinds = tijd;
      if (score > record) {
        record = score;
        nieuwRecord = true;
        Arcade.bewaar(RECORD_SLEUTEL, record);
      }
      Arcade.vraagNaam("tapper", score);
    }
  }

  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.2);
    scherven.forEach((s) => { s.leeftijd += dt; });
    scherven = scherven.filter((s) => s.leeftijd < 1.5);
    if (toestand !== "spelen") return;
    spelTijd += dt;
    tapPauze = Math.max(0, tapPauze - dt);

    // Nieuwe dorstige gasten
    volgende -= dt;
    if (volgende <= 0) {
      volgende = Math.max(0.7, 2.6 - spelTijd * 0.025) * (0.6 + Math.random() * 0.8);
      gasten.push({
        bar: Math.floor(Math.random() * BARS.length),
        x: -20,
        v: Math.min(95, 28 + spelTijd * 0.6 + Math.random() * 12),
        shirt: willekeurig(SHIRTS),
        haar: willekeurig(HAAR),
        huid: willekeurig(HUID),
        stap: Math.random() * 6
      });
    }

    for (const g of gasten) {
      g.x += g.v * dt;
      g.stap += dt * 8;
    }

    for (const b of bieren) {
      b.x -= BIER_SNELHEID * dt;
      // Raakt het bier de voorste gast aan deze bar?
      const klant = gasten
        .filter((g) => g.bar === b.bar && !g.blij)
        .sort((a, z) => z.x - a.x)[0];
      if (klant && b.x <= klant.x + 18) {
        b.weg = true;
        klant.blij = true;
        klant.v = -160;
        score++;
        kreten.push({ tekst: willekeurig(KRETEN), x: klant.x, y: BARS[b.bar] - 80, leeftijd: 0 });
        Arcade.toon({ type: "square", van: 784, duur: 0.08, volume: 0.1 });
        Arcade.toon({ type: "square", van: 1047, duur: 0.15, volume: 0.1, vertraging: 0.08 });
      } else if (b.x < BAR_LINKS) {
        b.weg = true;
        scherven.push({ x: BAR_LINKS, y: BARS[b.bar], leeftijd: 0 });
        verliesLeven("KAPOT!", 80, b.bar);
        return;
      }
    }
    bieren = bieren.filter((b) => !b.weg);
    gasten = gasten.filter((g) => g.x > -40);

    const boos = gasten.find((g) => !g.blij && g.x >= BAR_RECHTS - 40);
    if (boos) verliesLeven("WAAR BLIJFT MIJN BIER?!", W / 2, boos.bar);
  }

  // --- Tekenen ---
  function tekenAchtergrond() {
    // Bakstenen muur
    c.fillStyle = "#4a1f1a";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#5c2820";
    for (let y = 0; y < H; y += 20) {
      for (let x = (y / 20) % 2 ? -20 : 0; x < W; x += 40) c.fillRect(x + 1, y + 1, 38, 18);
    }
    // Neonbord
    c.fillStyle = "#120a0a";
    c.fillRect(70, 70, W - 140, 70);
    c.shadowColor = "#ff3ea5";
    c.shadowBlur = 18;
    tekst("CAFE JESSY", W / 2, 105, 26, "#ff3ea5");
    c.shadowBlur = 0;
  }

  function tekenBar(y, actief) {
    c.fillStyle = "#2b1408";
    c.fillRect(BAR_LINKS - 4, y - 4, BAR_RECHTS - BAR_LINKS + 8, 40);
    c.fillStyle = "#8d5524";
    c.fillRect(BAR_LINKS, y, BAR_RECHTS - BAR_LINKS, 12);
    c.fillStyle = "#6d3f19";
    c.fillRect(BAR_LINKS, y + 12, BAR_RECHTS - BAR_LINKS, 24);
    if (actief) {
      c.fillStyle = "rgba(255, 225, 77, 0.25)";
      c.fillRect(BAR_LINKS, y, BAR_RECHTS - BAR_LINKS, 12);
    }
    // Tap
    c.fillStyle = "#bbb";
    c.fillRect(BAR_RECHTS + 6, y - 50, 8, 50);
    c.fillStyle = "#e0e0e0";
    c.fillRect(BAR_RECHTS - 8, y - 56, 30, 10);
    c.fillStyle = "#1a1a1a";
    c.fillRect(BAR_RECHTS + 4, y - 72, 12, 18);
  }

  function tekenGast(g) {
    const y = BARS[g.bar] + 26; // staat achter de bar, die bedekt de benen
    const been = Math.sin(g.stap) * 4;
    c.fillStyle = "#222";
    c.fillRect(g.x - 9 + been, y - 16, 7, 16);
    c.fillRect(g.x + 2 - been, y - 16, 7, 16);
    c.fillStyle = g.shirt;
    c.fillRect(g.x - 13, y - 52, 26, 38);
    c.fillStyle = g.huid;
    c.beginPath();
    c.arc(g.x, y - 64, 13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = g.haar;
    c.fillRect(g.x - 13, y - 78, 26, 9);
    c.fillStyle = "#000";
    c.fillRect(g.x + 4, y - 66, 3, 3);
    if (g.blij) {
      Tekening.bier(c, g.x + 18, y - 44, 24);
    } else if (Math.floor(tijd * 2 + g.stap) % 4 === 0) {
      tekst("BIER!", g.x, y - 98, 9, "#ffe14d");
    }
  }

  function tekenJessy() {
    const y = BARS[bar];
    const x = BAR_RECHTS + 44;
    c.fillStyle = "#fff";
    c.fillRect(x - 18, y - 46, 36, 50);
    c.fillStyle = "#1a1a1a";
    c.fillRect(x - 14, y - 30, 28, 34);
    c.fillStyle = "#ff3ea5";
    c.beginPath();
    c.arc(x, y - 72, 27, 0, Math.PI * 2);
    c.fill();
    Arcade.plaatje(c, gezicht, x, y - 72, 24);
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6);
    tekenAchtergrond();
    gasten.forEach(tekenGast);
    BARS.forEach((y, i) => tekenBar(y, i === bar && toestand === "spelen"));
    bieren.forEach((b) => Tekening.bier(c, b.x, BARS[b.bar] - 12, 26));
    scherven.forEach((s) => {
      c.fillStyle = `rgba(242, 169, 0, ${1 - s.leeftijd / 1.5})`;
      for (let i = 0; i < 6; i++) c.fillRect(s.x + i * 7 - 10, s.y + 10 + (i % 3) * 6 + s.leeftijd * 30, 5, 4);
    });
    tekenJessy();
    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.2);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 40, k.slecht ? 11 : 12, k.slecht ? "#ff5a5a" : "#ffe14d");
    });
    c.globalAlpha = 1;

    tekst("SCORE " + score, 16, 30, 14, "#fff", "left");
    for (let i = 0; i < LEVENS; i++) Tekening.bier(c, W - 26 - i * 28, 30, 24 * (i < levens ? 1 : 0.6));

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.6)";
      c.fillRect(0, 0, W, H);
      tekst("BIER TAPPER", W / 2, 190, 30, "#f2a900");
      tekst("SCHUIF BIER NAAR", W / 2, 270, 13);
      tekst("DE DORSTIGE GASTEN", W / 2, 300, 13);
      tekst("MIS GEEN GLAS EN LAAT", W / 2, 350, 11, "#ff5a5a");
      tekst("NIEMAND DE TAP BEREIKEN", W / 2, 375, 11, "#ff5a5a");
      tekst("OMHOOG/OMLAAG = BAR KIEZEN", W / 2, 440, 10, "#3ef0ff");
      tekst("SPATIE = TAPPEN", W / 2, 465, 10, "#3ef0ff");
      tekst("OF TIK OP EEN BAR", W / 2, 490, 10, "#3ef0ff");
      tekst("SPATIE = START", W / 2, 560, 16);
      tekst("ESC = PAUZE   M = GELUID", W / 2, 690, 10, "#ddd");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.65)";
      c.fillRect(0, 0, W, H);
      tekst("SLUITINGSTIJD!", W / 2, 210, 26, "#ff5a5a");
      tekst(score + " BIERTJES GETAPT", W / 2, 290, 14, "#ffe14d");
      tekst("SCORE " + score, W / 2, 350, 20);
      tekst("RECORD " + record, W / 2, 395, 20, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 440, 14, "#ff3ea5");
      if (tijd - eindeSinds > 0.8 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE = OPNIEUW", W / 2, 520, 16);
      tekst("ESC = PAUZE", W / 2, 570, 12, "#ddd");
    }
    c.restore();
  }

  nieuwSpel();
  Arcade.lus(update, teken);
})();
