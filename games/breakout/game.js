// Jessy Breakout: Jessy's hoofd is de bal, de blokjes spellen VIBECODE.
(function () {
  const canvas = document.getElementById("scherm");
  const c = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const RECORD_SLEUTEL = "breakout.record";
  const tekst = (...a) => Arcade.tekst(c, ...a);
  Arcade.schaalCanvas(canvas);
  const gezicht = Arcade.gezichten()[0];

  // --- Speelveld ---
  const WOORD = "VIBECODE";
  const RIJEN = 6;
  const BLOK_B = 52;
  const BLOK_H = 24;
  const RUIMTE = 4;
  const BLOK_LINKS = (W - WOORD.length * (BLOK_B + RUIMTE) + RUIMTE) / 2;
  const BLOK_TOP = 100;
  const RIJ_KLEUREN = ["#ff3e5a", "#ff8a3d", "#ffe14d", "#5fd35f", "#3ef0ff", "#b06cff"];
  const PEDDEL_Y = H - 70;
  const PEDDEL_H = 16;
  const PEDDEL_NORMAAL = 90;
  const PEDDEL_GROOT = 140;
  const BAL_R = 18;
  const LEVENS = 3;
  const BONUS_KANS = 0.16;
  const BONUSSEN = ["creatine", "bier", "kwark"];

  let toestand, blokken, bal, peddel, bonussen, kreten, score, levens, level, schud, nieuwRecord;
  let tijd = 0;
  let eindeSinds = 0;
  let record = Arcade.lees(RECORD_SLEUTEL, 0);
  const toetsen = {};

  function nieuwSpel() {
    toestand = "klaar";
    score = 0;
    levens = LEVENS;
    level = 1;
    nieuwRecord = false;
    schud = 0;
    kreten = [];
    peddel = { x: W / 2, breedte: PEDDEL_NORMAAL, groot: 0, wiebel: 0 };
    nieuwLevel();
  }

  function nieuwLevel() {
    blokken = [];
    for (let rij = 0; rij < RIJEN; rij++) {
      for (let kol = 0; kol < WOORD.length; kol++) {
        blokken.push({
          x: BLOK_LINKS + kol * (BLOK_B + RUIMTE),
          y: BLOK_TOP + rij * (BLOK_H + RUIMTE),
          letter: WOORD[kol],
          kleur: RIJ_KLEUREN[rij],
          punten: (RIJEN - rij) * 10
        });
      }
    }
    bonussen = [];
    balOpPeddel();
  }

  function balOpPeddel() {
    bal = { x: peddel.x, y: PEDDEL_Y - BAL_R - 2, vx: 0, vy: 0, vast: true, draai: 0 };
  }

  function balSnelheid() {
    return 360 + (level - 1) * 40;
  }

  function lanceer() {
    if (!bal.vast) return;
    bal.vast = false;
    const hoek = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    bal.vx = Math.cos(hoek) * balSnelheid();
    bal.vy = Math.sin(hoek) * balSnelheid();
    Arcade.toon({ van: 440, naar: 880, duur: 0.1, volume: 0.08 });
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
    b.weg = true;
    score += b.punten * level;
    Arcade.toon({ type: "square", van: 300 + b.punten * 8, duur: 0.06, volume: 0.08 });
    if (Math.random() < BONUS_KANS) {
      bonussen.push({ x: b.x + BLOK_B / 2, y: b.y + BLOK_H / 2, soort: BONUSSEN[Math.floor(Math.random() * BONUSSEN.length)] });
    }
  }

  function pakBonus(b) {
    if (b.soort === "creatine") {
      peddel.groot = 10;
      kreten.push({ tekst: "GAINS! GROTE PEDDEL", x: W / 2, y: H / 2, leeftijd: 0 });
    } else if (b.soort === "bier") {
      peddel.wiebel = 8;
      kreten.push({ tekst: "PROOST! WIEBELIG...", x: W / 2, y: H / 2, leeftijd: 0 });
    } else {
      levens = Math.min(levens + 1, 5);
      kreten.push({ tekst: "KWARK! +1 LEVEN", x: W / 2, y: H / 2, leeftijd: 0 });
    }
    Arcade.toon({ type: "square", van: 660, naar: 1320, duur: 0.2, volume: 0.1 });
  }

  // Waar de peddel echt staat (met bier wiebelt hij heen en weer)
  function peddelX() {
    return peddel.x + (peddel.wiebel > 0 ? Math.sin(tijd * 6) * 40 : 0);
  }

  // --- Spel bijwerken ---
  function update(dt) {
    tijd += dt;
    schud = Math.max(0, schud - dt);
    kreten.forEach((k) => { k.leeftijd += dt; });
    kreten = kreten.filter((k) => k.leeftijd < 1.5);
    if (toestand !== "spelen") return;

    // Peddel
    if (toetsen.ArrowLeft || toetsen.KeyA) peddel.x -= 520 * dt;
    if (toetsen.ArrowRight || toetsen.KeyD) peddel.x += 520 * dt;
    peddel.groot = Math.max(0, peddel.groot - dt);
    peddel.wiebel = Math.max(0, peddel.wiebel - dt);
    const doelBreedte = peddel.groot > 0 ? PEDDEL_GROOT : PEDDEL_NORMAAL;
    peddel.breedte += (doelBreedte - peddel.breedte) * Math.min(1, dt * 8);
    peddel.x = Math.max(peddel.breedte / 2, Math.min(W - peddel.breedte / 2, peddel.x));
    const px = peddelX();

    if (bal.vast) {
      bal.x = px;
      bal.y = PEDDEL_Y - BAL_R - 2;
    } else {
      bal.draai += bal.vx * dt * 0.02;
      // In kleine stapjes bewegen zodat de bal nergens doorheen schiet
      const stappen = 3;
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
      }
      blokken = blokken.filter((b) => !b.weg);

      // Muren
      if (bal.x < BAL_R) { bal.x = BAL_R; bal.vx = Math.abs(bal.vx); }
      if (bal.x > W - BAL_R) { bal.x = W - BAL_R; bal.vx = -Math.abs(bal.vx); }
      if (bal.y < 60 + BAL_R) { bal.y = 60 + BAL_R; bal.vy = Math.abs(bal.vy); }

      // Peddel: hoe verder van het midden je raakt, hoe schuiner de bal gaat
      if (bal.vy > 0 && bal.y + BAL_R >= PEDDEL_Y && bal.y < PEDDEL_Y + PEDDEL_H && Math.abs(bal.x - px) < peddel.breedte / 2 + BAL_R) {
        const plek = Math.max(-1, Math.min(1, (bal.x - px) / (peddel.breedte / 2)));
        const hoek = -Math.PI / 2 + plek * 1.05;
        bal.vx = Math.cos(hoek) * balSnelheid();
        bal.vy = Math.sin(hoek) * balSnelheid();
        bal.y = PEDDEL_Y - BAL_R;
        Arcade.toon({ type: "square", van: 220, duur: 0.06, volume: 0.1 });
      }

      // Bal gemist
      if (bal.y > H + BAL_R) {
        levens--;
        schud = 0.3;
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
        } else {
          kreten.push({ tekst: "AU!", x: W / 2, y: H / 2, leeftijd: 0 });
          balOpPeddel();
        }
      }
    }

    // Bonussen vallen naar beneden
    for (const b of bonussen) {
      b.y += 170 * dt;
      if (b.y > PEDDEL_Y - 14 && b.y < PEDDEL_Y + 20 && Math.abs(b.x - px) < peddel.breedte / 2 + 14) {
        b.weg = true;
        pakBonus(b);
      }
      if (b.y > H + 30) b.weg = true;
    }
    bonussen = bonussen.filter((b) => !b.weg);

    // Alles kapot: volgend level
    if (!blokken.length) {
      level++;
      kreten.push({ tekst: "LEVEL " + level + "!", x: W / 2, y: H / 2, leeftijd: 0 });
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
    c.fillStyle = b.kleur;
    c.fillRect(b.x, b.y, BLOK_B, BLOK_H);
    c.fillStyle = "rgba(255, 255, 255, 0.35)";
    c.fillRect(b.x, b.y, BLOK_B, 4);
    c.fillStyle = "rgba(0, 0, 0, 0.25)";
    c.fillRect(b.x, b.y + BLOK_H - 4, BLOK_B, 4);
    c.font = `12px ${Arcade.FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText(b.letter, b.x + BLOK_B / 2, b.y + BLOK_H / 2 + 1);
  }

  function tekenPeddel() {
    const px = peddelX();
    const b = peddel.breedte;
    c.fillStyle = "#000";
    c.fillRect(px - b / 2 - 3, PEDDEL_Y - 3, b + 6, PEDDEL_H + 6);
    c.fillStyle = peddel.groot > 0 ? "#ff3ea5" : peddel.wiebel > 0 ? "#f2a900" : "#3ef0ff";
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
    bonussen.forEach((b) => Tekening[b.soort](c, b.x, b.y, 30));
    tekenPeddel();
    tekenBal();

    kreten.forEach((k) => {
      c.globalAlpha = Math.max(0, 1 - k.leeftijd / 1.5);
      tekst(k.tekst, k.x, k.y - k.leeftijd * 30, 14, "#ffe14d");
    });
    c.globalAlpha = 1;

    tekst("SCORE " + score, 12, 28, 12, "#fff", "left");
    tekst("LVL " + level, W / 2 + 30, 28, 12, "#ffe14d");
    for (let i = 0; i < levens; i++) Arcade.plaatje(c, gezicht, W - 20 - i * 26, 28, 10);

    if (toestand === "klaar") {
      c.fillStyle = "rgba(0, 0, 0, 0.6)";
      c.fillRect(0, 0, W, H);
      tekst("JESSY", W / 2, 180, 36, "#ffe14d");
      tekst("BREAKOUT", W / 2, 230, 36, "#ffe14d");
      tekst("BONUSSEN:", W / 2, 310, 12, "#3ef0ff");
      Tekening.creatine(c, 120, 360, 34);
      tekst("GROOT", 120, 400, 10, "#fff");
      Tekening.bier(c, 240, 360, 34);
      tekst("WIEBEL", 240, 400, 10, "#fff");
      Tekening.kwark(c, 360, 360, 34);
      tekst("+LEVEN", 360, 400, 10, "#fff");
      tekst("MUIS / VINGER / PIJLTJES", W / 2, 470, 11, "#3ef0ff");
      tekst("SPATIE = START", W / 2, 530, 16);
      tekst("ESC = PAUZE   M = GELUID", W / 2, 690, 10, "#ddd");
    } else if (toestand === "spelen" && bal.vast) {
      tekst("SPATIE / KLIK = SCHIETEN", W / 2, PEDDEL_Y - 60, 10, "#fff");
    } else if (toestand === "einde") {
      c.fillStyle = "rgba(0, 0, 0, 0.65)";
      c.fillRect(0, 0, W, H);
      tekst("GAME OVER", W / 2, 220, 34, "#ff5a5a");
      tekst("LEVEL " + level, W / 2, 280, 14, "#ffe14d");
      tekst("SCORE " + score, W / 2, 340, 20);
      tekst("RECORD " + record, W / 2, 385, 20, "#3ef0ff");
      if (nieuwRecord) tekst("NIEUW RECORD!", W / 2, 430, 14, "#ff3ea5");
      if (tijd - eindeSinds > 0.8 && Math.floor(tijd * 2) % 2 === 0) tekst("SPATIE = OPNIEUW", W / 2, 510, 16);
      tekst("ESC = PAUZE", W / 2, 560, 12, "#ddd");
    }
    c.restore();
  }

  nieuwSpel();
  Arcade.lus(update, teken);
})();
