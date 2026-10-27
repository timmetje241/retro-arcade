// Jessy Breakout: Jessy's hoofd is de bal. Vijf levels, met als laatste een eindbaas.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "breakout.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  // De bal krijgt bij elke tik tegen de peddel een ander gezicht van Jessy
  const gezichten = Arcade.gezichten();
  let gezicht = gezichten[0];

  // --- Levels ---
  // n = gewoon blok, s = creatinepot (2x raken), x = halter (3x raken), k = koe (onbreekbaar), . = leeg
  // De letters van "woord" staan op de gewone blokken, per kolom.
  const LEVELS = [
    { naam: "VIBECODE", woord: "VIBECODE", kaart: ["nnnnnnnn", "nnnnnnnn", "nnnnnnnn", "nnnnnnnn", "nnnnnnnn", "nnnnnnnn"] },
    { naam: "PROOST", woord: "PROOST!!", kaart: ["..nnnn..", ".nnnnnn.", "nnssssnn", "nnssssnn", "nnnnnnnn", "k..nn..k"] },
    { naam: "HAPPY 33", woord: "HAPPY 33", kaart: ["xxx..xxx", "..s....s", "sss..sss", "..s....s", "sss..sss", "", "nnnnnnnn"] },
    { naam: "BOE BOE!", woord: "BOE BOE!", kaart: ["k.nnnn.k", ".nnnnnn.", "nnxnnxnn", "nnnnnnnn", ".ssssss.", ".s.ss.s.", "..ssss..", "k......k"] },
    { naam: "EINDBAAS", woord: "", kaart: ["", "", "", "", "", "", "", "", "k.ssss.k"], baas: true }
  ];

  // --- Speelveld ---
  const KOLOMMEN = 8;
  const BLOK_B = 52;
  const BLOK_H = 24;
  const RUIMTE = 4;
  const BLOK_LINKS = (W - KOLOMMEN * (BLOK_B + RUIMTE) + RUIMTE) / 2;
  const BLOK_TOP = 100;
  const RIJ_KLEUREN = ["#ff3e5a", "#ff8a3d", "#ffe14d", "#5fd35f", "#3ef0ff", "#b06cff", "#ff3ea5", "#8fe36b"];
  const PEDDEL_Y = H - 70;
  const PEDDEL_H = 16;
  const PEDDEL_NORMAAL = 90;
  const PEDDEL_GROOT = 140;
  const PEDDEL_KLEIN = 56;
  const BAL_R = 18;
  const LEVENS = 3;
  const BONUS_KANS = 0.16;
  const BONUSSEN = ["creatine", "bier", "kwark", "pizza", "pizza"];
  const VERSNELLING = 6;        // de bal gaat bij elke peddeltik zoveel sneller
  const MAX_EXTRA = 140;
  const BAAS_LEVENS = 25;
  const BAAS_R = 78;

  let toestand, blokken, bal, peddel, bonussen, kreten, score, levens, level, ronde, schud, nieuwRecord, extra, baas;
  let tijd = 0;
  let eindeSinds = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  const toetsen = {};

  function nieuwSpel() {
    toestand = "klaar";
    score = 0;
    levens = LEVENS;
    level = 0;
    ronde = 1;
    nieuwRecord = false;
    schud = 0;
    kreten = [];
    peddel = { x: W / 2, breedte: PEDDEL_NORMAAL, groot: 0, klein: 0, wiebel: 0 };
    nieuwLevel();
  }

  function nieuwLevel() {
    const lvl = LEVELS[level];
    blokken = [];
    lvl.kaart.forEach((regel, rij) => {
      [...regel].forEach((teken, kol) => {
        if (teken === ".") return;
        blokken.push({
          x: BLOK_LINKS + kol * (BLOK_B + RUIMTE),
          y: BLOK_TOP + rij * (BLOK_H + RUIMTE),
          soort: teken,
          levens: { n: 1, s: 2, x: 3, k: Infinity }[teken],
          letter: teken === "n" ? (lvl.woord[kol] || "").trim() : "",
          kleur: RIJ_KLEUREN[rij % RIJ_KLEUREN.length],
          punten: teken === "n" ? 10 + (8 - rij) * 5 : teken === "s" ? 60 : 100,
          flits: 0
        });
      });
    });
    baas = lvl.baas
      ? { x: W / 2, y: BLOK_TOP + 105, levens: BAAS_LEVENS + (ronde - 1) * 10, max: BAAS_LEVENS + (ronde - 1) * 10, richting: 1, flits: 0, gooi: 2 }
      : null;
    bonussen = [];
    extra = 0;
    balOpPeddel();
  }

  function balOpPeddel() {
    bal = { x: peddel.x, y: PEDDEL_Y - BAL_R - 2, vx: 0, vy: 0, vast: true, draai: 0 };
  }

  function balSnelheid() {
    return 360 + level * 25 + (ronde - 1) * 70 + extra;
  }

  function zetSnelheid() {
    const lengte = Math.hypot(bal.vx, bal.vy) || 1;
    bal.vx = (bal.vx / lengte) * balSnelheid();
    bal.vy = (bal.vy / lengte) * balSnelheid();
  }

  function lanceer() {
    if (!bal.vast) return;
    bal.vast = false;
    const hoek = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    bal.vx = Math.cos(hoek) * balSnelheid();
    bal.vy = Math.sin(hoek) * balSnelheid();
    Arcade.toon({ van: 440, naar: 880, duur: 0.1, volume: 0.08 });
  }

  function kreet(woord, kleur) {
    kreten.push({ tekst: woord, x: W / 2, y: H / 2, leeftijd: 0, kleur: kleur || "#ffe14d" });
  }

  // --- Besturing ---
  function actie() {
    if (toestand === "klaar") { toestand = "spelen"; lanceer(); }
    else if (toestand === "spelen") lanceer();
    else if (toestand === "einde" && tijd - eindeSinds > 0.8) nieuwSpel();
  }

  document.addEventListener("keydown", (e) => {
    toetsen[e.code] = true;
    if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowUp") { e.preventDefault(); if (!e.repeat) actie(); }
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
    if (e.code === "KeyM") Arcade.zetStil(!Arcade.isStil());
  });
  document.addEventListener("keyup", (e) => { toetsen[e.code] = false; });

  function canvasX(e) {
    const r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) * (W / r.width);
  }
  canvas.addEventListener("pointermove", (e) => { if (toestand === "spelen") peddel.x = canvasX(e); });
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (toestand === "spelen") peddel.x = canvasX(e);
    actie();
  });

  // --- Botsingen ---
  function cirkelRaaktBlok(x, y, r, b) {
    const dx = x - Math.max(b.x, Math.min(x, b.x + BLOK_B));
    const dy = y - Math.max(b.y, Math.min(y, b.y + BLOK_H));
    return dx * dx + dy * dy < r * r;
  }

  function raakBlok(b) {
    if (b.soort === "k") {
      b.flits = 0.15;
      // Een tikje opzij, zodat de bal nooit eindeloos tussen peddel en koe blijft stuiteren
      bal.vx += (Math.random() - 0.5) * 120;
      zetSnelheid();
      Arcade.toon({ type: "sawtooth", van: 140, naar: 100, duur: 0.15, volume: 0.1, filter: 800 }); // boe
      return;
    }
    b.levens--;
    b.flits = 0.12;
    if (b.levens > 0) {
      Arcade.toon({ type: "square", van: 200, duur: 0.05, volume: 0.08 });
      return;
    }
    b.weg = true;
    score += b.punten * ronde;
    Arcade.toon({ type: "square", van: 300 + b.punten * 4, duur: 0.06, volume: 0.08 });
    if (Math.random() < BONUS_KANS) {
      bonussen.push({ x: b.x + BLOK_B / 2, y: b.y + BLOK_H / 2, soort: BONUSSEN[Math.floor(Math.random() * BONUSSEN.length)] });
    }
  }

  function raakBaas() {
    if (baas.flits > 0) return;
    baas.levens--;
    baas.flits = 0.15;
    schud = 0.1;
    score += 50 * ronde;
    const au = ["AU!", "MIJN NEUS!", "HEY!", "NIET ZO HARD!", "AUWAUW"];
    kreten.push({ tekst: au[Math.floor(Math.random() * au.length)], x: baas.x, y: baas.y - BAAS_R - 10, leeftijd: 0, kleur: "#fff" });
    Arcade.ruis({ duur: 0.08, volume: 0.2 });
    if (baas.levens <= 0) {
      score += 1000 * ronde;
      kreet("JESSY VERSLAGEN! +" + 1000 * ronde, "#ffd700");
      [523, 659, 784, 1047, 1319].forEach((f, i) => Arcade.toon({ type: "square", van: f, duur: 0.12, volume: 0.1, vertraging: i * 0.1 }));
      baas = null;
    }
  }

  function pakBonus(b) {
    if (b.soort === "creatine") {
      peddel.groot = 10;
      peddel.klein = 0;
      kreet("GAINS! GROTE PEDDEL");
    } else if (b.soort === "bier") {
      peddel.wiebel = 8;
      kreet("PROOST! WIEBELIG...", "#f2a900");
    } else if (b.soort === "pizza") {
      peddel.klein = 8;
      peddel.groot = 0;
      kreet("PIZZA! KLEINE PEDDEL", "#ff5a5a");
      Arcade.toon({ type: "square", van: 400, naar: 100, duur: 0.3, volume: 0.1 });
      return;
    } else {
      levens = Math.min(levens + 1, 5);
      kreet("KWARK! +1 LEVEN", "#5fd35f");
    }
    Arcade.toon({ type: "square", van: 660, naar: 1320, duur: 0.2, volume: 0.1 });
  }

  // Waar de peddel echt staat (met bier wiebelt hij heen en weer)
  function peddelX() {
    return peddel.x + (peddel.wiebel > 0 ? Math.sin(tijd * 6) * 40 : 0);
  }

  function balKwijt() {
    levens--;
    schud = 0.3;
    extra = 0;
    Arcade.ruis({ duur: 0.25, volume: 0.25 });
    if (levens <= 0) {
      toestand = "einde";
      eindeSinds = tijd;
      Arcade.toon({ type: "square", van: 440, naar: 55, duur: 0.8, volume: 0.15 });
      if (score > record) {
        record = score;
        nieuwRecord = true;
        Arcade.bewaar(RECORD_SLEUTEL, record);
      }
      Arcade.vraagNaam("breakout", score);
    } else {
      kreet("AU!", "#ff5a5a");
      balOpPeddel();
    }
  }

  // --- Spel bijwerken ---
  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.5);
    blokken.forEach((b) => { b.flits = Math.max(0, b.flits - dt); });
    if (toestand !== "spelen") return;

    // Peddel
    if (toetsen.ArrowLeft || toetsen.KeyA) peddel.x -= 520 * dt;
    if (toetsen.ArrowRight || toetsen.KeyD) peddel.x += 520 * dt;
    peddel.groot = Math.max(0, peddel.groot - dt);
    peddel.klein = Math.max(0, peddel.klein - dt);
    peddel.wiebel = Math.max(0, peddel.wiebel - dt);
    const doelBreedte = peddel.groot > 0 ? PEDDEL_GROOT : peddel.klein > 0 ? PEDDEL_KLEIN : PEDDEL_NORMAAL;
    peddel.breedte += (doelBreedte - peddel.breedte) * Math.min(1, dt * 8);
    peddel.x = Math.max(peddel.breedte / 2, Math.min(W - peddel.breedte / 2, peddel.x));
    const px = peddelX();

    // De eindbaas zweeft heen en weer en gooit pizza's
    if (baas) {
      baas.flits = Math.max(0, baas.flits - dt);
      const snelheid = 70 + (1 - baas.levens / baas.max) * 110 + (ronde - 1) * 30;
      baas.x += baas.richting * snelheid * dt;
      if (baas.x < BAAS_R + 10 || baas.x > W - BAAS_R - 10) baas.richting *= -1;
      baas.x = Math.max(BAAS_R + 10, Math.min(W - BAAS_R - 10, baas.x));
      baas.gooi -= dt;
      if (baas.gooi <= 0 && !bal.vast) {
        baas.gooi = Math.max(0.9, 2.2 - (1 - baas.levens / baas.max) * 1.2);
        bonussen.push({ x: baas.x, y: baas.y + BAAS_R, soort: "pizza" });
      }
    }

    if (bal.vast) {
      bal.x = px;
      bal.y = PEDDEL_Y - BAL_R - 2;
    } else {
      bal.draai += bal.vx * dt * 0.02;
      // In kleine stapjes bewegen zodat de bal nergens doorheen schiet
      const stappen = 4;
      for (let s = 0; s < stappen; s++) {
        bal.x += (bal.vx * dt) / stappen;
        for (const b of blokken) {
          if (!b.weg && cirkelRaaktBlok(bal.x, bal.y, BAL_R, b)) {
            raakBlok(b);
            bal.vx = -bal.vx;
            bal.x += (bal.vx * dt) / stappen;
            break;
          }
        }
        bal.y += (bal.vy * dt) / stappen;
        for (const b of blokken) {
          if (!b.weg && cirkelRaaktBlok(bal.x, bal.y, BAL_R, b)) {
            raakBlok(b);
            bal.vy = -bal.vy;
            bal.y += (bal.vy * dt) / stappen;
            break;
          }
        }
        // Tegen het hoofd van de eindbaas: terugkaatsen vanaf zijn middelpunt
        if (baas) {
          const dx = bal.x - baas.x;
          const dy = bal.y - baas.y;
          const afstand = Math.hypot(dx, dy);
          if (afstand < BAAS_R + BAL_R) {
            const nx = dx / afstand;
            const ny = dy / afstand;
            const punt = bal.vx * nx + bal.vy * ny;
            if (punt < 0) {
              bal.vx -= 2 * punt * nx;
              bal.vy -= 2 * punt * ny;
            }
            bal.x = baas.x + nx * (BAAS_R + BAL_R + 1);
            bal.y = baas.y + ny * (BAAS_R + BAL_R + 1);
            raakBaas();
            if (!baas) break;
          }
        }
      }
      blokken = blokken.filter((b) => !b.weg);

      // Muren
      if (bal.x < BAL_R) { bal.x = BAL_R; bal.vx = Math.abs(bal.vx); }
      if (bal.x > W - BAL_R) { bal.x = W - BAL_R; bal.vx = -Math.abs(bal.vx); }
      if (bal.y < 60 + BAL_R) { bal.y = 60 + BAL_R; bal.vy = Math.abs(bal.vy); }
      // Nooit bijna-horizontaal blijven stuiteren
      if (Math.abs(bal.vy) < balSnelheid() * 0.25) {
        bal.vy = Math.sign(bal.vy || 1) * balSnelheid() * 0.25;
        zetSnelheid();
      }

      // Peddel: hoe verder van het midden je raakt, hoe schuiner de bal gaat
      if (bal.vy > 0 && bal.y + BAL_R >= PEDDEL_Y && bal.y < PEDDEL_Y + PEDDEL_H && Math.abs(bal.x - px) < peddel.breedte / 2 + BAL_R) {
        extra = Math.min(MAX_EXTRA, extra + VERSNELLING);
        const plek = Math.max(-1, Math.min(1, (bal.x - px) / (peddel.breedte / 2)));
        const hoek = -Math.PI / 2 + plek * 1.05 + (Math.random() - 0.5) * 0.12;
        bal.vx = Math.cos(hoek) * balSnelheid();
        bal.vy = Math.sin(hoek) * balSnelheid();
        bal.y = PEDDEL_Y - BAL_R;
        gezicht = Arcade.anderGezicht(gezichten, gezicht);
        Arcade.toon({ type: "square", van: 220, duur: 0.06, volume: 0.1 });
      }

      if (bal.y > H + BAL_R) balKwijt();
    }

    // Bonussen (en pizza's) vallen naar beneden
    for (const b of bonussen) {
      b.y += (b.soort === "pizza" ? 200 : 170) * dt;
      if (b.y > PEDDEL_Y - 14 && b.y < PEDDEL_Y + 20 && Math.abs(b.x - px) < peddel.breedte / 2 + 14) {
        b.weg = true;
        pakBonus(b);
      }
      if (b.y > H + 30) b.weg = true;
    }
    bonussen = bonussen.filter((b) => !b.weg);

    // Alles kapot (koeblokken tellen niet mee): volgend level
    if (toestand === "spelen" && !baas && !blokken.some((b) => b.soort !== "k")) {
      level++;
      if (level >= LEVELS.length) {
        level = 0;
        ronde++;
        kreet("RONDE " + ronde + "! NOG SNELLER", "#ff3ea5");
      } else {
        kreet("LEVEL " + (level + 1) + ": " + LEVELS[level].naam);
      }
      Arcade.toon({ type: "square", van: 523, duur: 0.1, volume: 0.1 });
      Arcade.toon({ type: "square", van: 659, duur: 0.1, volume: 0.1, vertraging: 0.1 });
      Arcade.toon({ type: "square", van: 784, duur: 0.2, volume: 0.1, vertraging: 0.2 });
      nieuwLevel();
    }
  }

  // --- Tekenen ---
  function tekenBlok(b) {
    c.fillStyle = "#000";
    c.fillRect(b.x - 2, b.y - 2, BLOK_B + 4, BLOK_H + 4);
    if (b.soort === "k") {
      // Koeblok: wit met zwarte vlekken, onbreekbaar
      c.fillStyle = b.flits > 0 ? "#ffd0e0" : "#fff";
      c.fillRect(b.x, b.y, BLOK_B, BLOK_H);
      c.fillStyle = "#1a1a1a";
      c.fillRect(b.x + 6, b.y + 4, 12, 8);
      c.fillRect(b.x + 30, b.y + 12, 14, 8);
      c.fillRect(b.x + 22, b.y + 3, 6, 5);
      return;
    }
    if (b.soort === "s" || b.soort === "x") {
      // Creatinepot (2x) of halter (3x): donker, met een barst als hij al geraakt is
      c.fillStyle = b.flits > 0 ? "#fff" : b.soort === "s" ? "#2a2a2a" : "#6b6b78";
      c.fillRect(b.x, b.y, BLOK_B, BLOK_H);
      c.fillStyle = "rgba(255, 255, 255, 0.25)";
      c.fillRect(b.x, b.y, BLOK_B, 4);
      c.font = `10px ${Arcade.FONT}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = b.soort === "s" ? "#e0262b" : "#fff";
      c.fillText(b.soort === "s" ? "C" : "KG", b.x + BLOK_B / 2, b.y + BLOK_H / 2 + 1);
      const max = b.soort === "s" ? 2 : 3;
      if (b.levens < max) {
        c.strokeStyle = "#000";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(b.x + 8, b.y + 3);
        c.lineTo(b.x + 18, b.y + 14);
        c.lineTo(b.x + 12, b.y + BLOK_H - 2);
        if (b.levens < max - 1) { c.moveTo(b.x + 40, b.y + 2); c.lineTo(b.x + 34, b.y + 16); }
        c.stroke();
      }
      return;
    }
    c.fillStyle = b.flits > 0 ? "#fff" : b.kleur;
    c.fillRect(b.x, b.y, BLOK_B, BLOK_H);
    c.fillStyle = "rgba(255, 255, 255, 0.35)";
    c.fillRect(b.x, b.y, BLOK_B, 4);
    c.fillStyle = "rgba(0, 0, 0, 0.25)";
    c.fillRect(b.x, b.y + BLOK_H - 4, BLOK_B, 4);
    if (b.letter) {
      c.font = `12px ${Arcade.FONT}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#fff";
      c.fillText(b.letter, b.x + BLOK_B / 2, b.y + BLOK_H / 2 + 1);
    }
  }

  function tekenBaas() {
    // Levensbalk
    const breed = W - 80;
    c.fillStyle = "#000";
    c.fillRect(38, 70, breed + 4, 14);
    c.fillStyle = "#ff3e5a";
    c.fillRect(40, 72, breed * (baas.levens / baas.max), 10);
    tekst("EINDBAAS JESSY", W / 2, 77, 8, "#fff");
    // Het hoofd zelf (het feesthoedje tekent Arcade.plaatje erbij)
    c.save();
    c.translate(baas.x, baas.y);
    c.rotate(Math.sin(tijd * 2) * 0.1);
    c.fillStyle = baas.flits > 0 ? "#fff" : "#ff3ea5";
    c.beginPath();
    c.arc(0, 0, BAAS_R + 5, 0, Math.PI * 2);
    c.fill();
    Arcade.plaatje(c, gezichten[2], 0, 0, BAAS_R);
    c.restore();
  }

  function tekenPeddel() {
    const px = peddelX();
    const b = peddel.breedte;
    c.fillStyle = "#000";
    c.fillRect(px - b / 2 - 3, PEDDEL_Y - 3, b + 6, PEDDEL_H + 6);
    c.fillStyle = peddel.groot > 0 ? "#ff3ea5" : peddel.klein > 0 ? "#ff5a5a" : peddel.wiebel > 0 ? "#f2a900" : "#3ef0ff";
    c.fillRect(px - b / 2, PEDDEL_Y, b, PEDDEL_H);
    c.fillStyle = "rgba(255, 255, 255, 0.5)";
    c.fillRect(px - b / 2, PEDDEL_Y, b, 4);
  }

  function tekenBal() {
    c.save();
    c.translate(bal.x, bal.y);
    c.rotate(bal.draai);
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(0, 0, BAL_R + 2, 0, Math.PI * 2);
    c.fill();
    Arcade.plaatje(c, gezicht, 0, 0, BAL_R);
    c.restore();
  }

  function teken() {
    c.save();
    if (schud > 0) c.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    c.fillStyle = "#0e0e2a";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#14143a";
    for (let y = 60; y < H; y += 32) c.fillRect(0, y, W, 1);
    c.fillStyle = "#3ef0ff";
    c.fillRect(0, 56, W, 4);

    blokken.forEach(tekenBlok);
    if (baas) tekenBaas();
    bonussen.forEach((b) => Tekening[b.soort](c, b.x, b.y, 30));
    tekenPeddel();
    tekenBal();

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.5);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 30, 14, k.kleur);
    });
    c.globalAlpha = 1;

    tekst("SCORE " + score, 12, 28, 12, "#fff", "left");
    tekst((ronde > 1 ? "R" + ronde + " " : "") + "LVL " + (level + 1), W / 2 + 20, 28, 12, "#ffe14d");
    for (let i = 0; i < levens; i++) Arcade.plaatje(c, gezicht, W - 20 - i * 26, 28, 10);

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.7)";
      c.fillRect(0, 0, W, H);
      tekst("JESSY", W / 2, 150, 36, "#ffe14d");
      tekst("BREAKOUT", W / 2, 200, 36, "#ffe14d");
      tekst("5 LEVELS + EINDBAAS", W / 2, 250, 11, "#ff3ea5");
      tekst("BONUSSEN:", W / 2, 300, 12, "#3ef0ff");
      [["creatine", "GROOT"], ["bier", "WIEBEL"], ["kwark", "+LEVEN"], ["pizza", "KLEIN!"]].forEach(([naam, uitleg], i) => {
        const x = 75 + i * 110;
        Tekening[naam](c, x, 345, 34);
        tekst(uitleg, x, 385, 9, naam === "pizza" ? "#ff5a5a" : "#fff");
      });
      tekst("C = 2X RAKEN  KG = 3X", W / 2, 430, 10, "#ddd");
      tekst("KOEBLOKKEN ZIJN ONBREEKBAAR", W / 2, 455, 10, "#ddd");
      tekst("MUIS / VINGER / PIJLTJES", W / 2, 510, 11, "#3ef0ff");
      tekst("SPATIE = START", W / 2, 560, 16);
      tekst("ESC = PAUZE   M = GELUID", W / 2, 690, 10, "#ddd");
    } else if (toestand === "spelen" && bal.vast) {
      tekst("SPATIE / KLIK = SCHIETEN", W / 2, PEDDEL_Y - 60, 10, "#fff");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.65)";
      c.fillRect(0, 0, W, H);
      tekst("GAME OVER", W / 2, 220, 34, "#ff5a5a");
      tekst(Arcade.plaagTekst(), W / 2, 305, 10, "#fff");
      tekst((ronde > 1 ? "RONDE " + ronde + ", " : "") + "LEVEL " + (level + 1) + ": " + LEVELS[level].naam, W / 2, 280, 12, "#ffe14d");
      tekst("SCORE " + score, W / 2, 340, 20);
      tekst("RECORD " + record, W / 2, 385, 20, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 430, 14, "#ff3ea5");
      if (tijd - eindeSinds > 0.8 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE = OPNIEUW", W / 2, 510, 16);
      tekst("ESC = PAUZE", W / 2, 560, 12, "#ddd");
    }
    c.restore();
  }

  Arcade.volgScore(() => score);
  nieuwSpel();
  Arcade.lus(update, teken);
})();
