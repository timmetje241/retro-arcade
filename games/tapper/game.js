// Bier Tapper: Jessy staat achter de bar en schuift biertjes naar dorstige gasten.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "tapper.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  // Bij elk getapt biertje staat er een ander gezicht van Jessy achter de bar
  const gezichten = Arcade.gezichten();
  let gezicht = gezichten[1];

  // --- De bar ---
  const BARS = [230, 350, 470, 590];   // bovenkant van elke bar
  const BAR_LINKS = 20;
  const BAR_RECHTS = 400;               // hier staat de tap
  const LEVENS = 3;
  const BIER_SNELHEID = 330;
  const GLAS_SNELHEID = 150;            // lege glazen glijden terug naar de tap
  const DUW = 120;                      // zo ver duwt een biertje een gast terug
  const DRINKTIJD = 1.3;
  const FOOI_KANS = 0.15;
  const HAPPY_HOUR_ELKE = 40;
  const HAPPY_HOUR_DUUR = 8;
  // Soorten gasten: snelheid t.o.v. normaal en hoeveel biertjes ze willen
  const SOORTEN = [
    { naam: "gast", kans: 60, snelheid: 1, dorst: [1, 2] },
    { naam: "student", kans: 18, snelheid: 1.7, dorst: [1, 1] },
    { naam: "opa", kans: 12, snelheid: 0.6, dorst: [3, 3] },
    { naam: "moeder", kans: 10, snelheid: 0.8, dorst: [0, 0] }
  ];
  const KRETEN = ["PROOST!", "SANTE!", "DANKJE!", "LEKKER!", "CHEERS!", "SKOL!", "NA ZDROWIE!"];
  const STUDENT = ["DORST!!", "TENTAMEN MORGEN", "NOG 1 RONDJE"];
  const OPA = ["VROEGER WAS BIER", "GOEDKOPER", "NOG EENTJE JONG"];
  const MOEDER = ["WATER GRAAG", "JESSY, LIEFJE", "HEB JE GEGETEN?"];
  const SHIRTS = ["#e53935", "#1e88e5", "#43a047", "#8e24aa", "#fb8c00", "#00acc1", "#fdd835"];
  const HAAR = ["#3e2723", "#000", "#c68e4e", "#ffcc80", "#795548", "#b71c1c"];
  const HUID = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"];

  let toestand, bar, gasten, bieren, glazen, scherven, kreten, score, levens, spelTijd, volgende, tapPauze, schud, nieuwRecord;
  let happyHour, volgendeHappy;
  let tijd = 0;
  let eindeSinds = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);

  function nieuwSpel() {
    toestand = "klaar";
    bar = 0;
    gasten = [];
    bieren = [];
    glazen = [];
    scherven = [];
    kreten = [];
    score = 0;
    levens = LEVENS;
    spelTijd = 0;
    volgende = 0.5;
    tapPauze = 0;
    schud = 0;
    nieuwRecord = false;
    happyHour = 0;
    volgendeHappy = HAPPY_HOUR_ELKE;
  }

  function willekeurig(lijst) {
    return lijst[Math.floor(Math.random() * lijst.length)];
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

  function kreet(woord, x, y, slecht, groot) {
    kreten.push({ tekst: woord, x, y, leeftijd: 0, slecht, groot });
  }

  function punten(n) {
    return n * (happyHour > 0 ? 2 : 1);
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
    kreet(waarom, x, BARS[b] - 70, true);
    Arcade.ruis({ duur: 0.3, volume: 0.3 });
    Arcade.toon({ type: "square", van: 260, naar: 60, duur: 0.4, volume: 0.12 });
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

  function nieuweGast() {
    const soort = kiesSoort();
    const [min, max] = soort.dorst;
    const basis = Math.min(80, 26 + spelTijd * 0.5) * (happyHour > 0 ? 1.3 : 1);
    gasten.push({
      soort,
      bar: Math.floor(Math.random() * BARS.length),
      x: -20,
      v: basis * soort.snelheid * (0.9 + Math.random() * 0.2),
      dorst: min + Math.floor(Math.random() * (max - min + 1)),
      fase: "lopen",     // lopen, terug, drinken, weg (moeder: lopen, weg)
      doelX: 0,
      drink: 0,
      shirt: soort.naam === "student" ? "#e53935" : soort.naam === "moeder" ? "#9c4dcc" : willekeurig(SHIRTS),
      haar: soort.naam === "opa" ? "#ddd" : soort.naam === "moeder" ? "#6d4c41" : willekeurig(HAAR),
      huid: willekeurig(HUID),
      stap: Math.random() * 6,
      praatje: willekeurig(soort.naam === "student" ? STUDENT : soort.naam === "opa" ? OPA : soort.naam === "moeder" ? MOEDER : ["BIER!"])
    });
  }

  // De gast vooraan op een bar die een biertje kan krijgen (of de moeder, die het juist niet wil)
  function voorsteGast(b) {
    return gasten
      .filter((g) => g.bar === b && (g.fase === "lopen" || (g.soort.naam === "moeder" && g.fase !== "geraakt")))
      .sort((a, z) => z.x - a.x)[0];
  }

  function bediend(g) {
    if (g.soort.naam === "moeder") {
      g.fase = "geraakt";
      g.v = -140;
      verliesLeven("JESSY! IK WIL WATER!", W / 2, g.bar);
      return;
    }
    g.dorst--;
    const p = punten(1);
    score += p;
    gezicht = Arcade.anderGezicht(gezichten, gezicht);
    kreet(willekeurig(KRETEN) + (p > 1 ? " +" + p : ""), g.x, BARS[g.bar] - 80);
    Arcade.toon({ type: "square", van: 784, duur: 0.08, volume: 0.1 });
    Arcade.toon({ type: "square", van: 1047, duur: 0.15, volume: 0.1, vertraging: 0.08 });
    if (Math.random() < FOOI_KANS) {
      const fooi = punten(5);
      score += fooi;
      kreet("FOOI! +" + fooi, g.x, BARS[g.bar] - 105, false, true);
      [1319, 1568, 2093].forEach((f, i) => Arcade.toon({ type: "square", van: f, duur: 0.06, volume: 0.08, vertraging: 0.2 + i * 0.06 }));
    }
    g.fase = "terug";
    g.doelX = g.x - DUW * (g.soort.naam === "opa" ? 0.6 : 1);
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

    // Happy hour: alles dubbel, ook de drukte
    happyHour = Math.max(0, happyHour - dt);
    if (spelTijd >= volgendeHappy) {
      volgendeHappy += HAPPY_HOUR_ELKE;
      happyHour = HAPPY_HOUR_DUUR;
      kreet("HAPPY HOUR! PUNTEN X2", W / 2, 170, false, true);
      [523, 659, 784, 1047].forEach((f, i) => Arcade.toon({ type: "square", van: f, duur: 0.1, volume: 0.1, vertraging: i * 0.1 }));
    }

    // Nieuwe dorstige gasten
    volgende -= dt;
    if (volgende <= 0) {
      volgende = Math.max(0.6, 2.4 - spelTijd * 0.025) * (0.6 + Math.random() * 0.8) * (happyHour > 0 ? 0.55 : 1);
      nieuweGast();
    }

    for (const g of gasten) {
      g.stap += dt * 8;
      if (g.fase === "lopen") {
        g.x += g.v * dt;
        // De moeder loopt tot de tap, kijkt even rond en gaat weer
        if (g.soort.naam === "moeder" && g.x >= BAR_RECHTS - 70) {
          g.fase = "weg";
          g.v = -70;
          kreet("NETJES HOOR, JES", g.x, BARS[g.bar] - 90);
        }
      } else if (g.fase === "terug") {
        g.x -= 220 * dt;
        if (g.x < -30) {
          // Helemaal de deur uit geduwd: tevreden naar huis
          g.weg = true;
          const p = punten(1);
          score += p;
          kreet("TOT ZIENS! +" + p, 60, BARS[g.bar] - 60);
        } else if (g.x <= g.doelX) {
          g.fase = "drinken";
          g.drink = DRINKTIJD;
        }
      } else if (g.fase === "drinken") {
        g.drink -= dt;
        if (g.drink <= 0) {
          // Leeg glas terug over de bar, en daarna weer dorstig of naar huis
          glazen.push({ bar: g.bar, x: g.x + 20 });
          if (g.dorst > 0) g.fase = "lopen";
          else { g.fase = "weg"; g.v = -90; }
        }
      } else {
        g.x += g.v * dt;
      }
      if (g.x < -40 && (g.fase === "weg" || g.fase === "geraakt")) g.weg = true;
    }

    for (const b of bieren) {
      b.x -= BIER_SNELHEID * dt;
      const klant = voorsteGast(b.bar);
      if (klant && b.x <= klant.x + 18) {
        b.weg = true;
        bediend(klant);
        if (toestand !== "spelen") return;
      } else if (b.x < BAR_LINKS) {
        b.weg = true;
        scherven.push({ x: BAR_LINKS, y: BARS[b.bar], leeftijd: 0 });
        verliesLeven("KAPOT!", 80, b.bar);
        if (toestand !== "spelen") return;
      }
    }

    // Lege glazen moet Jessy bij de tap opvangen
    const glasSnelheid = GLAS_SNELHEID + spelTijd * 0.8;
    for (const gl of glazen) {
      gl.x += glasSnelheid * dt;
      if (gl.x >= BAR_RECHTS - 20) {
        gl.weg = true;
        if (gl.bar === bar) {
          const p = punten(1);
          score += p;
          kreet("GEVANGEN +" + p, BAR_RECHTS - 40, BARS[gl.bar] - 40);
          Arcade.toon({ type: "triangle", van: 1200, duur: 0.06, volume: 0.1 });
        } else {
          scherven.push({ x: BAR_RECHTS, y: BARS[gl.bar], leeftijd: 0 });
          verliesLeven("GLAS KAPOT!", W / 2, gl.bar);
          if (toestand !== "spelen") return;
        }
      }
    }

    bieren = bieren.filter((b) => !b.weg);
    glazen = glazen.filter((g) => !g.weg);

    // Een dorstige gast die de tap bereikt is boos (de moeder telt niet)
    for (const g of gasten) {
      if (!g.weg && g.fase === "lopen" && g.soort.naam !== "moeder" && g.x >= BAR_RECHTS - 40) {
        g.weg = true;
        verliesLeven(g.soort.naam === "opa" ? "IN MIJN TIJD WAS ER SERVICE" : "WAAR BLIJFT MIJN BIER?!", W / 2, g.bar);
        if (toestand !== "spelen") return;
      }
    }
    gasten = gasten.filter((g) => !g.weg);
  }

  // --- Tekenen ---
  function tekenAchtergrond() {
    // Bakstenen muur
    c.fillStyle = happyHour > 0 && Math.floor(tijd * 4) % 2 ? "#5a1f3a" : "#4a1f1a";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#5c2820";
    for (let y = 0; y < H; y += 20) {
      for (let x = (y / 20) % 2 ? -20 : 0; x < W; x += 40) c.fillRect(x + 1, y + 1, 38, 18);
    }
    // Neonbord
    c.fillStyle = "#120a0a";
    c.fillRect(70, 70, W - 140, 70);
    c.shadowColor = happyHour > 0 ? "#3ef0ff" : "#ff3ea5";
    c.shadowBlur = 18;
    if (happyHour > 0) tekst("HAPPY HOUR " + Math.ceil(happyHour), W / 2, 105, 20, "#3ef0ff");
    else tekst("CAFE JESSY", W / 2, 105, 26, "#ff3ea5");
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
    const naam = g.soort.naam;
    c.fillStyle = "#222";
    c.fillRect(g.x - 9 + been, y - 16, 7, 16);
    c.fillRect(g.x + 2 - been, y - 16, 7, 16);
    c.fillStyle = g.shirt;
    if (naam === "moeder") c.fillRect(g.x - 16, y - 52, 32, 44); // jurk
    else c.fillRect(g.x - 13, y - 52, 26, 38);
    c.fillStyle = g.huid;
    c.beginPath();
    c.arc(g.x, y - 64, 13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = g.haar;
    c.fillRect(g.x - 13, y - 78, 26, 9);
    if (naam === "moeder") c.fillRect(g.x - 6, y - 88, 12, 10); // knotje
    if (naam === "opa") { c.fillStyle = "#eee"; c.fillRect(g.x - 8, y - 58, 16, 8); } // baard
    if (naam === "student") { c.fillStyle = "#1e88e5"; c.fillRect(g.x - 14, y - 80, 28, 6); c.fillRect(g.x + 6, y - 76, 12, 4); } // pet
    c.fillStyle = "#000";
    c.fillRect(g.x + 4, y - 66, 3, 3);

    if (g.fase === "terug" || g.fase === "drinken") {
      Tekening.bier(c, g.x + 18, y - 44, 24);
    } else if (g.fase === "lopen" && Math.floor(tijd * 1.5 + g.stap) % 3 === 0) {
      tekst(g.praatje, g.x, y - 98, 8, naam === "moeder" ? "#9cf" : "#ffe14d");
    }
    if (naam === "moeder") tekst("MAM", g.x, y - 30, 8, "#fff");
    if (naam === "opa" && g.dorst > 0 && g.fase === "lopen") tekst("X" + g.dorst, g.x + 18, y - 70, 8, "#ffe14d");
  }

  function tekenGlas(gl) {
    const x = gl.x;
    const y = BARS[gl.bar] - 12;
    c.fillStyle = "#1a1a1a";
    c.fillRect(x - 9, y - 12, 18, 24);
    c.fillStyle = "rgba(220, 240, 255, 0.85)";
    c.fillRect(x - 7, y - 10, 14, 20);
    c.fillStyle = "rgba(242, 169, 0, 0.6)";
    c.fillRect(x - 7, y + 6, 14, 4);
  }

  function tekenJessy() {
    const y = BARS[bar];
    const x = BAR_RECHTS + 44;
    c.fillStyle = "#fff";
    c.fillRect(x - 18, y - 46, 36, 50);
    c.fillStyle = "#1a1a1a";
    c.fillRect(x - 14, y - 30, 28, 34);
    c.fillStyle = happyHour > 0 ? "#3ef0ff" : "#ff3ea5";
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
    glazen.forEach(tekenGlas);
    scherven.forEach((s) => {
      c.fillStyle = `rgba(242, 169, 0, ${1 - s.leeftijd / 1.5})`;
      for (let i = 0; i < 6; i++) c.fillRect(s.x + i * 7 - 10, s.y + 10 + (i % 3) * 6 + s.leeftijd * 30, 5, 4);
    });
    tekenJessy();
    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.2);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 40, k.groot ? 15 : k.slecht ? 10 : 12, k.slecht ? "#ff5a5a" : "#ffe14d");
    });
    c.globalAlpha = 1;

    tekst("SCORE " + score, 16, 30, 14, "#fff", "left");
    for (let i = 0; i < LEVENS; i++) Tekening.bier(c, W - 26 - i * 28, 30, 24 * (i < levens ? 1 : 0.6));

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.75)";
      c.fillRect(0, 0, W, H);
      tekst("BIER TAPPER", W / 2, 150, 30, "#f2a900");
      tekst("SCHUIF BIER NAAR DE GASTEN", W / 2, 215, 11);
      tekst("EN VANG DE LEGE GLAZEN", W / 2, 240, 11);
      tekst("STUDENT: SNEL", W / 2, 295, 10, "#ff8a80");
      tekst("OPA: TRAAG, WIL 3 BIER", W / 2, 320, 10, "#ddd");
      tekst("MAM WIL WATER: GEEN BIER!", W / 2, 345, 10, "#cf9cff");
      tekst("FOOI = +5   HAPPY HOUR = X2", W / 2, 385, 10, "#5fd35f");
      tekst("OMHOOG/OMLAAG = BAR KIEZEN", W / 2, 445, 10, "#3ef0ff");
      tekst("SPATIE = TAPPEN", W / 2, 470, 10, "#3ef0ff");
      tekst("OF TIK OP EEN BAR", W / 2, 495, 10, "#3ef0ff");
      tekst("SPATIE = START", W / 2, 560, 16);
      tekst("ESC = PAUZE   M = GELUID", W / 2, 690, 10, "#ddd");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.65)";
      c.fillRect(0, 0, W, H);
      tekst("SLUITINGSTIJD!", W / 2, 210, 26, "#ff5a5a");
      tekst("CAFE JESSY GAAT DICHT", W / 2, 290, 12, "#ffe14d");
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
